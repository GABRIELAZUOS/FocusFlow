import { useState, useEffect } from 'react'
import { useSettingsStore } from './store/settingsStore'
import { useKanbanStore } from './store/kanbanStore'
import { usePomodoroStore } from './store/pomodoroStore'
import { useAnxietyStore, getPendingCheckIns } from './store/anxietyStore'
import { useEstudosStore, getPendingCount as getEstudosPending } from './store/estudosStore'
import { useMoodStore } from './store/moodStore'
import { analyzeMoodForCrisis, shouldRunAnalysis, markAnalysisRun } from './lib/moodAnalysis'
import { usePomodoro } from './hooks/usePomodoro'
import { useAgendaSync } from './hooks/useAgendaSync'
import Board from './pages/Board'
import Agenda from './pages/Agenda'
import Focus from './pages/Focus'
import Woop from './pages/Woop'
import Anxiety from './pages/Anxiety'
import Coping from './pages/Coping'
import Estudos from './pages/Estudos'
import Stats from './pages/Stats'
import Onboarding from './pages/Onboarding'
import Sidebar from './components/shared/Sidebar'
import type { Tab } from './components/shared/Sidebar'
import Header from './components/shared/Header'
import QuickCapture from './components/kanban/QuickCapture'
import PomodoroAlerts from './components/shared/PomodoroAlerts'
import CrisisAlertBanner from './components/mood/CrisisAlertBanner'
import MoodReminder from './components/mood/MoodReminder'
import { requestNotificationPermission } from './lib/utils'

export default function App() {
  const { onboardingCompleted, setOnboardingCompleted } = useSettingsStore()
  const { tasks, addTask } = useKanbanStore()
  const { activeTaskId, phase } = usePomodoroStore()
  const [activeTab, setActiveTab] = useState<Tab>('board')
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const [pendingCheckIns, setPendingCheckIns] = useState(0)
  const [pendingStudies, setPendingStudies] = useState(0)

  // Start the pomodoro countdown loop
  usePomodoro()
  // Sync agenda items to kanban 'today' and detect completions
  useAgendaSync()

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  // Anxiety check-in badge: recompute on every store change + every 60 s
  // (records can become overdue purely by the clock advancing)
  useEffect(() => {
    function recompute() {
      setPendingCheckIns(getPendingCheckIns(useAnxietyStore.getState().records).length)
    }
    recompute()
    const unsub = useAnxietyStore.subscribe(recompute)
    const tick  = setInterval(recompute, 60_000)
    return () => { unsub(); clearInterval(tick) }
  }, [])

  // Estudos badge: promote 'new' → 'review_1_pending' when due, sync review
  // agenda items, then recount pending for the sidebar badge.
  useEffect(() => {
    function recompute() {
      useEstudosStore.getState().checkAndPromote()
      useEstudosStore.getState().syncReviewAgendaItems()
      setPendingStudies(getEstudosPending(useEstudosStore.getState().contents))
    }
    recompute()
    const unsub = useEstudosStore.subscribe(recompute)
    const tick  = setInterval(recompute, 60_000)
    return () => { unsub(); clearInterval(tick) }
  }, [])

  // Mood crisis analysis: run once per day after app load
  useEffect(() => {
    if (!shouldRunAnalysis()) return
    // Small delay so app finishes loading before hitting the API
    const timeout = setTimeout(async () => {
      const { records } = useMoodStore.getState()
      const { records: anxietyRecords } = useAnxietyStore.getState()
      const { allSessions } = usePomodoroStore.getState()
      const result = await analyzeMoodForCrisis(records, anxietyRecords, allSessions)
      markAnalysisRun()
      if (result) {
        useMoodStore.getState().setAlert({
          id: crypto.randomUUID(),
          ...result,
          dismissed: false,
        })
      }
    }, 5_000)
    return () => clearTimeout(timeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Global spacebar shortcut → quick capture
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (e.code === 'Space') {
        e.preventDefault()
        setQuickCaptureOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Resolve active task title for the header pulse indicator
  const activeTask: string | null = (() => {
    if (!activeTaskId || (phase !== 'focus' && phase !== 'break')) return null
    return tasks.find((t) => t.id === activeTaskId)?.title ?? null
  })()

  if (!onboardingCompleted) {
    return <Onboarding onComplete={() => setOnboardingCompleted(true)} />
  }

  return (
    <div className="h-screen overflow-hidden bg-[#0f0f13]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCheckIns={pendingCheckIns}
        pendingStudies={pendingStudies}
      />

      {/* ml-[64px] = collapsed sidebar width — sidebar overlays when expanded */}
      <div className="flex flex-col h-full overflow-hidden" style={{ marginLeft: 64 }}>
        <Header activeTask={activeTask} onQuickCapture={() => setQuickCaptureOpen(true)} />

        <CrisisAlertBanner />

        <main className="flex-1 overflow-auto min-h-0">
          {activeTab === 'board'   && <Board />}
          {activeTab === 'agenda'  && <Agenda />}
          {activeTab === 'estudos' && <Estudos />}
          {activeTab === 'woop'    && <Woop />}
          {activeTab === 'focus'   && <Focus />}
          {activeTab === 'anxiety' && <Anxiety onNavigateToCoping={() => setActiveTab('coping')} />}
          {activeTab === 'coping'    && <Coping />}
          {activeTab === 'stats'     && <Stats />}
        </main>
      </div>

      <QuickCapture
        open={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        onSave={(title) => addTask(title, 'inbox')}
      />

      <PomodoroAlerts />
      <MoodReminder />
    </div>
  )
}
