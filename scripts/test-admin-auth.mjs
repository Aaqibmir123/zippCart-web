import fs from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertLocalPasswordSetup } from './setup-admin-password.mjs';
const backend = new URL('../../backend/', import.meta.url);
const require = createRequire(new URL('package.json', backend));
const settings = require('dotenv').parse(fs.readFileSync(new URL('.env', backend)));
assertLocalPasswordSetup(settings);
await import(new URL('scripts/unit-environment.js', backend));
process.env.ADMIN_PASSWORD_TEST_MONGODB_URI = settings.MONGODB_URI;
const result = spawnSync(process.execPath, ['--test', 'tests/admin-password.test.js'], {
  cwd: fileURLToPath(backend), env: process.env, stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
