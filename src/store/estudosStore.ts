import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEstudosAgendaStore } from './estudosAgendaStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Subject {
  id: string
  name: string
  color: string
  created_at: string
}

export type ContentStatus =
  | 'new'
  | 'review_1_pending'
  | 'review_2_pending'
  | 'review_3_pending'
  | 'mastered'

export interface StudyContent {
  id: string
  subject_id: string
  title: string
  notes: string
  studied_at: string
  status: ContentStatus
  review_1_due: string
  review_1_done_at: string | null
  review_1_easy: boolean | null
  review_2_due: string | null
  review_2_done_at: string | null
  review_2_easy: boolean | null
  review_3_due: string | null
  review_3_done_at: string | null
}

// ── Time helpers ──────────────────────────────────────────────────────────────

function addMs(iso: string, ms: number): string {
  return new Date(new Date(iso).getTime() + ms).toISOString()
}

const H24  = 24 * 3_600_000
const D7   =  7 * 86_400_000
const D30  = 30 * 86_400_000

// ── Exported helpers (used by App + Sidebar for badge) ────────────────────────

export function isCurrentlyPending(c: StudyContent): boolean {
  const now = new Date().toISOString()
  if (c.status === 'review_1_pending' && !c.review_1_done_at && c.review_1_due <= now) return true
  if (c.status === 'review_2_pending' && !c.review_2_done_at && c.review_2_due != null && c.review_2_due <= now) return true
  if (c.status === 'review_3_pending' && !c.review_3_done_at && c.review_3_due != null && c.review_3_due <= now) return true
  return false
}

