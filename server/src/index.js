import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import { getDb } from './db/database.js';
import { startEmotionDecay } from './ai/emotion.js';
import { startMomentsCron, stopMomentsCron } from './cron/moments-cron.js';
import './cron/daily-checkin.js';
import chatRouter from './routes/chat.js';
import momentsRouter from './routes/moments.js';
import agentRouter from './routes/agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(config.uploads.path));

// Serve frontend
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// API routes
app.use('/api/chat', chatRouter);
app.use('/api/moments', momentsRouter);
app.use('/api/agent', agentRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Initialize
getDb();
startEmotionDecay();
startMomentsCron();

const server = app.listen(config.port, () => {
  console.log(`AI Companion server running on port ${config.port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  stopMomentsCron();
  server.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  stopMomentsCron();
  server.close();
  process.exit(0);
});
