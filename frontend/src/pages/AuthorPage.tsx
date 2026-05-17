// src/pages/AuthorPage.tsx
import { Link } from 'react-router-dom'
import { useMyStories, useDeleteStory } from '@/lib/queries'
import { Spinner, EmptyState, Button, Badge } from '@/components/ui'
import { Plus, BookOpen, Edit, Trash2, List } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'

export function AuthorPage() {
  const { data: stories, isLoading } = useMyStories()
  const deleteStory = useDeleteStory()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  return (
    <div className="page-container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title mb-0">Quản lý truyện</h1>
        <Link to="/author/stories/new" className="btn-primary gap-2">
          <Plus size={16} /> Thêm truyện
        </Link>
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
       : !stories?.length ? (
        <EmptyState icon={<BookOpen size={40} />} title="Chưa có truyện nào"
          description="Bắt đầu bằng cách thêm truyện mới" />
       ) : (
        <div className="flex flex-col gap-3">
          {stories.map((s) => (
            <div key={s.id} className="card p-4 flex gap-4 items-center">
              {s.posterUrl
                ? <img src={s.posterUrl} alt={s.name} className="w-14 h-20 rounded-lg object-cover shrink-0" />
                : <div className="w-14 h-20 rounded-lg bg-[var(--bg-alt)] flex items-center justify-center shrink-0">
                    <BookOpen size={20} className="text-[var(--text-subtle)]" />
                  </div>
              }
              <div className="flex-1 min-w-0">
                <Link to={`/stories/${s.nameId}`}
                  className="font-display font-semibold text-[var(--text)] hover:text-accent transition-colors line-clamp-1">
                  {s.name}
                </Link>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  <Badge>{(s as any)._count?.chapters ?? 0} chương</Badge>
                  <Badge>{(s as any)._count?.chapterReadLogs ?? 0} lượt đọc</Badge>
                  <span className="text-xs text-[var(--text-subtle)]">Cập nhật {formatDate(s.updatedAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/author/stories/${s.id}/chapters`} className="btn-ghost p-2" title="Quản lý chương">
                  <List size={16} />
                </Link>
                <Link to={`/author/stories/${s.id}/edit`} className="btn-ghost p-2" title="Chỉnh sửa">
                  <Edit size={16} />
                </Link>
                {confirmDelete === s.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="danger"
                      loading={deleteStory.isPending}
                      onClick={() => deleteStory.mutate(s.id, { onSuccess: () => setConfirmDelete(null) })}>
                      Xác nhận xóa
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Hủy</Button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(s.id)} className="btn-ghost p-2 text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
       )}
    </div>
  )
}
