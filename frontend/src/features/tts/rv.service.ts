// src/features/tts/rv.service.ts
/**
 * ResponsiveVoice wrapper với:
 * - Round-robin API keys (mỗi đoạn dùng key tiếp theo)
 * - Prefetch toàn bộ audio URL trước khi đọc
 * - Fallback về speechSynthesis nếu RV không khả dụng
 */

export interface RVPlayOptions {
  rate: number
  pitch: number
  volume: number
  onstart?: () => void
  onend?: () => void
  onerror?: (e: string) => void
}

// Tên voice RV theo ngôn ngữ + giới tính
export function getRVVoiceName(lang: string, voiceName?: string): string {
  if (voiceName) return voiceName

  // Fallback mapping lang → RV voice name hợp lý nhất
  const map: Record<string, string> = {
    vi: 'Vietnamese Female',
    en: 'US English Female',
    zh: 'Chinese Female',
  }
  return map[lang] ?? 'US English Female'
}

// ── Key pool manager ──────────────────────────────────────────────────────────

let _keys: string[] = []
let _keyIndex = 0

export function setRVKeys(keys: string[]) {
  _keys = keys
  _keyIndex = 0
}

function nextKey(): string | null {
  if (_keys.length === 0) return null
  const key = _keys[_keyIndex % _keys.length]
  _keyIndex++
  return key
}

// ── Prefetch: build audio URLs qua RV API ─────────────────────────────────────
// RV dùng endpoint: https://code.responsivevoice.org/getvoice.php?...
// Prefetch trả về Map<paragraphIndex, audioUrl>

export interface PrefetchResult {
  index: number
  url: string
  key: string
}

export async function prefetchAllParagraphs(
  paragraphs: string[],
  lang: string,
  voiceName?: string,
  opts: { rate: number; pitch: number; volume: number } = { rate: 1, pitch: 1, volume: 1 },
): Promise<PrefetchResult[]> {
  if (_keys.length === 0) return []

  const voice = getRVVoiceName(lang, voiceName)

  const results: PrefetchResult[] = paragraphs.map((para, i) => {
    const key = nextKey()!
    // ResponsiveVoice getvoice URL (cùng format RV SDK dùng internally)
    const params = new URLSearchParams({
      t: para.slice(0, 300), // RV giới hạn ~300 chars/request
      tl: lang === 'vi' ? 'vi' : lang === 'zh' ? 'zh-CN' : 'en-US',
      sv: '',
      vn: voice,
      pitch: String(opts.pitch),
      rate: String(opts.rate),
      vol: String(opts.volume),
      key,
      c: 'MP3',
      f: '8khz_8bit_mono',
    })
    const url = `https://code.responsivevoice.org/getvoice.php?${params.toString()}`
    return { index: i, url, key }
  })

  return results
}

// ── Playback via RV SDK ───────────────────────────────────────────────────────

declare global {
  interface Window {
    responsiveVoice?: {
      speak: (text: string, voice: string, params?: Record<string, unknown>) => void
      cancel: () => void
      pause: () => void
      resume: () => void
      isPlaying: () => boolean
      voiceSupport: () => boolean
      getVoices: () => { name: string }[]
    }
  }
}

export function isRVAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.responsiveVoice?.voiceSupport?.()
}

export function rvSpeak(
  text: string,
  lang: string,
  voiceName: string | undefined,
  opts: RVPlayOptions,
) {
  if (!isRVAvailable()) return
  const voice = getRVVoiceName(lang, voiceName)
  window.responsiveVoice!.speak(text, voice, {
    rate: opts.rate,
    pitch: opts.pitch,
    volume: opts.volume,
    onstart: opts.onstart,
    onend: opts.onend,
    onerror: opts.onerror,
  })
}

export function rvCancel() {
  window.responsiveVoice?.cancel()
}

export function rvPause() {
  window.responsiveVoice?.pause()
}

export function rvResume() {
  window.responsiveVoice?.resume()
}

// ── Load RV script dynamically với key ───────────────────────────────────────

let _scriptLoaded = false
let _scriptLoading = false
let _loadCallbacks: Array<() => void> = []

export function loadRVScript(key: string): Promise<void> {
  return new Promise((resolve) => {
    if (_scriptLoaded) { resolve(); return }
    _loadCallbacks.push(resolve)
    if (_scriptLoading) return
    _scriptLoading = true

    const script = document.createElement('script')
    script.src = `https://code.responsivevoice.org/responsivevoice.js?key=${key}`
    script.async = true
    script.onload = () => {
      _scriptLoaded = true
      _scriptLoading = false
      _loadCallbacks.forEach((cb) => cb())
      _loadCallbacks = []
    }
    script.onerror = () => {
      _scriptLoading = false
      _loadCallbacks.forEach((cb) => cb()) // resolve anyway, fallback handled elsewhere
      _loadCallbacks = []
    }
    document.head.appendChild(script)
  })
}