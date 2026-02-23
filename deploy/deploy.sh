#!/bin/bash
#deploy codejuan-api to VPS
#run from your local machine:
#  bash deploy/deploy.sh your-vps-ip

set -e

VPS_IP="${1:?Usage: deploy.sh <vps-ip>}"
VPS_USER="deploy"
APP_DIR="/var/www/codejuan-api"

echo "deploying to ${VPS_USER}@${VPS_IP}..."

#sync files to VPS (excludes node_modules, .env, uploads)
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'uploads' \
  --exclude '.git' \
  ./ ${VPS_USER}@${VPS_IP}:${APP_DIR}/

#install dependencies and restart on VPS
ssh ${VPS_USER}@${VPS_IP} << 'EOF'
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  cd /var/www/codejuan-api
  npm install --production
  pm2 restart codejuan-api || pm2 start deploy/ecosystem.config.js
  pm2 save
EOF

echo "deploy complete!"
