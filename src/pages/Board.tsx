import { useEffect, useState, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragCancelEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, AlertCircle } from 'lucide-react'

import { useKanbanStore, getTasksByColumn } from '../store/kanbanStore'
import { useAgendaStore } from '../store/agendaStore'
import { useSettingsStore } from '../store/settingsStore'
import { usePomodoroStore } from '../store/pomodoroStore'
import Column from '../components/kanban/Column'
import DailyReviewModal from '../components/kanban/DailyReviewModal'
import QuickCapture from '../components/kanban/QuickCapture'
import ConfettiEffect from '../components/shared/ConfettiEffect'
import { celebrateTask } from '../lib/utils'
import type { Task, TaskColumn, EnergyLevel } from '../lib/supabase'

const COLUMNS: { id: TaskColumn; title: string; emoji: string; limit?: number }[] = [
  { id: 'inbox',       title: 'Entrada',      emoji: '📥' },
  { id: 'brain_dump',  title: 'Brain Dump',   emoji: '🧠' },
  { id: 'today',       title: 'Hoje',         emoji: '🎯', limit: 3 },
  { id: 'in_progress', title: 'Em Andamento', emoji: '⚡', limit: 1 },
  { id: 'done',        title: 'Concluído',    emoji: '✅' },
]

const ENERGY_FILTERS: { label: string; value: EnergyLevel | null }[] = [
  { label: 'Todas',     value: null },
  { label: '🟢 Baixa',  value: 'low' },
  { label: '🟡 Média',  value: 'medium' },
  { label: '🔴 Alta',   value: 'high' },
]

interface ToastWarning { id: number; message: string }

