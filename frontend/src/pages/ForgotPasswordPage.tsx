// src/pages/ForgotPasswordPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForgotPassword } from '@/lib/queries'
import { Input, Button } from '@/components/ui'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const forgotPassword = useForgotPassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    forgotPassword.mutate({ email }, { onSuccess: () => setSent(true) })
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-[var(--text)] text-center mb-8">Quên mật khẩu</h1>
        {sent ? (
          <div className="card p-6 text-center">
            <p className="text-[var(--text-muted)] mb-4">
              Nếu email đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu trong vài phút.
            </p>
            <Link to="/login" className="text-accent hover:underline text-sm">← Quay lại đăng nhập</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            <Input label="Email đăng ký" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" className="w-full" loading={forgotPassword.isPending}>
              Gửi liên kết đặt lại
            </Button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-accent hover:underline">← Quay lại</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
