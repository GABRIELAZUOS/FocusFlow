import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Heart, Info } from 'lucide-react'
import { useMoodStore } from '../../store/moodStore'

// ── Severity config ───────────────────────────────────────────────────────────

const SEVERITY_CFG = {
  low: {
    bg: '#10b98110',
    border: '#10b98130',
    Icon: Info,
    iconColor: '#10b981',
    textColor: '#6ee7b7',
  },
  medium: {
    bg: '#f59e0b0e',
    border: '#f59e0b30',
    Icon: Info,
    iconColor: '#f59e0b',
    textColor: '#fcd34d',
  },
  high: {
    bg: '#ef44440e',
    border: '#ef444430',
    Icon: AlertTriangle,
    iconColor: '#ef4444',
    textColor: '#fca5a5',
  },
  crisis: {
    bg: '#7c3aed14',
    border: '#7c3aed44',
    Icon: Heart,
    iconColor: '#a78bfa',
    textColor: '#c4b5fd',
  },
} as const

// ── Component ─────────────────────────────────────────────────────────────────

export default function CrisisAlertBanner() {
  const { alert, dismissAlert } = useMoodStore()
  const [showResources, setShowResources] = useState(false)

  // Only render for medium / high / crisis
  if (!alert || alert.dismissed || alert.severity === 'low') return null

  const cfg = SEVERITY_CFG[alert.severity]
  const { Icon } = cfg

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex-shrink-0 overflow-hidden"
      style={{
        background: cfg.bg,
        borderBottom: `1px solid ${cfg.border}`,
      }}
    >
      <div className="px-4 py-2.5 flex items-start gap-3" style={{ marginLeft: 0 }}>
        <Icon size={14} style={{ color: cfg.iconColor }} className="flex-shrink-0 mt-px" />

        <div className="flex-1 min-w-0">
          <p className="text-xs leading-relaxed" style={{ color: cfg.textColor }}>
            {alert.message}
          </p>

          {alert.resources.length > 0 && (
            <>
              <AnimatePresence>
                {showResources && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 flex flex-wrap gap-2">
                      {alert.resources.map((r, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: cfg.border, color: cfg.textColor }}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setShowResources((v) => !v)}
                className="text-xs mt-1 underline underline-offset-2 hover:opacity-70 transition-opacity"
                style={{ color: cfg.textColor }}
              >
                {showResources ? 'Ocultar recursos' : 'Ver recursos de apoio'}
              </button>
            </>
          )}
        </div>

        <button
          onClick={dismissAlert}
          className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
          style={{ color: cfg.textColor }}
          aria-label="Fechar aviso"
        >
          <X size={12} />
        </button>
      </div>
    </motion.div>
  )
}
