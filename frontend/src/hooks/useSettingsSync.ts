// src/hooks/useSettingsSync.ts
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useSettingsStore, ttsToUserSettings, toSyncSnapshot } from '@/store/settings.store'
import { useMe, useUpdateSettings } from '@/lib/queries'

const AUTOSAVE_DELAY_MS = 800

/**
 * Keeps the server-synced TTS settings (voice, API key, pitch, speed, auto-next) saved.
 *
 * The backend generates the audio from the settings stored on the SERVER, so a change that
 * is only kept locally has no effect on playback and is overwritten by the server copy on
 * the next page load. This hook saves it automatically shortly after the user changes it.
 *
 * - "Dirty" is computed against the server copy (from /users/me), not against whatever the
 *   store happened to contain when the page was opened.
 * - It only auto-saves after the user changed something in this session, so stale local
 *   values at startup can never overwrite the server.
 * - After a failed save it stops retrying until the settings change again.
 *
 * Mount it in the pages where these settings can change (Settings, Reader).
 */
export function useSettingsSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const settings = useSettingsStore()
  const { data: me } = useMe()
  const { mutate, isPending, isError, error } = useUpdateSettings()

  const local = ttsToUserSettings(settings)
  const localKey = JSON.stringify(toSyncSnapshot(local))
  const serverKey = me ? (me.settings ? JSON.stringify(toSyncSnapshot(me.settings)) : '') : null
  const isDirty = isAuthenticated && serverKey !== null && localKey !== serverKey

  // Has the user changed anything since this hook mounted?
  const changed = useRef(false)
  const prevKey = useRef(localKey)
  useEffect(() => {
    if (prevKey.current !== localKey) {
      changed.current = true
      prevKey.current = localKey
    }
  }, [localKey])

  const failedKey = useRef<string | null>(null)

  const doSave = () => {
    const key = localKey
    mutate(local, {
      onSuccess: () => { failedKey.current = null },
      onError: () => { failedKey.current = key },
    })
  }

  useEffect(() => {
    if (!isDirty || !changed.current || isPending || failedKey.current === localKey) return
    const timer = setTimeout(doSave, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, isPending, localKey])

  const saveError = isError
    ? ((error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message
        ?? 'Không lưu được cài đặt. Hãy thử lại.')
    : null

  return {
    isDirty,
    isSaving: isPending,
    saveError,
    /** Manual save / retry. */
    save: () => {
      failedKey.current = null
      doSave()
    },
  }
}