// src/pages/ChapterReadPage.tsx
import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useChapter, useChapterList, useMarkChapterRead } from '@/lib/queries'
import { useTTSStore } from '@/store/tts.store'
import { useSettingsStore } from '@/store/settings.store'
import { useAuthStore } from '@/store/auth.store'
import { Spinner } from '@/components/ui'
import {
  ChevronLeft, ChevronRight, List, Play, Pause, Square,
  Volume2, Gauge, Settings2
} from 'lucide-react'
import axios from 'axios'

function TTSBar({ text, chapterId, onNextChapter }: {
  text: string; chapterId: string; onNextChapter?: () => void
}) {
  const { status, play, pause, resume, stop } = useTTSStore()
  const { ttsLanguage, ttsVoice, ttsSpeed, ttsVolume, autoNextChapter, sleepTimerMinutes, updateTTS } = useSettingsStore()

  const isThisChapter = useTTSStore((s) => s.chapterId === chapterId)
  const isPlaying = isThisChapter && status === 'playing'
  const isPaused  = isThisChapter && status === 'paused'

  const handlePlay = () => {
    if (isPlaying) { pause(); return }
    if (isPaused)  { resume(); return }
    play(text, chapterId, {
      lang: ttsLanguage, voice: ttsVoice, speed: ttsSpeed,
      volume: ttsVolume, sleepTimerMinutes,
      onEnd: autoNextChapter ? onNextChapter : undefined,
    })
  }

  return (
    <div className="fixed bottom-0 inset-x-0 bg-[var(--surface)]/95 backdrop-blur border-t border-[var(--border)] z-30">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Play/Stop */}
        <button onClick={handlePlay}
          className="flex items-center gap-1.5 btn-primary px-3 py-2 text-sm">
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          {isPlaying ? 'Tạm dừng' : isPaused ? 'Tiếp tục' : 'Nghe'}
        </button>
        {(isPlaying || isPaused) && (
          <button onClick={stop} className="btn-outline px-3 py-2 text-sm">
            <Square size={15} />
          </button>
        )}

        {/* Speed */}
        <label className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
          <Gauge size={14} />
          <input type="range" min="0.5" max="5" step="0.1" value={ttsSpeed}
            onChange={(e) => updateTTS({ ttsSpeed: parseFloat(e.target.value) })}
            className="w-20 accent-[var(--accent)]" />
          <span className="font-mono text-xs w-8">{ttsSpeed.toFixed(1)}x</span>
        </label>

        {/* Volume */}
        <label className="flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
          <Volume2 size={14} />
          <input type="range" min="0" max="1" step="0.05" value={ttsVolume}
            onChange={(e) => updateTTS({ ttsVolume: parseFloat(e.target.value) })}
            className="w-20 accent-[var(--accent)]" />
        </label>

        {/* Language */}
        <select value={ttsLanguage}
          onChange={(e) => updateTTS({ ttsLanguage: e.target.value as any })}
          className="input py-1.5 text-xs w-auto">
          <option value="vi">🇻🇳 Tiếng Việt</option>
          <option value="en">🇬🇧 English</option>
          <option value="zh">🇨🇳 中文</option>
        </select>
      </div>
    </div>
  )
}

export function ChapterReadPage() {
  const { nameId, chapterId } = useParams<{ nameId: string; chapterId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { fontSize, lineHeight, fontFamily, bgColor, textColor } = useSettingsStore()
  const markRead = useMarkChapterRead()
  const { stop } = useTTSStore()

  const { data: chapter, isLoading } = useChapter(chapterId!)
  const { data: chapters } = useChapterList(nameId!)
  const [content, setContent] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [showTOC, setShowTOC] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Fetch chapter content from R2
  useEffect(() => {
    if (!chapter?.contentUrl) return
    setContentLoading(true)
    axios.get<string>(chapter.contentUrl, { responseType: 'text' })
      .then((r) => setContent(r.data))
      .catch(() => setContent('Không thể tải nội dung chương này.'))
      .finally(() => setContentLoading(false))
  }, [chapter?.contentUrl])

  // Mark as read
  useEffect(() => {
    if (isAuthenticated && chapterId) {
      markRead.mutate(chapterId)
    }
  }, [chapterId, isAuthenticated])

  // Scroll to top on chapter change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    stop()
  }, [chapterId])

  if (isLoading) return <div className="flex justify-center py-24"><Spinner className="w-8 h-8" /></div>
  if (!chapter) return <div className="page-container py-10 text-center text-[var(--text-muted)]">Không tìm thấy chương</div>

  const currentIndex = chapters?.findIndex((c) => c.id === chapterId) ?? -1
  const prevChapter = currentIndex > 0 ? chapters![currentIndex - 1] : null
  const nextChapter = currentIndex < (chapters?.length ?? 0) - 1 ? chapters![currentIndex + 1] : null

  const goNext = () => nextChapter && navigate(`/stories/${nameId}/chapters/${nextChapter.id}`)
  const goPrev = () => prevChapter && navigate(`/stories/${nameId}/chapters/${prevChapter.id}`)

  return (
    <div className="pb-24">
      {/* Top nav */}
      <div className="sticky top-14 z-20 bg-[var(--surface)]/90 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link to={`/stories/${nameId}`}
            className="text-sm text-[var(--text-muted)] hover:text-accent transition-colors font-ui truncate flex-1">
            ← {chapter.story?.name ?? nameId}
          </Link>
          <button onClick={() => setShowTOC(!showTOC)}
            className="btn-ghost p-1.5 rounded-lg" aria-label="Mục lục">
            <List size={16} />
          </button>
        </div>

        {/* Table of contents */}
        {showTOC && (
          <div className="absolute top-full left-0 right-0 bg-[var(--surface)] border-b border-[var(--border)] max-h-64 overflow-y-auto shadow-lg z-30">
            <div className="max-w-3xl mx-auto px-4 py-2 grid sm:grid-cols-2 gap-1">
              {chapters?.map((c) => (
                <Link key={c.id} to={`/stories/${nameId}/chapters/${c.id}`}
                  onClick={() => setShowTOC(false)}
                  className={`text-sm px-3 py-2 rounded-lg truncate transition-colors font-ui ${
                    c.id === chapterId ? 'bg-accent text-white' : 'hover:bg-[var(--bg-alt)] text-[var(--text-muted)]'
                  }`}>
                  {c.order}. {c.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chapter content */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="font-display text-2xl font-semibold text-center mb-8 text-[var(--text)]">
          {chapter.name}
        </h1>

        {contentLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <div
            ref={contentRef}
            className="reading-content"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight,
              fontFamily: `'${fontFamily}', Georgia, serif`,
              color: textColor,
              backgroundColor: bgColor,
            }}
          >
            {content?.split('\n').filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        {/* Chapter navigation */}
        <div className="flex justify-between mt-12 pt-8 border-t border-[var(--border)]">
          <button onClick={goPrev} disabled={!prevChapter}
            className="btn-outline gap-1 disabled:opacity-40">
            <ChevronLeft size={16} /> Chương trước
          </button>
          <button onClick={goNext} disabled={!nextChapter}
            className="btn-primary gap-1 disabled:opacity-40">
            Chương sau <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* TTS bar */}
      {content && (
        <TTSBar text={content} chapterId={chapterId!} onNextChapter={goNext} />
      )}
    </div>
  )
}