export function getPendingCount(contents: StudyContent[]): number {
  return contents.filter(isCurrentlyPending).length
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for the Sunday that starts the current week. */
function getWeekStart(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface EstudosState {
  subjects: Subject[]
  contents: StudyContent[]
  addSubject: (data: { name: string; color: string }) => Subject
  deleteSubject: (id: string) => void
  addContent: (data: { subject_id: string; title: string; notes?: string }) => StudyContent
  updateNotes: (id: string, notes: string) => void
  deleteContent: (id: string) => void
  completeReview: (id: string, action: 'easy' | 'hard' | 'mastered' | 'retry') => void
  /** Auto-promotes 'new' → 'review_1_pending' when review_1_due has passed. */
  checkAndPromote: () => void
  /** Creates missing review agenda items for all currently-due pending reviews. */
  syncReviewAgendaItems: () => void
}

export const useEstudosStore = create<EstudosState>()(
  persist(
    (set, get) => ({
      subjects: [],
      contents: [],

      addSubject: (data) => {
        const subject: Subject = {
          id: crypto.randomUUID(),
          name: data.name,
          color: data.color,
          created_at: new Date().toISOString(),
        }
        set({ subjects: [...get().subjects, subject] })
        return subject
      },

      deleteSubject: (id) => {
        set({
          subjects: get().subjects.filter((s) => s.id !== id),
          contents: get().contents.filter((c) => c.subject_id !== id),
        })
        useEstudosAgendaStore.getState().removeBySubjectId(id)
      },

      addContent: (data) => {
        const now = new Date().toISOString()
        const content: StudyContent = {
          id: crypto.randomUUID(),
          subject_id: data.subject_id,
          title: data.title,
          notes: data.notes ?? '',
          studied_at: now,
          status: 'new',
          review_1_due: addMs(now, H24),
          review_1_done_at: null,
          review_1_easy: null,
          review_2_due: null,
          review_2_done_at: null,
          review_2_easy: null,
          review_3_due: null,
          review_3_done_at: null,
        }
        set({ contents: [...get().contents, content] })

        // Auto-create an unscheduled entry in the study agenda pool
        const subject = get().subjects.find((s) => s.id === data.subject_id)
        if (subject) {
          useEstudosAgendaStore.getState().addItem({
            content_id: content.id,
            subject_id: subject.id,
            subject_name: subject.name,
            subject_color: subject.color,
            content_title: content.title,
            scheduled_day: null,
            start_time: null,
            duration_hours: 1,
            week_start: getWeekStart(),
          })
        }

        return content
      },

      updateNotes: (id, notes) => {
        set({ contents: get().contents.map((c) => (c.id === id ? { ...c, notes } : c)) })
      },

      deleteContent: (id) => {
        set({ contents: get().contents.filter((c) => c.id !== id) })
        useEstudosAgendaStore.getState().removeByContentId(id)
      },

      completeReview: (id, action) => {
        const now = new Date().toISOString()
        set({
          contents: get().contents.map((c) => {
            if (c.id !== id) return c

            if (c.status === 'review_1_pending') {
              if (action === 'easy') {
                return {
                  ...c,
                  review_1_done_at: now,
                  review_1_easy: true,
                  status: 'review_2_pending' as ContentStatus,
                  review_2_due: addMs(now, D7),
                }
              }
              // hard: reschedule review 1 (due → future, won't show as pending)
              return { ...c, review_1_easy: false, review_1_due: addMs(now, H24) }
            }

            if (c.status === 'review_2_pending') {
              if (action === 'easy') {
                return {
                  ...c,
                  review_2_done_at: now,
                  review_2_easy: true,
                  status: 'review_3_pending' as ContentStatus,
                  review_3_due: addMs(now, D30),
                }
              }
              // hard: full restart from review 1
              return {
                ...c,
                review_1_done_at: null,
                review_1_easy: null,
                review_1_due: addMs(now, H24),
                review_2_done_at: null,
                review_2_easy: null,
                review_2_due: null,
                status: 'review_1_pending' as ContentStatus,
              }
            }

            if (c.status === 'review_3_pending') {
              if (action === 'mastered') {
                return { ...c, review_3_done_at: now, status: 'mastered' as ContentStatus }
              }
              // retry: restart from review 2
              return {
                ...c,
                review_2_done_at: null,
                review_2_easy: null,
                review_2_due: addMs(now, D7),
                review_3_due: null,
                review_3_done_at: null,
                status: 'review_2_pending' as ContentStatus,
              }
            }

            return c
          }),
        })

        // Remove all review agenda items for this content — they are now stale.
        useEstudosAgendaStore.getState().removeReviewsForContent(id)

        // On hard/retry the review restarts from stage 1 with a 24-h cooldown.
        // Immediately place a new review_1 item in the pool so the user can
        // pre-schedule it on tomorrow's calendar slot.
        if (action === 'hard' || action === 'retry') {
          const content = get().contents.find((c) => c.id === id)
          const subject = content ? get().subjects.find((s) => s.id === content.subject_id) : null
          if (content && subject) {
            useEstudosAgendaStore.getState().addItem({
              content_id: id,
              subject_id: subject.id,
              subject_name: subject.name,
              subject_color: subject.color,
              content_title: content.title,
              scheduled_day: null,
              start_time: null,
              duration_hours: 0.5,
              is_review: true,
              review_stage: 1,
              week_start: getWeekStart(),
            })
          }
        }
      },

      checkAndPromote: () => {
        const now = new Date().toISOString()
        // Guard: only call set() when there is actually something to promote,
        // so subscribers don't fire on every tick when there is nothing to do.
        const hasNew = get().contents.some((c) => c.status === 'new' && c.review_1_due <= now)
        if (!hasNew) return
        set({
          contents: get().contents.map((c) =>
            c.status === 'new' && c.review_1_due <= now
              ? { ...c, status: 'review_1_pending' as ContentStatus }
              : c
          ),
        })
      },

      syncReviewAgendaItems: () => {
        const { contents, subjects } = get()
        const now = new Date().toISOString()

        for (const c of contents) {
          // Determine which review stage is currently due
          let stage: 1 | 2 | 3 | null = null
          if (c.status === 'review_1_pending' && !c.review_1_done_at && c.review_1_due <= now) {
            stage = 1
          } else if (c.status === 'review_2_pending' && !c.review_2_done_at && c.review_2_due != null && c.review_2_due <= now) {
            stage = 2
          } else if (c.status === 'review_3_pending' && !c.review_3_done_at && c.review_3_due != null && c.review_3_due <= now) {
            stage = 3
          }
          if (!stage) continue

          // Already have the correct review item? Skip.
          const currentItems = useEstudosAgendaStore.getState().items
          const alreadyExists = currentItems.some(
            (i) => i.content_id === c.id && i.is_review === true && i.review_stage === stage
          )
          if (alreadyExists) continue

          // Remove stale review items for this content (wrong stage)
          useEstudosAgendaStore.getState().removeReviewsForContent(c.id)

          // Create the review pool item
          const subject = subjects.find((s) => s.id === c.subject_id)
          if (!subject) continue

          useEstudosAgendaStore.getState().addItem({
            content_id: c.id,
            subject_id: subject.id,
            subject_name: subject.name,
            subject_color: subject.color,
            content_title: c.title,
            scheduled_day: null,
            start_time: null,
            duration_hours: 0.5,
            is_review: true,
            review_stage: stage,
            week_start: getWeekStart(),
          })
        }
      },
    }),
    {
      name: 'focusflow-estudos',
      partialize: (state) => ({ subjects: state.subjects, contents: state.contents }),
    }
  )
)
