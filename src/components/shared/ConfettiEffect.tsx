import { useEffect } from 'react'
import { celebrateTask, celebrateMini } from '../../lib/utils'

/**
 * ConfettiEffect – mount this component to trigger a full confetti burst.
 * Renders nothing to the DOM.
 */
export default function ConfettiEffect() {
  useEffect(() => {
    celebrateTask()
  }, [])

  return null
}

/**
 * MiniConfetti – mount this component to trigger a small confetti burst.
 * Renders nothing to the DOM.
 */
export function MiniConfetti() {
  useEffect(() => {
    celebrateMini()
  }, [])

  return null
}
