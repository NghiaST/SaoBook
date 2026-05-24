// src/lib/api.ts
import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
  // KHÔNG đặt Content-Type mặc định.
  // Axios sẽ tự đặt:
  // - application/json cho object thông thường
  // - multipart/form-data; boundary=... cho FormData
})

// ── Attach access token ───────────────────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken')

    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }

    // Nếu gửi FormData, phải xóa Content-Type để browser tự thêm boundary.
    if (config.data instanceof FormData) {
      config.headers.delete('Content-Type')
    }

    return config
  }
)

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
let isRefreshing = false
let waitQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (!original) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      // Nếu đang refresh token, chờ token mới
      if (isRefreshing) {
        return new Promise((resolve) => {
          waitQueue.push((token) => {
            original.headers.set('Authorization', `Bearer ${token}`)
            resolve(api(original))
          })
        })
      }

      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')

      try {
        const { data } = await axios.post<{
          accessToken: string
          refreshToken: string
        }>(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)

        // Thực thi các request đang chờ
        waitQueue.forEach((callback) => callback(data.accessToken))
        waitQueue = []

        // Retry request hiện tại
        original.headers.set(
          'Authorization',
          `Bearer ${data.accessToken}`
        )

        // Nếu request gốc là FormData, xóa Content-Type
        if (original.data instanceof FormData) {
          original.headers.delete('Content-Type')
        }

        return api(original)
      } catch (refreshError) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')

        waitQueue = []

        window.location.href = '/login'

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api