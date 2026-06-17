'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'
import FlagImage from '../components/FlagImage'
import { TOURNAMENT_ID } from '@/lib/constants'

type LeaderboardEntry = {
  user_id: string
  display_name: string
  total_score: number
  prediction_count: number
}

type Group = {
  id: string
  name: string
}

type BonusEntry = {
  user_id: string
  display_name: string
  predicted_winner_team_id: string | null
  predicted_top_scorer: string | null
  team_name: string | null
  team_code: string | null
}

const getMedal = (rank: number) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  // Bonus predictions state
  const [showBonus, setShowBonus] = useState(false)
  const [bonusEntries, setBonusEntries] = useState<BonusEntry[]>([])
  const [bonusLoading, setBonusLoading] = useState(false)

  useEffect(() => {
    const loadGroups = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setGroupsLoading(false); return }

      const { data, error } = await supabase
        .from('group_members')
        .select('group_id, groups(id, name)')
        .eq('user_id', user.id)

      if (!error && data) {
        const userGroups = data
          .map((row: any) => row.groups)
          .filter(Boolean) as Group[]
        setGroups(userGroups)
        if (userGroups.length > 0) {
          setSelectedGroupId(userGroups[0].id)
        }
      }
      setGroupsLoading(false)
    }
    loadGroups()
  }, [])

  useEffect(() => {
    if (!selectedGroupId) return
    loadLeaderboard()
    setShowBonus(false) // collapse bonus section when switching groups
  }, [selectedGroupId])

  const loadLeaderboard = async () => {
    if (!selectedGroupId) return
    setLoading(true)
    const { data, error } = await supabase.rpc('get_leaderboard', {
      p_tournament_id: TOURNAMENT_ID,
      p_group_id: selectedGroupId,
    })
    if (error) {
      console.error(error)
    } else {
      setEntries(data || [])
      setLastRefreshed(new Date())
    }
    setLoading(false)
  }

  const loadBonusPredictions = async () => {
    if (!selectedGroupId || bonusEntries.length > 0) return
    setBonusLoading(true)

    // Get group member user IDs
    const { data: memberData } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', selectedGroupId)

    const userIds = (memberData || []).map((m) => m.user_id)
    if (userIds.length === 0) { setBonusLoading(false); return }

    // Get their bonus predictions + display names + team info
    const { data, error } = await supabase
      .from('bonus_predictions')
      .select(`
        user_id,
        predicted_winner_team_id,
        predicted_top_scorer,
        users(display_name),
        teams(name, code)
      `)
      .in('user_id', userIds)

    if (!error && data) {
      const mapped: BonusEntry[] = (data as any[]).map((row) => ({
        user_id: row.user_id,
        display_name: row.users?.display_name ?? 'Unknown',
        predicted_winner_team_id: row.predicted_winner_team_id,
        predicted_top_scorer: row.predicted_top_scorer,
        team_name: row.teams?.name ?? null,
        team_code: row.teams?.code ?? null,
      }))
      setBonusEntries(mapped)
    }
    setBonusLoading(false)
  }

  const handleToggleBonus = () => {
    if (!showBonus) loadBonusPredictions()
    setShowBonus((prev) => !prev)
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold">Leaderboard</h1>
          <button
            onClick={loadLeaderboard}
            disabled={loading || !selectedGroupId}
            className="text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50 transition disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>

        {groupsLoading ? (
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse mb-5" />
        ) : groups.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            You are not in any group yet.
          </div>
        ) : (
          <>
            {groups.length > 1 && (
              <div className="flex gap-1 bg-gray-50 border rounded-xl p-1 mb-5">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                      selectedGroupId === group.id
                        ? 'bg-black text-white'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            )}

            {lastRefreshed && (
              <p className="text-xs text-gray-400 mb-4">
                Last updated: {lastRefreshed.toLocaleTimeString('he-IL', {
                  timeZone: 'Asia/Jerusalem',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                No participants in this group yet.
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                {entries.map((entry, index) => {
                  const rank = index + 1
                  const medal = getMedal(rank)
                  return (
                    <div
                      key={entry.user_id}
                      onClick={() => router.push(`/predictions/${entry.user_id}`)}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition cursor-pointer
                        ${rank <= 3
                          ? 'bg-white shadow-sm font-medium hover:shadow-md'
                          : 'bg-white hover:shadow-sm'
                        }`}
                    >
                      <div className="w-8 text-center">
                        {medal ? (
                          <span className="text-xl">{medal}</span>
                        ) : (
                          <span className="text-sm text-gray-400 font-mono">{rank}</span>
                        )}
                      </div>
                      <div className="flex-1 text-sm md:text-base">{entry.display_name}</div>
                      <div className="text-xs text-gray-400 hidden sm:block">
                        {entry.prediction_count} prediction{entry.prediction_count !== 1 ? 's' : ''}
                      </div>
                      <div className={`text-lg font-bold min-w-[3rem] text-right
                        ${rank === 1 ? 'text-yellow-500' : 'text-gray-800'}`}
                      >
                        {entry.total_score} <span className="text-xs font-normal text-gray-400">pts</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Bonus predictions expandable section */}
            <div className="border rounded-xl overflow-hidden">
              <button
                onClick={handleToggleBonus}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
              >
                <span className="font-semibold text-sm flex items-center gap-2">
                  🎯 Bonus Predictions
                </span>
                <span className="text-gray-400 text-sm">{showBonus ? '▲' : '▼'}</span>
              </button>

              {showBonus && (
                <div className="border-t divide-y">
                  {bonusLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                    </div>
                  ) : bonusEntries.length === 0 ? (
                    <p className="text-sm text-gray-400 px-4 py-4">
                      No one has submitted bonus predictions yet.
                    </p>
                  ) : (
                    bonusEntries.map((entry) => (
                      <div key={entry.user_id} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm font-medium">{entry.display_name}</span>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400">🏆</span>
                            {entry.team_code ? (
                              <>
                                <FlagImage code={entry.team_code} size={14} />
                                <span>{entry.team_name}</span>
                              </>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400">⚽</span>
                            <span>{entry.predicted_top_scorer || '—'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}
