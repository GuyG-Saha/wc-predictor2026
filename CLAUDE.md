# WC Predictor 2026 — Claude Code Instructions

## Project Overview
A web app for running a World Cup 2026 predictions tournament among a closed group
of colleagues. Users predict match scores for all group stage games, plus a tournament
winner and top scorer. A leaderboard tracks points throughout the tournament.
This is not a gambling app — no real-time payments, no odds. One winner takes a cash
prize collected upfront by the admin.

## Tech Stack
- **Framework**: Next.js (App Router, TypeScript, `src/` directory layout)
- **Styling**: Tailwind CSS
- **Database + Auth**: Supabase (PostgreSQL + Supabase Auth)
- **Auth Provider**: Google OAuth only — no email/password registration
- **Deployment**: Vercel

## Database Schema

### `public.users`
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO — FK to auth.users |
| display_name | text | NO |
| email | text | YES |
| role | text | NO — 'admin' or 'participant' only |
| created_at | timestamp | YES |

### `public.teams`
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| name | text | NO |
| code | text | NO — 3-letter FIFA code |

### `public.tournaments`
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| name | text | NO |
| starts_at | timestamp | NO |
| ends_at | timestamp | NO |
| entry_fee_ils | integer | YES |
| created_at | timestamp | YES |
| actual_top_scorer | text | YES — filled by admin after tournament |
| actual_winner_team_id | uuid | YES — FK to teams, filled by admin after tournament |

The WC2026 tournament row has a fixed UUID: `aaaaaaaa-0000-0000-0000-000000000001`
This is defined as `TOURNAMENT_ID` in `lib/constants.ts` — always import from there.

### `public.matches`
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| home_team_id | uuid | NO — FK to teams |
| away_team_id | uuid | NO — FK to teams |
| start_time | timestamp | NO — stored in UTC |
| stage | text | NO — e.g. 'group', 'round_of_32', 'quarter_final', 'semi_final', 'final' |
| group_name | text | YES — 'A'..'L', only set when stage = 'group' |
| home_score | integer | YES — null until match is played |
| away_score | integer | YES — null until match is played |
| is_finished | boolean | YES — default false |
| winner_team_id | uuid | YES — FK to teams, relevant for knockout stage |
| tournament_id | uuid | YES — FK to tournaments |

72 group stage matches are seeded (groups A–L, 3 matchdays each).
Knockout stage matches are not yet seeded.

**Important:** "home/away" are positional labels only — this is a World Cup, not a league.
Always display matches as "Team A vs Team B" in the UI, never "Home / Away".

### `public.predictions`
| Column | Type | Nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | NO — FK to users |
| match_id | uuid | NO — FK to matches |
| predicted_home_score | integer | NO |
| predicted_away_score | integer | NO |
| is_locked | boolean | YES — true once match has started |
| created_at | timestamp | YES |
| updated_at | timestamp | YES |

### `public.bonus_predictions`
| Column | Type | Nullable |
|---|---|---|
| user_id | uuid | NO — FK to users |
| predicted_winner_team_id | uuid | YES — FK to teams |
| predicted_top_scorer | text | YES — free text player name |

Note: bonus_predictions schema is not yet finalized. One row per user.

## Scoring Rules
Implemented in Postgres function `public.calculate_user_score(p_user_id uuid) → integer`

| Prediction | Points |
|---|---|
| Exact score | 3 pts (does NOT stack with outcome point) |
| Correct outcome only (win/draw, wrong score) | 1 pt |
| Wrong prediction | 0 pts |
| Tournament winner correct | 5 pts |
| Top scorer correct | 3 pts |

Matches where `is_finished = false` are skipped entirely.

## Auth Rules
- Google OAuth only — do not add any other auth provider
- On new user signup, trigger `on_auth_user_created` on `auth.users` auto-inserts into `public.users`
- Use `@supabase/ssr` for server-side auth (Server Components, Route Handlers, Middleware)
- Use the browser client only for client-side interactions
- Never expose the Supabase service role key on the client

## Roles
- `admin` — can enter match results, manage users, lock/unlock predictions
- `participant` — can submit and edit predictions (until locked)
- Default role on signup is `participant`
- Only two roles exist — do not add others

## Prediction Locking
- A prediction is locked (`is_locked = true`) when the match `start_time` is reached
- Users cannot edit predictions for locked matches
- Locking logic must be enforced both in the UI and via Supabase RLS policies

## Timezone
- All timestamps in the DB are stored in **UTC**
- `timestamp without time zone` columns are treated as UTC throughout the app
- Always append `'Z'` when parsing bare timestamp strings: `new Date(start_time + 'Z')`
- Display in user's local time using `Intl.DateTimeFormat` or `date-fns-tz`
- Primary audience is Israel (UTC+3) but use browser locale for display

## Coding Conventions
- TypeScript strict mode — no `any` types
- Prefer Server Components for data fetching; use Client Components only when interactivity is needed
- Use Supabase joins instead of separate queries where possible (e.g. fetch match with team names in one query)
- All Supabase queries go through the typed client in `lib/supabase.ts`
- Use Tailwind utility classes for all styling — no inline styles, no CSS modules
- Mobile-first responsive design — primary use is on phones
- Display team names from the `teams` table — never hardcode team names in components
- Always show loading states while data is being fetched

## What NOT to Do
- Do not add new tables without reviewing the schema first
- Do not rename `home_team_id` / `away_team_id` — handle display in the UI
- Do not use the Supabase service role key in any client-side code
- Do not implement any payment or real-money transaction features
- Do not add email/password auth
- Do not use `localStorage` or `sessionStorage` for auth state — use Supabase SSR
- Do not hardcode the tournament UUID — always use `TOURNAMENT_ID` from `lib/constants.ts`