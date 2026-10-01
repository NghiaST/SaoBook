// src/lib/queries.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import api from './api'
import { useAuthStore } from '@/store/auth.store'
import type {
  User, Story, Chapter, Comment, MyComment, Review,
  BookshelfItem, ReadingHistoryItem, UserSettings, LoginResponse,
  RvApiKey, RvApiKeyCredentials, ResponsiveVoice, AdminBooksResponse,
} from '@/types'

/** Only fire user-specific queries once we actually hold an access token. */
const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated)

// ── Auth ──────────────────────────────────────────────────────────────────────

export const useRegister = () =>
  useMutation({
    mutationFn: (data: { username: string; email: string; name: string; password: string }) =>
      api.post<LoginResponse>('/auth/register', data).then((r) => r.data),
  })

export const useLogin = () =>
  useMutation({
    mutationFn: (data: { identifier: string; password: string }) =>
      api.post<LoginResponse>('/auth/login', data).then((r) => r.data),
  })

/**
 * POST /auth/logout - the server must clear the httpOnly refresh cookie,
 * so the client has to call it (clearing the store alone is not enough).
 * Always clears local state, even if the request fails (e.g. expired token).
 */
export const useLogout = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/logout').then((r) => r.data),
    onSettled: () => {
      useAuthStore.getState().logout()
      qc.clear() // don't leak user A's bookshelf/history to user B
    },
  })
}

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (data: { email: string }) =>
      api.post('/auth/forgot-password', data).then((r) => r.data),
  })

export const useResetPassword = () =>
  useMutation({
    mutationFn: (data: { token: string; newPassword: string }) =>
      api.post('/auth/reset-password', data).then((r) => r.data),
  })

// ── User ──────────────────────────────────────────────────────────────────────

export const useMe = (enabled?: boolean) => {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/users/me').then((r) => r.data),
    enabled: enabled ?? isAuthenticated,
  })
}

export const useUpdateProfile = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name?: string; email?: string; bio?: string; avatarUrl?: string }) =>
      api.patch<User>('/users/me', data).then((r) => r.data),
    onSuccess: (user) => {
      qc.setQueryData(['me'], user)
      useAuthStore.getState().setUser(user)
    },
  })
}

export const useUploadAvatar = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<User>('/users/me/avatar', form).then((r) => r.data)
    },
    onSuccess: (user) => {
      qc.setQueryData(['me'], user)
      useAuthStore.getState().setUser(user)
    },
  })
}

export const useUploadAvatarFromUrl = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (url: string) =>
      api.post<User>('/users/me/avatar-from-url', { url }).then((r) => r.data),
    onSuccess: (user) => {
      qc.setQueryData(['me'], user)
      useAuthStore.getState().setUser(user)
    },
  })
}

export const useChangePassword = () =>
  useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.patch('/users/me/password', data).then((r) => r.data),
  })

export const useUpdateSettings = () => {
  const qc = useQueryClient()
  return useMutation({
    // rvSettings: voiceName, language, gender, pitch; selectedRvApiKeyId selects the provider key.
    mutationFn: (data: Partial<UserSettings> & { rvSettings?: UserSettings['rvSettings'] }) =>
      api.put<UserSettings>('/users/me/settings', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
}

export const useMyComments = () => {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['my-comments'],
    queryFn: () => api.get<MyComment[]>('/users/me/comments').then((r) => r.data),
    enabled: isAuthenticated,
  })
}

export const useMyBookshelf = () => {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['my-bookshelf'],
    queryFn: () => api.get<BookshelfItem[]>('/users/me/bookshelf').then((r) => r.data),
    enabled: isAuthenticated,
  })
}

export const useMyHistory = () => {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['my-history'],
    queryFn: () => api.get<ReadingHistoryItem[]>('/users/me/history').then((r) => r.data),
    enabled: isAuthenticated,
  })
}

// ── Stories ───────────────────────────────────────────────────────────────────

interface StoryListParams {
  q?: string
  page?: number
  limit?: number
  sort?: 'newest' | 'rating' | 'popular'
}

export const useStories = (params: StoryListParams = {}) =>
  useQuery({
    queryKey: ['stories', params],
    queryFn: () =>
      api
        .get<{ stories: Story[]; total: number; page: number; limit: number }>('/stories', { params })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  })

export const useStory = (nameId: string) =>
  useQuery({
    queryKey: ['story', nameId],
    queryFn: () => api.get<Story>(`/stories/${nameId}`).then((r) => r.data),
    enabled: !!nameId,
  })

export const useChapterList = (nameId: string) =>
  useQuery({
    queryKey: ['chapters', nameId],
    queryFn: () => api.get<Chapter[]>(`/stories/${nameId}/chapters`).then((r) => r.data),
    enabled: !!nameId,
  })

