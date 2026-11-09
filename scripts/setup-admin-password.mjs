// Local operator command. No secret CLI arguments, files or stdout output.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import readline from 'node:readline/promises';
import { Writable } from 'node:stream';
const backend = new URL('../../backend/', import.meta.url);
const require = createRequire(new URL('package.json', backend));
const mongoose = require('mongoose');
export function assertLocalPasswordSetup(value) {
  const uri = new URL(value.MONGODB_URI);
  if (value.NODE_ENV !== 'development' || value.DATABASE_ENVIRONMENT !== 'single' || value.REVIEWER_ONLY === 'true'
    || !['mongodb:'].includes(uri.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(uri.hostname)
    || decodeURIComponent(uri.pathname) !== '/zippcart_local'
    || (uri.searchParams.has('dbName') && uri.searchParams.get('dbName') !== 'zippcart_local')
    || !/^[6-9]\d{9}$/.test(value.ADMIN_PHONE ?? '')) throw new Error('LOCAL_SETUP_REQUIRED');
}
async function secretInput() {
  if (process.argv.includes('--stdin')) {
    let text = '';
    for await (const chunk of process.stdin) {
      text += chunk;
      if (Buffer.byteLength(text) > 4096) throw new Error('INPUT_TOO_LARGE');
      if (text.includes('\n')) break;
    }
    return JSON.parse(text);
  }
  if (!process.stdin.isTTY) throw new Error('INTERACTIVE_TERMINAL_REQUIRED');
  const silent = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const reader = readline.createInterface({ input: process.stdin, output: silent, terminal: true });
  try {
    process.stdout.write('Initial Admin password (hidden): ');
    const password = await reader.question('');
    process.stdout.write('\nConfirm password (hidden): ');
    const confirm = await reader.question(''); process.stdout.write('\n');
    return { password, confirm };
  } finally { reader.close(); }
}
async function runSetup() { try {
  const settings = require('dotenv').parse(fs.readFileSync(new URL('.env', backend)));
  assertLocalPasswordSetup(settings);
  Object.assign(process.env, settings, { DOTENV_CONFIG_PATH: fileURLToPath(new URL('.env', backend)) });
  const { hashAdminPassword } = await import(new URL('src/shared/services/auth.service.js', backend));
  const { createUserRepository } = await import(new URL('src/shared/repositories/user.repository.js', backend));
  const { configureMongooseForService } = await import(new URL('src/config/database.js', backend));
  const input = await secretInput();
  if (input.password !== input.confirm) throw new Error('PASSWORD_CONFIRMATION_MISMATCH');
  const hash = await hashAdminPassword(input.password);
  input.password = ''; input.confirm = '';
  configureMongooseForService();
  await mongoose.connect(settings.MONGODB_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 5000 });
  if (mongoose.connection.name !== 'zippcart_local') throw new Error('LOCAL_SETUP_REQUIRED');
  // Local-only enforcement of the existing User phone uniqueness constraint.
  await mongoose.connection.collection('users').createIndex({ phone: 1 }, { unique: true });
  await mongoose.connection.collection('authratelimits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const repository = createUserRepository();
  let account = await repository.findForAdminPassword(settings.ADMIN_PHONE);
  if (!account && process.argv.includes('--create-if-missing')) {
    await repository.findOrCreateByPhone(settings.ADMIN_PHONE);
    account = await repository.findForAdminPassword(settings.ADMIN_PHONE);
  }
  if (!account?.roles?.includes('admin') || account.reviewerProvisioned || account.adminPasswordHash || account.passwordHash) throw new Error('ACCOUNT_NOT_ELIGIBLE');
  if (!await repository.setAdminPassword(account.id, null, account.authVersion ?? 0, hash)) throw new Error('ACCOUNT_CHANGED');
  console.info('Local Admin password configured. Existing sessions revoked. No credentials were printed.');
} catch {
  console.error('Local setup stopped. Use only the development zippcart_local database and an unconfigured Admin account; password entries must match. No credentials were printed.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); } }
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await runSetup();
