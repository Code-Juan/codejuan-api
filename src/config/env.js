require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),

  //resend
  resendApiKey: process.env.RESEND_API_KEY,
  defaultFromEmail: process.env.DEFAULT_FROM_EMAIL || 'noreply@codejuan.com',
  notificationEmail: process.env.NOTIFICATION_EMAIL || 'contact@codejuan.com',

  //stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  //database
  databaseUrl: process.env.DATABASE_URL,

  //uploads
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, //10MB
};
