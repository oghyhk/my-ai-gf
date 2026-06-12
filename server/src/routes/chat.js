import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import {
  createConversation, getConversations, deleteConversation,
  insertMessage, getMessages, updateConversationTime,
} from '../db/database.js';
import { chatStream, chatCompletion } from '../ai/llm.js';
import { buildSystemPrompt } from '../ai/personality.js';
import { getCurrentEmotion, updateEmotionFromConversation } from '../ai/emotion.js';
import { recallMemories, processConversationTurn } from '../ai/memory.js';
import { executeTool } from '../ai/webtools.js';
import { executeIdentityTool } from '../ai/llm.js';
import { analyzeImage } from '../ai/vision.js';
import { initializeIdentityFiles } from '../ai/identity.js';
import { reviewIdentityFiles } from '../ai/review.js';
import config from '../config.js';

const router = Router();

// Initialize identity files on first use
initializeIdentityFiles();

const upload = multer({
  dest: config.uploads.path,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// List conversations
router.get('/conversations', (req, res) => {
  const convs = getConversations();
  res.json(convs);
});

// Create conversation
router.post('/conversations', (req, res) => {
  const { title = '' } = req.body;
  const id = uuid();
  createConversation(id, title);
  res.json({ id, title });
});

// Delete conversation
router.delete('/conversations/:id', (req, res) => {
  deleteConversation(req.params.id);
  res.json({ ok: true });
});

// Get chat history
router.get('/history/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
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
  
  try {
    // Save user message
    const userMsgId = insertMessage(conversationId, 'user', message);
    updateConversationTime(conversationId);
    
    // Get emotion state
    const emotions = getCurrentEmotion();
    
    // Recall relevant memories
    const memories = await recallMemories(message, conversationId);
    
    // Get summaries
    const { getSummaries } = await import('../db/database.js');
    const summaries = getSummaries(conversationId);
    
    // Build system prompt
    const systemPrompt = buildSystemPrompt(emotions, memories, summaries);
    
    // Get recent messages for context (last 20)
    const history = getMessages(conversationId, 20);
    const contextMessages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
    ];
    
    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    let fullResponse = '';
    let toolCallsAccum = [];
    
    try {
      const stream = await chatStream(contextMessages);
      
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;
        
        // Handle tool calls
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!toolCallsAccum[idx]) {
              toolCallsAccum[idx] = { id: '', function: { name: '', arguments: '' } };
            }
            if (tc.id) toolCallsAccum[idx].id = tc.id;
            if (tc.function?.name) toolCallsAccum[idx].function.name += tc.function.name;
            if (tc.function?.arguments) toolCallsAccum[idx].function.arguments += tc.function.arguments;
          }
          continue;
        }
        
        // Handle content
        if (delta.content) {
          fullResponse += delta.content;
          res.write(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`);
        }
      }
    } catch (streamError) {
      console.error('Stream error:', streamError.message);
    }
    
    // Handle tool calls if any
    if (toolCallsAccum.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'thinking', content: '正在使用工具...' })}\n\n`);
      
      const toolResults = [];
      for (const tc of toolCallsAccum) {
        if (!tc.function?.name) continue;
        try {
          const args = JSON.parse(tc.function.arguments);
          // Try identity tools first, then web tools
          let result = await executeIdentityTool(tc.function.name, args);
          if (result === null) {
            result = await executeTool(tc.function.name, args);
          }
          toolResults.push({ name: tc.function.name, result });
          res.write(`data: ${JSON.stringify({ type: 'tool_result', name: tc.function.name, result })}\n\n`);
        } catch (e) {
          console.error('Tool execution error:', e.message);
        }
      }
      
      // Re-call LLM with tool results
      if (toolResults.length > 0) {
        const toolContext = contextMessages.concat([
          { role: 'assistant', content: fullResponse || null, tool_calls: toolCallsAccum.map(tc => ({
            id: tc.id,
            type: 'function',
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
    
    // Save assistant message
    const assistantMsgId = insertMessage(conversationId, 'assistant', fullResponse);
    updateConversationTime(conversationId);
    
    res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMsgId })}\n\n`);
    res.end();
    
    // Async post-processing
    setImmediate(async () => {
      try {
        await Promise.allSettled([
          updateEmotionFromConversation(message, fullResponse),
          processConversationTurn(conversationId, message, fullResponse, assistantMsgId),
          reviewIdentityFiles(conversationId),
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

// Send image
router.post('/send-image', upload.single('image'), async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    // Analyze image
    const analysis = await analyzeImage(path.join(config.uploads.path, req.file.filename));
    
    // Save user message with image
    const userMsgId = insertMessage(conversationId, 'user', `[发送了一张图片: ${analysis}]`, { imageUrl });
    updateConversationTime(conversationId);

    // Get AI response about the image
    const emotions = getCurrentEmotion();
    const systemPrompt = buildSystemPrompt(emotions);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `用户发送了一张图片，图片描述：${analysis}\n\n请自然地回应这张图片。` },
    ];

    const stream = await chatStream(messages);
    let fullResponse = '';
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
      }
    }

    const assistantMsgId = insertMessage(conversationId, 'assistant', fullResponse);
    updateConversationTime(conversationId);

    res.write(`data: ${JSON.stringify({ type: 'done', userMessageId: userMsgId, assistantMessageId: assistantMsgId, imageUrl })}\n\n`);
    res.end();

    // Async processing
    processConversationTurn(conversationId, `[图片: ${analysis}]`, fullResponse, assistantMsgId);
  } catch (error) {
    console.error('Send image error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export conversation
router.get('/export/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = getMessages(conversationId, 10000);
    
    const exportData = {
      conversationId,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
        metadata: m.metadata,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="chat-${conversationId}.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
