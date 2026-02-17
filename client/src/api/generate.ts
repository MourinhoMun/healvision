import api from './client';
import type { AnalyzeRequest, GenerateRequest, TextToImageRequest, GenerateResponse, AnalyzeResponse } from '@healvision/shared';

export async function analyzeImage(body: AnalyzeRequest): Promise<AnalyzeResponse> {
  const { data } = await api.post('/analyze', body);
  return data;
}

export async function generateImage(body: GenerateRequest): Promise<GenerateResponse> {
  const { data } = await api.post('/generate', body);
  return data;
}

export async function generateTextToImage(body: TextToImageRequest): Promise<GenerateResponse> {
  const { data } = await api.post('/generate/text-to-image', body);
  return data;
}

export async function generateReverse(body: {
  target_image_base64: string;
  target_mime_type: string;
  surgery_type: string;
  case_id: string;
  days: number[];
}): Promise<{ target_analysis: string; results: GenerateResponse[] }> {
  const { data } = await api.post('/generate/reverse', body);
  return data;
}
