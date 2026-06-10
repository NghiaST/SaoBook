// src/features/admin/RVKeysPanel.tsx
// Nhúng vào AdminPage.tsx — thêm tab "TTS Keys"
import { useState } from 'react'
import {
  useAdminRVKeys, useCreateRVKey, useUpdateRVKey, useDeleteRVKey,
} from '@/lib/queries'
import type { RvApiKey } from '@/types'
import { Plus, Pencil, Trash2, Check, X, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RVKeysPanel() {
  const { data: keys = [], isLoading } = useAdminRVKeys()
  const createKey = useCreateRVKey()
  const updateKey = useUpdateRVKey()
  const deleteKey = useDeleteRVKey()

  const [showKeys, setShowKeys]   = useState(false)
  const [creating, setCreating]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [newLabel, setNewLabel] = useState('')
  const [newKey,   setNewKey]   = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [editKey,   setEditKey]   = useState('')

  const handleCreate = async () => {
    if (!newLabel.trim() || !newKey.trim()) return
    await createKey.mutateAsync({ label: newLabel.trim(), key: newKey.trim() })
    setNewLabel(''); setNewKey(''); setCreating(false)
  }

  const startEdit = (k: RvApiKey) => {
    setEditingId(k.id)
    setEditLabel(k.label)
    setEditKey(k.key)
  }

  const handleUpdate = async (id: string) => {
    await updateKey.mutateAsync({ id, label: editLabel.trim(), key: editKey.trim() })
    setEditingId(null)
  }

  const handleToggleActive = (k: RvApiKey) => {
    updateKey.mutate({ id: k.id, active: !k.active })
  }

  const handleDelete = (id: string) => {
    if (confirm('Xoá key này?')) deleteKey.mutate(id)
  }

  if (isLoading) return <div className="py-8 text-center text-[var(--text-subtle)]">Đang tải...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text)]">ResponsiveVoice API Keys</h3>
          <p className="text-xs text-[var(--text-subtle)] mt-0.5">
            Các key được phân bố lần lượt (round-robin) cho từng đoạn văn khi đọc truyện.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowKeys((v) => !v)}
            className="btn-ghost text-xs px-2 py-1.5 flex items-center gap-1"
            title={showKeys ? 'Ẩn key' : 'Hiện key'}
          >
            {showKeys ? <EyeOff size={13} /> : <Eye size={13} />}
            {showKeys ? 'Ẩn' : 'Hiện'} key
          </button>
          <button
            onClick={() => setCreating(true)}
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <Plus size={13} /> Thêm key
          </button>
        </div>
      </div>

      {/* Add form */}
      {creating && (
        <div className="card p-4 space-y-3 border-dashed border-2 border-[var(--accent)]">
          <p className="text-sm font-medium text-[var(--text)]">Thêm key mới</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Nhãn (vd: Key #1)</label>
              <input
                className="input text-sm"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Key #1"
              />
            </div>
            <div>
              <label className="label text-xs">API Key</label>
              <input
                className="input text-sm font-mono"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Paste key vào đây"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createKey.isPending || !newLabel || !newKey}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <Check size={13} /> Lưu
            </button>
            <button
              onClick={() => { setCreating(false); setNewLabel(''); setNewKey('') }}
              className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <X size={13} /> Huỷ
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="py-8 text-center text-[var(--text-subtle)] text-sm">
          Chưa có key nào. Thêm key để dùng ResponsiveVoice.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k, idx) => (
            <div
              key={k.id}
              className={cn(
                'card p-3 flex items-center gap-3 transition-all',
                !k.active && 'opacity-50',
              )}
            >
              {/* Index badge */}
              <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--bg-alt)] text-[var(--text-muted)] text-xs flex items-center justify-center font-mono">
                {idx + 1}
              </span>

              {editingId === k.id ? (
                /* Edit mode */
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    className="input text-sm"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Nhãn"
                  />
                  <input
                    className="input text-sm font-mono"
                    value={editKey}
                    onChange={(e) => setEditKey(e.target.value)}
                    placeholder="API Key"
                  />
                </div>
              ) : (
                /* View mode */
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{k.label}</p>
                  <p className="text-xs font-mono text-[var(--text-subtle)] truncate">
                    {showKeys ? k.key : k.key.slice(0, 8) + '•'.repeat(Math.min(20, k.key.length - 8)) }
                  </p>
                </div>
              )}

              {/* Active badge */}
              <span className={cn(
                'shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                k.active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-[var(--bg-alt)] text-[var(--text-subtle)]',
              )}>
                {k.active ? 'Active' : 'Tắt'}
              </span>

              {/* Actions */}
              <div className="shrink-0 flex items-center gap-1">
                {editingId === k.id ? (
                  <>
                    <button
                      onClick={() => handleUpdate(k.id)}
                      className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-alt)]"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleToggleActive(k)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-alt)]"
                      title={k.active ? 'Tắt key' : 'Bật key'}
                    >
                      {k.active ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
                    </button>
                    <button
                      onClick={() => startEdit(k)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-alt)]"
                      title="Sửa"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(k.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Xoá"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--text-subtle)]">
        {keys.filter((k) => k.active).length} key active · {keys.length} tổng
      </p>
    </div>
  )
}