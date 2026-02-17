import { create } from 'zustand';

interface SettingsState {
  devModeUnlocked: boolean;
  devToken: string | null;
  setDevMode: (unlocked: boolean, token?: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  devModeUnlocked: false,
  devToken: null,
  setDevMode: (unlocked, token) => set({ devModeUnlocked: unlocked, devToken: token || null }),
}));
