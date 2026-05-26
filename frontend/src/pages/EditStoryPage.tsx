// src/pages/EditStoryPage.tsx
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMyStories, useUpdateStory } from '@/lib/queries'
import { Input, Button, Spinner } from '@/components/ui'
import { PosterInput } from '@/features/story/PosterInput'

export function EditStoryPage() {
  const { id: idParam }    = useParams<{ id: string }>()
  const storyId = idParam ? Number(idParam) : NaN
  const navigate  = useNavigate()
  const { data: stories, isLoading } = useMyStories()
  const updateStory = useUpdateStory()

  const story = stories?.find((s) => s.id === storyId)

  const [form, setForm] = useState({ name: '', description: '', sourceNote: '' })
  // poster: start with null File (existing posterUrl shown separately as initial preview)
  const [posterFile,    setPosterFile]    = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ name?: string }>({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (story) {
      setForm({
        name:        story.name,
        description: story.description ?? '',
        sourceNote:  story.sourceNote  ?? '',
      })
      // Show existing poster as initial preview (no File — won't be re-uploaded unless changed)
      setPosterPreview(story.posterUrl ?? '')
      setPosterFile(null)
      setFieldErrors({})
      setFormError('')
    }
  }, [story])

  const clearFieldError = (key: 'name') =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))

  const setField = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setForm((f) => ({ ...f, name: val }))
    clearFieldError('name')
  }

  const normalize = (value: string) => value.trim()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!Number.isFinite(storyId)) return
    setFormError('')

    const nextErrors: typeof fieldErrors = {}
    const name = normalize(form.name)
    const description = form.description
    const sourceNote = form.sourceNote

    if (!name) nextErrors.name = 'Vui lòng nhập tên truyện'

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setForm((f) => ({ ...f, name }))

    updateStory.mutate(
      {
        id: storyId,
        name,
        description,
        sourceNote,
        // only include posterFile if user picked a new one
        // if posterFile is null, backend keeps the existing posterUrl untouched
        posterFile: posterFile ?? undefined,
      },
      {
        onSuccess: () => navigate('/author'),
        onError: (err: any) =>
          setFormError(err.response?.data?.message ?? err.message ?? 'Lỗi cập nhật'),
      },
    )
  }

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="w-8 h-8" /></div>
  if (!story)   return <div className="page-container py-10 text-center text-[var(--text-muted)]">Không tìm thấy truyện</div>

  return (
    <div className="page-container py-8 max-w-xl">
      <h1 className="section-title">Chỉnh sửa truyện</h1>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {/*
          PosterInput initialises with existing posterUrl as preview string.
          If user picks/pastes a new image → posterFile becomes a File object.
          If user never touches it → posterFile stays null → backend keeps old poster.
        */}
        <PosterInput
          file={posterFile}
          preview={posterPreview}
          onChange={(f, p) => { setPosterFile(f); setPosterPreview(p) }}
        />

        <Input
          label="Tên truyện"
          value={form.name}
          onChange={handleNameChange}
          error={fieldErrors.name}
          required
        />

        <div>
          <label className="label">Giới thiệu truyện</label>
          <textarea
            value={form.description}
            onChange={setField('description')}
            rows={4}
            className="input resize-none"
          />
        </div>

        <Input
          label="Nguồn (ghi chú)"
          value={form.sourceNote}
          onChange={setField('sourceNote')}
        />

        {formError && <p className="text-sm text-red-500">{formError}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={updateStory.isPending}>Lưu thay đổi</Button>
          <Button type="button" variant="ghost" onClick={() => navigate('/author')}>Hủy</Button>
        </div>
      </form>
    </div>
  )
}