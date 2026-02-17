import { create } from 'zustand';
import type { Case } from '@healvision/shared';
import * as casesApi from '../api/cases';

interface CaseState {
  cases: Case[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  fetchCases: () => Promise<void>;
}

export const useCaseStore = create<CaseState>((set) => ({
  cases: [],
  loading: false,
  error: null,
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  fetchCases: async () => {
    set({ loading: true, error: null });
    try {
      const cases = await casesApi.getCases();
      set({ cases, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },
}));
