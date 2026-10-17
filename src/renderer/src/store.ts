import { create } from 'zustand'

export type View = 'workbench' | 'accounts' | 'settings' | 'prompts'

type AppState = {
  view: View
  setView: (view: View) => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'workbench',
  setView: (view) => set({ view })
}))
