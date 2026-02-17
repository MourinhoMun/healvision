import { Router } from 'express';
import casesRouter from './cases.js';
import imagesRouter from './images.js';
import generateRouter from './generate.js';
import tagsRouter from './tags.js';
import settingsRouter from './settings.js';
import exportRouter from './export.js';

export const routes = Router();

routes.use('/cases', casesRouter);
routes.use('/images', imagesRouter);
routes.use('/', generateRouter); // /api/analyze, /api/generate, etc.
routes.use('/tags', tagsRouter);
routes.use('/settings', settingsRouter);
routes.use('/export', exportRouter);

// Also mount image upload under cases
routes.use('/', imagesRouter); // /api/cases/:caseId/images
// Also mount tag assignment under cases
routes.use('/', tagsRouter); // /api/cases/:caseId/tags
