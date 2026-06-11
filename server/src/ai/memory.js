import { chatCompletion } from './llm.js';
import { getEmbedding } from './embedding.js';
import {
  getMessages, getMessageCount, getMessagesRange,
  insertSummary, getSummaries, getLastSummarizedMsgId, updateLastSummarizedMsgId,
  insertMemoryFragment, searchMemoryFTS, searchMessageFTS, getMemoryByEntities,
  getMemoryFragments,
} from '../db/database.js';
import config from '../config.js';

const SUMMARY_INTERVAL = 50;
const RRF_K = 60;
const MAX_RECALL = 15;

// ========== ROLLING SUMMARIES ==========

export async function checkAndGenerateSummary(conversationId) {
  const lastId = getLastSummarizedMsgId(conversationId);
  const count = getMessageCount(conversationId, lastId);
  
  if (count < SUMMARY_INTERVAL) return null;
  
  const messages = getMessagesRange(conversationId, lastId, SUMMARY_INTERVAL);
  if (messages.length < 10) return null;
  
  const summary = await generateSummary(messages);
  if (!summary) return null;
  
  const startMsgId = messages[0].id;
  const endMsgId = messages[messages.length - 1].id;
  
  insertSummary(conversationId, summary, startMsgId, endMsgId, messages.length);
  updateLastSummarizedMsgId(conversationId, endMsgId);
  
  return summary;
}

async function generateSummary(messages) {
  try {
    const conversationText = messages
      .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
      .join('\n');
    
    const response = await chatCompletion([
      {
        role: 'system',
        content: '你是一个对话摘要助手。请用简洁的中文总结以下对话的主要内容、关键话题和重要信息。输出2-4句话的摘要。',
      },
      { role: 'user', content: `请总结以下对话:\n\n${conversationText}` },
    ], { tools: false, temperature: 0.3, max_tokens: 500 });
    
    return response.content.trim();
  } catch (error) {
    console.error('Summary generation error:', error.message);
    return null;
  }
}

// ========== MEMORY EXTRACTION ==========

export async function extractMemories(conversationId, userMessage, assistantMessage, sourceMsgId) {
  try {
    const prompt = `分析以下对话，提取有价值的记忆碎片。每条记忆应该是一个独立的、有信息量的事实或偏好。

对话:
用户: "${userMessage}"
AI: "${assistantMessage}"

请提取以下类型的记忆:
- fact: 关于用户的事实信息（姓名、职业、年龄、家人、住址等）
- preference: 用户的喜好和厌恶（喜欢的食物、音乐、活动等）
- emotion: 重要的情感事件或情绪状态变化
- event: 发生的重要事件（旅行、聚会、工作变动等）

输出JSON数组，每条包含 type 和 content。如果没有有价值的信息，输出空数组 []。
格式: [{"type":"fact","content":"用户叫小明"},{"type":"preference","content":"用户喜欢吃火锅"}]
只输出JSON，不要其他文字。`;

    const response = await chatCompletion([
      { role: 'system', content: '你是一个记忆提取助手。只输出JSON。' },
      { role: 'user', content: prompt },
    ], { tools: false, temperature: 0.2, max_tokens: 500 });
    
    let fragments;
    try {
      const text = response.content.trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      fragments = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      console.error('Failed to parse memory extraction response');
      return [];
    }
    
    if (!Array.isArray(fragments) || fragments.length === 0) return [];
    
    const results = [];
    for (const frag of fragments) {
      if (!frag.type || !frag.content) continue;
      
      const entities = extractSimpleEntities(frag.content);
      
      // Get embedding
      let vectorId = null;
      try {
        const embedding = await getEmbedding(frag.content);
        vectorId = await storeInVectorService(frag.content, embedding, {
          type: frag.type,
          conversation_id: conversationId,
          entities,
        });
      } catch (e) {
        console.error('Embedding/store error for fragment:', e.message);
      }
      
      const id = insertMemoryFragment(
        conversationId, frag.type, frag.content, vectorId, entities, sourceMsgId
      );
      results.push({ id, ...frag, vectorId, entities });
    }
    
    return results;
  } catch (error) {
    console.error('Memory extraction error:', error.message);
    return [];
  }
}

