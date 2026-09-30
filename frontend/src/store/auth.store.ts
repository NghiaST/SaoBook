// src/store/auth.store.ts
import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  hasSession: boolean

  setAuth: (user: User, accessToken: string) => void
  setAccessToken: (accessToken: string) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  hasSession: localStorage.getItem('hasSession') === 'true',

  setAuth: (user, accessToken) => {
    localStorage.setItem('hasSession', 'true')
    set({ user, accessToken, isAuthenticated: true, hasSession: true })
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  setUser: (user) => set({ user, isAuthenticated: true }),

  logout: () => {
    localStorage.removeItem('hasSession')
    set({ user: null, accessToken: null, isAuthenticated: false, hasSession: false })
  },
}))