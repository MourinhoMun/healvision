import crypto from 'crypto';
import { config } from '../config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = config.encryptionKey;
  return crypto.createHash('sha256').update(key).digest();
}

export function encrypt(buffer: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: [IV (16)] [Auth Tag (16)] [Encrypted Data]
  return Buffer.concat([iv, tag, encrypted]);
}

export function decrypt(encryptedBuffer: Buffer): Buffer {
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const tag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function encryptString(text: string): string {
  const encrypted = encrypt(Buffer.from(text, 'utf-8'));
  return encrypted.toString('base64');
}

export function decryptString(cipher: string): string {
  const buffer = Buffer.from(cipher, 'base64');
  return decrypt(buffer).toString('utf-8');
}
