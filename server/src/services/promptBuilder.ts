import type { TextToImageRequest, Zone } from '@healvision/shared';

export function buildTextToImagePrompt(params: TextToImageRequest): string {
  const parts: string[] = [];

  parts.push(`Medical photography of a ${params.gender} ${params.ethnicity} patient in their ${params.age_range}`);

  if (params.body_type) {
    parts.push(`with a ${params.body_type} body type`);
  }

  parts.push(`who underwent ${params.surgery_type} surgery`);
  parts.push(`showing recovery status at Day ${params.day_number} post-operation`);

  // Add medical detail based on recovery stage
  if (params.day_number <= 1) {
    parts.push('Fresh surgical site with sutures visible, mild to moderate swelling, possible blood traces, sterile dressings partially covering the area');
  } else if (params.day_number <= 7) {
    parts.push('Post-operative swelling and bruising visible, sutures in place, varying degrees of edema, possible yellowish discoloration from healing bruises');
  } else if (params.day_number <= 14) {
    parts.push('Swelling reducing, bruising transitioning to yellow-green, sutures may be partially removed, early scar formation visible');
  } else if (params.day_number <= 30) {
    parts.push('Significant reduction in swelling, most bruising resolved, scar tissue forming, residual mild puffiness');
  } else if (params.day_number <= 60) {
    parts.push('Near-normal appearance with subtle residual swelling, scar maturation in progress, natural contours emerging');
  } else {
    parts.push('Final healing stage, minimal to no swelling, mature scar tissue, near-final surgical result visible');
  }

  if (params.complications) {
    parts.push(`Notable complications: ${params.complications}`);
  }

  parts.push('Clinical photography style, natural lighting, no beauty filters, realistic skin texture with visible pores');

  if (params.custom_prompt) {
    parts.push(params.custom_prompt);
  }

  return parts.join('. ') + '.';
}

export function buildProtectionZoneInstruction(zones: Zone[]): string {
  if (zones.length === 0) return '';

  const descriptions = zones.map((zone, i) => {
    if (zone.type === 'rect' && zone.x !== undefined && zone.y !== undefined) {
      return `Zone ${i + 1}: Rectangle at position (${zone.x}%, ${zone.y}%) with size ${zone.width}% x ${zone.height}% - this area contains critical medical features that MUST be preserved exactly`;
    }
    return `Zone ${i + 1}: Marked area containing critical medical features that MUST be preserved exactly`;
  });

  return `\n\nPROTECTION ZONES (these areas must be reproduced with exact medical accuracy):\n${descriptions.join('\n')}`;
}

export function buildReversePrompt(
  targetAnalysis: string,
  surgeryType: string,
  dayNumber: number,
  isPreOp: boolean,
): string {
  if (isPreOp) {
    return `Based on this post-surgical result description: "${targetAnalysis}"

Generate a PRE-OPERATIVE image of the same virtual person BEFORE ${surgeryType} surgery.
The person should have the natural, un-operated features that would typically lead someone to seek ${surgeryType}.
Maintain the same identity features (face shape, skin tone, age) but reverse the surgical changes.
Clinical photography style, natural lighting, no beauty filters.`;
  }

  return `Based on this final surgical result: "${targetAnalysis}"

Generate the recovery state at Day ${dayNumber} after ${surgeryType} surgery for the same virtual person.
Show appropriate healing progress for this stage including relevant swelling, bruising, and wound healing.
Maintain the same person's identity throughout the recovery timeline.
Clinical photography style, natural lighting, realistic skin texture.`;
}
