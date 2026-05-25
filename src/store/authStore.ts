import { create } from 'zustand'
import { isSupabaseConfigured, supabase, type AuthSession, type AuthUser } from '../services/supabaseClient'

type CreditLedgerItem = {
  id: string
  delta: number
  balance_after: number
  reason: string
  feature: string | null
  created_at: string
}

interface AuthStore {
  ready: boolean
  session: AuthSession | null
  user: AuthUser | null
  balance: number | null
  totalCredits: number | null
  ledger: CreditLedgerItem[]
  authModalOpen: boolean
  creditModalOpen: boolean
  error: string | null
  initAuth: () => Promise<void>
  openAuthModal: () => void
  closeAuthModal: () => void
  openCreditModal: () => void
  closeCreditModal: () => void
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<{ needsEmailVerification: boolean }>
  signOut: () => Promise<void>
  getAccessToken: () => Promise<string | null>
  refreshCredits: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ready: false,
  session: null,
  user: null,
  balance: null,
  totalCredits: null,
  ledger: [],
  authModalOpen: false,
  creditModalOpen: false,
  error: null,

  initAuth: async () => {
    if (!isSupabaseConfigured || !supabase) {
      set({ ready: true, error: 'Supabase 尚未配置' })
      return
    }

    const { data } = await supabase.auth.getSession()
    set({
      ready: true,
      session: data.session,
      user: data.session?.user ?? null,
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        balance: session ? get().balance : null,
        totalCredits: session ? get().totalCredits : null,
        ledger: session ? get().ledger : [],
      })
      if (session) get().refreshCredits().catch(() => {})
    })

    if (data.session) {
      await get().refreshCredits().catch(() => {})
    }
  },

  openAuthModal: () => set({ authModalOpen: true, error: null }),
  closeAuthModal: () => set({ authModalOpen: false, error: null }),
  openCreditModal: () => set({ creditModalOpen: true }),
  closeCreditModal: () => set({ creditModalOpen: false }),

  signInWithEmail: async (email, password) => {
    if (!supabase) throw new Error('Supabase 尚未配置')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message })
      throw error
    }
    set({ session: data.session, user: data.user, authModalOpen: false, error: null })
    await get().refreshCredits()
  },

  signUpWithEmail: async (email, password) => {
    if (!supabase) throw new Error('Supabase 尚未配置')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      set({ error: error.message })
      throw error
    }
    if (!data.session) {
      set({ session: null, user: null, error: null })
      return { needsEmailVerification: true }
    }

    set({ session: data.session, user: data.user, authModalOpen: false, error: null })
    await get().refreshCredits()
    return { needsEmailVerification: false }
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut()
    set({ session: null, user: null, balance: null, totalCredits: null, ledger: [], creditModalOpen: false })
  },

  getAccessToken: async () => {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  },

  refreshCredits: async () => {
    const token = await get().getAccessToken()
    if (!token) return

    const response = await fetch('/api/credits/balance', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    if (!response.ok) return
    const data = await response.json()
    set({
      balance: Number(data.balance || 0),
      totalCredits: Number(data.totalCredits || 20),
      ledger: data.ledger || [],
    })
  },
}))
