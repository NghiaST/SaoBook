// src/pages/SettingsPage.tsx
import { useEffect, useState } from 'react'
import { useSettingsStore, THEME_BG_OPTIONS, FONT_FAMILY_OPTIONS } from '@/store/settings.store'
import { useUpdateSettings } from '@/lib/queries'
import { useAuthStore } from '@/store/auth.store'
import { CheckCircle2, Moon, Sun, RotateCcw, Mic, Speaker } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Voices từ SpeechSynthesis ─────────────────────────────────────────────────

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
                className="absolute top-1 right-1"
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

// ── Slider Row ────────────────────────────────────────────────────────────────

function SliderRow({
  label, value, min, max, step, display, onChange,
  leftLabel, rightLabel,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
  leftLabel?: string
  rightLabel?: string
}) {
  return (
    <div>
      <label className="label">
        {label}: <span className="font-mono">{display}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-[var(--text-subtle)]">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
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
    if (!isAuthenticated) return
    updateSettings.mutate({
      theme:             settings.theme,
      bgColor:           settings.bgColor,
      textColor:         settings.textColor,
      fontFamily:        settings.fontFamily,
      fontSize:          settings.fontSize,
      lineHeight:        settings.lineHeight,
      ttsLanguage:       settings.ttsLanguage,
      ttsVoice:          settings.ttsVoice,
      ttsSpeed:          settings.ttsSpeed,
      ttsVolume:         settings.ttsVolume,
      autoNextChapter:   settings.autoNextChapter,
      sleepTimerMinutes: settings.sleepTimerMinutes,
    })
  }

  return (
    <div className="page-container py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title mb-0">Cài đặt</h1>
        {/* Reset toàn bộ */}
        <button
          onClick={() => {
            if (confirm('Đặt lại tất cả cài đặt về mặc định?')) settings.resetAll()
          }}
          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] border border-[var(--border)] hover:border-[var(--accent)] px-3 py-1.5 rounded-lg transition-all"
          title="Đặt lại toàn bộ cài đặt"
        >
          <RotateCcw size={13} />
          Đặt lại mặc định
        </button>
      </div>

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
                  if (settings.theme !== t) settings.toggleTheme()
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
          <p className="text-xs text-[var(--text-subtle)] mt-1.5">
            Màu nền/chữ được lưu riêng cho mỗi chế độ — toggle sẽ khôi phục màu đã chỉnh trước đó.
          </p>
        </div>

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

        <SliderRow
          label="Cỡ chữ" value={settings.fontSize} min={12} max={32} step={1}
          display={`${settings.fontSize}px`}
          onChange={(v) => settings.updateUI({ fontSize: v })}
          leftLabel="12px" rightLabel="32px"
        />

        <SliderRow
          label="Giãn dòng" value={settings.lineHeight} min={1.2} max={3} step={0.1}
          display={settings.lineHeight.toFixed(1)}
          onChange={(v) => settings.updateUI({ lineHeight: v })}
          leftLabel="1.2" rightLabel="3.0"
        />

        <SliderRow
          label="Chiều rộng đọc" value={settings.readerMaxWidth} min={500} max={1600} step={20}
          display={`${settings.readerMaxWidth}px`}
          onChange={(v) => settings.updateUI({ readerMaxWidth: v })}
          leftLabel="500px (hẹp)" rightLabel="1600px (rộng)"
        />

        {/* Preview */}
        <div>
          <label className="label">Xem trước</label>
          <div
            className="rounded-xl p-5 border border-[var(--border)] transition-all"
            style={{
              background:  settings.bgColor,
              color:       settings.textColor,
              fontFamily:  `'${settings.fontFamily}', Georgia, serif`,
              fontSize:    settings.fontSize,
              lineHeight:  settings.lineHeight,
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

        {/* TTS Mode */}
        <div>
          <label className="label">Công nghệ TTS</label>
          <div className="flex gap-2">
            {([
              { value: 'speechsynthesis', label: 'SpeechSynthesis', icon: <Mic size={13} />, desc: 'Giọng có sẵn trên trình duyệt' },
              { value: 'responsivevoice', label: 'ResponsiveVoice', icon: <Speaker size={13} />, desc: 'Giọng chất lượng cao hơn, cần API key' },
            ] as const).map((m) => (
              <button
                key={m.value}
                onClick={() => settings.updateTTS({ ttsMode: m.value })}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg text-sm border transition-all',
                  settings.ttsMode === m.value
                    ? 'border-accent bg-[var(--accent-bg)] text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]',
                )}
              >
                <span className="flex items-center gap-1.5 font-medium">{m.icon}{m.label}</span>
                <span className="text-[10px] opacity-70">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

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

        {/* Voice picker — chỉ hiện khi dùng SpeechSynthesis */}
        {settings.ttsMode === 'speechsynthesis' && (
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
          </div>
        )}

        {/* ResponsiveVoice — note */}
        {settings.ttsMode === 'responsivevoice' && (
          <div className="text-xs bg-[var(--bg-alt)] rounded-lg p-3 text-[var(--text-muted)] leading-relaxed">
            <strong>ResponsiveVoice</strong> cần API key được cấu hình bởi admin. Giọng sẽ tự chọn theo ngôn ngữ đã chọn. Đảm bảo admin đã thêm ít nhất 1 key active trong trang Admin → TTS Keys.
          </div>
        )}

        {/* Speed */}
        <SliderRow
          label="Tốc độ" value={settings.ttsSpeed} min={0.5} max={2} step={0.05}
          display={`${settings.ttsSpeed.toFixed(2)}x`}
          onChange={(v) => settings.updateTTS({ ttsSpeed: v })}
          leftLabel="0.5x (chậm)" rightLabel="2.0x (nhanh)"
        />

        {/* Pitch */}
        <SliderRow
          label="Cao độ (Pitch)" value={settings.ttsPitch} min={0} max={2} step={0.1}
          display={settings.ttsPitch.toFixed(1)}
          onChange={(v) => settings.updateTTS({ ttsPitch: v })}
          leftLabel="0 (trầm)" rightLabel="2.0 (cao)"
        />

        {/* Volume */}
        <SliderRow
          label="Âm lượng" value={settings.ttsVolume} min={0} max={1} step={0.05}
          display={`${Math.round(settings.ttsVolume * 100)}%`}
          onChange={(v) => settings.updateTTS({ ttsVolume: v })}
        />

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