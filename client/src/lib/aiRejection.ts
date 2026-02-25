export const AI_REJECTION_PREFIX = 'AI_REJECTED|';

export function isAiRejection(message: string): boolean {
  return message.startsWith(AI_REJECTION_PREFIX);
}

export function parseAiRejection(message: string): { reason: string; detail: string } {
  const body = message.slice(AI_REJECTION_PREFIX.length);
  const idx = body.indexOf('|');
  if (idx === -1) return { reason: 'SAFETY', detail: body };
  return { reason: body.slice(0, idx), detail: body.slice(idx + 1) };
}

export function getRejectionTitle(reason: string, isZh: boolean): string {
  const map: Record<string, [string, string]> = {
    IMAGE_RECITATION: ['模型拒绝生成（内容安全）', 'Model Refused (Content Safety)'],
    RECITATION:       ['模型拒绝生成（内容版权）', 'Model Refused (Copyright)'],
    SAFETY:           ['模型拒绝生成（安全策略）', 'Model Refused (Safety Policy)'],
    PROHIBITED_CONTENT: ['模型拒绝生成（禁止内容）', 'Model Refused (Prohibited)'],
    OTHER:            ['模型拒绝生成', 'Model Refused'],
  };
  const pair = map[reason] ?? map['OTHER'];
  return isZh ? pair[0] : pair[1];
}
