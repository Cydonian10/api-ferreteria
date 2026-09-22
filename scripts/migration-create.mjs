import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const name = process.argv[2];

if (!name || /[\\/]/.test(name)) {
  console.error('Uso: npm run migration:create -- <NombreMigracion>');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const cli = require.resolve('typeorm/cli.js');
const result = spawnSync(
  process.execPath,
  [cli, 'migration:create', `src/database/migrations/${name}`],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