export const useMyStories = () => {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['my-stories'],
    queryFn: () => api.get<Story[]>('/stories/mine').then((r) => r.data),
    enabled: isAuthenticated,
  })
}

// Helper: build FormData from story fields + optional poster File
function storyFormData(
  data: { name?: string; nameId?: string; description?: string; sourceNote?: string; posterUrl?: string },
  posterFile?: File | null,
): FormData {
  const form = new FormData()
  Object.entries(data).forEach(([k, v]) => { if (v !== undefined) form.append(k, v) })
  if (posterFile) form.append('posterFile', posterFile)
  return form
}

export const useCreateStory = () => {
  const qc = useQueryClient()
  return useMutation({
    // FormData fields: name*, nameId* (unique slug), description, sourceNote,
    // posterUrl (remote URL) or posterFile (upload)
    mutationFn: (data: FormData) =>
      api.post<Story>('/stories', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-stories'] })
      qc.invalidateQueries({ queryKey: ['stories'] })
      qc.invalidateQueries({ queryKey: ['admin-books'] })
    },
  })
}

export const useUpdateStory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, posterFile, ...data }: {
      id: number; name?: string; description?: string
      sourceNote?: string; posterUrl?: string; posterFile?: File | null
    }) => api.patch<Story>(`/stories/${id}`, storyFormData(data, posterFile)).then((r) => r.data),
    onSuccess: (story) => {
      qc.invalidateQueries({ queryKey: ['my-stories'] })
      qc.invalidateQueries({ queryKey: ['stories'] })
      qc.invalidateQueries({ queryKey: ['story', story.nameId] })
    },
  })
}

export const useUploadStoryPoster = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      return api.post<{ posterUrl: string }>(`/stories/${id}/poster`, form).then((r) => r.data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-stories'] })
      qc.invalidateQueries({ queryKey: ['story'] })
    },
  })
}

export const useUploadStoryPosterFromUrl = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, url }: { id: number; url: string }) =>
      api.post<{ posterUrl: string }>(`/stories/${id}/poster-url`, { url }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-stories'] })
      qc.invalidateQueries({ queryKey: ['story'] })
    },
  })
}

export const useDeleteStory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/stories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-stories'] })
      qc.invalidateQueries({ queryKey: ['stories'] })
    },
  })
}

// ── Chapters ──────────────────────────────────────────────────────────────────

export const useChapter = (id: number) =>
  useQuery({
    queryKey: ['chapter', id],
    queryFn: () => api.get<Chapter>(`/chapters/${id}`).then((r) => r.data),
    enabled: Number.isFinite(id),
  })

export const useCreateChapter = (storyId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; content: string; order?: number }) =>
      api.post<Chapter>(`/stories/${storyId}/chapters`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapters'] })
      qc.invalidateQueries({ queryKey: ['story'] }) // _count.chapters
    },
  })
}

export const useCreateChaptersBatch = (storyId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Array<{ name: string; content: string; order?: number }>) =>
      api.post<Chapter[]>(`/stories/${storyId}/chapters/batch`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapters'] })
      qc.invalidateQueries({ queryKey: ['story'] })
    },
  })
}

export const useUpdateChapter = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; content?: string; order?: number }) =>
      api.patch<Chapter>(`/chapters/${id}`, data).then((r) => r.data),
    onSuccess: (ch) => {
      qc.invalidateQueries({ queryKey: ['chapter', ch.id] })
      qc.invalidateQueries({ queryKey: ['chapters'] }) // name/order shown in the list
    },
  })
}

export const useDeleteChapter = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/chapters/${id}`),
    // The list key is ['chapters', nameId] (slug), not storyId, so invalidate by prefix
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapters'] })
      qc.invalidateQueries({ queryKey: ['story'] })
    },
  })
}

/** Requires auth. Only call it when the user is logged in. */
export const useMarkChapterRead = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (chapterId: number) =>
      api.post<{ ok: boolean }>(`/chapters/${chapterId}/read`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-history'] }),
  })
}

// ── Comments ──────────────────────────────────────────────────────────────────

export const useComments = (storyId: number, chapterId?: number) =>
  useQuery({
    queryKey: ['comments', storyId, chapterId],
    queryFn: () =>
      api.get<Comment[]>(`/stories/${storyId}/comments`, {
        params: chapterId ? { chapterId } : {},
      }).then((r) => r.data),
    enabled: Number.isFinite(storyId) && storyId > 0,
  })

export const useCreateComment = (storyId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { content: string; chapterId?: number; parentCommentId?: string }) =>
      api.post<Comment>(`/stories/${storyId}/comments`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', storyId] })
      qc.invalidateQueries({ queryKey: ['my-comments'] })
    },
  })
}

export const useDeleteComment = (storyId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/comments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', storyId] })
      qc.invalidateQueries({ queryKey: ['my-comments'] })
    },
  })
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export const useReviews = (storyId: number) =>
  useQuery({
    queryKey: ['reviews', storyId],
    queryFn: () => api.get<Review[]>(`/stories/${storyId}/reviews`).then((r) => r.data),
    enabled: Number.isFinite(storyId) && storyId > 0,
  })

export const useUpsertReview = (storyId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { rating: number; content?: string }) =>
      api.put<Review>(`/stories/${storyId}/reviews`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', storyId] })
      qc.invalidateQueries({ queryKey: ['story'] })
    },
  })
}

export const useDeleteReview = (storyId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/stories/${storyId}/reviews`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', storyId] })
      qc.invalidateQueries({ queryKey: ['story'] })
    },
  })
}

