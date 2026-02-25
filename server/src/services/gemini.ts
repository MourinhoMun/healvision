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

function getApiConfig(forAnalyze = false): { endpoint: string; key: string } {
  const endpointRow = queryOne('SELECT value FROM settings WHERE key = ?', ['api_endpoint']) as { value: string } | undefined;
  const keyRow = queryOne('SELECT value, encrypted FROM settings WHERE key = ?', ['api_key']) as { value: string; encrypted: number } | undefined;

  // For analyze (text output), use vision model; for generate, use image generation model
  const defaultEndpoint = forAnalyze ? config.defaultAnalyzeEndpoint : config.defaultApiEndpoint;
  const endpoint = endpointRow?.value || defaultEndpoint;
  let key = '';
  if (keyRow?.value) {
    key = keyRow.encrypted ? decryptString(keyRow.value) : keyRow.value;
  }
  if (!key) key = config.defaultApiKey;

  return { endpoint, key };
}

async function callGemini(parts: GeminiRequestPart[], responseModalities?: string[], forAnalyze = false): Promise<GeminiResponse> {
  const { endpoint, key } = getApiConfig(forAnalyze);

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
  let promptText = `You are an expert medical photography analyst specializing in post-surgical recovery documentation.

Carefully analyze the provided medical/surgical image. Your goal is to produce a detailed image-generation prompt that captures EVERY medical detail while allowing the identity to change.

Describe the following in precise detail:

1. SURGICAL FEATURES: exact wound location and size, incision line shape and length, suture type and spacing, staple positions, steri-strip placement, drain locations, bandage coverage areas, splint or cast details
2. HEALING STATUS: precise color of bruising (purple, blue-black, yellow-green, faded brown), swelling degree and distribution, edema boundaries, scab formation stage, granulation tissue, wound edge condition
3. SKIN QUALITIES: natural skin tone and undertone, visible pores, fine wrinkles, moles or freckles near the surgical site, skin sheen (matte vs slightly oily), capillary visibility, goosebumps, body hair
4. LIGHTING & ANGLE: camera angle, lighting direction, shadow placement, ambient vs direct light, color temperature of lighting
5. CONTEXT CLUES: clinical setting elements, patient positioning, clothing edges visible, background blur level

Do NOT describe the person's identity (face shape, eye details, etc.) — only note general demographics (approximate age range, skin tone, gender) so they can be reproduced on a different person.`;

  if (surgeryType) promptText += `\n\nKnown surgery type: ${surgeryType}`;
  if (dayNumber !== undefined) promptText += `\nRecovery day: Day ${dayNumber}`;

  promptText += `\n\nOutput a single, flowing image-generation prompt in English. The prompt should read naturally and include all the observed details so that a generative model can recreate the same medical scene on a completely different person with photorealistic, natural results. Emphasize natural skin texture — visible pores, subtle imperfections, real lighting — and avoid any wording that could cause beautification or smoothing.`;

  const parts: GeminiRequestPart[] = [
    { text: promptText },
    { inlineData: { mimeType, data: imageBase64 } },
  ];

  const result = await callGemini(parts, undefined, true);
  const text = result.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
  if (!text) throw new Error('No analysis result returned from AI');
  return text;
}

export async function generateImage(
  prompt: string,
  sourceImageBase64?: string,
  sourceMimeType?: string,
  faceImageBase64?: string,
  faceMimeType?: string,
): Promise<{ imageBase64: string; mimeType: string }> {
  const baseRequirements = `IMAGE REQUIREMENTS:
- Resolution: 1024 x 1024 pixels
- Style: clinical documentation photography, as taken by a medical professional with a DSLR camera
- Lighting: soft, diffused natural or clinical lighting. Subtle shadows that reveal skin texture. Avoid harsh flash or flat lighting
- Skin: MUST look completely natural and unprocessed — visible pores, fine vellus hair, subtle color variations, natural skin sheen, minor imperfections (small moles, capillaries). Absolutely NO airbrushing, NO beauty filters, NO skin smoothing
- Medical accuracy: all surgical features (wounds, scars, sutures, bruising, swelling, bandages) must be anatomically correct and stage-appropriate
- Composition: clinical documentation framing, neutral background, patient positioned naturally`;

  const parts: GeminiRequestPart[] = [];

  if (faceImageBase64 && faceMimeType) {
    // 有垫图：严格保留垫图人物的面部五官特征
    if (sourceImageBase64 && sourceMimeType) {
      // 同时有底图：垫图提供人脸，底图提供康复阶段参考
      parts.push({
        text: `Generate a photorealistic medical photograph based on the description below.

${baseRequirements}

CRITICAL IDENTITY INSTRUCTIONS:
- IMAGE 1 (attached first) is the FACE REFERENCE (垫图). You MUST faithfully replicate this person's facial features: face shape, eye shape and spacing, nose structure, lip shape, skin tone, skin texture, age characteristics, and overall identity. The generated person must be recognizably the SAME individual.
- IMAGE 2 (attached second) is the MEDICAL RECOVERY REFERENCE (底图). Use it to match the exact wound location, healing stage, bruising color and distribution, swelling degree, suture/bandage placement, and photographic style. Do NOT copy the person's identity from this image.
- Final output: the person from IMAGE 1, showing the medical recovery conditions from IMAGE 2.

Description:
${prompt}`,
      });
      parts.push({ inlineData: { mimeType: faceMimeType, data: faceImageBase64 } });
      parts.push({ inlineData: { mimeType: sourceMimeType, data: sourceImageBase64 } });
    } else {
      // 只有垫图：保留人脸，按 prompt 描述生成康复状态
      parts.push({
        text: `Generate a photorealistic medical photograph based on the description below.

${baseRequirements}

CRITICAL IDENTITY INSTRUCTIONS:
- The attached image is the FACE REFERENCE (垫图). You MUST faithfully replicate this person's facial features: face shape, eye shape and spacing, nose structure, lip shape, skin tone, skin texture, age characteristics, and overall identity. The generated person must be recognizably the SAME individual.
- Apply the medical recovery conditions described below to this same person.

Description:
${prompt}`,
      });
      parts.push({ inlineData: { mimeType: faceMimeType, data: faceImageBase64 } });
    }
  } else if (sourceImageBase64 && sourceMimeType) {
    // 只有底图，无垫图：生成完全不同的人但复现相同的医疗状态（原逻辑）
    parts.push({
      text: `Generate a photorealistic medical photograph based on the description below.

${baseRequirements}
- The person depicted must be a DIFFERENT individual from any reference image provided — do not copy the identity

Description:
${prompt}

REFERENCE IMAGE INSTRUCTIONS:
The attached image is a medical reference. Use it to match:
- Exact wound positioning, size, and healing stage
- Bruising color and distribution pattern
- Swelling degree and affected areas
- Suture/bandage placement
Generate a COMPLETELY DIFFERENT person with the SAME medical conditions, same recovery stage, and same photographic style. Maintain natural skin texture throughout.`,
    });
    parts.push({ inlineData: { mimeType: sourceMimeType, data: sourceImageBase64 } });
  } else {
    // 纯文本生成
    parts.push({
      text: `Generate a photorealistic medical photograph based on the description below.

${baseRequirements}
- The person depicted must be a realistic individual appropriate for the described demographics

Description:
${prompt}`,
    });
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
