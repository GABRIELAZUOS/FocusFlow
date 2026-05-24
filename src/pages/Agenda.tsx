import { useState, useMemo, useRef, useEffect } from 'react'
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
import { Plus, Trash2, X, Star, Timer as TimerIcon } from 'lucide-react'
import { useAgendaStore } from '../store/agendaStore'
import { getEffectiveStartTime } from '../hooks/useAgendaSync'
import type { AgendaItem } from '../store/agendaStore'
import { useKanbanStore } from '../store/kanbanStore'
import { usePomodoroStore } from '../store/pomodoroStore'

// ── Constants ──────────────────────────────────────────────────────────────────

const HOUR_H = 64                                    // px per hour
const GRID_START_H = 5                               // 05:00
const GRID_END_H = 24                                // 00:00 next day
const TOTAL_HOURS = GRID_END_H - GRID_START_H        // 19
const GRID_H = TOTAL_HOURS * HOUR_H                  // 1216
const TIME_GUTTER_W = 52                             // px width of left time labels
const SNAP_MINS = 30                                 // snap interval

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const PALETTE = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#db2777', '#0891b2', '#65a30d']
const DURATION_OPTIONS = [0.5, 1, 1.5, 2, 3, 4, 5, 6]

// ── Utilities ─────────────────────────────────────────────────────────────────

function timeToY(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return Math.max(0, ((h + m / 60) - GRID_START_H) * HOUR_H)
}

