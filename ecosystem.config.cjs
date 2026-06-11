module.exports = {
  apps: [
    {
      name: 'ai-companion-server',
      script: 'src/index.js',
      cwd: './server',
      node_args: '--experimental-modules',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
    },
    {
      name: 'ai-companion-vector',
      script: 'uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8000',
      cwd: './vector-service',
      interpreter: 'python3',
      env: {
        PYTHONUNBUFFERED: '1',
      },
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/vector-error.log',
      out_file: './logs/vector-out.log',
    },
  ],
};