export default function Board() {
  const { tasks, energyFilter, quickCaptureOpen, addTask, updateTask, deleteTask, moveTask, reorderTasks, setEnergyFilter, setQuickCaptureOpen } = useKanbanStore()
  const { showDailyReview, lastOpenedDate, setLastOpenedDate } = useSettingsStore()
  const { setActiveTaskId } = usePomodoroStore()

  // ── DnD local state (visual-only during drag) ─────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localTasks, setLocalTasks] = useState<Task[]>([])
  const isDragging = activeId !== null

  // When not dragging, columns read from the store; during drag they read localTasks
  const renderTasks = isDragging ? localTasks : tasks

  // ── Other UI state ─────────────────────────────────────────────────────────
  const [showDailyReviewModal, setShowDailyReviewModal] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [warnings, setWarnings] = useState<ToastWarning[]>([])
  const [brainDumpCaptureOpen, setBrainDumpCaptureOpen] = useState(false)
  const warningCounter = useRef(0)

  // ── Daily review ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showDailyReview) return
    const today = new Date().toDateString()
    if (lastOpenedDate !== today) {
      setShowDailyReviewModal(true)
      setLastOpenedDate(today)
    }
  }, [showDailyReview, lastOpenedDate, setLastOpenedDate])

  // ── Toast helper ───────────────────────────────────────────────────────────
  function showWarning(message: string) {
    const id = ++warningCounter.current
    setWarnings((prev) => [...prev, { id, message }])
    setTimeout(() => setWarnings((prev) => prev.filter((w) => w.id !== id)), 3500)
  }

  // ── DnD sensors ───────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // ── Drag start: snapshot tasks into local state ───────────────────────────
  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    setLocalTasks([...tasks])
  }

  // ── Drag cancel: reset local state so columns render from the store ───────
  // Without this handler, pressing Escape (or any programmatic cancel) fires
  // onDragCancel instead of onDragEnd.  activeId would stay set → isDragging
  // stays true → renderTasks stays as the stale localTasks snapshot → newly
  // created tasks are in the store but never appear on the board.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleDragCancel(_event: DragCancelEvent) {
    setActiveId(null)
    setLocalTasks([])
  }

  // ── Drag over: update localTasks for live visual feedback ─────────────────
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const draggedId = active.id as string
    const overId = over.id as string
    if (draggedId === overId) return

    setLocalTasks((prev) => {
      const dragged = prev.find((t) => t.id === draggedId)
      if (!dragged) return prev

      // Resolve target column: over could be a column droppable or a task sortable
      const isOverColumn = COLUMNS.some((c) => c.id === overId)
      const targetCol: TaskColumn = isOverColumn
        ? (overId as TaskColumn)
        : (prev.find((t) => t.id === overId)?.column ?? dragged.column)

      // ── Cross-column move ──
      if (dragged.column !== targetCol) {
        return prev.map((t) => t.id === draggedId ? { ...t, column: targetCol } : t)
      }

      // ── Same-column reorder (hovering over a sibling task) ──
      if (!isOverColumn) {
        const colTasks = prev
          .filter((t) => t.column === targetCol)
          .sort((a, b) => a.position - b.position)
        const fromIdx = colTasks.findIndex((t) => t.id === draggedId)
        const toIdx   = colTasks.findIndex((t) => t.id === overId)
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev
        const reordered = arrayMove(colTasks, fromIdx, toIdx).map((t, i) => ({ ...t, position: i }))
        return [...prev.filter((t) => t.column !== targetCol), ...reordered]
      }

      return prev
    })
  }

  // ── Drag end: apply guards, commit to store ───────────────────────────────
  function handleDragEnd({ active, over }: DragEndEvent) {
    const draggedId = active.id as string
    const localDragged = localTasks.find((t) => t.id === draggedId)
    const storeDragged = tasks.find((t) => t.id === draggedId)

    // Reset drag state first (React 18 batches with the commits below)
    setActiveId(null)
    setLocalTasks([])

    if (!over || !localDragged || !storeDragged) return

    const targetCol  = localDragged.column
    const sourceCol  = storeDragged.column

    // ── Column limit guards ────────────────────────────────────────────────
    if (targetCol === 'today' && targetCol !== sourceCol) {
      const count = tasks.filter((t) => t.column === 'today' && t.id !== draggedId).length
      if (count >= 3) {
        showWarning('Limite de 3 tarefas em "Hoje" atingido.')
        return
      }
    }
    if (targetCol === 'in_progress' && targetCol !== sourceCol) {
      const count = tasks.filter((t) => t.column === 'in_progress' && t.id !== draggedId).length
      if (count >= 1) {
        showWarning('Foco em uma coisa de cada vez! Conclua a tarefa atual primeiro.')
        return
      }
    }

    // ── Celebrate moving to done ───────────────────────────────────────────
    if (targetCol === 'done' && sourceCol !== 'done') {
      celebrateTask()
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    }

    // ── Commit cross-column move ───────────────────────────────────────────
    // Return immediately after moving.  The reorder block below builds
    // `others` from the *pre-move* store snapshot (dragged task still in
    // sourceCol) and `updated` from localTasks (dragged task already in
    // targetCol), so letting it run would write the task into BOTH columns
    // — the exact duplicate bug we're fixing.
    if (targetCol !== sourceCol) {
      moveTask(draggedId, targetCol)
      return
    }

    // ── Commit same-column reorder (positions already set in localTasks) ───
    const finalColTasks = localTasks
      .filter((t) => t.column === targetCol)
      .sort((a, b) => a.position - b.position)

    const storeColTasks = getTasksByColumn(tasks, targetCol)
    const orderChanged = finalColTasks.some((t, i) => storeColTasks[i]?.id !== t.id)

    if (orderChanged) {
      const updated = finalColTasks.map((t, i) => ({ ...t, position: i }))
      const others  = tasks.filter((t) => t.column !== targetCol)
      reorderTasks([...others, ...updated])
      updated.forEach((t) => updateTask(t.id, { position: t.position }))
    }
  }

  // ── Per-column helpers ─────────────────────────────────────────────────────
  function getColTasks(col: TaskColumn): Task[] {
    return getTasksByColumn(renderTasks, col, energyFilter)
  }

  function handleFocusNow(task: Task) {
    const inProgressCount = tasks.filter((t) => t.column === 'in_progress').length
    if (task.column !== 'in_progress') {
      if (inProgressCount >= 1) { showWarning('Foco em uma coisa de cada vez!'); return }
      moveTask(task.id, 'in_progress')
    }
    setActiveTaskId(task.id)
  }

  function handleMoveToToday(id: string) {
    if (tasks.filter((t) => t.column === 'today').length < 3) moveTask(id, 'today')
  }

  const activeTask = activeId ? (isDragging ? localTasks : tasks).find((t) => t.id === activeId) ?? null : null
  const inboxTasks    = getTasksByColumn(tasks, 'inbox')
  const brainDumpTasks = getTasksByColumn(tasks, 'brain_dump')
  const todayCount = tasks.filter((t) => t.column === 'today').length

  return (
    <div className="relative flex flex-col h-full" style={{ background: '#0f0f13' }}>

      {/* Energy filter bar */}
      <div className="flex-shrink-0 flex items-center flex-wrap gap-2 px-5 pt-4 pb-3">
        <span className="text-slate-500 text-xs font-medium flex items-center gap-1 flex-shrink-0">
          <Zap size={12} />
          Energia:
        </span>
        {ENERGY_FILTERS.map((f) => (
          <button
            key={String(f.value)}
            onClick={() => setEnergyFilter(energyFilter === f.value ? null : f.value)}
            className={[
              'text-xs px-3 py-1.5 rounded-full border font-medium transition-colors flex-shrink-0',
              energyFilter === f.value
                ? 'bg-violet-600 border-violet-500 text-white'
                : 'border-[#2a2a3e] text-slate-400 hover:border-violet-500/40 hover:text-slate-200 bg-transparent',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex flex-row gap-3 px-5 pb-5 h-full" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                id={col.id}
                title={col.title}
                emoji={col.emoji}
                tasks={getColTasks(col.id)}
                limit={col.limit}
                onAddTask={
                  col.id === 'brain_dump'
                    ? () => setBrainDumpCaptureOpen(true)
                    : ['inbox', 'today'].includes(col.id)
                    ? () => setQuickCaptureOpen(true)
                    : undefined
                }
                onUpdateTask={(id, updates) => updateTask(id, updates)}
                onDeleteTask={(id) => deleteTask(id)}
                onFocusNow={handleFocusNow}
              />
            ))}
          </div>

          {/* Ghost card during drag */}
          <DragOverlay dropAnimation={{ duration: 160, easing: 'ease' }}>
            {activeTask && (
              <div className="rounded-2xl p-3 shadow-2xl pointer-events-none"
                style={{ background: '#1a1a24', border: '1px solid #7c3aed88', opacity: 0.92, width: 220 }}>
                <p className="text-white font-medium text-sm truncate">{activeTask.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Toast warnings */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence>
          {warnings.map((w) => (
            <motion.div key={w.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-xl pointer-events-auto"
              style={{ background: '#1e1e2e', border: '1px solid #f59e0b55', color: '#fbbf24', maxWidth: 380 }}
            >
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{w.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showConfetti && <ConfettiEffect />}

      <DailyReviewModal
        open={showDailyReviewModal}
        onClose={() => setShowDailyReviewModal(false)}
        inboxTasks={inboxTasks}
        brainDumpTasks={brainDumpTasks}
        onMoveToToday={handleMoveToToday}
        todayCount={todayCount}
      />

      <QuickCapture
        open={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        onSave={(title) => addTask(title, 'inbox')}
      />

      <QuickCapture
        open={brainDumpCaptureOpen}
        onClose={() => setBrainDumpCaptureOpen(false)}
        showAgendaToggle
        onSave={(title, addToAgenda) => {
          const task = addTask(title, 'brain_dump')
          if (addToAgenda) {
            useAgendaStore.getState().addItem({
              title,
              send_to_brain_dump: true,
              brain_dump_task_id: task.id,
              scheduled_day: null,
            })
          }
        }}
      />
    </div>
  )
}
