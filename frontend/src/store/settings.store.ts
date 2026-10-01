// src/store/settings.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TTSMode, UserSettings } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type UITheme = 'light' | 'dark'
export type TTSLanguage = 'vi' | 'en'
export type TTSVoice = 'male' | 'female'
export { type TTSMode }

export interface ThemeBgOption {
  name: string
  bg: string
  text: string
  desc: string
}

// Background color presets per theme
export const THEME_BG_OPTIONS: Record<UITheme, ThemeBgOption[]> = {
  light: [
    { name: 'Giấy kem',       bg: '#FDFBF7', text: '#241E16', desc: 'Mặc định ấm áp' },
    { name: 'Trắng',          bg: '#FFFFFF',  text: '#1A1A1A', desc: 'Sắc nét, hiện đại' },
    { name: 'Trắng kem',      bg: '#FBFBF2',  text: '#2C2C2C', desc: 'Dịu mắt hơn trắng' },
    { name: 'Vàng ấm',        bg: '#F4F1E8',  text: '#3E2723', desc: 'Như đèn dây tóc' },
    { name: 'Giấy cổ',        bg: '#F4ECD8',  text: '#5B4636', desc: 'Như đọc sách cũ' },
    { name: 'Hồng nhạt',      bg: '#FFF0F5',  text: '#783C90', desc: 'Nhẹ nhàng, lãng mạn' },
    { name: 'Xanh lá dịu',    bg: '#E8F5E9',  text: '#1B5E20', desc: 'Giảm căng thẳng mắt' },
    { name: 'Xám nhạt',       bg: '#F5F5F5',  text: '#333333', desc: 'Trung tính' },
    { name: 'Xanh dương nhạt',bg: '#E3F2FD',  text: '#0D47A1', desc: 'Mát mẻ, tỉnh táo' },
    { name: 'Xanh ngọc bích', bg: '#F0F4F4',  text: '#2D4356', desc: 'Thanh lịch, trong trẻo' },
  ],
  dark: [
    { name: 'Nâu tối',        bg: '#1A1510',  text: '#A4A15B', desc: 'Mặc định tối ấm' },
    { name: 'Đen xanh',       bg: '#0B0E12',  text: '#3980D0', desc: 'Tiết kiệm pin OLED' },
    { name: 'Xám đêm',        bg: '#1E1E1E',  text: '#D1D1D1', desc: 'Êm nhất ban đêm' },
    { name: 'Nâu cà phê',     bg: '#2B2622',  text: '#D7CCC8', desc: 'Ấm áp, không chói' },
    { name: 'Vàng nâu tối',   bg: '#322C26',  text: '#BCAAA4', desc: 'Giống sách cũ ban đêm' },
    { name: 'Đồng cổ tối',    bg: '#3E362E',  text: '#BCAAA4', desc: 'Hoài cổ, trầm mặc' },
    { name: 'Tím than',       bg: '#261C2C',  text: '#D2B4DE', desc: 'Huyền bí, dịu nhẹ' },
    { name: 'Xanh rêu tối',   bg: '#1A2421',  text: '#A5D6A7', desc: 'Mát mẻ, tự nhiên' },
    { name: 'Xám xanh',       bg: '#24292E',  text: '#9DB2CD', desc: 'Giống GitHub Dark' },
    { name: 'Xám Slate',      bg: '#2D3436',  text: '#DFE6E9', desc: 'Cân bằng, dễ đọc' },
  ],
}

