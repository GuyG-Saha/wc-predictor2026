'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TOURNAMENT_ID } from '@/lib/constants'
import { formatStage } from '@/lib/utils'

type ScoringRule = {
  id: string
  stage: string
  exact_score_points: number
  correct_outcome_points: number
  saving?: boolean
  dirty?: boolean
}

export default function ScoringRulesTab() {
  const [rules, setRules] = useState<ScoringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRules()
  }, [])

  const loadRules = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('scoring_rules')
      .select('id, stage, exact_score_points, correct_outcome_points')
      .eq('tournament_id', TOURNAMENT_ID)

    if (error) {
      setError('Failed to load scoring rules.')
    } else {
      const order = ['group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'final']
      const sorted = (data || []).sort(
        (a, b) => order.indexOf(a.stage) - order.indexOf(b.stage)
      )
      setRules(sorted)
    }
    setLoading(false)
  }

  const updateRule = (id: string, patch: Partial<ScoringRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch, dirty: true } : r))
    )
  }

  const saveRule = async (rule: ScoringRule) => {
    setError(null)
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, saving: true } : r))
    )

    const { error } = await supabase
      .from('scoring_rules')
      .update({
        exact_score_points: rule.exact_score_points,
        correct_outcome_points: rule.correct_outcome_points,
      })
      .eq('id', rule.id)

    if (error) {
      setError(`Failed to save ${formatStage(rule.stage)}.`)
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, saving: false } : r))
      )
    } else {
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, saving: false, dirty: false } : r
        )
      )
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
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-500">
        Set how many points are awarded per stage. Changes apply immediately to score
        calculations — including already-finished matches in that stage.
      </p>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Stage</th>
              <th className="px-4 py-2 text-center font-medium">Exact Score</th>
              <th className="px-4 py-2 text-center font-medium">Correct Outcome</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {rules.map((rule) => (
              <tr
                key={rule.id}
                className={rule.dirty ? 'bg-amber-50' : 'bg-white'}
              >
                <td className="px-4 py-3 font-medium">
                  {formatStage(rule.stage)}
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min={0}
                    value={rule.exact_score_points}
                    onChange={(e) =>
                      updateRule(rule.id, {
                        exact_score_points: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-16 h-8 text-center border rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min={0}
                    value={rule.correct_outcome_points}
                    onChange={(e) =>
                      updateRule(rule.id, {
                        correct_outcome_points: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="w-16 h-8 text-center border rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => saveRule(rule)}
                    disabled={rule.saving || !rule.dirty}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400
                      text-white text-xs font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                  >
                    {rule.saving ? 'Saving…' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
