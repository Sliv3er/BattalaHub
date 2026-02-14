import { create } from 'zustand'
import toast from 'react-hot-toast'
import { authAPI } from '../api/auth'

export interface User {
  id: string
  username: string
  email: string
  displayName: string
  avatar?: string
  isOnline: boolean
  createdAt: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (identifier: string, password: string) => Promise<boolean>
  register: (username: string, email: string, password: string, displayName?: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<void>
  updateUser: (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,

  login: async (identifier: string, password: string) => {
    try {
      const response = await authAPI.login({ identifier, password })
      const { accessToken, user } = response.data

      localStorage.setItem('token', accessToken)
      set({ user, token: accessToken })
      toast.success(`Welcome back, ${user.displayName}!`)
      return true
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return false
    }
  },

  register: async (username: string, email: string, password: string, displayName?: string) => {
    try {
      const response = await authAPI.register({ 
        username, 
        email, 
        password, 
        displayName: displayName || username 
      })
      const { accessToken, user } = response.data

      localStorage.setItem('token', accessToken)
      set({ user, token: accessToken })
      toast.success(`Welcome to Battala Hub, ${user.displayName}!`)
      return true
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
    toast.success('Logged out successfully')
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    
    if (!token) {
      set({ isLoading: false })
      return
    }

    try {
      const response = await authAPI.getMe()
      const { user } = response.data
      set({ user, token, isLoading: false })
    } catch (error) {
      localStorage.removeItem('token')
      set({ user: null, token: null, isLoading: false })
    }
  },

  updateUser: (updates: Partial<User>) => {
    const { user } = get()
    if (user) {
      set({ user: { ...user, ...updates } })
    }
  },
}))