function buildStageDescription(day: number): string {
  if (day < 0) return 'Pre-operative state: natural, unoperated anatomy. No surgical marks. The area that will undergo surgery shows the original condition motivating the procedure';
  if (day === 0) return 'Immediately post-surgery: fresh incision lines with neat sutures or surgical tape, localized redness around the wound edges, onset of mild swelling, possible traces of surgical antiseptic (orange-brown betadine), small gauze pads or dressings in place, skin slightly flushed from the procedure';
  if (day <= 3) return 'Early post-op (days 1-3): noticeable swelling peaking, bruising developing from red-purple to deep blue-black, sutures clearly visible, wound edges slightly raised, possible serosanguinous drainage, periorbital or peri-incisional edema, skin taut from swelling with a slightly shiny surface';
  if (day <= 7) return 'Post-operative days 4-7: swelling still prominent but beginning to stabilize, bruising spreading and transitioning from deep purple to blue-green and yellowish tones, sutures in place, possible slight wound crusting, edema starting to migrate downward with gravity, skin appearing stretched in swollen areas';
  if (day <= 14) return 'Recovery days 8-14: swelling noticeably reducing, bruising fading through yellow-green and pale brown stages, sutures may be partially or fully removed leaving small marks, early pink scar tissue forming along incision lines, natural skin color returning to non-bruised areas, residual mild puffiness';
  if (day <= 30) return 'Recovery days 15-30: significant swelling reduction with natural contours re-emerging, most bruising fully resolved with possible faint yellow remnants, thin pink-red scar lines maturing, slight residual firmness in tissue around surgical site, near-normal skin appearance with subtle signs of recent surgery';
  if (day <= 60) return 'Recovery days 31-60: only subtle residual swelling detectable on close inspection, scars transitioning from pink-red to lighter pink, natural tissue softness returning, surgical result shape becoming apparent, skin texture normalizing with occasional mild dryness around scar areas';
  if (day <= 100) return 'Late recovery (61-100 days): near-final result visible, minimal to no remaining swelling, scars fading to thin pale lines, natural tissue movement restored, contours settled into final shape, skin fully healed with natural color and texture throughout';
  return 'Final healed state (100+ days): mature surgical result, scars fully matured to thin white or skin-toned lines, completely natural tissue feel, no residual swelling, final aesthetic outcome clearly visible';
}

// Client-side prompt builder — mirrors server-side promptBuilder.ts
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
    params.body_type ? `with a ${params.body_type} body type` : '',
    `who underwent ${params.surgery_type} surgery`,
    `showing recovery at Day ${params.day_number} post-operation`,
    buildStageDescription(params.day_number),
    params.complications ? `Notable complications present: ${params.complications}` : '',
    'Shot with a DSLR camera in a clinical setting with soft diffused lighting',
    'Natural, unretouched skin: visible pores, fine vellus hair, subtle color variations, natural sheen, minor imperfections like small moles and capillaries',
    'No beauty filters, no airbrushing, no skin smoothing — completely photorealistic',
    '1024x1024 resolution',
  ].filter(Boolean);

  return parts.join('. ') + '.';
}
