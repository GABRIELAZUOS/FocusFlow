import { useEffect, useRef } from 'react'
import { usePomodoroStore } from '../store/pomodoroStore'
import { useSettingsStore } from '../store/settingsStore'
import { playSound, sendNotification } from '../lib/utils'

export function usePomodoro() {
  const store = usePomodoroStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (store.phase !== 'focus' && store.phase !== 'break') return

    intervalRef.current = setInterval(() => {
      const s = usePomodoroStore.getState()
      const next = s.secondsLeft - 1

      if (next <= 0) {
        clearInterval(intervalRef.current!)
        if (s.phase === 'focus') {
          if (useSettingsStore.getState().soundEnabled) playSound('end')
          sendNotification('FocusFlow', 'Sessão de foco concluída! Hora de descansar.')
          s.completeFocus()
        } else {
          if (useSettingsStore.getState().soundEnabled) playSound('start')
          sendNotification('FocusFlow', 'Pausa concluída! Pronto para focar?')
          s.skipBreak()
        }
      } else {
        s.setSecondsLeft(next)
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [store.phase])

  return store
}
