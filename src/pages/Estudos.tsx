import { useState, useMemo, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, BookOpen, Trash2, Eye, X, Check, CalendarDays } from 'lucide-react'
import {
  useEstudosStore,
  isCurrentlyPending,
  type Subject,
  type StudyContent,
  type ContentStatus,
} from '../store/estudosStore'
import { useEstudosAgendaStore, type StudyAgendaItem } from '../store/estudosAgendaStore'

// ── Spaced-repetition constants ────────────────────────────────────────────────

const SUBJECT_PALETTE = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2']

const STATUS_META: Record<ContentStatus, { label: string; color: string; bg: string }> = {
  new:              { label: 'Novo',      color: '#ca8a04', bg: '#ca8a0420' },
  review_1_pending: { label: 'Rev. 1',   color: '#3b82f6', bg: '#3b82f620' },
  review_2_pending: { label: 'Rev. 2',   color: '#f97316', bg: '#f9731620' },
  review_3_pending: { label: 'Rev. 3',   color: '#ef4444', bg: '#ef444420' },
  mastered:         { label: 'Dominado', color: '#10b981', bg: '#10b98120' },
}

const REVIEW_CONFIG = [
  { num: 1, label: 'Rev. 1 (24h)',     prompt: 'Responda questões sobre o conteúdo.',                  easyLabel: 'Fiz fácil',         hardLabel: 'Foi difícil' },
  { num: 2, label: 'Rev. 2 (7 dias)', prompt: 'Leia seu resumo e tente se recordar ativamente.',       easyLabel: 'Fiz fácil',         hardLabel: 'Foi difícil' },
  { num: 3, label: 'Rev. 3 (30 dias)',prompt: 'Revisão final — você dominou o conteúdo?',              easyLabel: 'Dominei',           hardLabel: 'Preciso revisar mais' },
]

// ── Calendar constants ─────────────────────────────────────────────────────────

const HOUR_H        = 64
const GRID_START_H  = 5
const GRID_END_H    = 24
const TOTAL_HOURS   = GRID_END_H - GRID_START_H
const GRID_H        = TOTAL_HOURS * HOUR_H
const TIME_GUTTER_W = 52
const SNAP_MINS     = 30

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DURATION_OPTIONS = [0.5, 1, 1.5, 2, 3, 4]

// ── Spaced-rep utilities ───────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} às ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function fmtRel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const absH = Math.abs(diff) / 3_600_000
  const absD = Math.abs(diff) / 86_400_000
  const fut  = diff < 0
  if (absH < 0.5) return fut ? 'em breve' : 'agora'
  if (absH < 24)  { const n = Math.round(absH); return fut ? `em ${n}h` : `há ${n}h` }
  const n = Math.round(absD)
  return fut ? `em ${n} dia${n !== 1 ? 's' : ''}` : `há ${n} dia${n !== 1 ? 's' : ''}`
}

function getPendingInfo(c: StudyContent): { reviewNum: 1|2|3; dueIso: string; cfg: typeof REVIEW_CONFIG[number] } | null {
  const now = new Date().toISOString()
  if (c.status === 'review_1_pending' && !c.review_1_done_at && c.review_1_due <= now)
    return { reviewNum: 1, dueIso: c.review_1_due, cfg: REVIEW_CONFIG[0] }
  if (c.status === 'review_2_pending' && !c.review_2_done_at && c.review_2_due != null && c.review_2_due <= now)
    return { reviewNum: 2, dueIso: c.review_2_due, cfg: REVIEW_CONFIG[1] }
  if (c.status === 'review_3_pending' && !c.review_3_done_at && c.review_3_due != null && c.review_3_due <= now)
    return { reviewNum: 3, dueIso: c.review_3_due, cfg: REVIEW_CONFIG[2] }
  return null
}

function getNextDue(c: StudyContent): { label: string; dueIso: string } | null {
  if (c.status === 'mastered') return null
  if ((c.status === 'new' || c.status === 'review_1_pending') && !c.review_1_done_at)
    return { label: 'Rev. 1', dueIso: c.review_1_due }
  if (c.status === 'review_2_pending' && c.review_2_due)
    return { label: 'Rev. 2', dueIso: c.review_2_due }
  if (c.status === 'review_3_pending' && c.review_3_due)
    return { label: 'Rev. 3', dueIso: c.review_3_due }
  return null
}

// ── Calendar utilities ─────────────────────────────────────────────────────────

function timeToY(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return Math.max(0, ((h + m / 60) - GRID_START_H) * HOUR_H)
}

