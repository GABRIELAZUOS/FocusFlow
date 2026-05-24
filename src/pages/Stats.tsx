import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Timer, Wind, Flame } from 'lucide-react'
import { useKanbanStore } from '../store/kanbanStore'
import { usePomodoroStore } from '../store/pomodoroStore'
import { useAnxietyStore } from '../store/anxietyStore'
import { useMoodStore, MOOD_OPTIONS } from '../store/moodStore'
import type { Task } from '../lib/supabase'
import type { PomodoroSession } from '../lib/supabase'

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DAY_ABBR: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
}
const WEEK_ABBR = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

function dKey(d: Date | string): string {
  return new Date(d).toDateString()
}

/** Mon → Sun of the current calendar week */
function getCurrentWeekDays(): Date[] {
  const today = new Date()
  const dow = today.getDay() // 0 = Sun
  const daysFromMon = dow === 0 ? 6 : dow - 1
  const monday = new Date(today)
  monday.setDate(today.getDate() - daysFromMon)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

/** Rolling window: today and the 6 days before it */
function getLast7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    return d
  })
}

/** Current streak + all-time record (task done or pomodoro completed = active day) */
function computeStreak(tasks: Task[], sessions: PomodoroSession[]) {
  const active = new Set<string>()
  tasks.filter((t) => t.column === 'done' && t.completed_at).forEach((t) =>
    active.add(dKey(t.completed_at!))
  )
  sessions.filter((s) => s.completed).forEach((s) => active.add(dKey(s.started_at)))

  // Current streak: walk backwards from today; skip today if not yet active
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let cur = 0
  const cursor = new Date(today)
  if (!active.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
  while (active.has(cursor.toDateString())) {
    cur++
    cursor.setDate(cursor.getDate() - 1)
  }

  // All-time record: longest consecutive run in sorted active dates
  const sorted = [...active]
    .map((s) => { const d = new Date(s); d.setHours(12, 0, 0, 0); return d })
    .sort((a, b) => a.getTime() - b.getTime())

  let rec = 0
  let run = 0
  sorted.forEach((date, i) => {
    if (i === 0) {
      run = 1
    } else {
      const diffDays = Math.round((date.getTime() - sorted[i - 1].getTime()) / 86_400_000)
      run = diffDays === 1 ? run + 1 : 1
    }
    rec = Math.max(rec, run)
  })

  return { current: cur, record: Math.max(rec, cur) }
}

function anxietyColor(avg: number): { text: string; bg: string } {
  if (avg < 4) return { text: '#10b981', bg: '#10b98118' }
  if (avg <= 6) return { text: '#f59e0b', bg: '#f59e0b18' }
  return { text: '#ef4444', bg: '#ef444418' }
}

// ─── Bar chart (flex divs, no library) ───────────────────────────────────────

interface BarDatum {
  label: string
  value: number
  isToday: boolean
}

function BarChart({ data }: { data: BarDatum[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const CHART_H = 80

  return (
    <div className="flex items-end gap-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center flex-1 min-w-0" style={{ gap: 3 }}>
          {/* Value label above bar */}
          <span
            className="text-xs text-slate-500 tabular-nums leading-none"
            style={{ minHeight: 14 }}
          >
            {d.value > 0 ? d.value : ''}
          </span>

          {/* Bar container */}
          <div style={{ height: CHART_H }} className="w-full flex items-end">
            <motion.div
              initial={{ height: 0 }}
              animate={{
                height: d.value > 0 ? Math.max((d.value / max) * CHART_H, 6) : 2,
              }}
              transition={{ duration: 0.45, delay: i * 0.04, ease: 'easeOut' }}
              className="w-full rounded-t"
              style={{
                background: d.isToday
                  ? '#7c3aed'
                  : d.value > 0
                  ? '#2a2a3e'
                  : '#1e1e2e',
                boxShadow: d.isToday && d.value > 0 ? '0 0 10px #7c3aed55' : 'none',
              }}
            />
          </div>

          {/* Day label */}
          <span
            className="text-xs leading-none truncate"
            style={{
              color: d.isToday ? '#a78bfa' : '#475569',
              fontWeight: d.isToday ? 600 : 400,
            }}
          >
            {d.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: '#1a1a24', border: '1px solid #2a2a3e' }}
    >
      {children}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Stats() {
  const { tasks }           = useKanbanStore()
  const { allSessions }     = usePomodoroStore()
  const { records: anxietyRecords } = useAnxietyStore()
  const { records: moodRecords }    = useMoodStore()

  const s = useMemo(() => {
    const todayKey  = new Date().toDateString()
    const weekDays  = getCurrentWeekDays()
    const last7Days = getLast7Days()

    // ── Today ──────────────────────────────────────────────────────────────
    const tasksDoneToday = tasks.filter(
      (t) => t.column === 'done' && t.completed_at && dKey(t.completed_at) === todayKey
    ).length

    const pomodorosDoneToday = allSessions.filter(
      (s) => s.completed && dKey(s.started_at) === todayKey
    ).length

    // ── Streak ─────────────────────────────────────────────────────────────
    const { current: streak, record: streakRecord } = computeStreak(tasks, allSessions)

    // ── Pomodoros this week (Mon–Sun) ───────────────────────────────────────
    const pomodoroWeekData: BarDatum[] = weekDays.map((day, i) => ({
      label: WEEK_ABBR[i],
      value: allSessions.filter(
        (s) => s.completed && dKey(s.started_at) === dKey(day)
      ).length,
      isToday: dKey(day) === todayKey,
    }))

    // ── Tasks last 7 days ───────────────────────────────────────────────────
    const tasksLast7Data: BarDatum[] = last7Days.map((day) => ({
      label: DAY_ABBR[day.getDay()],
      value: tasks.filter(
        (t) => t.column === 'done' && t.completed_at && dKey(t.completed_at) === dKey(day)
      ).length,
      isToday: dKey(day) === todayKey,
    }))

    // ── Anxiety average this week ───────────────────────────────────────────
    const weekStart = weekDays[0]
    const weekEnd   = new Date(weekDays[6].getTime() + 86_400_000)
    const anxietyThisWeek = anxietyRecords.filter((r) => {
      const d = new Date(r.created_at)
      return d >= weekStart && d < weekEnd
    })
    const anxietyAvg =
      anxietyThisWeek.length > 0
        ? +(
            anxietyThisWeek.reduce((sum, r) => sum + r.intensity, 0) /
            anxietyThisWeek.length
          ).toFixed(1)
        : null

    // ── All-time totals ─────────────────────────────────────────────────────
    const totalTasks     = tasks.filter((t) => t.column === 'done').length
    const totalPomodoros = allSessions.filter((s) => s.completed).length
    const totalAnxiety   = anxietyRecords.length

    // ── Mood: last 7 days ───────────────────────────────────────────────────
    // One cell per day: use the most recent record of that day
    const moodLast7 = last7Days.map((day) => {
      const dayKey = day.toDateString()
      const dayRecs = moodRecords
        .filter((r) => new Date(r.recorded_at).toDateString() === dayKey)
        .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
      const rec = dayRecs[0] ?? null
      const opt = rec ? MOOD_OPTIONS.find((o) => o.id === rec.mood) ?? null : null
      return { day, opt, isToday: dayKey === todayKey }
    })

    // Most frequent mood across last 7 days
    const moodFreq: Record<string, number> = {}
    moodLast7.forEach(({ opt }) => {
      if (opt) moodFreq[opt.id] = (moodFreq[opt.id] ?? 0) + 1
    })
    const topMoodId = Object.entries(moodFreq).sort((a, b) => b[1] - a[1])[0]?.[0]
    const topMoodOpt = topMoodId ? MOOD_OPTIONS.find((o) => o.id === topMoodId) ?? null : null

    // Correlation: days with ≥2 pomodoros vs <2, compare average mood valence
    type DayStats = { pomCount: number; valence: number | null }
    const dayStats: DayStats[] = last7Days.map((day) => {
      const dayKey = day.toDateString()
      const pomCount = allSessions.filter((s) => s.completed && dKey(s.started_at) === dayKey).length
      const dayMoods = moodRecords.filter((r) => new Date(r.recorded_at).toDateString() === dayKey)
      const valence =
        dayMoods.length > 0
          ? dayMoods.reduce(
              (sum, r) => sum + (MOOD_OPTIONS.find((o) => o.id === r.mood)?.valence ?? 0),
              0,
            ) / dayMoods.length
          : null
      return { pomCount, valence }
    })
    const withMood = dayStats.filter((d) => d.valence !== null)
    const productiveDays = withMood.filter((d) => d.pomCount >= 2)
    const unproductiveDays = withMood.filter((d) => d.pomCount < 2)
    let correlationInsight: string | null = null
    if (productiveDays.length >= 2 && unproductiveDays.length >= 2) {
      const avgProd   = productiveDays.reduce((s, d) => s + d.valence!, 0) / productiveDays.length
      const avgUnprod = unproductiveDays.reduce((s, d) => s + d.valence!, 0) / unproductiveDays.length
      const diff = avgProd - avgUnprod
      if (diff > 0.3)  correlationInsight = 'Nos dias com mais sessões de foco, seu humor foi melhor.'
      else if (diff < -0.3) correlationInsight = 'Seu humor tende a ser melhor nos dias mais tranquilos.'
    }

    const totalMoodRecords = moodRecords.length

    return {
      tasksDoneToday, pomodorosDoneToday,
      streak, streakRecord,
      pomodoroWeekData, tasksLast7Data,
      anxietyAvg, anxietyCount: anxietyThisWeek.length,
      totalTasks, totalPomodoros, totalAnxiety,
      moodLast7, topMoodOpt, correlationInsight, totalMoodRecords,
    }
  }, [tasks, allSessions, anxietyRecords, moodRecords])

  const avgColors = s.anxietyAvg !== null ? anxietyColor(s.anxietyAvg) : null

  // Staggered fade-in for each section
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  }
  const section = {
    hidden: { opacity: 0, y: 10 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.28 } },
  }

  return (
    <div className="min-h-full" style={{ background: '#0f0f13' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">Estatísticas</h1>
        <p className="text-sm text-slate-500 mt-0.5">Seu progresso em todos os módulos</p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="px-6 pb-12 max-w-3xl mx-auto flex flex-col gap-4"
      >

        {/* ── TODAY ─────────────────────────────────────────────────────────── */}
        <motion.div variants={section}>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Hoje</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { icon: CheckCircle2, label: 'Tarefas concluídas', value: s.tasksDoneToday,    accent: '#7c3aed' },
              { icon: Timer,        label: 'Pomodoros',          value: s.pomodorosDoneToday, accent: '#7c3aed' },
            ] as const).map(({ icon: Icon, label, value, accent }) => (
              <Card key={label} className="p-4 flex flex-col gap-2">
                <Icon size={16} style={{ color: accent }} />
                <p className="text-3xl font-bold text-white tabular-nums leading-none">{value}</p>
                <p className="text-xs text-slate-500 leading-snug">{label}</p>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* ── STREAK + ANXIETY ──────────────────────────────────────────────── */}
        <motion.div variants={section} className="grid grid-cols-2 gap-3">

          {/* Streak */}
          <div
            className="rounded-2xl p-5 flex flex-col items-center justify-center text-center"
            style={{ background: '#1a1a24', border: '1px solid #f59e0b33' }}
          >
            <Flame size={22} className="text-amber-400 mb-2 flex-shrink-0" />
            {s.streak > 0 ? (
              <>
                <p className="text-4xl font-bold text-amber-400 tabular-nums leading-none">{s.streak}</p>
                <p className="text-xs text-slate-400 mt-1.5">dias seguidos</p>
                {s.streakRecord > s.streak && (
                  <p className="text-xs text-slate-600 mt-2">
                    Recorde: {s.streakRecord} {s.streakRecord === 1 ? 'dia' : 'dias'}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-base font-bold text-amber-500 mt-1">Comece hoje!</p>
                <p className="text-xs text-slate-600 mt-1">Nenhuma sequência ativa</p>
                {s.streakRecord > 0 && (
                  <p className="text-xs text-slate-700 mt-2">
                    Recorde: {s.streakRecord} {s.streakRecord === 1 ? 'dia' : 'dias'}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Anxiety average */}
          <Card className="p-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              <Wind size={13} className="text-slate-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-slate-500">Ansiedade esta semana</p>
            </div>
            {avgColors && s.anxietyAvg !== null ? (
              <>
                <span
                  className="text-3xl font-bold tabular-nums self-start px-3 py-1 rounded-xl leading-snug"
                  style={{ color: avgColors.text, background: avgColors.bg }}
                >
                  {s.anxietyAvg}
                </span>
                <p className="text-xs text-slate-600 mt-2">
                  média · {s.anxietyCount} {s.anxietyCount === 1 ? 'registro' : 'registros'}
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-600">Nenhum registro esta semana</p>
            )}
          </Card>
        </motion.div>

        {/* ── POMODORO CHART (this week) ─────────────────────────────────────── */}
        <motion.div variants={section}>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <Timer size={14} className="text-slate-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-slate-300">Pomodoros esta semana</p>
            </div>
            <BarChart data={s.pomodoroWeekData} />
          </Card>
        </motion.div>

        {/* ── TASKS CHART (last 7 days) ──────────────────────────────────────── */}
        <motion.div variants={section}>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle2 size={14} className="text-slate-500 flex-shrink-0" />
              <p className="text-sm font-semibold text-slate-300">Tarefas concluídas — últimos 7 dias</p>
            </div>
            <BarChart data={s.tasksLast7Data} />
          </Card>
        </motion.div>

        {/* ── HUMOR (last 7 days) ────────────────────────────────────────────── */}
        <motion.div variants={section}>
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-300 mb-4">Humor — últimos 7 dias</p>

            {/* 7-day emoji row */}
            <div className="flex items-end gap-1.5 mb-4">
              {s.moodLast7.map(({ day, opt, isToday }, i) => (
                <div key={i} className="flex flex-col items-center flex-1 min-w-0 gap-1">
                  <div
                    className="w-full flex items-center justify-center rounded-xl"
                    style={{
                      height: 38,
                      background: opt
                        ? isToday
                          ? '#7c3aed22'
                          : '#ffffff08'
                        : '#ffffff04',
                      border: `1px solid ${opt ? (isToday ? '#7c3aed44' : '#2a2a3e') : '#1e1e2e'}`,
                    }}
                  >
                    {opt ? (
                      <span style={{ fontSize: 18 }} title={opt.label}>{opt.emoji}</span>
                    ) : (
                      <span className="text-slate-700 text-sm">—</span>
                    )}
                  </div>
                  <span
                    className="text-xs leading-none truncate"
                    style={{ color: isToday ? '#a78bfa' : '#374151', fontWeight: isToday ? 600 : 400 }}
                  >
                    {DAY_ABBR[day.getDay()]}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom row: most frequent mood + correlation */}
            <div className="flex flex-col gap-1.5">
              {s.topMoodOpt ? (
                <p className="text-xs text-slate-500">
                  Humor mais frequente:{' '}
                  <span className="text-slate-300 font-medium">
                    {s.topMoodOpt.emoji} {s.topMoodOpt.label}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-slate-600">Nenhum humor registrado neste período.</p>
              )}
              {s.correlationInsight && (
                <p className="text-xs text-slate-600 italic">{s.correlationInsight}</p>
              )}
            </div>
          </Card>
        </motion.div>

        {/* ── GENERAL SUMMARY ───────────────────────────────────────────────── */}
        <motion.div variants={section}>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">Resumo geral</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { icon: CheckCircle2, label: 'Tarefas concluídas',    value: s.totalTasks,        accent: '#7c3aed' },
              { icon: Timer,        label: 'Pomodoros completados', value: s.totalPomodoros,    accent: '#7c3aed' },
              { icon: Wind,         label: 'Registros de ansiedade',value: s.totalAnxiety,      accent: '#64748b' },
              { icon: Flame,        label: 'Registros de humor',    value: s.totalMoodRecords,  accent: '#7c3aed' },
            ] as const).map(({ icon: Icon, label, value, accent }) => (
              <div
                key={label}
                className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: '#16161f', border: '1px solid #1e1e2e' }}
              >
                <Icon size={15} style={{ color: accent }} className="flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xl font-bold text-white tabular-nums leading-tight">{value}</p>
                  <p className="text-xs text-slate-600 truncate">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  )
}
