// src/pages/SettingsPage.tsx
import { useEffect, useState } from 'react'
import { useSettingsStore, THEME_BG_OPTIONS, FONT_FAMILY_OPTIONS } from '@/store/settings.store'
import { useTTSStore } from '@/store/tts.store'
import { useSettingsSync } from '@/hooks/useSettingsSync'
import { useCreateRVKey, useDeleteRVKey, useRVKeys, useTTSVoices } from '@/lib/queries'
import { useAuthStore } from '@/store/auth.store'
import { CheckCircle2, Moon, Sun, RotateCcw, Mic, Speaker, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

type Option = { value: string; label: string }

/**
 * A <select> shows its FIRST option ("Tự động chọn") whenever its value is not in the
 * option list - which is exactly what happens while the voice / key list is still
 * loading, or when the saved value is not in the list. Keep the saved value selectable
 * so the UI never claims "Tự động" when something else is actually stored.
 */
function withSavedOption(options: Option[], saved: string | null | undefined, label: string): Option[] {
  if (!saved || options.some((o) => o.value === saved)) return options
  return [{ value: saved, label }, ...options]
}

// ── Voices từ SpeechSynthesis ─────────────────────────────────────────────────

function useAvailableVoices(lang: string) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    const load = () => {
      const langCode = lang === 'vi' ? 'vi' : 'en'
      const all = synth.getVoices()
      const filtered = all.filter((v) => v.lang.startsWith(langCode))
      setVoices(filtered.length > 0 ? filtered : all.slice(0, 5))
    }
    load()
    synth.addEventListener('voiceschanged', load)
    return () => synth.removeEventListener('voiceschanged', load)
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
            title={`${p.name} - ${p.desc}`}
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
        {presets.find((p) => p.bg === bgColor)?.name ?? 'Tuỳ chỉnh'} -{' '}
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
  const { isAuthenticated, user: currentUser } = useAuthStore()
  const settings = useSettingsStore()
  const { isDirty, isSaving, saveError, save } = useSettingsSync()
  const { data: rvKeys = [], isLoading: rvKeysLoading } = useRVKeys()
  const createRvKey = useCreateRVKey()
  const deleteRvKey = useDeleteRVKey()
  const { data: rvVoices = [], isError: rvVoicesError, isLoading: rvVoicesLoading } = useTTSVoices(
    settings.ttsLanguage === 'en' ? 'en-US' : 'vi-VN',
    settings.ttsMode === 'responsivevoice',
  )

  const voices = useAvailableVoices(settings.ttsLanguage)
  const selectableRvKeys = rvKeys.filter(
    (key) => key.status === 'public' || (key.status === 'personal' && key.userSettingsId === currentUser?.id),
  )
  const personalRvKeys = rvKeys.filter((key) => key.status === 'personal' && key.userSettingsId === currentUser?.id)
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [newKeySecret, setNewKeySecret] = useState('')

  // Select options. The saved value is always selectable (see withSavedOption).
  const ssVoiceOptions = withSavedOption(
    voices.map((v) => ({ value: v.name, label: `${v.name} (${v.lang})${v.localService ? '' : ' ☁️'}` })),
    settings.ttsVoiceName,
    `${settings.ttsVoiceName} (đã lưu)`,
  )
  const rvVoiceOptions = withSavedOption(
    rvVoices.map((v) => ({ value: v.voiceName, label: `${v.voiceName} (${v.language}, ${v.gender})` })),
    settings.rvVoiceName,
    rvVoicesLoading ? 'Đang tải giọng…' : `${settings.rvVoiceName} (đã lưu)`,
  )
  const rvKeyOptions = withSavedOption(
    selectableRvKeys.map((key) => ({ value: key.id, label: `${key.label} (${key.status})` })),
    settings.selectedRvApiKeyId,
    rvKeysLoading ? 'Đang tải key…' : 'Key đã lưu (không còn khả dụng)',
  )

  const addPersonalKey = async () => {
    if (!newKeyLabel.trim() || !newKeyValue.trim()) return
    const created = await createRvKey.mutateAsync({
      label: newKeyLabel.trim(),
      key: newKeyValue.trim(),
      secret: newKeySecret.trim() || undefined,
    })
    settings.updateTTS({ selectedRvApiKeyId: created.id })
    setNewKeyLabel('')
    setNewKeyValue('')
    setNewKeySecret('')
  }

  const removePersonalKey = (id: string) => {
    if (settings.selectedRvApiKeyId === id) settings.updateTTS({ selectedRvApiKeyId: null })
    deleteRvKey.mutate(id)
  }

  return (
    <div className="page-container py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title mb-0">Cài đặt</h1>
        {/* Reset toàn bộ */}
        <button
          onClick={() => {
            if (confirm('Đặt lại tất cả cài đặt về mặc định?')) {
              settings.resetAll()
            }
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
            Màu nền/chữ được lưu riêng cho mỗi chế độ - toggle sẽ khôi phục màu đã chỉnh trước đó.
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
        <p className="text-xs text-[var(--text-subtle)] -mt-3">
          Mẹo: khi đang đọc, bấm nút tuỳ chỉnh nhanh (⚙) trên thanh công cụ để chỉnh chiều rộng và xem kết quả ngay.
        </p>

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
              settings.updateTTS({ ttsLanguage: e.target.value as any, ttsVoiceName: '', rvVoiceName: '' })
            }}
            className="input"
          >
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>

        {/* Voice picker - SpeechSynthesis */}
        {settings.ttsMode === 'speechsynthesis' && (
          <div>
            <label className="label">
              Giọng đọc{' '}
              <span className="text-xs font-normal text-[var(--text-subtle)]">
                ({voices.length} giọng khả dụng)
              </span>
            </label>
            <select
              value={settings.ttsVoiceName || ''}
              onChange={(e) => settings.updateTTS({ ttsVoiceName: e.target.value })}
              className="input"
            >
              <option value="">-- Tự động chọn --</option>
              {ssVoiceOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {voices.length === 0 && (
              <p className="text-xs text-[var(--text-subtle)] mt-1">
                Trình duyệt chưa tải xong danh sách giọng. Thử tải lại trang.
              </p>
            )}
          </div>
        )}

        {/* Voice picker - ResponsiveVoice */}
        {settings.ttsMode === 'responsivevoice' && (
          <div>
            <label className="label">
              Giọng ResponsiveVoice{' '}
              <span className="text-xs font-normal text-[var(--text-subtle)]">
                ({rvVoices.length} giọng khả dụng)
              </span>
            </label>
            <select
              value={settings.rvVoiceName || ''}
              onChange={(e) => settings.updateTTS({ rvVoiceName: e.target.value })}
              className="input"
            >
              <option value="">-- Tự động chọn --</option>
              {rvVoiceOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {rvVoices.length === 0 && (
              <p className="text-xs text-[var(--text-subtle)] mt-1">
                {rvVoicesLoading
                  ? 'Đang tải danh sách giọng…'
                  : rvVoicesError
                    ? 'Không thể tải danh sách giọng.'
                    : 'Chưa có giọng ResponsiveVoice khả dụng.'}
              </p>
            )}
          </div>
        )}

        {/* ResponsiveVoice - API keys */}
        {settings.ttsMode === 'responsivevoice' && (
          <div className="space-y-3">
            <div>
              <label className="label">API key sử dụng</label>
              <select
                value={settings.selectedRvApiKeyId ?? ''}
                onChange={(e) => settings.updateTTS({ selectedRvApiKeyId: e.target.value || null })}
                className="input"
              >
                <option value="">Tự động chọn key khả dụng</option>
                {rvKeyOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="border border-[var(--border)] rounded-lg p-3 space-y-3">
              <div>
                <p className="text-sm font-medium text-[var(--text)]">Personal API keys</p>
                <p className="text-xs text-[var(--text-subtle)] mt-1">
                  Bạn có thể thêm nhiều key cá nhân, nhưng chỉ một key được dùng tại một thời điểm.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input className="input text-sm" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} placeholder="Tên key" />
                <input className="input text-sm font-mono" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} placeholder="API key" />
                <input className="input text-sm font-mono" type="password" value={newKeySecret} onChange={(e) => setNewKeySecret(e.target.value)} placeholder="API secret" />
              </div>
              <button
                type="button"
                onClick={addPersonalKey}
                disabled={createRvKey.isPending || !newKeyLabel.trim() || !newKeyValue.trim()}
                className="btn-outline text-sm flex items-center gap-1.5"
              >
                <Plus size={14} /> Thêm key cá nhân
              </button>
              {personalRvKeys.length > 0 && (
                <div className="space-y-1.5">
                  {personalRvKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-[var(--text-muted)]">{key.label}</span>
                      <button
                        type="button"
                        onClick={() => removePersonalKey(key.id)}
                        disabled={deleteRvKey.isPending}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Xóa key cá nhân"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-xs bg-[var(--bg-alt)] rounded-lg p-3 text-[var(--text-muted)] leading-relaxed">
              <strong>ResponsiveVoice</strong> dùng key đã chọn để tạo audio qua backend.
              {rvVoicesError ? ' Không thể tải danh sách giọng lúc này.' : ` ${rvVoices.length} giọng khả dụng.`}
            </div>
          </div>
        )}

        {/* Speed */}
        <SliderRow
          label="Tốc độ" value={Math.min(settings.ttsSpeed, 4)} min={0.5} max={4} step={0.05}
          display={`${settings.ttsSpeed.toFixed(2)}x`}
          onChange={(v) => {
            settings.updateTTS({ ttsSpeed: v })
            useTTSStore.getState().setPlaybackSpeed(v) // live, if something is playing
          }}
          leftLabel="0.5x (chậm)" rightLabel="4.0x (nhanh)"
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

        {/* Sleep timer moved to the reader page */}
        <p className="text-xs text-[var(--text-subtle)]">
          Hẹn giờ tắt được chỉnh ngay trong trang đọc (nút tuỳ chỉnh nhanh ⚙ trên thanh công cụ) và bắt đầu đếm ngược ngay lập tức.
        </p>

        {isAuthenticated ? (
          <div className="space-y-2">
            <button
              onClick={save}
              disabled={isSaving || !isDirty}
              className="btn-primary"
            >
              {isSaving ? 'Đang lưu…' : isDirty ? '☁️ Lưu ngay' : '✓ Đã đồng bộ'}
            </button>
            <p className="text-xs text-[var(--text-subtle)]">
              Giọng, API key, tốc độ… được tự động lưu lên đám mây ngay sau khi bạn thay đổi, vì giọng ResponsiveVoice
              được tạo từ cài đặt đã lưu trên máy chủ.
            </p>
            {saveError && (
              <p role="alert" className="text-xs text-red-500">{saveError}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-subtle)]">Đăng nhập để lưu cài đặt giọng đọc lên đám mây.</p>
        )}
      </div>
    </div>
  )
}