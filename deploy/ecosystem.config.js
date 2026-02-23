//PM2 process manager configuration
//usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [{
    name: 'codejuan-api',
    script: 'src/index.js',
    cwd: '/var/www/codejuan-api',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: '/var/log/codejuan-api/error.log',
    out_file: '/var/log/codejuan-api/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
};
