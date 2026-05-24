import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task, TaskColumn, EnergyLevel } from '../lib/supabase'

interface KanbanState {
  tasks: Task[]
  energyFilter: EnergyLevel | null
  quickCaptureOpen: boolean

  setEnergyFilter: (v: EnergyLevel | null) => void
  setQuickCaptureOpen: (v: boolean) => void

  addTask: (title: string, column?: TaskColumn) => Task
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, column: TaskColumn) => void
  reorderTasks: (tasks: Task[]) => void
}

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set, get) => ({
      tasks: [],
      energyFilter: null,
      quickCaptureOpen: false,

      setEnergyFilter: (v) => set({ energyFilter: v }),
      setQuickCaptureOpen: (v) => set({ quickCaptureOpen: v }),

      addTask: (title, column = 'inbox') => {
        const { tasks } = get()
        const maxPos = tasks.filter((t) => t.column === column).length
        const newTask: Task = {
          id: crypto.randomUUID(),
          user_id: 'local',
          title,
          column,
          energy_level: null,
          estimated_time: null,
          notes: null,
          category_color: null,
          woop_id: null,
          position: maxPos,
          created_at: new Date().toISOString(),
          completed_at: null,
        }
        set({ tasks: [...tasks, newTask] })
        return newTask
      },

      updateTask: (id, updates) =>
        set({ tasks: get().tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)) }),

      deleteTask: (id) =>
        set({ tasks: get().tasks.filter((t) => t.id !== id) }),

      moveTask: (id, column) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task) return
        const updates: Partial<Task> = { column }
        if (column === 'done') updates.completed_at = new Date().toISOString()
        else if (task.column === 'done') updates.completed_at = null
        get().updateTask(id, updates)
      },

      reorderTasks: (tasks) => set({ tasks }),
    }),
    {
      name: 'focusflow-kanban',
      // Only persist task data; UI filter state resets to null on every load
      // so a stale energy filter never silently hides newly created tasks.
      partialize: (state) => ({ tasks: state.tasks }),
      // v1: 'someday' column removed — migrate any existing tasks to 'brain_dump'
      version: 1,
      migrate: (persisted: unknown, fromVersion: number) => {
        const state = persisted as { tasks?: Task[] }
        if (fromVersion === 0 && Array.isArray(state.tasks)) {
          return {
            ...state,
            tasks: state.tasks.map((t) =>
              (t.column as string) === 'someday' ? { ...t, column: 'brain_dump' as TaskColumn } : t
            ),
          }
        }
        return state
      },
    }
  )
)

export function getTasksByColumn(
  tasks: Task[],
  column: TaskColumn,
  energyFilter?: EnergyLevel | null
): Task[] {
  return tasks
    .filter((t) => t.column === column && (!energyFilter || t.energy_level === energyFilter))
    .sort((a, b) => a.position - b.position)
}
