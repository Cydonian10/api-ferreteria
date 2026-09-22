import { readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { AppDataSource } from '../dist/database/data-source.js';

const migrationsDirectory = join(import.meta.dirname, '..', 'src', 'database', 'migrations');
const files = readdirSync(migrationsDirectory)
  .filter((file) => file.endsWith('.ts'))
  .sort();

if (files.length === 0) {
  console.log('No hay migraciones para eliminar.');
  process.exit(0);
}

const lastFile = files.at(-1);
const timestamp = lastFile.split('-')[0];

await AppDataSource.initialize();
try {
  const appliedMigrations = await AppDataSource.query(
    'SELECT "name" FROM "migrations"',
  );

  if (appliedMigrations.some(({ name }) => name.endsWith(timestamp))) {
    console.error(`La migración "${lastFile}" ya fue aplicada.`);
    console.error('Primero reviértela con: npm run migration:revert');
    process.exitCode = 1;
  } else {
    unlinkSync(join(migrationsDirectory, lastFile));
    console.log(`Migración eliminada: ${lastFile}`);
  }
} catch (error) {
  // The migrations table does not exist until the first migration is applied.
  if (error.code === '42P01') {
    unlinkSync(join(migrationsDirectory, lastFile));
    console.log(`Migración eliminada: ${lastFile}`);
  } else {
    throw error;
  }
} finally {
  await AppDataSource.destroy();
}
