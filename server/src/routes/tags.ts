import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { queryAll, queryOne, run, exec } from '../db/wrapper.js';

const router = Router();

router.get('/', (_req, res) => {
  const tags = queryAll('SELECT * FROM tags ORDER BY name');
  res.json(tags);
});

router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name) { res.status(400).json({ error: 'name is required' }); return; }
  const id = uuid();
  run('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)', [id, name, color || '#6366f1']);
  const tag = queryOne('SELECT * FROM tags WHERE id = ?', [id]);
  res.status(201).json(tag);
});

router.put('/:id', (req, res) => {
  const { name, color } = req.body;
  run('UPDATE tags SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?',
    [name || null, color || null, req.params.id]);
  const tag = queryOne('SELECT * FROM tags WHERE id = ?', [req.params.id]);
  if (!tag) { res.status(404).json({ error: 'Tag not found' }); return; }
  res.json(tag);
});

router.delete('/:id', (req, res) => {
  run('DELETE FROM tags WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.post('/cases/:caseId/tags', (req, res) => {
  const { tag_ids } = req.body as { tag_ids: string[] };
  run('DELETE FROM case_tags WHERE case_id = ?', [req.params.caseId]);
  for (const tagId of tag_ids) {
    run('INSERT OR IGNORE INTO case_tags (case_id, tag_id) VALUES (?, ?)', [req.params.caseId, tagId]);
  }
  res.json({ success: true });
});

export default router;