function extractSimpleEntities(text) {
  const entities = [];
  // Extract quoted strings, capitalized words, Chinese names
  const patterns = [
    /「([^」]+)」/g,
    /"([^"]+)"/g,
    /《([^》]+)》/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push(match[1]);
    }
  }
  // Extract potential Chinese names (2-3 char sequences)
  const namePattern = /[\u4e00-\u9fa5]{2,4}/g;
  let nameMatch;
  while ((nameMatch = namePattern.exec(text)) !== null) {
    // Skip common words
    const skipWords = ['用户', '喜欢', '不喜欢', '今天', '明天', '昨天', '一个', '这个', '那个', '什么', '怎么', '为什么'];
    if (!skipWords.includes(nameMatch[0])) {
      entities.push(nameMatch[0]);
    }
  }
  return [...new Set(entities)].slice(0, 10);
}

async function storeInVectorService(content, embedding, metadata) {
  try {
    const response = await fetch(`${config.vectorService.url}/store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, embedding, metadata }),
    });
    if (!response.ok) throw new Error(`Vector store failed: ${response.status}`);
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Vector store error:', error.message);
    return null;
  }
}

// ========== TRIPLE RECALL + RRF FUSION ==========

export async function recallMemories(query, conversationId = null) {
  try {
    // Generate embedding for query
    const queryEmbedding = await getEmbedding(query);
    
    // Extract entities from query for entity search
    const queryEntities = extractSimpleEntities(query);
    
    // Run triple recall in parallel
    const [ftsResults, vectorResults, entityResults] = await Promise.all([
      recallFTS(query),
      recallVector(queryEmbedding),
      recallEntities(queryEntities),
    ]);
    
    // RRF Fusion
    const fused = rrfFuse([ftsResults, vectorResults, entityResults]);
    
    return fused.slice(0, MAX_RECALL);
  } catch (error) {
    console.error('Memory recall error:', error.message);
    return [];
  }
}

async function recallFTS(query) {
  // Search both memory fragments and messages
  const memResults = searchMemoryFTS(query, 20);
  const msgResults = searchMessageFTS(query, 10);
  
  return [
    ...memResults.map((r, i) => ({ ...r, rank: i + 1, source: 'memory_fts' })),
    ...msgResults.map((r, i) => ({
      id: r.id,
      content: r.content,
      type: 'message',
      rank: memResults.length + i + 1,
      source: 'message_fts',
    })),
  ];
}

async function recallVector(queryEmbedding) {
  try {
    const response = await fetch(`${config.vectorService.url}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embedding: queryEmbedding, n_results: 20 }),
    });
    
    if (!response.ok) return [];
    const data = await response.json();
    
    return (data.results || []).map((r, i) => ({
      id: r.id,
      content: r.content,
      type: r.metadata?.type || 'fact',
      entities: r.metadata?.entities || [],
      rank: i + 1,
      source: 'vector',
      score: r.distance,
    }));
  } catch (error) {
    console.error('Vector recall error:', error.message);
    return [];
  }
}

async function recallEntities(entities) {
  if (!entities.length) return [];
  const results = getMemoryByEntities(entities);
  return results.map((r, i) => ({
    ...r,
    entities: typeof r.entities === 'string' ? JSON.parse(r.entities) : r.entities,
    rank: i + 1,
    source: 'entity',
  }));
}

// ========== RRF (Reciprocal Rank Fusion) ==========

function rrfFuse(resultLists) {
  const scoreMap = new Map();
  
  for (const list of resultLists) {
    for (const item of list) {
      const key = item.id || `${item.source}_${item.content?.substring(0, 50)}`;
      const current = scoreMap.get(key) || { score: 0, item: null };
      current.score += 1 / (RRF_K + item.rank);
      if (!current.item) current.item = item;
      scoreMap.set(key, current);
    }
  }
  
  // Sort by RRF score descending
  const sorted = [...scoreMap.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .map(([_, v]) => v.item);
  
  // Deduplicate by content similarity
  const seen = new Set();
  const deduped = [];
  for (const item of sorted) {
    const normalized = (item.content || '').substring(0, 80).trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      deduped.push(item);
    }
  }
  
  return deduped;
}

// ========== ASYNC MEMORY PROCESSING ==========

export async function processConversationTurn(conversationId, userMessage, assistantMessage, sourceMsgId) {
  // Run extraction and summary check in parallel
  const [memories] = await Promise.allSettled([
    extractMemories(conversationId, userMessage, assistantMessage, sourceMsgId),
    checkAndGenerateSummary(conversationId),
  ]);
  
  return {
    newMemories: memories.status === 'fulfilled' ? memories.value : [],
  };
}
