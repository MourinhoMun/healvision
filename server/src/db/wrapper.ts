import { getDb, saveDb } from './connection.js';

/**
 * Wrapper around sql.js to provide a simpler API similar to better-sqlite3.
 * sql.js doesn't have .prepare().get() etc, so we wrap common patterns.
 */

export function queryAll(sql: string, params: any[] = []): any[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);

  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function queryOne(sql: string, params: any[] = []): any | undefined {
  const results = queryAll(sql, params);
  return results[0];
}

export function run(sql: string, params: any[] = []): { changes: number } {
  const db = getDb();
  db.run(sql, params);
  const changes = db.getRowsModified();
  saveDb(); // Auto-save after writes
  return { changes };
}

export function exec(sql: string): void {
  const db = getDb();
  db.exec(sql);
  saveDb();
}
