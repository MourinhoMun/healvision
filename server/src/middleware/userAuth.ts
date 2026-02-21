import type { Request, Response, NextFunction } from 'express';

// Extend Request to carry userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Extracts userId by decoding the JWT token (no extra network call).
 * The token is issued by pengip.com and contains { userId }.
 */
export function userAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization;
  if (!token || !token.startsWith('Bearer ')) {
    res.status(401).json({ error: '未授权，请先登录' });
    return;
  }

  try {
    // Decode JWT payload without verifying signature (verification done by licenseCheck)
    const payload = JSON.parse(Buffer.from(token.split(' ')[1].split('.')[1], 'base64url').toString());
    if (!payload.userId) {
      res.status(401).json({ error: 'Token 无效' });
      return;
    }
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Token 格式错误' });
  }
}
