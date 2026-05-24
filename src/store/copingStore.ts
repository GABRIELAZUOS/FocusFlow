import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CopingCard {
  id: string
  title: string
  trigger: string
  steps: string
  anchor_phrase: string
  category: string
  category_color: string
  favorited: boolean
  created_at: string
}

interface CopingState {
  cards: CopingCard[]
  addCard: (data: Omit<CopingCard, 'id' | 'created_at' | 'favorited'>) => void
  deleteCard: (id: string) => void
  toggleFavorite: (id: string) => void
}

export const useCopingStore = create<CopingState>()(
  persist(
    (set, get) => ({
      cards: [],

      addCard: (data) => {
        const card: CopingCard = {
          id: crypto.randomUUID(),
          ...data,
          favorited: false,
          created_at: new Date().toISOString(),
        }
        set({ cards: [...get().cards, card] })
      },

      deleteCard: (id) => {
        set({ cards: get().cards.filter((c) => c.id !== id) })
      },

      toggleFavorite: (id) => {
        set({
          cards: get().cards.map((c) =>
            c.id === id ? { ...c, favorited: !c.favorited } : c
          ),
        })
      },
    }),
    {
      name: 'focusflow-coping',
      partialize: (state) => ({ cards: state.cards }),
    }
  )
)
