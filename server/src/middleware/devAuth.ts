import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { queryOne } from '../db/wrapper.js';

const activeSessions = new Map<string, number>(); // token -> expiry timestamp
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

export function verifyDevPassword(password: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('dev_password_hash') as { value: string } | undefined;

  if (!row) return null;

  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash !== row.value) return null;

  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, Date.now() + SESSION_TTL);
  return token;
}

export function devAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-dev-token'] as string;
  if (!token) {
    res.status(401).json({ error: 'Developer authentication required' });
    return;
  }

  const expiry = activeSessions.get(token);
  if (!expiry || Date.now() > expiry) {
    activeSessions.delete(token);
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  // Refresh session
  activeSessions.set(token, Date.now() + SESSION_TTL);
  next();
}
