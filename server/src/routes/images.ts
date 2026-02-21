import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';
import { queryAll, queryOne, run } from '../db/wrapper.js';
import { encrypt, decrypt } from '../services/encryption.js';
import { processImage } from '../services/imageProcessor.js';
import { upload } from '../middleware/upload.js';
import { userAuth } from '../middleware/userAuth.js';
import { config } from '../config.js';

const router = Router();

// Upload source images to a case
router.post('/cases/:caseId/images', userAuth, upload.array('images', 20), async (req, res, next) => {
  try {
    const caseRow = queryOne('SELECT id FROM cases WHERE id = ? AND user_id = ?', [req.params.caseId, req.userId]);
    if (!caseRow) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files?.length) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const dayNumber = parseInt(req.body.day_number || '0', 10);
    const results: any[] = [];

    for (const file of files) {
      const id = uuid();
      const { processed, thumbnail, width, height, mimeType, exifDate } = await processImage(file.buffer);

      // Encrypt and save
      const encryptedImage = encrypt(processed);
      const encryptedThumb = encrypt(thumbnail);

      const filePath = path.join(config.uploadsDir, `${id}.enc`);
      const thumbPath = path.join(config.uploadsDir, `${id}_thumb.enc`);

      fs.writeFileSync(filePath, encryptedImage);
      fs.writeFileSync(thumbPath, encryptedThumb);

      run(`
        INSERT INTO source_images (id, case_id, file_path, thumbnail_path, day_number,
          original_filename, exif_date, mime_type, width, height)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, req.params.caseId, filePath, thumbPath, dayNumber,
        file.originalname, exifDate, mimeType, width, height]);

      results.push({ id, day_number: dayNumber, width, height, original_filename: file.originalname });
    }

    // Update case timestamp
    run("UPDATE cases SET updated_at = datetime('now') WHERE id = ?", [req.params.caseId]);

    res.status(201).json(results);
  } catch (err) {
    next(err);
  }
});

// Get decrypted source image
router.get('/:id', (req, res) => {
  const image = queryOne('SELECT * FROM source_images WHERE id = ?', [req.params.id]) as any;
  if (!image) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  const encrypted = fs.readFileSync(image.file_path);
  const decrypted = decrypt(encrypted);

  res.set('Content-Type', image.mime_type);
  res.send(decrypted);
});

// Get source image as base64 (for AI processing)
router.get('/:id/base64', (req, res) => {
  const image = queryOne('SELECT * FROM source_images WHERE id = ?', [req.params.id]) as any;
  if (!image) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  const encrypted = fs.readFileSync(image.file_path);
  const decrypted = decrypt(encrypted);

  res.json({
    base64: decrypted.toString('base64'),
    mime_type: image.mime_type,
  });
});

// Get thumbnail
router.get('/:id/thumbnail', (req, res) => {
  const image = queryOne('SELECT * FROM source_images WHERE id = ?', [req.params.id]) as any;
  if (!image?.thumbnail_path) {
    res.status(404).json({ error: 'Thumbnail not found' });
    return;
  }

  const encrypted = fs.readFileSync(image.thumbnail_path);
  const decrypted = decrypt(encrypted);

  res.set('Content-Type', 'image/jpeg');
  res.send(decrypted);
});

// Update image metadata (day number, protection zones)
router.put('/:id', (req, res) => {
  const { day_number, protection_zones } = req.body;

  const updates: string[] = [];
  const params: any[] = [];

  if (day_number !== undefined) {
    updates.push('day_number = ?');
    params.push(day_number);
  }
  if (protection_zones !== undefined) {
    updates.push('protection_zones = ?');
    params.push(JSON.stringify(protection_zones));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  params.push(req.params.id);
  run(`UPDATE source_images SET ${updates.join(', ')} WHERE id = ?`, params);

  const updated = queryOne('SELECT * FROM source_images WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// Delete source image
router.delete('/:id', (req, res) => {
  const image = queryOne('SELECT * FROM source_images WHERE id = ?', [req.params.id]) as any;
  if (!image) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  // Delete files
  if (fs.existsSync(image.file_path)) fs.unlinkSync(image.file_path);
  if (image.thumbnail_path && fs.existsSync(image.thumbnail_path)) fs.unlinkSync(image.thumbnail_path);

  run('DELETE FROM source_images WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
