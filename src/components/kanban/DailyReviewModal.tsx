import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Circle, X } from 'lucide-react'
import type { Task } from '../../lib/supabase'

interface DailyReviewModalProps {
  open: boolean
  onClose: () => void
  inboxTasks: Task[]
  brainDumpTasks: Task[]
  onMoveToToday: (id: string) => void
  todayCount: number
}

const MAX_SELECTION = 3

export default function DailyReviewModal({
  open,
  onClose,
  inboxTasks,
  brainDumpTasks,
  onMoveToToday,
  todayCount,
}: DailyReviewModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const availableSlots = Math.max(0, MAX_SELECTION - todayCount)

  const allCandidates = [...inboxTasks, ...brainDumpTasks]
  const hasInbox      = inboxTasks.length > 0
  const hasBrainDump  = brainDumpTasks.length > 0
  const showSections  = hasInbox && hasBrainDump

  // Reset selection when modal opens
  useEffect(() => {
    if (open) setSelected(new Set())
  }, [open])

  function toggleTask(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < availableSlots) {
        next.add(id)
      }
      return next
    })
  }

  function handleConfirm() {
    selected.forEach((id) => onMoveToToday(id))
    onClose()
  }

  const isOverLimit = selected.size > availableSlots

  function renderTask(task: Task) {
    const isSelected = selected.has(task.id)
    const isDisabled = !isSelected && selected.size >= availableSlots

    return (
      <motion.button
        key={task.id}
        onClick={() => toggleTask(task.id)}
        disabled={isDisabled}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
          isSelected
            ? 'bg-violet-600/20 border border-violet-500/50'
            : isDisabled
            ? 'border border-[#2a2a3e] opacity-40 cursor-not-allowed'
            : 'border border-[#2a2a3e] hover:border-violet-500/30 hover:bg-white/5'
        }`}
      >
        {/* Checkbox icon */}
        <div className="flex-shrink-0">
          {isSelected ? (
            <CheckCircle2 size={18} className="text-violet-400" />
          ) : (
            <Circle size={18} className="text-slate-600" />
          )}
        </div>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
            {task.title}
          </p>
          {(task.energy_level || task.estimated_time) && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {task.energy_level && (
                <span className="text-xs text-slate-500">
                  {task.energy_level === 'high' ? '🔴' : task.energy_level === 'medium' ? '🟡' : '🟢'}
                </span>
              )}
              {task.estimated_time && (
                <span className="text-xs text-slate-500">{task.estimated_time}</span>
              )}
            </div>
          )}
        </div>

        {/* Color dot */}
        {task.category_color && (
          <div
            className="flex-shrink-0 rounded-full"
            style={{ width: 8, height: 8, background: task.category_color }}
          />
        )}
      </motion.button>
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="daily-review-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="daily-review-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Revisão diária"
            initial={{ opacity: 0, scale: 0.94, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 px-4"
            style={{ maxWidth: 480 }}
          >
            <div
              className="rounded-2xl shadow-2xl overflow-hidden"
              style={{ background: '#1a1a24', border: '1px solid #2a2a3e' }}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="text-white font-bold text-xl leading-snug">
                    Bom dia! 🌅 O que é mais importante hoje?
                  </h2>
                  <button
                    onClick={onClose}
                    className="ml-3 flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Fechar"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-slate-400 text-sm">
                  Escolha até {availableSlots} tarefa{availableSlots !== 1 ? 's' : ''} para focar.{' '}
                  <span className="text-slate-300 font-medium">Só {MAX_SELECTION}.</span>
                </p>

                {/* Counter pill */}
                <div
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 border text-xs font-medium"
                  style={{
                    background: selected.size >= availableSlots ? '#7c3aed22' : '#ffffff0a',
                    borderColor: selected.size >= availableSlots ? '#7c3aed66' : '#2a2a3e',
                    color: selected.size >= availableSlots ? '#a78bfa' : '#94a3b8',
                  }}
                >
                  <span>{selected.size}/{availableSlots} selecionada{selected.size !== 1 ? 's' : ''}</span>
                  {todayCount > 0 && (
                    <span className="text-slate-500">· {todayCount} já em "Hoje"</span>
                  )}
                </div>
              </div>

              {/* Task list */}
              <div className="px-4 overflow-y-auto" style={{ maxHeight: 360 }}>
                {allCandidates.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-sm">
                    Nenhuma tarefa na Entrada ou Brain Dump ainda.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 pb-2">
                    {/* ── Inbox section ── */}
                    {hasInbox && (
                      <>
                        {showSections && (
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 pt-1 pb-0.5">
                            📥 Entrada
                          </p>
                        )}
                        {inboxTasks.map(renderTask)}
                      </>
                    )}

                    {/* ── Divider between sections ── */}
                    {showSections && (
                      <div className="border-t border-[#2a2a3e] my-1" />
                    )}

                    {/* ── Brain Dump section ── */}
                    {hasBrainDump && (
                      <>
                        {showSections && (
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 pb-0.5">
                            🧠 Brain Dump
                          </p>
                        )}
                        {brainDumpTasks.map(renderTask)}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 flex items-center justify-between border-t border-[#2a2a3e]">
                <button
                  onClick={onClose}
                  className="text-sm text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
                >
                  Pular por hoje
                </button>

                <button
                  onClick={handleConfirm}
                  disabled={selected.size === 0 || isOverLimit}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  Confirmar ({selected.size})
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
