import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CreditsState {
  dailyUsed: number
  dailyTotal: number
  dailyDate: string
  purchased: number
  useCredits: (amount: number) => boolean
  resetDaily: () => void
  remaining: () => number
}

const DAILY_FREE = 10

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export const useCreditsStore = create<CreditsState>()(
  persist(
    (set, get) => ({
      dailyUsed: 0,
      dailyTotal: DAILY_FREE,
      dailyDate: todayStr(),
      purchased: 0,

      useCredits(amount: number) {
        const state = get()
        // Reset daily if date changed
        if (state.dailyDate !== todayStr()) {
          set({ dailyUsed: 0, dailyDate: todayStr() })
        }
        const currentUsed = state.dailyDate !== todayStr() ? 0 : state.dailyUsed
        const remaining = state.dailyTotal - currentUsed + state.purchased
        if (remaining < amount) return false

        // Use free credits first
        const freeRemaining = state.dailyTotal - currentUsed
        if (freeRemaining >= amount) {
          set({ dailyUsed: currentUsed + amount })
        } else {
          const overflow = amount - freeRemaining
          set({
            dailyUsed: state.dailyTotal,
            purchased: state.purchased - overflow,
          })
        }
        return true
      },

      resetDaily() {
        set({ dailyUsed: 0, dailyDate: todayStr() })
      },

      remaining(): number {
        const state = get()
        if (state.dailyDate !== todayStr()) {
          return state.dailyTotal + state.purchased
        }
        return state.dailyTotal - state.dailyUsed + state.purchased
      },
    }),
    { name: 'jianliya-credits' }
  )
)
