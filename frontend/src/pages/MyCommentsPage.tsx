// src/pages/MyCommentsPage.tsx
import { Link } from 'react-router-dom'
import { useMyComments } from '@/lib/queries'
import { Spinner, EmptyState } from '@/components/ui'
import { MessageSquare } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

export function MyCommentsPage() {
  const { data, isLoading } = useMyComments()
  return (
    <div className="page-container py-8 max-w-2xl">
      <h1 className="section-title flex items-center gap-2">
        <MessageSquare className="text-accent" size={22} /> Bình luận của tôi
      </h1>
      {isLoading ? <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
       : !data?.length ? <EmptyState icon={<MessageSquare size={40} />} title="Chưa có bình luận nào" />
       : (
        <div className="flex flex-col gap-3">
          {data.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Link to={`/stories/${c.story.nameId}`}
                  className="text-sm font-semibold font-ui text-accent hover:underline">
                  {c.story.name}
                </Link>
                {c.chapter && (
                  <>
                    <span className="text-[var(--text-subtle)]">·</span>
                    <Link to={`/stories/${c.story.nameId}/chapters/${c.chapter.id}`}
                      className="text-xs text-[var(--text-subtle)] hover:text-accent">
                      {c.chapter.name}
                    </Link>
                  </>
                )}
                <span className="text-xs text-[var(--text-subtle)] ml-auto">{formatRelativeTime(c.createdAt)}</span>
              </div>
              <p className="text-sm font-body text-[var(--text-muted)] leading-relaxed">{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
