'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Match } from '@/lib/types'
import { formatStage, formatKickoff } from '@/lib/utils'
import { getFlag } from '@/lib/flags'

type Props = {
  match: Match
  onClose: () => void
  onSaved: (matchId: string, homeScore: number, awayScore: number) => void
}

function ScoreStepper({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled}
        className="w-10 h-10 rounded-full border-2 text-xl font-bold
          hover:bg-gray-100 transition active:scale-95
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        −
      </button>
      <span className="text-3xl font-bold w-8 text-center">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        className="w-10 h-10 rounded-full border-2 text-xl font-bold
          hover:bg-gray-100 transition active:scale-95
          disabled:opacity-30 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  )
}

export default function PredictionModal({ match, onClose, onSaved }: Props) {
  const [homeScore, setHomeScore] = useState<number>(0)
  const [awayScore, setAwayScore] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const isLocked = new Date(match.start_time + 'Z') <= new Date()

  useEffect(() => {
    const fetchExisting = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('predictions')
        .select('predicted_home_score, predicted_away_score')
        .eq('user_id', user.id)
        .eq('match_id', match.id)
        .maybeSingle()

      if (data) {
        setHomeScore(data.predicted_home_score)
        setAwayScore(data.predicted_away_score)
      }
      setLoading(false)
    }
    fetchExisting()
  }, [match.id])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose()
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('You must be logged in to predict.')
      setSaving(false)
      return
    }

    const { error: upsertError } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          match_id: match.id,
          predicted_home_score: homeScore,
          predicted_away_score: awayScore,
        },
        { onConflict: 'user_id,match_id' }
      )

    if (upsertError) {
      setError('Failed to save prediction. Please try again.')
    } else {
      onSaved(match.id, homeScore, awayScore)
      onClose()
    }
    setSaving(false)
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {formatStage(match.stage)}
              {match.group_name ? ` • Group ${match.group_name}` : ''}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{formatKickoff(match.start_time)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Teams + steppers */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 my-6">
              {/* Home team */}
              <div className="flex flex-col items-center gap-3 flex-1">
                <span className="text-2xl">{getFlag(match.home_team.code)}</span>
                <span className="text-sm font-semibold text-center leading-tight">
                  {match.home_team.name}
                </span>
                <ScoreStepper
                  value={homeScore}
                  onChange={setHomeScore}
                  disabled={isLocked}
                />
              </div>

              <span className="text-2xl font-bold text-gray-300 pb-2">—</span>

              {/* Away team */}
              <div className="flex flex-col items-center gap-3 flex-1">
                <span className="text-2xl">{getFlag(match.away_team.code)}</span>
                <span className="text-sm font-semibold text-center leading-tight">
                  {match.away_team.name}
                </span>
                <ScoreStepper
                  value={awayScore}
                  onChange={setAwayScore}
                  disabled={isLocked}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs text-center mb-3">{error}</p>
            )}

            {isLocked ? (
              <div className="text-center text-sm text-gray-500 bg-gray-100 rounded-lg py-2 px-4">
                This match has started — predictions are locked.
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                  text-white font-semibold py-3 rounded-xl transition text-sm"
              >
                {saving ? 'Saving…' : 'Save Prediction'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
