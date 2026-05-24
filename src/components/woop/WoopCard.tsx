import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import type { Woop, WoopStatus } from '../../lib/supabase'

interface WoopCardProps {
  woop: Woop
  onSelect: (id: string) => void
  onStatusChange: (id: string, status: WoopStatus) => void
  onDelete: () => void
}

const STATUS_CONFIG: Record<WoopStatus, { label: string; classes: string }> = {
  active: {
    label: 'Ativa',
    classes: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  },
  completed: {
    label: 'Concluída',
    classes: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  },
  abandoned: {
    label: 'Abandonada',
    classes: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

function truncate(text: string | null, max = 60): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max) + '…' : text
}

export default function WoopCard({ woop, onSelect, onStatusChange, onDelete }: WoopCardProps) {
  const [hovered, setHovered] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const statusCfg = STATUS_CONFIG[woop.status]

  const preview = [woop.outcome, woop.obstacle]
    .filter(Boolean)
    .map((t) => truncate(t))
    .join(' · ')

  const allStatusOptions: { label: string; value: WoopStatus }[] = [
    { label: 'Arquivar / Ativa', value: 'active' },
    { label: 'Concluir', value: 'completed' },
    { label: 'Abandonar', value: 'abandoned' },
  ]
  const statusOptions = allStatusOptions.filter((o) => o.value !== woop.status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setStatusMenuOpen(false)
      }}
      className="relative rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200"
      style={{
        backgroundColor: '#1a1a24',
        border: hovered ? '1px solid #7c3aed88' : '1px solid transparent',
        boxShadow: hovered ? '0 0 0 1px #7c3aed44, 0 4px 24px #7c3aed22' : 'none',
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-white text-sm leading-snug line-clamp-2 flex-1">
          {woop.wish}
        </p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${statusCfg.classes}`}
        >
          {statusCfg.label}
        </span>
      </div>

      {/* Date */}
      <p className="text-xs text-gray-500">{formatDate(woop.created_at)}</p>

      {/* Preview */}
      {preview && (
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{preview}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/5">
        {confirmDelete ? (
          /* Inline delete confirmation — spans the full actions row */
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-slate-400 flex-1">Apagar este WOOP?</span>
            <button
              onClick={onDelete}
              className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors px-1"
            >
              Sim
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-1"
            >
              Não
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onSelect(woop.id)}
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors px-2 py-1 rounded-lg hover:bg-violet-500/10"
            >
              Ver detalhes →
            </button>

            <div className="flex items-center gap-0.5">
              {/* Status dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setStatusMenuOpen((prev) => !prev)
                  }}
                  className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
                >
                  Alterar
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </button>

                {statusMenuOpen && (
                  <div
                    className="absolute right-0 bottom-8 z-20 rounded-xl overflow-hidden shadow-2xl min-w-[140px]"
                    style={{ backgroundColor: '#16161f', border: '1px solid #2a2a3e' }}
                  >
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={(e) => {
                          e.stopPropagation()
                          onStatusChange(woop.id, opt.value)
                          setStatusMenuOpen(false)
                        }}
                        className="w-full text-left text-xs text-gray-300 hover:text-white hover:bg-white/5 px-3 py-2 transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmDelete(true)
                  setStatusMenuOpen(false)
                }}
                className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition-colors"
                aria-label="Apagar WOOP"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
