// src/pages/AddStoryPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateStory } from '@/lib/queries'
import { Input, Button } from '@/components/ui'
import { slugify } from '@/lib/utils'

export function AddStoryPage() {
  const navigate = useNavigate()
  const createStory = useCreateStory()
  const [form, setForm] = useState({
    name: '', nameId: '', description: '', posterUrl: '', sourceNote: '',
  })
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.value
      setForm((f) => ({
        ...f,
        [k]: val,
        ...(k === 'name' ? { nameId: slugify(val) } : {}),
      }))
    }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createStory.mutate(form, {
      onSuccess: () => navigate('/author'),
      onError: (err: any) => setError(err.response?.data?.message ?? 'Lỗi tạo truyện'),
    })
  }

  return (
    <div className="page-container py-8 max-w-xl">
      <h1 className="section-title">Thêm truyện mới</h1>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <Input label="Tên truyện" value={form.name} onChange={set('name')} required />
        <Input label="Slug (URL)" value={form.nameId} onChange={set('nameId')} required
          placeholder="ten-truyen-viet-thuong" />
        <div>
          <label className="label">Giới thiệu truyện</label>
          <textarea value={form.description} onChange={set('description')} rows={4}
            className="input resize-none" placeholder="Tóm tắt nội dung…" />
        </div>
        <Input label="Poster URL" value={form.posterUrl} onChange={set('posterUrl')}
          placeholder="https://..." />
        <Input label="Nguồn (ghi chú)" value={form.sourceNote} onChange={set('sourceNote')}
          placeholder="Ví dụ: Dịch từ nguồn X" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={createStory.isPending}>Tạo truyện</Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/author')}>Hủy</Button>
        </div>
      </form>
    </div>
  )
}
