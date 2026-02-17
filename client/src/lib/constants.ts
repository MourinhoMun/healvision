export { SURGERY_TYPES, BODY_TYPES, DAY_PRESETS } from '@healvision/shared';

export const GENDERS = [
  { value: 'female', label_zh: '女', label_en: 'Female' },
  { value: 'male', label_zh: '男', label_en: 'Male' },
] as const;

export const AGE_RANGES = [
  { value: '20s', label: '20s' },
  { value: '30s', label: '30s' },
  { value: '40s', label: '40s' },
  { value: '50s', label: '50s' },
  { value: '60s', label: '60+' },
] as const;

export const ETHNICITIES = [
  { value: 'asian', label_zh: '亚洲', label_en: 'Asian' },
  { value: 'caucasian', label_zh: '欧美', label_en: 'Caucasian' },
  { value: 'african', label_zh: '非洲', label_en: 'African' },
  { value: 'hispanic', label_zh: '拉美', label_en: 'Hispanic' },
  { value: 'other', label_zh: '其他', label_en: 'Other' },
] as const;

export const BODY_PARTS = [
  { value: 'face', label_zh: '面部', label_en: 'Face' },
  { value: 'nose', label_zh: '鼻部', label_en: 'Nose' },
  { value: 'eyes', label_zh: '眼部', label_en: 'Eyes' },
  { value: 'body', label_zh: '身体', label_en: 'Body' },
  { value: 'chest', label_zh: '胸部', label_en: 'Chest' },
  { value: 'ears', label_zh: '耳部', label_en: 'Ears' },
] as const;
