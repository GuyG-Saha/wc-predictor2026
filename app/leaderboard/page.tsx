'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'
import { TOURNAMENT_ID } from '@/lib/constants'

type LeaderboardEntry = {
  user_id: string
  display_name: string
  total_score: number
  prediction_count: number
}

const getMedal = (rank: number) => {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const loadLeaderboard = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_leaderboard', {
        p_tournament_id: TOURNAMENT_ID
    })
    if (error) {
      console.error(error)
    } else {
      setEntries(data || [])
      setLastRefreshed(new Date())
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLeaderboard()
  }, [])

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold">Leaderboard</h1>
          <button
            onClick={loadLeaderboard}
            disabled={loading}
            className="text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50 transition disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>

        {/* Last refreshed */}
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
            No participants yet.
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const rank = index + 1
              const medal = getMedal(rank)

              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition
                    ${rank <= 3
                      ? 'bg-white shadow-sm font-medium'
                      : 'bg-white hover:shadow-sm'
                    }`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {medal ? (
                      <span className="text-xl">{medal}</span>
                    ) : (
                      <span className="text-sm text-gray-400 font-mono">
                        {rank}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 text-sm md:text-base">
                    {entry.display_name}
                  </div>

                  {/* Prediction count */}
                  <div className="text-xs text-gray-400 hidden sm:block">
                    {entry.prediction_count} prediction{entry.prediction_count !== 1 ? 's' : ''}
                  </div>

                  {/* Score */}
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
      </main>
    </>
  )
}
