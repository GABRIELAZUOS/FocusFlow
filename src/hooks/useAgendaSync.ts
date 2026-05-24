import { useEffect } from 'react'
import { useAgendaStore } from '../store/agendaStore'
import { useKanbanStore } from '../store/kanbanStore'
import type { AgendaItem } from '../store/agendaStore'

/** Returns true if the item is scheduled for the given day (handles repeat_days). */
function isScheduledForDay(item: AgendaItem, day: number): boolean {
  if (item.is_fixed && item.repeat_days.length > 0) {
    return item.repeat_days.includes(day)
  }
  return item.scheduled_day === day
}

/** Get the effective start_time for an item on a specific day. */
export function getEffectiveStartTime(item: AgendaItem, day: number): string | null {
  return (item.day_start_times?.[day] as string | undefined) ?? item.start_time ?? null
}

/** Create kanban 'today' tasks for agenda items scheduled for today that haven't been synced yet. */
function syncToToday() {
  const { items, updateItem } = useAgendaStore.getState()
  const { addTask } = useKanbanStore.getState()
  const todayDay = new Date().getDay()

  for (const item of items) {
    if (!item.completed && isScheduledForDay(item, todayDay) && !item.today_task_id) {
      const task = addTask(item.title, 'today')
      updateItem(item.id, { today_task_id: task.id })
    }
  }
}

/**
 * Check if any agenda item whose kanban 'today' task has been moved to 'done'.
 * If so: mark the agenda item completed and (if sourced from Brain Dump) remove the Brain Dump task.
 * Also clear stale today_task_id references when the kanban task no longer exists.
 */
function detectCompletions() {
  const { items, markCompleted, updateItem } = useAgendaStore.getState()
  const { tasks, deleteTask } = useKanbanStore.getState()

  for (const item of items) {
    if (item.completed || !item.today_task_id) continue

    const kanbanTask = tasks.find((t) => t.id === item.today_task_id)
    if (!kanbanTask) {
      // Task was deleted from kanban directly — clear stale reference so it
      // can be re-created the next time this item is scheduled for today.
      updateItem(item.id, { today_task_id: null })
    } else if (kanbanTask.column === 'done') {
      markCompleted(item.id)
      // Per spec: "the original Brain Dump task is also removed" on completion
      if (item.brain_dump_task_id) {
        deleteTask(item.brain_dump_task_id)
      }
    }
  }
}

/**
 * Runs on mount:
 *  1. Weekly reset (migrates items from past weeks)
 *  2. Sync scheduled items for today into kanban 'today'
 *  3. Detect kanban completions
 *
 * Then every 60 s:
 *  – Re-sync + detect completions (same as the anxiety 24 h pattern)
 *  – If the calendar date changed (midnight crossed), also re-run the weekly reset and re-sync
 */
export function useAgendaSync() {
  useEffect(() => {
    useAgendaStore.getState().runWeeklyReset()
    syncToToday()
    detectCompletions()

    let lastDate = new Date().toDateString()

    const interval = setInterval(() => {
      const today = new Date().toDateString()
      if (today !== lastDate) {
        lastDate = today
        useAgendaStore.getState().runWeeklyReset()
        syncToToday()
      }
      detectCompletions()
    }, 60_000)

    return () => clearInterval(interval)
  }, [])
}
