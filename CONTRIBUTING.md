# Contributing to JPCS NITE 2026 Event System

## Team Assignments

| Route | Team | Owner |
|-------|------|-------|
| `/admin` | Team Admin | Buzzer control, scoring CRUD, table management |
| `/buzzer` | Team Buzzer | Join flow, buzz button, phone UI |
| `/display` | Team Display | Scoreboard view, buzzer event view, auto-switching |
| `/vote` | Unassigned | Reserved for future voting module |

## File Ownership

Each team owns the files listed in SRS Section 7. **Do not edit files outside your ownership boundary without announcing it in the group chat first.**

### Shared files (owned by Drex xd)

Changes to these files require all-team agreement:

- `src/lib/types/realtime.ts` — Realtime event contracts
- `src/lib/types/database.ts` — Database types
- `src/lib/supabase/` — Supabase client initialization
- `supabase/migrations/` — SQL schema files

If you need a new Realtime event, a new database column, or a schema change, **request it through me Drex.**

## Naming Conventions

### Database (SQL)
- **snake_case** for everything: `table_id`, `session_token`, `first_buzz_table_id`
- No camelCase in the database

### TypeScript
- **PascalCase** for types and interfaces: `TableRow`, `BuzzFirstPayload`
- **camelCase** for variables and functions: `createClient`, `handleBuzz`
- **UPPER_SNAKE_CASE** for constants: `CHANNELS`, `BUZZER_EVENTS`

### Realtime Events
- Format: `resource:action` in lowercase
- Examples: `round:opened`, `buzz:first`, `score:updated`
- Defined in `src/lib/types/realtime.ts` — import from there, never hardcode strings

### API Routes
- RESTful, resource-first
- Examples: `/api/rounds/open`, `/api/scores`, `/api/devices/register`

### React Components
- **PascalCase**: `BuzzerButton`, `ScoreboardView`

### Files
- **kebab-case**: `buzzer-button.tsx`, `use-buzzer.ts`
- Next.js pages are always `page.tsx`, layouts are `layout.tsx`

### Git Branches
- Format: `feature/{team}-{description}`
- Examples: `feature/buzzer-join-flow`, `feature/admin-scoring-crud`, `feature/display-scoreboard-view`

## Git Workflow

1. **`main` branch is always deployable.** Never push broken code to main.
2. Work on **feature branches** branched from `main`.
3. Create a **pull request** to merge into main.
4. Before merging, verify: does the app build without errors? (`pnpm build`)
5. After merging, pull the latest `main` into your feature branch.

## Development Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd jpcs-nite-2026

# 2. Install dependencies
pnpm install

# 3. Copy environment file and fill in your Supabase keys
cp .env.example .env.local
# Edit .env.local with the values from the team group chat

# 4. Start the dev server
pnpm dev

# 5. Open http://localhost:3000
```

## Key Architecture Rules

1. **Scores belong to the TABLE, never the device.** If a phone dies, the table's score is unaffected.
2. **Buzzer and scoring are fully decoupled.** The buzzer determines who answers. The admin independently manages scores.
3. **Buzzes go through HTTP POST, not Realtime.** The `/api/buzz` endpoint timestamps server-side for fairness. Realtime is for broadcasting results.
4. **The `/display` route is never interactive.** No buttons, no inputs. It only listens and renders.
5. **The `/admin` route is never projected.** The projector shows `/display`.

## When In Doubt

- Check the SRS document (JPCS_NITE_2026_SRS.docx)
- Check `src/lib/types/realtime.ts` for the exact event/payload shapes
- Ask in the group chat before making changes to shared files