// ── Bookshelf ─────────────────────────────────────────────────────────────────

export const useSaveToBookshelf = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ storyId, note }: { storyId: number; note?: string }) =>
      api.put(`/bookshelf/${storyId}`, { note }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookshelf'] }),
  })
}

export const useUpdateBookshelfNote = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ storyId, note }: { storyId: number; note: string }) =>
      api.patch(`/bookshelf/${storyId}`, { note }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookshelf'] }),
  })
}

export const useRemoveFromBookshelf = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (storyId: number) => api.delete(`/bookshelf/${storyId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookshelf'] }),
  })
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export const useAdminUsers = (
  params: { q?: string; role?: 'user' | 'author' | 'admin'; page?: number; limit?: number } = {},
) => {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => api.get('/admin/users', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
    enabled: isAuthenticated,
  })
}

export const useAdminBooks = (
  params: { q?: string; authorId?: string; page?: number; limit?: number } = {},
) => {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['admin-books', params],
    queryFn: () => api.get<AdminBooksResponse>('/admin/books', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
    enabled: isAuthenticated,
  })
}

export const useAdminStats = () => {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
    enabled: isAuthenticated,
  })
}

export const useChangeUserRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'user' | 'author' | 'admin' }) =>
      api.patch(`/admin/users/${id}/role`, { role }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
}

// ── TTS / ResponsiveVoice Keys ────────────────────────────────────────────────

/**
 * Regular users get their own + global keys; admins get all keys.
 * (Not admin-only, so any logged-in user can manage their personal keys.)
 */
export const useRVKeys = () => {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['rv-keys'],
    queryFn: () => api.get<RvApiKey[]>('/tts/keys').then((r) => r.data),
    enabled: isAuthenticated,
  })
}

export const useRVKeyCredentials = (id: string | null) => {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['rv-key-credentials', id],
    queryFn: () => api.get<RvApiKeyCredentials>(`/tts/keys/${id}/credentials`).then((r) => r.data),
    enabled: isAuthenticated && !!id,
  })
}

export const useActiveRVKeys = () => {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['active-rv-keys'],
    queryFn: () => api.get<{ keys: string[] }>('/tts/keys/active').then((r) => r.data.keys),
    enabled: isAuthenticated,
  })
}

export const useTTSVoices = (language?: string, enabled = true) => {
  const isAuthenticated = useIsAuthenticated()
  return useQuery({
    queryKey: ['tts-voices', language],
    queryFn: () => api.get<ResponsiveVoice[]>('/tts/voices', { params: language ? { language } : {} }).then((r) => r.data),
    enabled: enabled && isAuthenticated,
    staleTime: 30 * 60 * 1000,
  })
}

/** Backward-compatible alias */
export const useAdminRVKeys = useRVKeys

const invalidateRVKeys = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['rv-keys'] })
}

export const useCreateRVKey = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { label: string; key: string; secret?: string }) =>
      api.post<RvApiKey>('/tts/keys', data).then((r) => r.data),
    onSuccess: () => invalidateRVKeys(qc),
  })
}

export const useUpdateRVKey = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; label?: string; key?: string; secret?: string; status?: RvApiKey['status'] }) =>
      api.patch<RvApiKey>(`/tts/keys/${id}`, data).then((r) => r.data),
    onMutate: async ({ id, ...data }) => {
      await qc.cancelQueries({ queryKey: ['rv-keys'] })
      const previousKeys = qc.getQueryData<RvApiKey[]>(['rv-keys'])
      const { key: _key, secret: _secret, ...safeData } = data

      qc.setQueryData<RvApiKey[]>(['rv-keys'], (keys) =>
        keys?.map((key) => key.id === id ? { ...key, ...safeData } : key),
      )

      return { previousKeys }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousKeys) qc.setQueryData(['rv-keys'], context.previousKeys)
    },
    onSuccess: () => invalidateRVKeys(qc),
  })
}

export const useDeleteRVKey = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tts/keys/${id}`),
    onSuccess: () => invalidateRVKeys(qc),
  })
}