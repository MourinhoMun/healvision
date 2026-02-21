import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { initDb, startAutoSave } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { routes } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Ensure data directories exist
  for (const dir of [config.dataDir, config.uploadsDir, config.generatedDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Initialize database
  await initDb();
  runMigrations();
  startAutoSave();

  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve generated images as static files
  app.use('/files/generated', express.static(config.generatedDir));

  // API routes
  app.use('/api', routes);

  // Error handler
  app.use(errorHandler);

  // In production, serve client static files under /healvision/
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use('/healvision', express.static(clientDistPath));
    app.get('/healvision/{*splat}', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
    console.log(`Serving client from ${clientDistPath}`);
  }

  app.listen(config.port, () => {
    console.log(`HealVision server running on http://localhost:${config.port}`);
  });
}

main().catch(console.error);
