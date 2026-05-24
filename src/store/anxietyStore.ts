import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AnxietyRecord {
  id: string
  content: string
  intensity: number // 1–10
  possible_solution: string | null
  created_at: string         // ISO
  status: 'active' | 'archived'
  archived_at: string | null // ISO
  check_in_due_at: string    // created_at + 24 h
  check_in_answered_at: string | null // null = pending / not yet answered
  still_bothering: boolean | null
}

interface AnxietyState {
  records: AnxietyRecord[]
  addRecord: (content: string, intensity: number, possible_solution?: string | null) => AnxietyRecord
  archiveRecord: (id: string) => void
  answerCheckIn: (id: string, stillBothering: boolean) => void
}

export const useAnxietyStore = create<AnxietyState>()(
  persist(
    (set, get) => ({
      records: [],

      addRecord: (content, intensity, possible_solution = null) => {
        const now = new Date()
        const checkInDue = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const record: AnxietyRecord = {
          id: crypto.randomUUID(),
          content,
          intensity,
          possible_solution: possible_solution || null,
          created_at: now.toISOString(),
          status: 'active',
          archived_at: null,
          check_in_due_at: checkInDue.toISOString(),
          check_in_answered_at: null,
          still_bothering: null,
        }
        set({ records: [...get().records, record] })
        return record
      },

      archiveRecord: (id) => {
        const now = new Date().toISOString()
        set({
          records: get().records.map((r) =>
            r.id === id
              ? { ...r, status: 'archived', archived_at: now, still_bothering: false, check_in_answered_at: now }
              : r
          ),
        })
      },

      // stillBothering=true → reset 24 h cycle; false → archive
      answerCheckIn: (id, stillBothering) => {
        const now = new Date()
        set({
          records: get().records.map((r) => {
            if (r.id !== id) return r
            if (stillBothering) {
              const nextDue = new Date(now.getTime() + 24 * 60 * 60 * 1000)
              return {
                ...r,
                check_in_due_at: nextDue.toISOString(),
                check_in_answered_at: null, // reset so it triggers again in 24 h
                still_bothering: true,
              }
            }
            return {
              ...r,
              status: 'archived',
              archived_at: now.toISOString(),
              still_bothering: false,
              check_in_answered_at: now.toISOString(),
            }
          }),
        })
      },
    }),
    {
      name: 'focusflow-anxiety',
      partialize: (state) => ({ records: state.records }),
    }
  )
)

/** Records that are overdue for a check-in and haven't been answered yet. */
export function getPendingCheckIns(records: AnxietyRecord[]): AnxietyRecord[] {
  const now = new Date()
  return records.filter(
    (r) =>
      r.status === 'active' &&
      r.check_in_answered_at === null &&
      new Date(r.check_in_due_at) <= now
  )
}
