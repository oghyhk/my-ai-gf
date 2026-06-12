import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import {
  getAgents,
  getAgent,
  createAgent as dbCreateAgent,
  updateAgent,
  deleteAgent,
  getConversationsForAgent,
} from '../db/database.js';
import {
  readAgentPersonality,
  writeAgentPersonality,
  readGlobalUserMd,
  writeGlobalUserMd,
  ensureAgentFiles,
} from '../ai/identity.js';

const router = Router();

// Get all agents
router.get('/', (req, res) => {
  const agents = getAgents();
  // For each agent, attach last session time
  const enriched = agents.map(a => {
    const convs = getConversationsForAgent(a.id);
    const lastMsg = convs.length > 0 ? convs[0].updated_at : null;
    return {
      ...a,
      session_count: convs.length,
      total_messages: convs.reduce((sum, c) => sum + (c.message_count || 0), 0),
      last_active: lastMsg,
      avatar_emoji: a.avatar_emoji || '🌸',
    };
  });
  res.json(enriched);
});

// Get single agent
router.get('/:id', (req, res) => {
  const agent = getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const personality = readAgentPersonality(agent.id);
  res.json({ ...agent, personality_md: personality });
});

// Create agent
router.post('/', (req, res) => {
  const { name, avatar_emoji, alias, bio, profile_pic, personality_text, age, background } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  
  const id = uuid();
  const agent = dbCreateAgent(id, name, avatar_emoji || '🌸', alias || '', bio || '', profile_pic || '', personality_text || '', age || '22', background || '');
  ensureAgentFiles(id, name);
  res.json(agent);
});

// Update agent
router.put('/:id', (req, res) => {
  const agent = updateAgent(req.params.id, req.body);
  if (!agent) return res.status(404).json({ error: 'Not found' });
  if (req.body.personality_md) {
    writeAgentPersonality(req.params.id, req.body.personality_md);
  }
  res.json({ ...agent, personality_md: readAgentPersonality(req.params.id) });
});

// Delete agent
router.delete('/:id', (req, res) => {
  if (req.params.id === 'default') return res.status(400).json({ error: 'Cannot delete default agent' });
  const ok = deleteAgent(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// Get agent's conversations/sessions
router.get('/:id/conversations', (req, res) => {
  const convs = getConversationsForAgent(req.params.id);
  res.json(convs);
});

// User profile (USER.md)
router.get('/user/profile', (req, res) => {
  const content = readGlobalUserMd();
  res.json({ content });
});

router.put('/user/profile', (req, res) => {
  writeGlobalUserMd(req.body.content || '');
  res.json({ ok: true, content: readGlobalUserMd() });
});

export default router;
