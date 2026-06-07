require('dotenv').config({ path: 'secrets/.env' });
const { execSync } = require('child_process');
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL missing');
  process.exit(1);
}

const parsed = new URL(dbUrl);
const user = decodeURIComponent(parsed.username);
const password = decodeURIComponent(parsed.password);
const db = parsed.pathname.replace(/^\//, '');

const escaped = password.replace(/'/g, "''");
execSync(
  `sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER ${user} WITH PASSWORD '${escaped}';"`,
  { stdio: 'inherit' }
);

const pool = new Pool({ connectionString: dbUrl });
pool
  .query('SELECT 1')
  .then(() => console.log('db: ok after password sync'))
  .catch((e) => {
    console.error('db still failing:', e.message);
    process.exit(1);
  })
  .finally(() => pool.end());
