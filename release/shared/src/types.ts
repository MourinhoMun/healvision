// ==================== Case ====================
export interface Case {
  id: string;
  name: string;
  surgery_type: string | null;
  surgery_type_custom: string | null;
  description: string | null;
  body_part: string | null;
  patient_gender: string | null;
  patient_age_range: string | null;
  patient_ethnicity: string | null;
  patient_body_type: string | null;
  target_image_path: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  source_image_count?: number;
  generated_image_count?: number;
  thumbnail_url?: string;
}

export interface CreateCaseRequest {
  name: string;
  surgery_type?: string;
  surgery_type_custom?: string;
  description?: string;
  body_part?: string;
  patient_gender?: string;
  patient_age_range?: string;
  patient_ethnicity?: string;
  patient_body_type?: string;
}

// ==================== Source Image ====================
export interface SourceImage {
  id: string;
  case_id: string;
  file_path: string;
  thumbnail_path: string | null;
  day_number: number;
  original_filename: string | null;
  exif_date: string | null;
  mime_type: string;
  width: number | null;
  height: number | null;
  protection_zones: string | null; // JSON string of Zone[]
  sort_order: number;
  created_at: string;
}

// ==================== Generated Image ====================
export interface GeneratedImage {
  id: string;
  case_id: string;
  source_image_id: string | null;
  day_number: number;
  prompt_used: string;
  generation_mode: GenerationMode;
  file_path: string;
  thumbnail_path: string | null;
  width: number | null;
  height: number | null;
  seed: string | null;
  is_favorite: number;
  created_at: string;
}

export type GenerationMode = 'image_to_image' | 'text_to_image' | 'reverse_engineer';

// ==================== Tag ====================
export interface Tag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

// ==================== Protection Zone ====================
export interface Zone {
  type: 'rect' | 'path';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: Array<{ x: number; y: number }>;
}

// ==================== API Requests ====================
export interface AnalyzeRequest {
  image_base64: string;
  mime_type: string;
  surgery_type?: string;
  day_number?: number;
}

export interface GenerateRequest {
  prompt: string;
  source_image_base64?: string;
  source_mime_type?: string;
  case_id: string;
  source_image_id?: string;
  day_number: number;
  mode: GenerationMode;
  protection_zones?: Zone[];
}

export interface TextToImageRequest {
  surgery_type: string;
  day_number: number;
  gender: string;
  age_range: string;
  ethnicity: string;
  body_type?: string;
  complications?: string;
  custom_prompt?: string;
  case_id?: string;
}

export interface ReverseEngineerRequest {
  target_image_base64: string;
  target_mime_type: string;
  surgery_type: string;
  case_id: string;
  days: number[];
}

// ==================== API Responses ====================
export interface AnalyzeResponse {
  prompt: string;
  detected_features?: {
    gender?: string;
    age_range?: string;
    ethnicity?: string;
  };
}

export interface GenerateResponse {
  id: string;
  image_url: string;
  thumbnail_url: string;
  prompt_used: string;
}

// ==================== Settings ====================
export interface AppSettings {
  language: string;
  watermark_enabled: boolean;
}

export interface DevConfig {
  api_endpoint: string;
  api_key: string;
}

// ==================== Surgery Presets ====================
export const SURGERY_TYPES = [
  { value: 'double_eyelid', label_zh: '双眼皮', label_en: 'Double Eyelid' },
  { value: 'eye_bag_removal', label_zh: '祛眼袋', label_en: 'Eye Bag Removal' },
  { value: 'rhinoplasty', label_zh: '隆鼻', label_en: 'Rhinoplasty' },
  { value: 'liposuction', label_zh: '吸脂', label_en: 'Liposuction' },
  { value: 'facelift', label_zh: '拉皮', label_en: 'Facelift' },
  { value: 'breast_augmentation', label_zh: '隆胸', label_en: 'Breast Augmentation' },
  { value: 'otoplasty', label_zh: '耳整形', label_en: 'Otoplasty' },
  { value: 'custom', label_zh: '自定义', label_en: 'Custom' },
] as const;

export const BODY_TYPES = [
  { value: 'slim', label_zh: '较瘦', label_en: 'Slim' },
  { value: 'normal', label_zh: '正常', label_en: 'Normal' },
  { value: 'curvy', label_zh: '丰满', label_en: 'Curvy' },
  { value: 'plus_size', label_zh: '大码', label_en: 'Plus Size' },
] as const;

export const DAY_PRESETS = [-3, -1, 0, 1, 3, 5, 7, 14, 21, 30, 45, 60, 90, 100] as const;
