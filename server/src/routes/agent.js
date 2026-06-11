import { Router } from 'express';
import { exec, spawn } from 'child_process';
import { getAllAgentConfig, setAgentConfig } from '../db/database.js';
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

// Update app (git pull + rebuild + restart)
router.post('/update', (req, res) => {
  const script = `
    cd ~/my-ai-gf &&
    echo ">>> Pulling latest code..." &&
    git pull origin master &&
    echo ">>> Installing server deps..." &&
    cd server && npm install &&
    echo ">>> Building frontend..." &&
    cd ../client && npm install && npm run build &&
    echo ">>> Restarting PM2..." &&
    pm2 restart all &&
    echo ">>> DONE"
  `;
  
  const child = spawn('bash', ['-c', script]);
  
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.write('Starting update...\n');
  
  child.stdout.on('data', (data) => {
    res.write(data.toString());
  });
  
  child.stderr.on('data', (data) => {
    res.write(`> ${data.toString()}`);
  });
  
  child.on('close', (code) => {
    res.write(`\nUpdate finished (exit code ${code})\n`);
    res.end();
  });
  
  child.on('error', (err) => {
    res.write(`\nError: ${err.message}\n`);
    res.end();
  });
});

// Update server only (restarts PM2)
router.post('/restart', (req, res) => {
  exec('pm2 restart ai-companion-server', (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, output: stdout, error: stderr });
  });
});

export default router;
