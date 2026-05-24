import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useMoodStore, MOOD_OPTIONS } from '../../store/moodStore'
import type { MoodId, PeriodId } from '../../store/moodStore'

// ── Period config ─────────────────────────────────────────────────────────────

const PERIODS: Array<{
  id: PeriodId
  label: string
  abbr: string
  placeholderEmoji: string
}> = [
  { id: 'morning',   label: 'Manhã',  abbr: 'Man', placeholderEmoji: '🌅' },
  { id: 'afternoon', label: 'Tarde',  abbr: 'Tar', placeholderEmoji: '☀️' },
  { id: 'evening',   label: 'Noite',  abbr: 'Noi', placeholderEmoji: '🌙' },
]

function getCurrentPeriod(): PeriodId {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MoodBar() {
  const { records, alert, modalPeriod, addRecord, closeModal } = useMoodStore()

  const [openPeriod, setOpenPeriod] = useState<PeriodId | null>(null)
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null)
  const [note, setNote] = useState('')

  const todayKey = new Date().toDateString()

  // Respond to external open requests (e.g. from MoodReminder)
  useEffect(() => {
    if (modalPeriod !== null) {
      openFor(modalPeriod)
      closeModal()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalPeriod])

  function getTodayRecord(period: PeriodId) {
    return records.find(
      (r) => r.period === period && new Date(r.recorded_at).toDateString() === todayKey,
    )
  }

  function openFor(period: PeriodId) {
    const existing = getTodayRecord(period)
    setSelectedMood(existing?.mood ?? null)
    setNote(existing?.note ?? '')
    setOpenPeriod(period)
  }

  function close() {
    setOpenPeriod(null)
    setSelectedMood(null)
    setNote('')
  }

  function save() {
    if (!openPeriod || !selectedMood) return
    addRecord({ mood: selectedMood, period: openPeriod, note: note.trim() })
    close()
  }

  const currentPeriod = getCurrentPeriod()
  const periodInfo = PERIODS.find((p) => p.id === openPeriod)
  const selectedOption = MOOD_OPTIONS.find((o) => o.id === selectedMood)

  // Show alert dot if there's an active non-low alert
  const hasAlert = alert && !alert.dismissed && alert.severity !== 'low'

  return (
    <>
      {/* ── Slot buttons ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5" role="group" aria-label="Registros de humor de hoje">
        {PERIODS.map((p) => {
          const rec = getTodayRecord(p.id)
          const moodOpt = rec ? MOOD_OPTIONS.find((o) => o.id === rec.mood) : null
          const isCurrent = currentPeriod === p.id

          return (
            <button
              key={p.id}
              onClick={() => openFor(p.id)}
              title={`${p.label}${moodOpt ? ` — ${moodOpt.label}` : ' — Registrar humor'}`}
              className="flex flex-col items-center justify-center rounded-lg transition-all duration-150 select-none"
              style={{
                width: 42,
                height: 36,
                background: rec
                  ? '#7c3aed1a'
                  : isCurrent
                  ? '#ffffff08'
                  : 'transparent',
                border: `1px solid ${
                  rec
                    ? '#7c3aed40'
                    : isCurrent
                    ? '#ffffff14'
                    : '#ffffff0a'
                }`,
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>
                {moodOpt ? moodOpt.emoji : p.placeholderEmoji}
              </span>
              <span
                className="text-[9px] leading-none mt-0.5 font-medium"
                style={{ color: rec ? '#a78bfa' : '#374151' }}
              >
                {p.abbr}
              </span>
            </button>
          )
        })}

        {/* Alert indicator dot */}
        {hasAlert && (
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background:
                alert!.severity === 'crisis' ? '#a78bfa' :
                alert!.severity === 'high'   ? '#ef4444' :
                '#f59e0b',
            }}
          />
        )}
      </div>

      {/* ── Registration modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {openPeriod && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
              onClick={close}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 w-full"
              style={{
                top: 64,
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: 360,
              }}
            >
              <div
                className="rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: '#1a1a24', border: '1px solid #2a2a3e' }}
              >
                {/* Header */}
                <div
                  className="flex items-start justify-between px-5 py-4"
                  style={{ borderBottom: '1px solid #2a2a3e' }}
                >
                  <div>
                    <h2 className="text-sm font-semibold text-white">Como você está?</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {periodInfo?.label} ·{' '}
                      {new Date().toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={close}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors -mt-0.5 -mr-0.5"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Mood grid */}
                <div className="px-5 pt-4 pb-3">
                  <div className="grid grid-cols-2 gap-2">
                    {MOOD_OPTIONS.map((opt) => {
                      const isSelected = selectedMood === opt.id
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedMood(opt.id)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-100"
                          style={{
                            background: isSelected ? '#7c3aed22' : '#ffffff06',
                            border: `1px solid ${isSelected ? '#7c3aed55' : '#2a2a3e'}`,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                          <span
                            className="text-sm font-medium"
                            style={{ color: isSelected ? '#c4b5fd' : '#64748b' }}
                          >
                            {opt.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="px-5 pb-4">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Notas opcionais..."
                    rows={2}
                    maxLength={300}
                    className="w-full resize-none rounded-xl px-3 py-2 text-sm text-slate-300 placeholder-slate-600 outline-none transition-colors"
                    style={{ background: '#0f0f13', border: '1px solid #2a2a3e' }}
                  />
                </div>

                {/* Footer */}
                <div
                  className="px-5 py-3 flex justify-end gap-2"
                  style={{ borderTop: '1px solid #2a2a3e' }}
                >
                  <button
                    onClick={close}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={save}
                    disabled={!selectedMood}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: '#7c3aed', color: 'white' }}
                  >
                    {selectedOption ? (
                      <>
                        <span>{selectedOption.emoji}</span>
                        <span>Salvar</span>
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
