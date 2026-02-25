import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { queryAll, queryOne, run } from '../db/wrapper.js';
import { analyzeImage, generateImage } from '../services/gemini.js';
import { buildTextToImagePrompt, buildProtectionZoneInstruction, buildReversePrompt } from '../services/promptBuilder.js';
import { saveGeneratedImage } from '../services/imageProcessor.js';
import { embedWatermark } from '../services/watermark.js';
import { decrypt } from '../services/encryption.js';
import fs from 'fs';
import type { AnalyzeRequest, GenerateRequest, TextToImageRequest } from '@healvision/shared';
import { licenseCheck } from '../middleware/licenseCheck.js';
import { userAuth } from '../middleware/userAuth.js';
import { config } from '../config.js';

const router = Router();

router.use(userAuth);

// Analyze source image → return prompt
router.post('/analyze', licenseCheck('healvision_analyze', 2), async (req, res, next) => {
  try {
    const { image_base64, mime_type, surgery_type, day_number } = req.body as AnalyzeRequest;

    if (!image_base64 || !mime_type) {
      res.status(400).json({ error: 'image_base64 and mime_type are required' });
      return;
    }

    const prompt = await analyzeImage(image_base64, mime_type, surgery_type, day_number);
    res.json({ prompt });
  } catch (err) {
    next(err);
  }
});

