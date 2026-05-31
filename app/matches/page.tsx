'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Team = {
  id: string
  name: string
}

type Match = {
  id: string
  home_team_id: string
  away_team_id: string
  start_time: string
  stage: string
  group_name: string | null
  is_finished: boolean
  home_score: number | null
  away_score: number | null
}

const WORLD_CUP_ID =
  'aaaaaaaa-0000-0000-0000-000000000001'

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadData = async () => {
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name')

      const teamMap: Record<string, string> = {}

      teamsData?.forEach((team: Team) => {
        teamMap[team.id] = team.name
      })

      setTeams(teamMap)

      const { data: matchesData, error } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', WORLD_CUP_ID)
        .order('start_time', { ascending: true })

      if (error) {
        console.error(error)
        return
      }

      setMatches(matchesData || [])
    }

    loadData()
  }, [])

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        World Cup 2026 Matches
      </h1>

      <div className="space-y-4">
        {matches.map((match) => (
          <div
            key={match.id}
            className="border rounded p-4 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold text-lg">
                {teams[match.home_team_id]} vs{' '}
                {teams[match.away_team_id]}
              </div>

              <div className="text-sm text-gray-500">
                {new Date(match.start_time).toLocaleString()}
              </div>

              <div className="text-sm text-gray-500">
                {match.stage}
                {match.group_name
                  ? ` - ${match.group_name}`
                  : ''}
              </div>
            </div>

            <div className="text-xl font-bold">
              {match.is_finished
                ? `${match.home_score} - ${match.away_score}`
                : 'VS'}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}