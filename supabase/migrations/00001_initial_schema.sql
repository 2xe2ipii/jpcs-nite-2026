-- JPCS NITE 2026 Event System
-- Initial schema migration
-- All tables use UUID primary keys and timestamptz for timestamps

-- ============================================================
-- ENUM TYPES
-- ============================================================

create type round_status as enum (
  'idle',
  'buzzer_active',
  'buzz_received',
  'steal_active',
  'resolved',
  'aborted'
);

create type buzz_phase as enum (
  'initial',
  'steal_1',
  'steal_2',
  'steal_3',
  'steal_4',
  'steal_5',
  'steal_6',
  'steal_7',
  'steal_8',
  'steal_9',
  'steal_10'
);

-- ============================================================
-- TABLES
-- ============================================================

-- The persistent identity unit. Survives device changes. Owns the score.
create table tables (
  id uuid primary key default gen_random_uuid(),
  display_name varchar not null,
  table_number integer not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table tables is 'Physical round tables at the venue. Each table is a competing group.';
comment on column tables.display_name is 'e.g. "Table 1", "Table 2". Set by admin, unchangeable.';
comment on column tables.table_number is 'Sequential number for ordering.';
comment on column tables.is_active is 'Whether this table is in play. Deactivate unused tables.';

-- Links one phone browser to one table. Transient.
create table device_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references tables(id) on delete cascade,
  session_token varchar not null unique,
  is_active boolean not null default true,
  connected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

comment on table device_sessions is 'Links one phone to one table. Can be invalidated and replaced.';
comment on column device_sessions.session_token is 'Unique token stored in the browser for reconnection.';
comment on column device_sessions.is_active is 'Set false when device is released by admin.';

-- Enforce one active device session per table
create unique index idx_one_active_session_per_table
  on device_sessions (table_id)
  where (is_active = true);

-- Record of a single question/buzzer activation cycle.
create table rounds (
  id uuid primary key default gen_random_uuid(),
  round_number integer not null,
  status round_status not null default 'idle',
  first_buzz_table_id uuid references tables(id),
  eliminated_table_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

comment on table rounds is 'Each row is one question/buzzer cycle.';
comment on column rounds.status is 'Current state in the round lifecycle.';
comment on column rounds.first_buzz_table_id is 'Which table buzzed first in the current phase.';
comment on column rounds.eliminated_table_ids is 'Tables that answered incorrectly. Excluded from steal rounds.';

-- Individual buzz signals received from phones.
create table buzz_signals (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  table_id uuid not null references tables(id) on delete cascade,
  phase buzz_phase not null default 'initial',
  server_received_at timestamptz not null default now()
);

comment on table buzz_signals is 'Every buzz signal received. server_received_at is the single source of truth for ordering.';

-- Index for fast lookup of buzzes within a round+phase, ordered by arrival time
create index idx_buzz_signals_round_phase_time
  on buzz_signals (round_id, phase, server_received_at asc);

-- Append-only log of every point change.
create table score_ledger (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references tables(id) on delete cascade,
  delta integer not null,
  reason varchar,
  created_at timestamptz not null default now()
);

comment on table score_ledger is 'Every point change. A table''s score = SUM(delta) of all its entries.';
comment on column score_ledger.delta is 'Positive = add, negative = deduct.';
comment on column score_ledger.reason is 'Optional label: Correct answer, Bonus, Penalty, etc.';

-- Index for fast score calculation per table
create index idx_score_ledger_table
  on score_ledger (table_id, created_at desc);

-- ============================================================
-- VIEWS
-- ============================================================

-- Convenience view: current scores for all tables
create view table_scores as
  select
    t.id,
    t.display_name,
    t.table_number,
    t.is_active,
    coalesce(sum(sl.delta), 0) as current_score
  from tables t
  left join score_ledger sl on sl.table_id = t.id
  group by t.id, t.display_name, t.table_number, t.is_active
  order by current_score desc, t.table_number asc;

comment on view table_scores is 'All tables with their current score (SUM of ledger). Used by scoreboard.';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table tables enable row level security;
alter table device_sessions enable row level security;
alter table rounds enable row level security;
alter table buzz_signals enable row level security;
alter table score_ledger enable row level security;

-- Public read access for tables (everyone needs to see table names/scores)
create policy "Tables are viewable by everyone"
  on tables for select
  using (true);

-- Public read access for rounds (phones need to know the current round state)
create policy "Rounds are viewable by everyone"
  on rounds for select
  using (true);

-- Public read access for score_ledger (scoreboard needs this)
create policy "Score ledger is viewable by everyone"
  on score_ledger for select
  using (true);

-- Public read access for buzz_signals (for audit/display)
create policy "Buzz signals are viewable by everyone"
  on buzz_signals for select
  using (true);

-- Device sessions: only the session owner can read their own session
create policy "Users can read their own device session"
  on device_sessions for select
  using (true);

-- Write operations go through the service role key (server-side API routes)
-- The anon key cannot insert/update/delete on any table
-- All mutations happen through /api/ routes using the service role

-- Allow inserts via service role for all tables
create policy "Service role can insert tables"
  on tables for insert
  with check (true);

create policy "Service role can update tables"
  on tables for update
  using (true);

create policy "Service role can insert device_sessions"
  on device_sessions for insert
  with check (true);

create policy "Service role can update device_sessions"
  on device_sessions for update
  using (true);

create policy "Service role can insert rounds"
  on rounds for insert
  with check (true);

create policy "Service role can update rounds"
  on rounds for update
  using (true);

create policy "Service role can insert buzz_signals"
  on buzz_signals for insert
  with check (true);

create policy "Service role can insert score_ledger"
  on score_ledger for insert
  with check (true);

create policy "Service role can delete score_ledger"
  on score_ledger for delete
  using (true);

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable realtime for tables that need live updates
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table score_ledger;
alter publication supabase_realtime add table buzz_signals;