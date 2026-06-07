const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

//trust nginx so rate limiting uses the real client IP from X-Forwarded-For
app.set('trust proxy', 1);

//security headers
app.use(helmet());

//CORS -- allow your sites and client sites
app.use(cors({
  origin: (origin, callback) => {
    //allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true);
    if (env.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
}));

//webhooks need raw body -- must be before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/email/webhook', express.raw({ type: 'application/json' }));

//parse JSON and URL-encoded bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

//global rate limiter
app.use('/api/', apiLimiter);

//routes
app.use('/api/contact', require('./routes/contact'));
app.use('/api/email', require('./routes/email'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/health', require('./routes/health'));

//root route
app.get('/', (req, res) => {
  res.json({ name: 'codejuan-api', version: '1.0.0', status: 'running' });
});

//404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

//global error handler
app.use((err, req, res, next) => {
  console.error('unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.port, () => {
  console.log(`codejuan-api running on port ${env.port} [${env.nodeEnv}]`);
});
