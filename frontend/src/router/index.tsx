// src/router/index.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { RequireAuth, RequireRole, GuestOnly } from './guards'
import { lazy, Suspense } from 'react'
import { Spinner } from '@/components/ui'

const wrap = (Component: React.LazyExoticComponent<() => JSX.Element>) => (
  <Suspense fallback={<div className="flex justify-center items-center h-64"><Spinner className="w-8 h-8" /></div>}>
    <Component />
  </Suspense>
)

// Pages — lazy loaded
const HomePage         = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })))
const StoryListPage    = lazy(() => import('@/pages/StoryListPage').then(m => ({ default: m.StoryListPage })))
const StoryDetailPage  = lazy(() => import('@/pages/StoryDetailPage').then(m => ({ default: m.StoryDetailPage })))
const ChapterReadPage  = lazy(() => import('@/pages/ChapterReadPage').then(m => ({ default: m.ChapterReadPage })))
const LoginPage        = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage     = lazy(() => import('@/pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const ForgotPage       = lazy(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPage        = lazy(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const ProfilePage      = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const BookshelfPage    = lazy(() => import('@/pages/BookshelfPage').then(m => ({ default: m.BookshelfPage })))
const HistoryPage      = lazy(() => import('@/pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const MyCommentsPage   = lazy(() => import('@/pages/MyCommentsPage').then(m => ({ default: m.MyCommentsPage })))
const SettingsPage     = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const AuthorPage       = lazy(() => import('@/pages/AuthorPage').then(m => ({ default: m.AuthorPage })))
const AddStoryPage     = lazy(() => import('@/pages/AddStoryPage').then(m => ({ default: m.AddStoryPage })))
const EditStoryPage    = lazy(() => import('@/pages/EditStoryPage').then(m => ({ default: m.EditStoryPage })))
const ChapterMgrPage   = lazy(() => import('@/pages/ChapterManagerPage').then(m => ({ default: m.ChapterManagerPage })))
const AdminPage        = lazy(() => import('@/pages/AdminPage').then(m => ({ default: m.AdminPage })))
const NotFoundPage     = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public
      { index: true, element: wrap(HomePage) },
      { path: 'stories', element: wrap(StoryListPage) },
      { path: 'stories/:nameId', element: wrap(StoryDetailPage) },
      { path: 'stories/:nameId/chapters/:chapterId', element: wrap(ChapterReadPage) },

      // Guest only
      { element: <GuestOnly />, children: [
        { path: 'login', element: wrap(LoginPage) },
        { path: 'register', element: wrap(RegisterPage) },
        { path: 'forgot-password', element: wrap(ForgotPage) },
        { path: 'reset-password', element: wrap(ResetPage) },
      ]},

      // Authenticated
      { element: <RequireAuth />, children: [
        { path: 'profile', element: wrap(ProfilePage) },
        { path: 'bookshelf', element: wrap(BookshelfPage) },
        { path: 'history', element: wrap(HistoryPage) },
        { path: 'my-comments', element: wrap(MyCommentsPage) },
        { path: 'settings', element: wrap(SettingsPage) },
      ]},

      // Author + Admin
      { element: <RequireRole roles={['author', 'admin']} />, children: [
        { path: 'author', element: wrap(AuthorPage) },
        { path: 'author/stories/new', element: wrap(AddStoryPage) },
        { path: 'author/stories/:id/edit', element: wrap(EditStoryPage) },
        { path: 'author/stories/:id/chapters', element: wrap(ChapterMgrPage) },
      ]},

      // Admin only
      { element: <RequireRole roles={['admin']} />, children: [
        { path: 'admin', element: wrap(AdminPage) },
      ]},

      { path: '*', element: wrap(NotFoundPage) },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
