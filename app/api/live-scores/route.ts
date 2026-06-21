import { NextResponse } from 'next/server'
import { ESPN_NAME_MAP } from '@/lib/espn-team-map'

const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

let cache: { data: any; timestamp: number } | null = null
const CACHE_DURATION_MS = 15_000 // 15 seconds

type LiveMatch = {
  homeTeam: string  // mapped to your DB team name
  awayTeam: string  // mapped to your DB team name
  homeScore: number
  awayScore: number
  state: 'pre' | 'in' | 'post'
  clock: string | null
}

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION_MS) {
    return NextResponse.json(cache.data)
  }

  try {
    const espnRes = await fetch(ESPN_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    })

    if (!espnRes.ok) {
      return NextResponse.json({ matches: [] }, { status: 200 })
    }

    const espnData = await espnRes.json()
    const events = espnData.events || []

    const matches: LiveMatch[] = events
      .map((event: any) => {
        const competition = event.competitions?.[0]
        if (!competition) return null

        const homeComp = competition.competitors?.find((c: any) => c.homeAway === 'home')
        const awayComp = competition.competitors?.find((c: any) => c.homeAway === 'away')
        if (!homeComp || !awayComp) return null

        const espnHomeName = homeComp.team?.displayName
        const espnAwayName = awayComp.team?.displayName
        const state = competition.status?.type?.state // 'pre' | 'in' | 'post'

        return {
          homeTeam: ESPN_NAME_MAP[espnHomeName] ?? espnHomeName,
          awayTeam: ESPN_NAME_MAP[espnAwayName] ?? espnAwayName,
          homeScore: parseInt(homeComp.score) || 0,
          awayScore: parseInt(awayComp.score) || 0,
          state,
          clock: state === 'in' ? competition.status?.type?.shortDetail ?? null : null,
        }
      })
      .filter(Boolean)

    const result = { matches, fetchedAt: new Date().toISOString() }
    cache = { data: result, timestamp: Date.now() }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ matches: [] }, { status: 200 })
  }
}