import { Router } from 'express';
import crypto from 'crypto';
import { queryAll, queryOne, run } from '../db/wrapper.js';
import { devAuth, verifyDevPassword } from '../middleware/devAuth.js';
import { encryptString, decryptString } from '../services/encryption.js';

const router = Router();

// Get public settings
router.get('/', (_req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('default_language', 'watermark_enabled')").all() as Array<{ key: string; value: string }>;
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json(settings);
});

// Update public settings
router.put('/', (req, res) => {
  const db = getDb();
  const { default_language, watermark_enabled } = req.body;

  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value, encrypted) VALUES (?, ?, 0)');
  if (default_language) upsert.run('default_language', default_language);
  if (watermark_enabled !== undefined) upsert.run('watermark_enabled', watermark_enabled ? '1' : '0');

  res.json({ success: true });
});

// Verify developer password
router.post('/dev/verify', (req, res) => {
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ error: 'Password required' });
    return;
  }

  const token = verifyDevPassword(password);
  if (!token) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  res.json({ token });
});

// Get developer config (protected)
router.get('/dev/config', devAuth, (_req, res) => {
  const db = getDb();
  const endpoint = db.prepare("SELECT value FROM settings WHERE key = 'api_endpoint'").get() as any;
  const keyRow = db.prepare("SELECT value, encrypted FROM settings WHERE key = 'api_key'").get() as any;

  let apiKey = '';
  if (keyRow?.value) {
    apiKey = keyRow.encrypted ? decryptString(keyRow.value) : keyRow.value;
  }

  // Mask API key for display (show first 8 and last 4 chars)
  const maskedKey = apiKey.length > 12
    ? apiKey.slice(0, 8) + '****' + apiKey.slice(-4)
    : apiKey ? '****' : '';

  res.json({
    api_endpoint: endpoint?.value || '',
    api_key_masked: maskedKey,
    api_key_set: !!apiKey,
  });
});

// Update developer config (protected)
router.put('/dev/config', devAuth, (req, res) => {
  const { api_endpoint, api_key, new_password } = req.body;
  const db = getDb();

  if (api_endpoint) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value, encrypted) VALUES (?, ?, 0)')
      .run('api_endpoint', api_endpoint);
  }

  if (api_key) {
    const encrypted = encryptString(api_key);
    db.prepare('INSERT OR REPLACE INTO settings (key, value, encrypted) VALUES (?, ?, 1)')
      .run('api_key', encrypted);
  }

  if (new_password) {
    const hash = crypto.createHash('sha256').update(new_password).digest('hex');
    db.prepare('INSERT OR REPLACE INTO settings (key, value, encrypted) VALUES (?, ?, 0)')
      .run('dev_password_hash', hash);
  }

  res.json({ success: true });
});

export default router;
