import { Router } from 'express';
import fs from 'fs';
import archiver from 'archiver';
import { queryAll, queryOne } from '../db/wrapper.js';
import { userAuth } from '../middleware/userAuth.js';

const router = Router();

router.use(userAuth);

router.get('/case/:caseId', (req, res, next) => {
  try {
    const caseRow = queryOne('SELECT name FROM cases WHERE id = ? AND user_id = ?', [req.params.caseId, req.userId]) as any;
    if (!caseRow) { res.status(404).json({ error: 'Case not found' }); return; }
    const images = queryAll('SELECT * FROM generated_images WHERE case_id = ? ORDER BY day_number ASC', [req.params.caseId]);
    if (!images.length) { res.status(404).json({ error: 'No generated images found for this case' }); return; }
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename="${caseRow.name}_generated.zip"`);
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);
    for (const img of images) {
      if (fs.existsSync(img.file_path)) archive.file(img.file_path, { name: `Day_${img.day_number}_${img.id.slice(0, 8)}.jpg` });
    }
    archive.finalize();
  } catch (err) { next(err); }
});

router.get('/image/:id', (req, res) => {
  const image = queryOne(`
    SELECT gi.* FROM generated_images gi
    JOIN cases c ON c.id = gi.case_id
    WHERE gi.id = ? AND c.user_id = ?
  `, [req.params.id, req.userId]) as any;
  if (!image || !fs.existsSync(image.file_path)) { res.status(404).json({ error: 'Image not found' }); return; }
  res.download(image.file_path, `healvision_day${image.day_number}_${image.id.slice(0, 8)}.jpg`);
});

export default router;
