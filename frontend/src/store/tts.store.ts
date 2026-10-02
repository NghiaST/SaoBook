// src/store/tts.store.ts
import { create } from 'zustand'
import axios from 'axios'
import api from '@/lib/api'

export type TTSStatus = 'idle' | 'playing' | 'paused' | 'loading'
export type TTSMode = 'speechsynthesis' | 'responsivevoice'
export type RvAudioStatus = 'idle' | 'loading' | 'loaded' | 'error'

export type PlaybackSettings = {
  mode: TTSMode
  lang: string
  voice: 'male' | 'female'
  voiceName?: string
  speed: number
  pitch: number
  volume: number
  startParagraphIndex?: number
  /** Playback was started automatically (auto-next): an expired sleep timer must stop it. */
  autoContinue?: boolean
  onEnd?: () => void
  onParagraphChange?: (index: number) => void
}

interface TTSState {
  status: TTSStatus
  /** Last fatal playback error (null when everything is fine). Cleared by stop / retry / clearError / resume. */
  error: string | null
  utterance: SpeechSynthesisUtterance | null
  audio: HTMLAudioElement | null
  currentParagraphIndex: number
  text: string
  paragraphs: string[]
  chapterId: number | null
  mode: TTSMode
  sleepTimer: ReturnType<typeof setTimeout> | null
  sleepTimerRemaining: number
  sleepTimerInterval: ReturnType<typeof setInterval> | null
  /** Minutes the running timer was set to (0 = no timer). */
  sleepTimerMinutes: number
  /** Increments every time the sleep timer fires (lets the UI cancel pending auto-next). */
  sleepTimerFiredCount: number
  rvAudioStatuses: Record<number, RvAudioStatus>
  rvAudioTotal: number

  play: (text: string, chapterId: number, settings: PlaybackSettings) => void
  pause: () => void
  resume: () => void
  stop: () => void
  jumpToParagraph: (index: number, settings: PlaybackSettings) => void
  /** Restart from the paragraph where playback failed (failed audio is requested again). */
  retry: (settings: PlaybackSettings) => void
  clearError: () => void
  /** Start (minutes > 0) or cancel (0) the sleep timer. Counts down immediately, playing or not. */
  setSleepTimer: (minutes: number) => void
  /**
   * Change the speed of the CURRENT playback on the fly: no new request, no re-download.
   * Backend audio: applied instantly to the playing <audio>. Browser voices cannot change
   * rate mid-utterance, so only the sentence being read is restarted at the new speed.
   */
  setPlaybackSpeed: (speed: number) => void
}

// ── Tunables ──────────────────────────────────────────────────────────────────

// ResponsiveVoice (backend audio)
const RV_CONCURRENCY = 6
const RV_MAX_ATTEMPTS = 3              // per paragraph, with exponential backoff
const RV_RETRY_BASE_MS = 600
const RV_REQUEST_TIMEOUT_MS = 20_000
const AUDIO_CACHE_MAX_BYTES = 48 * 1024 * 1024

// SpeechSynthesis
const SS_CHUNK_MAX_CHARS = 160         // Chrome silently kills utterances after ~15s
const SS_START_TIMEOUT_MS = 8_000      // utterance never started -> retry
const SS_MAX_RETRIES = 2
const SS_VOICES_WAIT_MS = 1_500

// Shared
const MIN_SPEED = 0.5
const MAX_SPEED = 4                    // browsers may mute <audio> above ~4x
const MAX_CONSECUTIVE_FAILURES = 3     // this many paragraphs/chunks in a row -> give up with an error

const MSG_RV_FAILED = 'Không tải được audio từ máy chủ. Hãy kiểm tra kết nối rồi thử lại.'
const MSG_SS_FAILED = 'Trình duyệt không đọc được nội dung này. Hãy thử đổi giọng đọc hoặc chế độ đọc.'
const MSG_SS_UNSUPPORTED = 'Trình duyệt không hỗ trợ đọc văn bản.'
const MSG_AUTOPLAY = 'Trình duyệt đang chặn tự phát âm thanh. Nhấn "Tiếp tục" để nghe.'

// ── Pure helpers ──────────────────────────────────────────────────────────────

const hasSpeechSynthesis = () => typeof window !== 'undefined' && 'speechSynthesis' in window

