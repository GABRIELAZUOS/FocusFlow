import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Types ─────────────────────────────────────────────────────────────────────

export type MoodId =
  | 'amazing'
  | 'good'
  | 'neutral'
  | 'stressed'
  | 'anxious'
  | 'sad'
  | 'overwhelmed'

export type PeriodId = 'morning' | 'afternoon' | 'evening'

export interface MoodOption {
  id: MoodId
  emoji: string
  label: string
  /** Valence: +2 (very positive) → -2 (very negative). Used for correlation. */
  valence: number
}

export const MOOD_OPTIONS: MoodOption[] = [
  { id: 'amazing',     emoji: '🤩', label: 'Incrível',       valence:  2 },
  { id: 'good',        emoji: '😊', label: 'Bem',            valence:  1 },
  { id: 'neutral',     emoji: '😐', label: 'Neutro',         valence:  0 },
  { id: 'stressed',    emoji: '😤', label: 'Estressado',     valence: -1 },
  { id: 'anxious',     emoji: '😰', label: 'Ansioso',        valence: -1 },
  { id: 'sad',         emoji: '😢', label: 'Triste',         valence: -1 },
  { id: 'overwhelmed', emoji: '🤯', label: 'Sobrecarregado', valence: -2 },
]

export interface MoodRecord {
  id: string
  mood: MoodId
  period: PeriodId
  note: string
  recorded_at: string // ISO
}

export interface MoodAlert {
  id: string
  severity: 'low' | 'medium' | 'high' | 'crisis'
  message: string
  resources: string[]
  generated_at: string // ISO
  dismissed: boolean
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface MoodState {
  records: MoodRecord[]
  alert: MoodAlert | null
  /** Period to open the MoodBar modal for (set externally, cleared by MoodBar after consuming). */
  modalPeriod: PeriodId | null

  addRecord: (data: { mood: MoodId; period: PeriodId; note?: string }) => MoodRecord
  setAlert: (alert: MoodAlert | null) => void
  dismissAlert: () => void
  openModal: (period: PeriodId) => void
  closeModal: () => void
}

export const useMoodStore = create<MoodState>()(
  persist(
    (set, get) => ({
      records: [],
      alert: null,
      modalPeriod: null,

      addRecord: (data) => {
        const record: MoodRecord = {
          id: crypto.randomUUID(),
          mood: data.mood,
          period: data.period,
          note: data.note ?? '',
          recorded_at: new Date().toISOString(),
        }
        // Replace any existing record for the same period today
        const todayKey = new Date().toDateString()
        const filtered = get().records.filter(
          (r) =>
            !(
              r.period === data.period &&
              new Date(r.recorded_at).toDateString() === todayKey
            )
        )
        set({ records: [...filtered, record] })
        return record
      },

      setAlert: (alert) => set({ alert }),

      dismissAlert: () => {
        const a = get().alert
        if (a) set({ alert: { ...a, dismissed: true } })
      },

      openModal: (period) => set({ modalPeriod: period }),
      closeModal: () => set({ modalPeriod: null }),
    }),
    {
      name: 'focusflow-mood',
      partialize: (state) => ({ records: state.records, alert: state.alert }),
    }
  )
)
