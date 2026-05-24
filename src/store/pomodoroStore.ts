import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PomodoroMode, PomodoroSession } from '../lib/supabase'
import { POMODORO_MODES } from '../lib/utils'

type TimerPhase = 'idle' | 'focus' | 'break'

interface PomodoroState {
  phase: TimerPhase
  mode: PomodoroMode
  customFocus: number
  customBreak: number
  secondsLeft: number
  totalSeconds: number
  activeTaskId: string | null
  todaySessions: PomodoroSession[]
  allSessions: PomodoroSession[]
  pomodorosToday: number

  setMode: (mode: PomodoroMode) => void
  setCustomFocus: (v: number) => void
  setCustomBreak: (v: number) => void
  setActiveTaskId: (id: string | null) => void
  setPhase: (p: TimerPhase) => void
  setSecondsLeft: (s: number) => void

  start: (taskId?: string | null) => void
  pause: () => void
  resume: () => void
  abandon: () => void
  completeFocus: () => void
  skipBreak: () => void

  getFocusMinutes: () => number
  getBreakMinutes: () => number
}

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      phase: 'idle',
      mode: 'classic',
      customFocus: 25,
      customBreak: 5,
      secondsLeft: 25 * 60,
      totalSeconds: 25 * 60,
      activeTaskId: null,
      todaySessions: [],
      allSessions: [],
      pomodorosToday: 0,

      setMode: (mode) => {
        const focus = (mode === 'custom' ? get().customFocus : POMODORO_MODES[mode].focus) * 60
        set({ mode, secondsLeft: focus, totalSeconds: focus, phase: 'idle' })
      },
      setCustomFocus: (v) => set({ customFocus: v }),
      setCustomBreak: (v) => set({ customBreak: v }),
      setActiveTaskId: (id) => set({ activeTaskId: id }),
      setPhase: (p) => set({ phase: p }),
      setSecondsLeft: (s) => set({ secondsLeft: s }),

      getFocusMinutes: () => {
        const { mode, customFocus } = get()
        return mode === 'custom' ? customFocus : POMODORO_MODES[mode].focus
      },

      getBreakMinutes: () => {
        const { mode, customBreak } = get()
        return mode === 'custom' ? customBreak : POMODORO_MODES[mode].break
      },

      start: (taskId) => {
        const { mode, getFocusMinutes, getBreakMinutes } = get()
        const focusMin = getFocusMinutes()
        const breakMin = getBreakMinutes()

        const session: PomodoroSession = {
          id: crypto.randomUUID(),
          user_id: 'local',
          task_id: taskId || null,
          mode,
          focus_minutes: focusMin,
          break_minutes: breakMin,
          completed: false,
          started_at: new Date().toISOString(),
          ended_at: null,
        }

        set({
          phase: 'focus',
          activeTaskId: taskId || null,
          secondsLeft: focusMin * 60,
          totalSeconds: focusMin * 60,
          allSessions: [session, ...get().allSessions],
        })
      },

      pause: () => set({ phase: 'idle' }),
      resume: () => set({ phase: 'focus' }),

      abandon: () => {
        const focusMin = get().getFocusMinutes()
        set({ phase: 'idle', secondsLeft: focusMin * 60, totalSeconds: focusMin * 60 })
      },

      completeFocus: () => {
        const { allSessions } = get()
        const breakMin = get().getBreakMinutes()
        const now = new Date().toISOString()
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Mark the most recent session as completed
        const updatedSessions = allSessions.map((s, i) =>
          i === 0 ? { ...s, completed: true, ended_at: now } : s
        )

        const todaySessions = updatedSessions.filter(
          (s) => new Date(s.started_at) >= today
        )

        set({
          phase: 'break',
          allSessions: updatedSessions,
          todaySessions,
          pomodorosToday: todaySessions.filter((s) => s.completed).length,
          secondsLeft: breakMin * 60,
          totalSeconds: breakMin * 60,
        })
      },

      skipBreak: () => {
        const focusMin = get().getFocusMinutes()
        set({ phase: 'idle', secondsLeft: focusMin * 60, totalSeconds: focusMin * 60 })
      },
    }),
    {
      name: 'focusflow-pomodoro',
      // Don't persist live timer state — always restart fresh
      partialize: (s) => ({
        mode: s.mode,
        customFocus: s.customFocus,
        customBreak: s.customBreak,
        allSessions: s.allSessions,
        todaySessions: s.todaySessions,
        pomodorosToday: s.pomodorosToday,
      }),
    }
  )
)
