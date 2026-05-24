import type { MoodRecord, MoodAlert } from '../store/moodStore'
import { MOOD_OPTIONS } from '../store/moodStore'

// Minimal local types so this module doesn't depend on store imports
interface AnxietyLike {
  intensity: number
  created_at: string
}
interface SessionLike {
  completed: boolean
  started_at: string
}

const PERIOD_PT: Record<string, string> = {
  morning: 'manhã',
  afternoon: 'tarde',
  evening: 'noite',
}

// ── One-per-day guard ─────────────────────────────────────────────────────────

const ANALYSIS_DATE_KEY = 'focusflow-mood-analysis-date'

export function shouldRunAnalysis(): boolean {
  const stored = localStorage.getItem(ANALYSIS_DATE_KEY)
  if (!stored) return true
  return new Date(stored).toDateString() !== new Date().toDateString()
}

export function markAnalysisRun(): void {
  localStorage.setItem(ANALYSIS_DATE_KEY, new Date().toISOString())
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function analyzeMoodForCrisis(
  records: MoodRecord[],
  anxietyRecords: AnxietyLike[],
  pomodoroSessions: SessionLike[],
): Promise<Omit<MoodAlert, 'id' | 'dismissed'> | null> {
  const apiKey = (import.meta.env.VITE_ANTHROPIC_API_KEY ?? '').trim()
  if (!apiKey) return null

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const recentMoods = records.filter((r) => new Date(r.recorded_at) >= sevenDaysAgo)
  if (recentMoods.length < 3) return null

  const moodSummary = [...recentMoods]
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
    .map((r) => {
      const opt = MOOD_OPTIONS.find((o) => o.id === r.mood)
      const dateStr = new Date(r.recorded_at).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
      const noteStr = r.note ? ` — "${r.note}"` : ''
      return `• ${dateStr} (${PERIOD_PT[r.period] ?? r.period}): ${opt?.emoji ?? ''} ${opt?.label ?? r.mood}${noteStr}`
    })
    .join('\n')

  const anxietySummary = anxietyRecords
    .filter((r) => new Date(r.created_at) >= sevenDaysAgo)
    .map((r) => `${r.intensity}/10`)
    .join(', ')

  const pomodoroCount = pomodoroSessions.filter(
    (s) => s.completed && new Date(s.started_at) >= sevenDaysAgo,
  ).length

  const prompt = `Você é um assistente de bem-estar. Analise os dados de humor dos últimos 7 dias.

REGISTROS DE HUMOR:
${moodSummary}

NÍVEIS DE ANSIEDADE: ${anxietySummary || 'sem registros'}
SESSÕES DE FOCO COMPLETADAS: ${pomodoroCount}

Responda APENAS com JSON válido neste exato formato (sem markdown):
{
  "severity": "low",
  "message": "mensagem empática em português (máx 120 caracteres)",
  "resources": []
}

Critérios de severity:
- "low": humor predominantemente positivo, tudo bem
- "medium": alguns dias difíceis, vale observar
- "high": padrão consistente de humor negativo
- "crisis": sofrimento intenso e recorrente

Para severity "low": resources = [].
Para outros níveis: inclua 1-2 recursos como "CVV: ligue 188" ou "Busque apoio de um profissional de saúde mental".`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const rawText: string = data.content?.[0]?.text ?? ''

    // Extract the first JSON object in the response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0]) as {
      severity?: string
      message?: string
      resources?: string[]
    }

    const validSeverities = ['low', 'medium', 'high', 'crisis']
    if (!parsed.severity || !validSeverities.includes(parsed.severity)) return null
    if (!parsed.message) return null

    return {
      severity: parsed.severity as MoodAlert['severity'],
      message: parsed.message,
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
      generated_at: new Date().toISOString(),
    }
  } catch {
    return null
  }
}
