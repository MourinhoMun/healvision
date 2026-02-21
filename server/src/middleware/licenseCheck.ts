import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

/**
 * Creates a license check middleware for a specific software operation.
 * @param software - The software/operation identifier in the Tool table (e.g. 'healvision_analyze', 'healvision_generate')
 * @param cost - The expected cost (used for balance pre-check)
 */
export function licenseCheck(software: string, cost: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization;
    if (!token) {
      res.status(401).json({ error: '未授权，请先激活许可证' });
      return;
    }

    // Check balance before proceeding
    fetch(`${config.licenseBackendUrl}/api/v1/user/balance`, {
      headers: { Authorization: token, 'Content-Type': 'application/json' },
    })
      .then((r) => r.json())
      .then((data: any) => {
        if (data.balance === undefined || data.balance < cost) {
          res.status(402).json({
            error: '积分不足，请充值后再使用',
            balance: data.balance ?? 0,
            required: cost,
          });
          return;
        }

        // Store original res.json to intercept successful response
        const originalJson = res.json.bind(res);
        res.json = function (body: any) {
          // Only deduct if response is successful (2xx)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Deduct credits asynchronously (fire-and-forget with logging)
            fetch(`${config.licenseBackendUrl}/api/v1/proxy/use`, {
              method: 'POST',
              headers: { Authorization: token, 'Content-Type': 'application/json' },
              body: JSON.stringify({ software }),
            }).catch((err) => {
              console.error(`[LicenseCheck] Failed to deduct credits for ${software}:`, err.message);
            });
          }
          return originalJson(body);
        };

        next();
      })
      .catch((err) => {
        console.error('[LicenseCheck] Failed to check balance:', err.message);
        // Allow request to proceed if license backend is unreachable (graceful degradation)
        next();
      });
  };
}
