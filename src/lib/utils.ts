import confetti from 'canvas-confetti'

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function celebrateTask() {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#7c3aed', '#10b981', '#f59e0b', '#ec4899'],
    ticks: 150,
  })
}

export function celebrateMini() {
  confetti({
    particleCount: 30,
    spread: 40,
    origin: { y: 0.8 },
    colors: ['#7c3aed', '#10b981'],
    ticks: 100,
    scalar: 0.8,
  })
}

export const CATEGORY_COLORS = [
  '#7c3aed', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
]

export const ENERGY_CONFIG = {
  low: { label: 'Baixa', emoji: '🟢', color: '#10b981', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  medium: { label: 'Média', emoji: '🟡', color: '#f59e0b', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  high: { label: 'Alta', emoji: '🔴', color: '#ef4444', bg: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export const TIME_OPTIONS = ['5min', '15min', '30min', '1h', '2h+'] as const

export const POMODORO_MODES = {
  classic: { label: 'Clássico', emoji: '🍅', focus: 25, break: 5 },
  sprint: { label: 'Sprint', emoji: '⚡', focus: 15, break: 3 },
  flow: { label: 'Fluxo', emoji: '🌊', focus: 50, break: 10 },
  custom: { label: 'Personalizado', emoji: '🎯', focus: 25, break: 5 },
}

export function playSound(type: 'start' | 'end' | 'ding') {
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)

  if (type === 'start') {
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.setValueAtTime(550, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } else if (type === 'end') {
    const notes = [523, 659, 784, 1046]
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g)
      g.connect(ctx.destination)
      o.frequency.value = freq
      g.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4)
      o.start(ctx.currentTime + i * 0.15)
      o.stop(ctx.currentTime + i * 0.15 + 0.4)
    })
  } else {
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon-192.png' })
  }
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}
