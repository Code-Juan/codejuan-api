require('dotenv').config({ path: 'secrets/.env' });
const { Pool } = require('pg');

const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query('select 1')
  .then(() => console.log('db: ok'))
  .catch((e) => console.error('db:', e.message))
  .finally(() => p.end());

const k = process.env.STRIPE_SECRET_KEY || '';
const prefix = k.startsWith('sk_live')
  ? 'sk_live (live)'
  : k.startsWith('sk_test')
    ? 'sk_test (test)'
    : k
      ? 'invalid prefix'
      : 'missing';
console.log('stripe key:', prefix, 'len=' + k.length);
