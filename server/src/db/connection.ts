import initSqlJs, { type Database } from 'sql.js';
import fs from 'fs';
import { config } from '../config.js';

let db: Database;

export async function initDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing database file if it exists
  if (fs.existsSync(config.dbPath)) {
    const buffer = fs.readFileSync(config.dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(config.dbPath, buffer);
}

// Auto-save periodically
let saveInterval: ReturnType<typeof setInterval>;
export function startAutoSave(intervalMs = 5000) {
  saveInterval = setInterval(() => saveDb(), intervalMs);
}

export function stopAutoSave() {
  if (saveInterval) clearInterval(saveInterval);
}
