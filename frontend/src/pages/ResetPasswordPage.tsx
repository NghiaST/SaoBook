// src/pages/ResetPasswordPage.tsx
import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useResetPassword } from '@/lib/queries'
import { Input, Button } from '@/components/ui'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const resetPassword = useResetPassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Mật khẩu phải ít nhất 8 ký tự'); return }
    resetPassword.mutate({ token, newPassword: password }, {
      onSuccess: () => navigate('/login'),
      onError: (err: any) => setError(err.response?.data?.message ?? 'Liên kết không hợp lệ hoặc đã hết hạn'),
    })
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-[var(--text)] text-center mb-8">Đặt lại mật khẩu</h1>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <Input label="Mật khẩu mới" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" loading={resetPassword.isPending}>Đặt lại mật khẩu</Button>
          <div className="text-center">
            <Link to="/login" className="text-sm text-accent hover:underline">← Quay lại đăng nhập</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
