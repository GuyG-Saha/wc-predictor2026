export type Team = {
  id: string
  name: string
  code: string
}

export type Match = {
  id: string
  start_time: string
  stage: string
  group_name: string | null
  is_finished: boolean
  home_score: number | null
  away_score: number | null
  home_team: Team
  away_team: Team
}

export type UserPrediction = {
  home: number
  away: number
}
