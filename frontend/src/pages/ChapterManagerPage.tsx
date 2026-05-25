// src/pages/ChapterManagerPage.tsx
import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import {
  useChapterList, useMyStories, useCreateChapter,
  useUpdateChapter, useDeleteChapter,
} from '@/lib/queries'
import api from '@/lib/api'
import { Button, Spinner, Input, EmptyState } from '@/components/ui'
import { Plus, Edit2, Trash2, Check, X, Upload } from 'lucide-react'
import type { Chapter } from '@/types'

interface EditState { name: string; content: string }

function ChapterRow({
  chapter, storyId,
  onDelete,
}: {
  chapter: Chapter; storyId: string
  onDelete: (id: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditState>({ name: chapter.name, content: '' })
  const [originalContent, setOriginalContent] = useState('')
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const updateChapter = useUpdateChapter()
  const deleteChapter = useDeleteChapter(storyId)

  const loadContent = async () => {
    setContentLoading(true)
    setContentError('')
    try {
      const { data } = await api.get<Chapter>(`/chapters/${chapter.id}`)
      if (data.contentUrl) {
        const res = await axios.get<string>(data.contentUrl, { responseType: 'text' })
        setForm((f) => ({ ...f, content: res.data }))
        setOriginalContent(res.data)
      } else {
        setForm((f) => ({ ...f, content: '' }))
        setOriginalContent('')
      }
    } catch {
      setContentError('Không thể tải nội dung chương.')
    } finally {
      setContentLoading(false)
    }
  }

  const startEdit = () => {
    setEditing(true)
    setForm({ name: chapter.name, content: '' })
    setOriginalContent('')
    void loadContent()
  }

  const saveEdit = () => {
    const payload: { id: number; name?: string; content?: string } = { id: chapter.id, name: form.name }
    const trimmed = form.content.trim()
    const originalTrimmed = originalContent.trim()
    if (trimmed && trimmed !== originalTrimmed) {
      payload.content = form.content
    }
    updateChapter.mutate(payload, { onSuccess: () => setEditing(false) })
  }

  const handleDelete = () => {
    deleteChapter.mutate(chapter.id, {
      onSuccess: () => { onDelete(chapter.id); setConfirmDelete(false) }
    })
  }

  return (
    <div className="card p-3 flex gap-3 items-start group">
      <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
        <span className="text-xs font-mono text-[var(--text-subtle)] w-8 text-center">{chapter.order}</span>
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Tên chương" />
            <textarea value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={6} className="input resize-y text-sm font-body"
              placeholder={contentLoading ? 'Đang tải nội dung…' : 'Nội dung chương…'}
              disabled={contentLoading}
            />
            {contentError && <p className="text-xs text-red-500">{contentError}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} loading={updateChapter.isPending} disabled={contentLoading}>
                <Check size={13} /> Lưu
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X size={13} /> Hủy
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm font-ui text-[var(--text)] truncate">{chapter.name}</p>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={startEdit}
            className="btn-ghost p-1.5 rounded-lg" title="Chỉnh sửa">
            <Edit2 size={14} />
          </button>
          {confirmDelete ? (
            <>
              <Button size="sm" variant="danger" loading={deleteChapter.isPending} onClick={handleDelete}>
                Xóa?
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Hủy</Button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="btn-ghost p-1.5 rounded-lg text-red-400 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function ChapterManagerPage() {
  const { id: storyId } = useParams<{ id: string }>()
  const { data: stories } = useMyStories()
  const { data: chapters, isLoading } = useChapterList(
    stories?.find((s) => s.id === storyId)?.nameId ?? ''
  )
  const createChapter = useCreateChapter(storyId!)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [newChapter, setNewChapter] = useState({ name: '', content: '' })
  const [showForm, setShowForm] = useState(false)
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set())

  const story = stories?.find((s) => s.id === storyId)

  const parseChapterFile = (rawText: string, fallbackName: string) => {
    const lines = rawText.replace(/\r\n/g, '\n').split('\n')
    const name = lines[0]?.trim() || fallbackName
    let contentLines = lines.slice(3)
    if (!contentLines.length) contentLines = lines.slice(1)
    const content = contentLines.join('\n').trim()
    return { name, content }
  }

  const handleAdd = () => {
    if (!newChapter.name.trim() || !newChapter.content.trim()) return
    createChapter.mutate(newChapter, {
      onSuccess: () => { setNewChapter({ name: '', content: '' }); setShowForm(false) }
    })
  }

  // Batch file upload — reads each .txt file as a chapter
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    for (const file of files) {
      const rawText = await file.text()
      const fallbackName = file.name.replace(/\.[^.]+$/, '')
      const { name, content } = parseChapterFile(rawText, fallbackName)
      if (!name.trim() || !content.trim()) continue
      await new Promise<void>((resolve) =>
        createChapter.mutate({ name, content }, { onSuccess: () => resolve(), onError: () => resolve() })
      )
    }
    e.target.value = ''
  }

  const visibleChapters = chapters?.filter((c) => !deletedIds.has(c.id)) ?? []

  return (
    <div className="page-container py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="section-title mb-0">
          {story ? `Chương: ${story.name}` : 'Quản lý chương'}
        </h1>
        <Link to="/author" className="text-sm text-accent hover:underline font-ui">← Quay lại</Link>
      </div>
      <p className="text-sm text-[var(--text-subtle)] mb-6 font-ui">
        {visibleChapters.length} chương
      </p>

      {/* Actions */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <Button onClick={() => setShowForm(!showForm)} variant="outline" size="sm">
          <Plus size={15} /> Thêm chương
        </Button>
        <button onClick={() => fileInputRef.current?.click()}
          className="btn-outline text-sm gap-2">
          <Upload size={15} /> Upload file (.txt)
        </button>
        <input ref={fileInputRef} type="file" accept=".txt" multiple className="hidden"
          onChange={handleFileUpload} />
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card p-4 mb-4 space-y-3">
          <Input label="Tên chương" value={newChapter.name}
            onChange={(e) => setNewChapter((f) => ({ ...f, name: e.target.value }))}
            placeholder="Chương 1: Khởi đầu" />
          <div>
            <label className="label">Nội dung</label>
            <textarea value={newChapter.content}
              onChange={(e) => setNewChapter((f) => ({ ...f, content: e.target.value }))}
              rows={10} className="input resize-y font-body text-sm"
              placeholder="Dán nội dung chương vào đây…" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} loading={createChapter.isPending}>Thêm chương</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Hủy</Button>
          </div>
        </div>
      )}

      {/* Chapter list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div>
      ) : !visibleChapters.length ? (
        <EmptyState title="Chưa có chương nào" description="Thêm chương đầu tiên hoặc upload file .txt" />
      ) : (
        <div className="flex flex-col gap-2">
          {visibleChapters.map((ch) => (
            <ChapterRow key={ch.id} chapter={ch} storyId={storyId!}
              onDelete={(id) => setDeletedIds((s) => new Set([...s, id]))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
