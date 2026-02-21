// Client-side prompt utility (placeholder, actual building is on server)
export function buildTextToImagePromptClient(params: {
  surgery_type: string;
  day_number: number;
  gender: string;
  age_range: string;
  ethnicity: string;
  body_type?: string;
  complications?: string;
}): string {
  const parts = [
    `Photorealistic clinical photograph of a ${params.gender} ${params.ethnicity} patient in their ${params.age_range}`,
    params.body_type ? `with ${params.body_type} body type` : '',
    `who underwent ${params.surgery_type} surgery`,
    `showing recovery at Day ${params.day_number} post-operation`,
    'Shot with a DSLR camera in clinical setting, soft diffused lighting',
    'Natural unretouched skin with visible pores, fine hair, subtle color variations, no beauty filters, no skin smoothing',
    '1024x1024 resolution',
    params.complications ? `Complications: ${params.complications}` : '',
  ].filter(Boolean);

  return parts.join('. ') + '.';
}
