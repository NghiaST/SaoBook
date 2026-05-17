// src/pages/BookshelfPage.tsx
import { Link } from 'react-router-dom'
import { useMyBookshelf, useRemoveFromBookshelf } from '@/lib/queries'
import { Spinner, EmptyState, Button } from '@/components/ui'
import { BookMarked, BookOpen, Trash2 } from 'lucide-react'

export function BookshelfPage() {
  const { data, isLoading } = useMyBookshelf()
  const remove = useRemoveFromBookshelf()

  return (
    <div className="page-container py-8">
      <h1 className="section-title flex items-center gap-2">
        <BookMarked className="text-accent" size={22} /> Tủ truyện
      </h1>
      {isLoading ? <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
       : !data?.length ? <EmptyState icon={<BookMarked size={40} />} title="Tủ truyện trống" description="Lưu truyện yêu thích để đọc sau" />
       : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item) => (
            <div key={item.id} className="card p-4 flex gap-3 group">
              <Link to={`/stories/${item.story.nameId}`}>
                {item.story.posterUrl
                  ? <img src={item.story.posterUrl} alt={item.story.name} className="w-14 h-20 rounded-lg object-cover shrink-0" />
                  : <div className="w-14 h-20 rounded-lg bg-[var(--bg-alt)] flex items-center justify-center shrink-0"><BookOpen size={20} className="text-[var(--text-subtle)]" /></div>
                }
              </Link>
              <div className="flex-1 min-w-0">
                <Link to={`/stories/${item.story.nameId}`}
                  className="font-display font-semibold text-[var(--text)] hover:text-accent transition-colors line-clamp-2 text-sm leading-snug">
                  {item.story.name}
                </Link>
                {item.note && <p className="text-xs text-[var(--text-subtle)] mt-1 line-clamp-2 font-body italic">{item.note}</p>}
              </div>
              <button onClick={() => remove.mutate(item.storyId)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all self-start">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
