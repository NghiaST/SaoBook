// src/pages/AddStoryPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateStory } from '@/lib/queries'
import { Input, Button } from '@/components/ui'
import { PosterInput } from '@/features/story/PosterInput'
import { slugify } from '@/lib/utils'

export function AddStoryPage() {
  const navigate     = useNavigate()
  const createStory  = useCreateStory()

  const [form, setForm] = useState({
    name: '', nameId: '', description: '', sourceNote: '',
  })
  const [slugLocked, setSlugLocked] = useState(false)
  // poster held as File (for FormData) + preview URL (for <img>)
  const [posterFile,    setPosterFile]    = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    nameId?: string
    poster?: string
  }>({})
  const [formError, setFormError] = useState('')

  const clearFieldError = (key: 'name' | 'nameId' | 'poster') =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))

  const setField = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.value
      setForm((f) => ({ ...f, [k]: val }))
    }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm((f) => ({
      ...f,
      name: val,
      ...(slugLocked ? {} : { nameId: slugify(val) }),
    }))
    clearFieldError('name')
    if (!slugLocked) clearFieldError('nameId')
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!slugLocked) setSlugLocked(true)
    setForm((f) => ({ ...f, nameId: slugify(val) }))
    clearFieldError('nameId')
  }

  const normalize = (value: string) => value.trim()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const nextErrors: typeof fieldErrors = {}
    const name = normalize(form.name)
    const nameId = slugify(normalize(form.nameId))

    if (!name) nextErrors.name = 'Vui lòng nhập tên truyện'
    if (!nameId) nextErrors.nameId = 'Slug không hợp lệ'
    if (!posterFile) nextErrors.poster = 'Vui lòng chọn poster'

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setForm((f) => ({ ...f, name, nameId }))

    const formData = new FormData()
    formData.append('name', name)
    formData.append('nameId', nameId)
    if (form.description) formData.append('description', form.description)
    if (form.sourceNote) formData.append('sourceNote', form.sourceNote)
    if (posterFile) formData.append('posterFile', posterFile)

    createStory.mutate(formData, {
      onSuccess: () => navigate('/author'),
      onError: (err: any) =>
        setFormError(err.response?.data?.message ?? err.message ?? 'Lỗi tạo truyện'),
    })
  }

  return (
    <div className="page-container py-8 max-w-xl">
      <h1 className="section-title">Thêm truyện mới</h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {/*
          PosterInput:
          - chọn file → File object
          - paste/nhập URL → fetch blob → new File(...)
          - Ctrl+V ảnh từ clipboard → File object
          Tất cả đều kết thúc bằng 1 File object, gửi cùng FormData khi submit
        */}
        <PosterInput
          file={posterFile}
          preview={posterPreview}
          onChange={(f, p) => {
            setPosterFile(f)
            setPosterPreview(p)
            if (f) clearFieldError('poster')
          }}
        />
        {fieldErrors.poster && <p className="text-xs text-red-500">{fieldErrors.poster}</p>}

        <Input
          label="Tên truyện"
          value={form.name}
          onChange={handleNameChange}
          error={fieldErrors.name}
          required
        />

        <Input
          label="Slug (URL)"
          value={form.nameId}
          onChange={handleSlugChange}
          error={fieldErrors.nameId}
          required
          placeholder="ten-truyen-viet-thuong"
        />

        <div>
          <label className="label">Giới thiệu truyện</label>
          <textarea
            value={form.description}
            onChange={setField('description')}
            rows={4}
            className="input resize-none"
            placeholder="Tóm tắt nội dung…"
          />
        </div>

        <Input
          label="Nguồn (ghi chú)"
          value={form.sourceNote}
          onChange={setField('sourceNote')}
          placeholder="Ví dụ: Dịch từ nguồn X"
        />

        {formError && <p className="text-sm text-red-500">{formError}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={createStory.isPending}>Tạo truyện</Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/author')}>Hủy</Button>
        </div>
      </form>
    </div>
  )
}