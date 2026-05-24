// src/features/story/PosterInput.tsx
import { useRef, useState, useCallback } from 'react'
import { Spinner } from '@/components/ui'
import { Upload, Link, X, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PosterInputProps {
  file: File | null                   // actual File object held by parent
  preview: string                     // object URL for <img>
  onChange: (file: File | null, preview: string) => void
  className?: string
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
const MAX_MB  = 10

function makePreview(file: File) {
  return URL.createObjectURL(file)
}

function validateFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return 'File phải là ảnh (JPEG, PNG, WebP…)'
  if (file.size > MAX_MB * 1024 * 1024) return `Ảnh tối đa ${MAX_MB} MB`
  return null
}

export function PosterInput({ file, preview, onChange, className }: PosterInputProps) {
  const fileRef   = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState('')
  const [showUrl,  setShowUrl]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const setFile = useCallback((f: File) => {
    const err = validateFile(f)
    if (err) { setError(err); return }
    setError('')
    if (preview) URL.revokeObjectURL(preview)   // free old object URL
    onChange(f, makePreview(f))
  }, [preview, onChange])

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview)
    onChange(null, '')
    setError('')
  }

  // ── File picker ───────────────────────────────────────────────────────────

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
    e.target.value = ''
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) setFile(f)
  }

  // ── Paste (image data or URL text) ────────────────────────────────────────

  const onPaste = (e: React.ClipboardEvent) => {
    // Case 1: pasted image from clipboard
    const imgItem = Array.from(e.clipboardData.items)
      .find(i => i.kind === 'file' && i.type.startsWith('image/'))
    if (imgItem) {
      const f = imgItem.getAsFile()
      if (f) { setFile(f); return }
    }

    // Case 2: pasted text URL → fetch it
    const text = e.clipboardData.getData('text').trim()
    if (text.startsWith('http')) fetchFromUrl(text)
  }

  // ── Fetch URL → File (stays in browser, no server round-trip) ────────────

  const fetchFromUrl = async (url: string) => {
    if (!url.startsWith('http')) { setError('URL không hợp lệ'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Không tải được ảnh')

      const blob = await res.blob()
      if (!blob.type.startsWith('image/')) throw new Error('URL không phải ảnh')
      if (blob.size > MAX_MB * 1024 * 1024) throw new Error(`Ảnh tối đa ${MAX_MB} MB`)

      // Convert Blob → File so FormData sends it correctly
      const ext  = blob.type.split('/')[1] ?? 'jpg'
      const name = url.split('/').pop()?.split('?')[0] ?? `poster.${ext}`
      const f    = new File([blob], name, { type: blob.type })

      if (preview) URL.revokeObjectURL(preview)
      onChange(f, makePreview(f))
      setUrlInput('')
      setShowUrl(false)
    } catch (err: any) {
      setError(err.message ?? 'Lỗi tải ảnh')
    } finally {
      setLoading(false)
    }
  }

  const handleUrlSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    fetchFromUrl(urlInput.trim())
  }

  return (
    <div className={cn('space-y-2', className)}>
      <label className="label">Poster</label>

      {/* Preview + clear */}
      {preview && (
        <div className="relative w-fit">
          <img src={preview} alt="Poster preview"
            className="w-32 h-44 object-cover rounded-xl border border-[var(--border)] shadow-sm" />
          <button type="button" onClick={clear}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white
                       flex items-center justify-center shadow hover:bg-red-600 transition-colors">
            <X size={12} />
          </button>
          {file && (
            <p className="mt-1 text-xs text-[var(--text-subtle)] max-w-[128px] truncate">
              {file.name}
            </p>
          )}
        </div>
      )}

      {/* Drop zone */}
      <div
        role="button" tabIndex={0}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onPaste={onPaste}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
        className={cn(
          'border-2 border-dashed border-[var(--border)] rounded-xl p-6',
          'flex flex-col items-center gap-2 text-center cursor-pointer',
          'hover:border-accent/60 hover:bg-[var(--bg-alt)] transition-all',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          loading && 'pointer-events-none opacity-60',
        )}
      >
        {loading
          ? <><Spinner className="w-7 h-7" /><p className="text-sm text-[var(--text-muted)]">Đang tải ảnh…</p></>
          : <>
              <ImageIcon className="w-8 h-8 text-[var(--text-subtle)]" />
              <div className="text-sm text-[var(--text-muted)]">
                <span className="text-accent font-medium">Chọn file</span> hoặc kéo thả
                <br />
                <span className="text-xs text-[var(--text-subtle)]">Ctrl+V để dán ảnh hoặc link</span>
              </div>
            </>
        }
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button type="button" onClick={() => fileRef.current?.click()}
          className="btn-outline text-xs gap-1.5 flex-1">
          <Upload size={13} /> Chọn file
        </button>
        <button type="button"
          onClick={() => { setShowUrl(v => !v); setError('') }}
          className={cn('btn-outline text-xs gap-1.5 flex-1', showUrl && 'border-accent text-accent')}>
          <Link size={13} /> Nhập link
        </button>
      </div>

      {/* URL input */}
      {showUrl && (
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <input
            autoFocus
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text').trim()
              if (text.startsWith('http')) {
                e.preventDefault()
                fetchFromUrl(text)
              }
            }}
            placeholder="https://example.com/poster.jpg"
            className="input text-sm flex-1"
          />
          <button type="submit" disabled={loading || !urlInput.trim()}
            className="btn-primary text-sm px-3">
            {loading ? <Spinner className="w-4 h-4" /> : 'Tải'}
          </button>
        </form>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
    </div>
  )
}
