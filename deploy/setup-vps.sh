#!/bin/bash
#VPS initial setup script for codejuan-api
#run as root on a fresh Ubuntu 24.04 LTS server
#usage: bash setup-vps.sh

set -e

echo "=== codeJuan API - VPS Setup ==="

#1. system updates
echo "[1/8] updating system..."
apt update && apt upgrade -y

#2. create non-root user
echo "[2/8] creating deploy user..."
if ! id "deploy" &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
    #copy SSH keys from root to deploy user
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
    echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/deploy
fi

#3. firewall
echo "[3/8] configuring firewall..."
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    #SSH
ufw allow 80/tcp    #HTTP
ufw allow 443/tcp   #HTTPS
ufw --force enable

#4. install nginx
echo "[4/8] installing nginx..."
apt install -y nginx
systemctl enable nginx

#5. install Node.js via nvm (as deploy user)
echo "[5/8] installing Node.js..."
su - deploy -c '
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install --lts
    nvm use --lts
    npm install -g pm2
'

#6. install PostgreSQL
echo "[6/8] installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql

#create database and user
sudo -u postgres psql -c "CREATE USER codejuan_api WITH PASSWORD 'CHANGE_THIS_PASSWORD';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE codejuan OWNER codejuan_api;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE codejuan TO codejuan_api;" 2>/dev/null || true

#7. install certbot for SSL
echo "[7/8] installing certbot..."
apt install -y certbot python3-certbot-nginx

#8. create app directories
echo "[8/8] creating directories..."
mkdir -p /var/www/codejuan-api
mkdir -p /var/www/uploads
mkdir -p /var/log/codejuan-api
chown -R deploy:deploy /var/www/codejuan-api
chown -R deploy:deploy /var/www/uploads
chown -R deploy:deploy /var/log/codejuan-api

#enable automatic security updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "1. Change the PostgreSQL password in the script above and in your .env file"
echo "2. Upload your API code to /var/www/codejuan-api/"
echo "3. Copy deploy/nginx-api.conf to /etc/nginx/sites-available/api.codejuan.com"
echo "4. Symlink: ln -s /etc/nginx/sites-available/api.codejuan.com /etc/nginx/sites-enabled/"
echo "5. Run: nginx -t && systemctl reload nginx"
echo "6. Point api.codejuan.com A record to this server's IP"
echo "7. Run: certbot --nginx -d api.codejuan.com"
echo "8. As deploy user: cd /var/www/codejuan-api && npm install --production"
echo "9. Run the database schema: psql -U codejuan_api -d codejuan -f src/db/schema.sql"
echo "10. Create .env file from .env.example"
echo "11. Start with PM2: pm2 start deploy/ecosystem.config.js"
echo "12. Save PM2 startup: pm2 save && pm2 startup"
echo ""
echo "Disable root SSH login for security:"
echo "  Edit /etc/ssh/sshd_config: PermitRootLogin no"
echo "  Restart: systemctl restart sshd"
