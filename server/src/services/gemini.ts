import { queryOne } from '../db/wrapper.js';
import { decryptString } from './encryption.js';
import { config } from '../config.js';

// Request uses snake_case (inline_data) per some API docs,
// but the actual yunwu.ai proxy returns camelCase (inlineData).
// We normalize the response to always use camelCase internally.

interface GeminiRequestPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiResponsePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  // Some proxies use snake_case
  inline_data?: {
    mime_type: string;
    data: string;
  };
  thoughtSignature?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiResponsePart[];
    };
  }>;
}

/** Extract image data from a response part, handling both camelCase and snake_case */
function extractInlineData(part: GeminiResponsePart): { mimeType: string; data: string } | undefined {
  if (part.inlineData) {
    return { mimeType: part.inlineData.mimeType, data: part.inlineData.data };
  }
  if (part.inline_data) {
    return { mimeType: part.inline_data.mime_type, data: part.inline_data.data };
  }
  return undefined;
}

function getApiConfig(): { endpoint: string; key: string } {
  const endpointRow = queryOne('SELECT value FROM settings WHERE key = ?', ['api_endpoint']) as { value: string } | undefined;
  const keyRow = queryOne('SELECT value, encrypted FROM settings WHERE key = ?', ['api_key']) as { value: string; encrypted: number } | undefined;

  const endpoint = endpointRow?.value || config.defaultApiEndpoint;
  let key = '';
  if (keyRow?.value) {
    key = keyRow.encrypted ? decryptString(keyRow.value) : keyRow.value;
  }
  if (!key) key = config.defaultApiKey;

  return { endpoint, key };
}

async function callGemini(parts: GeminiRequestPart[], responseModalities?: string[]): Promise<GeminiResponse> {
  const { endpoint, key } = getApiConfig();

  if (!key) {
    throw new Error('API key not configured. Please set it in developer settings.');
  }

  const requestBody: Record<string, unknown> = {
    contents: [{
      role: 'user',
      parts,
    }],
  };

  if (responseModalities) {
    requestBody.generationConfig = {
      responseModalities,
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${text}`);
  }

  return response.json() as Promise<GeminiResponse>;
}

export async function analyzeImage(imageBase64: string, mimeType: string, surgeryType?: string, dayNumber?: number): Promise<string> {
  let promptText = `You are a medical image analyst specializing in surgical recovery documentation.
Analyze the following medical/surgical image and provide a detailed description that:

1. PRESERVES all medical features: wound location, incision type, suture pattern, bruising extent, swelling degree, bandages, drainage, splints
2. PRESERVES skin texture details: pores, natural discoloration, surgical marks - do NOT beautify
3. NOTES the identity features WITHOUT describing them in detail (face shape, eye shape, nose shape, hair, background)

Output a structured prompt that could be used to regenerate a similar medical image with a DIFFERENT person's identity but IDENTICAL medical features.`;

  if (surgeryType) promptText += `\nSurgery type: ${surgeryType}`;
  if (dayNumber !== undefined) promptText += `\nRecovery day: Day ${dayNumber}`;

  promptText += `\n\nFormat your response as a single detailed image generation prompt in English.`;

  const parts: GeminiRequestPart[] = [
    { text: promptText },
    { inlineData: { mimeType, data: imageBase64 } },
  ];

  const result = await callGemini(parts);
  const text = result.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
  if (!text) throw new Error('No analysis result returned from AI');
  return text;
}

export async function generateImage(prompt: string, sourceImageBase64?: string, sourceMimeType?: string): Promise<{ imageBase64: string; mimeType: string }> {
  const generationPrompt = `Generate a high-quality medical photography image based on the following description.
CRITICAL REQUIREMENTS:
- This is for medical documentation purposes
- DO NOT apply any beauty filters or skin smoothing
- PRESERVE realistic skin texture, pores, and imperfections
- Medical features (wounds, scars, bruising, swelling, bandages) must be anatomically accurate
- The person in the image must be a COMPLETELY DIFFERENT individual from any reference
- Maintain clinical photography lighting and style
- Output resolution should be high quality

Description:
${prompt}`;

  const parts: GeminiRequestPart[] = [{ text: generationPrompt }];

  if (sourceImageBase64 && sourceMimeType) {
    parts.push({
      inlineData: { mimeType: sourceMimeType, data: sourceImageBase64 },
    });
    parts[0] = {
      text: `${generationPrompt}\n\nUse the attached image as a medical reference for wound positioning and healing stage. Generate a NEW person with the SAME medical conditions shown in the reference.`,
    };
  }

  const result = await callGemini(parts, ['TEXT', 'IMAGE']);

  const candidateParts = result.candidates?.[0]?.content?.parts;

  // Find image part - handle both camelCase (inlineData) and snake_case (inline_data)
  let imageData: { mimeType: string; data: string } | undefined;
  if (candidateParts) {
    for (const part of candidateParts) {
      const extracted = extractInlineData(part);
      if (extracted) {
        imageData = extracted;
        break;
      }
    }
  }

  if (!imageData) {
    const textParts = candidateParts?.filter(p => p.text).map(p => p.text).join('\n');
    const debugInfo = textParts ? ` AI responded with text: ${textParts.substring(0, 300)}` : ' No candidates/parts in response.';
    throw new Error(`No image returned from AI.${debugInfo}`);
  }

  return {
    imageBase64: imageData.data,
    mimeType: imageData.mimeType,
  };
}
