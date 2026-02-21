import type { TextToImageRequest, Zone } from '@healvision/shared';

export function buildTextToImagePrompt(params: TextToImageRequest): string {
  const parts: string[] = [];

  parts.push(`Photorealistic clinical photograph of a ${params.gender} ${params.ethnicity} patient in their ${params.age_range}`);

  if (params.body_type) {
    parts.push(`with a ${params.body_type} body type`);
  }

  parts.push(`who underwent ${params.surgery_type} surgery`);
  parts.push(`showing recovery status at Day ${params.day_number} post-operation`);

  // Add detailed, stage-specific medical descriptions
  if (params.day_number < 0) {
    parts.push('Pre-operative state: natural, unoperated anatomy. No surgical marks. The area that will undergo surgery shows the original condition motivating the procedure');
  } else if (params.day_number === 0) {
    parts.push('Immediately post-surgery: fresh incision lines with neat sutures or surgical tape, localized redness around the wound edges, onset of mild swelling, possible traces of surgical antiseptic (orange-brown betadine), small gauze pads or dressings in place, skin slightly flushed from the procedure');
  } else if (params.day_number <= 3) {
    parts.push('Early post-op (days 1-3): noticeable swelling peaking, bruising developing from red-purple to deep blue-black, sutures clearly visible, wound edges slightly raised, possible serosanguinous drainage, periorbital or peri-incisional edema, skin taut from swelling with a slightly shiny surface');
  } else if (params.day_number <= 7) {
    parts.push('Post-operative days 4-7: swelling still prominent but beginning to stabilize, bruising spreading and transitioning from deep purple to blue-green and yellowish tones, sutures in place, possible slight wound crusting, edema starting to migrate downward with gravity, skin appearing stretched in swollen areas');
  } else if (params.day_number <= 14) {
    parts.push('Recovery days 8-14: swelling noticeably reducing, bruising fading through yellow-green and pale brown stages, sutures may be partially or fully removed leaving small marks, early pink scar tissue forming along incision lines, natural skin color returning to non-bruised areas, residual mild puffiness');
  } else if (params.day_number <= 30) {
    parts.push('Recovery days 15-30: significant swelling reduction with natural contours re-emerging, most bruising fully resolved with possible faint yellow remnants, thin pink-red scar lines maturing, slight residual firmness in tissue around surgical site, near-normal skin appearance with subtle signs of recent surgery');
  } else if (params.day_number <= 60) {
    parts.push('Recovery days 31-60: only subtle residual swelling detectable on close inspection, scars transitioning from pink-red to lighter pink, natural tissue softness returning, surgical result shape becoming apparent, skin texture normalizing with occasional mild dryness around scar areas');
  } else if (params.day_number <= 100) {
    parts.push('Late recovery (61-100 days): near-final result visible, minimal to no remaining swelling, scars fading to thin pale lines, natural tissue movement restored, contours settled into final shape, skin fully healed with natural color and texture throughout');
  } else {
    parts.push('Final healed state (100+ days): mature surgical result, scars fully matured to thin white or skin-toned lines, completely natural tissue feel, no residual swelling, final aesthetic outcome clearly visible');
  }

  if (params.complications) {
    parts.push(`Notable complications present: ${params.complications}`);
  }

  // Strong natural-look instructions
  parts.push('Shot with a DSLR camera in a clinical setting with soft diffused lighting');
  parts.push('Natural, unretouched skin: visible pores, fine vellus hair, subtle color variations, natural sheen, minor imperfections like small moles and capillaries');
  parts.push('No beauty filters, no airbrushing, no skin smoothing — completely photorealistic');
  parts.push('1024x1024 resolution');

  if (params.custom_prompt) {
    parts.push(params.custom_prompt);
  }

  return parts.join('. ') + '.';
}

export function buildProtectionZoneInstruction(zones: Zone[]): string {
  if (zones.length === 0) return '';

  const descriptions = zones.map((zone, i) => {
    if (zone.type === 'rect' && zone.x !== undefined && zone.y !== undefined) {
      return `Zone ${i + 1}: Rectangle at position (${zone.x}%, ${zone.y}%) with size ${zone.width}% x ${zone.height}% — this area contains critical medical features that MUST be preserved with exact positioning and appearance`;
    }
    return `Zone ${i + 1}: Marked area containing critical medical features that MUST be preserved exactly`;
  });

  return `\n\nPROTECTION ZONES — The following regions contain critical medical details. Reproduce them with exact anatomical accuracy, matching wound stage, bruising color, and feature positioning precisely:\n${descriptions.join('\n')}`;
}

export function buildReversePrompt(
  targetAnalysis: string,
  surgeryType: string,
  dayNumber: number,
  isPreOp: boolean,
): string {
  if (isPreOp) {
    return `Based on this post-surgical result description: "${targetAnalysis}"

Generate a photorealistic PRE-OPERATIVE photograph of the same virtual person BEFORE ${surgeryType} surgery.
Show the natural, un-operated anatomy that would typically lead someone to seek this procedure.
Maintain consistent identity features (face shape, skin tone, age, body proportions) but reverse all surgical changes.
Natural skin with visible pores, fine hair, and subtle imperfections — no smoothing or beautification.
Clinical photography style with soft diffused lighting, 1024x1024 resolution.`;
  }

  return `Based on this final surgical result: "${targetAnalysis}"

Generate a photorealistic photograph showing the recovery state at Day ${dayNumber} after ${surgeryType} surgery for the same virtual person.
Show anatomically accurate healing progress appropriate for this stage — including realistic swelling distribution, bruising color (matching the typical color progression: red → purple → blue-green → yellow → faded), wound healing, and scar maturation.
Maintain the same person's identity consistently throughout the recovery timeline.
Natural skin with visible pores, fine hair, and subtle imperfections — no smoothing or beautification.
Clinical photography style with soft diffused lighting, 1024x1024 resolution.`;
}
