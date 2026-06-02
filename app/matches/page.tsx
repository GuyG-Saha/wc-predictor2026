'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TOURNAMENT_ID } from '@/lib/constants'
import Navbar from '../components/Navbar'
import PredictionModal from '../components/PredictionModal'
import { Match, UserPrediction } from '@/lib/types'
import { formatStage, formatKickoff } from '@/lib/utils'

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [predictions, setPredictions] = useState<Record<string, UserPrediction>>({})

  useEffect(() => {
    const loadData = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          start_time,
          stage,
          group_name,
          is_finished,
          home_score,
          away_score,
          home_team:teams!home_team_id(id, name, code),
          away_team:teams!away_team_id(id, name, code)
        `)
        .eq('tournament_id', TOURNAMENT_ID)
        .order('start_time', { ascending: true })

      if (error) {
        console.error(error)
      } else {
        setMatches((data as unknown as Match[]) || [])
      }
      setLoading(false)
    }

    loadData()
  }, [])

  const handlePredictionSaved = (matchId: string, home: number, away: number) => {
    setPredictions((prev) => ({ ...prev, [matchId]: { home, away } }))
  }

  return (
    <>
      <Navbar />
      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onSaved={handlePredictionSaved}
        />
      )}
      <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6">
          World Cup 2026 Matches
        </h1>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.id}
                className="border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white"
              >
                {/* Teams row */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex-1 text-right font-semibold text-base md:text-lg">
                    {match.home_team.name}
                  </div>
                  <div className="px-3 text-gray-400 font-bold text-sm">
                    VS
                  </div>
                  <div className="flex-1 font-semibold text-base md:text-lg">
                    {match.away_team.name}
                  </div>
                </div>

                {/* Stage + group */}
                <div className="text-center text-xs text-gray-500 mb-3">
                  {formatStage(match.stage)}
                  {match.group_name ? ` • Group ${match.group_name}` : ''}
                </div>

                {/* Kickoff + score/predict */}
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-400">
                    {formatKickoff(match.start_time)}
                  </div>
                  {match.is_finished ? (
                    <div className="text-lg font-bold">
                      {match.home_score} – {match.away_score}
                    </div>
                  ) : predictions[match.id] ? (
                    <button
                      onClick={() => setSelectedMatch(match)}
                      className="border border-blue-400 text-blue-600 px-3 py-1 rounded hover:bg-blue-50 text-sm font-medium transition"
                    >
                      {predictions[match.id].home} – {predictions[match.id].away} ✓
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedMatch(match)}
                      className="border px-3 py-1 rounded hover:bg-gray-100 text-sm transition"
                    >
                      Predict
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
