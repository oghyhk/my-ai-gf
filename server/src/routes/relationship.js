import { Router } from 'express';
import { getRelationship, updateRelationshipStats, addMilestone } from '../db/database.js';

const router = Router();

// Get relationship status
router.get('/', async (req, res) => {
  try {
    // Update stats before returning
    updateRelationshipStats();
    const relationship = getRelationship();
    
    // Calculate progress to next level
    const messagesForNextLevel = Math.pow(relationship.level, 2) * 10;
    const progress = (relationship.total_messages % 10) / 10;
    
    res.json({
      ...relationship,
      progress_to_next: progress,
      messages_for_next: messagesForNextLevel,
    });
  } catch (error) {
    console.error('Relationship fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manually trigger milestone (for testing)
router.post('/milestone', (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }
  addMilestone({ title, description });
  res.json({ ok: true });
});

export default router;
