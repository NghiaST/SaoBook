// src/pages/SettingsPage.tsx
import { useEffect, useState } from 'react'
import { useSettingsStore, THEME_BG_OPTIONS, FONT_FAMILY_OPTIONS } from '@/store/settings.store'
import { useUpdateSettings } from '@/lib/queries'
import { useAuthStore } from '@/store/auth.store'
import { CheckCircle2, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Lấy danh sách voice tiếng Việt từ SpeechSynthesis ────────────────────────

function useAvailableVoices(lang: string) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    const load = () => {
      const langCode = lang === 'vi' ? 'vi' : lang === 'zh' ? 'zh' : 'en'
      const all = window.speechSynthesis.getVoices()
      const filtered = all.filter((v) => v.lang.startsWith(langCode))
      setVoices(filtered.length > 0 ? filtered : all.slice(0, 5))
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [lang])

  return voices
}

// ── Color Preset Picker ───────────────────────────────────────────────────────

function ColorPresetPicker() {
  const { theme, bgColor, updateUI } = useSettingsStore()
  const presets = THEME_BG_OPTIONS[theme]

  return (
    <div>
      <label className="label">Màu nền nhanh</label>
      <div className="grid grid-cols-5 gap-2">
        {presets.map((p) => (
          <button
            key={p.name}
            title={`${p.name} — ${p.desc}`}
            onClick={() => updateUI({ bgColor: p.bg, textColor: p.text })}
            className={cn(
              'relative h-10 rounded-lg border-2 transition-all',
              bgColor === p.bg
                ? 'border-accent scale-105 shadow-md'
                : 'border-[var(--border)] hover:border-[var(--text-muted)]',
            )}
            style={{ background: p.bg }}
          >
            {bgColor === p.bg && (
              <CheckCircle2
                size={14}
                className="absolute top-1 right-1 text-accent"
                style={{ color: p.text }}
              />
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-[var(--text-subtle)] mt-1">
        {presets.find((p) => p.bg === bgColor)?.name ?? 'Tuỳ chỉnh'} —{' '}
        {presets.find((p) => p.bg === bgColor)?.desc ?? 'Màu tuỳ chỉnh'}
      </p>
    </div>
  )
}

// ── SettingsPage ──────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { isAuthenticated } = useAuthStore()
  const settings = useSettingsStore()
  const updateSettings = useUpdateSettings()
  const voices = useAvailableVoices(settings.ttsLanguage)

  const save = () => {
    if (isAuthenticated) {
      updateSettings.mutate({
        theme: settings.theme,
        bgColor: settings.bgColor,
        textColor: settings.textColor,
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        lineHeight: settings.lineHeight,
        ttsLanguage: settings.ttsLanguage,
        ttsVoice: settings.ttsVoice,
        ttsSpeed: settings.ttsSpeed,
        ttsVolume: settings.ttsVolume,
        autoNextChapter: settings.autoNextChapter,
        sleepTimerMinutes: settings.sleepTimerMinutes,
      })
    }
  }

  return (
    <div className="page-container py-8 max-w-2xl">
      <h1 className="section-title">Cài đặt</h1>

      {/* ── Giao diện đọc ─────────────────────────────────────────── */}
      <div className="card p-6 mb-6 space-y-5">
        <h2 className="font-semibold text-[var(--text)] font-ui">Giao diện đọc truyện</h2>

        {/* Theme toggle */}
        <div>
          <label className="label">Chế độ</label>
          <div className="flex gap-2">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  const preset = THEME_BG_OPTIONS[t][0]
                  settings.updateUI({ theme: t, bgColor: preset.bg, textColor: preset.text })
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-ui border transition-all',
                  settings.theme === t
                    ? 'border-accent bg-accent text-white'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]',
                )}
              >
                {t === 'light' ? <Sun size={14} /> : <Moon size={14} />}
                {t === 'light' ? 'Sáng' : 'Tối'}
              </button>
            ))}
          </div>
        </div>

        {/* Color presets */}
        <ColorPresetPicker />

        {/* Manual color pickers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Màu nền tuỳ chỉnh</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.bgColor}
                onChange={(e) => settings.updateUI({ bgColor: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)] p-0.5"
              />
              <span className="text-xs font-mono text-[var(--text-muted)]">{settings.bgColor}</span>
            </div>
          </div>
          <div>
            <label className="label">Màu chữ tuỳ chỉnh</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.textColor}
                onChange={(e) => settings.updateUI({ textColor: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer border border-[var(--border)] p-0.5"
              />
              <span className="text-xs font-mono text-[var(--text-muted)]">{settings.textColor}</span>
            </div>
          </div>
        </div>

        {/* Font family */}
        <div>
          <label className="label">Font chữ</label>
          <select
            value={settings.fontFamily}
            onChange={(e) => settings.updateUI({ fontFamily: e.target.value })}
            className="input"
          >
            {FONT_FAMILY_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Font size */}
        <div>
          <label className="label">Cỡ chữ: {settings.fontSize}px</label>
          <input
            type="range"
            min="12"
            max="32"
            value={settings.fontSize}
            onChange={(e) => settings.updateUI({ fontSize: parseInt(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-xs text-[var(--text-subtle)]">
            <span>12px</span><span>32px</span>
          </div>
        </div>

        {/* Line height */}
        <div>
          <label className="label">Giãn dòng: {settings.lineHeight.toFixed(1)}</label>
          <input
            type="range"
            min="1.2"
            max="3"
            step="0.1"
            value={settings.lineHeight}
            onChange={(e) => settings.updateUI({ lineHeight: parseFloat(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-xs text-[var(--text-subtle)]">
            <span>1.2</span><span>3.0</span>
          </div>
        </div>

        {/* Reader max width */}
        <div>
          <label className="label">Chiều rộng đọc: {settings.readerMaxWidth}px</label>
          <input
            type="range"
            min="500"
            max="1600"
            step="20"
            value={settings.readerMaxWidth}
            onChange={(e) => settings.updateUI({ readerMaxWidth: parseInt(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-xs text-[var(--text-subtle)]">
            <span>500px (hẹp)</span><span>1200px (rộng)</span>
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="label">Xem trước</label>
          <div
            className="rounded-xl p-5 border border-[var(--border)] transition-all"
            style={{
              background: settings.bgColor,
              color: settings.textColor,
              fontFamily: `'${settings.fontFamily}', Georgia, serif`,
              fontSize: settings.fontSize,
              lineHeight: settings.lineHeight,
            }}
          >
            <p style={{ textIndent: '2em' }}>
              Đây là bản xem trước văn bản. Mỗi câu chuyện là một hành trình khám phá thế giới mới. Ánh trăng chiếu qua khe cửa sổ, soi rõ từng trang sách úa vàng theo năm tháng.
            </p>
          </div>
        </div>
      </div>

      {/* ── TTS ──────────────────────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-[var(--text)] font-ui">Nghe truyện (TTS)</h2>

        {/* Language */}
        <div>
          <label className="label">Ngôn ngữ TTS</label>
          <select
            value={settings.ttsLanguage}
            onChange={(e) => {
              settings.updateTTS({ ttsLanguage: e.target.value as any, ttsVoiceName: '' })
            }}
            className="input"
          >
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="en">🇬🇧 English</option>
            <option value="zh">🇨🇳 中文</option>
          </select>
        </div>

        {/* Voice picker — từ SpeechSynthesis */}
        <div>
          <label className="label">
            Giọng đọc{' '}
            <span className="text-xs font-normal text-[var(--text-subtle)]">
              ({voices.length} giọng khả dụng)
            </span>
          </label>
          {voices.length > 0 ? (
            <select
              value={settings.ttsVoiceName || ''}
              onChange={(e) => settings.updateTTS({ ttsVoiceName: e.target.value })}
              className="input"
            >
              <option value="">-- Tự động chọn --</option>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang}){v.localService ? '' : ' ☁️'}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-[var(--text-subtle)] mt-1">
              Trình duyệt chưa tải xong danh sách giọng. Thử tải lại trang.
            </p>
          )}
          {/* Fallback gender */}
          <div className="flex gap-2 mt-2">
            {(['female', 'male'] as const).map((g) => (
              <button
                key={g}
                onClick={() => settings.updateTTS({ ttsVoice: g })}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg border transition-all',
                  settings.ttsVoice === g
                    ? 'border-accent bg-accent text-white'
                    : 'border-[var(--border)] text-[var(--text-muted)]',
                )}
              >
                {g === 'female' ? '♀ Nữ' : '♂ Nam'} (ưu tiên)
              </button>
            ))}
          </div>
        </div>

        {/* Speed */}
        <div>
          <label className="label">Tốc độ: {settings.ttsSpeed.toFixed(1)}x</label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={settings.ttsSpeed}
            onChange={(e) => settings.updateTTS({ ttsSpeed: parseFloat(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-xs text-[var(--text-subtle)]">
            <span>0.5x (chậm)</span><span>3.0x (nhanh)</span>
          </div>
        </div>

        {/* Volume */}
        <div>
          <label className="label">Âm lượng: {Math.round(settings.ttsVolume * 100)}%</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.ttsVolume}
            onChange={(e) => settings.updateTTS({ ttsVolume: parseFloat(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        {/* Auto next */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="autoNext"
            checked={settings.autoNextChapter}
            onChange={(e) => settings.updateTTS({ autoNextChapter: e.target.checked })}
            className="accent-[var(--accent)] w-4 h-4"
          />
          <label htmlFor="autoNext" className="text-sm text-[var(--text-muted)] font-ui cursor-pointer">
            Tự động đọc & nhảy chương kế tiếp khi hết
          </label>
        </div>

        {/* Sleep timer */}
        <div>
          <label className="label">Hẹn giờ tắt (phút, 0 = không hẹn)</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              max="180"
              value={settings.sleepTimerMinutes}
              onChange={(e) => settings.updateTTS({ sleepTimerMinutes: parseInt(e.target.value) || 0 })}
              className="input w-24"
            />
            {/* Quick presets */}
            <div className="flex gap-1">
              {[0, 15, 30, 60, 90].map((m) => (
                <button
                  key={m}
                  onClick={() => settings.updateTTS({ sleepTimerMinutes: m })}
                  className={cn(
                    'text-xs px-2 py-1 rounded border transition-all',
                    settings.sleepTimerMinutes === m
                      ? 'border-accent text-accent bg-[var(--accent-bg)]'
                      : 'border-[var(--border)] text-[var(--text-subtle)] hover:border-[var(--text-muted)]',
                  )}
                >
                  {m === 0 ? 'Tắt' : `${m}'`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save to cloud */}
        {isAuthenticated && (
          <button
            onClick={save}
            disabled={updateSettings.isPending}
            className="btn-primary"
          >
            {updateSettings.isPending ? 'Đang lưu…' : '☁️ Lưu cài đặt lên đám mây'}
          </button>
        )}
      </div>
    </div>
  )
}