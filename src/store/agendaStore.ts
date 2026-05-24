import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AgendaItem {
  id: string
  title: string
  /** 0=Sun … 6=Sat, null = unscheduled / in pool */
  scheduled_day: number | null
  send_to_brain_dump: boolean
  brain_dump_task_id: string | null
  /** Kanban 'today' task auto-created for this item */
  today_task_id: string | null
  is_fixed: boolean
  completed: boolean
  completed_at: string | null
  created_at: string
  /** YYYY-MM-DD of the Sunday that starts the week this item belongs to */
  week_start: string

  // ── Calendar / time fields ───────────────────────────────────────────────
  /** "HH:MM" start time; null = item is in the pool (not placed on grid) */
  start_time: string | null
  /** Duration: 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 */
  duration_hours: number | null
  /** Derived: ceil(duration_hours * 60 / 25) — auto-set by store */
  pomodoro_count: number | null
  /** Display colour in the grid (hex) */
  color: string | null

  // ── Fixed-item multi-day repeat ──────────────────────────────────────────
  /** Day indexes on which a fixed item repeats, e.g. [1, 3, 5] */
  repeat_days: number[]
  /** Per-day start-time overrides so each instance can be independently moved */
  day_start_times: Record<number, string>
}

interface AgendaState {
  items: AgendaItem[]
  addItem: (data: {
    title: string
    scheduled_day?: number | null
    send_to_brain_dump?: boolean
    brain_dump_task_id?: string | null
    is_fixed?: boolean
    start_time?: string | null
    duration_hours?: number | null
    repeat_days?: number[]
    color?: string | null
  }) => AgendaItem
  deleteItem: (id: string) => void
  updateItem: (id: string, updates: Partial<AgendaItem>) => void
  markCompleted: (id: string) => void
  runWeeklyReset: () => void
}

/** Returns 'YYYY-MM-DD' of the Sunday that starts the current week */
export function getCurrentWeekStart(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

function calcPomodoros(hours: number | null | undefined): number | null {
  if (!hours) return null
  return Math.ceil((hours * 60) / 25)
}

export const useAgendaStore = create<AgendaState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (data) => {
        const duration_hours = data.duration_hours ?? null
        const item: AgendaItem = {
          id: crypto.randomUUID(),
          title: data.title,
          scheduled_day: data.scheduled_day ?? null,
          send_to_brain_dump: data.send_to_brain_dump ?? false,
          brain_dump_task_id: data.brain_dump_task_id ?? null,
          today_task_id: null,
          is_fixed: data.is_fixed ?? false,
          completed: false,
          completed_at: null,
          created_at: new Date().toISOString(),
          week_start: getCurrentWeekStart(),
          start_time: data.start_time ?? null,
          duration_hours,
          pomodoro_count: calcPomodoros(duration_hours),
          color: data.color ?? null,
          repeat_days: data.repeat_days ?? [],
          day_start_times: {},
        }
        set({ items: [...get().items, item] })
        return item
      },

      deleteItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

      updateItem: (id, updates) => {
        // Auto-recalculate pomodoro_count whenever duration_hours is updated
        const finalUpdates: Partial<AgendaItem> = { ...updates }
        if ('duration_hours' in updates) {
          finalUpdates.pomodoro_count = calcPomodoros(updates.duration_hours)
        }
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, ...finalUpdates } : i
          ),
        })
      },

      markCompleted: (id) =>
        set({
          items: get().items.map((i) =>
            i.id === id
              ? { ...i, completed: true, completed_at: new Date().toISOString() }
              : i
          ),
        }),

      runWeeklyReset: () => {
        const currentWeek = getCurrentWeekStart()
        const updated: AgendaItem[] = []

        for (const item of get().items) {
          if (item.week_start === currentWeek) {
            updated.push(item)
          } else if (item.completed) {
            if (item.is_fixed) {
              updated.push({
                ...item,
                completed: false,
                completed_at: null,
                today_task_id: null,
                week_start: currentWeek,
              })
            }
            // Non-fixed + completed → drop
          } else {
            if (item.is_fixed) {
              updated.push({ ...item, today_task_id: null, week_start: currentWeek })
            } else {
              // Non-fixed + not completed → back to pool
              updated.push({
                ...item,
                scheduled_day: null,
                start_time: null,
                today_task_id: null,
                week_start: currentWeek,
              })
            }
          }
        }

        set({ items: updated })
      },
    }),
    {
      name: 'focusflow-agenda',
      version: 1,
      migrate: (persisted: unknown, fromVersion: number) => {
        const state = persisted as { items?: AgendaItem[] }
        if (fromVersion === 0 && Array.isArray(state.items)) {
          return {
            ...state,
            items: state.items.map((item) => ({
              ...item,
              start_time: (item as AgendaItem).start_time ?? null,
              duration_hours: (item as AgendaItem).duration_hours ?? null,
              pomodoro_count: (item as AgendaItem).pomodoro_count ?? null,
              color: (item as AgendaItem).color ?? null,
              repeat_days: (item as AgendaItem).repeat_days ?? [],
              day_start_times: (item as AgendaItem).day_start_times ?? {},
            })),
          }
        }
        return state
      },
      partialize: (state) => ({ items: state.items }),
    }
  )
)
