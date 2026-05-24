import type { PomodoroMode } from '../../lib/supabase'
import { POMODORO_MODES } from '../../lib/utils'
import { usePomodoroStore } from '../../store/pomodoroStore'

interface ModeSelectorProps {
  mode: PomodoroMode
  onChange: (m: PomodoroMode) => void
  disabled?: boolean
}

const MODES = Object.entries(POMODORO_MODES) as [PomodoroMode, (typeof POMODORO_MODES)[PomodoroMode]][]

export default function ModeSelector({ mode, onChange, disabled = false }: ModeSelectorProps) {
  const { customFocus, customBreak, setCustomFocus, setCustomBreak } = usePomodoroStore()

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Mode tabs */}
      <div
        className="flex gap-1 rounded-xl p-1"
        style={{ backgroundColor: '#1a1a24' }}
      >
        {MODES.map(([key, cfg]) => {
          const isActive = mode === key
          return (
            <button
              key={key}
              onClick={() => !disabled && onChange(key)}
              disabled={disabled}
              className={[
                'flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs font-medium transition-all duration-200',
                isActive
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
                disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              <span className="text-base leading-none">{cfg.emoji}</span>
              <span className="leading-tight">{cfg.label}</span>
            </button>
          )
        })}
      </div>

      {/* Custom duration inputs */}
      {mode === 'custom' && (
        <div
          className="flex gap-4 items-center justify-center rounded-xl p-4"
          style={{ backgroundColor: '#16161f' }}
        >
          <div className="flex flex-col items-center gap-1">
            <label className="text-xs text-gray-400 font-medium">Foco (min)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={customFocus}
              disabled={disabled}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v > 0) setCustomFocus(v)
              }}
              className={[
                'w-20 text-center rounded-lg border border-white/10 bg-white/5 text-white font-mono text-lg py-1.5',
                'focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/40',
                disabled ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            />
          </div>
          <div className="text-gray-500 text-xl font-light mt-4">·</div>
          <div className="flex flex-col items-center gap-1">
            <label className="text-xs text-gray-400 font-medium">Pausa (min)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={customBreak}
              disabled={disabled}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v > 0) setCustomBreak(v)
              }}
              className={[
                'w-20 text-center rounded-lg border border-white/10 bg-white/5 text-white font-mono text-lg py-1.5',
                'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40',
                disabled ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            />
          </div>
        </div>
      )}
    </div>
  )
}
