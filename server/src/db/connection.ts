import initSqlJs, { type Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

let db: Database;

export async function initDb(): Promise<Database> {
  if (db) return db;

  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

  const SQL = await initSqlJs();

  if (fs.existsSync(config.dbPath)) {
    const buffer = fs.readFileSync(config.dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized.');
  return db;
}

export function saveDb() {
  if (!db) return;
  fs.writeFileSync(config.dbPath, Buffer.from(db.export()));
}

let saveInterval: ReturnType<typeof setInterval>;
export function startAutoSave(intervalMs = 5000) {
  saveInterval = setInterval(() => saveDb(), intervalMs);
}

export function stopAutoSave() {
  if (saveInterval) clearInterval(saveInterval);
}
