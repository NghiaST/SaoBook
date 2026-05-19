// src/pages/AddStoryPage.tsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateStory, useUploadStoryPoster, useUploadStoryPosterFromUrl } from '@/lib/queries'
import { Input, Button } from '@/components/ui'
import { slugify } from '@/lib/utils'
import { ImageUp, Link2 } from 'lucide-react'

export function AddStoryPage() {
  const navigate = useNavigate()
  const createStory = useCreateStory()
  const uploadPoster = useUploadStoryPoster()
  const uploadPosterFromUrl = useUploadStoryPosterFromUrl()
  const [form, setForm] = useState({
    name: '', nameId: '', description: '', sourceNote: '',
  })
  const [error, setError] = useState('')
  const [posterError, setPosterError] = useState('')
  const [posterUrlInput, setPosterUrlInput] = useState('')
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState('')
  const [posterPreviewIsObjectUrl, setPosterPreviewIsObjectUrl] = useState(false)
  const [createdStoryId, setCreatedStoryId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (posterPreviewIsObjectUrl && posterPreview) {
        URL.revokeObjectURL(posterPreview)
      }
    }
  }, [posterPreview, posterPreviewIsObjectUrl])

  const setPreview = (url: string, isObjectUrl: boolean) => {
    if (posterPreviewIsObjectUrl && posterPreview) {
      URL.revokeObjectURL(posterPreview)
    }
    setPosterPreview(url)
    setPosterPreviewIsObjectUrl(isObjectUrl)
  }

  const setPosterFromFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setPosterError('Vui lòng chọn ảnh hợp lệ')
      return
    }
    setPosterError('')
    setPosterFile(file)
    setPosterUrlInput('')
    setPreview(URL.createObjectURL(file), true)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          setPosterFromFile(file)
        }
        return
      }
    }

    const text = e.clipboardData.getData('text')
    if (text && /^https?:\/\//i.test(text)) {
      setPosterUrlInput(text)
      setPosterFile(null)
      setPosterError('')
      setPreview(text, false)
    }
  }

  const handleLoadUrl = () => {
    const trimmed = posterUrlInput.trim()
    if (!trimmed) return
    try {
      new URL(trimmed)
      setPosterFile(null)
      setPosterError('')
      setPreview(trimmed, false)
    } catch {
      setPosterError('URL không hợp lệ')
    }
  }

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.value
      setForm((f) => ({
        ...f,
        [k]: val,
        ...(k === 'name' ? { nameId: slugify(val) } : {}),
      }))
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setPosterError('')

    try {
      setIsSubmitting(true)
      const storyId = createdStoryId ?? (await createStory.mutateAsync(form)).id
      if (!createdStoryId) setCreatedStoryId(storyId)

      if (posterFile) {
        await uploadPoster.mutateAsync({ storyId, file: posterFile })
      } else if (posterUrlInput.trim()) {
        await uploadPosterFromUrl.mutateAsync({ storyId, url: posterUrlInput.trim() })
      }

      navigate('/author')
    } catch (err: any) {
      const message = err.response?.data?.message ?? 'Lỗi tạo truyện'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
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
        <div onPaste={handlePaste} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Poster (upload, URL, hoặc Ctrl+V)</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-outline text-xs gap-1.5"
            >
              <ImageUp size={14} /> Upload ảnh
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setPosterFromFile(file)
              e.target.value = ''
            }}
          />

          <div className="flex gap-2">
            <Input
              label="Poster URL"
              value={posterUrlInput}
              onChange={(e) => setPosterUrlInput(e.target.value)}
              placeholder="https://..."
            />
            <Button type="button" variant="outline" className="mt-6 h-10" onClick={handleLoadUrl}>
              <Link2 size={14} /> Load
            </Button>
          </div>

          {posterPreview ? (
            <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-alt)]">
              <img src={posterPreview} alt="Poster preview" className="w-full h-56 object-cover" />
            </div>
          ) : (
            <div className="h-44 rounded-xl border border-dashed border-[var(--border)] flex items-center justify-center text-xs text-[var(--text-subtle)]">
              Dán ảnh (Ctrl+V), upload file, hoặc nhập URL để xem trước
            </div>
          )}

          {posterError && <p className="text-sm text-red-500">{posterError}</p>}
        </div>
        <Input label="Nguồn (ghi chú)" value={form.sourceNote} onChange={set('sourceNote')}
          placeholder="Ví dụ: Dịch từ nguồn X" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={createStory.isPending || isSubmitting || uploadPoster.isPending || uploadPosterFromUrl.isPending}>Tạo truyện</Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/author')}>Hủy</Button>
        </div>
      </form>
    </div>
  )
}
