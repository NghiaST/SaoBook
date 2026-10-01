// src/pages/AdminPage.tsx
import { useState } from 'react'
import { useAdminUsers, useAdminStats, useChangeUserRole, useDeleteUser } from '@/lib/queries'
import { Spinner, Badge, Button } from '@/components/ui'
import { Users, BookOpen, MessageSquare, Star, TrendingUp, Eye, KeyRound } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Role } from '@/types'
import { RVKeysPanel } from '@/features/admin/RVKeysPanel'
import { BookManagerPanel } from '@/features/admin/BookManagerPanel'

const ROLES: Role[] = ['user', 'author', 'admin']
const ROLE_LABELS: Record<Role, string> = { user: 'User', author: 'Author', admin: 'Admin' }
const ROLE_COLORS: Record<Role, string> = {
  user: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  author: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-accent">{icon}</span>
        <span className="text-sm font-ui text-[var(--text-muted)]">{label}</span>
      </div>
      <p className="font-display text-3xl font-bold text-[var(--text)]">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-[var(--text-subtle)] mt-1">{sub}</p>}
    </div>
  )
}

export function AdminPage() {
  const [tab, setTab] = useState<'stats' | 'users' | 'books' | 'rv-keys'>('stats')
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: usersData, isLoading: usersLoading } = useAdminUsers({ q, role: roleFilter || undefined, page })
  const changeRole = useChangeUserRole()
  const deleteUser = useDeleteUser()

  return (
    <div className="page-container py-8">
      <h1 className="section-title">Admin Dashboard</h1>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] flex gap-1 mb-8">
        {(['stats', 'users', 'books', 'rv-keys'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-ui font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}>
            {t === 'stats' ? '📊 Statistics' : t === 'users' ? '👥 Users' : t === 'books' ? '📚 Books' : <><KeyRound size={14} className="inline mr-1" /> RV Keys</>}
          </button>
        ))}
      </div>

      {/* Stats tab */}
      {tab === 'stats' && (
        <>
          {statsLoading ? (
            <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={<Users size={20} />} label="Total Users"
                  value={stats.users?.total ?? 0} sub={`+${stats.users?.newThisMonth ?? 0} this month`} />
                <StatCard icon={<BookOpen size={20} />} label="Total Stories"
                  value={stats.stories?.total ?? 0} sub={`+${stats.stories?.newThisMonth ?? 0} this month`} />
                <StatCard icon={<Eye size={20} />} label="Reads"
                  value={stats.reads?.total ?? 0} sub={`${stats.reads?.thisWeek ?? 0} this week`} />
                <StatCard icon={<MessageSquare size={20} />} label="Comments"
                  value={stats.engagement?.comments ?? 0} />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Top by reads */}
                <div className="card p-5">
                  <h3 className="font-display font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                    <TrendingUp size={18} className="text-accent" /> Most Read
                  </h3>
                  <div className="space-y-3">
                    {stats.topByReads?.slice(0, 8).map((s: any, i: number) => (
                      <div key={s.id} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-[var(--text-subtle)] w-5">{i + 1}</span>
                        <p className="flex-1 text-sm font-ui text-[var(--text)] truncate">{s.name}</p>
                        <span className="text-xs text-[var(--text-subtle)] shrink-0">
                          {s._count?.chapterReadLogs?.toLocaleString()} reads
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rating distribution */}
                <div className="card p-5">
                  <h3 className="font-display font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
                    <Star size={18} className="text-accent" /> Rating Distribution
                  </h3>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const entry = stats.ratingDistribution?.find((r: any) => r.rating === star)
                      const count = entry?._count?.rating ?? 0
                      const total = stats.engagement?.reviews ?? 1
                      const pct = Math.round((count / total) * 100)
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-sm font-ui text-[var(--text-muted)] w-8">{star}★</span>
                          <div className="flex-1 h-2 rounded-full bg-[var(--bg-alt)]">
                            <div className="h-full rounded-full bg-accent transition-all"
                              style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-[var(--text-subtle)] w-10 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </>
      )}

      {/* Users tab */}
      {tab === 'users' && (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-5 flex-wrap">
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }}
              placeholder="Search username / email…" className="input flex-1 min-w-48 max-w-72" />
            <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as Role | ''); setPage(1) }}
              className="input w-auto">
              <option value="">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>

          {usersLoading ? (
            <div className="flex justify-center py-12"><Spinner className="w-7 h-7" /></div>
          ) : (
            <>
              <p className="text-sm text-[var(--text-subtle)] mb-3 font-ui">
                {usersData?.total ?? 0} users
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left">
                      {['User', 'Email', 'Role', 'Joined Date', 'Stats', ''].map((h) => (
                        <th key={h} className="pb-3 pr-4 font-ui font-medium text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {usersData?.users?.map((u: any) => (
                      <tr key={u.id} className="group hover:bg-[var(--bg-alt)] transition-colors">
                        <td className="py-3 pr-4">
                          <div>
                            <p className="font-medium text-[var(--text)]">{u.name}</p>
                            <p className="text-xs text-[var(--text-subtle)]">@{u.username}</p>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-[var(--text-muted)]">{u.email}</td>
                        <td className="py-3 pr-4">
                          <select
                            value={u.role}
                            onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value as Role })}
                            className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${ROLE_COLORS[u.role as Role]}`}
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        </td>
                        <td className="py-3 pr-4 text-[var(--text-subtle)] whitespace-nowrap">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-2">
                            <Badge>{u._count?.stories ?? 0} stories</Badge>
                            <Badge>{u._count?.chapterReadLogs ?? 0} reads</Badge>
                          </div>
                        </td>
                        <td className="py-3">
                          {confirmDelete === u.id ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="danger"
                                loading={deleteUser.isPending}
                                onClick={() => deleteUser.mutate(u.id, { onSuccess: () => setConfirmDelete(null) })}>
                                Delete
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDelete(u.id)}
                              className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usersData && Math.ceil(usersData.total / 50) > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  {Array.from({ length: Math.ceil(usersData.total / 50) }, (_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)}
                      className={`w-9 h-9 rounded-lg text-sm font-ui transition-colors ${
                        page === i + 1 ? 'bg-accent text-white' : 'bg-[var(--bg-alt)] text-[var(--text-muted)]'
                      }`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === 'books' && <BookManagerPanel />}

      {tab === 'rv-keys' && <RVKeysPanel />}
    </div>
  )
}