# JPCS NITE 2026 Event System

A real-time web-based event system for **JPCS NITE 2026**, a live gala event at DLSL Sentrum on **April 21, 2026**. The system manages a real-time table buzzer, live scoreboard, and admin controls for approximately n competing tables.

> **Theme:** Nightsky of Golden Dreams — Oscars 2016-inspired
> Color scheme: midnight navy `#0F1B2D`, gold `#C9A84C`, white text

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Database | Supabase (PostgreSQL + Realtime Channels) |
| Styling | Tailwind CSS + shadcn/ui |
| Deployment | Vercel |
| Package Manager | pnpm |

---

## Routes

The app has four routes, each owned by a separate team:

| Route | Purpose | Team |
|---|---|---|
| `/admin` | Control panel — buzzer control, scoring, table management | Team Admin |
| `/buzzer` | Phone-based buzzer for table representatives | Team Buzzer |
| `/display` | Projected TV display — scoreboard + buzzer events | Team Display |
| `/vote` | Reserved for a future voting module | Unassigned |

> `/admin` is **never projected**. The projector always shows `/display`.

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/dlsl-jpcs/jpcs-nite-2026.git
cd jpcs-nite-2026

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in .env.local with the Supabase keys from the team group chat

# 4. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is a secret — it must **never** appear in client-side code. It is only used in `src/lib/supabase/server.ts` and API routes.

---

## Commands

```bash
pnpm dev                  # Start development server
pnpm build                # Production build
pnpm lint                 # Run ESLint

# Supabase
pnpm supabase db push     # Apply migrations to remote database
pnpm supabase gen types typescript --linked > src/lib/types/database.ts
                          # Regenerate TypeScript types from schema
```

---

## Architecture

### Core Design Principles

1. **Scores belong to the TABLE, never the device.** Tables are the persistent identity. If a phone dies mid-event, the table's score is unaffected.
2. **Buzzer and scoring are fully decoupled.** The buzzer determines who answers. The admin independently manages scores via a separate CRUD interface. The buzzer never writes to the score ledger.
3. **Buzzes go through HTTP POST (`/api/buzz`), not Realtime.** Server-side timestamps (`server_received_at`) determine buzz ordering for fairness. Realtime is only for broadcasting results to clients.
4. **`/display` is fully reactive and read-only.** It auto-switches between scoreboard view (idle) and buzzer event view (active round) based on system state. No buttons, no inputs.

### Database Schema

Five tables, one view:

| Table | Purpose |
|---|---|
| `tables` | The 50 competing tables — persistent identity |
| `device_sessions` | Active phone registrations (transient, one per table) |
| `rounds` | Buzzer round lifecycle and outcome |
| `buzz_signals` | All buzz attempts with server timestamps |
| `score_ledger` | Append-only score history (delta per entry) |
| `table_scores` *(view)* | Aggregated scores for scoreboard display |

A table's current score is computed as: `SELECT coalesce(sum(delta), 0) FROM score_ledger WHERE table_id = ?`

### Realtime Channels

All event names and payload types are defined in `src/lib/types/realtime.ts`. Always import from there — never hardcode event name strings.

**`buzzer-room`** — Buzzer state changes:
- `round:opened` — Admin opened a buzzer round
- `buzz:first` — A table buzzed first
- `round:steal` — Incorrect answer, steal round reopened
- `round:resolved` — Round complete
- `round:aborted` — Round cancelled

**`scores`** — Score updates:
- `score:updated` — A score entry was added, deducted, or removed

### Buzzer State Machine

```
idle → buzzer_active → buzz_received → steal_active → resolved
 ↑_________________________abort__________________________|
```

- **Steal** cascades: on an incorrect answer, buzzers reopen for all non-eliminated tables. This repeats until someone answers correctly, all tables are exhausted, or an admin aborts.
- **Abort** resets cleanly to `idle` from any non-idle state.
- There is no countdown timer.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for team assignments, file ownership rules, naming conventions, and the Git workflow.
