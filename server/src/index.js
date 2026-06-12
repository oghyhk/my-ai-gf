import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from './config.js';
import { getDb } from './db/database.js';
import { startEmotionDecay } from './ai/emotion.js';
import { startMomentsCron, stopMomentsCron } from './cron/moments-cron.js';
import './cron/daily-checkin.js';
import chatRouter from './routes/chat.js';
import momentsRouter from './routes/moments.js';
import agentRouter from './routes/agent.js';
import diaryRouter from './routes/diary.js';
import relationshipRouter from './routes/relationship.js';
import agentsRouter from './routes/agents.js';
import profilesRouter from './routes/profiles.js';

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
app.use('/api/agents', agentsRouter);
app.use('/api/diary', diaryRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/relationship', relationshipRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Auto-backup on startup
function startupBackup() {
  const dbPath = config.db.path;
  const dataDir = config.data.path;
  const backupDir = path.join(dataDir, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, path.join(backupDir, `companion-${ts}.db`));
  const userDir = path.join(dataDir, 'user');
  if (fs.existsSync(userDir)) {
    for (const f of fs.readdirSync(userDir)) {
      fs.copyFileSync(path.join(userDir, f), path.join(backupDir, `${f}-${ts}.md`));
    }
  }
  // Keep only last 20 backups
  const files = fs.readdirSync(backupDir).sort().reverse();
  for (const f of files.slice(20)) fs.unlinkSync(path.join(backupDir, f));
  console.log(`[Startup] Data backed up to ${backupDir}`);
}

// Initialize
startupBackup();
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
