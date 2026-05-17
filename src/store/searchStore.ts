/**
 * Search Store (Zustand)
 * 管理全局搜索状态
 */
import { create } from 'zustand';

interface SearchStore {
  query: string;
  isOpen: boolean;
  setQuery: (q: string) => void;
  setOpen: (open: boolean) => void;
  reset: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  query: '',
  isOpen: false,
  setQuery: (q) => set({ query: q, isOpen: q.length > 0 }),
  setOpen: (open) => set({ isOpen: open }),
  reset: () => set({ query: '', isOpen: false }),
}));
