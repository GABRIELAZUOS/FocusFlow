import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at'>
        Update: Partial<Omit<Task, 'id'>>
      }
      woops: {
        Row: Woop
        Insert: Omit<Woop, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Woop, 'id'>>
      }
      pomodoro_sessions: {
        Row: PomodoroSession
        Insert: Omit<PomodoroSession, 'id'>
        Update: Partial<Omit<PomodoroSession, 'id'>>
      }
      user_settings: {
        Row: UserSettings
        Insert: UserSettings
        Update: Partial<UserSettings>
      }
    }
  }
}

export type TaskColumn = 'inbox' | 'brain_dump' | 'today' | 'in_progress' | 'done'
export type EnergyLevel = 'low' | 'medium' | 'high'
export type EstimatedTime = '5min' | '15min' | '30min' | '1h' | '2h+'
export type PomodoroMode = 'classic' | 'sprint' | 'flow' | 'custom'
export type WoopStatus = 'active' | 'completed' | 'abandoned'

export interface Task {
  id: string
  user_id: string
  title: string
  column: TaskColumn
  energy_level: EnergyLevel | null
  estimated_time: EstimatedTime | null
  notes: string | null
  category_color: string | null
  woop_id: string | null
  position: number
  created_at: string
  completed_at: string | null
}

export interface Woop {
  id: string
  user_id: string
  wish: string
  outcome: string | null
  obstacle: string | null
  plan: string | null
  status: WoopStatus
  reflection: string | null
  created_at: string
  updated_at: string | null
}

export interface PomodoroSession {
  id: string
  user_id: string
  task_id: string | null
  mode: PomodoroMode
  focus_minutes: number
  break_minutes: number
  completed: boolean
  started_at: string
  ended_at: string | null
}

export interface UserSettings {
  user_id: string
  dark_mode: boolean
  sound_enabled: boolean
  default_pomodoro_mode: PomodoroMode
  show_daily_review: boolean
}
