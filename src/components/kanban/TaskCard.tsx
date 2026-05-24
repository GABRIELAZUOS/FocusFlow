import { useState } from 'react'
import { motion } from 'framer-motion'
import { GripVertical, ChevronDown, ChevronUp, Play, Trash2 } from 'lucide-react'
import type { Task, EnergyLevel, EstimatedTime } from '../../lib/supabase'
import EnergyBadge from '../shared/EnergyBadge'
import { ENERGY_CONFIG, CATEGORY_COLORS, TIME_OPTIONS } from '../../lib/utils'

interface TaskCardProps {
  task: Task
  onUpdate: (id: string, updates: Partial<Task>) => void
  onDelete: (id: string) => void
  onFocusNow: (task: Task) => void
  isDragging?: boolean
  dragHandleProps?: object
}

export default function TaskCard({
  task,
  onUpdate,
  onDelete,
  onFocusNow,
  isDragging = false,
  dragHandleProps = {},
}: TaskCardProps) {
  const [notesOpen, setNotesOpen] = useState(false)

  const canFocus = task.column !== 'in_progress' && task.column !== 'done'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`group relative rounded-2xl p-3 border border-[#2a2a3e] bg-[#1a1a24] hover:border-violet-500/50 transition-colors select-none${isDragging ? ' opacity-50' : ''}`}
    >
      {/* Top row: drag handle + color dot + title */}
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...dragHandleProps}
          className="mt-0.5 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          aria-label="Arrastar tarefa"
          tabIndex={-1}
        >
          <GripVertical size={14} />
        </button>

        {/* Category color dot */}
        {task.category_color && (
          <div
            className="mt-1 flex-shrink-0 rounded-full"
            style={{ width: 8, height: 8, background: task.category_color }}
          />
        )}

        {/* Title */}
        <p className="flex-1 text-white font-medium text-sm leading-snug break-words min-w-0">
          {task.title}
        </p>
      </div>

      {/* Energy + estimated time row */}
      {(task.energy_level || task.estimated_time) && (
        <div className="flex items-center flex-wrap gap-1.5 mt-2 ml-5">
          {task.energy_level && (
            <EnergyBadge level={task.energy_level} size="sm" />
          )}
          {task.estimated_time && (
            <span className="inline-flex items-center rounded-full border border-[#2a2a3e] bg-white/5 text-xs px-1.5 py-0.5 text-slate-400 font-medium">
              {task.estimated_time}
            </span>
          )}
        </div>
      )}

      {/* Notes collapsible */}
      {task.notes && (
        <div className="mt-2 ml-5">
          <button
            onClick={() => setNotesOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {notesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span>{notesOpen ? 'Ocultar notas' : 'Ver notas'}</span>
          </button>
          {notesOpen && (
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
              {task.notes}
            </p>
          )}
        </div>
      )}

      {/* Hover actions row */}
      <div className="mt-2 ml-5 hidden group-hover:flex flex-col gap-2">
        {/* Energy level selector */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500 mr-1">Energia:</span>
          {(['high', 'medium', 'low'] as EnergyLevel[]).map((level) => {
            const cfg = ENERGY_CONFIG[level]
            return (
              <button
                key={level}
                onClick={() =>
                  onUpdate(task.id, {
                    energy_level: task.energy_level === level ? null : level,
                  })
                }
                title={cfg.label}
                className={`text-base leading-none transition-opacity ${task.energy_level === level ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-80'}`}
                aria-label={cfg.label}
              >
                {cfg.emoji}
              </button>
            )
          })}
        </div>

        {/* Time selector */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-slate-500 mr-1">Tempo:</span>
          {TIME_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() =>
                onUpdate(task.id, {
                  estimated_time: task.estimated_time === t ? null : (t as EstimatedTime),
                })
              }
              className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                task.estimated_time === t
                  ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                  : 'border-[#2a2a3e] text-slate-500 hover:border-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Color picker dots */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 mr-1">Cor:</span>
          {CATEGORY_COLORS.map((color) => (
            <button
              key={color}
              onClick={() =>
                onUpdate(task.id, {
                  category_color: task.category_color === color ? null : color,
                })
              }
              title={color}
              className={`rounded-full transition-transform hover:scale-110 ${task.category_color === color ? 'ring-2 ring-white ring-offset-1 ring-offset-[#1a1a24]' : ''}`}
              style={{ width: 12, height: 12, background: color }}
              aria-label={`Cor ${color}`}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 mt-0.5">
          {canFocus && (
            <button
              onClick={() => onFocusNow(task)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/40 text-violet-400 hover:text-violet-300 border border-violet-600/30 transition-colors"
            >
              <Play size={10} />
              <span>Focar agora</span>
            </button>
          )}
          <button
            onClick={() => onDelete(task.id)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-transparent hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-colors ml-auto"
            aria-label="Excluir tarefa"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
