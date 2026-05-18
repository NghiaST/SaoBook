// src/lib/queries.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import api from './api'
import type {
  User, Story, Chapter, Comment, MyComment, Review,
  BookshelfItem, ReadingHistoryItem, UserSettings, LoginResponse,
} from '@/types'

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

export const useMe = (enabled = true) =>
  useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/users/me').then((r) => r.data),
    enabled,
  })

export const useUpdateProfile = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<User>) => api.patch<User>('/users/me', data).then((r) => r.data),
    onSuccess: (user) => qc.setQueryData(['me'], user),
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
    mutationFn: (data: Partial<UserSettings>) =>
      api.put<UserSettings>('/users/me/settings', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
}

export const useMyComments = () =>
  useQuery({
    queryKey: ['my-comments'],
    queryFn: () => api.get<MyComment[]>('/users/me/comments').then((r) => r.data),
  })

export const useMyBookshelf = () =>
  useQuery({
    queryKey: ['my-bookshelf'],
    queryFn: () => api.get<BookshelfItem[]>('/users/me/bookshelf').then((r) => r.data),
  })

export const useMyHistory = () =>
  useQuery({
    queryKey: ['my-history'],
    queryFn: () => api.get<ReadingHistoryItem[]>('/users/me/history').then((r) => r.data),
  })

// ── Stories ───────────────────────────────────────────────────────────────────

interface StoryListParams { q?: string; page?: number; limit?: number; sort?: string }

export const useStories = (params: StoryListParams = {}) =>
  useQuery({
    queryKey: ['stories', params],
    queryFn: () => api.get<{ stories: Story[]; total: number }>('/stories', { params }).then((r) => r.data),
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

export const useMyStories = () =>
  useQuery({
    queryKey: ['my-stories'],
    queryFn: () => api.get<Story[]>('/stories/mine').then((r) => r.data),
  })

export const useCreateStory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Story>) => api.post<Story>('/stories', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-stories'] }),
  })
}

export const useUpdateStory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Story> & { id: string }) =>
      api.patch<Story>(`/stories/${id}`, data).then((r) => r.data),
    onSuccess: (story) => {
      qc.invalidateQueries({ queryKey: ['my-stories'] })
      qc.invalidateQueries({ queryKey: ['story', story.nameId] })
    },
  })
}

export const useDeleteStory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/stories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-stories'] }),
  })
}

// ── Chapters ──────────────────────────────────────────────────────────────────

export const useChapter = (id: string) =>
  useQuery({
    queryKey: ['chapter', id],
    queryFn: () => api.get<Chapter>(`/chapters/${id}`).then((r) => r.data),
    enabled: !!id,
  })

export const useCreateChapter = (storyId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; content: string; order?: number }) =>
      api.post<Chapter>(`/stories/${storyId}/chapters`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chapters'] }),
  })
}

export const useUpdateChapter = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; content?: string; order?: number }) =>
      api.patch<Chapter>(`/chapters/${id}`, data).then((r) => r.data),
    onSuccess: (ch) => qc.invalidateQueries({ queryKey: ['chapter', ch.id] }),
  })
}

export const useDeleteChapter = (storyId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/chapters/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chapters', storyId] }),
  })
}

export const useMarkChapterRead = () =>
  useMutation({
    mutationFn: (chapterId: string) => api.post(`/chapters/${chapterId}/read`),
  })

// ── Comments ──────────────────────────────────────────────────────────────────

export const useComments = (storyId: string, chapterId?: string) =>
  useQuery({
    queryKey: ['comments', storyId, chapterId],
    queryFn: () =>
      api.get<Comment[]>(`/stories/${storyId}/comments`, {
        params: chapterId ? { chapterId } : {},
      }).then((r) => r.data),
    enabled: !!storyId,
  })

export const useCreateComment = (storyId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { content: string; chapterId?: string; parentCommentId?: string }) =>
      api.post<Comment>(`/stories/${storyId}/comments`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', storyId] }),
  })
}

export const useDeleteComment = (storyId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/comments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', storyId] }),
  })
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export const useReviews = (storyId: string) =>
  useQuery({
    queryKey: ['reviews', storyId],
    queryFn: () => api.get<Review[]>(`/stories/${storyId}/reviews`).then((r) => r.data),
    enabled: !!storyId,
  })

export const useUpsertReview = (storyId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { rating: number; content?: string }) =>
      api.put<Review>(`/stories/${storyId}/reviews`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', storyId] })
      qc.invalidateQueries({ queryKey: ['story', storyId] })
    },
  })
}

// ── Bookshelf ─────────────────────────────────────────────────────────────────

export const useSaveToBookshelf = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ storyId, note }: { storyId: string; note?: string }) =>
      api.put(`/bookshelf/${storyId}`, { note }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookshelf'] }),
  })
}

export const useRemoveFromBookshelf = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (storyId: string) => api.delete(`/bookshelf/${storyId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-bookshelf'] }),
  })
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export const useAdminUsers = (params: { q?: string; role?: string; page?: number } = {}) =>
  useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => api.get('/admin/users', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

export const useAdminStats = () =>
  useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
  })

export const useChangeUserRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
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
