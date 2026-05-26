// src/store/tts.store.ts
import { create } from 'zustand'

type TTSStatus = 'idle' | 'playing' | 'paused' | 'loading'

interface TTSState {
  status: TTSStatus
  utterance: SpeechSynthesisUtterance | null
  text: string
  chapterId: number | null
  sleepTimer: ReturnType<typeof setTimeout> | null

  play: (text: string, chapterId: number, settings: {
    lang: string; voice: 'male' | 'female'
    speed: number; volume: number
    sleepTimerMinutes: number
    onEnd?: () => void
  }) => void
  pause: () => void
  resume: () => void
  stop: () => void
}

function pickVoice(lang: string, gender: 'male' | 'female'): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const langCode = lang === 'vi' ? 'vi' : lang === 'zh' ? 'zh' : 'en'
  const genderHint = gender === 'female' ? ['female', 'woman', 'zira', 'samantha'] : ['male', 'man', 'david', 'alex']

  return (
    voices.find((v) =>
      v.lang.startsWith(langCode) &&
      genderHint.some((h) => v.name.toLowerCase().includes(h))
    ) ??
    voices.find((v) => v.lang.startsWith(langCode)) ??
    null
  )
}

export const useTTSStore = create<TTSState>()((set, get) => ({
  status: 'idle',
  utterance: null,
  text: '',
  chapterId: null,
  sleepTimer: null,

  play: (text, chapterId, { lang, voice, speed, volume, sleepTimerMinutes, onEnd }) => {
    window.speechSynthesis.cancel()
    if (get().sleepTimer) clearTimeout(get().sleepTimer!)

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang === 'vi' ? 'vi-VN' : lang === 'zh' ? 'zh-CN' : 'en-US'
    utterance.rate = speed
    utterance.volume = volume

    const selectedVoice = pickVoice(lang, voice)
    if (selectedVoice) utterance.voice = selectedVoice

    utterance.onend = () => {
      set({ status: 'idle', utterance: null })
      onEnd?.()
    }
    utterance.onerror = () => set({ status: 'idle', utterance: null })

    let sleepTimer: ReturnType<typeof setTimeout> | null = null
    if (sleepTimerMinutes > 0) {
      sleepTimer = setTimeout(() => {
        window.speechSynthesis.cancel()
        set({ status: 'idle', utterance: null, sleepTimer: null })
      }, sleepTimerMinutes * 60 * 1000)
    }

    set({ status: 'playing', utterance, text, chapterId, sleepTimer })
    window.speechSynthesis.speak(utterance)
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
    const { sleepTimer } = get()
    if (sleepTimer) clearTimeout(sleepTimer)
    set({ status: 'idle', utterance: null, chapterId: null, sleepTimer: null })
  },
}))
