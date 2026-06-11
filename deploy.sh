#!/bin/bash
# AI Companion - VPS Deployment Script
# Run this on your VPS: android@asc.hk (port 3680)
# Usage: bash deploy.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=== AI Companion VPS Deployment ==="

# 1. Ensure Node.js 20+
echo "[1/11] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "  Node.js: $(node --version)"

# 2. Ensure Python 3
echo "[2/11] Checking Python..."
if ! command -v python3 &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip python3-venv
fi
echo "  Python: $(python3 --version)"

# 3. Install PM2
echo "[3/11] Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# 4. Install git if missing
echo "[4/11] Checking git..."
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
fi

# 5. Clone or update repo
echo "[5/11] Setting up repository..."
if [ -d ~/my-ai-gf ]; then
    cd ~/my-ai-gf
    git pull origin master
else
    cd ~
    git clone https://github.com/oghyhk/my-ai-gf.git
    cd my-ai-gf
fi

# 6. Create .env from credentials file or prompt user
echo "[6/11] Setting up .env..."
if [ -f ~/.ai-gf-env ]; then
    echo "  Found ~/.ai-gf-env, copying..."
    cp ~/.ai-gf-env .env
elif [ -f creds.txt ]; then
    echo "  Found creds.txt, extracting keys..."
    DEEPSEEK_KEY=$(grep -oP 'deepseek[^=]*= \K\S+' creds.txt)
    MIMO_KEY=$(grep -oP 'mimo[^=]*= \K\S+' creds.txt)
    OPENROUTER_KEY=$(grep -oP 'openrouter[^=]*= \K\S+' creds.txt)
    ENCRYPTION_KEY=$(openssl rand -hex 32)

    cat > .env << ENVEOF
DEEPSEEK_API_KEY=${DEEPSEEK_KEY}
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

MIMO_API_KEY=${MIMO_KEY}
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5

OPENROUTER_API_KEY=${OPENROUTER_KEY}
EMBEDDING_MODEL=cohere/embed-v4.0

ENCRYPTION_KEY=${ENCRYPTION_KEY}

VECTOR_SERVICE_URL=http://localhost:8000

PORT=3000
ENVEOF
    echo ".env created from creds.txt"
else
    echo "${RED}No credentials found. Create ~/.ai-gf-env file on VPS with:${NC}"
    echo "  DEEPSEEK_API_KEY=sk-xxx"
    echo "  MIMO_API_KEY=sk-xxx"
    echo "  OPENROUTER_API_KEY=sk-xxx"
    echo ""
    echo "Then re-run: bash deploy.sh"
    echo ""
    echo "Or upload creds.txt from your local machine to ~/my-ai-gf/creds.txt and re-run."
    exit 1
fi

# 7. Create data/config directories
echo "[7/11] Creating directories..."
mkdir -p server/data
mkdir -p server/uploads
mkdir -p ../logs

# 8. Install server dependencies
echo "[8/11] Installing server dependencies..."
cd server
npm install

# 9. Install vector service
echo "[9/11] Installing vector service..."
cd ../vector-service
if [ ! -d venv ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt
deactivate

# 10. Build client
echo "[10/11] Building frontend..."
cd ../client
npm install
npm run build
echo "  ${GREEN}Client built${NC}"

# 11. Start with PM2
echo "[11/11] Starting services..."
cd ~/my-ai-gf
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup --user android 2>/dev/null || true

echo ""
echo "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
pm2 status
echo ""
echo "Frontend: http://localhost:3000"
echo "Health:   curl http://localhost:3000/api/health"
echo ""
echo "Useful commands:"
echo "  pm2 status      - View service status"
echo "  pm2 logs        - View all logs"
echo "  pm2 restart all - Restart everything"
echo ""
