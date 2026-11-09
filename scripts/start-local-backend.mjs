// Existing API, loopback only, without background workers during web development.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { assertLocalPasswordSetup } from './setup-admin-password.mjs';
const backend = new URL('../../backend/', import.meta.url);
const require = createRequire(new URL('package.json', backend));
const settings = require('dotenv').parse(fs.readFileSync(new URL('.env', backend)));
assertLocalPasswordSetup(settings);
Object.assign(process.env, settings, { DOTENV_CONFIG_PATH: fileURLToPath(new URL('.env', backend)) });
const { connectDatabase } = await import(new URL('src/config/database.js', backend));
await connectDatabase();
const { createApp } = await import(new URL('src/app.js', backend));
const { env } = await import(new URL('src/config/env.js', backend));
createApp().listen(env.PORT, '127.0.0.1', () => console.info(`Local API ready on loopback port ${env.PORT}. Background workers are not started.`));