function yToTime(y: number): string {
  const clamped = Math.max(0, Math.min(y, (TOTAL_HOURS - 0.5) * HOUR_H))
  const totalMins = Math.round((clamped / HOUR_H) * 60)
  const snapped = Math.round(totalMins / SNAP_MINS) * SNAP_MINS
  const h = GRID_START_H + Math.floor(snapped / 60)
  const m = snapped % 60
  return `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatRange(start: string, hours: number): string {
  const [h, m] = start.split(':').map(Number)
  const endMins = h * 60 + m + Math.round(hours * 60)
  const eH = Math.floor(endMins / 60) % 24
  const eM = endMins % 60
  return `${start}–${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`
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
  return timeToY(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
}

/** Returns true if item should appear in the given day column */
function isOnGrid(item: AgendaItem, day: number): boolean {
  if (item.completed) return false
  if (item.is_fixed && item.repeat_days.length > 0) return item.repeat_days.includes(day)
  return item.scheduled_day === day
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-300 leading-snug">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-10 h-5 rounded-full transition-colors"
        style={{ background: checked ? '#7c3aed' : '#2a2a3e' }}
        role="switch"
        aria-checked={checked}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'none' }}
        />
      </button>
    </div>
  )
}

// ── Item Modal ─────────────────────────────────────────────────────────────────

interface ModalData {
  title: string
  startTime: string
  durationHours: number
  color: string
  isFixed: boolean
  repeatDays: number[]
  sendToBrainDump: boolean
  scheduledDay: number | null
}

const DEFAULT_MODAL: ModalData = {
  title: '',
  startTime: '09:00',
  durationHours: 1,
  color: PALETTE[0],
  isFixed: false,
  repeatDays: [],
  sendToBrainDump: false,
  scheduledDay: new Date().getDay(),
}

function ItemModal({
  open,
  onClose,
  initial,
  mode,
  onSave,
}: {
  open: boolean
  onClose: () => void
  initial?: Partial<ModalData>
  mode: 'create' | 'edit'
  onSave: (d: ModalData) => void
}) {
  const [form, setForm] = useState<ModalData>({ ...DEFAULT_MODAL, ...initial })

  useEffect(() => {
    if (open) setForm({ ...DEFAULT_MODAL, ...initial })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function upd<K extends keyof ModalData>(k: K, v: ModalData[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function toggleDay(d: number) {
    setForm((p) => ({
      ...p,
      repeatDays: p.repeatDays.includes(d)
        ? p.repeatDays.filter((x) => x !== d)
        : [...p.repeatDays, d].sort(),
    }))
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            key="modal-panel"
            initial={{ opacity: 0, scale: 0.95, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            transition={{ duration: 0.18 }}
            style={{ width: '100%', maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-2xl shadow-2xl"
              style={{ background: '#1a1a24', border: '1px solid #2a2a3e' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4">
                <h2 className="font-bold text-white text-lg">
                  {mode === 'create' ? 'Nova atividade' : 'Editar atividade'}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-6 pb-6 flex flex-col gap-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                    Título <span className="text-violet-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    autoFocus
                    onChange={(e) => upd('title', e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && form.title.trim() && onSave(form)
                    }
                    placeholder="Ex: Reunião de equipe"
                    className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-4 py-2.5 focus:outline-none focus:border-violet-500/60 placeholder-slate-600 transition-colors"
                  />
                </div>

                {/* Time + Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Horário
                    </label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => upd('startTime', e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-[#2a2a3e] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-violet-500/60 transition-colors"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Duração
                    </label>
                    <select
                      value={form.durationHours}
                      onChange={(e) => upd('durationHours', Number(e.target.value))}
                      className="w-full rounded-xl bg-[#13131a] border border-[#2a2a3e] text-white text-sm px-3 py-2.5 focus:outline-none focus:border-violet-500/60 transition-colors"
                    >
                      {DURATION_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d === 0.5 ? '30 min' : d === 1 ? '1 hora' : `${d} horas`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Cor</label>
                  <div className="flex gap-2 flex-wrap">
                    {PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => upd('color', c)}
                        className="w-7 h-7 rounded-full transition-all"
                        style={{
                          background: c,
                          transform: form.color === c ? 'scale(1.25)' : 'scale(1)',
                          boxShadow:
                            form.color === c
                              ? `0 0 0 2px #1a1a24, 0 0 0 4px ${c}`
                              : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Day picker (non-fixed items) */}
                {!form.isFixed && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Dia da semana
                    </label>
                    <div className="flex gap-1.5">
                      {DAYS.map((d, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => upd('scheduledDay', form.scheduledDay === i ? null : i)}
                          className="w-8 h-8 rounded-lg text-xs font-bold transition-colors flex-shrink-0"
                          style={{
                            background: form.scheduledDay === i ? form.color : '#2a2a3e',
                            color: form.scheduledDay === i ? '#fff' : '#64748b',
                          }}
                        >
                          {d[0]}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {form.scheduledDay !== null
                        ? `Agendado para ${DAYS[form.scheduledDay]}`
                        : 'Sem dia definido — ficará no pool'}
                    </p>
                  </div>
                )}

                {/* Fixed toggle */}
                <Toggle
                  checked={form.isFixed}
                  onChange={(v) => {
                    upd('isFixed', v)
                    if (v) upd('scheduledDay', null)
                  }}
                  label="Atividade fixa (repetir toda semana)?"
                />

                {/* Repeat days (only when fixed) */}
                {form.isFixed && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Repetir em
                    </label>
                    <div className="flex gap-1.5">
                      {DAYS.map((d, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleDay(i)}
                          className="w-8 h-8 rounded-lg text-xs font-bold transition-colors flex-shrink-0"
                          style={{
                            background: form.repeatDays.includes(i) ? form.color : '#2a2a3e',
                            color: form.repeatDays.includes(i) ? '#fff' : '#64748b',
                          }}
                        >
                          {d[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Brain dump toggle (create only) */}
                {mode === 'create' && (
                  <Toggle
                    checked={form.sendToBrainDump}
                    onChange={(v) => upd('sendToBrainDump', v)}
                    label="Adicionar ao Brain Dump também?"
                  />
                )}

                <button
                  onClick={() => form.title.trim() && onSave(form)}
                  disabled={!form.title.trim()}
                  className="py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                >
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

// ── Pool card ──────────────────────────────────────────────────────────────────

function PoolCard({
  item,
  onEdit,
  onDelete,
}: {
  item: AgendaItem
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-${item.id}`,
    data: { itemId: item.id, fromPool: true },
  })
  const color = item.color ?? '#7c3aed'

  return (
    <div
      ref={setNodeRef}
      {...(!confirmDel ? { ...attributes, ...listeners } : {})}
      className="rounded-xl p-2.5 flex flex-col gap-1 select-none"
      style={{
        background: '#1a1a24',
        border: `1px solid ${color}44`,
        opacity: isDragging ? 0.25 : 1,
        cursor: confirmDel ? 'default' : 'grab',
        touchAction: 'none',
      }}
    >
      <div className="flex items-start gap-1.5">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: color }}
        />
        <p className="text-xs text-slate-200 flex-1 leading-snug break-words min-w-0">
          {item.title}
        </p>
        {item.is_fixed && (
          <Star size={10} className="text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" />
        )}
      </div>

      {item.pomodoro_count != null && (
        <p className="text-xs text-slate-600 ml-3.5">
          🍅 {item.pomodoro_count} pomodoro{item.pomodoro_count !== 1 ? 's' : ''}
        </p>
      )}

      {confirmDel ? (
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500">Apagar?</span>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-300 font-semibold"
          >
            Sim
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setConfirmDel(false)}
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            Não
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 mt-0.5 justify-end">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onEdit}
            className="text-xs text-slate-600 hover:text-violet-400 transition-colors px-1"
          >
            editar
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setConfirmDel(true)}
            className="p-0.5 text-slate-700 hover:text-red-400 transition-colors"
          >
            <Trash2 size={10} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Grid card ──────────────────────────────────────────────────────────────────

function GridCard({
  item,
  day,
  onEdit,
  onDelete,
  onFocus,
}: {
  item: AgendaItem
  day: number
  onEdit: () => void
  onDelete: () => void
  onFocus: () => void
}) {
  const startTime = getEffectiveStartTime(item, day)
  if (!startTime) return null

  const top = timeToY(startTime)
  const durationH = item.duration_hours ?? 0.5
  const height = Math.max(durationH * HOUR_H, 28)
  const color = item.color ?? '#7c3aed'
  const isShort = height < 52

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `grid-${item.id}-${day}`,
    data: { itemId: item.id, day, startTime, fromGrid: true },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        position: 'absolute',
        top,
        height,
        left: 3,
        right: 3,
        background: color + '18',
        border: `1.5px solid ${color}55`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 7,
        padding: isShort ? '3px 6px' : '5px 7px',
        opacity: isDragging ? 0.2 : 1,
        touchAction: 'none',
        cursor: 'grab',
        overflow: 'hidden',
        zIndex: 2,
        boxShadow: `0 2px 6px ${color}18`,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onEdit()
      }}
    >
      <p
        className="truncate font-semibold leading-tight"
        style={{ color, fontSize: 11 }}
      >
        {item.title}
      </p>
      {!isShort && (
        <p
          className="truncate"
          style={{ color: color + 'aa', fontSize: 10, marginTop: 2 }}
        >
          {formatRange(startTime, durationH)}
          {item.pomodoro_count ? ` · 🍅${item.pomodoro_count}` : ''}
        </p>
      )}
      {!isShort && height >= 72 && (
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onFocus()
            }}
            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium transition-colors"
            style={{ background: color + '33', color }}
            title="Iniciar sessão de foco"
          >
            <TimerIcon size={9} />
            Focar
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-0.5 rounded transition-colors"
            style={{ color: '#64748b' }}
            title="Excluir"
          >
            <Trash2 size={9} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Droppable grid column ──────────────────────────────────────────────────────

function GridColumn({
  day,
  isToday,
  children,
}: {
  day: number
  isToday: boolean
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `grid-col-${day}` })

  return (
    <div
      ref={setNodeRef}
      className="relative flex-1"
      style={{ minWidth: 100, height: GRID_H }}
    >
      {/* Background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isOver
            ? '#1e1e32'
            : isToday
            ? '#17171f'
            : 'transparent',
          borderLeft: `1px solid ${isToday ? '#7c3aed28' : '#1e1e2e'}`,
          transition: 'background 0.1s',
          pointerEvents: 'none',
        }}
      />
      {/* Hour lines */}
      {Array.from({ length: TOTAL_HOURS }, (_, hi) => (
        <div key={hi} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              top: hi * HOUR_H,
              left: 0,
              right: 0,
              height: 1,
              background: '#1e1e2e',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: hi * HOUR_H + HOUR_H / 2,
              left: 0,
              right: 0,
              height: 1,
              background: '#17171f',
            }}
          />
        </div>
      ))}
      {children}
    </div>
  )
}

// ── Droppable pool ─────────────────────────────────────────────────────────────

function DroppablePool({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool' })

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 64,
        borderRadius: 12,
        background: isOver ? '#1c1a2e' : 'transparent',
        border: `1px dashed ${isOver ? '#7c3aed55' : 'transparent'}`,
        padding: isOver ? 6 : 0,
        transition: 'all 0.1s',
      }}
    >
      {children}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Agenda() {
  const { items, addItem, deleteItem, updateItem } = useAgendaStore()
  const { tasks, addTask, deleteTask } = useKanbanStore()

  const todayDay = new Date().getDay()
  const weekDays = useMemo(() => getWeekDays(), [])

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null)
  const [modalInitial, setModalInitial] = useState<Partial<ModalData>>({})

  // DnD
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const draggingItemRef = useRef<AgendaItem | null>(null)
  const pointerYRef = useRef(0)
  const gridScrollRef = useRef<HTMLDivElement>(null)

  // After item creation: scroll grid to show the new item's time position
  const [scrollToY, setScrollToY] = useState<number | null>(null)
  useEffect(() => {
    if (scrollToY !== null && gridScrollRef.current) {
      // +16 = paddingTop offset; -120 = show item 120px from viewport top
      gridScrollRef.current.scrollTo({ top: Math.max(0, scrollToY + 16 - 120), behavior: 'smooth' })
      setScrollToY(null)
    }
  }, [scrollToY])

  // Now indicator
  const [nowY, setNowY] = useState(getNowY())
  useEffect(() => {
    const id = setInterval(() => setNowY(getNowY()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Scroll to current time on mount
  useEffect(() => {
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollTop = Math.max(0, getNowY() - 160)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track pointer Y for drop-time calculation
  useEffect(() => {
    const track = (e: PointerEvent) => {
      pointerYRef.current = e.clientY
    }
    window.addEventListener('pointermove', track)
    return () => window.removeEventListener('pointermove', track)
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────────

  const visibleItems = useMemo(() => items.filter((i) => !i.completed), [items])

  const poolItems = useMemo(
    () => visibleItems.filter((i) => {
      if (i.is_fixed && i.repeat_days.length > 0) return false
      return i.scheduled_day === null
    }),
    [visibleItems]
  )

  const gridItemsByDay = useMemo(() => {
    const map: Record<number, AgendaItem[]> = {}
    for (let d = 0; d < 7; d++) {
      map[d] = visibleItems.filter((i) => isOnGrid(i, d))
    }
    return map
  }, [visibleItems])

  const availableBrainDumpTasks = useMemo(() => {
    const linked = new Set(
      items.filter((i) => i.brain_dump_task_id).map((i) => i.brain_dump_task_id)
    )
    return tasks.filter((t) => t.column === 'brain_dump' && !linked.has(t.id))
  }, [tasks, items])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function openCreate(partial?: Partial<ModalData>) {
    // Compute defaults at call time so they're always fresh (not stale module-load values)
    const now = new Date()
    const h   = now.getHours()
    const m   = now.getMinutes() >= 30 ? 30 : 0
    const currentTime = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`

    setEditingItem(null)
    setModalInitial({
      scheduledDay: now.getDay(),
      startTime:    currentTime,
      ...partial,
    })
    setShowModal(true)
  }

  function openEdit(item: AgendaItem) {
    setEditingItem(item)
    setModalInitial({
      title: item.title,
      startTime: item.start_time ?? '09:00',
      durationHours: item.duration_hours ?? 1,
      color: item.color ?? PALETTE[0],
      isFixed: item.is_fixed,
      repeatDays: [...item.repeat_days],
      scheduledDay: item.scheduled_day,
    })
    setShowModal(true)
  }

  function handleSave(data: ModalData) {
    if (editingItem) {
      updateItem(editingItem.id, {
        title: data.title,
        start_time: data.startTime,
        duration_hours: data.durationHours,
        color: data.color,
        is_fixed: data.isFixed,
        repeat_days: data.isFixed ? data.repeatDays : [],
        scheduled_day: data.isFixed ? null : data.scheduledDay,
      })
    } else {
      let brainDumpTaskId: string | null = null
      if (data.sendToBrainDump) {
        const t = addTask(data.title, 'brain_dump')
        brainDumpTaskId = t.id
      }
      addItem({
        title: data.title,
        start_time: data.startTime,
        duration_hours: data.durationHours,
        color: data.color,
        is_fixed: data.isFixed,
        repeat_days: data.isFixed ? data.repeatDays : [],
        send_to_brain_dump: data.sendToBrainDump,
        brain_dump_task_id: brainDumpTaskId,
        scheduled_day: data.isFixed ? null : data.scheduledDay,
      })

      // Scroll grid to reveal the newly created item if it was placed on the grid
      if (data.scheduledDay !== null && !data.isFixed && data.startTime) {
        setScrollToY(timeToY(data.startTime))
      }
    }
    setShowModal(false)
    setEditingItem(null)
  }

  function handleDelete(itemId: string) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    if (item.today_task_id) deleteTask(item.today_task_id)
    deleteItem(itemId)
  }

  function handleFocus(item: AgendaItem) {
    // Ensure there's a kanban 'today' task linked
    let taskId = item.today_task_id
    if (!taskId) {
      const t = addTask(item.title, 'today')
      taskId = t.id
      updateItem(item.id, { today_task_id: taskId })
    }
    usePomodoroStore.getState().start(taskId)
  }

  // ── DnD ───────────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

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
      itemId: string
      fromPool?: boolean
      fromGrid?: boolean
      day?: number
      startTime?: string
    }
    const item = items.find((i) => i.id === data.itemId)
    if (!item) return

    const overId = over.id.toString()

    // ── Dropped on pool → remove from grid
    if (overId === 'pool') {
      if (data.fromGrid) {
        updateItem(data.itemId, { start_time: null, scheduled_day: null })
      }
      return
    }

    // ── Dropped on a grid column
    if (overId.startsWith('grid-col-')) {
      const targetDay = parseInt(overId.replace('grid-col-', ''), 10)

      let newTime: string

      if (data.fromGrid && data.startTime !== undefined) {
        // Dragging within/between grid columns: apply delta to original Y
        const oldY = timeToY(data.startTime)
        newTime = yToTime(oldY + delta.y)
      } else {
        // Dragging from pool: compute Y relative to the scrollable grid content.
        // Subtract GRID_PADDING_TOP (16 px) so that dropping at the visual
        // start of the 05:00 row maps to relY = 0, not relY = 16.
        const gridEl = gridScrollRef.current
        if (!gridEl) return
        const rect = gridEl.getBoundingClientRect()
        const relY = pointerYRef.current - rect.top + gridEl.scrollTop - 16
        newTime = yToTime(Math.max(0, relY))
      }

      if (item.is_fixed && item.repeat_days.length > 0) {
        // Fixed item with repeat_days: update time override for this day
        const newDayTimes = { ...item.day_start_times, [targetDay]: newTime }
        const newRepeatDays = item.repeat_days.includes(targetDay)
          ? item.repeat_days
          : [...item.repeat_days, targetDay].sort()
        updateItem(data.itemId, {
          day_start_times: newDayTimes,
          repeat_days: newRepeatDays,
          start_time: item.start_time ?? newTime,
        })
      } else {
        // Regular or fixed-without-repeat: update scheduled_day + start_time
        updateItem(data.itemId, { scheduled_day: targetDay, start_time: newTime })

        // Auto-create kanban 'today' task if dropped on today
        const refreshed = useAgendaStore.getState().items.find((i) => i.id === data.itemId)
        if (
          targetDay === todayDay &&
          refreshed &&
          !refreshed.today_task_id &&
          !refreshed.completed
        ) {
          const kt = addTask(item.title, 'today')
          updateItem(data.itemId, { today_task_id: kt.id })
        }
      }
    }
  }

  // ── Hour labels ───────────────────────────────────────────────────────────────

  const hourLabels = Array.from({ length: TOTAL_HOURS }, (_, i) => {
    const h = GRID_START_H + i
    return `${String(h % 24).padStart(2, '0')}:00`
  })

  // ── Render ─────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#0f0f13' }}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* ── Left activities panel ──────────────────────────────────────── */}
        <div
          className="w-52 flex-shrink-0 flex flex-col overflow-hidden"
          style={{ background: '#13131a', borderRight: '1px solid #1e1e2e' }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-3 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid #1e1e2e' }}
          >
            <h2 className="text-white font-semibold text-sm">Atividades</h2>
            <button
              onClick={() => openCreate()}
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium px-2 py-1 rounded-lg hover:bg-violet-500/10 transition-colors"
            >
              <Plus size={13} />
              Nova
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-3">
            {/* Unscheduled / pool */}
            <DroppablePool>
              {poolItems.length === 0 ? (
                <p className="text-xs text-slate-700 py-6 text-center leading-relaxed">
                  Sem atividades.
                  <br />
                  Clique em "Nova" ou arraste aqui.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <AnimatePresence mode="popLayout">
                    {poolItems.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                      >
                        <PoolCard
                          item={item}
                          onEdit={() => openEdit(item)}
                          onDelete={() => handleDelete(item.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </DroppablePool>

            {/* Brain Dump suggestions */}
            {availableBrainDumpTasks.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p
                  className="text-xs font-semibold uppercase tracking-wider px-1"
                  style={{ color: '#334155' }}
                >
                  Do Brain Dump
                </p>
                {availableBrainDumpTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-1.5 rounded-xl px-2.5 py-2"
                    style={{ background: '#1a1a24', border: '1px solid #1e1e2e' }}
                  >
                    <p className="text-xs text-slate-400 flex-1 leading-snug break-words min-w-0">
                      {t.title}
                    </p>
                    <button
                      onClick={() =>
                        addItem({
                          title: t.title,
                          send_to_brain_dump: true,
                          brain_dump_task_id: t.id,
                          scheduled_day: null,
                        })
                      }
                      className="text-xs text-violet-500 hover:text-violet-300 font-medium flex-shrink-0 transition-colors whitespace-nowrap"
                    >
                      + Agenda
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Calendar week view ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Sticky day header */}
          <div
            className="flex flex-shrink-0"
            style={{
              borderBottom: '1px solid #1e1e2e',
              background: '#13131a',
              paddingLeft: TIME_GUTTER_W,
            }}
          >
            {weekDays.map((date, i) => {
              const isToday = i === todayDay
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center py-2"
                  style={{
                    borderLeft: `1px solid ${i > 0 ? '#1e1e2e' : 'transparent'}`,
                  }}
                >
                  <span
                    className="text-xs font-medium mb-0.5"
                    style={{ color: isToday ? '#a78bfa' : '#475569' }}
                  >
                    {DAYS[i]}
                  </span>
                  <span
                    className="text-sm font-bold leading-none flex items-center justify-center"
                    style={
                      isToday
                        ? {
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: '#7c3aed',
                            color: '#fff',
                          }
                        : { color: '#475569' }
                    }
                  >
                    {date.getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Scrollable time grid */}
          <div ref={gridScrollRef} className="flex-1 overflow-auto">
            <div
              className="flex"
              style={{ minWidth: 560, height: GRID_H + 16, paddingTop: 16 }}
            >
              {/* Time gutter */}
              <div
                className="flex-shrink-0 relative"
                style={{ width: TIME_GUTTER_W, height: GRID_H }}
              >
                {hourLabels.map((label, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: i * HOUR_H - 7,
                      right: 8,
                      fontSize: 10,
                      color: '#334155',
                      lineHeight: 1,
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* 7 day columns */}
              {weekDays.map((_, day) => {
                const isToday = day === todayDay
                const dayItems = gridItemsByDay[day] ?? []

                return (
                  <GridColumn key={day} day={day} isToday={isToday}>
                    {/* "Now" indicator (today only) */}
                    {isToday && nowY >= 0 && nowY <= GRID_H && (
                      <div
                        style={{
                          position: 'absolute',
                          top: nowY,
                          left: 0,
                          right: 0,
                          height: 2,
                          background: '#ef4444',
                          zIndex: 4,
                          pointerEvents: 'none',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: -4,
                            top: -3,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#ef4444',
                          }}
                        />
                      </div>
                    )}

                    {/* Placed items */}
                    {dayItems.map((item) => (
                      <GridCard
                        key={`${item.id}-${day}`}
                        item={item}
                        day={day}
                        onEdit={() => openEdit(item)}
                        onDelete={() => handleDelete(item.id)}
                        onFocus={() => handleFocus(item)}
                      />
                    ))}
                  </GridColumn>
                )
              })}
            </div>
          </div>
        </div>

        {/* Drag ghost overlay */}
        <DragOverlay dropAnimation={{ duration: 120, easing: 'ease' }}>
          {draggingId && draggingItemRef.current ? (
            <div
              className="rounded-xl px-3 py-2 shadow-2xl select-none pointer-events-none"
              style={{
                background: '#1e1e2e',
                border: `1.5px solid ${draggingItemRef.current.color ?? '#7c3aed'}88`,
                minWidth: 120,
                opacity: 0.9,
                cursor: 'grabbing',
              }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: draggingItemRef.current.color ?? '#7c3aed' }}
                />
                <p className="text-xs font-semibold text-white truncate">
                  {draggingItemRef.current.title}
                </p>
              </div>
              {draggingItemRef.current.duration_hours != null && (
                <p
                  className="text-xs mt-0.5"
                  style={{
                    color: (draggingItemRef.current.color ?? '#7c3aed') + 'bb',
                    marginLeft: 14,
                  }}
                >
                  {draggingItemRef.current.duration_hours === 0.5
                    ? '30 min'
                    : `${draggingItemRef.current.duration_hours}h`}
                </p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Item modal */}
      <ItemModal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingItem(null)
        }}
        initial={modalInitial}
        mode={editingItem ? 'edit' : 'create'}
        onSave={handleSave}
      />
    </div>
  )
}
