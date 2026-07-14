'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/app/components/Navbar'
import FlagImage from '@/app/components/FlagImage'
import { TOURNAMENT_ID } from '@/lib/constants'
import GoldenBootStandings from '@/app/components/GoldenBootStandings'

type Team = {
  id: string
  name: string
  code: string
}

type Candidate = {
  id: string
  name: string
  team_id: string
  teams: {
    code: string
  }
}

type BonusPrediction = {
  predicted_winner_team_id: string | null
  predicted_top_scorer: string | null
}

type Tournament = {
  bonus_deadline: string | null
}

type Group = {
  id: string
  name: string
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Bonus predictions state
  const [teams, setTeams] = useState<Team[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [bonus, setBonus] = useState<BonusPrediction>({
    predicted_winner_team_id: null,
    predicted_top_scorer: null,
  })
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teamSearch, setTeamSearch] = useState('')
  const [showTeamDropdown, setShowTeamDropdown] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [scorerSearch, setScorerSearch] = useState('')
  const [showScorerDropdown, setShowScorerDropdown] = useState(false)
  const [bonusSaving, setBonusSaving] = useState(false)
  const [bonusSaved, setBonusSaved] = useState(false)
  const [bonusError, setBonusError] = useState<string | null>(null)
  const [bonusLoading, setBonusLoading] = useState(true)

  // Group join state
  const [userGroups, setUserGroups] = useState<Group[]>([])
  const [inviteCode, setInviteCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      setLoading(false)
    }
    getUser()
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )
    return () => { listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!user) return
    loadBonusData()
    loadUserGroups()
  }, [user])

  const loadUserGroups = async () => {
    const { data } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name)')
      .eq('user_id', user.id)

    if (data) {
      const groups = data.map((row: any) => row.groups).filter(Boolean) as Group[]
      setUserGroups(groups)
    }
  }

  const loadBonusData = async () => {
    setBonusLoading(true)
    const [
      { data: teamsData },
      { data: tournamentData },
      { data: bonusData },
      { data: candidatesData },
    ] = await Promise.all([
      supabase.from('teams').select('id, name, code').order('name'),
      supabase
        .from('tournaments')
        .select('bonus_deadline')
        .eq('id', TOURNAMENT_ID)
        .single(),
      supabase
        .from('bonus_predictions')
        .select('predicted_winner_team_id, predicted_top_scorer')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('top_scorer_candidates')
        .select('id, name, team_id, teams(code)')
        .eq('tournament_id', TOURNAMENT_ID)
        .order('name'),
    ])

    setTeams(teamsData || [])
    setTournament(tournamentData)
    setCandidates((candidatesData as unknown as Candidate[]) || [])

    if (bonusData) {
      setBonus(bonusData)
      if (bonusData.predicted_winner_team_id && teamsData) {
        const team = teamsData.find(
          (t: Team) => t.id === bonusData.predicted_winner_team_id
        )
        if (team) {
          setSelectedTeam(team)
          setTeamSearch(team.name)
        }
      }
      if (bonusData.predicted_top_scorer) {
        setScorerSearch(bonusData.predicted_top_scorer)
      }
    }
    setBonusLoading(false)
  }

  const login = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  const isBonusLocked = () => {
    if (!tournament?.bonus_deadline) return false
    return new Date(tournament.bonus_deadline + 'Z') <= new Date()
  }

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(teamSearch.toLowerCase())
  )

  const filteredCandidates = candidates.filter((c) =>
    c.name.toLowerCase().includes(scorerSearch.toLowerCase())
  )

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team)
    setTeamSearch(team.name)
    setBonus((prev) => ({ ...prev, predicted_winner_team_id: team.id }))
    setShowTeamDropdown(false)
  }

  const handleScorerSelect = (candidate: Candidate) => {
    setScorerSearch(candidate.name)
    setBonus((prev) => ({ ...prev, predicted_top_scorer: candidate.name }))
    setShowScorerDropdown(false)
  }

  const handleSaveBonus = async () => {
    setBonusSaving(true)
    setBonusError(null)
    setBonusSaved(false)

    const { error } = await supabase
      .from('bonus_predictions')
      .upsert(
        {
          user_id: user.id,
          predicted_winner_team_id: bonus.predicted_winner_team_id,
          predicted_top_scorer: bonus.predicted_top_scorer,
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      setBonusError('Failed to save. Please try again.')
    } else {
      setBonusSaved(true)
      setTimeout(() => setBonusSaved(false), 3000)
    }
    setBonusSaving(false)
  }

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return
    setJoining(true)
    setJoinError(null)
    setJoinSuccess(null)

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .eq('tournament_id', TOURNAMENT_ID)
      .maybeSingle()

    if (groupError || !group) {
      setJoinError('Invalid invite code. Please check and try again.')
      setJoining(false)
      return
    }

    const alreadyMember = userGroups.some((g) => g.id === group.id)
    if (alreadyMember) {
      setJoinError(`You are already in the "${group.name}" group.`)
      setJoining(false)
      return
    }

    const { error: joinError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id })

    if (joinError) {
      setJoinError('Failed to join group. Please try again.')
    } else {
      setJoinSuccess(`You joined "${group.name}" successfully! 🎉`)
      setInviteCode('')
      await loadUserGroups()
      setTimeout(() => setJoinSuccess(null), 4000)
    }
    setJoining(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    )
  }

  return (
    <>
      <Navbar email={user?.email} />
      <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
        {!user ? (
          <div className="flex items-center justify-center min-h-[80vh]">
            <div className="text-center space-y-6">
              <div className="text-6xl">⚽</div>
              <h1 className="text-3xl font-bold">World Cup Predictor</h1>
              <p className="text-gray-500">Predict match scores and compete with your colleagues</p>
              <button
                onClick={login}
                className="border rounded-xl px-8 py-3 text-lg hover:bg-gray-100 transition font-medium"
              >
                Login with Google
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Welcome */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">⚽ World Cup 2026</h1>
                <p className="text-gray-500 text-sm mt-1">Welcome, {user.email}</p>
              </div>
              <button
                onClick={logout}
                className="text-sm border rounded-lg px-3 py-1.5 hover:bg-gray-50 transition text-gray-500"
              >
                Logout
              </button>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/matches"
                className="border rounded-xl p-4 hover:shadow-md transition text-center"
              >
                <div className="text-2xl mb-1">🗓️</div>
                <div className="font-semibold text-sm">Matches</div>
                <div className="text-xs text-gray-400 mt-0.5">Predict scores</div>
              </Link>
              <Link
                href="/leaderboard"
                className="border rounded-xl p-4 hover:shadow-md transition text-center"
              >
                <div className="text-2xl mb-1">🏆</div>
                <div className="font-semibold text-sm">Leaderboard</div>
                <div className="text-xs text-gray-400 mt-0.5">See standings</div>
              </Link>
            </div>

            {/* Groups */}
            <div className="border rounded-xl p-5">
              <h2 className="font-bold text-lg mb-1">Your Groups</h2>
              {userGroups.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-4">
                  {userGroups.map((g) => (
                    <span
                      key={g.id}
                      className="text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mb-4">
                  You are not in any group yet. Enter an invite code to join one.
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinGroup()}
                  placeholder="Enter invite code…"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono uppercase
                    focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleJoinGroup}
                  disabled={joining || !inviteCode.trim()}
                  className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg
                    hover:bg-gray-800 transition disabled:opacity-50 whitespace-nowrap"
                >
                  {joining ? 'Joining…' : 'Join'}
                </button>
              </div>
              {joinError && <p className="text-red-500 text-xs mt-2">{joinError}</p>}
              {joinSuccess && <p className="text-green-600 text-xs mt-2">{joinSuccess}</p>}
            </div>

            {/* Bonus Predictions */}
            <div className="border rounded-xl p-5">
              <h2 className="font-bold text-lg mb-1">Bonus Predictions</h2>
              <p className="text-xs text-gray-400 mb-4">
                {isBonusLocked()
                  ? 'Bonus predictions are locked.'
                  : tournament?.bonus_deadline
                  ? `Deadline: ${new Date(tournament.bonus_deadline + 'Z').toLocaleString('he-IL', {
                      timeZone: 'Asia/Jerusalem',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'No deadline set yet.'}
              </p>

              {bonusLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tournament winner */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🏆 Tournament Winner
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={teamSearch}
                        onChange={(e) => {
                          setTeamSearch(e.target.value)
                          setShowTeamDropdown(true)
                          if (!e.target.value) {
                            setSelectedTeam(null)
                            setBonus((prev) => ({ ...prev, predicted_winner_team_id: null }))
                          }
                        }}
                        onFocus={() => setShowTeamDropdown(true)}
                        disabled={isBonusLocked()}
                        placeholder="Search for a team..."
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none
                          focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {selectedTeam && (
                        <span className="absolute right-3 top-2.5 text-sm">
                          <FlagImage code={selectedTeam.code} size={16} />
                        </span>
                      )}
                      {showTeamDropdown && teamSearch && !isBonusLocked() && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredTeams.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400">No teams found</div>
                          ) : (
                            filteredTeams.map((team) => (
                              <button
                                key={team.id}
                                type="button"
                                onClick={() => handleTeamSelect(team)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <FlagImage code={team.code} size={16} />
                                <span>{team.name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top scorer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ⚽ Top Scorer
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={scorerSearch}
                        onChange={(e) => {
                          setScorerSearch(e.target.value)
                          setShowScorerDropdown(true)
                          if (!e.target.value) {
                            setBonus((prev) => ({ ...prev, predicted_top_scorer: null }))
                          }
                        }}
                        onFocus={() => setShowScorerDropdown(true)}
                        disabled={isBonusLocked()}
                        placeholder="Search for a player..."
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none
                          focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      {showScorerDropdown && scorerSearch && !isBonusLocked() && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredCandidates.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400">No players found</div>
                          ) : (
                            filteredCandidates.map((candidate) => (
                              <button
                                key={candidate.id}
                                type="button"
                                onClick={() => handleScorerSelect(candidate)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                              >
                                <FlagImage code={candidate.teams.code} size={16} />
                                <span>{candidate.name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {bonusError && (
                    <p className="text-red-500 text-xs">{bonusError}</p>
                  )}

                  {!isBonusLocked() && (
                    <button
                      onClick={handleSaveBonus}
                      disabled={bonusSaving || !bonus.predicted_winner_team_id}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200
                        disabled:text-gray-400 text-white font-semibold py-2.5 rounded-xl
                        transition text-sm"
                    >
                      {bonusSaving
                        ? 'Saving…'
                        : bonusSaved
                        ? '✓ Saved!'
                        : 'Save Bonus Predictions'}
                    </button>
                  )}
                </div>
              )}
            </div>
            <GoldenBootStandings />
          </div>
        )}
      </main>
    </>
  )
}
