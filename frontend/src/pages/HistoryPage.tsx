// src/pages/HistoryPage.tsx
import { Link } from 'react-router-dom'
import { useMyHistory } from '@/lib/queries'
import { Spinner, EmptyState } from '@/components/ui'
import { Clock, BookOpen } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export function HistoryPage() {
  const { data, isLoading } = useMyHistory()
  return (
    <div className="page-container py-8">
      <h1 className="section-title flex items-center gap-2">
        <Clock className="text-accent" size={22} /> Truyện đã đọc
      </h1>
      {isLoading ? <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
       : !data?.length ? <EmptyState icon={<Clock size={40} />} title="Chưa đọc truyện nào" />
       : (
        <div className="flex flex-col gap-3">
          {data.map((item) => (
            <div key={item.id} className="card p-4 flex gap-4 items-center">
              {item.story.posterUrl
                ? <img src={item.story.posterUrl} alt={item.story.name} className="w-12 h-16 rounded-lg object-cover shrink-0" />
                : <div className="w-12 h-16 rounded-lg bg-[var(--bg-alt)] flex items-center justify-center shrink-0"><BookOpen size={18} className="text-[var(--text-subtle)]" /></div>
              }
              <div className="flex-1 min-w-0">
                <Link to={`/stories/${item.story.nameId}`}
                  className="font-display font-semibold text-[var(--text)] hover:text-accent transition-colors line-clamp-1">
                  {item.story.name}
                </Link>
                <p className="text-sm text-[var(--text-subtle)] font-ui mt-0.5">
                  Đọc đến: <span className="text-[var(--text-muted)]">{item.lastChapter.name}</span>
                </p>
                <p className="text-xs text-[var(--text-subtle)] mt-0.5">{formatRelativeTime(item.lastReadAt)}</p>
              </div>
              <Link to={`/stories/${item.story.nameId}/chapters/${item.lastChapterId}`}
                className="btn-outline text-xs shrink-0">
                Đọc tiếp
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
