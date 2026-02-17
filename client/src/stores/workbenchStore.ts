import { create } from 'zustand';
import type { Case, SourceImage, GeneratedImage, Zone } from '@healvision/shared';
import * as casesApi from '../api/cases';
import * as imagesApi from '../api/images';
import * as generateApi from '../api/generate';

interface WorkbenchState {
  currentCase: (Case & { source_images: SourceImage[]; generated_images: GeneratedImage[] }) | null;
  selectedDay: number;
  currentPrompt: string;
  isAnalyzing: boolean;
  isGenerating: boolean;
  protectionZones: Zone[];
  latestResult: { id: string; image_url: string; thumbnail_url: string } | null;

  loadCase: (caseId: string) => Promise<void>;
  selectDay: (day: number) => void;
  setPrompt: (text: string) => void;
  setProtectionZones: (zones: Zone[]) => void;

  analyzeCurrentImage: () => Promise<void>;
  generateImage: () => Promise<void>;
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  currentCase: null,
  selectedDay: 0,
  currentPrompt: '',
  isAnalyzing: false,
  isGenerating: false,
  protectionZones: [],
  latestResult: null,

  loadCase: async (caseId: string) => {
    const data = await casesApi.getCase(caseId);
    set({ currentCase: data as any, selectedDay: 0, currentPrompt: '', latestResult: null });
  },

  selectDay: (day: number) => set({ selectedDay: day, currentPrompt: '', latestResult: null }),
  setPrompt: (text: string) => set({ currentPrompt: text }),
  setProtectionZones: (zones: Zone[]) => set({ protectionZones: zones }),

  analyzeCurrentImage: async () => {
    const { currentCase, selectedDay } = get();
    if (!currentCase) return;

    const sourceImg = currentCase.source_images.find((i) => i.day_number === selectedDay);
    if (!sourceImg) return;

    set({ isAnalyzing: true });
    try {
      const { base64, mime_type } = await imagesApi.getImageBase64(sourceImg.id);
      const result = await generateApi.analyzeImage({
        image_base64: base64,
        mime_type,
        surgery_type: currentCase.surgery_type || undefined,
        day_number: selectedDay,
      });
      set({ currentPrompt: result.prompt, isAnalyzing: false });
    } catch (err) {
      set({ isAnalyzing: false });
      throw err;
    }
  },

  generateImage: async () => {
    const { currentCase, selectedDay, currentPrompt, protectionZones } = get();
    if (!currentCase || !currentPrompt) return;

    const sourceImg = currentCase.source_images.find((i) => i.day_number === selectedDay);

    set({ isGenerating: true });
    try {
      const result = await generateApi.generateImage({
        prompt: currentPrompt,
        case_id: currentCase.id,
        source_image_id: sourceImg?.id,
        day_number: selectedDay,
        mode: sourceImg ? 'image_to_image' : 'text_to_image',
        protection_zones: protectionZones.length > 0 ? protectionZones : undefined,
      });

      set({ latestResult: result, isGenerating: false });

      // Reload case to update generated_images list
      const updated = await casesApi.getCase(currentCase.id);
      set({ currentCase: updated as any });
    } catch (err) {
      set({ isGenerating: false });
      throw err;
    }
  },
}));
