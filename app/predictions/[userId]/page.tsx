'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TOURNAMENT_ID } from '@/lib/constants'
import Navbar from '@/app/components/Navbar'
import FlagImage from '@/app/components/FlagImage'
import { formatKickoff, formatStage } from '@/lib/utils'

type PredictionRow = {
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
  matches: {
    id: string
    start_time: string
    stage: string
    group_name: string | null
    home_score: number | null
    away_score: number | null
    is_finished: boolean
    home_team: { name: string; code: string }
    away_team: { name: string; code: string }
  }
}

type ProfileUser = {
  display_name: string
}

type ResultStatus = 'exact' | 'correct' | 'wrong' | 'pending'

const getResultStatus = (pred: PredictionRow): ResultStatus => {
  const m = pred.matches
  if (!m.is_finished || m.home_score === null || m.away_score === null) return 'pending'
  if (pred.predicted_home_score === m.home_score && pred.predicted_away_score === m.away_score) return 'exact'
  if (Math.sign(pred.predicted_home_score - pred.predicted_away_score) === Math.sign(m.home_score - m.away_score)) return 'correct'
  return 'wrong'
}

const statusStyle = (status: ResultStatus) => {
  switch (status) {
    case 'exact': return 'bg-yellow-50 border-yellow-300'
    case 'correct': return 'bg-green-50 border-green-300'
    case 'wrong': return 'bg-red-50 border-red-200'
    default: return 'bg-white'
  }
}

const statusBadge = (status: ResultStatus) => {
  switch (status) {
    case 'exact': return <span className="text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">⭐ Exact</span>
    case 'correct': return <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">✓ Correct</span>
    case 'wrong': return <span className="text-xs font-medium text-red-500 bg-red-100 px-2 py-0.5 rounded-full">✗ Wrong</span>
    default: return null
  }
}

export default function UserPredictionsPage() {
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [predictions, setPredictions] = useState<PredictionRow[]>([])
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // Verify current user is in same group as target user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // Load target user's display name
      const { data: userData } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', userId)
        .single()

      setProfileUser(userData)

      // Load their predictions for locked/finished matches only
      const { data, error } = await supabase
        .from('predictions')
        .select(`
        match_id,
        predicted_home_score,
        predicted_away_score,
        matches!inner(
        id,
        start_time,
        stage,
        group_name,
        home_score,
        away_score,
        is_finished,
        home_team:teams!home_team_id(name, code),
        away_team:teams!away_team_id(name, code)
        )
    `)
  .eq('user_id', userId)
  .lt('matches.start_time', new Date().toISOString())
  .order('matches.start_time', { ascending: true })

      if (!error) setPredictions((data as unknown as PredictionRow[]) || [])
      setLoading(false)
    }
    load()
  }, [userId])

  const exactCount = predictions.filter(p => getResultStatus(p) === 'exact').length
  const correctCount = predictions.filter(p => getResultStatus(p) === 'correct').length
  const wrongCount = predictions.filter(p => getResultStatus(p) === 'wrong').length

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
        >
          ← Back
        </button>

        <h1 className="text-2xl font-bold mb-1">
          {profileUser?.display_name ?? '…'}'s Predictions
        </h1>

        {/* Summary badges */}
        {!loading && predictions.length > 0 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            <span className="text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
              ⭐ {exactCount} exact
            </span>
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
              ✓ {correctCount} correct
            </span>
            <span className="text-xs font-medium text-red-500 bg-red-100 px-2 py-1 rounded-full">
              ✗ {wrongCount} wrong
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No locked predictions yet.
          </div>
        ) : (
          <div className="space-y-3">
            {predictions.map((pred) => {
              const m = pred.matches
              const status = getResultStatus(pred)
              return (
                <div
                  key={pred.match_id}
                  className={`border rounded-xl p-4 ${statusStyle(status)}`}
                >
                  {/* Stage + group */}
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400">
                      {formatStage(m.stage)}
                      {m.group_name ? ` • Group ${m.group_name}` : ''}
                      {' • '}
                      {formatKickoff(m.start_time)}
                    </span>
                    {statusBadge(status)}
                  </div>

                  {/* Teams + scores */}
                  <div className="flex items-center justify-between gap-2">
                    {/* Home team */}
                    <div className="flex-1 flex items-center justify-end gap-2">
                      <span className="text-sm font-semibold text-right">
                        {m.home_team.name}
                      </span>
                      <FlagImage code={m.home_team.code} size={16} />
                    </div>

                    {/* Scores */}
                    <div className="flex flex-col items-center gap-1 px-2">
                      {/* Their prediction */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">Pred</span>
                        <span className="font-bold text-sm">
                          {pred.predicted_home_score} – {pred.predicted_away_score}
                        </span>
                      </div>
                      {/* Actual result */}
                      {m.is_finished && m.home_score !== null && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">Result</span>
                          <span className="font-bold text-sm">
                            {m.home_score} – {m.away_score}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Away team */}
                    <div className="flex-1 flex items-center gap-2">
                      <FlagImage code={m.away_team.code} size={16} />
                      <span className="text-sm font-semibold">
                        {m.away_team.name}
                      </span>
                    </div>
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