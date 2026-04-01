# JPCS NITE 2026 Event System

## Project Overview

A web-based event system for JPCS NITE 2026, a live gala event at DLSL Sentrum on April 21, 2026. The system handles a real-time table buzzer, live scoreboard, and admin controls for ~50 competing tables.

## Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL + Realtime Channels)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Deployment**: Vercel
- **Package Manager**: pnpm

## Architecture

Single application with four routes:

- `/admin` — Control panel (Tech team laptop, never projected)
- `/buzzer` — Phone-based buzzer for table representatives (~50 devices)
- `/display` — Projected TV display (auto-switches between scoreboard and buzzer events, zero interactive elements)
- `/vote` — Reserved for future voting module (not yet in scope)

### Core Principles

1. **Scores belong to the TABLE entity, never a device or person.** Tables are the persistent identity. Devices are transient.
2. **Buzzer and scoring are fully decoupled.** The buzzer determines who answers. The admin independently manages scores through a separate CRUD interface. The buzzer never writes to the score ledger.
3. **Buzzes go through HTTP POST to `/api/buzz`, NOT through Realtime channels.** Server-side timestamps determine buzz ordering. Realtime is only for broadcasting results.
4. **The `/display` route is fully reactive and read-only.** It auto-switches between scoreboard view (during idle) and buzzer event view (during active rounds) based on system state. No buttons, no inputs.

## Folder Structure

```
src/
├── app/
│   ├── (admin)/admin/           — Team Admin owns this
│   │   ├── buzzer-control/      — Round lifecycle controls
│   │   ├── scoring/             — Score CRUD interface
│   │   └── tables/              — Table management
│   ├── (public)/buzzer/         — Team Buzzer owns this
│   │   └── join/                — QR code landing / registration
│   ├── (display)/display/       — Team Display owns this
│   ├── (public)/vote/           — Unassigned, future module
│   └── api/
│       ├── buzz/                — POST: receive buzz signals (latency-critical)
│       ├── rounds/              — Round lifecycle endpoints
│       ├── scores/              — Score CRUD endpoints
│       └── devices/             — Device registration/validation/release
├── lib/
│   ├── supabase/
│   │   ├── client.ts            — Browser-side Supabase (publishable key)
│   │   └── server.ts            — Server-side Supabase (secret key)
│   ├── types/
│   │   ├── database.ts          — Auto-generated from Supabase schema
│   │   └── realtime.ts          — Realtime event contracts (DO NOT modify without team agreement)
│   └── hooks/
│       ├── use-buzzer.ts        — Buzzer state + Realtime subscription
│       ├── use-display.ts       — Display state (subscribes to both channels)
│       └── use-scoreboard.ts    — Score data hook
├── components/ui/               — shadcn/ui components
└── styles/globals.css           — Tailwind + midnight-gold theme
```

## Database Schema

Five tables: `tables`, `device_sessions`, `rounds`, `buzz_signals`, `score_ledger`.
One view: `table_scores` (convenience view for scoreboard rankings).

Key relationships:
- `device_sessions.table_id` → `tables.id` (one active session per table, enforced by unique partial index)
- `rounds.first_buzz_table_id` → `tables.id`
- `rounds.eliminated_table_ids` is a UUID array of tables that answered incorrectly
- `buzz_signals.round_id` → `rounds.id`, `buzz_signals.table_id` → `tables.id`
- `score_ledger.table_id` → `tables.id`
- A table's current score = `SELECT coalesce(sum(delta), 0) FROM score_ledger WHERE table_id = ?`

## Realtime Channels

Two channels defined in `src/lib/types/realtime.ts`:

**`buzzer-room`** — Buzzer state changes:
- `round:opened` — Admin opened a buzzer round
- `buzz:first` — A table buzzed first
- `round:steal` — Incorrect answer, steal round opening
- `round:resolved` — Round complete
- `round:aborted` — Round cancelled

**`scores`** — Score updates:
- `score:updated` — A score was added, deducted, or undone

All event names and payload types are defined in `src/lib/types/realtime.ts`. Always import from there — never hardcode event name strings.

## Buzzer State Machine

States: `idle` → `buzzer_active` → `buzz_received` → `steal_active` → `resolved`

- **Steal is cascading fresh buzz**: when an answer is incorrect, buzzers reopen for all tables except those already eliminated. This repeats until someone is correct, all tables are exhausted, or admin aborts.
- **Abort** can fire from any non-idle state and cleanly resets to idle.
- The buzzer has NO countdown timer.
- When a table buzzes first, their phone shows confirmation. The `/display` shows it dramatically.

## Naming Conventions

- **Database columns**: snake_case (`table_id`, `session_token`)
- **TypeScript types/interfaces**: PascalCase (`TableRow`, `BuzzFirstPayload`)
- **Variables/functions**: camelCase (`createClient`, `handleBuzz`)
- **Constants**: UPPER_SNAKE_CASE (`CHANNELS`, `BUZZER_EVENTS`)
- **Realtime events**: resource:action lowercase (`round:opened`, `buzz:first`)
- **React components**: PascalCase (`BuzzerButton`, `ScoreboardView`)
- **Files**: kebab-case (`buzzer-button.tsx`, `use-buzzer.ts`)
- **Git branches**: `feature/{team}-{description}` (`feature/admin-scoring-crud`)

## Commands

- `pnpm dev` — Start dev server
- `pnpm build` — Production build
- `pnpm lint` — Run ESLint
- `pnpm supabase db push` — Apply migrations to remote database
- `pnpm supabase gen types typescript --linked > src/lib/types/database.ts` — Regenerate database types

## Important Rules

- **Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code.** It's only used in `src/lib/supabase/server.ts` and API routes.
- **Never use client-side timestamps for buzz ordering.** Only `server_received_at` from the API route matters.
- **All write operations go through API routes** (`/api/*`) using the service role client. The browser-side anon client is read-only + Realtime subscriptions.
- **`src/lib/types/realtime.ts` is the contract file.** Do not modify without explicit approval. All three teams depend on it.
- **The admin panel is never projected.** `/display` is what goes on the TV/projector.
- **Table names are "Table 1", "Table 2", etc.** Admin-set, unchangeable.
- **Registration uses QR codes** printed on physical tables. Each QR encodes a URL with the table ID and a one-time token.

## Theme

Event theme: "Nightsky of Golden Dreams" (Oscars 2016-inspired)
Color scheme: midnight navy (#0F1B2D), gold (#C9A84C), white text
Apply this theme primarily to `/display` (the projected screen). Admin and buzzer can be more utilitarian.