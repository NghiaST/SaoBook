// src/pages/BookshelfPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMyBookshelf, useRemoveFromBookshelf, useMyHistory } from '@/lib/queries'
import { Spinner, EmptyState, Button } from '@/components/ui'
import { BookMarked, BookOpen, Trash2, History, Clock } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Accept a bare array or a wrapped one ({ data: [...] }); never throw. */
function toList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload
  const wrapped = (payload as { data?: unknown } | null)?.data
  return Array.isArray(wrapped) ? wrapped : []
}

/** formatRelativeTime can throw / return "Invalid Date" on bad input. */
function timeAgo(value?: string | null): string {
  if (!value) return ''
  try {
    return formatRelativeTime(value)
  } catch {
    return ''
  }
}

function Poster({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="w-14 h-20 rounded-lg bg-[var(--bg-alt)] flex items-center justify-center">
        <BookOpen size={18} className="text-[var(--text-subtle)]" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-14 h-20 rounded-lg object-cover"
    />
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm text-[var(--text-muted)]">Không tải được dữ liệu.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>Thử lại</Button>
    </div>
  )
}

const Loading = () => (
  <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
)

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryItem({ item }: { item: any }) {
  const story = item?.story
  if (!story?.nameId) return null // story deleted or payload incomplete

  const lastChapter = item.lastChapter
  const chapterId = lastChapter?.id ?? item.lastChapterId
  const totalChapters = story._count?.chapters
  const chapterHref = chapterId != null ? `/stories/${story.nameId}/chapters/${chapterId}` : null

  return (
    <div className="card p-4 flex gap-3 hover:border-[var(--text-subtle)] transition-all">
      <Link to={`/stories/${story.nameId}`} className="shrink-0">
        <Poster src={story.posterUrl} alt={story.name} />
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={`/stories/${story.nameId}`}
          className="font-display font-semibold text-[var(--text)] hover:text-accent transition-colors line-clamp-2 text-sm leading-snug block mb-1"
        >
          {story.name}
        </Link>

        {chapterHref && lastChapter && (
          <Link
            to={chapterHref}
            className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-ui mb-1.5"
          >
            <BookOpen size={11} />
            Đã đọc:{' '}
            <span className="font-semibold">
              {lastChapter.order}
              {totalChapters ? `/${totalChapters}` : ''}
            </span>
          </Link>
        )}

        <div className="flex items-center gap-1 text-xs text-[var(--text-subtle)]">
          <Clock size={10} />
          {timeAgo(item.lastReadAt)}
        </div>
      </div>

      {chapterHref && (
        <div className="shrink-0 self-center">
          <Link to={chapterHref} className="btn-outline text-xs px-2 py-1.5 whitespace-nowrap">
            Đọc tiếp
          </Link>
        </div>
      )}
    </div>
  )
}

function HistoryTab() {
  const { data, isLoading, isError, refetch } = useMyHistory()

  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const items = toList(data).filter((h) => h?.story?.nameId)
  if (!items.length) {
    return (
      <EmptyState
        icon={<History size={40} />}
        title="Chưa có lịch sử đọc"
        description="Đọc truyện để lưu lịch sử"
      />
    )
  }

  return (
    <div className="space-y-3">
      {items.map((h, i) => (
        <HistoryItem key={h.id ?? `${h.storyId}-${i}`} item={h} />
      ))}
    </div>
  )
}

// ── Bookshelf Tab ─────────────────────────────────────────────────────────────

function BookshelfTab() {
  const { data, isLoading, isError, refetch } = useMyBookshelf()
  const remove = useRemoveFromBookshelf()

  if (isLoading) return <Loading />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const items = toList(data).filter((b) => b?.story?.nameId)
  if (!items.length) {
    return (
      <EmptyState
        icon={<BookMarked size={40} />}
        title="Tủ truyện trống"
        description="Lưu truyện yêu thích để đọc sau"
      />
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const storyId = item.storyId ?? item.story.id

        return (
          <div
            key={item.id ?? `${storyId}-${i}`}
            className="card p-4 flex gap-3 group hover:border-[var(--text-subtle)] transition-all"
          >
            <Link
              to={`/stories/${item.story.nameId}`}
              className="shrink-0"
            >
              <Poster
                src={item.story.posterUrl}
                alt={item.story.name}
              />
            </Link>

            <div className="flex-1 min-w-0">
              <Link
                to={`/stories/${item.story.nameId}`}
                className="font-display font-semibold text-[var(--text)] hover:text-accent transition-colors line-clamp-2 text-sm leading-snug block mb-1"
              >
                {item.story.name}
              </Link>

              {item.note && (
                <p className="text-xs text-[var(--text-subtle)] mt-1 line-clamp-2 font-body italic">
                  {item.note}
                </p>
              )}

              <p className="text-xs text-[var(--text-subtle)] mt-2">
                {timeAgo(item.savedAt)}
              </p>
            </div>

            <button
              onClick={() => remove.mutate(storyId)}
              disabled={remove.isPending}
              className="sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 text-red-400 hover:text-red-600 disabled:opacity-40 transition-all self-start mt-0.5"
              title="Xóa khỏi tủ"
              aria-label={`Xóa ${item.story.name} khỏi tủ truyện`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── BookshelfPage ─────────────────────────────────────────────────────────────

type Tab = 'history' | 'bookshelf'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'history', label: 'Lịch sử đọc', icon: <History size={14} /> },
  { key: 'bookshelf', label: 'Tủ truyện', icon: <BookMarked size={14} /> },
]

export function BookshelfPage() {
  const [tab, setTab] = useState<Tab>('history')

  return (
    <div className="page-container py-8 max-w-2xl">
      <h1 className="section-title">Tủ sách của tôi</h1>

      <div className="border-b border-[var(--border)] flex gap-1 mb-6" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-ui font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-accent text-accent'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'history' ? <HistoryTab /> : <BookshelfTab />}
    </div>
  )
}