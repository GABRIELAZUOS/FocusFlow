import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface WoopFormData {
  wish: string
  outcome: string
  obstacle: string
  plan: string
}

interface WoopFormProps {
  onSave: (data: WoopFormData) => void
  onCancel: () => void
}

interface StepConfig {
  letter: string
  key: keyof WoopFormData
  title: string
  description: string
  placeholder: string
  example?: string
}

const STEPS: StepConfig[] = [
  {
    letter: 'W',
    key: 'wish',
    title: 'W — Desejo',
    description: 'O que você quer alcançar nos próximos dias ou semanas?',
    placeholder: 'Meu desejo é...',
    example: 'ex: "Quero terminar o projeto X até sexta"',
  },
  {
    letter: 'O',
    key: 'outcome',
    title: 'O — Resultado',
    description: 'Como você vai se sentir quando conseguir? Imagine vividamente.',
    placeholder: 'Quando conseguir, vou me sentir...',
  },
  {
    letter: 'O',
    key: 'obstacle',
    title: 'O — Obstáculo',
    description: 'O que pode te impedir? Seja honesto com você mesmo.',
    placeholder: 'O principal obstáculo é...',
  },
  {
    letter: 'P',
    key: 'plan',
    title: 'P — Plano',
    description: 'Crie um plano concreto: Se [obstáculo acontece], então [ação específica].',
    placeholder: 'Se [obstáculo]... então eu vou...',
  },
]

const LETTER_COLORS: Record<string, string> = {
  W: '#7c3aed',
  O: '#10b981',
  P: '#f59e0b',
}

export default function WoopForm({ onSave, onCancel }: WoopFormProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [data, setData] = useState<WoopFormData>({
    wish: '',
    outcome: '',
    obstacle: '',
    plan: '',
  })
  const [errors, setErrors] = useState<Partial<WoopFormData>>({})

  const currentStep = STEPS[step]
  const currentValue = data[currentStep.key]

  const validate = (): boolean => {
    if (!currentValue.trim()) {
      setErrors((prev) => ({ ...prev, [currentStep.key]: 'Este campo é obrigatório.' }))
      return false
    }
    setErrors((prev) => ({ ...prev, [currentStep.key]: undefined }))
    return true
  }

  const handleNext = () => {
    if (!validate()) return
    if (step < STEPS.length - 1) {
      setDirection(1)
      setStep((s) => s + 1)
    } else {
      onSave(data)
    }
  }

  const handlePrev = () => {
    setDirection(-1)
    setStep((s) => s - 1)
  }

  const handleChange = (value: string) => {
    setData((prev) => ({ ...prev, [currentStep.key]: value }))
    if (errors[currentStep.key]) {
      setErrors((prev) => ({ ...prev, [currentStep.key]: undefined }))
    }
  }

  // Pre-fill plan hint if we're on step 3
  const planHint =
    step === 3 && data.obstacle.trim()
      ? `Se ${data.obstacle.trim().charAt(0).toLowerCase() + data.obstacle.trim().slice(1)}...`
      : undefined

  const letterColor = LETTER_COLORS[currentStep.letter] || '#7c3aed'

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({
      x: dir > 0 ? -40 : 40,
      opacity: 0,
    }),
  }

  return (
    <div
      className="rounded-2xl p-6 space-y-6 w-full max-w-xl mx-auto"
      style={{ backgroundColor: '#1a1a24' }}
    >
      {/* Progress bar */}
      <div className="flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor:
                i < step
                  ? '#7c3aed'
                  : i === step
                  ? '#7c3aed88'
                  : '#2a2a3e',
            }}
          />
        ))}
      </div>

      {/* Step content */}
      <div style={{ minHeight: 240, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="space-y-4"
          >
            {/* Letter + title */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                style={{ backgroundColor: letterColor + '22', color: letterColor }}
              >
                {currentStep.letter}
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{currentStep.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{currentStep.description}</p>
              </div>
            </div>

            {/* Example hint */}
            {currentStep.example && (
              <p className="text-xs text-gray-500 italic px-1">{currentStep.example}</p>
            )}

            {/* Plan hint */}
            {step === 3 && planHint && (
              <p className="text-xs text-gray-500 italic px-1">
                Dica: {planHint}
              </p>
            )}

            {/* Textarea */}
            <div>
              <textarea
                value={currentValue}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={currentStep.placeholder}
                rows={4}
                className={[
                  'w-full rounded-xl border bg-white/5 text-white text-sm px-4 py-3 resize-none',
                  'placeholder:text-gray-600 focus:outline-none transition-colors',
                  errors[currentStep.key]
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-white/10 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30',
                ].join(' ')}
              />
              {errors[currentStep.key] && (
                <p className="text-xs text-red-400 mt-1">{errors[currentStep.key]}</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3 pt-2">
        {step === 0 ? (
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
        ) : (
          <button
            onClick={handlePrev}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 text-sm font-medium transition-colors"
          >
            Anterior
          </button>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleNext}
          className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold shadow-lg shadow-violet-600/30 transition-colors"
        >
          {step < STEPS.length - 1 ? 'Próximo →' : 'Salvar Meta'}
        </motion.button>
      </div>
    </div>
  )
}
