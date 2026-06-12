#!/bin/bash
set -e
GREEN='\033[0;32m'
NC='\033[0m'

echo "=== AI Companion VPS Deploy ==="
cd ~/my-ai-gf
git pull origin master

# Install deps
cd server && npm install && cd ..
cd client && npm install && npm run build && cd ..
cd vector-service && source venv/bin/activate && pip install -q -r requirements.txt && deactivate && cd ..

# Ensure persistent data dir OUTSIDE repo
mkdir -p ~/ai-gf-data/user
mkdir -p ~/ai-gf-data/uploads

echo "${GREEN}Build complete, restarting...${NC}"
pm2 restart all
sleep 3
pm2 status
echo ""
echo "${GREEN}Deploy done${NC}"
echo "Health: curl http://localhost:3000/api/health"
