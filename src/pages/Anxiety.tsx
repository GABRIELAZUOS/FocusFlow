import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ChevronLeft, Lightbulb, Clock, X, Shield } from 'lucide-react'
import { useAnxietyStore, getPendingCheckIns } from '../store/anxietyStore'
import type { AnxietyRecord } from '../store/anxietyStore'

// ─── Date helpers ──────────────────────────────────────────────────────────────

function dateKey(iso: string): string {
  return new Date(iso).toDateString()
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === today.toDateString()) return `hoje, ${time}`
  if (d.toDateString() === yesterday.toDateString()) return `ontem, ${time}`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + `, ${time}`
}

function formatDateChip(dk: string): string {
  const d = new Date(dk)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}

// ─── Intensity display ────────────────────────────────────────────────────────

function intensityColor(v: number): string {
  if (v <= 3) return '#10b981'
  if (v <= 6) return '#f59e0b'
  return '#ef4444'
}

function IntensityDots({ value, size = 7 }: { value: number; size?: number }) {
  const color = intensityColor(value)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="rounded-full flex-shrink-0"
          style={{ width: size, height: size, background: i < value ? color : '#2a2a3e' }}
        />
      ))}
    </div>
  )
}

function IntensityBadge({ value }: { value: number }) {
  const color = intensityColor(value)
  const bg = value <= 3 ? '#10b98118' : value <= 6 ? '#f59e0b18' : '#ef444418'
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold flex-shrink-0"
      style={{ color, background: bg }}
    >
      {value}/10
    </span>
  )
}

// ─── AnxietyCard ──────────────────────────────────────────────────────────────

interface CardProps {
  record: AnxietyRecord
  isArchived?: boolean
  isCheckIn?: boolean
  onArchive?: (id: string) => void
  onCheckIn?: (id: string, stillBothering: boolean) => void
}

