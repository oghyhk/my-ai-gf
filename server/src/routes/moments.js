import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  insertMoment, getMoments, getMoment, deleteMoment,
  insertMomentInteraction, getMomentInteractions,
} from '../db/database.js';
import config from '../config.js';

const router = Router();

// Ensure uploads directory exists
if (!fs.existsSync(config.uploads.path)) {
  fs.mkdirSync(config.uploads.path, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploads.path,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

// Upload image (separate route before :id)
router.post('/upload', upload.array('images', 9), (req, res) => {
  const files = req.files || [];
  const urls = files.map(f => `/uploads/${f.filename}`);
  res.json({ urls });
});

// Create moment
router.post('/', (req, res) => {
  const { content, images = [] } = req.body;
  if (!content && images.length === 0) {
    return res.status(400).json({ error: 'Content or images required' });
  }
  const id = insertMoment(content, images);
  const moment = getMoment(id);
  res.json(moment);
});

// Get all moments
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const moments = getMoments(limit, offset);
  
  // Attach interactions
  const enriched = moments.map(m => ({
    ...m,
    interactions: getMomentInteractions(m.id),
  }));
  
  res.json(enriched);
});

// Get single moment
router.get('/:id', (req, res) => {
  const moment = getMoment(parseInt(req.params.id));
  if (!moment) return res.status(404).json({ error: 'Not found' });
  moment.interactions = getMomentInteractions(moment.id);
  res.json(moment);
});

// Delete moment
router.delete('/:id', (req, res) => {
  deleteMoment(parseInt(req.params.id));
  res.json({ ok: true });
});

export default router;
