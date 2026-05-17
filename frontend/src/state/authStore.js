// state/authStore.js — JWT + User Session State
import { create } from 'zustand'

const TOKEN_KEY = 'forge_token'
const USER_KEY  = 'forge_user'

const useAuthStore = create((set) => ({
  token: localStorage.getItem(TOKEN_KEY) || null,
  user:  JSON.parse(localStorage.getItem(USER_KEY) || 'null'),

  login: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ token, user })
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, user: null })
  },

  isAuthenticated: () => !!localStorage.getItem(TOKEN_KEY),
}))

export default useAuthStore
