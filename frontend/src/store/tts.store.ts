// src/store/tts.store.ts
import { create } from 'zustand'
import {
  rvSpeak, rvCancel, rvPause, rvResume,
  prefetchAllParagraphs, setRVKeys,
} from '@/features/tts/rv.service'

export type TTSStatus = 'idle' | 'playing' | 'paused' | 'loading'
export type TTSMode = 'speechsynthesis' | 'responsivevoice'

interface TTSState {
  status: TTSStatus
  utterance: SpeechSynthesisUtterance | null
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
    settings: {
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
  ) => void
  pause: () => void
  resume: () => void
  stop: () => void
  jumpToParagraph: (
    index: number,
    settings: {
      mode: TTSMode
      lang: string
      voice: 'male' | 'female'
      voiceName?: string
      speed: number
      pitch: number
      volume: number
      sleepTimerMinutes: number
      onEnd?: () => void
      onParagraphChange?: (index: number) => void
    }
  ) => void
  /** Cung cấp RV keys để store dùng */
  setRVKeys: (keys: string[]) => void
}

// ── SpeechSynthesis helpers ───────────────────────────────────────────────────

function pickSSVoice(lang: string, gender: 'male' | 'female', voiceName?: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voiceName) {
    const named = voices.find((v) => v.name === voiceName)
    if (named) return named
  }
  const langCode = lang === 'vi' ? 'vi' : lang === 'zh' ? 'zh' : 'en'
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

  // ── SpeechSynthesis playback ────────────────────────────────────────────────
  function ssReadFrom(
    paragraphs: string[],
    startIndex: number,
    chapterId: number,
    settings: Parameters<TTSState['play']>[2],
  ) {
    if (startIndex >= paragraphs.length) {
      set({ status: 'idle', utterance: null, currentParagraphIndex: 0 })
      settings.onEnd?.()
      return
    }

    const { lang, voice, voiceName, speed, pitch = 1, volume } = settings
    const para = paragraphs[startIndex]
    const utterance = new SpeechSynthesisUtterance(para)
    utterance.lang = lang === 'vi' ? 'vi-VN' : lang === 'zh' ? 'zh-CN' : 'en-US'
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

  // ── ResponsiveVoice playback ────────────────────────────────────────────────
  function rvReadFrom(
    paragraphs: string[],
    startIndex: number,
    chapterId: number,
    settings: Parameters<TTSState['play']>[2],
  ) {
    if (startIndex >= paragraphs.length) {
      set({ status: 'idle', utterance: null, currentParagraphIndex: 0 })
      settings.onEnd?.()
      return
    }

    const { lang, voiceName, speed, pitch = 1, volume } = settings

    set({ currentParagraphIndex: startIndex, status: 'playing' })
    settings.onParagraphChange?.(startIndex)

    rvSpeak(paragraphs[startIndex], lang, voiceName, {
      rate: speed,
      pitch,
      volume,
      onstart: () => {
        // already set status above
      },
      onend: () => {
        const current = get()
        if (current.status !== 'playing') return
        rvReadFrom(paragraphs, startIndex + 1, chapterId, settings)
      },
      onerror: () => {
        set({ status: 'idle', utterance: null })
      },
    })
  }

  function readFrom(
    paragraphs: string[],
    startIndex: number,
    chapterId: number,
    settings: Parameters<TTSState['play']>[2],
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
    currentParagraphIndex: 0,
    text: '',
    paragraphs: [],
    chapterId: null,
    mode: 'speechsynthesis',
    sleepTimer: null,
    sleepTimerRemaining: 0,
    sleepTimerInterval: null,

    setRVKeys: (keys) => setRVKeys(keys),

    play: (text, chapterId, settings) => {
      // Cancel any previous playback
      window.speechSynthesis.cancel()
      rvCancel()

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
          rvCancel()
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

      // Nếu dùng RV, prefetch tất cả đoạn (fire-and-forget; RV SDK tự cache)
      if (settings.mode === 'responsivevoice') {
        prefetchAllParagraphs(paragraphs, settings.lang, settings.voiceName, {
          rate: settings.speed,
          pitch: settings.pitch ?? 1,
          volume: settings.volume,
        }).catch(() => {/* prefetch optional */})
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
        rvPause()
      } else {
        window.speechSynthesis.pause()
      }
      set({ status: 'paused' })
    },

    resume: () => {
      const { mode } = get()
      if (mode === 'responsivevoice') {
        rvResume()
      } else {
        window.speechSynthesis.resume()
      }
      set({ status: 'playing' })
    },

    stop: () => {
      window.speechSynthesis.cancel()
      rvCancel()
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
      rvCancel()
      set({ currentParagraphIndex: index, status: 'playing' })
      readFrom(paragraphs, index, chapterId, {
        ...settings,
        sleepTimerMinutes: 0,
      })
    },
  }
})