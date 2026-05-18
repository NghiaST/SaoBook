// src/pages/ProfilePage.tsx
import { useState, useEffect } from 'react'
import { useMe, useUpdateProfile, useChangePassword } from '@/lib/queries'
import { useAuthStore } from '@/store/auth.store'
import { Input, Button, Avatar } from '@/components/ui'

export function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const { data: me } = useMe()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()

  const [form, setForm] = useState({ name: '', email: '', bio: '', avatarUrl: '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' })
  const [msg, setMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    if (me) setForm({ name: me.name, email: me.email, bio: me.bio ?? '', avatarUrl: me.avatarUrl ?? '' })
  }, [me])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile.mutate(form, {
      onSuccess: (u) => { setUser(u); setMsg('Đã cập nhật hồ sơ') },
      onError: (err: any) => setMsg(err.response?.data?.message ?? 'Lỗi'),
    })
  }

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault()
    changePassword.mutate(pwForm, {
      onSuccess: () => { setPwMsg('Đã đổi mật khẩu'); setPwForm({ currentPassword: '', newPassword: '' }) },
      onError: (err: any) => setPwMsg(err.response?.data?.message ?? 'Lỗi'),
    })
  }

  return (
    <div className="page-container py-8 max-w-2xl">
      <h1 className="section-title">Hồ sơ</h1>

      <div className="flex items-center gap-4 mb-8">
        <Avatar name={user?.name ?? ''} src={user?.avatarUrl} size="lg" />
        <div>
          <p className="font-display text-lg font-semibold">{user?.name}</p>
          <p className="text-sm text-[var(--text-subtle)]">@{user?.username}</p>
        </div>
      </div>

      <form onSubmit={handleProfile} className="card p-6 space-y-4 mb-6">
        <h2 className="font-semibold text-[var(--text)] font-ui">Thông tin cá nhân</h2>
        <Input label="Tên hiển thị" value={form.name} onChange={set('name')} />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} />
        <Input label="Avatar URL" value={form.avatarUrl} onChange={set('avatarUrl')} placeholder="https://..." />
        <div>
          <label className="label">Giới thiệu bản thân</label>
          <textarea value={form.bio} onChange={set('bio')} rows={3}
            className="input resize-none" placeholder="Viết vài dòng về bạn…" />
        </div>
        {msg && <p className="text-sm text-accent">{msg}</p>}
        <Button type="submit" loading={updateProfile.isPending}>Lưu thay đổi</Button>
      </form>

      <form onSubmit={handlePassword} className="card p-6 space-y-4">
        <h2 className="font-semibold text-[var(--text)] font-ui">Đổi mật khẩu</h2>
        <Input label="Mật khẩu hiện tại" type="password" value={pwForm.currentPassword}
          onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))} />
        <Input label="Mật khẩu mới" type="password" value={pwForm.newPassword}
          onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))} minLength={8} />
        {pwMsg && <p className="text-sm text-accent">{pwMsg}</p>}
        <Button type="submit" loading={changePassword.isPending}>Đổi mật khẩu</Button>
      </form>
    </div>
  )
}
