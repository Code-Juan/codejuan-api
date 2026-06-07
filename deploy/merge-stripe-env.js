#!/usr/bin/env node
// Merge STRIPE_* vars from an import file into secrets/.env on the server.
// Usage: node deploy/merge-stripe-env.js /path/to/import.env

const fs = require('fs');
const path = require('path');

const importPath = process.argv[2];
const targetPath = path.join(process.cwd(), 'secrets', '.env');

if (!importPath || !fs.existsSync(importPath)) {
  console.error('Usage: node deploy/merge-stripe-env.js <import.env>');
  process.exit(1);
}

const parse = (text) => {
  const out = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    out[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
  return out;
};

const imported = parse(fs.readFileSync(importPath, 'utf8'));
const keys = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'].filter((k) => imported[k]);

if (keys.length === 0) {
  console.error('No STRIPE_* keys found in import file');
  process.exit(1);
}

let lines = fs.existsSync(targetPath)
  ? fs.readFileSync(targetPath, 'utf8').replace(/\r/g, '').split('\n')
  : [];

for (const key of keys) {
  const value = imported[key];
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  const row = `${key}=${value}`;
  if (idx >= 0) lines[idx] = row;
  else lines.push(row);
  console.log(`${key}: len=${value.length}`);
}

fs.writeFileSync(targetPath, lines.filter((l, i, a) => l.length || i < a.length - 1).join('\n') + '\n');
console.log('Updated', targetPath);
