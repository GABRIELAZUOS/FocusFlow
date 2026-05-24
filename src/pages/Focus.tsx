import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePomodoroStore } from '../store/pomodoroStore'
import { useKanbanStore } from '../store/kanbanStore'
import { useSettingsStore } from '../store/settingsStore'
import TimerRing from '../components/pomodoro/TimerRing'
import ModeSelector from '../components/pomodoro/ModeSelector'
import SessionHistory from '../components/pomodoro/SessionHistory'
import { formatTime, playSound } from '../lib/utils'
import { MiniConfetti } from '../components/shared/ConfettiEffect'

const BREAK_SUGGESTIONS = [
  { icon: '🚶', text: 'Levante e caminhe' },
  { icon: '💧', text: 'Beba água' },
  { icon: '🌬️', text: 'Respire fundo' },
  { icon: '🪟', text: 'Olhe pela janela' },
]

export default function Focus() {
  const pomodoro = usePomodoroStore()
  const { tasks } = useKanbanStore()
  const { soundEnabled } = useSettingsStore()

  const [showTaskCompleteModal, setShowTaskCompleteModal] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)

  // Detect focus → break transition to trigger celebration
  const prevPhaseRef = useRef(pomodoro.phase)
  useEffect(() => {
    if (prevPhaseRef.current === 'focus' && pomodoro.phase === 'break') {
      setShowCelebration(true)
      setTimeout(() => setShowCelebration(false), 3000)
      if (pomodoro.activeTaskId) {
        setTimeout(() => setShowTaskCompleteModal(true), 800)
      }
    }
    prevPhaseRef.current = pomodoro.phase
  }, [pomodoro.phase])

  const progress =
    pomodoro.totalSeconds > 0
      ? (pomodoro.totalSeconds - pomodoro.secondsLeft) / pomodoro.totalSeconds
      : 0

  const selectableTasks = tasks.filter(
    (t) => t.column === 'today' || t.column === 'in_progress'
  )
  const activeTask = tasks.find((t) => t.id === pomodoro.activeTaskId)

  const handleStart = () => {
    if (soundEnabled) playSound('start')
    pomodoro.start(pomodoro.activeTaskId)
  }

  const handleAbandon = () => {
    pomodoro.abandon()
    setShowAbandonConfirm(false)
  }

  const handleSkipBreak = () => pomodoro.skipBreak()

  const handleTaskComplete = (completed: boolean) => {
    setShowTaskCompleteModal(false)
    if (completed && pomodoro.activeTaskId) {
      useKanbanStore.getState().updateTask(pomodoro.activeTaskId, {
        column: 'done',
        completed_at: new Date().toISOString(),
      })
      pomodoro.setActiveTaskId(null)
    }
  }

  const isIdle = pomodoro.phase === 'idle'
  const isFocus = pomodoro.phase === 'focus'
  const isBreak = pomodoro.phase === 'break'

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4" style={{ backgroundColor: '#0f0f13' }}>
      <div className="w-full max-w-[680px] space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Modo Foco</h1>
          <p className="text-sm text-gray-400 mt-0.5">Mantenha o foco, uma sessão de cada vez</p>
        </div>

        <ModeSelector mode={pomodoro.mode} onChange={(m) => { if (isIdle) pomodoro.setMode(m) }} disabled={!isIdle} />

        <div className="rounded-2xl p-8 flex flex-col items-center gap-4" style={{ backgroundColor: '#1a1a24' }}>
          {/* Ring */}
          <div className="relative" style={{ width: 280, height: 280 }}>
            <TimerRing progress={progress} phase={pomodoro.phase} size={280} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div style={{ height: 60 }} />
              <span className="font-mono text-5xl font-bold text-white tracking-tight leading-none">
                {formatTime(pomodoro.secondsLeft)}
              </span>
              <span className="text-xs text-gray-400 mt-1 font-medium">
                {isFocus ? 'FOCO' : isBreak ? 'PAUSA' : 'PRONTO'}
              </span>
            </div>
          </div>

          {/* Active task */}
          <div className="text-center">
            {activeTask
              ? <p className="text-gray-200 font-medium text-sm max-w-xs truncate">{activeTask.title}</p>
              : <p className="text-gray-500 text-sm italic">Nenhuma tarefa selecionada</p>
            }
          </div>

          {/* Task selector (idle only) */}
          {isIdle && (
            <select
              value={pomodoro.activeTaskId || ''}
              onChange={(e) => pomodoro.setActiveTaskId(e.target.value || null)}
              className="w-full max-w-xs rounded-lg border border-white/10 bg-white/5 text-white text-sm py-2 px-3 focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="">Sem tarefa vinculada</option>
              {selectableTasks.map((task) => (
                <option key={task.id} value={task.id}>{task.title}</option>
              ))}
            </select>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 mt-2">
            {isIdle && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/40 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14l11-7-11-7z" /></svg>
                Iniciar
              </motion.button>
            )}

            {isFocus && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={pomodoro.pause}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-violet-600/40 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                Pausar
              </motion.button>
            )}

            {(isFocus || isBreak) && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowAbandonConfirm(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
                Abandonar
              </motion.button>
            )}
          </div>
        </div>

        {/* Break suggestions */}
        <AnimatePresence>
          {isBreak && (
            <motion.div key="break" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
              className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: '#1a1a24', border: '1px solid #10b98133' }}
            >
              <h3 className="text-sm font-semibold text-emerald-400">☕ Hora da pausa — aproveite!</h3>
              <div className="grid grid-cols-2 gap-2">
                {BREAK_SUGGESTIONS.map((s) => (
                  <div key={s.text} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-300" style={{ backgroundColor: '#16161f' }}>
                    <span>{s.icon}</span><span>{s.text}</span>
                  </div>
                ))}
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSkipBreak}
                className="w-full py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-sm font-medium transition-colors"
              >
                Já estou pronto ✓
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Celebration */}
        <AnimatePresence>
          {showCelebration && (
            <>
              <MiniConfetti />
              <motion.div key="celebration" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="rounded-2xl px-6 py-4 text-center font-semibold text-white text-lg"
                style={{ background: 'linear-gradient(135deg, #7c3aed55 0%, #10b98155 100%)', border: '1px solid #7c3aed66' }}
              >
                Pomodoro concluído! 🎉
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <SessionHistory sessions={pomodoro.allSessions} todaySessions={pomodoro.todaySessions} />
      </div>

      {/* Abandon confirm */}
      <AnimatePresence>
        {showAbandonConfirm && (
          <motion.div key="abandon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowAbandonConfirm(false)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="rounded-2xl p-6 w-full max-w-sm space-y-4"
              style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3e' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white">Abandonar sessão?</h3>
              <p className="text-sm text-gray-400">A sessão não será contabilizada como concluída.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowAbandonConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={handleAbandon}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors">
                  Abandonar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task complete modal */}
      <AnimatePresence>
        {showTaskCompleteModal && activeTask && (
          <motion.div key="task-complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="rounded-2xl p-6 w-full max-w-sm space-y-4"
              style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3e' }}
            >
              <div className="text-center">
                <span className="text-3xl">🎯</span>
                <h3 className="text-lg font-semibold text-white mt-2">Tarefa concluída?</h3>
                <p className="text-sm text-gray-400 mt-1 truncate">"{activeTask.title}"</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => handleTaskComplete(true)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors">
                  Sim, mover para Concluído
                </button>
                <button onClick={() => handleTaskComplete(false)}
                  className="w-full py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-medium transition-colors">
                  Não, continuar depois
                </button>
                <button onClick={() => setShowTaskCompleteModal(false)}
                  className="w-full py-2.5 rounded-xl border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 text-sm font-medium transition-colors">
                  Continuar focando
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
