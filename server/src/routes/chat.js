import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import {
  createConversation, getConversations, deleteConversation,
  insertMessage, getMessages, updateConversationTime, getConversation,
  getOrCreateConversationForAgent,
  getAgent,
} from '../db/database.js';
import { executeTool } from '../ai/webtools.js';
import { ensureAgentFiles } from '../ai/identity.js';
import config from '../config.js';
import { chatStream, chatCompletion } from '../ai/llm.js';
import { buildSystemPrompt } from '../ai/personality.js';
import { getCurrentEmotion, updateEmotionFromConversation } from '../ai/emotion.js';
import { recallMemories, processConversationTurn } from '../ai/memory.js';

const router = Router();

// Ensure default agent files exist
ensureAgentFiles('default', '小悠');

const upload = multer({
  dest: config.uploads.path,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// List conversations (all, or by agent)
router.get('/conversations', (req, res) => {
  const { agentId } = req.query;
  const convs = getConversations(agentId || null);
  res.json(convs);
});

// Get single conversation with agent info
router.get('/conversations/:id', (req, res) => {
  const conv = getConversation(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Not found' });
  res.json(conv);
});

// Create conversation
router.post('/conversations', (req, res) => {
  const { title = '', agentId = 'default' } = req.body;
  const id = uuid();
  const agent = getAgent(agentId);
  if (agent) ensureAgentPersonality(agentId, agent.name);
  createConversation(id, title, agentId);
  res.json({ id, title, agentId });
});

// Delete conversation and its messages
router.delete('/conversations/:id', (req, res) => {
  deleteConversation(req.params.id);
  res.json({ ok: true });
});

// Get or create agent's single conversation  
router.get('/agent-session/:agentId', (req, res) => {
  const conv = getOrCreateConversationForAgent(req.params.agentId);
  res.json(conv);
});

// Get chat history
router.get('/history/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  const limit = parseInt(req.query.limit) || 100;
  const before = req.query.before ? parseInt(req.query.before) : null;
  const messages = getMessages(conversationId, limit, before);
  res.json(messages);
});

// Send message (SSE streaming)
router.post('/send', async (req, res) => {
  const { conversationId, message } = req.body;
  
  if (!conversationId || !message) {
    return res.status(400).json({ error: 'conversationId and message required' });
  }

  const conv = getConversation(conversationId);
  const agentId = conv?.agent_id || 'default';
  
  try {
    const userMsgId = insertMessage(conversationId, 'user', message);
    updateConversationTime(conversationId);
    
    const emotions = getCurrentEmotion(agentId);
    const memories = await recallMemories(message, conversationId);
    
    const { getSummaries } = await import('../db/database.js');
    const summaries = getSummaries(conversationId);
    
    const systemPrompt = buildSystemPrompt(agentId, emotions, memories, summaries);
    
    const history = getMessages(conversationId, 100);
    const contextMessages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
    ];
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    let fullResponse = '';
    let totalTokens = { prompt: 0, completion: 0 };
    let toolCallsAccum = [];
    
    try {
      const stream = await chatStream(contextMessages);
      
      for await (const chunk of stream) {
        // Check for usage info (last chunk with usage)
        if (chunk.usage) {
          totalTokens.prompt = chunk.usage.prompt_tokens || 0;
          totalTokens.completion = chunk.usage.completion_tokens || 0;
          res.write(`data: ${JSON.stringify({ type: 'usage', prompt: totalTokens.prompt, completion: totalTokens.completion })}\n\n`);
          continue;
        }
        
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;
        
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!toolCallsAccum[idx]) toolCallsAccum[idx] = { id: '', function: { name: '', arguments: '' } };
            if (tc.id) toolCallsAccum[idx].id = tc.id;
            if (tc.function?.name) toolCallsAccum[idx].function.name += tc.function.name;
            if (tc.function?.arguments) toolCallsAccum[idx].function.arguments += tc.function.arguments;
          }
          continue;
        }
        
        if (delta.content) {
          fullResponse += delta.content;
          res.write(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`);
        }
      }
    } catch (e) {
      console.error('Stream error:', e.message);
    }
    
    // Handle tool calls
    if (toolCallsAccum.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'thinking', content: '正在使用工具...' })}\n\n`);
      
      const toolResults = [];
      for (const tc of toolCallsAccum) {
        if (!tc.function?.name) continue;
        try {
          const args = JSON.parse(tc.function.arguments);
          // Pass agentId to identity tools for per-agent personality editing
          if (['update_self_info', 'read_self_info'].includes(tc.function.name)) {
            args.agentId = agentId;
          }
          let result = await executeIdentityTool(tc.function.name, args);
          if (result === null) result = await executeTool(tc.function.name, args);
          toolResults.push({ name: tc.function.name, result });
          res.write(`data: ${JSON.stringify({ type: 'tool_result', name: tc.function.name, result })}\n\n`);
        } catch (e) {
          console.error('Tool execution error:', e.message);
        }
      }
      
      if (toolResults.length > 0) {
        const toolContext = contextMessages.concat([
          { role: 'assistant', content: fullResponse || null, tool_calls: toolCallsAccum.map(tc => ({
            id: tc.id, type: 'function',
            function: { name: tc.function.name, arguments: tc.function.arguments },
          }))},
          ...toolResults.map(tr => ({
            role: 'tool',
            tool_call_id: toolCallsAccum.find(tc => tc.function.name === tr.name)?.id || '',
            content: tr.result,
          })),
        ]);
        
        try {
          const followUp = await chatCompletion(toolContext, { tools: false });
          fullResponse += '\n' + followUp.content;
          res.write(`data: ${JSON.stringify({ type: 'content', content: '\n' + followUp.content })}\n\n`);
        } catch (e) {
          console.error('Follow-up LLM error:', e.message);
        }
      }
    }
    
    const assistantMsgId = insertMessage(conversationId, 'assistant', fullResponse);
    updateConversationTime(conversationId);
    
    res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMsgId, usage: totalTokens })}\n\n`);
    res.end();
    
    setImmediate(async () => {
      try {
        await Promise.allSettled([
          updateEmotionFromConversation(agentId, message, fullResponse),
          processConversationTurn(conversationId, message, fullResponse, assistantMsgId),
          reviewIdentityFiles(conversationId, agentId),
        ]);
      } catch (e) {
        console.error('Post-processing error:', e.message);
      }
    });
    
  } catch (error) {
    console.error('Chat send error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

// Export conversation
router.get('/export/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = getMessages(conversationId, 10000);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="chat-${conversationId}.json"`);
    res.json({ conversationId, exportedAt: new Date().toISOString(), messageCount: messages.length,
      messages: messages.map(m => ({ role: m.role, content: m.content, timestamp: m.created_at })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
