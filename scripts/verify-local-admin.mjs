// Operator smoke check against the real local API. No recording, traces or secrets on disk.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import readline from 'node:readline/promises';
import { Writable } from 'node:stream';
import { chromium } from '@playwright/test';
import { assertLocalPasswordSetup } from './setup-admin-password.mjs';
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
let browser;
let phase = 'configuration';
const transportFailures = [];
try {
  const settings = require('dotenv').parse(fs.readFileSync(new URL('../../backend/.env', import.meta.url)));
  assertLocalPasswordSetup(settings);
  const site = new URL(process.argv[2] || 'http://127.0.0.1:3100');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(site.hostname) || site.protocol !== 'http:') throw new Error();
  if (!process.stdin.isTTY) throw new Error();
  const silent = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  const reader = readline.createInterface({ input: process.stdin, output: silent, terminal: true });
  process.stdout.write('Local Admin password for browser check (hidden): ');
  let secret;
  try { secret = await reader.question(''); } finally { reader.close(); process.stdout.write('\n'); }
  phase = 'browser launch';
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const allowedApi = `http://127.0.0.1:${settings.PORT || 4000}`;
  await page.route('**/api/v1/**', route => {
    const target = new URL(route.request().url());
    if (target.origin !== allowedApi) { transportFailures.push({ port: target.port, path: target.pathname, reason: 'unexpected API origin' }); return route.abort(); }
    return route.continue();
  });
  page.on('response', response => {
    const target = new URL(response.url());
    if (target.pathname.startsWith('/api/v1/auth/') && response.status() >= 400) transportFailures.push({ path: target.pathname, status: response.status() });
  });
  phase = 'anonymous route redirect';
  await page.goto(new URL('/admin', site).href);
  await page.waitForURL('**/login', { timeout: 30000 });
  phase = 'login form';
  await page.getByLabel('Mobile Number').fill(settings.ADMIN_PHONE);
  await page.getByLabel('Password', { exact: true }).fill(secret);
  phase = 'password verification and dashboard';
  await page.getByRole('button', { name: 'Login', exact: true }).click(); secret = '';
  await page.waitForURL('**/admin', { timeout: 60000 });
  await page.getByRole('navigation', { name: 'admin dashboard' }).waitFor();
  phase = 'Admin Settings';
  await page.getByRole('link', { name: 'Admin Settings', exact: true }).click();
  await page.getByRole('heading', { name: 'Change password' }).waitFor();
  phase = 'logout and session revocation';
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await page.waitForURL('**/login', { timeout: 30000 });
  await page.goto(new URL('/admin', site).href);
  await page.waitForURL('**/login', { timeout: 30000 });
  console.info('Real local Admin browser login, server route protection, Settings and logout passed. No password change was performed on the operator account.');
} catch {
  console.error('Local browser verification failed.', { phase, transportFailures }); process.exitCode = 1;
} finally { await browser?.close(); }
