// src/features/admin/RVKeysPanel.tsx
// Embed into AdminPage.tsx - add a "TTS Keys" tab
import { useEffect, useState } from 'react'
import {
  useAdminRVKeys, useCreateRVKey, useUpdateRVKey, useDeleteRVKey, useRVKeyCredentials,
} from '@/lib/queries'
import type { RvApiKey } from '@/types'
import { Plus, Pencil, Trash2, Check, X, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RVKeysPanel() {
  const { data: keys = [], isLoading } = useAdminRVKeys()
  const createKey = useCreateRVKey()
  const updateKey = useUpdateRVKey()
  const deleteKey = useDeleteRVKey()

  const [creating, setCreating]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const credentials = useRVKeyCredentials(editingId)

  // Form state
  const [newLabel, setNewLabel] = useState('')
  const [newKey,   setNewKey]   = useState('')
  const [newSecret, setNewSecret] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [editKey,   setEditKey]   = useState('')
  const [editSecret, setEditSecret] = useState('')
  const [showEditKey, setShowEditKey] = useState(false)
  const [showEditSecret, setShowEditSecret] = useState(false)

  useEffect(() => {
    if (!credentials.data || !editingId) return
    setEditKey(credentials.data.key)
    setEditSecret(credentials.data.secret ?? '')
  }, [credentials.data, editingId])

  const handleCreate = async () => {
    if (!newLabel.trim() || !newKey.trim()) return
    await createKey.mutateAsync({ label: newLabel.trim(), key: newKey.trim(), secret: newSecret.trim() || undefined })
    setNewLabel(''); setNewKey(''); setNewSecret(''); setCreating(false)
  }

  const startEdit = (k: RvApiKey) => {
    setEditingId(k.id)
    setEditLabel(k.label)
    setEditKey('')
    setEditSecret('')
    setShowEditKey(false)
    setShowEditSecret(false)
  }

  const handleUpdate = async (id: string) => {
    await updateKey.mutateAsync({ id, label: editLabel.trim(), key: editKey.trim(), secret: editSecret.trim() || undefined })
    setEditingId(null)
  }

  const handleToggleStatus = (k: RvApiKey) => {
    updateKey.mutate({ id: k.id, status: k.status === 'hidden' ? 'public' : 'hidden' })
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this key?')) deleteKey.mutate(id)
  }

  if (isLoading) return <div className="py-8 text-center text-[var(--text-subtle)]">Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text)]">ResponsiveVoice API Keys</h3>
          <p className="text-xs text-[var(--text-subtle)] mt-0.5">
            Credentials are hidden by default. Admins can edit any key; values are loaded automatically when editing.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCreating(true)}
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <Plus size={13} /> Add key
          </button>
        </div>
      </div>

      {/* Add form */}
      {creating && (
        <div className="card p-4 space-y-3 border-dashed border-2 border-[var(--accent)]">
          <p className="text-sm font-medium text-[var(--text)]">Add new key</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Label (e.g.: Key #1)</label>
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
                placeholder="Paste key here"
              />
            </div>
            <div className="col-span-2">
              <label className="label text-xs">API Secret (optional)</label>
              <input
                type="password"
                className="input text-sm font-mono"
                value={newSecret}
                onChange={(e) => setNewSecret(e.target.value)}
                placeholder="Server-side v2 secret"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createKey.isPending || !newLabel || !newKey}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <Check size={13} /> Save
            </button>
            <button
              onClick={() => { setCreating(false); setNewLabel(''); setNewKey(''); setNewSecret('') }}
              className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="py-8 text-center text-[var(--text-subtle)] text-sm">
          No keys found. Add keys to use ResponsiveVoice.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k, idx) => (
            <div
              key={k.id}
              className={cn(
                'card p-3 flex items-center gap-3 transition-all',
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
                    placeholder="Label"
                  />
                  <div className="relative">
                    <input
                      type={showEditKey ? 'text' : 'password'}
                      className="input text-sm font-mono pr-9 w-full"
                      value={editKey}
                      onChange={(e) => setEditKey(e.target.value)}
                      placeholder="API Key"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditKey((visible) => !visible)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      title={showEditKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showEditKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div className="relative col-span-2">
                    <input
                      type={showEditSecret ? 'text' : 'password'}
                      className="input text-sm font-mono pr-9 w-full"
                      value={editSecret}
                      onChange={(e) => setEditSecret(e.target.value)}
                      placeholder="API Secret"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditSecret((visible) => !visible)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      title={showEditSecret ? 'Hide API secret' : 'Show API secret'}
                    >
                      {showEditSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{k.label}</p>
                  <p className="text-xs text-[var(--text-subtle)] truncate">
                    {k.status === 'public' ? 'Admin-managed public key' : 'Credentials available when editing'}
                  </p>
                </div>
              )}

              {/* Visibility badge */}
              <span className={cn(
                'shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                k.status !== 'hidden'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-[var(--bg-alt)] text-[var(--text-subtle)]',
              )}>
                {k.status === 'hidden' ? 'Hidden' : k.status === 'personal' ? 'Personal' : 'Public'}
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
                      onClick={() => handleToggleStatus(k)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-alt)]"
                      title={k.status === 'hidden' ? 'Show key' : 'Hide key'}
                    >
                      {k.status !== 'hidden' ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} />}
                    </button>
                    <button
                      onClick={() => startEdit(k)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-alt)]"
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(k.id)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete"
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
        {keys.filter((k) => k.status !== 'hidden').length} visible keys · {keys.length} total
      </p>
    </div>
  )
}