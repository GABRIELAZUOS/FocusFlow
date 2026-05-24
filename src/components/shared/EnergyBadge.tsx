import type { EnergyLevel } from '../../lib/supabase'
import { ENERGY_CONFIG } from '../../lib/utils'

interface EnergyBadgeProps {
  level: EnergyLevel | null
  size?: 'sm' | 'md'
}

export default function EnergyBadge({ level, size = 'md' }: EnergyBadgeProps) {
  if (!level) return null

  const config = ENERGY_CONFIG[level]

  const sizeClasses =
    size === 'sm'
      ? 'text-xs px-1.5 py-0.5 gap-1'
      : 'text-sm px-2 py-1 gap-1.5'

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.bg} ${sizeClasses}`}
    >
      <span role="img" aria-label={config.label} className="leading-none">
        {config.emoji}
      </span>
      <span>{config.label}</span>
    </span>
  )
}