function pickSSVoice(lang: string, gender: 'male' | 'female', voiceName?: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voiceName) {
    const named = voices.find((v) => v.name === voiceName)
    if (named) return named
  }
  const langCode = lang === 'vi' ? 'vi' : 'en'
  const genderHint = gender === 'female'
    ? ['female', 'woman', 'zira', 'samantha', 'google us english']
    : ['male', 'man', 'david', 'alex', 'google uk english male']
  return (
    voices.find((v) => v.lang.startsWith(langCode) && genderHint.some((h) => v.name.toLowerCase().includes(h))) ??
    voices.find((v) => v.lang.startsWith(langCode)) ??
    null
  )
}

function splitToParagraphs(text: string): string[] {
  return text.split('\n').map((s) => s.trim()).filter(Boolean)
}

/** Split a long paragraph into sentence-sized chunks so SpeechSynthesis doesn't cut off. */
function chunkForSpeech(text: string, max = SS_CHUNK_MAX_CHARS): string[] {
  if (text.length <= max) return [text]
  const sentences = text.match(/[^.!?…。！？]+[.!?…。！？]*["'”’)\]]*\s*/g) ?? [text]
  const chunks: string[] = []
  let buf = ''
  const flush = () => {
    const t = buf.trim()
    if (t) chunks.push(t)
    buf = ''
  }
  for (const sentence of sentences) {
    if (buf && buf.length + sentence.length > max) flush()
    buf += sentence
    while (buf.length > max) {
      let cut = buf.lastIndexOf(' ', max)
      if (cut < max / 2) cut = max
      chunks.push(buf.slice(0, cut).trim())
      buf = buf.slice(cut)
    }
  }
  flush()
  return chunks.filter(Boolean)
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
  })
}

function isRetryable(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    if (!status) return true // network error or timeout
    return status === 408 || status === 425 || status === 429 || status >= 500
  }
  return true // e.g. empty / invalid audio payload
}

function assertAudioBlob(blob: Blob) {
  if (!blob || blob.size === 0) throw new Error('Empty audio response')
  // A server error body that slipped through as a "blob"
  if (/json|text|html/i.test(blob.type)) throw new Error('Invalid audio response')
}

// ── Audio cache (survives stop(), so Stop → Play does not download everything again) ──
// NOTE: the request only sends `text`. If the backend ever depends on voice/speed,
// include those values in the cache key.

const audioCache = new Map<string, Blob>()
let audioCacheBytes = 0

const cacheKey = (text: string) => text

function cacheGet(text: string): Blob | undefined {
  const key = cacheKey(text)
  const blob = audioCache.get(key)
  if (blob) {
    audioCache.delete(key) // refresh LRU position
    audioCache.set(key, blob)
  }
  return blob
}

function cacheDelete(text: string) {
  const key = cacheKey(text)
  const blob = audioCache.get(key)
  if (!blob) return
  audioCache.delete(key)
  audioCacheBytes -= blob.size
}

function cacheSet(text: string, blob: Blob) {
  const key = cacheKey(text)
  cacheDelete(text)
  audioCache.set(key, blob)
  audioCacheBytes += blob.size
  for (const [k, b] of audioCache) {
    if (audioCacheBytes <= AUDIO_CACHE_MAX_BYTES) break
    if (k === key) continue
    audioCache.delete(k)
    audioCacheBytes -= b.size
  }
}

// ── ResponsiveVoice session types ─────────────────────────────────────────────

interface RvEntry {
  status: RvAudioStatus
  attempts: number
  blob?: Blob
  promise: Promise<Blob>
  resolve: (blob: Blob) => void
  reject: (err: unknown) => void
}

interface RvSession {
  controller: AbortController
  paragraphs: string[]
  entries: Map<number, RvEntry>
  queue: number[]
  active: number
}

interface PlayCtx {
  token: number
  chapterId: number
  paragraphs: string[]
  settings: PlaybackSettings
}

