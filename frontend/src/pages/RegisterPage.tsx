// src/pages/RegisterPage.tsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRegister } from '@/lib/queries'
import { useAuthStore } from '@/store/auth.store'
import { Input, Button } from '@/components/ui'
import { BookOpen } from 'lucide-react'

export function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const register = useRegister()
  const [form, setForm] = useState({ username: '', email: '', name: '', password: '' })
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    register.mutate(form, {
      onSuccess: (data) => {
        setAuth(data.user, data.accessToken, data.refreshToken)
        navigate('/')
      },
      onError: (err: any) => setError(err.response?.data?.message ?? 'Đăng ký thất bại'),
    })
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BookOpen className="w-10 h-10 text-accent mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-[var(--text)]">Đăng ký</h1>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <Input label="Tên hiển thị" value={form.name} onChange={set('name')} required />
          <Input label="Tên đăng nhập" value={form.username} onChange={set('username')} required />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
          <Input label="Mật khẩu" type="password" value={form.password} onChange={set('password')} required minLength={8} />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <Button type="submit" className="w-full" loading={register.isPending}>Tạo tài khoản</Button>
        </form>
        <p className="text-center text-sm text-[var(--text-muted)] mt-4">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-accent hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}
