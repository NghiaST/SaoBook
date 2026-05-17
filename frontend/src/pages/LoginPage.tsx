// src/pages/LoginPage.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLogin } from '@/lib/queries'
import { useAuthStore } from '@/store/auth.store'
import { Input, Button } from '@/components/ui'
import { BookOpen } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const login = useLogin()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    login.mutate(form, {
      onSuccess: (data) => {
        setAuth(data.user, data.accessToken, data.refreshToken)
        navigate('/')
      },
      onError: (err: any) => setError(err.response?.data?.message ?? 'Đăng nhập thất bại'),
    })
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BookOpen className="w-10 h-10 text-accent mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">Đăng nhập</h1>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <Input label="Tên đăng nhập hoặc email" value={form.identifier}
            onChange={set('identifier')} autoComplete="username" required />
          <Input label="Mật khẩu" type="password" value={form.password}
            onChange={set('password')} autoComplete="current-password" required />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <Button type="submit" className="w-full" loading={login.isPending}>Đăng nhập</Button>
          <div className="text-center text-sm text-[var(--text-subtle)]">
            <Link to="/forgot-password" className="hover:text-accent transition-colors">Quên mật khẩu?</Link>
          </div>
        </form>
        <p className="text-center text-sm text-[var(--text-muted)] mt-4">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-accent hover:underline">Đăng ký</Link>
        </p>
      </div>
    </div>
  )
}
