// src/pages/EditStoryPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMyStories, useUpdateStory } from '@/lib/queries'
import { Input, Button, Spinner } from '@/components/ui'

export function EditStoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: stories, isLoading } = useMyStories()
  const updateStory = useUpdateStory()

  const story = stories?.find((s) => s.id === id)
  const [form, setForm] = useState({
    name: '', description: '', posterUrl: '', sourceNote: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (story) {
      setForm({
        name: story.name,
        description: story.description ?? '',
        posterUrl: story.posterUrl ?? '',
        sourceNote: story.sourceNote ?? '',
      })
    }
  }, [story])

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setError('')
    updateStory.mutate({ id, ...form }, {
      onSuccess: () => navigate('/author'),
      onError: (err: any) => setError(err.response?.data?.message ?? 'Lỗi cập nhật'),
    })
  }

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="w-8 h-8" /></div>
  if (!story) return <div className="page-container py-10 text-center text-[var(--text-muted)]">Không tìm thấy truyện</div>

  return (
    <div className="page-container py-8 max-w-xl">
      <h1 className="section-title">Chỉnh sửa truyện</h1>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <Input label="Tên truyện" value={form.name} onChange={set('name')} required />
        <div>
          <label className="label">Giới thiệu truyện</label>
          <textarea value={form.description} onChange={set('description')} rows={4}
            className="input resize-none" />
        </div>
        <Input label="Poster URL" value={form.posterUrl} onChange={set('posterUrl')} />
        <Input label="Nguồn (ghi chú)" value={form.sourceNote} onChange={set('sourceNote')} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={updateStory.isPending}>Lưu thay đổi</Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/author')}>Hủy</Button>
        </div>
      </form>
    </div>
  )
}
