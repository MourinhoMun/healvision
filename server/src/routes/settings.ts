import { Router } from 'express';
import crypto from 'crypto';
import { queryOne, run } from '../db/wrapper.js';
import { devAuth, verifyDevPassword } from '../middleware/devAuth.js';
import { encryptString, decryptString } from '../services/encryption.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = [
    queryOne("SELECT key, value FROM settings WHERE key = 'default_language'"),
    queryOne("SELECT key, value FROM settings WHERE key = 'watermark_enabled'"),
  ].filter(Boolean);
  const settings = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));
  res.json(settings);
});

router.put('/', (req, res) => {
  const { default_language, watermark_enabled } = req.body;
  if (default_language) run('INSERT OR REPLACE INTO settings (key, value, encrypted) VALUES (?, ?, 0)', ['default_language', default_language]);
  if (watermark_enabled !== undefined) run('INSERT OR REPLACE INTO settings (key, value, encrypted) VALUES (?, ?, 0)', ['watermark_enabled', watermark_enabled ? '1' : '0']);
  res.json({ success: true });
});

router.post('/dev/verify', (req, res) => {
  const { password } = req.body;
  if (!password) { res.status(400).json({ error: 'Password required' }); return; }
  const token = verifyDevPassword(password);
  if (!token) { res.status(401).json({ error: 'Invalid password' }); return; }
  res.json({ token });
});

router.get('/dev/config', devAuth, (_req, res) => {
  const endpoint = queryOne("SELECT value FROM settings WHERE key = 'api_endpoint'") as any;
  const keyRow = queryOne("SELECT value, encrypted FROM settings WHERE key = 'api_key'") as any;
  let apiKey = '';
  if (keyRow?.value) apiKey = keyRow.encrypted ? decryptString(keyRow.value) : keyRow.value;
  const maskedKey = apiKey.length > 12 ? apiKey.slice(0, 8) + '****' + apiKey.slice(-4) : apiKey ? '****' : '';
  res.json({ api_endpoint: endpoint?.value || '', api_key_masked: maskedKey, api_key_set: !!apiKey });
});

router.put('/dev/config', devAuth, (req, res) => {
  const { api_endpoint, api_key, new_password } = req.body;
  if (api_endpoint) run('INSERT OR REPLACE INTO settings (key, value, encrypted) VALUES (?, ?, 0)', ['api_endpoint', api_endpoint]);
  if (api_key) run('INSERT OR REPLACE INTO settings (key, value, encrypted) VALUES (?, ?, 1)', ['api_key', encryptString(api_key)]);
  if (new_password) {
    const hash = crypto.createHash('sha256').update(new_password).digest('hex');
    run('INSERT OR REPLACE INTO settings (key, value, encrypted) VALUES (?, ?, 0)', ['dev_password_hash', hash]);
  }
  res.json({ success: true });
});

export default router;
