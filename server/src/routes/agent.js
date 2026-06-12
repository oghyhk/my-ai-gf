import { Router } from 'express';
import { getAgents } from '../db/database.js';
import { getCurrentEmotion } from '../ai/emotion.js';

const router = Router();

router.get('/status', (req, res) => {
  const emotions = getCurrentEmotion('default');
  const agents = getAgents();
  res.json({ emotions, agents, default_agent: agents[0] });
});

export default router;