// Image-to-image generation
router.post('/generate', licenseCheck('healvision_generate', 10), async (req, res, next) => {
  try {
    const body = req.body as GenerateRequest;

    if (!body.prompt || !body.case_id) {
      res.status(400).json({ error: 'prompt and case_id are required' });
      return;
    }

    let finalPrompt = body.prompt;
    if (body.protection_zones?.length) {
      finalPrompt += buildProtectionZoneInstruction(body.protection_zones);
    }

    // Get source image (底图) if provided
    let sourceBase64: string | undefined;
    let sourceMime: string | undefined;
    if (body.source_image_id) {
      const img = queryOne('SELECT * FROM source_images WHERE id = ?', [body.source_image_id]) as any;
      if (img) {
        const encrypted = fs.readFileSync(img.file_path);
        const decrypted = decrypt(encrypted);
        sourceBase64 = decrypted.toString('base64');
        sourceMime = img.mime_type;
      }
    } else if (body.source_image_base64) {
      sourceBase64 = body.source_image_base64;
      sourceMime = body.source_mime_type || 'image/jpeg';
    }

    // Get reference image (垫图) if provided
    let faceBase64: string | undefined;
    let faceMime: string | undefined;
    if (body.reference_image_base64) {
      faceBase64 = body.reference_image_base64;
      faceMime = body.reference_mime_type || 'image/jpeg';
    }

    const result = await generateImage(finalPrompt, sourceBase64, sourceMime, faceBase64, faceMime);

    // Apply watermark
    const imageId = uuid();

    const watermarkEnabled = queryOne("SELECT value FROM settings WHERE key = 'watermark_enabled'") as any;
    let imageBuffer: Buffer = Buffer.from(result.imageBase64, 'base64');
    if (watermarkEnabled?.value === '1') {
      imageBuffer = await embedWatermark(imageBuffer, `${body.case_id}|${Date.now()}`) as Buffer;
    }

    // Save to disk
    const saved = await saveGeneratedImage(imageBuffer.toString('base64'), result.mimeType, imageId);

    // Save to database
    run(`
      INSERT INTO generated_images (id, case_id, source_image_id, day_number, prompt_used, generation_mode, file_path, thumbnail_path, width, height)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [imageId, body.case_id, body.source_image_id || null, body.day_number,
      body.prompt, body.mode || 'image_to_image', saved.filePath, saved.thumbnailPath, saved.width, saved.height]);

    run("UPDATE cases SET updated_at = datetime('now') WHERE id = ?", [body.case_id]);

    res.json({
      id: imageId,
      image_url: `${config.filesBase}/generated/${imageId}.jpg`,
      thumbnail_url: `${config.filesBase}/generated/${imageId}_thumb.jpg`,
      prompt_used: body.prompt,
    });
  } catch (err) {
    next(err);
  }
});

// Text-to-image generation
router.post('/generate/text-to-image', licenseCheck('healvision_generate', 10), async (req, res, next) => {
  try {
    const body = req.body as TextToImageRequest;
    const prompt = body.custom_prompt || buildTextToImagePrompt(body);

    // Get reference image (垫图) if provided
    let faceBase64: string | undefined;
    let faceMime: string | undefined;
    if (body.reference_image_base64) {
      faceBase64 = body.reference_image_base64;
      faceMime = body.reference_mime_type || 'image/jpeg';
    }

    const result = await generateImage(prompt, undefined, undefined, faceBase64, faceMime);

    const imageId = uuid();

    let imageBuffer: Buffer = Buffer.from(result.imageBase64, 'base64');
    const watermarkEnabled = queryOne("SELECT value FROM settings WHERE key = 'watermark_enabled'") as any;
    if (watermarkEnabled?.value === '1') {
      imageBuffer = await embedWatermark(imageBuffer, `text2img|${Date.now()}`) as Buffer;
    }

    const saved = await saveGeneratedImage(imageBuffer.toString('base64'), result.mimeType, imageId);

    if (body.case_id) {
      run(`
        INSERT INTO generated_images (id, case_id, day_number, prompt_used, generation_mode, file_path, thumbnail_path, width, height)
        VALUES (?, ?, ?, ?, 'text_to_image', ?, ?, ?, ?)
      `, [imageId, body.case_id, body.day_number, prompt, saved.filePath, saved.thumbnailPath, saved.width, saved.height]);
    }

    res.json({
      id: imageId,
      image_url: `${config.filesBase}/generated/${imageId}.jpg`,
      thumbnail_url: `${config.filesBase}/generated/${imageId}_thumb.jpg`,
      prompt_used: prompt,
    });
  } catch (err) {
    next(err);
  }
});

// Reverse engineering generation
router.post('/generate/reverse', licenseCheck('healvision_generate', 10), async (req, res, next) => {
  try {
    const { target_image_base64, target_mime_type, surgery_type, case_id, days } = req.body;

    // First analyze the target image
    const targetAnalysis = await analyzeImage(target_image_base64, target_mime_type, surgery_type);

    const results: any[] = [];

    for (const day of days) {
      const isPreOp = day < 0;
      const prompt = buildReversePrompt(targetAnalysis, surgery_type, day, isPreOp);

      const result = await generateImage(prompt, target_image_base64, target_mime_type);

      const imageId = uuid();
      let imageBuffer: Buffer = Buffer.from(result.imageBase64, 'base64');

      const watermarkEnabled = queryOne("SELECT value FROM settings WHERE key = 'watermark_enabled'") as any;
      if (watermarkEnabled?.value === '1') {
        imageBuffer = await embedWatermark(imageBuffer, `reverse|${case_id}|${Date.now()}`) as Buffer;
      }

      const saved = await saveGeneratedImage(imageBuffer.toString('base64'), result.mimeType, imageId);

      run(`
        INSERT INTO generated_images (id, case_id, day_number, prompt_used, generation_mode, file_path, thumbnail_path, width, height)
        VALUES (?, ?, ?, ?, 'reverse_engineer', ?, ?, ?, ?)
      `, [imageId, case_id, day, prompt, saved.filePath, saved.thumbnailPath, saved.width, saved.height]);

      results.push({
        id: imageId,
        day_number: day,
        image_url: `${config.filesBase}/generated/${imageId}.jpg`,
        thumbnail_url: `${config.filesBase}/generated/${imageId}_thumb.jpg`,
        prompt_used: prompt,
      });
    }

    res.json({ target_analysis: targetAnalysis, results });
  } catch (err) {
    next(err);
  }
});

// Get generated image info
router.get('/generated/:id', (req, res) => {
  const image = queryOne('SELECT * FROM generated_images WHERE id = ?', [req.params.id]);
  if (!image) {
    res.status(404).json({ error: 'Generated image not found' });
    return;
  }
  res.json(image);
});

// Delete generated image
router.delete('/generated/:id', (req, res) => {
  const image = queryOne('SELECT * FROM generated_images WHERE id = ?', [req.params.id]) as any;
  if (!image) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }

  if (fs.existsSync(image.file_path)) fs.unlinkSync(image.file_path);
  if (image.thumbnail_path && fs.existsSync(image.thumbnail_path)) fs.unlinkSync(image.thumbnail_path);

  run('DELETE FROM generated_images WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
