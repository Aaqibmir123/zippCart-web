const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const files = ['tests', 'tests/unit'].flatMap(directory => fs.readdirSync(path.join(root, directory))
  .filter(file => /\.test\.(mjs|cjs)$/.test(file)).map(file => path.join(directory, file)));
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], { cwd: root, stdio: 'inherit' });
if (result.error) { console.error(result.error.message); process.exit(1); }
process.exit(result.status ?? 1);
