// src/store/settings.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UISettings, TTSSettings } from '@/types'

interface SettingsState extends UISettings, TTSSettings {
  applyToDOM: () => void
  updateUI: (patch: Partial<UISettings>) => void
  updateTTS: (patch: Partial<TTSSettings>) => void
}

const defaults: UISettings & TTSSettings = {
  // UI
  theme: 'light',
  bgColor: '#fdfbf7',
  textColor: '#241e16',
  fontFamily: 'Source Serif 4',
  fontSize: 18,
  lineHeight: 1.9,
  // TTS
  ttsLanguage: 'vi',
  ttsVoice: 'female',
  ttsSpeed: 1.0,
  ttsVolume: 1.0,
  autoNextChapter: false,
  sleepTimerMinutes: 0,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaults,

      applyToDOM: () => {
        const s = get()
        const root = document.documentElement
        root.classList.toggle('dark', s.theme === 'dark')
        root.style.setProperty('--reader-bg', s.bgColor)
        root.style.setProperty('--reader-text', s.textColor)
        root.style.setProperty('--reader-font', `'${s.fontFamily}'`)
        root.style.setProperty('--reader-size', `${s.fontSize}px`)
        root.style.setProperty('--reader-line-height', String(s.lineHeight))
      },

      updateUI: (patch) => {
        set(patch)
        get().applyToDOM()
      },

      updateTTS: (patch) => set(patch),
    }),
    { name: 'reader-settings' },
  ),
)
