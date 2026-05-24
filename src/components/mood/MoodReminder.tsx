import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Smile } from 'lucide-react'
import { useMoodStore } from '../../store/moodStore'
import type { MoodRecord, PeriodId } from '../../store/moodStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

interface PeriodConfig {
  id: PeriodId
  label: string
  sessionKey: string
  hourStart: number
  hourEnd: number
}

const PERIOD_CONFIGS: PeriodConfig[] = [
  { id: 'morning',   label: 'manhã',  sessionKey: 'mood_toast_morning',   hourStart: 8,  hourEnd: 12 },
  { id: 'afternoon', label: 'tarde',  sessionKey: 'mood_toast_afternoon', hourStart: 13, hourEnd: 18 },
  { id: 'evening',   label: 'noite',  sessionKey: 'mood_toast_evening',   hourStart: 19, hourEnd: 23 },
]

function getUnregisteredDuePeriod(records: MoodRecord[]): PeriodConfig | null {
  const now = new Date()
  const todayKey = now.toDateString()
  const h = now.getHours()

  for (const cfg of PERIOD_CONFIGS) {
    if (h < cfg.hourStart || h > cfg.hourEnd) continue
    if (sessionStorage.getItem(cfg.sessionKey)) continue
    const alreadyDone = records.some(
      (r) => r.period === cfg.id && new Date(r.recorded_at).toDateString() === todayKey,
    )
    if (!alreadyDone) return cfg
  }
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MoodReminder() {
  const { records, openModal } = useMoodStore()
  const [pending, setPending] = useState<PeriodConfig | null>(null)

  useEffect(() => {
    function check() {
      setPending((prev) => {
        const next = getUnregisteredDuePeriod(records)
        // Only show if there's a new period to nudge about
        if (!next) return null
        if (prev?.id === next.id) return prev
        return next
      })
    }

    // Check immediately, then every 60 s
    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [records])

  function dismiss() {
    if (!pending) return
    sessionStorage.setItem(pending.sessionKey, '1')
    setPending(null)
  }

  function register() {
    if (!pending) return
    sessionStorage.setItem(pending.sessionKey, '1')
    openModal(pending.id)
    setPending(null)
  }

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="fixed z-50 flex items-start gap-3 rounded-2xl px-4 py-3 shadow-xl"
          style={{
            bottom: 24,
            right: 24,
            maxWidth: 300,
            background: '#1a1a24',
            border: '1px solid #2a2a3e',
          }}
        >
          <Smile size={16} className="text-violet-400 flex-shrink-0 mt-0.5" />

          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-300 leading-snug">
              Como está seu humor esta {pending.label}?
            </p>
            <button
              onClick={register}
              className="mt-2 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
            >
              Registrar agora
            </button>
          </div>

          <button
            onClick={dismiss}
            className="p-0.5 rounded text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
