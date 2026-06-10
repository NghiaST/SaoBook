// src/store/settings.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TTSMode } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type UITheme = 'light' | 'dark'
export type TTSLanguage = 'vi' | 'en' | 'zh'
export type TTSVoice = 'male' | 'female'
export { type TTSMode }

export interface ThemeBgOption {
  name: string
  bg: string
  text: string
  desc: string
}

// Preset màu nền theo theme
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
}

interface SettingsState extends UISettings, TTSSettings {
  /** Màu đã lưu riêng cho từng theme — để khi toggle không mất setting */
  savedColors: Record<UITheme, { bgColor: string; textColor: string }>

  applyToDOM: () => void
  updateUI: (patch: Partial<UISettings>) => void
  updateTTS: (patch: Partial<TTSSettings>) => void
  /** Toggle theme sáng/tối — khôi phục màu đã lưu của theme đích */
  toggleTheme: () => void
  /** Reset toàn bộ về default */
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
}

const defaultSavedColors: Record<UITheme, { bgColor: string; textColor: string }> = {
  light: { bgColor: '#FDFBF7', textColor: '#241E16' },
  dark:  { bgColor: '#1A1510', textColor: '#A4A15B' },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
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
        // Nếu đang thay đổi màu, lưu lại cho theme hiện tại
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

      toggleTheme: () => {
        const { theme, savedColors } = get()
        const newTheme: UITheme = theme === 'light' ? 'dark' : 'light'
        // Lưu màu hiện tại cho theme cũ
        const { bgColor, textColor } = get()
        const newColors = {
          ...savedColors,
          [theme]: { bgColor, textColor },
        }
        // Khôi phục màu đã lưu của theme mới (hoặc default nếu chưa có)
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
    }),
    { name: 'reader-settings' },
  ),
)