// src/pages/ChapterReadPage.tsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useChapter, useChapterList, useMarkChapterRead, useRVActiveKeys } from '@/lib/queries'
import { useTTSStore } from '@/store/tts.store'
import { useSettingsStore } from '@/store/settings.store'
import { useAuthStore } from '@/store/auth.store'
import { useScrollHide } from '@/hooks/useScrollHide'
import { loadRVScript } from '@/features/tts/rv.service'
import { Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, List, Play, Pause, Square } from 'lucide-react'
import axios from 'axios'
import '@/styles/reader.css'

export function ChapterReadPage() {
  const { nameId, chapterId: chapterIdParam } = useParams<{ nameId: string; chapterId: string }>()
  const chapterId = chapterIdParam ? Number(chapterIdParam) : NaN
  const navigate = useNavigate()

  const { isAuthenticated }                                                       = useAuthStore()
  const { fontSize, lineHeight, fontFamily, bgColor, textColor, readerMaxWidth }  = useSettingsStore()
  const {
    ttsLanguage, ttsVoice, ttsVoiceName, ttsSpeed, ttsPitch, ttsVolume,
    ttsMode, autoNextChapter, sleepTimerMinutes,
  } = useSettingsStore()

  const markRead = useMarkChapterRead()
  const { stop, status, currentParagraphIndex, chapterId: ttsChapterId, play, pause, resume, setRVKeys } = useTTSStore()

  const { data: chapter, isLoading } = useChapter(chapterId)
  const { data: chapters }           = useChapterList(nameId!)

  // Fetch RV active keys (chỉ khi đã đăng nhập và dùng RV mode)
  const { data: rvKeys } = useRVActiveKeys(isAuthenticated && ttsMode === 'responsivevoice')

  const [content,        setContent]        = useState<string | null>(null)
  const [paragraphs,     setParagraphs]     = useState<string[]>([])
  const [contentLoading, setContentLoading] = useState(false)
  const [showTOC,        setShowTOC]        = useState(false)

  const ttsTriggeredNav = useRef(false)
  const paragraphRefs   = useRef<(HTMLParagraphElement | null)[]>([])

  const isTTSThisChapter = ttsChapterId === chapterId
  const isPlaying        = isTTSThisChapter && status === 'playing'
  const isPaused         = isTTSThisChapter && status === 'paused'
  const ttsActive        = isTTSThisChapter && (isPlaying || isPaused)

  const scrollHidden = useScrollHide(20)

  // ── Load RV keys vào store & script ────────────────────────────────────────

  useEffect(() => {
    if (!rvKeys || rvKeys.length === 0) return
    setRVKeys(rvKeys)
    // Load RV script với key đầu tiên
    loadRVScript(rvKeys[0]).catch(() => null)
  }, [rvKeys, setRVKeys])

  // ── Navigation ──────────────────────────────────────────────────────────────

  const currentIndex = chapters?.findIndex((c) => c.id === chapterId) ?? -1
  const prevChapter  = currentIndex > 0 ? chapters![currentIndex - 1] : null
  const nextChapter  = currentIndex < (chapters?.length ?? 0) - 1 ? chapters![currentIndex + 1] : null

  const goNext = useCallback(() => {
    if (nextChapter) navigate(`/stories/${nameId}/chapters/${nextChapter.id}`)
  }, [nextChapter, nameId, navigate])

  const goPrev = useCallback(() => {
    if (prevChapter) navigate(`/stories/${nameId}/chapters/${prevChapter.id}`)
  }, [prevChapter, nameId, navigate])

  // ── TTS helpers ─────────────────────────────────────────────────────────────

  const ttsSettings = useCallback(() => ({
    mode:              ttsMode,
    lang:              ttsLanguage,
    voice:             ttsVoice,
    voiceName:         ttsVoiceName,
    speed:             ttsSpeed,
    pitch:             ttsPitch,
    volume:            ttsVolume,
    sleepTimerMinutes,
    onEnd: autoNextChapter
      ? () => {
          ttsTriggeredNav.current = true
          goNext()
        }
      : undefined,
  }), [ttsMode, ttsLanguage, ttsVoice, ttsVoiceName, ttsSpeed, ttsPitch, ttsVolume, sleepTimerMinutes, autoNextChapter, goNext])

  const handlePlayPause = () => {
    if (isPlaying) { pause(); return }
    if (isPaused)  { resume(); return }
    if (content) {
      play(content, chapterId, ttsSettings())
    }
  }

  const handleStop = () => stop()

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Fetch content
  useEffect(() => {
    if (!chapter?.contentUrl) return
    setContentLoading(true)
    axios.get<string>(chapter.contentUrl, { responseType: 'text' })
      .then((r) => {
        setContent(r.data)
        setParagraphs(r.data.split('\n').map((s) => s.trim()).filter(Boolean))
      })
      .catch(() => setContent('Không thể tải nội dung chương này.'))
      .finally(() => setContentLoading(false))
  }, [chapter?.contentUrl])

  // Khi chuyển chapter
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (ttsTriggeredNav.current) {
      ttsTriggeredNav.current = false
    } else {
      stop()
    }
  }, [chapterId])

  // Tiếp tục đọc sau khi TTS tự chuyển chapter
  useEffect(() => {
    if (!content || !autoNextChapter) return
    const { status: s, chapterId: ttsId } = useTTSStore.getState()
    if (s === 'idle' && ttsId !== chapterId && ttsTriggeredNav.current === false) {
      const prevId = useTTSStore.getState().chapterId
      if (prevId !== null && prevId !== chapterId) {
        play(content, chapterId, ttsSettings())
      }
    }
  }, [content])

  // Mark as read
  useEffect(() => {
    if (isAuthenticated && Number.isFinite(chapterId)) markRead.mutate(chapterId)
  }, [chapterId, isAuthenticated])

  // Scroll to active paragraph
  useEffect(() => {
    if (!ttsActive) return
    paragraphRefs.current[currentParagraphIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentParagraphIndex, ttsActive])

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft')  goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev])

  const handleParagraphClick = (index: number) => {
    if (!ttsActive) return
    useTTSStore.getState().jumpToParagraph(index, {
      ...ttsSettings(),
      sleepTimerMinutes: 0,
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex justify-center py-24"><Spinner className="w-8 h-8" /></div>
  )
  if (!Number.isFinite(chapterId) || !chapter) return (
    <div className="page-container py-10 text-center text-[var(--text-muted)]">Không tìm thấy chương</div>
  )

  return (
    <div className="reader-page">

      {/* ── Top nav ─────────────────────────────────────────────────────── */}
      <div className={cn('reader-topnav', scrollHidden && 'reader-topnav--hidden')}>
        <div className="reader-topnav__inner" style={{ maxWidth: Math.max(readerMaxWidth, 1200) }}>

          <Link to={`/stories/${nameId}`} className="reader-topnav__back">
            ← {chapter.story?.name ?? nameId}
          </Link>

          <div className="reader-topnav__actions">
            <button
              onClick={handlePlayPause}
              className={cn('reader-tts-btn', isPlaying || isPaused ? 'reader-tts-btn--stop' : 'reader-tts-btn--play')}
              title={isPlaying ? 'Tạm dừng' : isPaused ? 'Tiếp tục' : 'Nghe'}
            >
              {isPlaying
                ? <><Pause size={14} /><span className="hidden sm:inline">Dừng</span></>
                : isPaused
                  ? <><Play  size={14} /><span className="hidden sm:inline">Tiếp tục</span></>
                  : <><Play  size={14} /><span className="hidden sm:inline">Nghe</span></>
              }
            </button>

            {ttsActive && (
              <button
                onClick={handleStop}
                className="reader-tts-btn reader-tts-btn--stop"
                title="Dừng hẳn"
              >
                <Square size={14} />
              </button>
            )}

            <button onClick={goPrev} disabled={!prevChapter} className="reader-nav-btn" title="Chương trước (←)">
              <ChevronLeft size={15} />
              <span className="hidden sm:inline">Trước</span>
            </button>

            <button onClick={goNext} disabled={!nextChapter} className="reader-nav-btn" title="Chương sau (→)">
              <span className="hidden sm:inline">Sau</span>
              <ChevronRight size={15} />
            </button>

            <button
              onClick={() => setShowTOC((v) => !v)}
              className="btn-ghost p-1.5 rounded-lg"
              aria-label="Mục lục"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {showTOC && (
          <div className="reader-toc">
            <div className="reader-toc__grid">
              {chapters?.map((c) => (
                <Link
                  key={c.id}
                  to={`/stories/${nameId}/chapters/${c.id}`}
                  onClick={() => setShowTOC(false)}
                  className={cn('reader-toc__item', c.id === chapterId && 'reader-toc__item--active')}
                >
                  {c.order}. {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="reader-content-wrap" style={{ maxWidth: readerMaxWidth }}>
        <h1 className="reader-title" style={{ color: textColor }}>{chapter.name}</h1>

        {contentLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div
            className="reader-body"
            style={{
              fontSize:        `${fontSize}px`,
              lineHeight,
              fontFamily:      `'${fontFamily}', Georgia, serif`,
              color:           textColor,
              backgroundColor: bgColor,
            }}
          >
            {paragraphs.map((para, i) => {
              const isCurrentTTS = ttsActive && currentParagraphIndex === i
              return (
                <p
                  key={i}
                  ref={(el) => { paragraphRefs.current[i] = el }}
                  onClick={() => handleParagraphClick(i)}
                  className={cn(
                    'reader-para',
                    ttsActive    && 'reader-para--clickable',
                    isCurrentTTS && 'reader-para--active',
                    ttsActive && !isCurrentTTS && i < currentParagraphIndex && 'reader-para--past',
                  )}
                  title={ttsActive ? `Nhảy đến đoạn ${i + 1}` : undefined}
                >
                  {para}
                </p>
              )
            })}
          </div>
        )}

        <div className="reader-bottom-nav">
          <button onClick={goPrev} disabled={!prevChapter} className="reader-nav-btn">
            <ChevronLeft size={16} /> Chương trước
          </button>
          <button
            onClick={goNext}
            disabled={!nextChapter}
            className={cn('reader-nav-btn', nextChapter && 'reader-nav-btn--primary')}
          >
            Chương sau <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {ttsActive && (
        <button onClick={handleStop} className="reader-tts-fab reader-tts-fab--stop">
          <Square size={16} /> Dừng đọc
        </button>
      )}

    </div>
  )
}