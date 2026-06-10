// src/types/index.ts

export type Role = 'user' | 'author' | 'admin'
export type TTSLanguage = 'vi' | 'en' | 'zh'
export type TTSVoice = 'male' | 'female'
export type UITheme = 'light' | 'dark'
export type TTSMode = 'speechsynthesis' | 'responsivevoice'

export interface TTSSettings {
  ttsLanguage: TTSLanguage
  ttsVoice: TTSVoice
  ttsSpeed: number
  ttsVolume: number
  ttsPitch: number
  autoNextChapter: boolean
  sleepTimerMinutes: number
  ttsMode: TTSMode
}

export interface UISettings {
  theme: UITheme
  bgColor: string
  textColor: string
  fontFamily: string
  fontSize: number
  lineHeight: number
}

export interface UserSettings extends TTSSettings, UISettings {}

export interface User {
  id: string
  username: string
  email: string
  name: string
  bio?: string
  avatarUrl?: string
  role: Role
  createdAt: string
  settings?: UserSettings
}

export interface Story {
  id: number
  nameId: string
  name: string
  posterUrl?: string
  description?: string
  sourceNote?: string
  authorId: string
  author?: { id: string; username: string; name: string; avatarUrl?: string }
  createdAt: string
  updatedAt: string
  avgRating?: number
  _count?: { chapters: number; reviews: number }
}

export interface Chapter {
  id: number
  name: string
  order: number
  contentUrl: string
  storyId: number
  story?: { id: number; name: string; nameId: string }
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  userId: string
  user: { id: string; username: string; name: string; avatarUrl?: string }
  storyId: number
  chapterId?: number
  parentCommentId?: string
  content: string
  createdAt: string
  replies?: Comment[]
}

export interface MyComment extends Comment {
  story: Pick<Story, 'id' | 'name' | 'nameId'>
  chapter?: Pick<Chapter, 'id' | 'name'>
}

export interface Review {
  id: string
  userId: string
  user: { id: string; username: string; name: string; avatarUrl?: string }
  storyId: number
  rating: number
  content?: string
  createdAt: string
}

export interface BookshelfItem {
  id: string
  userId: string
  storyId: number
  story: Pick<Story, 'id' | 'name' | 'nameId' | 'posterUrl'>
  note?: string
  savedAt: string
}

export interface ReadingHistoryItem {
  id: string
  userId: string
  storyId: number
  story: Pick<Story, 'id' | 'name' | 'nameId' | 'posterUrl'>
  lastChapterId: number
  lastChapter: { id: number; name: string; order: number }
  lastReadAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse extends AuthTokens {
  user: User
}

// ── ResponsiveVoice ───────────────────────────────────────────────────────────

export interface RvApiKey {
  id: string
  label: string
  key: string
  active: boolean
  createdAt: string
  updatedAt: string
}