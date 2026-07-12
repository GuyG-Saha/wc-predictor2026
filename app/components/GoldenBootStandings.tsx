'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TOURNAMENT_ID } from '@/lib/constants'
import FlagImage from '@/app/components/FlagImage'

type GoldenBootEntry = {
  id: string
  player_name: string
  team_code: string
  goals: number
  assists: number
  display_order: number
}

export default function GoldenBootStandings() {
  const [entries, setEntries] = useState<GoldenBootEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('golden_boot_standings')
        .select('id, player_name, team_code, goals, assists, display_order')
        .eq('tournament_id', TOURNAMENT_ID)
        .order('display_order', { ascending: true })

      setEntries(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (entries.length === 0) return null

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="border rounded-xl p-5">
      <h2 className="font-bold text-lg mb-4">⚽ Golden Boot Race</h2>
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              index === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
            }`}
          >
            {/* Rank */}
            <div className="w-6 text-center text-base">
              {medals[index] ?? <span className="text-xs text-gray-400">{index + 1}</span>}
            </div>

            {/* Flag */}
            <FlagImage code={entry.team_code} size={18} />

            {/* Name */}
            <div className="flex-1 text-sm font-medium">{entry.player_name}</div>

            {/* Goals */}
            <div className="text-right">
              <span className="text-lg font-bold">{entry.goals}</span>
              <span className="text-xs text-gray-400 ml-1">g</span>
              {entry.assists > 0 && (
                <span className="text-xs text-gray-400 ml-2">{entry.assists}a</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Tiebreaker: assists then minutes played
      </p>
    </div>
  )
}