function yToTime(y: number): string {
  const clamped  = Math.max(0, Math.min(y, (TOTAL_HOURS - 0.5) * HOUR_H))
  const totalMins = Math.round((clamped / HOUR_H) * 60)
  const snapped   = Math.round(totalMins / SNAP_MINS) * SNAP_MINS
  const h = GRID_START_H + Math.floor(snapped / 60)
  const m = snapped % 60
  return `${String(h % 24).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

function formatRange(start: string, hours: number): string {
  const [h, m] = start.split(':').map(Number)
  const endMins = h * 60 + m + Math.round(hours * 60)
  const eH = Math.floor(endMins / 60) % 24
  const eM = endMins % 60
  return `${start}–${String(eH).padStart(2,'0')}:${String(eM).padStart(2,'0')}`
}

function getWeekDays(): Date[] {
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay() + i)
    return d
  })
}

function getNowY(): number {
  const now = new Date()
  return timeToY(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATÉRIAS TAB COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: ContentStatus }) {
  const m = STATUS_META[status]
  return (
    <span className="inline-flex items-center rounded-full text-xs font-semibold px-2 py-0.5 leading-none"
      style={{ color: m.color, background: m.bg }}>
      {m.label}
    </span>
  )
}

// ── SubjectModal ──────────────────────────────────────────────────────────────

function SubjectModal({ open, onClose, onSave }: {
  open: boolean; onClose: () => void
  onSave: (data: { name: string; color: string }) => void
}) {
  const [name,  setName]  = useState('')
  const [color, setColor] = useState(SUBJECT_PALETTE[0])

  useEffect(() => { if (open) { setName(''); setColor(SUBJECT_PALETTE[0]) } }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="subj-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div key="subj-modal" initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.18 }} style={{ width: '100%', maxWidth: 380 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl shadow-2xl" style={{ background: '#1a1a24', border: '1px solid #2a2a3e' }}>
              <div className="flex items-center justify-between px-6 pt-5 pb-4">
                <h2 className="font-bold text-white text-lg">Nova Matéria</h2>
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"><X size={16} /></button>
              </div>
              <div className="px-6 pb-6 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nome *</label>
                  <input type="text" value={name} autoFocus onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave({ name: name.trim(), color })}
                    placeholder="Ex: Constitucional"
                    className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-2.5 focus:outline-none focus:border-violet-500/60 placeholder-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cor</label>
                  <div className="flex gap-2">
                    {SUBJECT_PALETTE.map((c) => (
                      <button key={c} type="button" onClick={() => setColor(c)}
                        className="w-7 h-7 rounded-full transition-all flex items-center justify-center"
                        style={{ background: c, transform: color === c ? 'scale(1.25)' : 'scale(1)', boxShadow: color === c ? `0 0 0 2px #1a1a24, 0 0 0 4px ${c}` : 'none' }}>
                        {color === c && <Check size={12} color="#fff" />}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => name.trim() && onSave({ name: name.trim(), color })} disabled={!name.trim()}
                  className="py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                  Salvar
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── ContentModal ──────────────────────────────────────────────────────────────

