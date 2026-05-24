import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface OnboardingProps {
  onComplete: () => void
}

const slides = [
  {
    emoji: '🧠',
    title: 'Esvazie sua cabeça no Brain Dump.',
    subtitle: 'Sem julgamento. Qualquer pensamento pode entrar.',
  },
  {
    emoji: '🎯',
    title: 'Escolha até 3 coisas para hoje.',
    subtitle: 'Só 3. Seu cérebro agradece.',
  },
  {
    emoji: '⚡',
    title: 'Use o timer para proteger seu foco.',
    subtitle: 'O Pomodoro mantém seu cérebro no trilho.',
  },
]

const variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -80 : 80,
    opacity: 0,
  }),
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)

  const goNext = () => {
    if (step < slides.length - 1) {
      setDirection(1)
      setStep((s) => s + 1)
    } else {
      onComplete()
    }
  }

  const isLast = step === slides.length - 1
  const slide = slides[step]

  return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center p-6">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-12"
        >
          <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center shadow-md shadow-violet-600/30">
            <span className="text-sm font-extrabold text-white">FF</span>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">FocusFlow</span>
        </motion.div>

        {/* Slide area */}
        <div className="w-full bg-[#1a1a24] rounded-3xl p-10 shadow-xl shadow-black/40 overflow-hidden min-h-[280px] flex flex-col items-center justify-center relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex flex-col items-center text-center gap-5"
            >
              <span className="text-7xl select-none" role="img" aria-label={slide.title}>
                {slide.emoji}
              </span>
              <h2 className="text-2xl font-bold text-white leading-snug">{slide.title}</h2>
              <p className="text-zinc-400 text-base max-w-xs">{slide.subtitle}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2.5 mt-8">
          {slides.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => {
                setDirection(i > step ? 1 : -1)
                setStep(i)
              }}
              aria-label={`Ir para slide ${i + 1}`}
              animate={{
                width: i === step ? 28 : 10,
                backgroundColor: i === step ? '#7c3aed' : '#3f3f5e',
              }}
              transition={{ duration: 0.25 }}
              className="h-2.5 rounded-full"
            />
          ))}
        </div>

        {/* Button */}
        <motion.button
          key={isLast ? 'start' : 'next'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={goNext}
          className="mt-8 w-full max-w-xs bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 text-base shadow-md shadow-violet-600/30"
        >
          {isLast ? 'Começar!' : 'Próximo'}
        </motion.button>
      </div>
    </div>
  )
}
