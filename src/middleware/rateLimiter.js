const rateLimit = require('express-rate-limit');

//general API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minutes
  max: 100, //100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

//stricter limiter for contact form submissions
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, //1 hour
  max: 5, //5 submissions per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many form submissions. Please try again in an hour.' },
});

//stricter limiter for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment requests. Please try again later.' },
});

module.exports = { apiLimiter, contactLimiter, paymentLimiter };
