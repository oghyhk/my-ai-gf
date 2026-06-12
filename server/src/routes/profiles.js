import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAgent,
  getUserProfile,
  updateUserProfile,
  getMoments,
  getMomentsForEntity,
} from '../db/database.js';
import config from '../config.js';

const router = Router();

const upload = multer({
  dest: config.uploads.path,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images'));
  },
});

// Get user profile with their moments
router.get('/me', (req, res) => {
  const profile = getUserProfile();
  const moments = getMoments(30);
  res.json({ ...profile, moments });
});

// Update user profile
router.put('/me', (req, res) => {
  const updates = { ...req.body };
  delete updates.moments;
  const profile = updateUserProfile(updates);
  const moments = getMoments(30);
  res.json({ ...profile, moments });
});

// Get agent's personal page
router.get('/agent/:agentId', (req, res) => {
  const agent = getAgent(req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const moments = getMomentsForEntity('agent', agent.id);
  res.json({
    entity_type: 'agent',
    id: agent.id,
    name: agent.name,
    alias: agent.alias || agent.name,
    bio: agent.bio || '',
    profile_pic: agent.profile_pic || '',
    avatar_emoji: agent.avatar_emoji || '🌸',
    age: agent.age,
    background: agent.background,
    moments,
  });
});

// Upload profile picture
router.post('/upload-pic', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
