import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  username: string
  nombre: string
  rol: 'viewer' | 'editor'
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  isEditor: () => boolean
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isEditor: () => get().user?.rol === 'editor',
      isAuthenticated: () => !!get().token,
    }),
    { name: 'opex-auth' }
  )
)
