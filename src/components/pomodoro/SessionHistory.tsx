import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { PomodoroSession } from '../../lib/supabase'
import { isSameDay } from '../../lib/utils'

interface SessionHistoryProps {
  sessions: PomodoroSession[]
  todaySessions: PomodoroSession[]
}

const DAY_LABELS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function getLast7Days(): Date[] {
  const days: Date[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    days.push(d)
  }
  return days
}

function computeStreak(sessions: PomodoroSession[]): number {
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 365; i++) {
    const day = new Date(today)
    day.setDate(day.getDate() - i)
    const dayEnd = new Date(day)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const hasSession = sessions.some(
      (s) => s.completed && new Date(s.started_at) >= day && new Date(s.started_at) < dayEnd
    )

    if (hasSession) {
      streak++
    } else if (i > 0) {
      // Allow today to not have a session yet without breaking streak
      break
    }
  }
  return streak
}

function computePersonalBest(sessions: PomodoroSession[]): number {
  const completed = sessions.filter((s) => s.completed)
  if (completed.length === 0) return 0

  // Group by day
  const byDay = new Map<string, number>()
  completed.forEach((s) => {
    const d = new Date(s.started_at)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    byDay.set(key, (byDay.get(key) || 0) + 1)
  })

  return Math.max(...byDay.values())
}

export default function SessionHistory({ sessions, todaySessions }: SessionHistoryProps) {
  const last7Days = useMemo(() => getLast7Days(), [])

  const completedToday = todaySessions.filter((s) => s.completed).length
  const streak = useMemo(() => computeStreak(sessions), [sessions])
  const personalBest = useMemo(() => computePersonalBest(sessions), [sessions])

  const weekCounts = useMemo(() => {
    return last7Days.map((day) => {
      const dayEnd = new Date(day)
      dayEnd.setDate(dayEnd.getDate() + 1)
      return sessions.filter(
        (s) => s.completed && new Date(s.started_at) >= day && new Date(s.started_at) < dayEnd
      ).length
    })
  }, [sessions, last7Days])

  const maxCount = Math.max(...weekCounts, 1)
  const BAR_MAX_HEIGHT = 80

  return (
    <div
      className="rounded-2xl p-5 space-y-5"
      style={{ backgroundColor: '#1a1a24' }}
    >
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        Histórico de sessões
      </h3>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="rounded-xl p-3 flex flex-col items-center gap-1"
          style={{ backgroundColor: '#16161f' }}
        >
          <span className="text-3xl font-bold text-white leading-none">
            {completedToday}
          </span>
          <span className="text-xs text-gray-400 text-center">🍅 hoje</span>
        </div>

        <div
          className="rounded-xl p-3 flex flex-col items-center gap-1"
          style={{ backgroundColor: '#16161f' }}
        >
          <span className="text-3xl font-bold text-violet-400 leading-none">
            {streak}
          </span>
          <span className="text-xs text-gray-400 text-center">🔥 sequência</span>
        </div>

        <div
          className="rounded-xl p-3 flex flex-col items-center gap-1"
          style={{ backgroundColor: '#16161f' }}
        >
          <span className="text-3xl font-bold text-emerald-400 leading-none">
            {personalBest}
          </span>
          <span className="text-xs text-gray-400 text-center">🏆 recorde</span>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div>
        <p className="text-xs text-gray-500 mb-3">Últimos 7 dias</p>
        <div className="flex items-end gap-2">
          {last7Days.map((day, i) => {
            const count = weekCounts[i]
            const barHeight = count === 0 ? 4 : Math.max(8, (count / maxCount) * BAR_MAX_HEIGHT)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 flex-1"
              >
                {/* Count label */}
                <span
                  className="text-xs font-medium"
                  style={{ color: count > 0 ? '#a78bfa' : 'transparent' }}
                >
                  {count > 0 ? count : '·'}
                </span>

                {/* Bar */}
                <div
                  className="w-full rounded-t-md overflow-hidden"
                  style={{
                    height: BAR_MAX_HEIGHT,
                    display: 'flex',
                    alignItems: 'flex-end',
                    backgroundColor: '#0f0f13',
                    borderRadius: 6,
                  }}
                >
                  <motion.div
                    className="w-full rounded-t-md"
                    style={{
                      backgroundColor: isToday ? '#7c3aed' : count > 0 ? '#5b21b6' : '#2a2a3e',
                      borderRadius: 6,
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: barHeight }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.06 }}
                  />
                </div>

                {/* Day label */}
                <span
                  className="text-xs font-medium"
                  style={{ color: isToday ? '#7c3aed' : '#6b7280' }}
                >
                  {DAY_LABELS_PT[day.getDay()]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
