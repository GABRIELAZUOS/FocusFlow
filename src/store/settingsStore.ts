import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PomodoroMode } from '../lib/supabase'

interface SettingsState {
  darkMode: boolean
  soundEnabled: boolean
  defaultPomodoroMode: PomodoroMode
  showDailyReview: boolean
  sidebarCollapsed: boolean
  onboardingCompleted: boolean
  lastOpenedDate: string | null

  setDarkMode: (v: boolean) => void
  setSoundEnabled: (v: boolean) => void
  setDefaultPomodoroMode: (v: PomodoroMode) => void
  setShowDailyReview: (v: boolean) => void
  setSidebarCollapsed: (v: boolean) => void
  setOnboardingCompleted: (v: boolean) => void
  setLastOpenedDate: (v: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: true,
      soundEnabled: true,
      defaultPomodoroMode: 'classic',
      showDailyReview: true,
      sidebarCollapsed: true,
      onboardingCompleted: false,
      lastOpenedDate: null,

      setDarkMode: (v) => set({ darkMode: v }),
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setDefaultPomodoroMode: (v) => set({ defaultPomodoroMode: v }),
      setShowDailyReview: (v) => set({ showDailyReview: v }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setOnboardingCompleted: (v) => set({ onboardingCompleted: v }),
      setLastOpenedDate: (v) => set({ lastOpenedDate: v }),
    }),
    {
      name: 'focusflow-settings',
      partialize: (state) => ({
        darkMode: state.darkMode,
        soundEnabled: state.soundEnabled,
        defaultPomodoroMode: state.defaultPomodoroMode,
        showDailyReview: state.showDailyReview,
        sidebarCollapsed: state.sidebarCollapsed,
        onboardingCompleted: state.onboardingCompleted,
        lastOpenedDate: state.lastOpenedDate,
      }),
    }
  )
)
