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

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const { setAccessToken, setUser, logout } = useAuthStore()

  useEffect(() => {
    let mounted = true

    if (localStorage.getItem('hasSession') !== 'true') {
      setReady(true)
      return () => { mounted = false }
    }

    refreshSession()
      .then(({ data }) => {
        if (!mounted) return null
        setAccessToken(data.accessToken)
        return api.get<User>('/users/me')
      })
      .then((response) => {
        if (mounted && response) setUser(response.data)
      })
      .catch(() => {
        if (mounted) logout()
      })
      .finally(() => {
        if (mounted) setReady(true)
      })

    return () => { mounted = false }
  }, [logout, setAccessToken, setUser])

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
