import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { config } from './config.js';
import { initDb, startAutoSave } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { routes } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

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

  app.listen(config.port, () => {
    console.log(`HealVision server running on http://localhost:${config.port}`);
  });
}

main().catch(console.error);
