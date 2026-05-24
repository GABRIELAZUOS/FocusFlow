import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, AlertTriangle, Info } from 'lucide-react'
import type { Task, TaskColumn } from '../../lib/supabase'
import TaskCard from './TaskCard'

// ─── SortableTaskCard wrapper ─────────────────────────────────────────────────

interface SortableTaskCardProps {
  task: Task
  onUpdate: (id: string, updates: Partial<Task>) => void
  onDelete: (id: string) => void
  onFocusNow: (task: Task) => void
}

function SortableTaskCard({ task, onUpdate, onDelete, onFocusNow }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onFocusNow={onFocusNow}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

interface ColumnProps {
  id: TaskColumn
  title: string
  emoji: string
  tasks: Task[]
  limit?: number
  onAddTask?: () => void
  onUpdateTask: (id: string, updates: Partial<Task>) => void
  onDeleteTask: (id: string) => void
  onFocusNow: (task: Task) => void
}

export default function Column({
  id,
  title,
  emoji,
  tasks,
  limit,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onFocusNow,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const isLimitReached = limit !== undefined && tasks.length >= limit
  const showAddButton = ['inbox', 'brain_dump', 'today'].includes(id)

  return (
    <div
      className="flex flex-col rounded-2xl transition-colors"
      style={{
        flex: '1 1 0',
        minWidth: 200,
        background: isOver ? '#1c1c2a' : '#16161f',
        border: `1px solid ${isOver ? '#7c3aed55' : '#1e1e2e'}`,
        minHeight: 200,
      }}
    >
      {/* Column header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none" role="img" aria-label={title}>
              {emoji}
            </span>
            <span className="text-white font-semibold text-sm">{title}</span>
            <span className="inline-flex items-center justify-center rounded-full bg-white/10 text-slate-400 text-xs font-medium px-1.5 py-0.5 min-w-[20px]">
              {tasks.length}
            </span>
          </div>

          {/* Limit warning badge */}
          {isLimitReached && (
            <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
              <AlertTriangle size={11} />
              Limite atingido
            </span>
          )}
        </div>

        {/* Today: gentle message when at/over 3 tasks */}
        {id === 'today' && tasks.length >= 3 && (
          <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 px-3 py-2">
            <Info size={12} className="text-violet-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-violet-300 leading-snug">
              Foco em 3 tarefas. Menos é mais!
            </p>
          </div>
        )}

        {/* In Progress: message when at/over 1 task */}
        {id === 'in_progress' && tasks.length >= 1 && (
          <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
            <Info size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300 leading-snug">
              Uma coisa de cada vez. Conclua antes de iniciar outra.
            </p>
          </div>
        )}
      </div>

      {/* Task list – scrollable */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-3 pb-2 flex flex-col gap-2"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onFocusNow={onFocusNow}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-8">
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              {id === 'inbox'      && 'Capture tudo aqui.\nRevise depois.'}
              {id === 'brain_dump' && 'Despeje tudo aqui.\nSem julgamentos.'}
              {id === 'today' && 'Escolha até 3 tarefas\npara hoje.'}
              {id === 'in_progress' && 'Arraste uma tarefa\npara começar.'}
              {id === 'done' && 'As conquistas\naparecerão aqui.'}
            </p>
          </div>
        )}
      </div>

      {/* Add task button */}
      {showAddButton && onAddTask && (
        <div className="px-3 pb-3 flex-shrink-0">
          <button
            onClick={onAddTask}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs text-slate-500 hover:text-violet-400 border border-dashed border-[#2a2a3e] hover:border-violet-500/50 transition-colors"
          >
            <Plus size={13} />
            <span>Adicionar tarefa</span>
          </button>
        </div>
      )}
    </div>
  )
}
