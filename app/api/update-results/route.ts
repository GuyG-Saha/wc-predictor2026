import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { ESPN_NAME_MAP } from '@/lib/espn-team-map'


// Use service role key to bypass RLS for server-side updates
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch today's scores from ESPN
    const espnRes = await fetch(ESPN_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    })

    if (!espnRes.ok) {
      return NextResponse.json({ error: 'ESPN fetch failed', status: espnRes.status }, { status: 500 })
    }

    const espnData = await espnRes.json()
    const events = espnData.events || []

    // Filter to finished matches only
    const finishedEvents = events.filter(
      (e: any) => e.status?.type?.completed === true
    )

    if (finishedEvents.length === 0) {
      return NextResponse.json({ message: 'No finished matches today', updated: 0 })
    }

    // Load all teams from DB for name matching
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, name')

    const teamsByName: Record<string, string> = {}
    teamsData?.forEach((t) => { teamsByName[t.name] = t.id })

    let updated = 0
    const errors: string[] = []

    for (const event of finishedEvents) {
      try {
        const competition = event.competitions?.[0]
        if (!competition) continue

        const homeComp = competition.competitors?.find((c: any) => c.homeAway === 'home')
        const awayComp = competition.competitors?.find((c: any) => c.homeAway === 'away')

        if (!homeComp || !awayComp) continue

        const espnHomeName = homeComp.team?.displayName
        const espnAwayName = awayComp.team?.displayName
        const homeScore = parseInt(homeComp.score)
        const awayScore = parseInt(awayComp.score)

        if (isNaN(homeScore) || isNaN(awayScore)) continue

        // Map ESPN names to your DB names
        const dbHomeName = ESPN_NAME_MAP[espnHomeName] ?? espnHomeName
        const dbAwayName = ESPN_NAME_MAP[espnAwayName] ?? espnAwayName

        const homeTeamId = teamsByName[dbHomeName]
        const awayTeamId = teamsByName[dbAwayName]

        if (!homeTeamId || !awayTeamId) {
          errors.push(`Team not found: ${espnHomeName} (${dbHomeName}) or ${espnAwayName} (${dbAwayName})`)
          continue
        }

        // Determine winner for knockout stage
        let winnerTeamId: string | null = null
        const stage = 'group' // update this for knockout stage later
        if (stage !== 'group') {
          if (homeScore > awayScore) winnerTeamId = homeTeamId
          else if (awayScore > homeScore) winnerTeamId = awayTeamId
        }

        // Find the match in your DB by home/away team IDs
        const { data: matchData } = await supabase
          .from('matches')
          .select('id, is_finished')
          .eq('home_team_id', homeTeamId)
          .eq('away_team_id', awayTeamId)
          .eq('tournament_id', 'aaaaaaaa-0000-0000-0000-000000000001')
          .single()

        if (!matchData) {
          errors.push(`Match not found: ${dbHomeName} vs ${dbAwayName}`)
          continue
        }

        // Skip if already marked finished
        if (matchData.is_finished) continue

        // Update the match result
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            home_score: homeScore,
            away_score: awayScore,
            is_finished: true,
            winner_team_id: winnerTeamId,
          })
          .eq('id', matchData.id)

        if (updateError) {
          errors.push(`Failed to update ${dbHomeName} vs ${dbAwayName}: ${updateError.message}`)
        } else {
          updated++
        }
      } catch (err) {
        errors.push(`Error processing event: ${err}`)
      }
    }

    return NextResponse.json({
      message: `Updated ${updated} match(es)`,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    })

  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error', details: String(err) }, { status: 500 })
  }
}