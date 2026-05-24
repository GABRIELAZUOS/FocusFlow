import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WoopStatus, Task } from '../lib/supabase'
import { useWoopStore } from '../store/woopStore'
import { useKanbanStore } from '../store/kanbanStore'
import WoopCard from '../components/woop/WoopCard'
import WoopForm from '../components/woop/WoopForm'
import WoopDetail from '../components/woop/WoopDetail'

type FilterTab = 'all' | WoopStatus

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Ativas', value: 'active' },
  { label: 'Concluídas', value: 'completed' },
  { label: 'Abandonadas', value: 'abandoned' },
]

export default function WoopPage() {
  const { woops, addWoop, updateWoop, deleteWoop } = useWoopStore()
  const { tasks } = useKanbanStore()

  const [selectedWoopId, setSelectedWoopId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const handleCreate = (formData: { wish: string; outcome: string; obstacle: string; plan: string }) => {
    addWoop(formData)
    setShowForm(false)
  }

  const handleStatusChange = (id: string, status: WoopStatus) => updateWoop(id, { status })

  const selectedWoop = woops.find((w) => w.id === selectedWoopId) || null
  const linkedTasks: Task[] = selectedWoop ? tasks.filter((t) => t.woop_id === selectedWoop.id) : []

  const filteredWoops = woops.filter((w) => activeFilter === 'all' || w.status === activeFilter)
  const countByStatus = (s: WoopStatus) => woops.filter((w) => w.status === s).length

  // Detail view
  if (selectedWoopId && selectedWoop) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ backgroundColor: '#0f0f13' }}>
        <div className="max-w-2xl mx-auto">
          <WoopDetail woop={selectedWoop} linkedTasks={linkedTasks} onUpdate={updateWoop} onBack={() => setSelectedWoopId(null)} />
        </div>
      </div>
    )
  }

  // Form view
  if (showForm) {
    return (
      <div className="min-h-screen px-4 py-8" style={{ backgroundColor: '#0f0f13' }}>
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowForm(false)}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
              Cancelar
            </button>
            <h2 className="text-lg font-semibold text-white">Nova Meta WOOP</h2>
          </div>
          <WoopForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      </div>
    )
  }

  // List view
  return (
    <div className="min-h-screen px-4 py-8" style={{ backgroundColor: '#0f0f13' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              Suas Metas WOOP
              <span className="text-sm font-normal text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">{woops.length}</span>
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Desejo · Resultado · Obstáculo · Plano</p>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-lg shadow-violet-600/30 transition-colors whitespace-nowrap"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            Nova Meta
          </motion.button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: '#1a1a24' }}>
          {FILTER_TABS.map((tab) => {
            const count = tab.value === 'all' ? woops.length : countByStatus(tab.value as WoopStatus)
            const isActive = activeFilter === tab.value
            return (
              <button key={tab.value} onClick={() => setActiveFilter(tab.value)}
                className={['px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5',
                  isActive ? 'bg-violet-600 text-white shadow' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'].join(' ')}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Content */}
        {filteredWoops.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-4 text-center"
          >
            <span className="text-5xl">🎯</span>
            <div>
              <p className="text-gray-300 font-medium">
                {activeFilter === 'all' ? 'Nenhuma meta criada ainda'
                  : `Nenhuma meta ${activeFilter === 'active' ? 'ativa' : activeFilter === 'completed' ? 'concluída' : 'abandonada'}`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {activeFilter === 'all' ? 'Crie sua primeira meta WOOP para começar' : 'Mude o filtro para ver outras metas'}
              </p>
            </div>
            {activeFilter === 'all' && (
              <button onClick={() => setShowForm(true)}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
                Criar primeira meta
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredWoops.map((woop) => (
                <WoopCard
                  key={woop.id}
                  woop={woop}
                  onSelect={setSelectedWoopId}
                  onStatusChange={handleStatusChange}
                  onDelete={() => deleteWoop(woop.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
