import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { queryAll, queryOne, run } from '../db/wrapper.js';
import type { CreateCaseRequest } from '@healvision/shared';

const router = Router();

// List all cases
router.get('/', (_req, res) => {
  const cases = queryAll(`
    SELECT c.*,
      (SELECT COUNT(*) FROM source_images WHERE case_id = c.id) as source_image_count,
      (SELECT COUNT(*) FROM generated_images WHERE case_id = c.id) as generated_image_count
    FROM cases c
    ORDER BY c.updated_at DESC
  `);

  const result = cases.map((c: any) => ({
    ...c,
    tags: queryAll(`
      SELECT t.* FROM tags t
      JOIN case_tags ct ON ct.tag_id = t.id
      WHERE ct.case_id = ?
    `, [c.id]),
  }));

  res.json(result);
});

// Get single case with images
router.get('/:id', (req, res) => {
  const caseRow = queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  if (!caseRow) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const sourceImages = queryAll(
    'SELECT * FROM source_images WHERE case_id = ? ORDER BY day_number ASC, sort_order ASC',
    [req.params.id]
  );

  const generatedImages = queryAll(
    'SELECT * FROM generated_images WHERE case_id = ? ORDER BY day_number ASC, created_at DESC',
    [req.params.id]
  );

  const tags = queryAll(
    'SELECT t.* FROM tags t JOIN case_tags ct ON ct.tag_id = t.id WHERE ct.case_id = ?',
    [req.params.id]
  );

  res.json({ ...caseRow, source_images: sourceImages, generated_images: generatedImages, tags });
});

// Create case
router.post('/', (req, res) => {
  const body = req.body as CreateCaseRequest;
  const id = uuid();

  run(`
    INSERT INTO cases (id, name, surgery_type, surgery_type_custom, description, body_part,
      patient_gender, patient_age_range, patient_ethnicity, patient_body_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, body.name, body.surgery_type || null, body.surgery_type_custom || null,
    body.description || null, body.body_part || null, body.patient_gender || null,
    body.patient_age_range || null, body.patient_ethnicity || null, body.patient_body_type || null,
  ]);

  const created = queryOne('SELECT * FROM cases WHERE id = ?', [id]);
  res.status(201).json(created);
});

// Update case
router.put('/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  if (!existing) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const body = req.body;
  run(`
    UPDATE cases SET name = ?, surgery_type = ?, surgery_type_custom = ?, description = ?,
      body_part = ?, patient_gender = ?, patient_age_range = ?, patient_ethnicity = ?,
      patient_body_type = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [
    body.name, body.surgery_type || null, body.surgery_type_custom || null,
    body.description || null, body.body_part || null, body.patient_gender || null,
    body.patient_age_range || null, body.patient_ethnicity || null,
    body.patient_body_type || null, req.params.id,
  ]);

  const updated = queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// Delete case
router.delete('/:id', (req, res) => {
  const result = run('DELETE FROM cases WHERE id = ?', [req.params.id]);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }
  res.json({ success: true });
});

// Clone case from image
router.post('/clone-from-image/:imageId', (req, res) => {
  const imageId = req.params.imageId;

  // 1. Get the source image and its case details
  const sourceImage = queryOne('SELECT * FROM source_images WHERE id = ?', [imageId]) as any;
  if (!sourceImage) {
    res.status(404).json({ error: 'Source image not found' });
    return;
  }

  const originalCase = queryOne('SELECT * FROM cases WHERE id = ?', [sourceImage.case_id]) as any;
  if (!originalCase) {
    res.status(404).json({ error: 'Original case not found' });
    return;
  }

  // 2. Create new case
  const newCaseId = uuid();
  const newCaseName = `${originalCase.name} (Copy)`;

  run(`
    INSERT INTO cases (id, name, surgery_type, surgery_type_custom, description, body_part,
      patient_gender, patient_age_range, patient_ethnicity, patient_body_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    newCaseId, newCaseName, originalCase.surgery_type, originalCase.surgery_type_custom,
    originalCase.description, originalCase.body_part, originalCase.patient_gender,
    originalCase.patient_age_range, originalCase.patient_ethnicity, originalCase.patient_body_type,
  ]);

  // 3. Duplicate the image record (but point to same file path to save space)
  const newImageId = uuid();
  run(`
    INSERT INTO source_images (id, case_id, file_path, thumbnail_path, day_number,
      original_filename, exif_date, mime_type, width, height, protection_zones)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    newImageId, newCaseId, sourceImage.file_path, sourceImage.thumbnail_path,
    sourceImage.day_number, sourceImage.original_filename, sourceImage.exif_date,
    sourceImage.mime_type, sourceImage.width, sourceImage.height, sourceImage.protection_zones
  ]);

  const newCase = queryOne('SELECT * FROM cases WHERE id = ?', [newCaseId]);
  res.status(201).json(newCase);
});

export default router;