function newEntry(status: RvAudioStatus, blob?: Blob): RvEntry {
  let resolve!: (b: Blob) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<Blob>((res, rej) => {
    resolve = res
    reject = rej
  })
  promise.catch(() => {}) // avoid "unhandled rejection" noise; awaiting callers still see the rejection
  if (blob) resolve(blob)
  return { status, attempts: 0, blob, promise, resolve, reject }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useTTSStore = create<TTSState>()((set, get) => {
  /**
   * Every playback (play / jump / retry) gets a new token. All async callbacks
   * (utterance events, audio events, timers, awaited promises) compare their token
   * with `playbackToken` and bail out when stale. This is what prevents an old
   * playback chain from "coming back to life" after Stop / Jump / Play.
   */
  let playbackToken = 0
  let current: PlayCtx | null = null
  let rv: RvSession | null = null
  let consecutiveFailures = 0
  let sleepDeadline: number | null = null
  let ssRestart: (() => void) | null = null          // re-speak the current chunk (speed change)
  let speedTimer: ReturnType<typeof setTimeout> | null = null

  // ── Teardown helpers ───────────────────────────────────────────────────────

  function cancelSpeech() {
    if (!hasSpeechSynthesis()) return
    window.speechSynthesis.cancel()
    // Chrome keeps the engine "paused" after cancel() when we cancelled while paused
    window.speechSynthesis.resume()
  }

  function releaseAudio() {
    const audio = get().audio
    if (!audio) return
    audio.onended = null
    audio.onerror = null
    audio.pause()
    if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src)
    audio.removeAttribute('src')
    audio.load()
    set({ audio: null })
  }

  /** Abort in-flight requests. Finished audio stays in the cache, so nothing is lost. */
  function cancelRvSession() {
    const session = rv
    rv = null
    if (session) {
      session.controller.abort()
      session.entries.forEach((entry) => {
        if (entry.status === 'loading') entry.reject(new DOMException('Cancelled', 'AbortError'))
      })
    }
    if (session || get().rvAudioTotal > 0) set({ rvAudioStatuses: {}, rvAudioTotal: 0 })
  }

  function teardown() {
    playbackToken++
    current = null
    ssRestart = null
    if (speedTimer) {
      clearTimeout(speedTimer)
      speedTimer = null
    }
    cancelSpeech()
    cancelRvSession()
    releaseAudio()
  }

  function beginPlayback(chapterId: number, paragraphs: string[], settings: PlaybackSettings): PlayCtx {
    playbackToken++
    consecutiveFailures = 0
    current = { token: playbackToken, chapterId, paragraphs, settings }
    return current
  }

  // ── Sleep timer ────────────────────────────────────────────────────────────
  // One-shot, wall-clock countdown. It is NOT cleared by stop(); it ends when it
  // fires or when the user turns it off. A deadline is used (not a decrement) and is
  // also checked at paragraph boundaries, because background tabs throttle timers.

  function sleepIsExpired() {
    return sleepDeadline !== null && Date.now() >= sleepDeadline
  }

  function clearSleepTimer() {
    const { sleepTimer, sleepTimerInterval } = get()
    if (sleepTimer) clearTimeout(sleepTimer)
    if (sleepTimerInterval) clearInterval(sleepTimerInterval)
    sleepDeadline = null
    set({ sleepTimer: null, sleepTimerInterval: null, sleepTimerRemaining: 0, sleepTimerMinutes: 0 })
  }

  function expireSleepTimer() {
    teardown()
    clearSleepTimer()
    set({
      status: 'idle',
      utterance: null,
      audio: null,
      sleepTimerFiredCount: get().sleepTimerFiredCount + 1,
    })
  }

  function startSleepTimer(minutes: number) {
    clearSleepTimer()
    const ms = minutes * 60_000
    const deadline = Date.now() + ms
    sleepDeadline = deadline
    const timer = setTimeout(expireSleepTimer, ms)
    const interval = setInterval(() => {
      if (sleepIsExpired()) {
        expireSleepTimer() // safety net if the timeout was throttled
        return
      }
      set({ sleepTimerRemaining: Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) })
    }, 1000)
    set({
      sleepTimer: timer,
      sleepTimerInterval: interval,
      sleepTimerRemaining: Math.round(ms / 1000),
      sleepTimerMinutes: minutes,
    })
  }

  // ── End states ─────────────────────────────────────────────────────────────

  function finishPlayback(ctx: PlayCtx) {
    if (ctx.token !== playbackToken) return
    if (sleepIsExpired()) {
      expireSleepTimer()
      return
    }
    playbackToken++
    current = null
    cancelRvSession()
    set({ status: 'idle', utterance: null, audio: null, currentParagraphIndex: 0 })
    ctx.settings.onEnd?.()
  }

  /** Unrecoverable problem: stop everything, keep position so the user can retry. */
  function failPlayback(message: string) {
    console.warn('[TTS]', message)
    teardown()
    set({ status: 'idle', utterance: null, audio: null, error: message })
  }

  // ── SpeechSynthesis engine ─────────────────────────────────────────────────

  function ssStart(ctx: PlayCtx, startIndex: number) {
    if (!hasSpeechSynthesis()) {
      failPlayback(MSG_SS_UNSUPPORTED)
      return
    }
    const begin = () => {
      if (ctx.token === playbackToken) ssReadFrom(ctx, startIndex)
    }
    // Chrome returns an empty voice list until `voiceschanged` fires
    if (window.speechSynthesis.getVoices().length > 0) {
      begin()
      return
    }
    let called = false
    const go = () => {
      if (called) return
      called = true
      clearTimeout(timer)
      window.speechSynthesis.removeEventListener('voiceschanged', go)
      begin()
    }
    const timer = setTimeout(go, SS_VOICES_WAIT_MS)
    window.speechSynthesis.addEventListener('voiceschanged', go)
  }

  function ssReadFrom(ctx: PlayCtx, index: number) {
    if (ctx.token !== playbackToken) return
    if (sleepIsExpired()) {
      expireSleepTimer()
      return
    }
    if (index >= ctx.paragraphs.length) {
      finishPlayback(ctx)
      return
    }
    set({ currentParagraphIndex: index })
    ctx.settings.onParagraphChange?.(index)
    ssSpeakChunk(ctx, index, chunkForSpeech(ctx.paragraphs[index]), 0, 0)
  }

  function ssSpeakChunk(ctx: PlayCtx, index: number, chunks: string[], chunkIdx: number, attempt: number) {
    if (ctx.token !== playbackToken) return
    if (chunkIdx >= chunks.length) {
      ssReadFrom(ctx, index + 1)
      return
    }

    const { lang, voice, voiceName, speed, pitch = 1, volume } = ctx.settings
    const text = chunks[chunkIdx]
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US'
    utterance.rate = speed
    utterance.pitch = pitch
    utterance.volume = volume
    const selectedVoice = pickSSVoice(lang, voice, voiceName)
    if (selectedVoice) utterance.voice = selectedVoice

    let started = false
    let done = false
    let elapsed = 0
    // very conservative lower bound (6 chars/s) so slow voices are not cut short
    const maxMs = Math.max(10_000, (text.length / 6 / Math.max(speed, 0.3)) * 1000 + 5_000)

    const stopWatching = () => {
      done = true
      clearInterval(ticker)
      utterance.onstart = null
      utterance.onend = null
      utterance.onerror = null
      if (ssRestart === restart) ssRestart = null
    }

    // Speed changed mid-sentence: re-speak THIS chunk with the new rate (ctx.settings is read fresh)
    const restart = () => {
      if (done || ctx.token !== playbackToken) return
      stopWatching()
      cancelSpeech()
      ssSpeakChunk(ctx, index, chunks, chunkIdx, 0)
    }

    const next = () => {
      consecutiveFailures = 0
      ssSpeakChunk(ctx, index, chunks, chunkIdx + 1, 0)
    }

    const failChunk = (reason: string) => {
      stopWatching()
      if (ctx.token !== playbackToken) return
      console.warn('[TTS] speech chunk failed:', reason, `(attempt ${attempt + 1})`)
      cancelSpeech() // reset a possibly wedged engine; our handlers are already detached
      if (attempt < SS_MAX_RETRIES) {
        setTimeout(() => ssSpeakChunk(ctx, index, chunks, chunkIdx, attempt + 1), 300 * (attempt + 1))
        return
      }
      consecutiveFailures += 1
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        failPlayback(MSG_SS_FAILED)
        return
      }
      ssSpeakChunk(ctx, index, chunks, chunkIdx + 1, 0) // skip this chunk, keep going
    }

    utterance.onstart = () => {
      started = true
    }
    utterance.onend = () => {
      stopWatching()
      if (ctx.token !== playbackToken) return
      next()
    }
    utterance.onerror = (e) => {
      // Our own cancel() calls always bump the token first, so a matching token
      // means the error is NOT ours (voice failure, audio-busy, network, ...).
      if (ctx.token !== playbackToken) {
        stopWatching()
        return
      }
      failChunk(e.error)
    }

    // Watchdog: never started -> retry, never ended -> assume finished and move on.
    // Time is only counted while actually playing (not while paused).
    const ticker = setInterval(() => {
      if (done) return
      if (ctx.token !== playbackToken) {
        stopWatching()
        return
      }
      if (get().status !== 'playing') return
      elapsed += 1000
      if (!started && elapsed >= SS_START_TIMEOUT_MS) {
        failChunk('start-timeout')
      } else if (started && elapsed >= maxMs) {
        stopWatching()
        cancelSpeech()
        next()
      }
    }, 1000)

    set({ utterance })
    ssRestart = restart
    try {
      window.speechSynthesis.speak(utterance)
      if (get().status === 'paused') window.speechSynthesis.pause()
    } catch (err) {
      failChunk(err instanceof Error ? err.message : 'speak-failed')
    }
  }

  // ── ResponsiveVoice engine (backend audio) ─────────────────────────────────

  function setRvStatus(session: RvSession, index: number, status: RvAudioStatus) {
    if (rv !== session) return
    set((state) => ({ rvAudioStatuses: { ...state.rvAudioStatuses, [index]: status } }))
  }

  function prioritizeRv(session: RvSession, from: number) {
    const n = session.paragraphs.length
    session.queue.sort((a, b) => ((a - from + n) % n) - ((b - from + n) % n))
  }

  /** Put failed paragraphs (from `from` on) back in the queue with a fresh attempt budget. */
  function requeueFailed(session: RvSession, from: number) {
    const updates: Record<number, RvAudioStatus> = {}
    session.entries.forEach((entry, i) => {
      if (entry.status === 'error' && i >= from) {
        session.entries.set(i, newEntry('loading'))
        session.queue.push(i)
        updates[i] = 'loading'
      }
    })
    if (Object.keys(updates).length === 0) return
    set((state) => ({ rvAudioStatuses: { ...state.rvAudioStatuses, ...updates } }))
    prioritizeRv(session, from)
    pumpRv(session)
  }

  async function fetchRvParagraph(session: RvSession, index: number, entry: RvEntry) {
    const text = session.paragraphs[index]
    const { signal } = session.controller

    while (!signal.aborted) {
      entry.attempts += 1
      try {
        const response = await api.post<Blob>('/tts/audio', { text }, {
          responseType: 'blob',
          signal,
          timeout: RV_REQUEST_TIMEOUT_MS,
        })
        assertAudioBlob(response.data)
        if (signal.aborted) return
        cacheSet(text, response.data)
        entry.blob = response.data
        entry.status = 'loaded'
        setRvStatus(session, index, 'loaded')
        entry.resolve(response.data)
        return
      } catch (err) {
        if (signal.aborted || axios.isCancel(err)) return
        if (!isRetryable(err) || entry.attempts >= RV_MAX_ATTEMPTS) {
          console.warn(`[TTS] audio request for paragraph ${index} failed`, err)
          entry.status = 'error'
          setRvStatus(session, index, 'error')
          entry.reject(err)
          return
        }
        await sleep(RV_RETRY_BASE_MS * 2 ** (entry.attempts - 1), signal)
      }
    }
  }

  function pumpRv(session: RvSession) {
    while (rv === session && session.active < RV_CONCURRENCY && session.queue.length > 0) {
      const index = session.queue.shift()!
      const entry = session.entries.get(index)
      if (!entry || entry.status !== 'loading') continue

      session.active += 1
      void fetchRvParagraph(session, index, entry).finally(() => {
        session.active -= 1
        pumpRv(session)
      })
    }
  }

  function beginRvSession(paragraphs: string[], startIndex: number) {
    cancelRvSession()
    const session: RvSession = {
      controller: new AbortController(),
      paragraphs,
      entries: new Map(),
      queue: [],
      active: 0,
    }
    const statuses: Record<number, RvAudioStatus> = {}
    paragraphs.forEach((text, i) => {
      const cached = cacheGet(text)
      session.entries.set(i, newEntry(cached ? 'loaded' : 'loading', cached))
      statuses[i] = cached ? 'loaded' : 'loading'
    })
    const n = paragraphs.length
    session.queue = Array.from({ length: n }, (_, k) => (startIndex + k) % n)
      .filter((i) => session.entries.get(i)!.status === 'loading')

    rv = session
    set({ rvAudioStatuses: statuses, rvAudioTotal: n })
    pumpRv(session)
  }

  /** A paragraph could not be fetched/decoded/played: skip it, or give up after several in a row. */
  function rvParagraphFailed(ctx: PlayCtx, index: number) {
    if (ctx.token !== playbackToken) return
    consecutiveFailures += 1
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      failPlayback(MSG_RV_FAILED)
      return
    }
    void rvReadFrom(ctx, index + 1)
  }

  function handleAudioPlayError(ctx: PlayCtx, index: number, err: unknown) {
    if (ctx.token !== playbackToken) return
    const name = (err as { name?: string } | null)?.name
    if (name === 'AbortError') return // interrupted by pause() / teardown
    if (name === 'NotAllowedError') {
      // Autoplay policy: wait for a user gesture. resume() will call audio.play() again.
      set({ status: 'paused', error: MSG_AUTOPLAY })
      return
    }
    releaseAudio()
    rvParagraphFailed(ctx, index)
  }

  async function rvReadFrom(ctx: PlayCtx, index: number) {
    if (ctx.token !== playbackToken) return
    if (sleepIsExpired()) {
      expireSleepTimer()
      return
    }
    if (index >= ctx.paragraphs.length) {
      finishPlayback(ctx)
      return
    }
    const session = rv
    if (!session) {
      failPlayback(MSG_RV_FAILED)
      return
    }

    const entry = session.entries.get(index)
    const wasPaused = get().status === 'paused'
    set({
      currentParagraphIndex: index,
      status: wasPaused ? 'paused' : entry?.status === 'loaded' ? 'playing' : 'loading',
    })
    ctx.settings.onParagraphChange?.(index)

    let blob: Blob
    try {
      if (!entry) throw new Error('Audio is not queued')
      blob = await entry.promise
    } catch {
      if (ctx.token !== playbackToken) return
      rvParagraphFailed(ctx, index)
      return
    }
    if (ctx.token !== playbackToken) return

    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.volume = ctx.settings.volume
    audio.preservesPitch = true
    audio.playbackRate = Math.min(Math.max(ctx.settings.speed, MIN_SPEED), MAX_SPEED)
    audio.onended = () => {
      if (ctx.token !== playbackToken) return
      consecutiveFailures = 0
      releaseAudio()
      void rvReadFrom(ctx, index + 1)
    }
    audio.onerror = () => {
      if (ctx.token !== playbackToken) return
      // Undecodable audio: never serve it from the cache again
      cacheDelete(ctx.paragraphs[index])
      const live = rv
      const liveEntry = live?.entries.get(index)
      if (live && liveEntry) {
        liveEntry.status = 'error'
        setRvStatus(live, index, 'error')
      }
      releaseAudio()
      rvParagraphFailed(ctx, index)
    }

    set({ audio, utterance: null })
    if (get().status === 'paused') return // resume() will start it
    set({ status: 'playing' })
    try {
      await audio.play()
    } catch (err) {
      handleAudioPlayError(ctx, index, err)
    }
  }

  // ── Engine dispatch ────────────────────────────────────────────────────────

  function runEngine(ctx: PlayCtx, index: number, fresh: boolean) {
    if (ctx.settings.mode === 'responsivevoice') {
      if (fresh || !rv || rv.paragraphs !== ctx.paragraphs) {
        beginRvSession(ctx.paragraphs, index)
      } else {
        requeueFailed(rv, index)
        prioritizeRv(rv, index)
      }
      void rvReadFrom(ctx, index)
    } else {
      cancelRvSession()
      ssStart(ctx, index)
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    status: 'idle',
    error: null,
    utterance: null,
    audio: null,
    currentParagraphIndex: 0,
    text: '',
    paragraphs: [],
    chapterId: null,
    mode: 'speechsynthesis',
    sleepTimer: null,
    sleepTimerRemaining: 0,
    sleepTimerInterval: null,
    sleepTimerMinutes: 0,
    sleepTimerFiredCount: 0,
    rvAudioStatuses: {},
    rvAudioTotal: 0,

    play: (text, chapterId, settings) => {
      // The deadline passed but the (throttled) timeout has not fired yet.
      if (sleepIsExpired()) {
        if (settings.autoContinue) {
          expireSleepTimer() // auto-next must not outlive the sleep timer
          return
        }
        clearSleepTimer() // user pressed Play on purpose: start fresh
      }

      teardown()

      const paragraphs = splitToParagraphs(text)
      if (paragraphs.length === 0) {
        set({ status: 'idle', error: null })
        return
      }
      const startIndex = Math.min(Math.max(settings.startParagraphIndex ?? 0, 0), paragraphs.length - 1)

      const ctx = beginPlayback(chapterId, paragraphs, settings)
      set({
        text,
        paragraphs,
        chapterId,
        mode: settings.mode,
        status: 'playing',
        error: null,
        currentParagraphIndex: startIndex,
      })
      runEngine(ctx, startIndex, true)
    },

    pause: () => {
      const { status, mode, audio } = get()
      if (status !== 'playing' && status !== 'loading') return
      if (mode === 'responsivevoice') audio?.pause()
      else if (hasSpeechSynthesis()) window.speechSynthesis.pause()
      set({ status: 'paused' })
    },

    resume: () => {
      const { status, mode, audio } = get()
      if (status !== 'paused') return
      const ctx = current

      if (mode === 'responsivevoice') {
        if (audio) {
          set({ status: 'playing', error: null })
          audio.play().catch((err) => {
            if (ctx) handleAudioPlayError(ctx, get().currentParagraphIndex, err)
          })
        } else {
          // Still downloading the current paragraph; rvReadFrom continues when it arrives
          set({ status: 'loading', error: null })
        }
      } else {
        if (hasSpeechSynthesis()) window.speechSynthesis.resume()
        set({ status: 'playing', error: null })
      }
    },

    stop: () => {
      teardown()
      set({
        status: 'idle',
        error: null,
        utterance: null,
        audio: null,
        chapterId: null,
        mode: 'speechsynthesis',
        currentParagraphIndex: 0,
      })
    },

    jumpToParagraph: (index, settings) => {
      const { paragraphs, chapterId } = get()
      if (chapterId === null || paragraphs.length === 0) return
      const target = Math.min(Math.max(index, 0), paragraphs.length - 1)

      // Light teardown: keep the ResponsiveVoice session (already-downloaded audio) alive
      playbackToken++
      current = null
      cancelSpeech()
      releaseAudio()

      const ctx = beginPlayback(chapterId, paragraphs, settings)
      set({ currentParagraphIndex: target, status: 'playing', mode: settings.mode, error: null })
      runEngine(ctx, target, false)
    },

    retry: (settings) => {
      const { paragraphs, chapterId, currentParagraphIndex } = get()
      if (chapterId === null || paragraphs.length === 0) return
      get().jumpToParagraph(currentParagraphIndex, settings)
    },

    clearError: () => set({ error: null }),

    setPlaybackSpeed: (speed) => {
      const next = Math.min(Math.max(speed, MIN_SPEED), MAX_SPEED)
      const ctx = current
      if (!ctx || ctx.settings.speed === next) return
      ctx.settings = { ...ctx.settings, speed: next } // used by every following paragraph/chunk

      const { mode, audio } = get()
      if (mode === 'responsivevoice') {
        if (audio) {
          audio.preservesPitch = true
          audio.playbackRate = next // takes effect immediately, mid-sentence
        }
      } else {
        // debounce: dragging a slider must not re-speak the sentence on every tick
        if (speedTimer) clearTimeout(speedTimer)
        speedTimer = setTimeout(() => ssRestart?.(), 300)
      }
    },

    setSleepTimer: (minutes) => {
      const m = Math.min(Math.max(Math.floor(minutes) || 0, 0), 600)
      if (m <= 0) clearSleepTimer()
      else startSleepTimer(m)
    },
  }
})