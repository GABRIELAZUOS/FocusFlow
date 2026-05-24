import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Woop, WoopStatus, Task } from '../../lib/supabase'

interface WoopDetailProps {
  woop: Woop
  linkedTasks: Task[]
  onUpdate: (id: string, updates: Partial<Woop>) => void
  onBack: () => void
}

interface WoopField {
  letter: string
  label: string
  icon: string
  key: keyof Pick<Woop, 'wish' | 'outcome' | 'obstacle' | 'plan'>
  emptyText: string
  color: string
}

const WOOP_FIELDS: WoopField[] = [
  {
    letter: 'W',
    label: 'Desejo',
    icon: '✨',
    key: 'wish',
    emptyText: 'Nenhum desejo definido.',
    color: '#7c3aed',
  },
  {
    letter: 'O',
    label: 'Resultado',
    icon: '🎯',
    key: 'outcome',
    emptyText: 'Nenhum resultado definido.',
    color: '#10b981',
  },
  {
    letter: 'O',
    label: 'Obstáculo',
    icon: '🧱',
    key: 'obstacle',
    emptyText: 'Nenhum obstáculo definido.',
    color: '#f59e0b',
  },
  {
    letter: 'P',
    label: 'Plano',
    icon: '📋',
    key: 'plan',
    emptyText: 'Nenhum plano definido.',
    color: '#3b82f6',
  },
]

const STATUS_ACTIONS: { label: string; value: WoopStatus; classes: string }[] = [
  {
    label: 'Arquivar (Ativa)',
    value: 'active',
    classes: 'border border-violet-500/30 text-violet-400 hover:bg-violet-500/10',
  },
  {
    label: 'Concluir ✓',
    value: 'completed',
    classes: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
  {
    label: 'Abandonar',
    value: 'abandoned',
    classes: 'border border-red-500/30 text-red-400 hover:bg-red-500/10',
  },
]

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export default function WoopDetail({ woop, linkedTasks, onUpdate, onBack }: WoopDetailProps) {
  const [reflection, setReflection] = useState(woop.reflection || '')
  const [reflectionSaved, setReflectionSaved] = useState(false)

  const handleSaveReflection = () => {
    onUpdate(woop.id, { reflection })
    setReflectionSaved(true)
    setTimeout(() => setReflectionSaved(false), 2000)
  }

  const handleStatusChange = (status: WoopStatus) => {
    onUpdate(woop.id, { status, updated_at: new Date().toISOString() })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-5 max-w-2xl mx-auto"
    >
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Voltar
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white truncate">{woop.wish}</h2>
          <p className="text-xs text-gray-500">Criada em {formatDate(woop.created_at)}</p>
        </div>
      </div>

      {/* WOOP fields */}
      <div className="grid grid-cols-1 gap-3">
        {WOOP_FIELDS.map((field) => (
          <div
            key={field.key}
            className="rounded-xl p-4 space-y-1.5"
            style={{ backgroundColor: '#1a1a24', borderLeft: `3px solid ${field.color}` }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-md"
                style={{ backgroundColor: field.color + '22', color: field.color }}
              >
                {field.letter}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {field.icon} {field.label}
              </span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">
              {woop[field.key] || (
                <span className="text-gray-600 italic">{field.emptyText}</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Reflection */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: '#1a1a24' }}
      >
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span>💭</span> Reflexão
        </h3>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="Como está sendo o processo? O que você aprendeu?"
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-white/5 text-white text-sm px-3 py-2.5 resize-none placeholder:text-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
        />
        <button
          onClick={handleSaveReflection}
          className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
        >
          {reflectionSaved ? 'Salvo ✓' : 'Salvar reflexão'}
        </button>
      </div>

      {/* Linked tasks */}
      {linkedTasks.length > 0 && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ backgroundColor: '#1a1a24' }}
        >
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <span>📌</span> Tarefas vinculadas
            <span className="ml-auto text-xs text-gray-500">{linkedTasks.length}</span>
          </h3>
          <ul className="space-y-1.5">
            {linkedTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-2 text-sm text-gray-300 py-1.5 px-2 rounded-lg"
                style={{ backgroundColor: '#16161f' }}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.column === 'done' ? 'bg-emerald-500' : 'bg-violet-500'
                  }`}
                />
                <span className={task.column === 'done' ? 'line-through text-gray-500' : ''}>
                  {task.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Status actions */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: '#1a1a24' }}
      >
        <h3 className="text-sm font-semibold text-gray-300">Alterar status</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_ACTIONS.filter((a) => a.value !== woop.status).map((action) => (
            <button
              key={action.value}
              onClick={() => handleStatusChange(action.value)}
              className={`text-xs px-4 py-2 rounded-xl font-medium transition-colors ${action.classes}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
