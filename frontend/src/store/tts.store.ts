// src/store/tts.store.ts
import { create } from 'zustand'

export type TTSStatus = 'idle' | 'playing' | 'paused' | 'loading'

interface TTSState {
  status: TTSStatus
  utterance: SpeechSynthesisUtterance | null
  /** Index của paragraph đang được đọc */
  currentParagraphIndex: number
  text: string
  paragraphs: string[]
  chapterId: number | null
  sleepTimer: ReturnType<typeof setTimeout> | null
  /** Thời gian còn lại của sleep timer (giây), để hiển thị countdown */
  sleepTimerRemaining: number
  sleepTimerInterval: ReturnType<typeof setInterval> | null

  play: (
    text: string,
    chapterId: number,
    settings: {
      lang: string
      voice: 'male' | 'female'
      voiceName?: string  // tên voice cụ thể từ SpeechSynthesis
      speed: number
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
      lang: string
      voice: 'male' | 'female'
      voiceName?: string
      speed: number
      volume: number
      sleepTimerMinutes: number
      onEnd?: () => void
      onParagraphChange?: (index: number) => void
    }
  ) => void
}

function pickVoice(lang: string, gender: 'male' | 'female', voiceName?: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()

  // Ưu tiên voice được chỉ định đích danh
  if (voiceName) {
    const named = voices.find((v) => v.name === voiceName)
    if (named) return named
  }

  const langCode = lang === 'vi' ? 'vi' : lang === 'zh' ? 'zh' : 'en'
  const genderHint =
    gender === 'female'
      ? ['female', 'woman', 'zira', 'samantha', 'google us english']
      : ['male', 'man', 'david', 'alex', 'google uk english male']

  return (
    voices.find(
      (v) =>
        v.lang.startsWith(langCode) &&
        genderHint.some((h) => v.name.toLowerCase().includes(h))
    ) ??
    voices.find((v) => v.lang.startsWith(langCode)) ??
    null
  )
}

function splitToParagraphs(text: string): string[] {
  return text.split('\n').map((s) => s.trim()).filter(Boolean)
}

export const useTTSStore = create<TTSState>()((set, get) => {
  // Helper: read paragraphs từ index, gọi callback khi chuyển đoạn
  function readFrom(
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

    const { lang, voice, voiceName, speed, volume } = settings
    const para = paragraphs[startIndex]
    const utterance = new SpeechSynthesisUtterance(para)
    utterance.lang = lang === 'vi' ? 'vi-VN' : lang === 'zh' ? 'zh-CN' : 'en-US'
    utterance.rate = speed
    utterance.volume = volume

    const selectedVoice = pickVoice(lang, voice, voiceName)
    if (selectedVoice) utterance.voice = selectedVoice

    set({ utterance, currentParagraphIndex: startIndex, status: 'playing' })
    settings.onParagraphChange?.(startIndex)

    utterance.onend = () => {
      const current = get()
      if (current.status !== 'playing') return // paused/stopped
      readFrom(paragraphs, startIndex + 1, chapterId, settings)
    }

    utterance.onerror = (e) => {
      if (e.error === 'interrupted') return // bị cancel chủ động
      set({ status: 'idle', utterance: null })
    }

    window.speechSynthesis.speak(utterance)
  }

  return {
    status: 'idle',
    utterance: null,
    currentParagraphIndex: 0,
    text: '',
    paragraphs: [],
    chapterId: null,
    sleepTimer: null,
    sleepTimerRemaining: 0,
    sleepTimerInterval: null,

    play: (text, chapterId, settings) => {
      window.speechSynthesis.cancel()
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
        status: 'playing',
        currentParagraphIndex: startIdx,
        sleepTimer: newSleepTimer,
        sleepTimerRemaining: remaining,
        sleepTimerInterval: newInterval,
      })

      readFrom(paragraphs, startIdx, chapterId, settings)
    },

    pause: () => {
      window.speechSynthesis.pause()
      set({ status: 'paused' })
    },

    resume: () => {
      window.speechSynthesis.resume()
      set({ status: 'playing' })
    },

    stop: () => {
      window.speechSynthesis.cancel()
      const { sleepTimer, sleepTimerInterval } = get()
      if (sleepTimer) clearTimeout(sleepTimer)
      if (sleepTimerInterval) clearInterval(sleepTimerInterval)
      set({
        status: 'idle',
        utterance: null,
        chapterId: null,
        sleepTimer: null,
        sleepTimerRemaining: 0,
        sleepTimerInterval: null,
        currentParagraphIndex: 0,
      })
    },

    jumpToParagraph: (index, settings) => {
      const { paragraphs, chapterId, text } = get()
      if (!chapterId || paragraphs.length === 0) return
      window.speechSynthesis.cancel()
      set({ currentParagraphIndex: index, status: 'playing' })
      readFrom(paragraphs, index, chapterId, {
        ...settings,
        sleepTimerMinutes: 0, // giữ timer đang chạy, không reset
      })
    },
  }
})