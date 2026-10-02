// src/pages/ChapterReadPage.tsx
import {
  useCallback, useEffect, useMemo, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useChapter, useChapterList, useMarkChapterRead } from '@/lib/queries'
import { useTTSStore, type RvAudioStatus } from '@/store/tts.store'
import { useSettingsStore } from '@/store/settings.store'
import { useAuthStore } from '@/store/auth.store'
import { useScrollHide } from '@/hooks/useScrollHide'
import { useSettingsSync } from '@/hooks/useSettingsSync'
import { Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, List, Play, Pause, Square, SlidersHorizontal, Timer, X } from 'lucide-react'
import axios from 'axios'
import '@/styles/reader.css'

const EMPTY_PARAGRAPHS: string[] = []

function countStatus(statuses: Record<number, RvAudioStatus>, wanted: RvAudioStatus) {
  let n = 0
  for (const key in statuses) if (statuses[key] === wanted) n++
  return n
}

const SLEEP_PRESETS = [15, 30, 60, 90]

function formatRemaining(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/**
 * Quick controls shown on top of the reader: the width change is visible live and the
 * sleep timer starts counting immediately. It is its own component so the per-second
 * countdown only re-renders this panel, not the whole page.
 */
function ReaderQuickSettings({ onClose }: { onClose: () => void }) {
  const readerMaxWidth = useSettingsStore((s) => s.readerMaxWidth)
  const updateUI       = useSettingsStore((s) => s.updateUI)
  const ttsSpeed       = useSettingsStore((s) => s.ttsSpeed)
  const ttsMode        = useSettingsStore((s) => s.ttsMode)
  const updateTTS      = useSettingsStore((s) => s.updateTTS)
  const sleepMinutes   = useTTSStore((s) => s.sleepTimerMinutes)
  const sleepRemaining = useTTSStore((s) => s.sleepTimerRemaining)
  const setSleepTimer  = useTTSStore((s) => s.setSleepTimer)
  const [custom, setCustom] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const applyCustom = () => {
    const m = parseInt(custom, 10)
    if (!Number.isFinite(m) || m <= 0) return
    setSleepTimer(Math.min(m, 600))
    setCustom('')
  }

  return (
    <div
      role="dialog"
      aria-label="Tuỳ chỉnh nhanh"
      className="card fixed right-3 top-16 z-50 max-h-[80vh] w-[min(92vw,20rem)] space-y-4 overflow-y-auto p-4 shadow-xl"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--text)]">Tuỳ chỉnh nhanh</h2>
        <button onClick={onClose} className="btn-ghost rounded-lg p-1" aria-label="Đóng">
          <X size={16} />
        </button>
      </div>

      {/* Reading width (live) */}
      <div>
        <label className="label">
          Chiều rộng đọc: <span className="font-mono">{readerMaxWidth}px</span>
        </label>
        <input
          type="range"
          min={500}
          max={1600}
          step={20}
          value={readerMaxWidth}
          onChange={(e) => updateUI({ readerMaxWidth: parseInt(e.target.value, 10) })}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-xs text-[var(--text-subtle)]">
          <span>Hẹp</span>
          <span>Rộng</span>
        </div>
      </div>

      {/* Playback speed (applied live while listening) */}
      <div>
        <label className="label">
          Tốc độ đọc: <span className="font-mono">{ttsSpeed.toFixed(2)}x</span>
        </label>
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.05}
          value={Math.min(ttsSpeed, 4)}
          onChange={(e) => updateTTS({ ttsSpeed: parseFloat(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-xs text-[var(--text-subtle)]">
          <span>0.5x</span>
          <span>4.0x</span>
        </div>
        <p className="mt-1 text-xs text-[var(--text-subtle)]">
          {ttsMode === 'responsivevoice'
            ? 'Đổi ngay khi đang phát, không tải lại audio.'
            : 'Giọng trình duyệt: câu đang đọc sẽ đọc lại từ đầu câu với tốc độ mới.'}
        </p>
      </div>

      {/* Sleep timer */}
      <div>
        <label className="label flex items-center gap-1.5">
          <Timer size={13} /> Hẹn giờ tắt
          <span className="ml-auto font-mono text-xs text-[var(--text-muted)]">
            {sleepMinutes > 0 ? `Còn ${formatRemaining(sleepRemaining)}` : 'Đang tắt'}
          </span>
        </label>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSleepTimer(0)}
            className={cn(
              'rounded border px-2 py-1 text-xs transition-all',
              sleepMinutes === 0
                ? 'border-accent bg-[var(--accent-bg)] text-accent'
                : 'border-[var(--border)] text-[var(--text-subtle)] hover:border-[var(--text-muted)]',
            )}
          >
            Tắt
          </button>
          {SLEEP_PRESETS.map((m) => (
            <button
              key={m}
              onClick={() => setSleepTimer(m)}
              className={cn(
                'rounded border px-2 py-1 text-xs transition-all',
                sleepMinutes === m
                  ? 'border-accent bg-[var(--accent-bg)] text-accent'
                  : 'border-[var(--border)] text-[var(--text-subtle)] hover:border-[var(--text-muted)]',
              )}
            >
              {m}&#39;
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 3))}
            onKeyDown={(e) => { if (e.key === 'Enter') applyCustom() }}
            placeholder="Số phút khác"
            className="input w-32 text-sm"
          />
          <button onClick={applyCustom} disabled={!custom} className="reader-nav-btn">Đặt giờ</button>
        </div>

        <p className="mt-2 text-xs text-[var(--text-subtle)]">
          Đếm ngược ngay và dừng đọc khi hết giờ. Hẹn giờ vẫn chạy khi bạn bấm dừng hoặc đổi chương.
        </p>
      </div>
    </div>
  )
}

export function ChapterReadPage() {
  const { nameId, chapterId: chapterIdParam } = useParams<{ nameId: string; chapterId: string }>()
  const chapterId = chapterIdParam ? Number(chapterIdParam) : NaN
  const navigate = useNavigate()

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const {
    fontSize, lineHeight, fontFamily, bgColor, textColor, readerMaxWidth,
    ttsLanguage, ttsVoice, ttsVoiceName, ttsSpeed, ttsPitch, ttsVolume,
    ttsMode, autoNextChapter,
  } = useSettingsStore()

  const { mutate: markReadMutate } = useMarkChapterRead()

  // Selectors: only re-render when the specific value changes
  const status                = useTTSStore((s) => s.status)
  const currentParagraphIndex = useTTSStore((s) => s.currentParagraphIndex)
  const ttsChapterId          = useTTSStore((s) => s.chapterId)
  const ttsErrorRaw           = useTTSStore((s) => s.error)
  const sleepFiredCount       = useTTSStore((s) => s.sleepTimerFiredCount)
  const rvAudioTotal          = useTTSStore((s) => s.rvAudioTotal)
  const rvAudioLoaded         = useTTSStore((s) => countStatus(s.rvAudioStatuses, 'loaded'))
  const rvAudioErrors         = useTTSStore((s) => countStatus(s.rvAudioStatuses, 'error'))
  const { play, pause, resume, stop, retry, clearError } = useTTSStore.getState() // stable actions
  useSettingsSync() // auto-saves voice / API key / speed to the server (the backend needs them)

  const { data: chapter, isLoading } = useChapter(chapterId)
  const { data: chapters }           = useChapterList(nameId!)

  // Content is stored together with the chapter it belongs to, so it can never be
  // shown (or spoken) under the wrong chapter.
  const [loaded,     setLoaded]     = useState<{ id: number; paragraphs: string[] } | null>(null)
  const [failedId,   setFailedId]   = useState<number | null>(null)
  const [reloadKey,  setReloadKey]  = useState(0)
  const [showTOC,    setShowTOC]    = useState(false)
  const [showQuick,  setShowQuick]  = useState(false)

  const paragraphs     = loaded?.id === chapterId ? loaded.paragraphs : EMPTY_PARAGRAPHS
  const contentError   = failedId === chapterId
  const contentLoading = loaded?.id !== chapterId && !contentError

  // TTS block 0 = chapter title, block i + 1 = paragraph i
  const titleText = chapter ? (chapter.name?.replace(/\s+/g, ' ').trim() || `Chương ${chapter.order}`) : ''
  const ttsText   = useMemo(
    () => (titleText ? [titleText, ...paragraphs].join('\n') : ''),
    [titleText, paragraphs],
  )

  const blockRefs        = useRef<(HTMLElement | null)[]>([])
  const completedChapter = useRef<number | null>(null)
  /** Id of the chapter we navigated to from TTS and must auto-play once its content is loaded. */
  const pendingAutoPlay  = useRef<number | null>(null)

  const isTTSThisChapter = ttsChapterId === chapterId
  const isPlaying        = isTTSThisChapter && (status === 'playing' || status === 'loading')
  const isPaused         = isTTSThisChapter && status === 'paused'
  const ttsActive        = isPlaying || isPaused
  const ttsError         = isTTSThisChapter ? ttsErrorRaw : null

  const rvSettled      = rvAudioLoaded + rvAudioErrors
  const showRvProgress = ttsMode === 'responsivevoice' && isTTSThisChapter && rvAudioTotal > 0
                         && (rvSettled < rvAudioTotal || rvAudioErrors > 0)

  const scrollHidden = useScrollHide(20)

  // ── Navigation ──────────────────────────────────────────────────────────────

  const currentIndex = chapters?.findIndex((c) => c.id === chapterId) ?? -1
  const prevChapter  = currentIndex > 0 ? chapters![currentIndex - 1] : null
  const nextChapter  = currentIndex >= 0 && currentIndex < (chapters?.length ?? 0) - 1 ? chapters![currentIndex + 1] : null

  const goNext = useCallback(() => {
    if (nextChapter) navigate(`/stories/${nameId}/chapters/${nextChapter.id}`)
  }, [nextChapter, nameId, navigate])

  const goPrev = useCallback(() => {
    if (prevChapter) navigate(`/stories/${nameId}/chapters/${prevChapter.id}`)
  }, [prevChapter, nameId, navigate])

  // onEnd is created when playback starts; read the *latest* next chapter from a ref
  // so it never uses a stale closure (e.g. chapter list loaded after Play was pressed).
  const latest = useRef({ nextChapterId: null as number | null, nameId })
  useEffect(() => {
    latest.current = { nextChapterId: nextChapter?.id ?? null, nameId }
  })

  // ── TTS helpers ─────────────────────────────────────────────────────────────

  const ttsSettings = useCallback(() => ({
    mode:      ttsMode,
    lang:      ttsLanguage,
    voice:     ttsVoice,
    voiceName: ttsVoiceName,
    speed:     ttsSpeed,
    pitch:     ttsPitch,
    volume:    ttsVolume,
    onEnd: autoNextChapter
      ? () => {
          const { nextChapterId, nameId: story } = latest.current
          if (nextChapterId === null) return
          pendingAutoPlay.current = nextChapterId
          navigate(`/stories/${story}/chapters/${nextChapterId}`)
        }
      : undefined,
  }), [ttsMode, ttsLanguage, ttsVoice, ttsVoiceName, ttsSpeed, ttsPitch, ttsVolume, autoNextChapter, navigate])

  const handlePlayPause = () => {
    pendingAutoPlay.current = null
    if (isPlaying) return pause()
    if (isPaused)  return resume()
    if (paragraphs.length === 0) return
    play(ttsText, chapterId, ttsSettings()) // the title is spoken first
  }

  const handleStop = () => {
    pendingAutoPlay.current = null
    stop()
  }

  const handleRetryTTS = () => retry(ttsSettings())

  const handleBlockClick = (index: number) => {
    if (!ttsActive) return
    useTTSStore.getState().jumpToParagraph(index, ttsSettings())
  }

  /** Props that make the title / a paragraph a clickable, keyboard-accessible "jump" target. */
  const blockProps = (index: number) => ttsActive
    ? {
        onClick: () => handleBlockClick(index),
        onKeyDown: (e: ReactKeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleBlockClick(index)
          }
        },
        role: 'button' as const,
        tabIndex: 0,
      }
    : {}

  const retryContent = () => {
    setFailedId(null)
    setReloadKey((k) => k + 1)
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Fetch chapter content (abortable; failures are surfaced, never injected as text)
  useEffect(() => {
    if (!chapter) return
    if (!chapter.contentUrl) {
      setFailedId(chapter.id)
      return
    }
    const controller = new AbortController()
    setFailedId((prev) => (prev === chapter.id ? null : prev))

    axios.get<string>(chapter.contentUrl, {
      responseType: 'text',
      signal: controller.signal,
      timeout: 20_000,
    })
      .then((r) => {
        const lines = String(r.data).split('\n').map((s) => s.trim()).filter(Boolean)
        // The title is rendered/spoken separately; drop it if the file repeats it
        if (lines[0]?.toLowerCase() === chapter.name.trim().toLowerCase()) lines.shift()
        setLoaded({ id: chapter.id, paragraphs: lines })
      })
      .catch((e) => {
        if (axios.isCancel(e)) return
        pendingAutoPlay.current = null
        setFailedId(chapter.id)
      })

    return () => controller.abort()
  }, [chapter?.id, chapter?.contentUrl, chapter?.name, reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chapter switch: stop TTS unless TTS itself navigated here (auto-next)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (pendingAutoPlay.current === chapterId) return
    pendingAutoPlay.current = null
    stop()
  }, [chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Speed changed (reader panel or settings page): apply it to the current playback immediately
  useEffect(() => {
    useTTSStore.getState().setPlaybackSpeed(ttsSpeed)
  }, [ttsSpeed])

  // The sleep timer fired: cancel a pending auto-next so it can't start playback again
  useEffect(() => {
    pendingAutoPlay.current = null
  }, [sleepFiredCount])

  // Auto-continue: start once the NEW chapter's content has actually loaded
  useEffect(() => {
    if (pendingAutoPlay.current !== chapterId || paragraphs.length === 0) return
    pendingAutoPlay.current = null
    play(ttsText, chapterId, { ...ttsSettings(), autoContinue: true })
  }, [paragraphs]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mark the chapter read once its final paragraph (last block) is visible
  useEffect(() => {
    if (!isAuthenticated || !Number.isFinite(chapterId) || paragraphs.length === 0) return
    const last = blockRefs.current[paragraphs.length]
    if (!last) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && completedChapter.current !== chapterId) {
        completedChapter.current = chapterId
        markReadMutate(chapterId)
      }
    }, { threshold: 0.5 }) // 0.75 can never be reached by a very tall paragraph

    observer.observe(last)
    return () => observer.disconnect()
  }, [chapterId, isAuthenticated, markReadMutate, paragraphs.length])

  // Scroll to the active block (title included)
  useEffect(() => {
    if (!ttsActive) return
    blockRefs.current[currentParagraphIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentParagraphIndex, ttsActive])

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return // Alt+← is browser back
      const t = e.target
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      ) return
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft')  goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev])

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
              disabled={!ttsActive && paragraphs.length === 0}
              className={cn('reader-tts-btn', ttsActive ? 'reader-tts-btn--stop' : 'reader-tts-btn--play')}
              title={isPlaying ? 'Tạm dừng' : isPaused ? 'Tiếp tục' : 'Nghe'}
            >
              {isPlaying
                ? <><Pause size={14} /><span className="hidden sm:inline">Tạm dừng</span></>
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
              onClick={() => setShowQuick((v) => !v)}
              className={cn('btn-ghost p-1.5 rounded-lg', showQuick && 'text-[var(--accent)]')}
              aria-label="Tuỳ chỉnh nhanh"
              aria-expanded={showQuick}
              title="Chiều rộng, tốc độ & hẹn giờ tắt"
            >
              <SlidersHorizontal size={16} />
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

      {showQuick && <ReaderQuickSettings onClose={() => setShowQuick(false)} />}

      {/* ── TTS error banner ────────────────────────────────────────────── */}
      {ttsError && (
        <div
          role="alert"
          className="mx-auto mt-3 flex w-[min(92%,48rem)] flex-wrap items-center justify-between gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500"
        >
          <span>{ttsError}</span>
          <span className="flex gap-2">
            {status === 'paused'
              ? <button onClick={resume} className="reader-nav-btn">Tiếp tục</button>
              : <button onClick={handleRetryTTS} className="reader-nav-btn">Thử lại</button>}
            <button onClick={clearError} className="reader-nav-btn">Đóng</button>
          </span>
        </div>
      )}

      {/* ── ResponsiveVoice download progress ───────────────────────────── */}
      {showRvProgress && (
        <div className="mx-auto mt-3 w-[min(92%,48rem)] rounded-lg border border-[var(--border)] bg-[var(--bg-alt)] px-3 py-2 text-xs text-[var(--text-muted)]">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span>
              {rvSettled < rvAudioTotal ? 'Đang tải audio' : 'Đã tải audio'}
              {rvAudioErrors > 0 && ` · ${rvAudioErrors} đoạn lỗi (sẽ bị bỏ qua)`}
            </span>
            <span>{rvAudioLoaded}/{rvAudioTotal}</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={rvAudioTotal}
            aria-valuenow={rvAudioLoaded}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${(rvAudioLoaded / rvAudioTotal) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="reader-content-wrap" style={{ maxWidth: readerMaxWidth }}>
        <h1
          ref={(el) => { blockRefs.current[0] = el }}
          className={cn(
            'reader-title',
            ttsActive && 'reader-para--clickable',
            ttsActive && currentParagraphIndex === 0 && 'reader-para--active',
          )}
          style={{ color: textColor }}
          title={ttsActive ? 'Nhảy đến tiêu đề' : undefined}
          {...blockProps(0)}
        >
          {chapter.name}
        </h1>

        {contentError ? (
          <div className="py-16 text-center text-[var(--text-muted)]">
            <p className="mb-3">Không thể tải nội dung chương này.</p>
            <button onClick={retryContent} className="reader-nav-btn">Thử lại</button>
          </div>
        ) : contentLoading ? (
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
              const block     = i + 1
              const isCurrent = ttsActive && currentParagraphIndex === block
              return (
                <p
                  key={i}
                  ref={(el) => { blockRefs.current[block] = el }}
                  className={cn(
                    'reader-para',
                    ttsActive && 'reader-para--clickable',
                    isCurrent && 'reader-para--active',
                    ttsActive && !isCurrent && block < currentParagraphIndex && 'reader-para--past',
                  )}
                  title={ttsActive ? `Nhảy đến đoạn ${block}` : undefined}
                  {...blockProps(block)}
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

      {/* Floating pause / resume. Rendered into <body> and styled with utilities only, so it
          shows on every screen size and no ancestor (transform / overflow / reader.css rule)
          can hide or clip it. Click any paragraph to jump; the stop button is in the top bar. */}
      {ttsActive && createPortal(
        <button
          onClick={handlePlayPause}
          className="fixed right-4 z-50 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-90 active:scale-95"
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>,
        document.body,
      )}

    </div>
  )
}