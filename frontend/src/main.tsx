// src/main.tsx
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AppRouter } from './router'
import api, { refreshSession } from './lib/api'
import { useAuthStore } from './store/auth.store'
import type { User } from './types'
import { useSettingsStore } from './store/settings.store'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 min
    },
  },
})

// Apply theme/settings on startup
useSettingsStore.getState().applyToDOM()

// Module-level: StrictMode runs effects twice in dev, which would fire two
// refresh calls. Sharing one promise avoids a race if the backend rotates
// refresh tokens.
let restorePromise: Promise<User | null> | null = null

function restoreSession(): Promise<User | null> {
  const { hasSession, setAccessToken, setUser, logout } = useAuthStore.getState()

  // No hint → guest, don't hit the server at all
  if (!hasSession) return Promise.resolve(null)

  if (!restorePromise) {
    restorePromise = refreshSession()
      .then(({ data }) => {
        setAccessToken(data.accessToken)
        return api.get<User>('/users/me')
      })
      .then(({ data }) => {
        setUser(data)
        if (data.settings) {
          useSettingsStore.getState().updateTTS({
            ttsLanguage: data.settings.ttsLanguage,
            ttsVoice: data.settings.ttsVoice,
            ttsSpeed: data.settings.ttsSpeed,
            autoNextChapter: data.settings.autoNextChapter,
            selectedRvApiKeyId: data.settings.selectedRvApiKeyId,
          })
        }
        return data
      })
      .catch(() => {
        logout() // clears hasSession + isAuthenticated
        return null
      })
  }
  return restorePromise
}

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    restoreSession().finally(() => {
      if (mounted) setReady(true)
    })
    return () => { mounted = false }
  }, [])

  if (!ready) return null
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <AppRouter />
      </AuthBootstrap>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>,
)