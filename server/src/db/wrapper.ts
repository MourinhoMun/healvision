import { getDb, saveDb } from './connection.js';

export function queryAll(sql: string, params: any[] = []): any[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

export function queryOne(sql: string, params: any[] = []): any | undefined {
  return queryAll(sql, params)[0];
}

export function run(sql: string, params: any[] = []): { changes: number } {
  const db = getDb();
  db.run(sql, params);
  const changes = db.getRowsModified();
  saveDb();
  return { changes };
}

export function exec(sql: string): void {
  getDb().exec(sql);
  saveDb();
}
