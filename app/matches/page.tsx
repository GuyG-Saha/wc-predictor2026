'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TOURNAMENT_ID } from '@/lib/constants'
import Navbar from '../components/Navbar'
import PredictionModal from '../components/PredictionModal'
import { Match, UserPrediction } from '@/lib/types'
import { formatStage, formatKickoff } from '@/lib/utils'
import { getFlag } from '@/lib/flags'

type Tab = 'upcoming' | 'finished' | 'all'

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
        active
          ? 'bg-black text-white'
          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
      }`}
    >
      {label}
      <span
        className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

// Derives current stage and matchday from all matches
function getTournamentContext(matches: Match[]): string | null {
  if (matches.length === 0) return null

  const now = new Date()

  // Find matches that have started (past kickoff) — these define current stage
  const startedMatches = matches.filter(
    (m) => new Date(m.start_time + 'Z') <= now
  )

  if (startedMatches.length === 0) {
    // Tournament hasn't started yet
    const first = matches[0]
    const kickoff = new Date(first.start_time + 'Z').toLocaleDateString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: '2-digit',
      month: '2-digit',
    })
    return `⏳ Tournament starts ${kickoff}`
  }

  // Get the most recent started match to determine current stage
  const latest = startedMatches[startedMatches.length - 1]
  const stage = formatStage(latest.stage)

  // For group stage, calculate matchday
  if (latest.stage === 'group') {
    // Group matchdays: each unique date batch of group matches
    const groupMatches = matches.filter((m) => m.stage === 'group')
    const uniqueDates = [
      ...new Set(
        groupMatches.map((m) =>
          new Date(m.start_time + 'Z').toISOString().split('T')[0]
        )
      ),
    ].sort()

    const startedDates = uniqueDates.filter(
      (d) => new Date(d + 'T00:00:00Z') <= now
    )

    // Matchday is determined by which third of group matches we're in
    const matchday =
      startedDates.length <= uniqueDates.length / 3
        ? 1
        : startedDates.length <= (uniqueDates.length * 2) / 3
        ? 2
        : 3

    return `📍 ${stage} • Matchday ${matchday}`
  }

  return `📍 ${stage}`
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, UserPrediction>>({})
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('upcoming')

  useEffect(() => {
    const loadData = async () => {
      const { data: matchesData, error } = await supabase
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
        setLoading(false)
        return
      }

      setMatches((matchesData as unknown as Match[]) || [])

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: predictionsData } = await supabase
          .from('predictions')
          .select('match_id, predicted_home_score, predicted_away_score')
          .eq('user_id', user.id)

        const predMap: Record<string, UserPrediction> = {}
        predictionsData?.forEach((p) => {
          predMap[p.match_id] = {
            home: p.predicted_home_score,
            away: p.predicted_away_score,
          }
        })
        setPredictions(predMap)
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const handlePredictionSaved = (matchId: string, home: number, away: number) => {
    setPredictions((prev) => ({ ...prev, [matchId]: { home, away } }))
  }

  const upcomingMatches = matches.filter((m) => !m.is_finished)
  const finishedMatches = matches.filter((m) => m.is_finished)
  const visibleMatches =
    activeTab === 'upcoming'
      ? upcomingMatches
      : activeTab === 'finished'
      ? finishedMatches
      : matches

  const tournamentContext = getTournamentContext(matches)

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold">
            World Cup 2026
          </h1>
          {/* Tournament context banner */}
          {!loading && tournamentContext && (
            <span className="text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full whitespace-nowrap">
              {tournamentContext}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-50 border rounded-xl p-1 mb-5">
          <TabButton
            label="Upcoming"
            count={upcomingMatches.length}
            active={activeTab === 'upcoming'}
            onClick={() => setActiveTab('upcoming')}
          />
          <TabButton
            label="Finished"
            count={finishedMatches.length}
            active={activeTab === 'finished'}
            onClick={() => setActiveTab('finished')}
          />
          <TabButton
            label="All"
            count={matches.length}
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
          </div>
        ) : visibleMatches.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            {activeTab === 'finished'
              ? 'No matches have been played yet.'
              : 'No upcoming matches.'}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMatches.map((match) => (
              <div
                key={match.id}
                className="border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white"
              >
                {/* Teams row */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex-1 text-right font-semibold text-base md:text-lg">
                    {getFlag(match.home_team.code)} {match.home_team.name}
                  </div>
                  <div className="px-3 text-gray-400 font-bold text-sm">
                    VS
                  </div>
                  <div className="flex-1 font-semibold text-base md:text-lg">
                    {getFlag(match.away_team.code)} {match.away_team.name}
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
