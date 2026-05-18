// src/pages/HomePage.tsx
import { Link } from 'react-router-dom'
import { useStories } from '@/lib/queries'
import { StarRating, Spinner, EmptyState } from '@/components/ui'
import { BookOpen, TrendingUp, Clock } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { Story } from '@/types'

function StoryCard({ story }: { story: Story }) {
  return (
    <Link to={`/stories/${story.nameId}`} className="group flex gap-3 p-3 rounded-xl hover:bg-[var(--bg-alt)] transition-colors">
      {story.posterUrl ? (
        <img src={story.posterUrl} alt={story.name}
          className="w-16 h-22 object-cover rounded-lg shrink-0 shadow-sm group-hover:shadow-md transition-shadow"
          style={{ height: '88px' }}
        />
      ) : (
        <div className="w-16 shrink-0 rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] flex items-center justify-center" style={{ height: '88px' }}>
          <BookOpen className="w-6 h-6 text-[var(--text-subtle)]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-semibold text-[var(--text)] group-hover:text-accent transition-colors line-clamp-2 leading-snug">
          {story.name}
        </h3>
        <p className="text-xs text-[var(--text-subtle)] font-ui mt-1">{story.author?.name}</p>
        {story.avgRating != null && (
          <div className="mt-1.5">
            <StarRating value={Math.round(story.avgRating)} size={13} />
          </div>
        )}
        <p className="text-xs text-[var(--text-muted)] font-ui mt-1">
          {story._count?.chapters ?? 0} chương · {formatRelativeTime(story.updatedAt)}
        </p>
      </div>
    </Link>
  )
}

function Section({ title, icon, stories, loading }: {
  title: string; icon: React.ReactNode; stories?: Story[]; loading: boolean
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-accent">{icon}</span>
        <h2 className="section-title mb-0">{title}</h2>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !stories?.length ? (
        <EmptyState title="Chưa có truyện" />
      ) : (
        <div className="grid gap-1">
          {stories.map((s) => <StoryCard key={s.id} story={s} />)}
        </div>
      )}
    </section>
  )
}

export function HomePage() {
  const newest = useStories({ sort: 'newest', limit: 10 })
  const topRated = useStories({ sort: 'rating', limit: 10 })
  const popular = useStories({ sort: 'popular', limit: 10 })

  return (
    <div className="page-container py-10">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-[var(--text)] mb-3">
          Thư Viện Truyện
        </h1>
        <p className="text-[var(--text-muted)] font-body text-lg max-w-xl mx-auto">
          Đọc nghe hàng ngàn câu chuyện — từ cổ điển đến hiện đại.
        </p>
        <Link to="/stories" className="btn-primary mt-5 inline-flex">
          Khám phá tất cả truyện
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-10">
        <Section title="Mới nhất" icon={<Clock size={18} />}
          stories={newest.data?.stories} loading={newest.isLoading} />
        <Section title="Đề cử" icon={<TrendingUp size={18} />}
          stories={topRated.data?.stories} loading={topRated.isLoading} />
        <Section title="Đọc nhiều" icon={<BookOpen size={18} />}
          stories={popular.data?.stories} loading={popular.isLoading} />
      </div>
    </div>
  )
}
