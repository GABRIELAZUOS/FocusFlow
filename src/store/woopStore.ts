import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Woop, WoopStatus } from '../lib/supabase'

interface WoopState {
  woops: Woop[]
  addWoop: (data: { wish: string; outcome: string; obstacle: string; plan: string }) => Woop
  updateWoop: (id: string, updates: Partial<Woop>) => void
  deleteWoop: (id: string) => void
}

export const useWoopStore = create<WoopState>()(
  persist(
    (set, get) => ({
      woops: [],

      addWoop: (data) => {
        const newWoop: Woop = {
          id: crypto.randomUUID(),
          user_id: 'local',
          wish: data.wish,
          outcome: data.outcome,
          obstacle: data.obstacle,
          plan: data.plan,
          status: 'active' as WoopStatus,
          reflection: null,
          created_at: new Date().toISOString(),
          updated_at: null,
        }
        set({ woops: [newWoop, ...get().woops] })
        return newWoop
      },

      updateWoop: (id, updates) =>
        set({
          woops: get().woops.map((w) =>
            w.id === id ? { ...w, ...updates, updated_at: new Date().toISOString() } : w
          ),
        }),

      deleteWoop: (id) => set({ woops: get().woops.filter((w) => w.id !== id) }),
    }),
    {
      name: 'focusflow-woops',
      partialize: (state) => ({ woops: state.woops }),
    }
  )
)
