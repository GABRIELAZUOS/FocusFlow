import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StudyAgendaItem {
  id: string
  /** Link to a StudyContent id (optional — sessions can be standalone) */
  content_id: string | null
  subject_id: string
  subject_name: string
  subject_color: string
  /** Display title for the session */
  content_title: string
  /** 0-6 (Sun-Sat), null = unscheduled (pool) */
  scheduled_day: number | null
  /** HH:MM start time, null = not placed on grid */
  start_time: string | null
  duration_hours: number
  /** YYYY-MM-DD of the Sunday of the week this item was created */
  week_start?: string
  /** True when this item was auto-created for a spaced-repetition review */
  is_review?: boolean
  /** Which review stage this item represents (1 | 2 | 3), null for regular sessions */
  review_stage?: 1 | 2 | 3 | null
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface EstudosAgendaState {
  items: StudyAgendaItem[]
  addItem: (data: Omit<StudyAgendaItem, 'id'>) => StudyAgendaItem
  updateItem: (id: string, updates: Partial<Omit<StudyAgendaItem, 'id'>>) => void
  removeItem: (id: string) => void
  /** Remove all sessions linked to a given content id */
  removeByContentId: (contentId: string) => void
  /** Remove all sessions linked to a given subject id */
  removeBySubjectId: (subjectId: string) => void
  /** Remove all *review* items linked to a given content id */
  removeReviewsForContent: (contentId: string) => void
}

export const useEstudosAgendaStore = create<EstudosAgendaState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (data) => {
        const item: StudyAgendaItem = { id: crypto.randomUUID(), ...data }
        set({ items: [...get().items, item] })
        return item
      },

      updateItem: (id, updates) => {
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) })
      },

      removeByContentId: (contentId) => {
        set({ items: get().items.filter((i) => i.content_id !== contentId) })
      },

      removeBySubjectId: (subjectId) => {
        set({ items: get().items.filter((i) => i.subject_id !== subjectId) })
      },

      removeReviewsForContent: (contentId) => {
        set({
          items: get().items.filter(
            (i) => !(i.content_id === contentId && i.is_review === true)
          ),
        })
      },
    }),
    {
      name: 'focusflow-estudos-agenda',
      partialize: (state) => ({ items: state.items }),
    }
  )
)
