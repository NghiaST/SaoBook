// src/pages/StoryDetailPage.tsx
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStory, useChapterList, useReviews, useUpsertReview, useSaveToBookshelf, useRemoveFromBookshelf, useMyBookshelf, useComments, useCreateComment } from '@/lib/queries'
import { Spinner, StarRating, Button, Textarea, Avatar, EmptyState, Badge } from '@/components/ui'
import { BookMarked, BookOpen, MessageSquare, Star } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import type { Comment } from '@/types'

function CommentItem({ comment, storyId }: { comment: Comment; storyId: string }) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const { isAuthenticated } = useAuthStore()
  const createComment = useCreateComment(storyId)

  const submitReply = () => {
    if (!replyText.trim()) return
    createComment.mutate({ content: replyText, parentCommentId: comment.id }, {
      onSuccess: () => { setReplyText(''); setReplying(false) }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar name={comment.user.name} src={comment.user.avatarUrl} size="sm" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold font-ui text-[var(--text)]">{comment.user.name}</span>
            <span className="text-xs text-[var(--text-subtle)]">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className="text-sm font-body text-[var(--text-muted)] leading-relaxed">{comment.content}</p>
          {isAuthenticated && (
            <button onClick={() => setReplying(!replying)}
              className="text-xs text-[var(--text-subtle)] hover:text-accent mt-1 transition-colors">
              Trả lời
            </button>
          )}
          {replying && (
            <div className="mt-2 flex gap-2">
              <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                rows={2} placeholder="Viết trả lời…" className="text-sm" />
              <Button size="sm" onClick={submitReply} loading={createComment.isPending}>Gửi</Button>
            </div>
          )}
        </div>
      </div>
      {comment.replies?.map((r) => (
        <div key={r.id} className="ml-10 flex gap-3">
          <Avatar name={r.user.name} src={r.user.avatarUrl} size="sm" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold font-ui text-[var(--text)]">{r.user.name}</span>
              <span className="text-xs text-[var(--text-subtle)]">{formatRelativeTime(r.createdAt)}</span>
            </div>
            <p className="text-sm font-body text-[var(--text-muted)]">{r.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function StoryDetailPage() {
  const { nameId } = useParams<{ nameId: string }>()
  const { user, isAuthenticated } = useAuthStore()
  const { data: story, isLoading } = useStory(nameId!)
  const { data: chapters } = useChapterList(nameId!)
  const { data: reviews } = useReviews(story?.id ?? '')
  const { data: bookshelf } = useMyBookshelf()
  const { data: comments } = useComments(story?.id ?? '')

  const upsertReview = useUpsertReview(story?.id ?? '')
  const saveToBookshelf = useSaveToBookshelf()
  const removeFromBookshelf = useRemoveFromBookshelf()
  const createComment = useCreateComment(story?.id ?? '')

  const [tab, setTab] = useState<'chapters' | 'comments' | 'reviews'>('chapters')
  const [myRating, setMyRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [commentText, setCommentText] = useState('')

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="w-8 h-8" /></div>
  if (!story) return <div className="page-container py-10 text-center text-[var(--text-muted)]">Không tìm thấy truyện</div>

  const isSaved = bookshelf?.some((b) => b.storyId === story.id)
  const myReview = reviews?.find((r) => r.userId === user?.id)

  const toggleBookshelf = () => {
    if (isSaved) removeFromBookshelf.mutate(story.id)
    else saveToBookshelf.mutate({ storyId: story.id })
  }

  const submitReview = () => {
    if (!myRating) return
    upsertReview.mutate({ rating: myRating, content: reviewText }, {
      onSuccess: () => { setReviewText('') }
    })
  }

  const submitComment = () => {
    if (!commentText.trim()) return
    createComment.mutate({ content: commentText }, {
      onSuccess: () => setCommentText('')
    })
  }

  return (
    <div className="page-container py-8">
      {/* Header */}
      <div className="flex gap-6 mb-8">
        {story.posterUrl ? (
          <img src={story.posterUrl} alt={story.name}
            className="w-32 sm:w-44 rounded-xl object-cover shadow-lg shrink-0"
            style={{ maxHeight: '240px' }}
          />
        ) : (
          <div className="w-32 sm:w-44 shrink-0 rounded-xl bg-[var(--bg-alt)] flex items-center justify-center" style={{ minHeight: '180px' }}>
            <BookOpen className="w-12 h-12 text-[var(--text-subtle)]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text)] mb-1">{story.name}</h1>
          <p className="text-[var(--text-muted)] font-ui mb-2">
            Tác giả: <span className="text-accent">{story.author?.name}</span>
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {story.avgRating != null && <StarRating value={Math.round(story.avgRating)} />}
            <Badge>{story._count?.chapters ?? 0} chương</Badge>
            <Badge>{story._count?.reviews ?? 0} đánh giá</Badge>
          </div>
          {story.description && (
            <p className="text-sm font-body text-[var(--text-muted)] leading-relaxed mb-4 line-clamp-4">{story.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {chapters && chapters.length > 0 && (
              <Link to={`/stories/${nameId}/chapters/${chapters[0].id}`}
                className="btn-primary">
                <BookOpen size={15} /> Đọc từ đầu
              </Link>
            )}
            {isAuthenticated && (
              <Button variant="outline" onClick={toggleBookshelf}
                loading={saveToBookshelf.isPending || removeFromBookshelf.isPending}>
                <BookMarked size={15} />
                {isSaved ? 'Đã lưu' : 'Lưu vào tủ'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] flex gap-1 mb-6">
        {(['chapters', 'comments', 'reviews'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-ui font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {t === 'chapters' ? 'Danh sách chương' : t === 'comments' ? 'Bình luận' : 'Đánh giá'}
          </button>
        ))}
      </div>

      {/* Chapters */}
      {tab === 'chapters' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {chapters?.map((ch) => (
            <Link key={ch.id} to={`/stories/${nameId}/chapters/${ch.id}`}
              className="flex items-center gap-2 p-3 rounded-lg hover:bg-[var(--bg-alt)] transition-colors group">
              <span className="text-xs text-[var(--text-subtle)] w-8 font-mono">{ch.order}.</span>
              <span className="text-sm font-ui text-[var(--text)] group-hover:text-accent transition-colors truncate">{ch.name}</span>
            </Link>
          ))}
          {!chapters?.length && <EmptyState title="Chưa có chương nào" />}
        </div>
      )}

      {/* Comments */}
      {tab === 'comments' && (
        <div className="space-y-6 max-w-2xl">
          {isAuthenticated && (
            <div className="card p-4">
              <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)}
                rows={3} placeholder="Viết bình luận…" />
              <div className="flex justify-end mt-3">
                <Button size="sm" onClick={submitComment} loading={createComment.isPending}>
                  <MessageSquare size={14} /> Gửi
                </Button>
              </div>
            </div>
          )}
          {comments?.map((c) => <CommentItem key={c.id} comment={c} storyId={story.id} />)}
          {!comments?.length && <EmptyState icon={<MessageSquare size={36} />} title="Chưa có bình luận" />}
        </div>
      )}

      {/* Reviews */}
      {tab === 'reviews' && (
        <div className="space-y-4 max-w-2xl">
          {isAuthenticated && (
            <div className="card p-4">
              <p className="text-sm font-semibold text-[var(--text)] mb-3">
                {myReview ? 'Chỉnh sửa đánh giá của bạn' : 'Đánh giá truyện này'}
              </p>
              <StarRating value={myRating || myReview?.rating || 0} onChange={setMyRating} />
              <Textarea className="mt-3" rows={3} placeholder="Viết nhận xét…"
                value={reviewText || myReview?.content || ''}
                onChange={(e) => setReviewText(e.target.value)} />
              <div className="flex justify-end mt-3">
                <Button size="sm" onClick={submitReview} loading={upsertReview.isPending}>
                  <Star size={14} /> {myReview ? 'Cập nhật' : 'Gửi đánh giá'}
                </Button>
              </div>
            </div>
          )}
          {reviews?.map((r) => (
            <div key={r.id} className="flex gap-3">
              <Avatar name={r.user.name} src={r.user.avatarUrl} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm font-ui">{r.user.name}</span>
                  <StarRating value={r.rating} size={13} />
                  <span className="text-xs text-[var(--text-subtle)]">{formatRelativeTime(r.createdAt)}</span>
                </div>
                {r.content && <p className="text-sm font-body text-[var(--text-muted)]">{r.content}</p>}
              </div>
            </div>
          ))}
          {!reviews?.length && <EmptyState icon={<Star size={36} />} title="Chưa có đánh giá" />}
        </div>
      )}
    </div>
  )
}
