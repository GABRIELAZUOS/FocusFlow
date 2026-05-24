import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePomodoroStore } from '../../store/pomodoroStore'
import { useSettingsStore } from '../../store/settingsStore'

// ─── Audio ────────────────────────────────────────────────────────────────────

/**
 * Schedules a single sine-wave tone via Web Audio API.
 * @param ctx   Shared AudioContext for this alert
 * @param freq  Frequency in Hz
 * @param vol   Peak gain (0–1)
 * @param start Seconds from ctx.currentTime to begin
 * @param dur   Tone duration in seconds
 */
function scheduleTone(
  ctx: AudioContext,
  freq: number,
  vol: number,
  start: number,
  dur: number,
) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, ctx.currentTime + start)
  gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
  osc.start(ctx.currentTime + start)
  osc.stop(ctx.currentTime + start + dur + 0.05)
}

function playAlert(type: '5min' | '1min') {
  if (!useSettingsStore.getState().soundEnabled) return
  try {
    const ctx = new AudioContext()
    if (type === '5min') {
      // Single soft chime at 600 Hz
      scheduleTone(ctx, 600, 0.12, 0, 0.28)
    } else {
      // Two-tone urgent ping at 880 Hz
      scheduleTone(ctx, 880, 0.14, 0,    0.14)
      scheduleTone(ctx, 880, 0.14, 0.22, 0.14)
    }
    // Close context once audio is done
    setTimeout(() => ctx.close(), type === '5min' ? 600 : 800)
  } catch {
    // Web Audio API unavailable — silently skip
  }
}

// ─── Toast state ──────────────────────────────────────────────────────────────

interface AlertItem {
  id: number
  message: string
}

let _counter = 0
const DISMISS_MS = 4_000

// ─── Component ────────────────────────────────────────────────────────────────

export default function PomodoroAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  // Track which alerts have already fired for the current focus session
  const firedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    function push(key: string, message: string, type: '5min' | '1min') {
      playAlert(type)
      firedRef.current.add(key)
      const id = ++_counter
      setAlerts((prev) => [...prev, { id, message }])
      setTimeout(
        () => setAlerts((prev) => prev.filter((a) => a.id !== id)),
        DISMISS_MS,
      )
    }

    const unsub = usePomodoroStore.subscribe((state, prev) => {
      // New focus session started — reset fired keys so alerts can fire again
      if (prev.phase !== 'focus' && state.phase === 'focus') {
        firedRef.current.clear()
        return
      }

      if (state.phase !== 'focus') return

      // 5-minute warning (fires when secondsLeft crosses from >300 to ≤300)
      if (
        !firedRef.current.has('5min') &&
        prev.secondsLeft > 300 &&
        state.secondsLeft <= 300
      ) {
        push('5min', '⏳ 5 minutos restantes. Prepare-se para pausar.', '5min')
      }

      // 1-minute warning (fires when secondsLeft crosses from >60 to ≤60)
      if (
        !firedRef.current.has('1min') &&
        prev.secondsLeft > 60 &&
        state.secondsLeft <= 60
      ) {
        push('1min', '⚠️ Último minuto. Vá terminando o que está fazendo.', '1min')
      }
    })

    return unsub
  }, [])

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none"
      style={{ width: 'min(440px, calc(100vw - 32px))' }}
    >
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full rounded-xl px-4 py-3 text-sm font-medium text-white shadow-2xl"
            style={{
              background: '#1a1a27',
              border: '1px solid rgba(124,58,237,0.55)',
              boxShadow: '0 8px 32px rgba(124,58,237,0.18), 0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            {alert.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
