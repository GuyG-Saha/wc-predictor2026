'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TOURNAMENT_ID } from '@/lib/constants'

type Group = {
  id: string
  name: string
  invite_code: string
  created_at: string | null
  member_count?: number
}

type User = {
  id: string
  display_name: string
  email: string | null
}

export default function GroupsTab() {
  const [groups, setGroups] = useState<Group[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New group form
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupCode, setNewGroupCode] = useState('')
  const [creating, setCreating] = useState(false)

  // Add member form
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [
      { data: groupsData, error: groupsError },
      { data: usersData },
    ] = await Promise.all([
      supabase
        .from('groups')
        .select('id, name, invite_code, created_at')
        .eq('tournament_id', TOURNAMENT_ID)
        .order('created_at', { ascending: true }),
      supabase
        .from('users')
        .select('id, display_name, email')
        .order('display_name'),
    ])

    if (groupsError) {
      setError('Failed to load groups.')
      setLoading(false)
      return
    }

    // Fetch member counts
    const groupsWithCounts = await Promise.all(
      (groupsData || []).map(async (g) => {
        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id)
        return { ...g, member_count: count ?? 0 }
      })
    )

    setGroups(groupsWithCounts)
    setUsers(usersData || [])
    setLoading(false)
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupCode.trim()) return
    setCreating(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase
      .from('groups')
      .insert({
        name: newGroupName.trim(),
        invite_code: newGroupCode.trim().toUpperCase(),
        tournament_id: TOURNAMENT_ID,
        created_by: user?.id,
      })

    if (insertError) {
      setError(
        insertError.message.includes('unique')
          ? 'Invite code already exists — choose a different one.'
          : 'Failed to create group.'
      )
    } else {
      setNewGroupName('')
      setNewGroupCode('')
      await loadData()
    }
    setCreating(false)
  }

  const handleAddMember = async () => {
    if (!selectedGroupId || !selectedUserId) return
    setAdding(true)
    setError(null)

    const { error: insertError } = await supabase
      .from('group_members')
      .insert({ group_id: selectedGroupId, user_id: selectedUserId })

    if (insertError) {
      setError(
        insertError.message.includes('duplicate')
          ? 'User is already in this group.'
          : 'Failed to add member.'
      )
    } else {
      setSelectedUserId('')
      await loadData()
    }
    setAdding(false)
  }

  const handleRemoveMember = async (groupId: string, userId: string) => {
    setError(null)
    const { error: deleteError } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (deleteError) {
      setError('Failed to remove member.')
    } else {
      await loadData()
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
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Create group */}
      <div className="border rounded-xl p-5">
        <h2 className="font-semibold text-base mb-4">Create New Group</h2>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Group name (e.g. Work)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 flex-1 min-w-[150px]"
          />
          <input
            type="text"
            placeholder="Invite code (e.g. WORK2026)"
            value={newGroupCode}
            onChange={(e) => setNewGroupCode(e.target.value.toUpperCase())}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 flex-1 min-w-[150px] font-mono uppercase"
          />
          <button
            onClick={handleCreateGroup}
            disabled={creating || !newGroupName.trim() || !newGroupCode.trim()}
            className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg
              hover:bg-gray-800 transition disabled:opacity-50 whitespace-nowrap"
          >
            {creating ? 'Creating…' : '+ Create Group'}
          </button>
        </div>
      </div>

      {/* Add member */}
      <div className="border rounded-xl p-5">
        <h2 className="font-semibold text-base mb-4">Add Member to Group</h2>
        <div className="flex gap-3 flex-wrap">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 flex-1 min-w-[150px]"
          >
            <option value="">Select group…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 flex-1 min-w-[150px]"
          >
            <option value="">Select user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name} {u.email ? `(${u.email})` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddMember}
            disabled={adding || !selectedGroupId || !selectedUserId}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg
              hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap"
          >
            {adding ? 'Adding…' : 'Add Member'}
          </button>
        </div>
      </div>

      {/* Groups list */}
      <div className="space-y-4">
        <h2 className="font-semibold text-base">All Groups</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-400">No groups yet.</p>
        ) : (
          groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              users={users}
              onRemoveMember={handleRemoveMember}
            />
          ))
        )}
      </div>
    </div>
  )
}

function GroupCard({
  group,
  users,
  onRemoveMember,
}: {
  group: Group
  users: User[]
  onRemoveMember: (groupId: string, userId: string) => void
}) {
  const [members, setMembers] = useState<{ user_id: string }[]>([])
  const [expanded, setExpanded] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)

  const loadMembers = async () => {
    setMembersLoading(true)
    const { data } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', group.id)
    setMembers(data || [])
    setMembersLoading(false)
  }

  const handleExpand = () => {
    if (!expanded) loadMembers()
    setExpanded((prev) => !prev)
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={handleExpand}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold">{group.name}</span>
          <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {group.invite_code}
          </span>
          <span className="text-xs text-gray-400">
            {group.member_count} member{group.member_count !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="border-t divide-y">
          {membersLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-3">No members yet.</p>
          ) : (
            members.map((m) => {
              const user = users.find((u) => u.id === m.user_id)
              return (
                <div key={m.user_id} className="flex items-center justify-between px-4 py-2">
                  <div className="text-sm">
                    <span className="font-medium">{user?.display_name ?? '—'}</span>
                    {user?.email && (
                      <span className="text-gray-400 ml-2 text-xs">{user.email}</span>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveMember(group.id, m.user_id)}
                    className="text-xs text-red-500 hover:text-red-700 transition"
                  >
                    Remove
                  </button>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
