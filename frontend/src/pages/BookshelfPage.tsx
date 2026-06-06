// src/pages/BookshelfPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMyBookshelf, useRemoveFromBookshelf, useMyHistory, useChapterList } from '@/lib/queries'
import { Spinner, EmptyState } from '@/components/ui'
import { BookMarked, BookOpen, Trash2, History, Clock } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryItem({ item }: { item: any }) {
  const story = item.story
  const lastChapter = item.lastChapter
  const totalChapters = story?._count?.chapters

  // Guard: bỏ qua nếu thiếu dữ liệu quan trọng
  if (!story?.nameId) return null

  return (
    <div className="card p-4 flex gap-3 group hover:border-[var(--text-subtle)] transition-all">
      <Link to={`/stories/${story.nameId}`} className="shrink-0">
        {story.posterUrl ? (
          <img
            src={story.posterUrl}
            alt={story.name}
            className="w-14 h-20 rounded-lg object-cover"
          />
        ) : (
          <div className="w-14 h-20 rounded-lg bg-[var(--bg-alt)] flex items-center justify-center">
            <BookOpen size={18} className="text-[var(--text-subtle)]" />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <Link
          to={`/stories/${story.nameId}`}
          className="font-display font-semibold text-[var(--text)] hover:text-accent transition-colors line-clamp-2 text-sm leading-snug block mb-1"
        >
          {story.name}
        </Link>

        {/* Last chapter + progress */}
        {lastChapter && (
          <Link
            to={`/stories/${story.nameId}/chapters/${item.lastChapterId}`}
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

        {/* Time */}
        <div className="flex items-center gap-1 text-xs text-[var(--text-subtle)]">
          <Clock size={10} />
          {formatRelativeTime(item.lastReadAt)}
        </div>
      </div>

      {/* Tiếp tục đọc */}
      {item.lastChapterId && (
        <div className="shrink-0 self-center">
          <Link
            to={`/stories/${story.nameId}/chapters/${item.lastChapterId}`}
            className="btn-outline text-xs px-2 py-1.5 whitespace-nowrap"
          >
            Đọc tiếp
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Bookshelf Tab ─────────────────────────────────────────────────────────────

function BookshelfGrid() {
  const { data, isLoading } = useMyBookshelf()
  const remove = useRemoveFromBookshelf()

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
  if (!data?.length) {
    return (
      <EmptyState
        icon={<BookMarked size={40} />}
        title="Tủ truyện trống"
        description="Lưu truyện yêu thích để đọc sau"
      />
    )
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((item) => (
        <div key={item.id} className="card p-4 flex gap-3 group hover:border-[var(--text-subtle)] transition-all">
          <Link to={`/stories/${item.story.nameId}`} className="shrink-0">
            {item.story.posterUrl ? (
              <img
                src={item.story.posterUrl}
                alt={item.story.name}
                className="w-14 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-14 h-20 rounded-lg bg-[var(--bg-alt)] flex items-center justify-center">
                <BookOpen size={18} className="text-[var(--text-subtle)]" />
              </div>
            )}
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
              {formatRelativeTime(item.savedAt)}
            </p>
          </div>

          <button
            onClick={() => remove.mutate(item.storyId)}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all self-start mt-0.5"
            title="Xóa khỏi tủ"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ── BookshelfPage ─────────────────────────────────────────────────────────────

export function BookshelfPage() {
  const [tab, setTab] = useState<'history' | 'bookshelf'>('history')
  const { data: history, isLoading: histLoading } = useMyHistory()

  const tabs = [
    { key: 'history' as const, label: 'Lịch sử đọc', icon: <History size={14} /> },
    { key: 'bookshelf' as const, label: 'Tủ truyện', icon: <BookMarked size={14} /> },
  ]

  return (
    <div className="page-container py-8">
      {/* Header */}
      <h1 className="section-title">Tủ sách của tôi</h1>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] flex gap-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
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

      {/* History tab */}
      {tab === 'history' && (
        <>
          {histLoading ? (
            <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
          ) : !history?.length ? (
            <EmptyState
              icon={<History size={40} />}
              title="Chưa có lịch sử đọc"
              description="Đọc truyện để lưu lịch sử"
            />
          ) : (
            <div className="space-y-3 max-w-2xl">
              {history.map((h) => (
                <HistoryItem key={h.id} item={h} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Bookshelf tab */}
      {tab === 'bookshelf' && <BookshelfGrid />}
    </div>
  )
}