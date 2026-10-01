import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ExternalLink, Search, Trash2 } from 'lucide-react'
import { useAdminBooks, useDeleteStory } from '@/lib/queries'
import { Badge, Button, EmptyState, Spinner } from '@/components/ui'
import { formatDate } from '@/lib/utils'

const PAGE_SIZE = 20

export function BookManagerPanel() {
  const [q, setQ] = useState('')
  const [authorId, setAuthorId] = useState('')
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const deleteStory = useDeleteStory()
  const { data, isLoading, isFetching } = useAdminBooks({
    q: q.trim() || undefined,
    authorId: authorId.trim() || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-[var(--text)]">Book Manager</h2>
        <p className="text-sm text-[var(--text-subtle)] mt-1">Review stories, open their public pages, or remove them.</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            value={q}
            onChange={(event) => { setQ(event.target.value); setPage(1) }}
            placeholder="Search title or slug..."
            className="input pl-9 w-full"
          />
        </div>
        <input
          value={authorId}
          onChange={(event) => { setAuthorId(event.target.value); setPage(1) }}
          placeholder="Filter by author ID"
          className="input w-52"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div>
      ) : data?.books.length ? (
        <>
          <div className="flex items-center justify-between text-sm text-[var(--text-subtle)]">
            <span>{data.total.toLocaleString()} books</span>
            {isFetching && <Spinner className="w-4 h-4" />}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  {['Book', 'Author', 'Updated', 'Stats', ''].map((heading) => (
                    <th key={heading} className="pb-3 pr-4 font-ui font-medium text-[var(--text-muted)] whitespace-nowrap">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.books.map((book) => (
                  <tr key={book.id} className="group hover:bg-[var(--bg-alt)] transition-colors">
                    <td className="py-3 pr-4 min-w-64">
                      <div className="flex items-center gap-3">
                        {book.posterUrl ? (
                          <img src={book.posterUrl} alt="" className="w-10 h-14 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-14 rounded bg-[var(--bg-alt)] flex items-center justify-center shrink-0">
                            <BookOpen size={17} className="text-[var(--text-subtle)]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link to={`/stories/${book.nameId}`} className="font-medium text-[var(--text)] hover:text-accent line-clamp-2">
                            {book.name}
                          </Link>
                          <p className="text-xs text-[var(--text-subtle)] truncate">/{book.nameId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      <p className="text-[var(--text)]">{book.author?.name}</p>
                      <p className="text-xs text-[var(--text-subtle)]">@{book.author?.username}</p>
                    </td>
                    <td className="py-3 pr-4 text-[var(--text-subtle)] whitespace-nowrap">{formatDate(book.updatedAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-1.5 flex-wrap max-w-56">
                        <Badge>{book._count?.chapters ?? 0} chapters</Badge>
                        <Badge>{book._count?.reviews ?? 0} reviews</Badge>
                        <Badge>{book._count?.comments ?? 0} comments</Badge>
                        <Badge>{book._count?.chapterReadLogs ?? 0} reads</Badge>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">
                        <Link to={`/stories/${book.nameId}`} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-alt)]" title="View story">
                          <ExternalLink size={14} />
                        </Link>
                        {confirmDelete === book.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="danger"
                              loading={deleteStory.isPending}
                              onClick={() => deleteStory.mutate(book.id, { onSuccess: () => setConfirmDelete(null) })}
                            >
                              Delete
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(book.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete story"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button key={pageNumber} onClick={() => setPage(pageNumber)}
                  className={`w-9 h-9 rounded-lg text-sm font-ui transition-colors ${
                    page === pageNumber ? 'bg-accent text-white' : 'bg-[var(--bg-alt)] text-[var(--text-muted)]'
                  }`}>
                  {pageNumber}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState icon={<BookOpen size={30} />} title="No books found" description="Try a different search or author filter." />
      )}
    </div>
  )
}