// src/pages/SettingsPage.tsx
import { useSettingsStore } from '@/store/settings.store'
import { useUpdateSettings } from '@/lib/queries'
import { useAuthStore } from '@/store/auth.store'

const FONTS = ['Source Serif 4', 'Georgia', 'Times New Roman', 'DM Sans', 'JetBrains Mono']

export function SettingsPage() {
  const { isAuthenticated } = useAuthStore()
  const settings = useSettingsStore()
  const updateSettings = useUpdateSettings()

  const save = () => {
    if (isAuthenticated) {
      updateSettings.mutate({
        theme: settings.theme, bgColor: settings.bgColor, textColor: settings.textColor,
        fontFamily: settings.fontFamily, fontSize: settings.fontSize, lineHeight: settings.lineHeight,
        ttsLanguage: settings.ttsLanguage, ttsVoice: settings.ttsVoice, ttsSpeed: settings.ttsSpeed,
        ttsVolume: settings.ttsVolume, autoNextChapter: settings.autoNextChapter,
        sleepTimerMinutes: settings.sleepTimerMinutes,
      })
    }
  }

  return (
    <div className="page-container py-8 max-w-2xl">
      <h1 className="section-title">Cài đặt</h1>

      {/* UI Settings */}
      <div className="card p-6 mb-6 space-y-5">
        <h2 className="font-semibold text-[var(--text)] font-ui">Giao diện đọc truyện</h2>

        <div>
          <label className="label">Giao diện</label>
          <div className="flex gap-2">
            {(['light', 'dark'] as const).map((t) => (
              <button key={t} onClick={() => settings.updateUI({ theme: t })}
                className={`px-4 py-2 rounded-lg text-sm font-ui border transition-all ${
                  settings.theme === t ? 'border-accent bg-accent text-white' : 'border-[var(--border)] text-[var(--text-muted)]'
                }`}>
                {t === 'light' ? '☀️ Sáng' : '🌙 Tối'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Màu nền</label>
            <input type="color" value={settings.bgColor}
              onChange={(e) => settings.updateUI({ bgColor: e.target.value })}
              className="w-full h-10 rounded-lg cursor-pointer border border-[var(--border)]" />
          </div>
          <div>
            <label className="label">Màu chữ</label>
            <input type="color" value={settings.textColor}
              onChange={(e) => settings.updateUI({ textColor: e.target.value })}
              className="w-full h-10 rounded-lg cursor-pointer border border-[var(--border)]" />
          </div>
        </div>

        <div>
          <label className="label">Font chữ</label>
          <select value={settings.fontFamily} onChange={(e) => settings.updateUI({ fontFamily: e.target.value })}
            className="input">
            {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Cỡ chữ: {settings.fontSize}px</label>
          <input type="range" min="12" max="32" value={settings.fontSize}
            onChange={(e) => settings.updateUI({ fontSize: parseInt(e.target.value) })}
            className="w-full accent-[var(--accent)]" />
        </div>

        <div>
          <label className="label">Giãn dòng: {settings.lineHeight}</label>
          <input type="range" min="1.2" max="3" step="0.1" value={settings.lineHeight}
            onChange={(e) => settings.updateUI({ lineHeight: parseFloat(e.target.value) })}
            className="w-full accent-[var(--accent)]" />
        </div>

        {/* Preview */}
        <div className="rounded-xl p-5 border border-[var(--border)]"
          style={{ background: settings.bgColor, color: settings.textColor,
            fontFamily: `'${settings.fontFamily}', Georgia, serif`,
            fontSize: settings.fontSize, lineHeight: settings.lineHeight }}>
          <p>Đây là bản xem trước văn bản. Mỗi câu chuyện là một hành trình khám phá thế giới mới.</p>
        </div>
      </div>

      {/* TTS Settings */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-[var(--text)] font-ui">Nghe truyện (TTS)</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Ngôn ngữ</label>
            <select value={settings.ttsLanguage} onChange={(e) => settings.updateTTS({ ttsLanguage: e.target.value as any })} className="input">
              <option value="vi">🇻🇳 Tiếng Việt</option>
              <option value="en">🇬🇧 English</option>
              <option value="zh">🇨🇳 中文</option>
            </select>
          </div>
          <div>
            <label className="label">Giọng đọc</label>
            <select value={settings.ttsVoice} onChange={(e) => settings.updateTTS({ ttsVoice: e.target.value as any })} className="input">
              <option value="female">Nữ</option>
              <option value="male">Nam</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Tốc độ: {settings.ttsSpeed.toFixed(1)}x</label>
          <input type="range" min="0.5" max="5" step="0.1" value={settings.ttsSpeed}
            onChange={(e) => settings.updateTTS({ ttsSpeed: parseFloat(e.target.value) })}
            className="w-full accent-[var(--accent)]" />
        </div>

        <div>
          <label className="label">Âm lượng: {Math.round(settings.ttsVolume * 100)}%</label>
          <input type="range" min="0" max="1" step="0.05" value={settings.ttsVolume}
            onChange={(e) => settings.updateTTS({ ttsVolume: parseFloat(e.target.value) })}
            className="w-full accent-[var(--accent)]" />
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="autoNext" checked={settings.autoNextChapter}
            onChange={(e) => settings.updateTTS({ autoNextChapter: e.target.checked })}
            className="accent-[var(--accent)] w-4 h-4" />
          <label htmlFor="autoNext" className="text-sm text-[var(--text-muted)] font-ui cursor-pointer">
            Tự động nhảy chương khi hết
          </label>
        </div>

        <div>
          <label className="label">Hẹn giờ tắt (phút, 0 = không hẹn)</label>
          <input type="number" min="0" max="180" value={settings.sleepTimerMinutes}
            onChange={(e) => settings.updateTTS({ sleepTimerMinutes: parseInt(e.target.value) })}
            className="input w-32" />
        </div>

        {isAuthenticated && (
          <button onClick={save} disabled={updateSettings.isPending}
            className="btn-primary">
            {updateSettings.isPending ? 'Đang lưu…' : 'Lưu cài đặt lên đám mây'}
          </button>
        )}
      </div>
    </div>
  )
}
