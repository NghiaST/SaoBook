// src/store/settings.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Types ─────────────────────────────────────────────────────────────────────

export type UITheme = 'light' | 'dark'
export type TTSLanguage = 'vi' | 'en' | 'zh'
export type TTSVoice = 'male' | 'female'

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
  { label: 'Arial',        value: 'Arial' },
  { label: 'Source Serif 4', value: 'Source Serif 4' },
  { label: 'Georgia',        value: 'Georgia' },
  { label: 'Times New Roman',value: 'Times New Roman' },
  { label: 'Verdana',        value: 'Verdana' },
  { label: 'Tahoma',         value: 'Tahoma' },
  { label: 'JetBrains Mono', value: 'JetBrains Mono' },
]

// ── State interface ───────────────────────────────────────────────────────────

export interface UISettings {
  theme: UITheme
  bgColor: string
  textColor: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  readerMaxWidth: number // px, e.g. 800
}

export interface TTSSettings {
  ttsLanguage: TTSLanguage
  ttsVoice: TTSVoice
  ttsSpeed: number
  ttsVolume: number
  autoNextChapter: boolean
  sleepTimerMinutes: number
  // Tên voice cụ thể từ SpeechSynthesis (lưu để dùng lại)
  ttsVoiceName: string
}

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
  fontFamily: 'Arial',
  fontSize: 17,
  lineHeight: 1.7,
  readerMaxWidth: 1100,
  // TTS
  ttsLanguage: 'vi',
  ttsVoice: 'female',
  ttsSpeed: 1.0,
  ttsVolume: 1.0,
  autoNextChapter: false,
  sleepTimerMinutes: 0,
  ttsVoiceName: '',
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