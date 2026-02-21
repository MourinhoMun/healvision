import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// __EMBEDDED_API_KEY__ is replaced at build time by build_release.bat
// In dev, falls back to DEFAULT_API_KEY from .env
const EMBEDDED_API_KEY = '__EMBEDDED_API_KEY__';

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production-00',
  devPasswordHash: process.env.DEV_PASSWORD_HASH || '',
  defaultApiEndpoint: process.env.DEFAULT_API_ENDPOINT || 'https://yunwu.ai/v1beta/models/gemini-3-pro-image-preview:generateContent',
  defaultAnalyzeEndpoint: process.env.DEFAULT_ANALYZE_ENDPOINT || 'https://yunwu.ai/v1beta/models/gemini-2.0-flash:generateContent',
  defaultApiKey: EMBEDDED_API_KEY.startsWith('__') ? (process.env.DEFAULT_API_KEY || '') : EMBEDDED_API_KEY,
  licenseBackendUrl: process.env.LICENSE_BACKEND_URL || 'https://pengip.com',
  filesBase: process.env.FILES_BASE || '/healvision/files',
  dataDir: path.resolve(__dirname, '../data'),
  uploadsDir: path.resolve(__dirname, '../data/uploads'),
  generatedDir: path.resolve(__dirname, '../data/generated'),
  dbPath: path.resolve(__dirname, '../data/healvision.db'),
};
