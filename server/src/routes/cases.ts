import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { queryAll, queryOne, run } from '../db/wrapper.js';
import { userAuth } from '../middleware/userAuth.js';
import type { CreateCaseRequest } from '@healvision/shared';

const router = Router();

router.use(userAuth);

// List all cases for current user
router.get('/', (req, res) => {
  const cases = queryAll(`
    SELECT c.*,
      (SELECT COUNT(*) FROM source_images WHERE case_id = c.id) as source_image_count,
      (SELECT COUNT(*) FROM generated_images WHERE case_id = c.id) as generated_image_count
    FROM cases c
    WHERE c.user_id = ?
    ORDER BY c.updated_at DESC
  `, [req.userId]);

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

// Get single case (must belong to user)
router.get('/:id', (req, res) => {
  const caseRow = queryOne('SELECT * FROM cases WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
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
    INSERT INTO cases (id, user_id, name, surgery_type, surgery_type_custom, description, body_part,
      patient_gender, patient_age_range, patient_ethnicity, patient_body_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, req.userId, body.name, body.surgery_type || null, body.surgery_type_custom || null,
    body.description || null, body.body_part || null, body.patient_gender || null,
    body.patient_age_range || null, body.patient_ethnicity || null, body.patient_body_type || null,
  ]);

  const created = queryOne('SELECT * FROM cases WHERE id = ?', [id]);
  res.status(201).json(created);
});

// Update case
router.put('/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM cases WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (!existing) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }

  const body = req.body;
  run(`
    UPDATE cases SET name = ?, surgery_type = ?, surgery_type_custom = ?, description = ?,
      body_part = ?, patient_gender = ?, patient_age_range = ?, patient_ethnicity = ?,
      patient_body_type = ?, updated_at = datetime('now')
    WHERE id = ? AND user_id = ?
  `, [
    body.name, body.surgery_type || null, body.surgery_type_custom || null,
    body.description || null, body.body_part || null, body.patient_gender || null,
    body.patient_age_range || null, body.patient_ethnicity || null,
    body.patient_body_type || null, req.params.id, req.userId,
  ]);

  res.json(queryOne('SELECT * FROM cases WHERE id = ?', [req.params.id]));
});

// Delete case
router.delete('/:id', (req, res) => {
  const result = run('DELETE FROM cases WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Case not found' });
    return;
  }
  res.json({ success: true });
});

// Clone case from image
router.post('/clone-from-image/:imageId', (req, res) => {
  const sourceImage = queryOne(`
    SELECT si.* FROM source_images si
    JOIN cases c ON c.id = si.case_id
    WHERE si.id = ? AND c.user_id = ?
  `, [req.params.imageId, req.userId]) as any;
  if (!sourceImage) {
    res.status(404).json({ error: 'Source image not found' });
    return;
  }

  const originalCase = queryOne('SELECT * FROM cases WHERE id = ?', [sourceImage.case_id]) as any;
  const newCaseId = uuid();

  run(`
    INSERT INTO cases (id, user_id, name, surgery_type, surgery_type_custom, description, body_part,
      patient_gender, patient_age_range, patient_ethnicity, patient_body_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    newCaseId, req.userId, `${originalCase.name} (Copy)`, originalCase.surgery_type,
    originalCase.surgery_type_custom, originalCase.description, originalCase.body_part,
    originalCase.patient_gender, originalCase.patient_age_range,
    originalCase.patient_ethnicity, originalCase.patient_body_type,
  ]);

  const newImageId = uuid();
  run(`
    INSERT INTO source_images (id, case_id, file_path, thumbnail_path, day_number,
      original_filename, exif_date, mime_type, width, height, protection_zones)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    newImageId, newCaseId, sourceImage.file_path, sourceImage.thumbnail_path,
    sourceImage.day_number, sourceImage.original_filename, sourceImage.exif_date,
    sourceImage.mime_type, sourceImage.width, sourceImage.height, sourceImage.protection_zones,
  ]);

  res.status(201).json(queryOne('SELECT * FROM cases WHERE id = ?', [newCaseId]));
});

export default router;
