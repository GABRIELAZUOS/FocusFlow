import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutGrid, CalendarDays, BookOpen, Target, Timer, Wind, Shield, BarChart2,
  Moon, Sun, Volume2, VolumeX, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

export type Tab = 'board' | 'agenda' | 'estudos' | 'woop' | 'focus' | 'anxiety' | 'coping' | 'stats'

interface SidebarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  /** Number of anxiety records awaiting a 24-h check-in (drives the badge). */
  pendingCheckIns?: number
  /** Number of study contents with pending reviews (drives the badge). */
  pendingStudies?: number
}

interface NavItem {
  id: Tab
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { id: 'board',   label: 'Board',         icon: LayoutGrid },
  { id: 'agenda',  label: 'Agenda',        icon: CalendarDays },
  { id: 'estudos', label: 'Estudos',       icon: BookOpen },
  { id: 'woop',    label: 'WOOP',          icon: Target },
  { id: 'focus',   label: 'Focus',         icon: Timer },
  { id: 'anxiety', label: 'Ansiedade',     icon: Wind },
  { id: 'coping',    label: 'Enfrentamento', icon: Shield },
  { id: 'stats',     label: 'Estatísticas', icon: BarChart2 },
]

const COLLAPSED_W = 64
const EXPANDED_W  = 220

export default function Sidebar({ activeTab, onTabChange, pendingCheckIns = 0, pendingStudies = 0 }: SidebarProps) {
  const { sidebarCollapsed, setSidebarCollapsed, darkMode, setDarkMode, soundEnabled, setSoundEnabled } =
    useSettingsStore()

  const [hovered, setHovered] = useState(false)

  const isExpanded = hovered || !sidebarCollapsed

  return (
    <motion.aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{ width: isExpanded ? EXPANDED_W : COLLAPSED_W }}
      transition={{ duration: 0.18, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full z-40 flex flex-col overflow-hidden flex-shrink-0"
      style={{
        background: '#16161f',
        borderRight: '1px solid #2a2a3e',
        boxShadow: isExpanded && hovered ? '4px 0 24px rgba(0,0,0,0.35)' : 'none',
      }}
    >
      {/* Logo row */}
      <div
        className="flex items-center h-14 px-3 flex-shrink-0 gap-2"
        style={{ borderBottom: '1px solid #2a2a3e' }}
      >
        <img
          src="/logo.svg"
          alt="FocusFlow"
          className="flex-shrink-0"
          style={{ width: 36, height: 36 }}
        />

        <motion.span
          animate={{ opacity: isExpanded ? 1 : 0, width: isExpanded ? 'auto' : 0 }}
          transition={{ duration: 0.12 }}
          className="font-bold text-white text-base tracking-tight overflow-hidden whitespace-nowrap flex-1"
        >
          FocusFlow
        </motion.span>

        <motion.button
          animate={{ opacity: isExpanded ? 1 : 0 }}
          transition={{ duration: 0.12 }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex-shrink-0 p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={sidebarCollapsed ? 'Pin sidebar open' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Fixar aberto' : 'Recolher'}
        >
          {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </motion.button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2 overflow-hidden">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive   = activeTab === id
          const badgeCount = id === 'anxiety' ? pendingCheckIns : id === 'estudos' ? pendingStudies : 0
          const hasBadge   = badgeCount > 0
          const badgeText  = badgeCount > 9 ? '9+' : String(badgeCount)

          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              title={!isExpanded ? label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={[
                // collapsed: fixed height + both-axis centering via flex
                // expanded:  left-aligned with padding
                'flex items-center rounded-xl transition-colors duration-150 w-full',
                isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center h-11',
                isActive
                  ? 'bg-violet-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/8',
              ].join(' ')}
            >
              {/* Icon — explicit w-5 h-5 box so all icons are same size and
                  the relative anchor for the badge is consistent */}
              <div className="relative flex items-center justify-center flex-shrink-0 w-5 h-5">
                <Icon size={20} />
                {hasBadge && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white font-bold leading-none"
                    style={{
                      background: '#ef4444',
                      fontSize: 9,
                      minWidth: 15,
                      height: 15,
                      padding: '0 3px',
                    }}
                  >
                    {badgeText}
                  </span>
                )}
              </div>

              {/* Label — no flex-1 so it never influences the icon's centroid
                  when width is animated to 0 in collapsed mode */}
              <motion.span
                animate={{ opacity: isExpanded ? 1 : 0, width: isExpanded ? 'auto' : 0 }}
                transition={{ duration: 0.12 }}
                className="text-sm font-medium whitespace-nowrap overflow-hidden text-left"
              >
                {label}
              </motion.span>

              {/* Badge count next to label (expanded only) */}
              {hasBadge && isExpanded && (
                <span
                  className="ml-auto flex-shrink-0 flex items-center justify-center rounded-full text-white font-bold leading-none"
                  style={{
                    background: '#ef4444',
                    fontSize: 9,
                    minWidth: 17,
                    height: 17,
                    padding: '0 4px',
                  }}
                >
                  {badgeText}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom controls */}
      <div
        className="flex-shrink-0 py-3 flex flex-col gap-0.5 px-2"
        style={{ borderTop: '1px solid #2a2a3e' }}
      >
        <button
          onClick={() => setDarkMode(!darkMode)}
          title={!isExpanded ? (darkMode ? 'Light mode' : 'Dark mode') : undefined}
          className={[
            'flex items-center rounded-xl transition-colors duration-150 text-zinc-400 hover:text-white hover:bg-white/8',
            isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-3',
          ].join(' ')}
        >
          {darkMode
            ? <Sun  size={20} className="flex-shrink-0" />
            : <Moon size={20} className="flex-shrink-0" />}
          <motion.span
            animate={{ opacity: isExpanded ? 1 : 0, width: isExpanded ? 'auto' : 0 }}
            transition={{ duration: 0.12 }}
            className="text-sm font-medium whitespace-nowrap overflow-hidden"
          >
            {darkMode ? 'Light mode' : 'Dark mode'}
          </motion.span>
        </button>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={!isExpanded ? (soundEnabled ? 'Mudo' : 'Som ativo') : undefined}
          className={[
            'flex items-center rounded-xl transition-colors duration-150 text-zinc-400 hover:text-white hover:bg-white/8',
            isExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center px-0 py-3',
          ].join(' ')}
        >
          {soundEnabled
            ? <Volume2  size={20} className="flex-shrink-0" />
            : <VolumeX  size={20} className="flex-shrink-0" />}
          <motion.span
            animate={{ opacity: isExpanded ? 1 : 0, width: isExpanded ? 'auto' : 0 }}
            transition={{ duration: 0.12 }}
            className="text-sm font-medium whitespace-nowrap overflow-hidden"
          >
            {soundEnabled ? 'Som ativado' : 'Som mudo'}
          </motion.span>
        </button>
      </div>
    </motion.aside>
  )
}
