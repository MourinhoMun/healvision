import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';

const MAX_DIMENSION = 1024;
const THUMBNAIL_SIZE = 200;

export async function processImage(buffer: Buffer): Promise<{
  processed: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
  mimeType: string;
  exifDate: string | null;
}> {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Extract EXIF date
  let exifDate: string | null = null;
  if (metadata.exif) {
    try {
      const exifData = await sharp(buffer).metadata();
      // sharp doesn't directly expose DateTimeOriginal, but we can try
      // For now, we'll return null and let the client handle EXIF
      exifDate = null;
    } catch {
      exifDate = null;
    }
  }

  // Resize to max 1K maintaining aspect ratio
  const processed = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  const processedMeta = await sharp(processed).metadata();

  // Generate thumbnail
  const thumbnail = await sharp(buffer)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
    .jpeg({ quality: 70 })
    .toBuffer();

  return {
    processed,
    thumbnail,
    width: processedMeta.width || 0,
    height: processedMeta.height || 0,
    mimeType: 'image/jpeg',
    exifDate,
  };
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

export async function saveGeneratedImage(
  base64: string,
  mimeType: string,
  imageId: string,
): Promise<{ filePath: string; thumbnailPath: string; width: number; height: number }> {
  const buffer = base64ToBuffer(base64);

  // Resize to 1K
  const processed = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer();

  const processedMeta = await sharp(processed).metadata();

  // Generate thumbnail
  const thumbnail = await sharp(buffer)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
    .jpeg({ quality: 70 })
    .toBuffer();

  const filePath = path.join(config.generatedDir, `${imageId}.jpg`);
  const thumbnailPath = path.join(config.generatedDir, `${imageId}_thumb.jpg`);

  fs.writeFileSync(filePath, processed);
  fs.writeFileSync(thumbnailPath, thumbnail);

  return {
    filePath,
    thumbnailPath,
    width: processedMeta.width || 0,
    height: processedMeta.height || 0,
  };
}
