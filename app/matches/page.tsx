'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { TOURNAMENT_ID } from '@/lib/constants'
import Navbar from '../components/Navbar'
import PredictionModal from '../components/PredictionModal'
import { Match, UserPrediction } from '@/lib/types'
import { formatStage, formatKickoff } from '@/lib/utils'
import FlagImage from '@/app/components/FlagImage'

type LiveMatchData = {
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  state: 'pre' | 'in' | 'post'
  clock: string | null
}

const LIVE_POLL_INTERVAL_MS = 60_000

// Canonical stage order for sorting tabs
const STAGE_ORDER: Record<string, number> = {
  group: 0,
  round_of_32: 1,
  round_of_16: 2,
  quarter_final: 3,
  semi_final: 4,
  final: 5,
}

function getTournamentContext(matches: Match[]): string | null {
  if (matches.length === 0) return null
  const now = new Date()
  const startedMatches = matches.filter((m) => new Date(m.start_time + 'Z') <= now)

  if (startedMatches.length === 0) {
    const first = matches[0]
    const kickoff = new Date(first.start_time + 'Z').toLocaleDateString('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: '2-digit',
      month: '2-digit',
    })
    return `⏳ Tournament starts ${kickoff}`
  }

  const latest = startedMatches[startedMatches.length - 1]
  const stage = formatStage(latest.stage)

  if (latest.stage === 'group') {
    const groupMatches = matches.filter((m) => m.stage === 'group')
    const uniqueDates = [
      ...new Set(
        groupMatches.map((m) => new Date(m.start_time + 'Z').toISOString().split('T')[0])
      ),
    ].sort()
    const startedDates = uniqueDates.filter((d) => new Date(d + 'T00:00:00Z') <= now)
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

function isWithinLiveWindow(startTime: string): boolean {
  const kickoff = new Date(startTime + 'Z').getTime()
  const now = Date.now()
  return now >= kickoff && now <= kickoff + 2.5 * 60 * 60 * 1000
}

// Derive active stage — the stage with the most recent started match
function getActiveStage(matches: Match[]): string {
  const now = new Date()
  const started = matches.filter((m) => new Date(m.start_time + 'Z') <= now)
  if (started.length === 0) return matches[0]?.stage ?? 'group'
  return started[started.length - 1].stage
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, UserPrediction>>({})
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [activeStage, setActiveStage] = useState<string>('group')
  const [liveData, setLiveData] = useState<Record<string, LiveMatchData>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

      const loaded = (matchesData as unknown as Match[]) || []
      setMatches(loaded)
      setActiveStage(getActiveStage(loaded))

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

  useEffect(() => {
    const hasLiveCandidate = matches.some(
      (m) => !m.is_finished && isWithinLiveWindow(m.start_time)
    )

    const fetchLive = async () => {
      try {
        const res = await fetch('/api/live-scores')
        const data = await res.json()
        const map: Record<string, LiveMatchData> = {}
        ;(data.matches || []).forEach((lm: LiveMatchData) => {
          const key = `${lm.homeTeam}__${lm.awayTeam}`
          map[key] = lm
        })
        setLiveData(map)
      } catch (err) {
        // Silent fail
      }
    }

    if (hasLiveCandidate) {
      fetchLive()
      pollRef.current = setInterval(fetchLive, LIVE_POLL_INTERVAL_MS)
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [matches])

  const handlePredictionSaved = (matchId: string, home: number, away: number) => {
    setPredictions((prev) => ({ ...prev, [matchId]: { home, away } }))
  }

  const getLiveInfo = (match: Match): LiveMatchData | null => {
    const key = `${match.home_team.name}__${match.away_team.name}`
    return liveData[key] ?? null
  }

  // Derive unique stages present in DB, sorted by tournament order
  const stages = [...new Set(matches.map((m) => m.stage))].sort(
    (a, b) => (STAGE_ORDER[a] ?? 99) - (STAGE_ORDER[b] ?? 99)
  )

  const visibleMatches = matches.filter((m) => m.stage === activeStage)
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
          <h1 className="text-3xl md:text-4xl font-bold">World Cup 2026</h1>
          {!loading && tournamentContext && (
            <span className="text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full whitespace-nowrap">
              {tournamentContext}
            </span>
          )}
        </div>

        {/* Stage tabs */}
        {!loading && stages.length > 0 && (
          <div className="flex gap-1 bg-gray-50 border rounded-xl p-1 mb-5 overflow-x-auto">
            {stages.map((stage) => {
              const count = matches.filter((m) => m.stage === stage).length
              const active = activeStage === stage
              return (
                <button
                  key={stage}
                  onClick={() => setActiveStage(stage)}
                  className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                    active
                      ? 'bg-black text-white'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {formatStage(stage)}
                  <span
                    className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
          </div>
        ) : visibleMatches.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No matches in this stage yet.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMatches.map((match) => {
              const live = !match.is_finished ? getLiveInfo(match) : null
              const isLive = live?.state === 'in'

              return (
                <div
                  key={match.id}
                  className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white
                    ${isLive ? 'ring-2 ring-red-200' : ''}`}
                >
                  {/* Teams row */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex-1 text-right font-semibold text-base md:text-lg">
                      <FlagImage code={match.home_team.code} /> {match.home_team.name}
                    </div>
                    <div className="px-3 text-gray-400 font-bold text-sm">VS</div>
                    <div className="flex-1 font-semibold text-base md:text-lg">
                      <FlagImage code={match.away_team.code} /> {match.away_team.name}
                    </div>
                  </div>

                  {/* Group + live badge */}
                  <div className="flex items-center justify-center gap-2 text-center text-xs text-gray-500 mb-3">
                    {match.group_name && <span>Group {match.group_name}</span>}
                    {isLive && (
                      <span className="flex items-center gap-1 text-red-500 font-semibold">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        LIVE {live?.clock}
                      </span>
                    )}
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
                    ) : isLive ? (
                      <div className="text-lg font-bold text-red-600">
                        {live!.homeScore} – {live!.awayScore}
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
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
