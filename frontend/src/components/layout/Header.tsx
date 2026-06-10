// src/components/layout/Header.tsx
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, Moon, Sun, User, LogOut, Settings, BookMarked, LayoutDashboard, PenTool } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useSettingsStore } from '@/store/settings.store'
import { Avatar, Button } from '@/components/ui'
import { useState, useRef, useEffect } from 'react'
import { useScrollHide } from '@/hooks/useScrollHide'
import { cn } from '@/lib/utils'
import api from '@/lib/api'

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore()
  // Dùng toggleTheme thay vì updateUI để giữ màu đã lưu
  const { theme, toggleTheme } = useSettingsStore()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [search,   setSearch]   = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  const isReaderPage = /\/stories\/.+\/chapters\//.test(location.pathname)
  const scrollHidden = useScrollHide(20)
  const headerHidden = isReaderPage && scrollHidden

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await api.post('/auth/logout').catch(() => null)
    logout()
    navigate('/')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) navigate(`/stories?q=${encodeURIComponent(search.trim())}`)
  }

  return (
    <header className={cn('app-header bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]', headerHidden && 'app-header--hidden')}>
      <div className="page-container flex items-center gap-4 h-14">
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <img src="/favicon.png" alt="Logo" className="w-6 h-6 transition-all duration-300 ease-out 
               group-hover:scale-110 
               group-hover:brightness-110" />
          <span className="font-display text-lg font-semibold text-[var(--text)] hidden sm:block">
            SaoBook
          </span>
        </Link>

        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-subtle)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm truyện…"
              className="input pl-9 py-1.5 text-sm h-9"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 ml-auto">
          {/* toggleTheme giữ màu đã lưu của từng mode */}
          <button
            onClick={toggleTheme}
            className="btn-ghost p-2 rounded-lg"
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
          >
            {theme === 'light'
              ? <Moon className="w-4 h-4 text-[var(--text-muted)]" />
              : <Sun  className="w-4 h-4 text-[var(--text-muted)]" />
            }
          </button>

          {isAuthenticated && user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity ml-1"
              >
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 card py-1 shadow-lg z-50">
                  <div className="px-4 py-2.5 border-b border-[var(--border)]">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">{user.name}</p>
                    <p className="text-xs text-[var(--text-subtle)] truncate">{user.username}</p>
                  </div>

                  <NavItem to="/profile"   icon={<User size={15} />}          onClick={() => setMenuOpen(false)}>Hồ sơ</NavItem>
                  <NavItem to="/bookshelf" icon={<BookMarked size={15} />}    onClick={() => setMenuOpen(false)}>Tủ truyện</NavItem>
                  <NavItem to="/settings"  icon={<Settings size={15} />}      onClick={() => setMenuOpen(false)}>Cài đặt</NavItem>

                  {(user.role === 'author' || user.role === 'admin') && (
                    <NavItem to="/author" icon={<PenTool size={15} />} onClick={() => setMenuOpen(false)}>Quản lý truyện</NavItem>
                  )}
                  {user.role === 'admin' && (
                    <NavItem to="/admin" icon={<LayoutDashboard size={15} />} onClick={() => setMenuOpen(false)}>Admin</NavItem>
                  )}

                  <div className="border-t border-[var(--border)] mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <LogOut size={15} /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Đăng nhập</Button>
              <Button size="sm" onClick={() => navigate('/register')}>Đăng ký</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function NavItem({ to, icon, onClick, children }: {
  to: string; icon: React.ReactNode; onClick?: () => void; children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-alt)] transition-colors"
    >
      <span className="text-[var(--text-subtle)]">{icon}</span>
      {children}
    </Link>
  )
}