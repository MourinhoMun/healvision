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
    `Medical photography of a ${params.gender} ${params.ethnicity} patient in their ${params.age_range}`,
    params.body_type ? `with ${params.body_type} body type` : '',
    `who underwent ${params.surgery_type} surgery`,
    `showing recovery at Day ${params.day_number} post-operation`,
    'Clinical photography, natural lighting, realistic skin texture, no beauty filters',
    params.complications ? `Complications: ${params.complications}` : '',
  ].filter(Boolean);

  return parts.join('. ') + '.';
}
