import { Router } from 'express';
import { config } from '../config.js';

const router = Router();

// Proxy: activate license/recharge code
router.post('/activate', async (req, res, next) => {
  try {
    const response = await fetch(`${config.licenseBackendUrl}/api/v1/user/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    next(err);
  }
});

// Proxy: get balance
router.get('/balance', async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const response = await fetch(`${config.licenseBackendUrl}/api/v1/user/balance`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    next(err);
  }
});

// Proxy: deduct credits (called internally by licenseCheck middleware)
router.post('/deduct', async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const response = await fetch(`${config.licenseBackendUrl}/api/v1/proxy/use`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify({ software: 'healvision', ...req.body }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
