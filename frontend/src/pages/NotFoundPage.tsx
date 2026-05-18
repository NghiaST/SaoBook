// src/pages/NotFoundPage.tsx
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <BookOpen className="w-16 h-16 text-[var(--border)] mb-6" />
      <h1 className="font-display text-6xl font-bold text-[var(--text)] mb-3">404</h1>
      <p className="font-body text-xl text-[var(--text-muted)] mb-6">
        Trang này không tồn tại hoặc đã bị xóa.
      </p>
      <Link to="/" className="btn-primary">← Về trang chủ</Link>
    </div>
  )
}
