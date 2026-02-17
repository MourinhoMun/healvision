import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { queryAll, queryOne } from '../db/wrapper.js';

const router = Router();

// Export all generated images for a case as ZIP
router.get('/case/:caseId', (req, res, next) => {
  try {
    const db = getDb();
    const images = db.prepare(
      'SELECT * FROM generated_images WHERE case_id = ? ORDER BY day_number ASC'
    ).all(req.params.caseId) as any[];

    if (!images.length) {
      res.status(404).json({ error: 'No generated images found for this case' });
      return;
    }

    const caseRow = db.prepare('SELECT name FROM cases WHERE id = ?').get(req.params.caseId) as any;
    const caseName = caseRow?.name || 'case';

    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename="${caseName}_generated.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    for (const img of images) {
      if (fs.existsSync(img.file_path)) {
        const filename = `Day_${img.day_number}_${img.id.slice(0, 8)}.jpg`;
        archive.file(img.file_path, { name: filename });
      }
    }

    archive.finalize();
  } catch (err) {
    next(err);
  }
});

// Download single generated image
router.get('/image/:id', (req, res) => {
  const db = getDb();
  const image = db.prepare('SELECT * FROM generated_images WHERE id = ?').get(req.params.id) as any;
  if (!image || !fs.existsSync(image.file_path)) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  res.download(image.file_path, `healvision_day${image.day_number}_${image.id.slice(0, 8)}.jpg`);
});

export default router;
