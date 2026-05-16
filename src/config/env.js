const path = require('path');
// Load from secrets/.env (or .env in project root as fallback)
const secretsEnv = path.join(process.cwd(), 'secrets', '.env');
if (require('fs').existsSync(secretsEnv)) {
  require('dotenv').config({ path: secretsEnv });
} else {
  require('dotenv').config();
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),

  //resend
  resendApiKey: process.env.RESEND_API_KEY,
  defaultFromEmail: process.env.DEFAULT_FROM_EMAIL || 'noreply@codejuan.com',
  notificationEmail: process.env.NOTIFICATION_EMAIL || 'contact@codejuan.com',
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET,
  forwardToEmail: process.env.FORWARD_TO_EMAIL,
  inboundForwardAddresses: (process.env.INBOUND_FORWARD_ADDRESSES || 'juan@codejuan.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),

  //stripe
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  //database
  databaseUrl: process.env.DATABASE_URL,

  //uploads
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, //10MB

  //google drive (optional - when set, uploads go to Drive instead of local disk)
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
  googleDriveCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_DRIVE_CREDENTIALS_PATH,
};
