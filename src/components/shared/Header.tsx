import { Plus } from 'lucide-react'
import MoodBar from '../mood/MoodBar'

interface HeaderProps {
  activeTask: string | null
  onQuickCapture: () => void
}

export default function Header({ activeTask, onQuickCapture }: HeaderProps) {
  return (
    <header
      className="flex-shrink-0 items-center px-4 z-20"
      style={{
        height: 56,
        background: '#16161f',
        borderBottom: '1px solid #2a2a3e',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: 8,
      }}
    >
      {/* Left: logo (mobile) + active task pill */}
      <div className="flex items-center gap-3 min-w-0">
        <img
          src="/logo.svg"
          alt="FocusFlow"
          className="sm:hidden flex-shrink-0"
          style={{ width: 36, height: 36 }}
        />

        {activeTask && (
          <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1 max-w-xs">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-emerald-400 text-xs font-medium truncate">{activeTask}</span>
          </div>
        )}
      </div>

      {/* Center: mood bar */}
      <MoodBar />

      {/* Right: quick capture */}
      <div className="flex items-center justify-end">
        <button
          onClick={onQuickCapture}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150"
          aria-label="Quick capture (Space)"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Capturar</span>
          <kbd className="hidden sm:inline-flex items-center justify-center bg-violet-700/60 text-violet-200 text-xs rounded px-1 leading-none h-4 min-w-[16px] font-mono">
            Space
          </kbd>
        </button>
      </div>
    </header>
  )
}
