// src/types/index.ts

export type Role = 'user' | 'author' | 'admin'
export type TTSLanguage = 'vi' | 'en' | 'zh'
export type TTSVoice = 'male' | 'female'
export type UITheme = 'light' | 'dark'

export interface TTSSettings {
  ttsLanguage: TTSLanguage
  ttsVoice: TTSVoice
  ttsSpeed: number
  ttsVolume: number
  autoNextChapter: boolean
  sleepTimerMinutes: number
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
  id: string
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
  id: string
  name: string
  order: number
  contentUrl: string
  storyId: string
  story?: { id: string; name: string; nameId: string }
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  userId: string
  user: { id: string; username: string; name: string; avatarUrl?: string }
  storyId: string
  chapterId?: string
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
  storyId: string
  rating: number
  content?: string
  createdAt: string
}

export interface BookshelfItem {
  id: string
  userId: string
  storyId: string
  story: Pick<Story, 'id' | 'name' | 'nameId' | 'posterUrl'>
  note?: string
  savedAt: string
}

export interface ReadingHistoryItem {
  id: string
  userId: string
  storyId: string
  story: Pick<Story, 'id' | 'name' | 'nameId' | 'posterUrl'>
  lastChapterId: string
  lastChapter: { id: string; name: string; order: number }
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