function ContentModal({ open, subject, onClose, onSave }: {
  open: boolean; subject: Subject | null; onClose: () => void
  onSave: (data: { title: string; notes: string }) => void
}) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => { if (open) { setTitle(''); setNotes('') } }, [open])

  return (
    <AnimatePresence>
      {open && subject && (
        <motion.div key="cnt-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div key="cnt-modal" initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.18 }} style={{ width: '100%', maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl shadow-2xl" style={{ background: '#1a1a24', border: '1px solid #2a2a3e' }}>
              <div className="flex items-center justify-between px-6 pt-5 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: subject.color }} />
                  <h2 className="font-bold text-white text-lg">Novo Conteúdo</h2>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"><X size={16} /></button>
              </div>
              <div className="px-6 pb-6 flex flex-col gap-4">
                <p className="text-xs text-slate-500">
                  Matéria: <span className="font-semibold" style={{ color: subject.color }}>{subject.name}</span>
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Título *</label>
                  <input type="text" value={title} autoFocus onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Princípios fundamentais - Art. 1º ao 5º"
                    className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-2.5 focus:outline-none focus:border-violet-500/60 placeholder-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notas / Resumo (opcional)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
                    placeholder="Cole aqui seu resumo..."
                    className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-3 focus:outline-none focus:border-violet-500/60 placeholder-slate-600 resize-none" />
                </div>
                <p className="text-xs text-slate-600 -mt-2">💡 Revisão em 24h será agendada automaticamente ao salvar.</p>
                <button onClick={() => title.trim() && onSave({ title: title.trim(), notes })} disabled={!title.trim()}
                  className="py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                  Estudei — Agendar Revisão
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── DetailModal ───────────────────────────────────────────────────────────────

function DetailModal({ content, subject, onClose }: {
  content: StudyContent | null; subject: Subject | null; onClose: () => void
}) {
  const { updateNotes } = useEstudosStore()
  const [notes, setNotes] = useState('')

  useEffect(() => { if (content) setNotes(content.notes) }, [content?.id])

  if (!content || !subject) return null

  const stages = [
    { label: 'Rev. 1 (24h)',    dueIso: content.review_1_due, doneAt: content.review_1_done_at, easy: content.review_1_easy },
    { label: 'Rev. 2 (7 dias)', dueIso: content.review_2_due, doneAt: content.review_2_done_at, easy: content.review_2_easy },
    { label: 'Rev. 3 (30 dias)',dueIso: content.review_3_due, doneAt: content.review_3_done_at, easy: null },
  ]

  function stageStatus(idx: number): 'done' | 'pending' | 'upcoming' | 'tbd' {
    const s = stages[idx]
    if (!s.dueIso) return 'tbd'
    if (s.doneAt)  return 'done'
    if (new Date(s.dueIso).getTime() <= Date.now()) return 'pending'
    return 'upcoming'
  }

  return (
    <AnimatePresence>
      <motion.div key="detail-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}>
        <motion.div key="detail-modal" initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.18 }} style={{ width: '100%', maxWidth: 520 }}
          onClick={(e) => e.stopPropagation()}>
          <div className="rounded-2xl shadow-2xl max-h-[85vh] flex flex-col" style={{ background: '#1a1a24', border: '1px solid #2a2a3e' }}>
            <div className="flex items-start justify-between px-6 pt-5 pb-4 flex-shrink-0">
              <div className="flex flex-col gap-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: subject.color }} />
                  <span className="text-xs font-semibold" style={{ color: subject.color }}>{subject.name}</span>
                </div>
                <p className="text-white font-bold text-base leading-snug break-words">{content.title}</p>
              </div>
              <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto px-6 pb-6 flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Notas / Resumo</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => updateNotes(content.id, notes)} rows={5} placeholder="Cole aqui seu resumo..."
                  className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-3 focus:outline-none focus:border-violet-500/60 placeholder-slate-600 resize-none transition-colors" />
                <p className="text-xs text-slate-700 mt-1">Salvo ao sair do campo.</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Histórico de revisões</p>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: '#7c3aed22', border: '1px solid #7c3aed55' }}>
                      <span style={{ fontSize: 10 }}>📚</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-300">Estudado</p>
                      <p className="text-xs text-slate-600">{fmtDate(content.studied_at)}</p>
                    </div>
                  </div>
                  {stages.map((stage, i) => {
                    const st = stageStatus(i)
                    const dotColor = st === 'done' ? '#10b981' : st === 'pending' ? '#f59e0b' : '#334155'
                    return (
                      <div key={i} className="flex items-start gap-2 py-2">
                        <div className="flex flex-col items-center flex-shrink-0">
                          {i < 2 && <div className="w-px h-3 -mt-2 mb-1" style={{ background: '#1e1e2e' }} />}
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: dotColor + '22', border: `1px solid ${dotColor}55` }}>
                            {st === 'done'    ? <Check size={9} color={dotColor} />
                            : st === 'pending' ? <span style={{ fontSize: 8, color: dotColor }}>!</span>
                            : <span style={{ fontSize: 8, color: dotColor }}>–</span>}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-300">{stage.label}</p>
                          {stage.dueIso ? (
                            <>
                              <p className="text-xs text-slate-600">Vence: {fmtDate(stage.dueIso)}</p>
                              {st === 'done'    && stage.doneAt && <p className="text-xs" style={{ color: '#10b981' }}>Concluída {stage.easy === false ? '(difícil)' : '(fácil)'} em {fmtDate(stage.doneAt)}</p>}
                              {st === 'pending' && <p className="text-xs font-medium" style={{ color: '#f59e0b' }}>⚠️ Pendente · venceu {fmtRel(stage.dueIso)}</p>}
                              {st === 'upcoming'&& <p className="text-xs text-slate-600">Agendada {fmtRel(stage.dueIso)}</p>}
                            </>
                          ) : (
                            <p className="text-xs text-slate-700">Aguardando revisão anterior</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {content.status === 'mastered' && (
                    <div className="flex items-center gap-2 py-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#10b98122', border: '1px solid #10b98155' }}>
                        <Check size={9} color="#10b981" />
                      </div>
                      <p className="text-xs font-semibold" style={{ color: '#10b981' }}>Conteúdo dominado ✓</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── PendingCard ───────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Revisão 1 (24h) · Responda questões',
  2: 'Revisão 2 (7 dias) · Leia seu resumo',
  3: 'Revisão 3 (30 dias) · Revisão final',
}

function PendingCard({ content, subject, onAction, onOpenDetail }: {
  content: StudyContent; subject: Subject
  onAction: (id: string, action: 'easy' | 'hard' | 'mastered' | 'retry') => void
  onOpenDetail: () => void
}) {
  const info = getPendingInfo(content)
  if (!info) return null
  const { dueIso } = info
  const isR3 = info.reviewNum === 3
  const stageLabel = STAGE_LABELS[info.reviewNum]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, x: -16 }}
      transition={{ duration: 0.15 }}
      className="flex-shrink-0 rounded-2xl flex flex-col gap-3 cursor-pointer"
      style={{ width: 280, background: '#1a1a24', border: '1px solid #2a2a3e', padding: '14px 16px' }}
      onClick={onOpenDetail}>
      {/* Subject + overdue indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: subject.color }} />
          <span className="text-xs font-semibold truncate" style={{ color: subject.color }}>{subject.name}</span>
        </div>
        <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#f59e0b' }}>
          ⚠️ {fmtRel(dueIso)}
        </span>
      </div>
      {/* Content title */}
      <p className="text-sm text-white font-bold leading-snug line-clamp-2">{content.title}</p>
      {/* Stage label */}
      <p className="text-xs font-semibold" style={{ color: STATUS_META[content.status].color }}>
        {stageLabel}
      </p>
      {/* Action buttons */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onAction(content.id, isR3 ? 'mastered' : 'easy')}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
          style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98140' }}>
          <Check size={11} />✓ Fácil
        </button>
        <button onClick={() => onAction(content.id, isR3 ? 'retry' : 'hard')}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
          style={{ background: '#ef444418', color: '#ef4444', border: '1px solid #ef444440' }}>
          ✗ Difícil
        </button>
      </div>
    </motion.div>
  )
}

// ── ContentCard ───────────────────────────────────────────────────────────────

function ContentCard({ content, onOpenDetail, onDelete }: {
  content: StudyContent; onOpenDetail: () => void; onDelete: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const pending  = isCurrentlyPending(content)
  const mastered = content.status === 'mastered'
  const nextDue  = getNextDue(content)

  return (
    <div className="rounded-xl px-3 py-2.5 flex flex-col gap-1.5 cursor-pointer transition-colors"
      style={{
        background: mastered ? '#0a160a' : pending ? '#1e1a10' : '#16161f',
        border: `1px solid ${mastered ? '#10b98133' : pending ? '#f59e0b44' : '#1e1e2e'}`,
        opacity: mastered ? 0.75 : 1,
      }}
      onClick={onOpenDetail}>
      <div className="flex items-start gap-1.5">
        <p className="text-xs flex-1 leading-snug font-medium break-words min-w-0"
          style={{ color: mastered ? '#64748b' : '#e2e8f0' }}>
          {mastered && <span className="mr-1">✅</span>}
          {content.title}
        </p>
        <div className="flex items-center gap-1 flex-shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
          {content.notes.trim() && (
            <button onClick={onOpenDetail} className="p-0.5 text-slate-700 hover:text-violet-400 transition-colors" title="Ver notas">
              <Eye size={11} />
            </button>
          )}
          {confirmDel ? (
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-xs text-red-400 hover:text-red-300 font-semibold">Sim</button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmDel(false) }} className="text-xs text-slate-600 hover:text-slate-400">Não</button>
            </div>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setConfirmDel(true) }}
              className="p-0.5 text-slate-700 hover:text-red-400 transition-colors" title="Excluir">
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={content.status} />
        {pending  && <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#f59e0b' }}>⚠️ pendente</span>}
        {!pending && nextDue && <span className="text-xs text-slate-700 flex-shrink-0 truncate">{nextDue.label} {fmtRel(nextDue.dueIso)}</span>}
      </div>
    </div>
  )
}

// ── SubjectColumn ─────────────────────────────────────────────────────────────

function SubjectColumn({ subject, contents, canDelete, onDelete, onAddContent, onOpenContent, onDeleteContent }: {
  subject: Subject; contents: StudyContent[]; canDelete: boolean
  onDelete: () => void; onAddContent: () => void
  onOpenContent: (c: StudyContent) => void; onDeleteContent: (id: string) => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const pendingCount = contents.filter(isCurrentlyPending).length
  const sorted = [...contents].sort((a, b) => {
    // pending=2 > active=1 > mastered=0
    const rank = (c: StudyContent) => isCurrentlyPending(c) ? 2 : c.status === 'mastered' ? 0 : 1
    const diff = rank(b) - rank(a)
    if (diff !== 0) return diff
    return new Date(b.studied_at).getTime() - new Date(a.studied_at).getTime()
  })

  return (
    <div className="flex-shrink-0 flex flex-col rounded-2xl overflow-hidden"
      style={{ width: 240, background: '#16161f', border: '1px solid #1e1e2e', borderTop: `4px solid ${subject.color}`, maxHeight: '100%' }}>
      <div className="flex-shrink-0 px-3 pt-3 pb-2.5"
        style={{ background: subject.color + '12', borderBottom: '1px solid #1e1e2e' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{subject.name}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {contents.length} conteúdo{contents.length !== 1 ? 's' : ''}
              {pendingCount > 0 && <span className="ml-1 font-semibold" style={{ color: '#f59e0b' }}>· {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}</span>}
            </p>
          </div>
          {canDelete && (
            confirmDel ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs text-slate-500">Apagar?</span>
                <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 font-semibold">Sim</button>
                <button onClick={() => setConfirmDel(false)} className="text-xs text-slate-600 hover:text-slate-400">Não</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)}
                className="flex-shrink-0 p-1 text-slate-700 hover:text-red-400 transition-colors" title="Excluir matéria">
                <Trash2 size={13} />
              </button>
            )
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1.5 min-h-0">
        <AnimatePresence mode="popLayout">
          {sorted.map((c) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.12 }}>
              <ContentCard content={c} onOpenDetail={() => onOpenContent(c)} onDelete={() => onDeleteContent(c.id)} />
            </motion.div>
          ))}
        </AnimatePresence>
        {sorted.length === 0 && <p className="text-xs text-slate-700 py-6 text-center leading-relaxed">Nenhum conteúdo ainda.</p>}
      </div>
      <div className="flex-shrink-0 p-2 border-t border-[#1e1e2e]">
        <button onClick={onAddContent}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-colors"
          style={{ color: subject.color, background: subject.color + '12' }}>
          <Plus size={13} />Conteúdo
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENDA DE ESTUDOS COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── StudySessionModal ─────────────────────────────────────────────────────────

interface SessionForm {
  subjectId: string
  title: string
  durationHours: number
}

function StudySessionModal({ open, subjects, initial, mode, onClose, onSave }: {
  open: boolean; subjects: Subject[]; initial?: Partial<SessionForm>
  mode: 'create' | 'edit'; onClose: () => void
  onSave: (f: SessionForm) => void
}) {
  const defaultForm: SessionForm = {
    subjectId: subjects[0]?.id ?? '',
    title: '',
    durationHours: 1,
    ...initial,
  }
  const [form, setForm] = useState<SessionForm>(defaultForm)

  useEffect(() => {
    if (open) setForm({ ...defaultForm, ...initial })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function upd<K extends keyof SessionForm>(k: K, v: SessionForm[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const selectedSubject = subjects.find((s) => s.id === form.subjectId)

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="sess-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div key="sess-modal" initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.18 }} style={{ width: '100%', maxWidth: 400 }}
            onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl shadow-2xl" style={{ background: '#1a1a24', border: '1px solid #2a2a3e' }}>
              <div className="flex items-center justify-between px-6 pt-5 pb-4">
                <h2 className="font-bold text-white text-lg">
                  {mode === 'create' ? 'Nova sessão de estudo' : 'Editar sessão'}
                </h2>
                <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"><X size={16} /></button>
              </div>
              <div className="px-6 pb-6 flex flex-col gap-4">
                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Matéria</label>
                  {subjects.length === 0 ? (
                    <p className="text-xs text-slate-600">Crie uma matéria na aba "Matérias" primeiro.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {subjects.map((s) => (
                        <button key={s.id} type="button" onClick={() => upd('subjectId', s.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                          style={{
                            background: form.subjectId === s.id ? s.color + '30' : '#2a2a3e',
                            color: form.subjectId === s.id ? s.color : '#64748b',
                            border: `1px solid ${form.subjectId === s.id ? s.color + '60' : 'transparent'}`,
                          }}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Título da sessão <span className="text-slate-600">(opcional)</span>
                  </label>
                  <input type="text" value={form.title} autoFocus
                    onChange={(e) => upd('title', e.target.value)}
                    placeholder={selectedSubject ? `Ex: Revisão de ${selectedSubject.name}` : 'Ex: Revisão geral'}
                    className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-2.5 focus:outline-none focus:border-violet-500/60 placeholder-slate-600" />
                </div>
                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Duração</label>
                  <select value={form.durationHours} onChange={(e) => upd('durationHours', Number(e.target.value))}
                    className="w-full rounded-xl bg-[#13131a] border border-[#2a2a3e] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-violet-500/60 transition-colors">
                    {DURATION_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d === 0.5 ? '30 min' : d === 1 ? '1 hora' : `${d} horas`}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => subjects.length > 0 && onSave(form)}
                  disabled={subjects.length === 0}
                  className="py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                  {mode === 'create' ? 'Adicionar ao pool' : 'Salvar'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Pool session card (left panel) ────────────────────────────────────────────

function PoolSessionCard({ item, onEdit, onDelete }: {
  item: StudyAgendaItem; onEdit: () => void; onDelete: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const isReview = item.is_review === true
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-sess-${item.id}`,
    data: { itemId: item.id, fromPool: true },
  })

  return (
    <div ref={setNodeRef} {...(!confirmDel ? { ...attributes, ...listeners } : {})}
      className="rounded-xl p-2.5 flex flex-col gap-1 select-none"
      style={{
        background: isReview ? '#1a1208' : '#1a1a24',
        border: '1px solid #2a2a3e',
        borderLeft: isReview ? '3px solid #f59e0b' : `3px solid ${item.subject_color}`,
        opacity: isDragging ? 0.25 : 1,
        cursor: confirmDel ? 'default' : 'grab',
        touchAction: 'none',
      }}>
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate"
            style={{ color: isReview ? '#94a3b8' : item.subject_color }}>
            {item.subject_name}
          </p>
          <p className="text-xs font-bold text-white leading-snug break-words mt-0.5">
            {item.content_title || item.subject_name}
          </p>
        </div>
        {isReview && item.review_stage && (
          <span className="flex-shrink-0 font-bold leading-none rounded-full px-1.5 py-0.5"
            style={{ background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44', fontSize: 9 }}>
            🔁 Rev. {item.review_stage}
          </span>
        )}
      </div>
      <p className="text-xs" style={{ color: isReview ? '#92400e' : '#475569' }}>
        {item.duration_hours === 0.5 ? '30 min' : `${item.duration_hours}h`}
      </p>
      {confirmDel ? (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500">Apagar?</span>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-300 font-semibold">Sim</button>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setConfirmDel(false)}
            className="text-xs text-slate-500 hover:text-slate-300">Não</button>
        </div>
      ) : (
        <div className="flex items-center gap-1 mt-0.5 justify-end">
          <button onPointerDown={(e) => e.stopPropagation()} onClick={onEdit}
            className="text-xs text-slate-600 hover:text-violet-400 transition-colors px-1">editar</button>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setConfirmDel(true)}
            className="p-0.5 text-slate-700 hover:text-red-400 transition-colors"><Trash2 size={10} /></button>
        </div>
      )}
    </div>
  )
}

// ── Grid session card (calendar) ──────────────────────────────────────────────

function GridSessionCard({ item, onEdit, onDelete }: {
  item: StudyAgendaItem; onEdit: () => void; onDelete: () => void
}) {
  if (!item.start_time) return null
  const top      = timeToY(item.start_time)
  const height   = Math.max(item.duration_hours * HOUR_H, 28)
  const isReview = item.is_review === true
  const color    = isReview ? '#f59e0b' : item.subject_color
  const isShort  = height < 52

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `grid-sess-${item.id}`,
    data: { itemId: item.id, day: item.scheduled_day, startTime: item.start_time, fromGrid: true },
  })

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{
        position: 'absolute', top, height, left: 3, right: 3,
        background: isReview ? '#f59e0b18' : color + '20',
        border: `1.5px solid ${color}55`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 7,
        padding: isShort ? '3px 6px' : '5px 7px',
        opacity: isDragging ? 0.2 : 1,
        touchAction: 'none', cursor: 'grab', overflow: 'hidden', zIndex: 2,
        boxShadow: `0 2px 6px ${color}18`,
      }}
      onClick={(e) => { e.stopPropagation(); onEdit() }}>
      <div className="flex items-center gap-1 min-w-0">
        <p className="truncate font-semibold leading-tight flex-1" style={{ color, fontSize: 11 }}>
          {item.content_title || item.subject_name}
        </p>
        {isReview && item.review_stage && (
          <span style={{ color, fontSize: 9, flexShrink: 0, fontWeight: 700 }}>
            🔁{item.review_stage}
          </span>
        )}
      </div>
      {!isShort && (
        <p className="truncate" style={{ color: color + 'aa', fontSize: 10, marginTop: 2 }}>
          {formatRange(item.start_time, item.duration_hours)}
        </p>
      )}
      {!isShort && height >= 72 && (
        <button onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute bottom-1.5 right-1.5 p-0.5 rounded transition-colors"
          style={{ color: '#64748b' }} title="Excluir">
          <Trash2 size={9} />
        </button>
      )}
    </div>
  )
}

// ── Droppable study grid column ────────────────────────────────────────────────

function StudyGridColumn({ day, isToday, children }: { day: number; isToday: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `study-col-${day}` })
  return (
    <div ref={setNodeRef} className="relative flex-1" style={{ minWidth: 100, height: GRID_H }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: isOver ? '#1e1e32' : isToday ? '#17171f' : 'transparent',
        borderLeft: `1px solid ${isToday ? '#7c3aed28' : '#1e1e2e'}`,
        transition: 'background 0.1s', pointerEvents: 'none',
      }} />
      {Array.from({ length: TOTAL_HOURS }, (_, hi) => (
        <div key={hi} style={{ pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: hi * HOUR_H, left: 0, right: 0, height: 1, background: '#1e1e2e' }} />
          <div style={{ position: 'absolute', top: hi * HOUR_H + HOUR_H / 2, left: 0, right: 0, height: 1, background: '#17171f' }} />
        </div>
      ))}
      {children}
    </div>
  )
}

// ── Droppable study pool ───────────────────────────────────────────────────────

function DroppableStudyPool({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'study-pool' })
  return (
    <div ref={setNodeRef} style={{
      minHeight: 64, borderRadius: 12,
      background: isOver ? '#1c1a2e' : 'transparent',
      border: `1px dashed ${isOver ? '#7c3aed55' : 'transparent'}`,
      padding: isOver ? 6 : 0,
      transition: 'all 0.1s',
    }}>
      {children}
    </div>
  )
}

// ── AgendaEstudos (full study calendar) ───────────────────────────────────────

function AgendaEstudos({ subjects }: { subjects: Subject[] }) {
  const { items, addItem, updateItem, removeItem } = useEstudosAgendaStore()
  const { contents } = useEstudosStore()

  const todayDay  = new Date().getDay()
  const weekDays  = useMemo(() => getWeekDays(), [])

  // Modal
  const [showModal,      setShowModal]      = useState(false)
  const [editingItemId,  setEditingItemId]  = useState<string | null>(null)
  const [modalInitial,   setModalInitial]   = useState<Partial<SessionForm>>({})

  // DnD
  const [draggingId,      setDraggingId]      = useState<string | null>(null)
  const draggingItemRef   = useRef<StudyAgendaItem | null>(null)
  const pointerYRef       = useRef(0)
  const gridScrollRef     = useRef<HTMLDivElement>(null)

  // Now indicator
  const [nowY, setNowY] = useState(getNowY())
  useEffect(() => { const id = setInterval(() => setNowY(getNowY()), 60_000); return () => clearInterval(id) }, [])

  // Auto-scroll to current time
  useEffect(() => {
    if (gridScrollRef.current) gridScrollRef.current.scrollTop = Math.max(0, getNowY() - 160)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track pointer Y for drop-time calculation
  useEffect(() => {
    const track = (e: PointerEvent) => { pointerYRef.current = e.clientY }
    window.addEventListener('pointermove', track)
    return () => window.removeEventListener('pointermove', track)
  }, [])

  // Midnight toast
  const [midnightToast, setMidnightToast] = useState(false)
  useEffect(() => {
    function checkMidnight() {
      const now = new Date()
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        const pendingToday = contents.filter(isCurrentlyPending).length
        if (pendingToday > 0) setMidnightToast(true)
      }
    }
    const id = setInterval(checkMidnight, 60_000)
    return () => clearInterval(id)
  }, [contents])

  // Derived
  const poolItems = useMemo(
    () => items.filter((i) => i.scheduled_day === null),
    [items]
  )
  const gridItemsByDay = useMemo(() => {
    const map: Record<number, StudyAgendaItem[]> = {}
    for (let d = 0; d < 7; d++) map[d] = items.filter((i) => i.scheduled_day === d && i.start_time !== null)
    return map
  }, [items])

  // Pending content count (for midnight toast label)
  const pendingCount = useMemo(() => contents.filter(isCurrentlyPending).length, [contents])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingItemId(null)
    setModalInitial({ subjectId: subjects[0]?.id ?? '' })
    setShowModal(true)
  }

  function openEdit(item: StudyAgendaItem) {
    setEditingItemId(item.id)
    setModalInitial({ subjectId: item.subject_id, title: item.content_title, durationHours: item.duration_hours })
    setShowModal(true)
  }

  function handleSaveSession(form: SessionForm) {
    const subj = subjects.find((s) => s.id === form.subjectId)
    if (!subj) return
    const title = form.title.trim() || subj.name

    if (editingItemId) {
      updateItem(editingItemId, {
        subject_id: subj.id, subject_name: subj.name, subject_color: subj.color,
        content_title: title, duration_hours: form.durationHours,
      })
    } else {
      addItem({
        content_id: null, subject_id: subj.id, subject_name: subj.name,
        subject_color: subj.color, content_title: title,
        scheduled_day: null, start_time: null, duration_hours: form.durationHours,
      })
    }
    setShowModal(false)
    setEditingItemId(null)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setDraggingId(active.id as string)
    const data = active.data.current as { itemId: string }
    draggingItemRef.current = items.find((i) => i.id === data.itemId) ?? null
  }

  function handleDragEnd({ active, over, delta }: DragEndEvent) {
    setDraggingId(null)
    draggingItemRef.current = null
    if (!over) return

    const data = active.data.current as {
      itemId: string; fromPool?: boolean; fromGrid?: boolean; day?: number; startTime?: string
    }
    const item = items.find((i) => i.id === data.itemId)
    if (!item) return

    const overId = over.id.toString()

    if (overId === 'study-pool') {
      if (data.fromGrid) updateItem(data.itemId, { scheduled_day: null, start_time: null })
      return
    }

    if (overId.startsWith('study-col-')) {
      const targetDay = parseInt(overId.replace('study-col-', ''), 10)
      let newTime: string

      if (data.fromGrid && data.startTime !== undefined) {
        newTime = yToTime(timeToY(data.startTime) + delta.y)
      } else {
        // Subtract 16 px paddingTop so the visual 05:00 line maps to relY = 0
        const gridEl = gridScrollRef.current
        if (!gridEl) return
        const rect = gridEl.getBoundingClientRect()
        const relY = pointerYRef.current - rect.top + gridEl.scrollTop - 16
        newTime = yToTime(Math.max(0, relY))
      }
      updateItem(data.itemId, { scheduled_day: targetDay, start_time: newTime })
    }
  }

  const hourLabels = Array.from({ length: TOTAL_HOURS }, (_, i) => `${String((GRID_START_H + i) % 24).padStart(2,'0')}:00`)

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#0f0f13' }}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* ── Left pool panel ────────────────────────────────────────────── */}
        <div className="w-52 flex-shrink-0 flex flex-col overflow-hidden"
          style={{ background: '#13131a', borderRight: '1px solid #1e1e2e' }}>
          <div className="flex items-center justify-between px-3 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid #1e1e2e' }}>
            <h2 className="text-white font-semibold text-sm">Conteúdos</h2>
            <button onClick={openCreate}
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium px-2 py-1 rounded-lg hover:bg-violet-500/10 transition-colors">
              <Plus size={13} />Nova
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-3">
            <DroppableStudyPool>
              {poolItems.length === 0 ? (
                <p className="text-xs text-slate-700 py-6 text-center leading-relaxed">
                  Conteúdos de Matérias<br />aparecem aqui automaticamente.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <AnimatePresence mode="popLayout">
                    {poolItems.map((item) => (
                      <motion.div key={item.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.12 }}>
                        <PoolSessionCard item={item} onEdit={() => openEdit(item)} onDelete={() => removeItem(item.id)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </DroppableStudyPool>

            {/* Pending contents hint */}
            {pendingCount > 0 && (
              <div className="rounded-xl px-3 py-2.5" style={{ background: '#1e1a10', border: '1px solid #f59e0b33' }}>
                <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
                  🔔 {pendingCount} revisão{pendingCount !== 1 ? 'ões' : ''} pendente{pendingCount !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">Veja na aba Matérias.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Calendar week view ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Day header */}
          <div className="flex flex-shrink-0"
            style={{ borderBottom: '1px solid #1e1e2e', background: '#13131a', paddingLeft: TIME_GUTTER_W }}>
            {weekDays.map((date, i) => {
              const isToday = i === todayDay
              return (
                <div key={i} className="flex-1 flex flex-col items-center py-2"
                  style={{ borderLeft: `1px solid ${i > 0 ? '#1e1e2e' : 'transparent'}` }}>
                  <span className="text-xs font-medium mb-0.5" style={{ color: isToday ? '#a78bfa' : '#475569' }}>{DAYS[i]}</span>
                  <span className="text-sm font-bold leading-none flex items-center justify-center"
                    style={isToday ? { width: 26, height: 26, borderRadius: '50%', background: '#7c3aed', color: '#fff' } : { color: '#475569' }}>
                    {date.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Scrollable time grid */}
          <div ref={gridScrollRef} className="flex-1 overflow-auto">
            <div className="flex" style={{ minWidth: 560, height: GRID_H + 16, paddingTop: 16 }}>
              {/* Time gutter */}
              <div className="flex-shrink-0 relative" style={{ width: TIME_GUTTER_W, height: GRID_H }}>
                {hourLabels.map((label, i) => (
                  <div key={i} style={{ position: 'absolute', top: i * HOUR_H - 7, right: 8, fontSize: 10, color: '#334155', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
                    {label}
                  </div>
                ))}
              </div>
              {/* 7 day columns */}
              {weekDays.map((_, day) => {
                const isToday  = day === todayDay
                const dayItems = gridItemsByDay[day] ?? []
                return (
                  <StudyGridColumn key={day} day={day} isToday={isToday}>
                    {isToday && nowY >= 0 && nowY <= GRID_H && (
                      <div style={{ position: 'absolute', top: nowY, left: 0, right: 0, height: 2, background: '#ef4444', zIndex: 4, pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', left: -4, top: -3, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                      </div>
                    )}
                    {dayItems.map((item) => (
                      <GridSessionCard key={item.id} item={item} onEdit={() => openEdit(item)} onDelete={() => removeItem(item.id)} />
                    ))}
                  </StudyGridColumn>
                )
              })}
            </div>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={{ duration: 120, easing: 'ease' }}>
          {draggingId && draggingItemRef.current ? (
            <div className="rounded-xl px-3 py-2 shadow-2xl select-none pointer-events-none"
              style={{ background: '#1e1e2e', border: `1.5px solid ${draggingItemRef.current.subject_color}88`, minWidth: 120, opacity: 0.9, cursor: 'grabbing' }}>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: draggingItemRef.current.subject_color }} />
                <p className="text-xs font-semibold text-white truncate">{draggingItemRef.current.content_title || draggingItemRef.current.subject_name}</p>
              </div>
              <p className="text-xs mt-0.5 ml-3.5" style={{ color: draggingItemRef.current.subject_color + 'bb' }}>
                {draggingItemRef.current.duration_hours === 0.5 ? '30 min' : `${draggingItemRef.current.duration_hours}h`}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Midnight toast */}
      <AnimatePresence>
        {midnightToast && (
          <motion.div key="midnight-toast"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
            style={{ background: '#1a1a24', border: '1px solid #f59e0b55', minWidth: 320 }}>
            <span className="text-lg">📚</span>
            <p className="text-sm text-white font-medium flex-1">
              Você tem <span className="font-bold text-amber-400">{pendingCount}</span> conteúdo{pendingCount !== 1 ? 's' : ''} para revisar hoje
            </p>
            <button onClick={() => setMidnightToast(false)}
              className="p-1 text-slate-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session modal */}
      <StudySessionModal
        open={showModal} subjects={subjects}
        initial={modalInitial} mode={editingItemId ? 'edit' : 'create'}
        onClose={() => { setShowModal(false); setEditingItemId(null) }}
        onSave={handleSaveSession}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function Estudos() {
  const { subjects, contents, addSubject, deleteSubject, addContent, deleteContent, completeReview } =
    useEstudosStore()

  const [subTab, setSubTab] = useState<'materias' | 'agenda'>('materias')

  // Modal state (Matérias tab)
  const [showSubjectModal,  setShowSubjectModal]  = useState(false)
  const [addContentSubject, setAddContentSubject] = useState<Subject | null>(null)
  const [detailContent,     setDetailContent]     = useState<StudyContent | null>(null)

  // Re-render ticker for relative times
  const [, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 60_000); return () => clearInterval(id) }, [])

  const pendingContents = useMemo(() => contents.filter(isCurrentlyPending), [contents])

  const contentsBySubject = useMemo(() => {
    const map: Record<string, StudyContent[]> = {}
    for (const s of subjects) map[s.id] = []
    for (const c of contents) { if (map[c.subject_id]) map[c.subject_id].push(c) }
    return map
  }, [subjects, contents])

  function canDeleteSubject(subjectId: string): boolean {
    return (contentsBySubject[subjectId] ?? []).every((c) => c.status === 'mastered')
  }

  function getSubjectOf(c: StudyContent | null): Subject | null {
    if (!c) return null
    return subjects.find((s) => s.id === c.subject_id) ?? null
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0f0f13' }}>

      {/* ── Page header with sub-tabs ──────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid #1e1e2e' }}>
        <div>
          <h1 className="text-xl font-bold text-white">Estudos</h1>
          <p className="text-xs text-slate-600 mt-0.5">Revisão espaçada · Agenda semanal</p>
        </div>

        {/* Sub-tab buttons */}
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: '#1a1a24', border: '1px solid #2a2a3e' }}>
          <button onClick={() => setSubTab('materias')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: subTab === 'materias' ? '#7c3aed' : 'transparent',
              color: subTab === 'materias' ? '#fff' : '#64748b',
            }}>
            <BookOpen size={14} />Matérias
          </button>
          <button onClick={() => setSubTab('agenda')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: subTab === 'agenda' ? '#7c3aed' : 'transparent',
              color: subTab === 'agenda' ? '#fff' : '#64748b',
            }}>
            <CalendarDays size={14} />Agenda
          </button>
        </div>

        {/* Action button — only in Matérias tab */}
        {subTab === 'materias' && (
          <button onClick={() => setShowSubjectModal(true)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors">
            <Plus size={15} />Matéria
          </button>
        )}
      </div>

      {/* ── MATÉRIAS TAB ───────────────────────────────────────────────── */}
      {subTab === 'materias' && (
        <>
          {/* Pending reviews */}
          <AnimatePresence>
            {pendingContents.length > 0 && (
              <motion.div key="pending-section" initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex-shrink-0 overflow-hidden" style={{ borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="px-6 py-4" style={{ background: 'rgba(245,158,11,0.05)' }}>
                  <p className="text-sm font-bold mb-3" style={{ color: '#f59e0b' }}>
                    🔔 Revisões Pendentes ({pendingContents.length})
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                    <AnimatePresence mode="popLayout">
                      {pendingContents.map((c) => {
                        const subj = getSubjectOf(c)
                        if (!subj) return null
                        return (
                          <PendingCard key={c.id} content={c} subject={subj}
                            onAction={(id, action) => completeReview(id, action)}
                            onOpenDetail={() => setDetailContent(c)} />
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Subject columns */}
          {subjects.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BookOpen size={40} className="text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400 font-semibold">Nenhuma matéria ainda</p>
                <p className="text-slate-600 text-sm mt-1">Clique em "+ Matéria" para começar</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
              <div className="flex gap-4 px-6 py-4 h-full items-start" style={{ minWidth: 'max-content' }}>
                {subjects.map((subject) => (
                  <SubjectColumn key={subject.id} subject={subject}
                    contents={contentsBySubject[subject.id] ?? []}
                    canDelete={canDeleteSubject(subject.id)}
                    onDelete={() => deleteSubject(subject.id)}
                    onAddContent={() => setAddContentSubject(subject)}
                    onOpenContent={(c) => setDetailContent(c)}
                    onDeleteContent={(id) => deleteContent(id)} />
                ))}
              </div>
            </div>
          )}

          {/* Modals */}
          <SubjectModal open={showSubjectModal} onClose={() => setShowSubjectModal(false)}
            onSave={(data) => { addSubject(data); setShowSubjectModal(false) }} />
          <ContentModal open={addContentSubject !== null} subject={addContentSubject}
            onClose={() => setAddContentSubject(null)}
            onSave={(data) => {
              if (!addContentSubject) return
              addContent({ subject_id: addContentSubject.id, title: data.title, notes: data.notes })
              setAddContentSubject(null)
            }} />
          {detailContent && (
            <DetailModal content={detailContent} subject={getSubjectOf(detailContent)}
              onClose={() => setDetailContent(null)} />
          )}
        </>
      )}

      {/* ── AGENDA TAB ─────────────────────────────────────────────────── */}
      {subTab === 'agenda' && (
        <div className="flex-1 overflow-hidden">
          <AgendaEstudos subjects={subjects} />
        </div>
      )}
    </div>
  )
}
