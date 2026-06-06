// src/pages/ProfilePage.tsx
import { useState, useEffect } from 'react'
import {
  useMe, useUpdateProfile, useUploadAvatar,
  useChangePassword, useMyBookshelf, useMyHistory,
} from '@/lib/queries'
import { useAuthStore } from '@/store/auth.store'
import { Input, Button, Avatar, Modal } from '@/components/ui'
import { PosterInput } from '@/features/story/PosterInput'
import { BookMarked, BookOpen, CheckCircle2, Pencil, Lock } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// ── Edit Profile Modal ────────────────────────────────────────────────────────

function EditProfileModal({
  open,
  onClose,
  initial,
}: {
  open: boolean
  onClose: () => void
  initial: { name: string; email: string; bio: string; avatarUrl: string }
}) {
  const { setUser } = useAuthStore()
  const updateProfile = useUpdateProfile()
  const uploadAvatar  = useUploadAvatar()

  const [form, setForm] = useState({
    name: initial.name,
    email: initial.email,
    bio: initial.bio,
  })
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(initial.avatarUrl)
  const [msg,     setMsg]     = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ name: initial.name, email: initial.email, bio: initial.bio })
      setAvatarFile(null)
      setAvatarPreview(initial.avatarUrl)
      setMsg('')
      setSuccess(false)
    }
  }, [open])

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg('')
    try {
      // 1. Upload avatar mới nếu user đã chọn file
      if (avatarFile) {
        const updated = await uploadAvatar.mutateAsync(avatarFile)
        setUser(updated)
      }

      // 2. Cập nhật name / email / bio
      const updated = await updateProfile.mutateAsync(form)
      setUser(updated)

      setSuccess(true)
      setMsg('Cập nhật hồ sơ thành công!')
      setTimeout(() => { onClose(); window.location.reload() }, 1200)
    } catch (err: any) {
      setMsg(err.response?.data?.message ?? 'Lỗi cập nhật')
    }
  }

  const isPending = uploadAvatar.isPending || updateProfile.isPending

  return (
    <Modal open={open} onClose={onClose} title="Chỉnh sửa hồ sơ">
      <form onSubmit={handleSubmit} className="space-y-4">
        <PosterInput
          file={avatarFile}
          preview={avatarPreview}
          onChange={(f, p) => { setAvatarFile(f); setAvatarPreview(p) }}
        />

        <Input label="Tên hiển thị" value={form.name} onChange={set('name')} required />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
        <div>
          <label className="label">Giới thiệu bản thân</label>
          <textarea
            value={form.bio}
            onChange={set('bio')}
            rows={3}
            className="input resize-none"
            placeholder="Viết vài dòng về bạn…"
          />
        </div>

        {msg && (
          <p className={`text-sm ${success ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
          <Button type="submit" loading={isPending}>Lưu thay đổi</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Change Password Modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const changePassword = useChangePassword()
  const [form, setForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  })
  const [msg,     setMsg]     = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMsg('')
      setSuccess(false)
    }
  }, [open])

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      setMsg('Mật khẩu xác nhận không khớp'); return
    }
    if (form.newPassword.length < 8) {
      setMsg('Mật khẩu mới phải ít nhất 8 ký tự'); return
    }
    setMsg('')
    changePassword.mutate(
      { currentPassword: form.currentPassword, newPassword: form.newPassword },
      {
        onSuccess: () => {
          setSuccess(true)
          setMsg('Đổi mật khẩu thành công!')
          setTimeout(onClose, 1200)
        },
        onError: (err: any) => {
          setMsg(err.response?.data?.message ?? 'Lỗi đổi mật khẩu')
        },
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Đổi mật khẩu">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Mật khẩu hiện tại"
          type="password"
          value={form.currentPassword}
          onChange={set('currentPassword')}
          required
        />
        <Input
          label="Mật khẩu mới"
          type="password"
          value={form.newPassword}
          onChange={set('newPassword')}
          minLength={8}
          required
        />
        <Input
          label="Xác nhận mật khẩu mới"
          type="password"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          required
        />

        {msg && (
          <p className={`text-sm ${success ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
          <Button type="submit" loading={changePassword.isPending}>Đổi mật khẩu</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value,
}: {
  icon: React.ReactNode; label: string; value: number | string
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-[var(--bg-alt)] flex items-center justify-center text-accent shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xl font-display font-bold text-[var(--text)]">{value}</p>
        <p className="text-xs text-[var(--text-subtle)] font-ui">{label}</p>
      </div>
    </div>
  )
}

// ── ProfilePage ───────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user } = useAuthStore()
  const { data: me }        = useMe()
  const { data: bookshelf } = useMyBookshelf()
  const { data: history }   = useMyHistory()

  const [editOpen, setEditOpen] = useState(false)
  const [pwOpen,   setPwOpen]   = useState(false)

  const profileInitial = {
    name:      me?.name      ?? '',
    email:     me?.email     ?? '',
    bio:       me?.bio       ?? '',
    avatarUrl: me?.avatarUrl ?? '',
  }

  const storiesRead   = history?.length ?? 0
  const chaptersRead  = history?.reduce((acc, h) => acc + (h.lastChapter?.order ?? 0), 0) ?? 0
  const bookshelfCount = bookshelf?.length ?? 0

  return (
    <div className="page-container py-8 max-w-2xl">
      <h1 className="section-title">Hồ sơ</h1>

      {/* ── Avatar & Info ─────────────────────────────────────────── */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-5">
          <Avatar name={user?.name ?? ''} src={user?.avatarUrl} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-xl font-bold text-[var(--text)] mb-0.5">{user?.name}</p>
            <p className="text-sm text-[var(--text-subtle)] font-ui mb-1">@{user?.username}</p>
            {me?.email && (
              <p className="text-xs text-[var(--text-muted)] mb-2">{me.email}</p>
            )}
            {me?.bio && (
              <p className="text-sm font-body text-[var(--text-muted)] leading-relaxed mb-2">{me.bio}</p>
            )}
            {me?.createdAt && (
              <p className="text-xs text-[var(--text-subtle)]">
                Tham gia: {formatDate(me.createdAt)}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--border)]">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil size={13} /> Chỉnh sửa hồ sơ
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPwOpen(true)}>
            <Lock size={13} /> Đổi mật khẩu
          </Button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <h2 className="font-semibold text-[var(--text)] font-ui mb-3">Thống kê</h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={<BookOpen size={18} />}     label="Truyện đã đọc"   value={storiesRead} />
        <StatCard icon={<CheckCircle2 size={18} />} label="Chương đã đọc"   value={chaptersRead} />
        <StatCard icon={<BookMarked size={18} />}   label="Trong tủ truyện" value={bookshelfCount} />
      </div>

      {/* ── Recent Reading History ─────────────────────────────────── */}
      {(history?.length ?? 0) > 0 && (
        <>
          <h2 className="font-semibold text-[var(--text)] font-ui mb-3">Đọc gần đây</h2>
          <div className="space-y-2">
            {history!.slice(0, 5).filter((h) => h.story).map((h) => (
              <div key={h.id} className="card p-3 flex items-center gap-3">
                {h.story?.posterUrl ? (
                  <img
                    src={h.story.posterUrl}
                    alt={h.story.name}
                    className="w-10 h-14 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded-lg bg-[var(--bg-alt)] flex items-center justify-center shrink-0">
                    <BookOpen size={14} className="text-[var(--text-subtle)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-ui text-[var(--text)] truncate">
                    {h.story?.name}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">{h.lastChapter?.name}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={profileInitial}
      />
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}