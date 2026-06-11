import { Router } from 'express';
import { getAllAgentConfig, setAgentConfig, getEmotionState } from '../db/database.js';
import { getCurrentEmotion } from '../ai/emotion.js';

const router = Router();

// Get agent status
router.get('/status', (req, res) => {
  const emotions = getCurrentEmotion();
  const config = getAllAgentConfig();
  res.json({ name: config.name, emotions, config });
});

// Get personality
router.get('/personality', (req, res) => {
  const config = getAllAgentConfig();
  res.json(config);
});

// Update personality
router.put('/personality', (req, res) => {
  const updates = req.body;
  for (const [key, value] of Object.entries(updates)) {
    if (['name', 'personality', 'age', 'background'].includes(key)) {
      setAgentConfig(key, String(value));
    }
  }
  res.json({ ok: true, config: getAllAgentConfig() });
});

export default router;
