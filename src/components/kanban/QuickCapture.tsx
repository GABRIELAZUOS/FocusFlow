import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

interface QuickCaptureProps {
  open: boolean
  onClose: () => void
  onSave: (title: string, addToAgenda?: boolean) => void
  /** When true, shows the "Adicionar à Agenda?" toggle (Brain Dump only) */
  showAgendaToggle?: boolean
}

export default function QuickCapture({ open, onClose, onSave, showAgendaToggle = false }: QuickCaptureProps) {
  const [value, setValue] = useState('')
  const [addToAgenda, setAddToAgenda] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when modal opens; reset toggle state
  useEffect(() => {
    if (open) {
      setValue('')
      setAddToAgenda(false)
      // Defer focus so animation doesn't skip it
      const id = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSave(trimmed, showAgendaToggle ? addToAgenda : undefined)
    setValue('')
    setAddToAgenda(false)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Captura rápida"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 px-4"
            style={{ maxWidth: 480 }}
          >
            <div
              className="rounded-2xl p-5 shadow-2xl"
              style={{ background: '#1e1e2e', border: '1px solid #2a2a3e' }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold text-base">Captura rápida</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="O que está na sua mente?"
                  className="w-full rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-shadow"
                  style={{ background: '#0f0f13', border: '1px solid #2a2a3e' }}
                  autoComplete="off"
                />

                {/* Hint */}
                <p className="mt-3 text-xs text-zinc-500">
                  A tarefa vai para{' '}
                  <span className="text-zinc-400 font-medium">Brain Dump</span>{' '}
                  automaticamente
                </p>

                {/* Agenda toggle — Brain Dump only */}
                {showAgendaToggle && (
                  <button
                    type="button"
                    onClick={() => setAddToAgenda((v) => !v)}
                    className="mt-3 w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors"
                    style={{
                      background: addToAgenda ? '#7c3aed18' : '#ffffff08',
                      border: `1px solid ${addToAgenda ? '#7c3aed55' : '#2a2a3e'}`,
                    }}
                  >
                    <span className="text-xs font-medium" style={{ color: addToAgenda ? '#a78bfa' : '#71717a' }}>
                      Adicionar à Agenda?
                    </span>
                    {/* Pill toggle */}
                    <div
                      className="relative flex-shrink-0 rounded-full transition-colors"
                      style={{
                        width: 32,
                        height: 18,
                        background: addToAgenda ? '#7c3aed' : '#3f3f46',
                      }}
                    >
                      <motion.div
                        animate={{ x: addToAgenda ? 16 : 2 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute top-[3px] rounded-full bg-white"
                        style={{ width: 12, height: 12 }}
                      />
                    </div>
                  </button>
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/8 text-sm font-medium transition-colors"
                  >
                    Cancelar
                    <kbd className="ml-1.5 inline-flex items-center justify-center text-xs text-zinc-500 font-mono">
                      Esc
                    </kbd>
                  </button>
                  <button
                    type="submit"
                    disabled={!value.trim()}
                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                  >
                    Salvar
                    <kbd className="ml-1.5 inline-flex items-center justify-center text-xs text-violet-300 font-mono">
                      ↵
                    </kbd>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
