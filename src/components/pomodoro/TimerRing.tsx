interface TimerRingProps {
  progress: number // 0–1
  phase: 'idle' | 'focus' | 'break'
  size?: number
}

const PHASE_STROKE: Record<'idle' | 'focus' | 'break', string> = {
  idle: '#3d3d56',
  focus: '#7c3aed',
  break: '#10b981',
}

export default function TimerRing({ progress, phase, size = 280 }: TimerRingProps) {
  const center = size / 2
  const strokeWidth = 14
  const radius = center - strokeWidth / 2 - 4
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {/* Track */}
      <circle
        cx={center} cy={center} r={radius}
        fill="none"
        stroke="#2a2a3e"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={center} cy={center} r={radius}
        fill="none"
        stroke={PHASE_STROKE[phase]}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
      />
    </svg>
  )
}
