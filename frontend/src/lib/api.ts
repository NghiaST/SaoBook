// src/lib/api.ts
import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios'
import { useAuthStore } from '@/store/auth.store'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  // Do NOT set a default Content-Type.
  // Axios will automatically set:
  // - application/json for regular objects
  // - multipart/form-data; boundary=... for FormData
})

export const refreshSession = () =>
  axios.post<{ accessToken: string }>(
    `${BASE_URL}/auth/refresh`,
    undefined,
    { withCredentials: true },
  )

// ── Attach access token ───────────────────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken

    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }

    // If the request contains FormData, remove Content-Type
    // so the browser can automatically add the correct boundary.
    if (config.data instanceof FormData) {
      config.headers.delete('Content-Type')
    }

    return config
  }
)

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
let isRefreshing = false
let waitQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (!original) return Promise.reject(error)

    const hadToken = !!original.headers?.get?.('Authorization')

    if (
      error.response?.status === 401 &&
      hadToken &&                                      // request was authenticated
      !original._retry &&
      !original.url?.endsWith('/auth/refresh')
    ) {
      original._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitQueue.push({
            resolve: (token) => {
              original.headers.set('Authorization', `Bearer ${token}`)
              resolve(api(original))
            },
            reject,
          })
        })
      }

      isRefreshing = true

      try {
        const { data } = await refreshSession()
        useAuthStore.getState().setAccessToken(data.accessToken)

        waitQueue.forEach((w) => w.resolve(data.accessToken))
        waitQueue = []

        original.headers.set('Authorization', `Bearer ${data.accessToken}`)
        if (original.data instanceof FormData) {
          original.headers.delete('Content-Type')
        }
        return api(original)
      } catch (refreshError) {
        useAuthStore.getState().logout()   // clears hasSession + isAuthenticated

        waitQueue.forEach((w) => w.reject(refreshError))
        waitQueue = []

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api