// src/components/layout/RootLayout.tsx
import { Outlet } from 'react-router-dom'
import { Header } from './Header'

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-[var(--border)] py-6 mt-1">
        <div className="page-container text-center text-sm text-[var(--text-subtle)] font-ui">
          © 2026 SaoBook
        </div>
      </footer>
    </div>
  )
}
