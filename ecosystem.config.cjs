const path = require('path');
const os = require('os');

const DATA_DIR = path.join(os.homedir(), 'ai-gf-data');

module.exports = {
  apps: [
    {
      name: 'ai-companion-server',
      script: 'src/index.js',
      cwd: path.join(__dirname, 'server'),
      env: {
        NODE_ENV: 'production',
        DB_PATH: path.join(DATA_DIR, 'companion.db'),
        DATA_DIR: DATA_DIR,
      },
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: path.join(__dirname, 'logs', 'server-error.log'),
      out_file: path.join(__dirname, 'logs', 'server-out.log'),
    },
    {
      name: 'ai-companion-vector',
      script: 'venv/bin/uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8000',
      cwd: path.join(__dirname, 'vector-service'),
      interpreter: 'none',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: path.join(__dirname, 'logs', 'vector-error.log'),
      out_file: path.join(__dirname, 'logs', 'vector-out.log'),
    },
  ],
};
