'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TOURNAMENT_ID } from '@/lib/constants'
import { Match } from '@/lib/types'
import { formatStage, formatKickoff, formatMatchDay } from '@/lib/utils'

type MatchRow = Match & {
  editHome: number | ''
  editAway: number | ''
  editFinished: boolean
  saving: boolean
  dirty: boolean
}

function groupByDate(rows: MatchRow[]): [string, MatchRow[]][] {
  const map = new Map<string, MatchRow[]>()
  for (const row of rows) {
    const label = formatMatchDay(row.start_time)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(row)
  }
  return Array.from(map.entries())
}

export default function MatchResultsTab() {
  const [rows, setRows] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, start_time, stage, group_name, is_finished,
          home_score, away_score,
          home_team:teams!home_team_id(id, name, code),
          away_team:teams!away_team_id(id, name, code)
        `)
        .eq('tournament_id', TOURNAMENT_ID)
        .order('start_time', { ascending: true })

      if (!error && data) {
        setRows(
          (data as unknown as Match[]).map((m) => ({
            ...m,
            editHome: m.home_score ?? '',
            editAway: m.away_score ?? '',
            editFinished: m.is_finished,
            saving: false,
            dirty: false,
          }))
        )
      }
      setLoading(false)
    }
    load()
  }, [])

  const updateRow = (id: string, patch: Partial<MatchRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch, dirty: true } : r))
    )
  }

  const saveRow = async (row: MatchRow) => {
    setSaveError(null)
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, saving: true } : r)))

    const homeScore = row.editHome === '' ? null : Number(row.editHome)
    const awayScore = row.editAway === '' ? null : Number(row.editAway)

  let winnerTeamId: string | null = null
  if (homeScore !== null && awayScore !== null && row.stage !== 'group') {
    if (homeScore > awayScore) winnerTeamId = row.home_team.id
    else if (awayScore > homeScore) winnerTeamId = row.away_team.id
  // draw stays null
  }

    const { error } = await supabase
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        is_finished: row.editFinished,
        winner_team_id: winnerTeamId,
      })
      .eq('id', row.id)

    if (error) {
      setSaveError(`Failed to save ${row.home_team.name} vs ${row.away_team.name}.`)
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, saving: false } : r)))
    } else {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                home_score: homeScore,
                away_score: awayScore,
                is_finished: row.editFinished,
                saving: false,
                dirty: false,
              }
            : r
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

  const grouped = groupByDate(rows)

  return (
    <div className="space-y-8">
      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {saveError}
        </div>
      )}

      {grouped.map(([date, dayMatches]) => (
        <div key={date}>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {date}
          </h2>
          <div className="border rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Match</th>
                  <th className="px-4 py-2 text-center font-medium">Score</th>
                  <th className="px-4 py-2 text-center font-medium">Finished</th>
                  <th className="px-4 py-2 text-center font-medium">Kickoff</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {dayMatches.map((row) => (
                  <tr
                    key={row.id}
                    className={`${row.is_finished ? 'bg-green-50' : 'bg-white'} ${row.dirty ? 'ring-1 ring-inset ring-amber-300' : ''}`}
                  >
                    {/* Match */}
                    <td className="px-4 py-3">
                      <span className="font-medium">{row.home_team.name}</span>
                      <span className="text-gray-400 mx-2">vs</span>
                      <span className="font-medium">{row.away_team.name}</span>
                      <span className="ml-2 text-xs text-gray-400">
                        {formatStage(row.stage)}
                        {row.group_name ? ` • Grp ${row.group_name}` : ''}
                      </span>
                    </td>

                    {/* Score inputs */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={row.editHome}
                          onChange={(e) =>
                            updateRow(row.id, {
                              editHome:
                                e.target.value === ''
                                  ? ''
                                  : Math.max(0, parseInt(e.target.value)),
                            })
                          }
                          className="w-12 h-8 text-center border rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-gray-400 font-bold">–</span>
                        <input
                          type="number"
                          min={0}
                          value={row.editAway}
                          onChange={(e) =>
                            updateRow(row.id, {
                              editAway:
                                e.target.value === ''
                                  ? ''
                                  : Math.max(0, parseInt(e.target.value)),
                            })
                          }
                          className="w-12 h-8 text-center border rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </td>

                    {/* Finished checkbox */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.editFinished}
                        onChange={(e) =>
                          updateRow(row.id, { editFinished: e.target.checked })
                        }
                        className="w-4 h-4 accent-green-600 cursor-pointer"
                      />
                    </td>

                    {/* Kickoff */}
                    <td className="px-4 py-3 text-center text-xs text-gray-400 whitespace-nowrap">
                      {formatKickoff(row.start_time)}
                    </td>

                    {/* Save */}
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => saveRow(row)}
                        disabled={row.saving || !row.dirty}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400
                          text-white text-xs font-medium px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                      >
                        {row.saving ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
