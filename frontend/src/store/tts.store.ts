// src/store/tts.store.ts
import { create } from 'zustand'
import api from '@/lib/api'

export type TTSStatus = 'idle' | 'playing' | 'paused' | 'loading'
export type TTSMode = 'speechsynthesis' | 'responsivevoice'

type PlaybackSettings = {
  mode: TTSMode
  lang: string
  voice: 'male' | 'female'
  voiceName?: string
  speed: number
  pitch: number
  volume: number
  sleepTimerMinutes: number
  startParagraphIndex?: number
  onEnd?: () => void
  onParagraphChange?: (index: number) => void
}

interface TTSState {
  status: TTSStatus
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

  play: (
    text: string,
    chapterId: number,
    settings: PlaybackSettings
  ) => void
  pause: () => void
  resume: () => void
  stop: () => void
  jumpToParagraph: (
    index: number,
    settings: PlaybackSettings
  ) => void
}

// ── SpeechSynthesis helpers ───────────────────────────────────────────────────

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

// ── Store ─────────────────────────────────────────────────────────────────────

export const useTTSStore = create<TTSState>()((set, get) => {
  let playbackToken = 0
  let rvAbortController: AbortController | null = null
  let rvRequests = new Map<number, Promise<Blob>>()
  const RV_PREFETCH_WINDOW = 4

  function clearAudio() {
    const audio = get().audio
    if (!audio) return
    audio.pause()
    if (audio.src.startsWith('blob:')) URL.revokeObjectURL(audio.src)
    audio.src = ''
    set({ audio: null })
  }

  function cancelRvRequests() {
    rvAbortController?.abort()
    rvAbortController = null
    rvRequests.clear()
  }

  // ── SpeechSynthesis playback ────────────────────────────────────────────────
  function ssReadFrom(
    paragraphs: string[],
    startIndex: number,
    chapterId: number,
    settings: PlaybackSettings,
  ) {
    if (startIndex >= paragraphs.length) {
      set({ status: 'idle', utterance: null, currentParagraphIndex: 0 })
      settings.onEnd?.()
      return
    }

    const { lang, voice, voiceName, speed, pitch = 1, volume } = settings
    const para = paragraphs[startIndex]
    const utterance = new SpeechSynthesisUtterance(para)
    utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US'
    utterance.rate = speed
    utterance.pitch = pitch
    utterance.volume = volume

    const selectedVoice = pickSSVoice(lang, voice, voiceName)
    if (selectedVoice) utterance.voice = selectedVoice

    set({ utterance, currentParagraphIndex: startIndex, status: 'playing' })
    settings.onParagraphChange?.(startIndex)

    utterance.onend = () => {
      const current = get()
      if (current.status !== 'playing') return
      ssReadFrom(paragraphs, startIndex + 1, chapterId, settings)
    }

    utterance.onerror = (e) => {
      if (e.error === 'interrupted') return
      set({ status: 'idle', utterance: null })
    }

    window.speechSynthesis.speak(utterance)
  }

  // ── ResponsiveVoice playback through the backend ─────────────────────────────
  function requestRvParagraph(index: number, paragraphs: string[], controller: AbortController) {
    const existing = rvRequests.get(index)
    if (existing) return existing

    const request = api.post<Blob>('/tts/audio', {
      text: paragraphs[index],
    }, {
      responseType: 'blob',
      signal: controller.signal,
    }).then((response) => response.data)

    rvRequests.set(index, request)
    void request.catch(() => undefined)
    return request
  }

  function preloadRvWindow(startIndex: number, paragraphs: string[], controller: AbortController) {
    const end = Math.min(paragraphs.length, startIndex + RV_PREFETCH_WINDOW)
    for (let index = startIndex; index < end; index += 1) {
      requestRvParagraph(index, paragraphs, controller)
    }
  }

  async function rvReadFrom(
    paragraphs: string[],
    startIndex: number,
    chapterId: number,
    settings: PlaybackSettings,
  ) {
    if (startIndex >= paragraphs.length) {
      cancelRvRequests()
      set({ status: 'idle', utterance: null, currentParagraphIndex: 0 })
      settings.onEnd?.()
      return
    }

    const token = playbackToken
    const controller = rvAbortController
    if (!controller) return
    const { speed, volume } = settings

    set({ currentParagraphIndex: startIndex, status: 'playing' })
    settings.onParagraphChange?.(startIndex)
    preloadRvWindow(startIndex, paragraphs, controller)

    try {
      const blob = await requestRvParagraph(startIndex, paragraphs, controller)
      if (token !== playbackToken || controller.signal.aborted) return
      rvRequests.delete(startIndex)

      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.volume = volume
      audio.playbackRate = speed
      audio.onended = () => {
        URL.revokeObjectURL(url)
        const current = get()
        if (token !== playbackToken || current.status !== 'playing') return
        set({ audio: null })
        void rvReadFrom(paragraphs, startIndex + 1, chapterId, settings)
      }
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        if (token === playbackToken) set({ status: 'idle', audio: null })
      }

      set({ audio, utterance: null })
      if (get().status === 'paused') return
      await audio.play()
    } catch {
      if (token === playbackToken) set({ status: 'idle', audio: null })
    }
  }

  function readFrom(
    paragraphs: string[],
    startIndex: number,
    chapterId: number,
    settings: PlaybackSettings,
  ) {
    if (settings.mode === 'responsivevoice') {
      rvReadFrom(paragraphs, startIndex, chapterId, settings)
    } else {
      ssReadFrom(paragraphs, startIndex, chapterId, settings)
    }
  }

  return {
    status: 'idle',
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

    play: (text, chapterId, settings) => {
      // Cancel any previous playback
      window.speechSynthesis.cancel()
      playbackToken++
      cancelRvRequests()
      rvAbortController = new AbortController()
      clearAudio()

      const { sleepTimer, sleepTimerInterval } = get()
      if (sleepTimer) clearTimeout(sleepTimer)
      if (sleepTimerInterval) clearInterval(sleepTimerInterval)

      const paragraphs = splitToParagraphs(text)
      const startIdx = settings.startParagraphIndex ?? 0

      // Sleep timer
      let newSleepTimer: ReturnType<typeof setTimeout> | null = null
      let newInterval: ReturnType<typeof setInterval> | null = null
      let remaining = (settings.sleepTimerMinutes ?? 0) * 60

      if (settings.sleepTimerMinutes > 0) {
        newSleepTimer = setTimeout(() => {
          window.speechSynthesis.cancel()
          playbackToken++
          clearAudio()
          const { sleepTimerInterval: iv } = get()
          if (iv) clearInterval(iv)
          set({ status: 'idle', utterance: null, sleepTimer: null, sleepTimerRemaining: 0, sleepTimerInterval: null })
        }, settings.sleepTimerMinutes * 60 * 1000)

        newInterval = setInterval(() => {
          remaining -= 1
          set({ sleepTimerRemaining: remaining })
          if (remaining <= 0) clearInterval(newInterval!)
        }, 1000)
      }

      set({
        text,
        paragraphs,
        chapterId,
        mode: settings.mode,
        status: 'playing',
        currentParagraphIndex: startIdx,
        sleepTimer: newSleepTimer,
        sleepTimerRemaining: remaining,
        sleepTimerInterval: newInterval,
      })

      readFrom(paragraphs, startIdx, chapterId, settings)
    },

    pause: () => {
      const { mode } = get()
      if (mode === 'responsivevoice') {
        get().audio?.pause()
      } else {
        window.speechSynthesis.pause()
      }
      set({ status: 'paused' })
    },

    resume: () => {
      const { mode } = get()
      if (mode === 'responsivevoice') {
        const audio = get().audio
        if (audio) void audio.play()
      } else {
        window.speechSynthesis.resume()
      }
      set({ status: 'playing' })
    },

    stop: () => {
      window.speechSynthesis.cancel()
      playbackToken++
      cancelRvRequests()
      clearAudio()
      const { sleepTimer, sleepTimerInterval } = get()
      if (sleepTimer) clearTimeout(sleepTimer)
      if (sleepTimerInterval) clearInterval(sleepTimerInterval)
      set({
        status: 'idle',
        utterance: null,
        chapterId: null,
        mode: 'speechsynthesis',
        sleepTimer: null,
        sleepTimerRemaining: 0,
        sleepTimerInterval: null,
        currentParagraphIndex: 0,
      })
    },

    jumpToParagraph: (index, settings) => {
      const { paragraphs, chapterId } = get()
      if (!chapterId || paragraphs.length === 0) return
      window.speechSynthesis.cancel()
      playbackToken++
      cancelRvRequests()
      rvAbortController = new AbortController()
      clearAudio()
      set({ currentParagraphIndex: index, status: 'playing' })
      readFrom(paragraphs, index, chapterId, {
        ...settings,
        sleepTimerMinutes: 0,
      })
    },
  }
})