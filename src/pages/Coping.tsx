import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Star, Trash2, X, Shield } from 'lucide-react'
import { useCopingStore } from '../store/copingStore'
import type { CopingCard } from '../store/copingStore'

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#7c3aed', // violet
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
]

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  title: string
  trigger: string
  steps: string
  anchor_phrase: string
  category: string
  category_color: string
}

const DEFAULT_FORM: FormState = {
  title: '',
  trigger: '',
  steps: '',
  anchor_phrase: '',
  category: '',
  category_color: PRESET_COLORS[0],
}

// ─── CopingCardForm modal ─────────────────────────────────────────────────────

interface CopingFormProps {
  open: boolean
  onClose: () => void
  onSave: (data: FormState) => void
}

function CopingCardForm({ open, onClose, onSave }: CopingFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  function reset() {
    setForm(DEFAULT_FORM)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSave() {
    if (!form.title.trim()) return
    onSave({ ...form, title: form.title.trim() })
    reset()
    onClose()
  }

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ccf-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            key="ccf-modal"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full overflow-y-auto"
            style={{ maxWidth: 520, maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-2xl shadow-2xl"
              style={{ background: '#1a1a24', border: '1px solid #2a2a3e' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <h2 className="text-white font-bold text-lg">Novo cartão de enfrentamento</h2>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-6 pb-6 flex flex-col gap-4">
                {/* Title */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400">
                    Título <span className="text-violet-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="Ex: Quando travar numa tarefa"
                    autoFocus
                    className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-3 focus:outline-none focus:border-violet-500/60 placeholder-slate-600 transition-colors"
                  />
                </div>

                {/* Trigger */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400">Quando usar</label>
                  <input
                    type="text"
                    value={form.trigger}
                    onChange={(e) => setField('trigger', e.target.value)}
                    placeholder="Ex: Quando me sinto paralisado e não consigo começar"
                    className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-3 focus:outline-none focus:border-violet-500/60 placeholder-slate-600 transition-colors"
                  />
                </div>

                {/* Steps */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400">O que fazer</label>
                  <textarea
                    value={form.steps}
                    onChange={(e) => setField('steps', e.target.value)}
                    placeholder="Ex: 1. Para tudo. 2. Escolhe só uma coisa. 3. Faz por 5 minutos."
                    rows={3}
                    className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-3 resize-none focus:outline-none focus:border-violet-500/60 placeholder-slate-600 transition-colors"
                  />
                </div>

                {/* Anchor phrase */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-400">Frase âncora</label>
                  <input
                    type="text"
                    value={form.anchor_phrase}
                    onChange={(e) => setField('anchor_phrase', e.target.value)}
                    placeholder="Ex: Só o primeiro passo"
                    className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-3 focus:outline-none focus:border-violet-500/60 placeholder-slate-600 transition-colors"
                  />
                </div>

                {/* Category + color */}
                <div className="flex gap-3 items-end">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400">Categoria</label>
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) => setField('category', e.target.value)}
                      placeholder="Ex: TDAH, Ansiedade"
                      className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-3 focus:outline-none focus:border-violet-500/60 placeholder-slate-600 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <label className="text-xs font-semibold text-slate-400">Cor</label>
                    <div className="flex items-center gap-1.5 h-[46px]">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setField('category_color', color)}
                          className="rounded-full flex-shrink-0 transition-transform"
                          style={{
                            width: 20,
                            height: 20,
                            background: color,
                            transform: form.category_color === color ? 'scale(1.3)' : 'scale(1)',
                            outline: form.category_color === color ? `2px solid ${color}` : 'none',
                            outlineOffset: 2,
                          }}
                          aria-label={`Cor ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSave}
                  disabled={!form.title.trim()}
                  className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
                  Salvar cartão
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── CopingFullscreen ─────────────────────────────────────────────────────────

function CopingFullscreen({ card, onClose }: { card: CopingCard; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="w-full overflow-y-auto"
        style={{ maxWidth: 560, maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-2xl shadow-2xl"
          style={{ background: '#1a1a24', border: `1px solid ${card.category_color}44` }}
        >
          {/* Top bar: category badge + close */}
          <div className="flex items-center justify-between px-6 pt-5 pb-0">
            <div>
              {card.category ? (
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: card.category_color + '22', color: card.category_color }}
                >
                  {card.category}
                </span>
              ) : (
                <span />
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Color accent bar */}
          <div
            className="mx-6 mt-4 rounded-full"
            style={{ height: 3, background: card.category_color, opacity: 0.5 }}
          />

          <div className="px-6 py-6 flex flex-col gap-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-white leading-snug">{card.title}</h2>

            {/* When to use */}
            {card.trigger && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Quando usar:
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">{card.trigger}</p>
              </div>
            )}

            {/* Steps */}
            {card.steps && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  O que fazer:
                </p>
                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {card.steps}
                </p>
              </div>
            )}

            {/* Anchor phrase — violet highlighted box */}
            {card.anchor_phrase && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Frase âncora:
                </p>
                <div
                  className="rounded-2xl py-6 px-6 text-center"
                  style={{ background: '#7c3aed18', border: '1px solid #7c3aed33' }}
                >
                  <p className="text-violet-300 text-xl font-semibold italic leading-snug">
                    {card.anchor_phrase}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── CopingCardItem ───────────────────────────────────────────────────────────

interface CardItemProps {
  card: CopingCard
  onFavorite: () => void
  onDelete: () => void
  onOpen: () => void
}

function CopingCardItem({ card, onFavorite, onDelete, onOpen }: CardItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: '#1a1a24',
        border: '1px solid #2a2a3e',
        borderLeft: `4px solid ${card.category_color}`,
      }}
    >
      {/* Card body — click opens fullscreen */}
      <button
        className="flex-1 text-left px-4 pt-4 pb-3 focus:outline-none hover:bg-white/[0.02] transition-colors"
        onClick={onOpen}
        aria-label={`Abrir cartão: ${card.title}`}
      >
        {card.category && (
          <span
            className="inline-flex text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
            style={{ background: card.category_color + '22', color: card.category_color }}
          >
            {card.category}
          </span>
        )}

        <p className="text-sm font-bold text-white leading-snug">{card.title}</p>

        {card.anchor_phrase && (
          <p className="text-xs text-slate-400 italic mt-1 leading-relaxed">
            {card.anchor_phrase}
          </p>
        )}
      </button>

      {/* Actions row */}
      <div className="flex items-center justify-between px-3 pb-3">
        {confirmDelete ? (
          <div className="flex items-center gap-2 w-full px-1">
            <span className="text-xs text-slate-400 flex-1">Apagar este cartão?</span>
            <button
              onClick={onDelete}
              className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors px-1"
            >
              Sim
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-1"
            >
              Não
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={onFavorite}
              className="p-1.5 rounded-lg transition-colors"
              aria-label={card.favorited ? 'Remover favorito' : 'Favoritar'}
            >
              <Star
                size={16}
                className={card.favorited ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}
                fill={card.favorited ? 'currentColor' : 'none'}
              />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 transition-colors"
              aria-label="Apagar cartão"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Coping() {
  const { cards, addCard, deleteCard, toggleFavorite } = useCopingStore()
  const [showForm, setShowForm] = useState(false)
  const [fullscreenCard, setFullscreenCard] = useState<CopingCard | null>(null)

  // Favorited cards first, then the rest — each group sorted newest → oldest
  const sortedCards = useMemo(() => {
    const byDate = (a: CopingCard, b: CopingCard) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    const favs = cards.filter((c) => c.favorited).sort(byDate)
    const rest = cards.filter((c) => !c.favorited).sort(byDate)
    return [...favs, ...rest]
  }, [cards])

  function handleSave(data: FormState) {
    addCard(data)
  }

  return (
    <div className="min-h-full flex flex-col" style={{ background: '#0f0f13' }}>
      {/* Page header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-white">Enfrentamento</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Estratégias prontas para momentos difíceis
        </p>
      </div>

      {/* Card grid */}
      <div className="flex-1 px-6 pb-24">
        {sortedCards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <Shield size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhum cartão ainda.</p>
            <p className="text-slate-600 text-xs mt-1">
              Crie seu primeiro cartão de enfrentamento.
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-5xl"
          >
            <AnimatePresence mode="popLayout">
              {sortedCards.map((card) => (
                <CopingCardItem
                  key={card.id}
                  card={card}
                  onFavorite={() => toggleFavorite(card.id)}
                  onDelete={() => deleteCard(card.id)}
                  onOpen={() => setFullscreenCard(card)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Floating + button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setShowForm(true)}
        aria-label="Criar cartão de enfrentamento"
        className="fixed bottom-6 right-6 z-30 flex items-center justify-center rounded-2xl shadow-2xl"
        style={{
          width: 52,
          height: 52,
          background: '#7c3aed',
          boxShadow: '0 8px 32px rgba(124,58,237,0.45)',
        }}
      >
        <Plus size={22} className="text-white" />
      </motion.button>

      <CopingCardForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
      />

      {/* Fullscreen card view */}
      <AnimatePresence>
        {fullscreenCard && (
          <CopingFullscreen
            card={fullscreenCard}
            onClose={() => setFullscreenCard(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