function AnxietyCard({ record, isArchived, isCheckIn, onArchive, onCheckIn }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: isArchived ? '#16161f' : '#1a1a24',
        border: `1px solid ${isArchived ? '#1e1e2e' : '#2a2a3e'}`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">{formatTimestamp(record.created_at)}</span>
          <IntensityBadge value={record.intensity} />
        </div>
        {isArchived && record.archived_at && (
          <span className="text-xs text-slate-600">
            arquivado {formatTimestamp(record.archived_at)}
          </span>
        )}
      </div>

      {/* Content */}
      <p className={`text-sm leading-relaxed ${isArchived ? 'text-slate-500' : 'text-slate-200'}`}>
        {record.content}
      </p>

      {/* Possible solution */}
      {record.possible_solution && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2"
          style={{ background: '#ffffff07', border: '1px solid #ffffff08' }}
        >
          <Lightbulb size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-400 leading-relaxed">{record.possible_solution}</p>
        </div>
      )}

      {/* Intensity dots */}
      <IntensityDots value={record.intensity} size={6} />

      {/* Archive action (main view) */}
      {!isArchived && !isCheckIn && onArchive && (
        <div className="pt-0.5">
          <button
            onClick={() => onArchive(record.id)}
            className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
          >
            Isso já não me incomoda mais
          </button>
        </div>
      )}

      {/* Check-in actions */}
      {isCheckIn && onCheckIn && (
        <div className="pt-0.5">
          <div className="flex gap-2">
            <button
              onClick={() => onCheckIn(record.id, true)}
              className="flex-1 py-2 rounded-xl text-xs text-slate-300 border border-[#2a2a3e] hover:bg-white/5 transition-colors"
            >
              Ainda me incomoda
            </button>
            <button
              onClick={() => onCheckIn(record.id, false)}
              className="flex-1 py-2 rounded-xl text-xs text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
            >
              Já passou ✓
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Date-chip filter bar ─────────────────────────────────────────────────────

interface DateFilterProps {
  dates: string[]          // array of .toDateString() keys
  selected: string | null
  onChange: (dk: string | null) => void
}

function DateFilter({ dates, selected, onChange }: DateFilterProps) {
  if (dates.length <= 1) return null
  const chipCls = (active: boolean) =>
    [
      'text-xs px-3 py-1.5 rounded-full border transition-colors flex-shrink-0',
      active
        ? 'bg-violet-600 border-violet-500 text-white'
        : 'border-[#2a2a3e] text-slate-400 hover:border-violet-500/40 hover:text-slate-200 bg-transparent',
    ].join(' ')
  return (
    <div className="flex flex-wrap gap-2">
      <button className={chipCls(selected === null)} onClick={() => onChange(null)}>
        Todos
      </button>
      {dates.map((dk) => (
        <button
          key={dk}
          className={chipCls(selected === dk)}
          onClick={() => onChange(selected === dk ? null : dk)}
        >
          {formatDateChip(dk)}
        </button>
      ))}
    </div>
  )
}

// ─── AnxietyForm modal ────────────────────────────────────────────────────────

interface FormProps {
  open: boolean
  onClose: () => void
  onSave: (content: string, intensity: number, solution: string) => void
  onNavigateToCoping?: () => void
}

function AnxietyForm({ open, onClose, onSave, onNavigateToCoping }: FormProps) {
  const [content, setContent] = useState('')
  const [intensity, setIntensity] = useState(5)
  const [solution, setSolution] = useState('')
  const [wantsCoping, setWantsCoping] = useState(false)

  function reset() {
    setContent('')
    setIntensity(5)
    setSolution('')
    setWantsCoping(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSave() {
    if (!content.trim()) return
    onSave(content.trim(), intensity, solution.trim())
    const navigate = wantsCoping
    reset()
    onClose()
    if (navigate) {
      // Small delay so the modal exit animation completes before switching tabs
      setTimeout(() => onNavigateToCoping?.(), 200)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        // Single overlay: covers viewport, dims bg, centers modal via flex
        <motion.div
          key="af-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            key="af-modal"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full"
            style={{ maxWidth: 500 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-2xl shadow-2xl"
              style={{ background: '#1a1a24', border: '1px solid #2a2a3e' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <h2 className="text-white font-bold text-lg">Registrar ansiedade</h2>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-6 pb-6 flex flex-col gap-5">
                {/* Content */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400">
                    O que está te incomodando? <span className="text-violet-400">*</span>
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Descreva o que está sentindo..."
                    rows={3}
                    autoFocus
                    className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-3 resize-none focus:outline-none focus:border-violet-500/60 placeholder-slate-600 transition-colors"
                  />
                </div>

                {/* Intensity */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-400">Intensidade</label>
                    <IntensityBadge value={intensity} />
                  </div>
                  <div className="flex items-center justify-between gap-1" role="group" aria-label="Intensidade da ansiedade">
                    {Array.from({ length: 10 }, (_, i) => {
                      const v = i + 1
                      const selected = v <= intensity
                      const dotColor = v <= 3 ? '#10b981' : v <= 6 ? '#f59e0b' : '#ef4444'
                      return (
                        <motion.button
                          key={v}
                          type="button"
                          onClick={() => {
                            setIntensity(v)
                            if (v < 7) setWantsCoping(false)
                          }}
                          aria-label={`Intensidade ${v}`}
                          aria-pressed={v === intensity}
                          whileTap={{ scale: 0.88 }}
                          animate={{
                            background: selected ? dotColor : '#2a2a3e',
                            boxShadow: v === intensity ? `0 0 0 3px ${dotColor}44` : 'none',
                          }}
                          transition={{ duration: 0.15 }}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            border: `2px solid ${selected ? dotColor : '#3a3a4e'}`,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        />
                      )
                    })}
                  </div>

                  {/* High-intensity coping suggestion */}
                  <AnimatePresence>
                    {intensity >= 7 && (
                      <motion.div
                        key="coping-hint"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="mt-1 rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                          style={{ background: '#7c3aed10', border: '1px solid #7c3aed28' }}
                        >
                          <Shield size={13} className="text-violet-400 flex-shrink-0" />
                          <p className="text-xs text-slate-400 flex-1 leading-relaxed">
                            Intensidade alta. Quer abrir um cartão de enfrentamento depois de salvar?
                          </p>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setWantsCoping(false)}
                              className={[
                                'text-xs px-2.5 py-1 rounded-lg transition-colors',
                                !wantsCoping
                                  ? 'bg-white/10 text-white'
                                  : 'text-slate-500 hover:text-slate-300',
                              ].join(' ')}
                            >
                              Não
                            </button>
                            <button
                              type="button"
                              onClick={() => setWantsCoping(true)}
                              className={[
                                'text-xs px-2.5 py-1 rounded-lg transition-colors',
                                wantsCoping
                                  ? 'bg-violet-600 text-white'
                                  : 'text-slate-500 hover:text-violet-400',
                              ].join(' ')}
                            >
                              Sim
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Solution */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400">
                    Possível solução{' '}
                    <span className="text-slate-600 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    placeholder="O que você acha que pode resolver isso?"
                    rows={2}
                    className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-3 resize-none focus:outline-none focus:border-violet-500/60 placeholder-slate-600 transition-colors"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={!content.trim()}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  Salvar registro
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-14 text-center"
    >
      <p className="text-slate-600 text-sm">{message}</p>
      {sub && <p className="text-slate-700 text-xs mt-1">{sub}</p>}
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type View = 'today' | 'history' | 'archived'

interface AnxietyProps {
  onNavigateToCoping?: () => void
}

export default function Anxiety({ onNavigateToCoping }: AnxietyProps) {
  const { records, addRecord, archiveRecord, answerCheckIn } = useAnxietyStore()
  const [view, setView] = useState<View>('today')
  const [showForm, setShowForm] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<string | null>(null)
  const [archiveFilter, setArchiveFilter] = useState<string | null>(null)

  const todayKey = new Date().toDateString()

  const pendingCheckIns = useMemo(() => getPendingCheckIns(records), [records])

  // Today's active records that are NOT pending a check-in
  const todayActive = useMemo(
    () =>
      records
        .filter(
          (r) =>
            r.status === 'active' &&
            dateKey(r.created_at) === todayKey &&
            !pendingCheckIns.some((p) => p.id === r.id)
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [records, todayKey, pendingCheckIns]
  )

  // Previous days — active, not today, not pending check-in (pending check-ins surfaced above)
  const historyRecords = useMemo(
    () =>
      records
        .filter(
          (r) =>
            r.status === 'active' &&
            dateKey(r.created_at) !== todayKey &&
            !pendingCheckIns.some((p) => p.id === r.id)
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [records, todayKey, pendingCheckIns]
  )

  const archivedRecords = useMemo(
    () =>
      records
        .filter((r) => r.status === 'archived')
        .sort(
          (a, b) =>
            new Date(b.archived_at ?? b.created_at).getTime() -
            new Date(a.archived_at ?? a.created_at).getTime()
        ),
    [records]
  )

  // Unique date keys for filter chips
  const historyDates = useMemo(() => {
    const keys = [...new Set(historyRecords.map((r) => dateKey(r.created_at)))]
    return keys.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  }, [historyRecords])

  const archiveDates = useMemo(() => {
    const keys = [
      ...new Set(
        archivedRecords.map((r) =>
          r.archived_at ? dateKey(r.archived_at) : dateKey(r.created_at)
        )
      ),
    ]
    return keys.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  }, [archivedRecords])

  const filteredHistory = historyFilter
    ? historyRecords.filter((r) => dateKey(r.created_at) === historyFilter)
    : historyRecords

  const filteredArchive = archiveFilter
    ? archivedRecords.filter((r) =>
        (r.archived_at ? dateKey(r.archived_at) : dateKey(r.created_at)) === archiveFilter
      )
    : archivedRecords

  function handleSave(content: string, intensity: number, solution: string) {
    addRecord(content, intensity, solution || null)
  }

  return (
    <div className="min-h-full flex flex-col" style={{ background: '#0f0f13' }}>
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Ansiedade</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registre e acompanhe o que está te incomodando
          </p>
        </div>

        {view === 'today' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setHistoryFilter(null); setView('history') }}
              className="text-xs text-slate-400 hover:text-slate-200 border border-[#2a2a3e] hover:border-slate-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Ver registros anteriores
            </button>
            <button
              onClick={() => { setArchiveFilter(null); setView('archived') }}
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              Arquivados
            </button>
          </div>
        )}

        {view !== 'today' && (
          <button
            onClick={() => setView('today')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={14} />
            Voltar
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-24 w-full max-w-2xl mx-auto space-y-4">

        {/* ── TODAY ─────────────────────────────────────────────────────── */}
        {view === 'today' && (
          <>
            {/* Pending check-ins */}
            <AnimatePresence>
              {pendingCheckIns.length > 0 && (
                <motion.div
                  key="checkin-section"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl p-4 space-y-3"
                  style={{ background: '#1c1a2e', border: '1px solid #7c3aed33' }}
                >
                  <div className="flex items-center gap-2">
                    <Clock size={13} className="text-violet-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-violet-300">Revisão de 24h</span>
                    <span className="text-xs text-violet-500">
                      · {pendingCheckIns.length}{' '}
                      {pendingCheckIns.length === 1 ? 'registro' : 'registros'} para revisar
                    </span>
                  </div>
                  <AnimatePresence mode="popLayout">
                    {pendingCheckIns.map((r) => (
                      <AnxietyCard
                        key={r.id}
                        record={r}
                        isCheckIn
                        onCheckIn={answerCheckIn}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Today's records */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Hoje</p>
              <AnimatePresence mode="popLayout">
                {todayActive.length === 0 ? (
                  <EmptyState
                    message="Nenhuma ansiedade registrada hoje."
                    sub="Que bom! Se surgir algo, registre aqui."
                  />
                ) : (
                  todayActive.map((r) => (
                    <AnxietyCard key={r.id} record={r} onArchive={archiveRecord} />
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Inline add button */}
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm text-slate-500 hover:text-violet-400 border border-dashed border-[#2a2a3e] hover:border-violet-500/50 transition-colors"
            >
              <Plus size={14} />
              Registrar ansiedade
            </button>
          </>
        )}

        {/* ── HISTORY ───────────────────────────────────────────────────── */}
        {view === 'history' && (
          <>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Registros anteriores
            </p>

            <DateFilter
              dates={historyDates}
              selected={historyFilter}
              onChange={setHistoryFilter}
            />

            <AnimatePresence mode="popLayout">
              {filteredHistory.length === 0 ? (
                <EmptyState message="Nenhum registro anterior ainda." />
              ) : (
                filteredHistory.map((r) => (
                  <AnxietyCard key={r.id} record={r} onArchive={archiveRecord} />
                ))
              )}
            </AnimatePresence>
          </>
        )}

        {/* ── ARCHIVED ──────────────────────────────────────────────────── */}
        {view === 'archived' && (
          <>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Registros arquivados
            </p>

            <DateFilter
              dates={archiveDates}
              selected={archiveFilter}
              onChange={setArchiveFilter}
            />

            <AnimatePresence mode="popLayout">
              {filteredArchive.length === 0 ? (
                <EmptyState message="Nenhum registro arquivado ainda." />
              ) : (
                filteredArchive.map((r) => (
                  <AnxietyCard key={r.id} record={r} isArchived />
                ))
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Floating add button — today view only */}
      <AnimatePresence>
        {view === 'today' && (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setShowForm(true)}
            aria-label="Registrar ansiedade"
            className="fixed bottom-6 right-6 z-30 flex items-center justify-center rounded-2xl shadow-2xl"
            style={{
              width: 52,
              height: 52,
              background: '#7c3aed',
              boxShadow: '0 8px 32px rgba(124,58,237,0.45)',
            }}
          >
            <Plus size={22} className="text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnxietyForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        onNavigateToCoping={onNavigateToCoping}
      />
    </div>
  )
}
