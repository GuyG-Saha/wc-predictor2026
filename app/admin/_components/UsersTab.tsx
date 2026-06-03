'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type UserRow = {
  id: string
  display_name: string
  email: string | null
  role: string
  created_at: string | null
  saving: boolean
}

export default function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const [
        { data: { user } },
        { data: usersData, error: usersError },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('users')
          .select('id, display_name, email, role, created_at')
          .order('created_at', { ascending: true }),
      ])

      setCurrentUserId(user?.id ?? null)
      if (usersError) {
        setError('Failed to load users.')
      } else {
        setUsers((usersData ?? []).map((u) => ({ ...u, saving: false })))
      }
      setLoading(false)
    }
    load()
  }, [])

  const toggleRole = async (userId: string, currentRole: string) => {
    setError(null)
    const newRole = currentRole === 'admin' ? 'participant' : 'admin'
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, saving: true } : u))
    )

    const { error: updateError } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)

    if (updateError) {
      setError('Failed to update role.')
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, saving: false } : u))
      )
    } else {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: newRole, saving: false } : u
        )
      )
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Email</th>
              <th className="px-4 py-2 text-center font-medium">Role</th>
              <th className="px-4 py-2 text-center font-medium">Joined</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="bg-white">
                <td className="px-4 py-3 font-medium">{user.display_name}</td>
                <td className="px-4 py-3 text-gray-500">{user.email ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-gray-400">
                  {user.created_at
                    ? new Date(user.created_at + 'Z').toLocaleDateString('he-IL')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  {user.id === currentUserId ? (
                    <span className="text-xs text-gray-400 italic">You</span>
                  ) : (
                    <button
                      onClick={() => toggleRole(user.id, user.role)}
                      disabled={user.saving}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border transition
                        hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                    >
                      {user.saving
                        ? '…'
                        : user.role === 'admin'
                        ? 'Make participant'
                        : 'Make admin'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
