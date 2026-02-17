import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { queryAll, queryOne, run, exec } from '../db/wrapper.js';

const router = Router();

// List all tags
router.get('/', (_req, res) => {
  const db = getDb();
  const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
  res.json(tags);
});

// Create tag
router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const id = uuid();
  const db = getDb();
  db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(id, name, color || '#6366f1');

  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  res.status(201).json(tag);
});

// Update tag
router.put('/:id', (req, res) => {
  const { name, color } = req.body;
  const db = getDb();

  db.prepare('UPDATE tags SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?')
    .run(name || null, color || null, req.params.id);

  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  if (!tag) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }
  res.json(tag);
});

// Delete tag
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Assign tags to case
router.post('/cases/:caseId/tags', (req, res) => {
  const { tag_ids } = req.body as { tag_ids: string[] };
  const db = getDb();

  const deleteTags = db.prepare('DELETE FROM case_tags WHERE case_id = ?');
  const insertTag = db.prepare('INSERT OR IGNORE INTO case_tags (case_id, tag_id) VALUES (?, ?)');

  const transaction = db.transaction(() => {
    deleteTags.run(req.params.caseId);
    for (const tagId of tag_ids) {
      insertTag.run(req.params.caseId, tagId);
    }
  });

  transaction();
  res.json({ success: true });
});

export default router;