export const FONT_FAMILY_OPTIONS = [
  { label: 'Arial',          value: 'Arial' },
  { label: 'Source Serif 4', value: 'Source Serif 4' },
  { label: 'Georgia',        value: 'Georgia' },
  { label: 'Times New Roman',value: 'Times New Roman' },
  { label: 'Verdana',        value: 'Verdana' },
  { label: 'Tahoma',         value: 'Tahoma' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono' },
]

// ── Default colors per theme ──────────────────────────────────────────────────

const THEME_DEFAULTS: Record<UITheme, { bgColor: string; textColor: string }> = {
  light: { bgColor: '#FDFBF7', textColor: '#241E16' },
  dark:  { bgColor: '#1A1510', textColor: '#A4A15B' },
}

// ── State interface ───────────────────────────────────────────────────────────

export interface UISettings {
  theme: UITheme
  bgColor: string
  textColor: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  readerMaxWidth: number
}

export interface TTSSettings {
  ttsMode: TTSMode
  ttsLanguage: TTSLanguage
  ttsVoice: TTSVoice
  ttsSpeed: number
  ttsPitch: number
  ttsVolume: number
  autoNextChapter: boolean
  sleepTimerMinutes: number
  ttsVoiceName: string
  selectedRvApiKeyId: string | null
}

export const DEFAULT_RV_VOICE_NAMES: Record<TTSLanguage, Record<TTSVoice, string>> = {
  vi: { male: 'Vietnamese Male', female: 'Vietnamese Female' },
  en: { male: 'US English Male', female: 'US English Female' },
}

export function userSettingsToTTS(userSettings: UserSettings): Partial<TTSSettings> {
  const language = userSettings.rvSettings.language.startsWith('en') ? 'en' : 'vi'
  const voice = userSettings.rvSettings.gender === 'male' || userSettings.rvSettings.gender === 'm'
    ? 'male'
    : 'female'

  return {
    ttsLanguage: language,
    ttsVoice: voice,
    ttsVoiceName: userSettings.rvSettings.voiceName,
    ttsPitch: userSettings.rvSettings.pitch,
    ttsSpeed: userSettings.ttsSpeed,
    autoNextChapter: userSettings.autoNextChapter,
    selectedRvApiKeyId: userSettings.selectedRvApiKeyId,
  }
}

export function ttsToUserSettings(settings: Pick<
  TTSSettings,
  'ttsLanguage' | 'ttsVoice' | 'ttsVoiceName' | 'ttsPitch' | 'ttsSpeed' | 'autoNextChapter' | 'selectedRvApiKeyId'
>): Pick<UserSettings, 'ttsSpeed' | 'autoNextChapter' | 'selectedRvApiKeyId' | 'rvSettings'> {
  return {
    ttsSpeed: settings.ttsSpeed,
    autoNextChapter: settings.autoNextChapter,
    selectedRvApiKeyId: settings.selectedRvApiKeyId,
    rvSettings: {
      voiceName: settings.ttsVoiceName || DEFAULT_RV_VOICE_NAMES[settings.ttsLanguage][settings.ttsVoice],
      language: settings.ttsLanguage === 'en' ? 'en-US' : 'vi-VN',
      gender: settings.ttsVoice,
      pitch: settings.ttsPitch,
    },
  }
}

export function userSettingsToPersistedSnapshot(userSettings: UserSettings) {
  return {
    ttsSpeed: userSettings.ttsSpeed,
    autoNextChapter: userSettings.autoNextChapter,
    selectedRvApiKeyId: userSettings.selectedRvApiKeyId,
    rvSettings: userSettings.rvSettings,
  }
}

interface SettingsState extends UISettings, TTSSettings {
  /** Saved colors for each theme - to restore when toggling */
  savedColors: Record<UITheme, { bgColor: string; textColor: string }>

  applyToDOM: () => void
  updateUI: (patch: Partial<UISettings>) => void
  updateTTS: (patch: Partial<TTSSettings>) => void
  hydrateUserSettings: (userSettings: UserSettings) => void
  /** Toggle light/dark theme - restore saved colors of the target theme */
  toggleTheme: () => void
  /** Reset all settings to default */
  resetAll: () => void
}

const defaults: UISettings & TTSSettings = {
  // UI
  theme: 'light',
  bgColor: '#FDFBF7',
  textColor: '#241E16',
  fontFamily: 'Arial',
  fontSize: 17,
  lineHeight: 1.7,
  readerMaxWidth: 1100,
  // TTS
  ttsMode: 'speechsynthesis',
  ttsLanguage: 'vi',
  ttsVoice: 'female',
  ttsSpeed: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  autoNextChapter: false,
  sleepTimerMinutes: 0,
  ttsVoiceName: '',
  selectedRvApiKeyId: null,
}

const defaultSavedColors: Record<UITheme, { bgColor: string; textColor: string }> = {
  light: { bgColor: '#FDFBF7', textColor: '#241E16' },
  dark:  { bgColor: '#1A1510', textColor: '#A4A15B' },
}

export const useSettingsStore = create<SettingsState>()(persist((set, get) => ({
      ...defaults,
      savedColors: defaultSavedColors,

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
        // If changing colors, save for the current theme
        const current = get()
        const colorPatch: Partial<Record<UITheme, { bgColor: string; textColor: string }>> = {}
        if (patch.bgColor !== undefined || patch.textColor !== undefined) {
          colorPatch[current.theme] = {
            bgColor:   patch.bgColor   ?? current.bgColor,
            textColor: patch.textColor ?? current.textColor,
          }
        }

        set((s) => ({
          ...patch,
          savedColors: colorPatch[s.theme]
            ? { ...s.savedColors, [s.theme]: colorPatch[s.theme]! }
            : s.savedColors,
        }))
        get().applyToDOM()
      },

      updateTTS: (patch) => set(patch),

      hydrateUserSettings: (userSettings) => set(userSettingsToTTS(userSettings)),

      toggleTheme: () => {
        const { theme, savedColors } = get()
        const newTheme: UITheme = theme === 'light' ? 'dark' : 'light'
        // Save current colors for the old theme
        const { bgColor, textColor } = get()
        const newColors = {
          ...savedColors,
          [theme]: { bgColor, textColor },
        }
        // Restore saved colors of the new theme (or default if not saved)
        const restored = newColors[newTheme] ?? THEME_DEFAULTS[newTheme]

        set({
          theme: newTheme,
          bgColor: restored.bgColor,
          textColor: restored.textColor,
          savedColors: newColors,
        })
        get().applyToDOM()
      },

      resetAll: () => {
        set({ ...defaults, savedColors: defaultSavedColors })
        get().applyToDOM()
      },
    }), {
      name: 'saobook-settings',
      partialize: (state) => ({
        theme: state.theme,
        bgColor: state.bgColor,
        textColor: state.textColor,
        fontFamily: state.fontFamily,
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        readerMaxWidth: state.readerMaxWidth,
        ttsMode: state.ttsMode,
        ttsLanguage: state.ttsLanguage,
        ttsVoice: state.ttsVoice,
        ttsSpeed: state.ttsSpeed,
        ttsPitch: state.ttsPitch,
        ttsVolume: state.ttsVolume,
        autoNextChapter: state.autoNextChapter,
        sleepTimerMinutes: state.sleepTimerMinutes,
        ttsVoiceName: state.ttsVoiceName,
        selectedRvApiKeyId: state.selectedRvApiKeyId,
        savedColors: state.savedColors,
      }),
      onRehydrateStorage: () => (state) => state?.applyToDOM(),
    }))