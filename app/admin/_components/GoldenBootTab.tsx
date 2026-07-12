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
  saving?: boolean
  dirty?: boolean
}

export default function GoldenBootTab() {
  const [entries, setEntries] = useState<GoldenBootEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newEntry, setNewEntry] = useState({
    player_name: '',
    team_code: '',
    goals: 0,
    assists: 0,
  })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    loadEntries()
  }, [])

  const loadEntries = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('golden_boot_standings')
      .select('id, player_name, team_code, goals, assists, display_order')
      .eq('tournament_id', TOURNAMENT_ID)
      .order('display_order', { ascending: true })

    if (error) {
      setError('Failed to load standings.')
    } else {
      setEntries(data || [])
    }
    setLoading(false)
  }

  const updateEntry = (id: string, patch: Partial<GoldenBootEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch, dirty: true } : e))
    )
  }

  const saveEntry = async (entry: GoldenBootEntry) => {
    setError(null)
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, saving: true } : e))
    )

    const { error } = await supabase
      .from('golden_boot_standings')
      .update({
        player_name: entry.player_name,
        team_code: entry.team_code,
        goals: entry.goals,
        assists: entry.assists,
        display_order: entry.display_order,
      })
      .eq('id', entry.id)

    if (error) {
      setError(`Failed to save ${entry.player_name}.`)
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, saving: false } : e))
      )
    } else {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, saving: false, dirty: false } : e
        )
      )
    }
  }

  const deleteEntry = async (id: string) => {
    const { error } = await supabase
      .from('golden_boot_standings')
      .delete()
      .eq('id', id)

    if (error) {
      setError('Failed to delete entry.')
    } else {
      setEntries((prev) => prev.filter((e) => e.id !== id))
    }
  }

  const handleAdd = async () => {
    if (!newEntry.player_name.trim() || !newEntry.team_code.trim()) return
    setAdding(true)
    setError(null)

    const nextOrder = entries.length > 0
      ? Math.max(...entries.map((e) => e.display_order)) + 1
      : 1

    const { error } = await supabase
      .from('golden_boot_standings')
      .insert({
        tournament_id: TOURNAMENT_ID,
        player_name: newEntry.player_name.trim(),
        team_code: newEntry.team_code.trim().toUpperCase(),
        goals: newEntry.goals,
        assists: newEntry.assists,
        display_order: nextOrder,
      })

    if (error) {
      setError('Failed to add player.')
    } else {
      setNewEntry({ player_name: '', team_code: '', goals: 0, assists: 0 })
      await loadEntries()
    }
    setAdding(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Add new player */}
      <div className="border rounded-xl p-5">
        <h2 className="font-semibold text-base mb-4">Add Player</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Player name"
            value={newEntry.player_name}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, player_name: e.target.value }))}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 flex-1 min-w-[150px]"
          />
          <input
            type="text"
            placeholder="Team code (e.g. FRA)"
            value={newEntry.team_code}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, team_code: e.target.value.toUpperCase() }))}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-32 font-mono uppercase"
          />
          <input
            type="number"
            placeholder="Goals"
            min={0}
            value={newEntry.goals}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, goals: parseInt(e.target.value) || 0 }))}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-20 text-center"
          />
          <input
            type="number"
            placeholder="Assists"
            min={0}
            value={newEntry.assists}
            onChange={(e) => setNewEntry((prev) => ({ ...prev, assists: parseInt(e.target.value) || 0 }))}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-20 text-center"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newEntry.player_name.trim() || !newEntry.team_code.trim()}
            className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg
              hover:bg-gray-800 transition disabled:opacity-50 whitespace-nowrap"
          >
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>
      </div>

      {/* Standings table */}
      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
            <tr>
              <th className="px-4 py-2 text-center font-medium w-12">Order</th>
              <th className="px-4 py-2 text-left font-medium">Player</th>
              <th className="px-4 py-2 text-center font-medium w-24">Team Code</th>
              <th className="px-4 py-2 text-center font-medium w-20">Goals</th>
              <th className="px-4 py-2 text-center font-medium w-20">Assists</th>
              <th className="px-4 py-2 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className={entry.dirty ? 'bg-amber-50' : 'bg-white'}
              >
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min={1}
                    value={entry.display_order}
                    onChange={(e) =>
                      updateEntry(entry.id, { display_order: parseInt(e.target.value) || 1 })
                    }
                    className="w-12 h-8 text-center border rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={entry.player_name}
                    onChange={(e) => updateEntry(entry.id, { player_name: e.target.value })}
                    className="border rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500 w-full"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <FlagImage code={entry.team_code} size={14} />
                    <input
                      type="text"
                      value={entry.team_code}
                      onChange={(e) =>
                        updateEntry(entry.id, { team_code: e.target.value.toUpperCase() })
                      }
                      className="border rounded-lg px-2 py-1 text-sm font-mono uppercase focus:outline-none focus:border-blue-500 w-16 text-center"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min={0}
                    value={entry.goals}
                    onChange={(e) =>
                      updateEntry(entry.id, { goals: parseInt(e.target.value) || 0 })
                    }
                    className="w-16 h-8 text-center border rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min={0}
                    value={entry.assists}
                    onChange={(e) =>
                      updateEntry(entry.id, { assists: parseInt(e.target.value) || 0 })
                    }
                    className="w-16 h-8 text-center border rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => saveEntry(entry)}
                      disabled={entry.saving || !entry.dirty}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400
                        text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                    >
                      {entry.saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-red-400 hover:text-red-600 text-xs transition"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
