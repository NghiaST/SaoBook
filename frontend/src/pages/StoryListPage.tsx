// src/pages/StoryListPage.tsx
import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useStories } from '@/lib/queries'
import { Spinner, EmptyState, StarRating, Badge } from '@/components/ui'
import { Search, BookOpen } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { Story } from '@/types'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'rating', label: 'Đề cử' },
  { value: 'popular', label: 'Đọc nhiều' },
]

function StoryRow({ story }: { story: Story }) {
  return (
    <Link to={`/stories/${story.nameId}`}
      className="flex gap-4 p-4 card hover:border-accent/40 transition-all group"
    >
      {story.posterUrl ? (
        <img src={story.posterUrl} alt={story.name}
          className="w-20 rounded-lg object-cover shrink-0 shadow-sm"
          style={{ height: '112px' }}
        />
      ) : (
        <div className="w-20 shrink-0 rounded-lg bg-[var(--bg-alt)] flex items-center justify-center" style={{ height: '112px' }}>
          <BookOpen className="w-7 h-7 text-[var(--text-subtle)]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-lg font-semibold text-[var(--text)] group-hover:text-accent transition-colors line-clamp-1">
          {story.name}
        </h3>
        <p className="text-sm text-[var(--text-subtle)] font-ui mb-2">{story.author?.name}</p>
        {story.description && (
          <p className="text-sm text-[var(--text-muted)] font-body line-clamp-2">{story.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {story.avgRating != null && <StarRating value={Math.round(story.avgRating)} size={14} />}
          <Badge>{story._count?.chapters ?? 0} chương</Badge>
          <span className="text-xs text-[var(--text-subtle)]">{formatRelativeTime(story.updatedAt)}</span>
        </div>
      </div>
    </Link>
  )
}

export function StoryListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [input, setInput] = useState(searchParams.get('q') ?? '')
  const q = searchParams.get('q') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const page = parseInt(searchParams.get('page') ?? '1')

  const { data, isLoading } = useStories({ q, sort, page, limit: 20 })

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams)
    p.set(key, value)
    if (key !== 'page') p.set('page', '1')
    setSearchParams(p)
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1

  return (
    <div className="page-container py-8">
      <h1 className="section-title">Danh sách truyện</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <form onSubmit={(e) => { e.preventDefault(); setParam('q', input) }} className="flex-1 min-w-52">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-subtle)]" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tìm tên truyện…"
              className="input pl-9"
            />
          </div>
        </form>
        <div className="flex gap-1">
          {SORT_OPTIONS.map((o) => (
            <button key={o.value}
              onClick={() => setParam('sort', o.value)}
              className={`px-3 py-2 rounded-lg text-sm font-ui transition-colors ${
                sort === o.value
                  ? 'bg-accent text-white'
                  : 'bg-[var(--bg-alt)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
      ) : !data?.stories.length ? (
        <EmptyState icon={<Search size={40} />} title="Không tìm thấy truyện" description="Thử từ khóa khác" />
      ) : (
        <>
          <p className="text-sm text-[var(--text-subtle)] mb-4 font-ui">
            {data.total} truyện {q && `· kết quả cho "${q}"`}
          </p>
          <div className="flex flex-col gap-3">
            {data.stories.map((s) => <StoryRow key={s.id} story={s} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i}
                  onClick={() => setParam('page', String(i + 1))}
                  className={`w-9 h-9 rounded-lg text-sm font-ui transition-colors ${
                    page === i + 1 ? 'bg-accent text-white' : 'bg-[var(--bg-alt)] text-[var(--text-muted)]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
