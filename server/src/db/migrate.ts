import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, queryOne, run } from './wrapper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runMigrations() {
  exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = queryOne('SELECT 1 as x FROM _migrations WHERE name = ?', [file]);
    if (applied) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    exec(sql);
    run('INSERT INTO _migrations (name) VALUES (?)', [file]);
    console.log(`Migration applied: ${file}`);
  }
}
