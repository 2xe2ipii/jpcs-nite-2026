-- submit_buzz: atomic buzz submission
--
-- Replaces 6 sequential API→DB round trips with a single RPC call.
-- Returns a jsonb object with the result or an error descriptor.
--
-- Called by: /api/buzz route (service role)
-- Return shape (success):
--   { position: int, is_first: bool, phase: text,
--     table_name: text|null, table_number: int|null }
-- Return shape (error):
--   { error: text, status: int }

create or replace function submit_buzz(
  p_table_id uuid,
  p_round_id uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_table        tables%rowtype;
  v_round        rounds%rowtype;
  v_phase        buzz_phase;
  v_buzz_id      uuid;
  v_position     int;
  v_claimed_id   uuid;
  v_elim_count   int;
begin
  -- 1. Validate table
  select * into v_table from tables where id = p_table_id;
  if not found or not v_table.is_active then
    return jsonb_build_object('error', 'Invalid table', 'status', 403);
  end if;

  -- 2. Validate round
  select * into v_round from rounds where id = p_round_id;
  if not found then
    return jsonb_build_object('error', 'Round not found', 'status', 404);
  end if;

  if v_round.status not in ('buzzer_active', 'steal_active') then
    return jsonb_build_object('error', 'Round is not in a buzzable state', 'status', 400);
  end if;

  if p_table_id = any(v_round.eliminated_table_ids) then
    return jsonb_build_object('error', 'Table is eliminated for this round', 'status', 409);
  end if;

  -- 3. Compute phase (mirrors TypeScript toPhase())
  if v_round.status = 'buzzer_active' then
    v_phase := 'initial';
  else
    v_elim_count := coalesce(array_length(v_round.eliminated_table_ids, 1), 1);
    v_phase := ('steal_' || greatest(1, least(v_elim_count, 10)))::buzz_phase;
  end if;

  -- 4. Insert buzz signal (server_received_at set by column default = now())
  insert into buzz_signals (round_id, table_id, phase)
  values (p_round_id, p_table_id, v_phase)
  returning id into v_buzz_id;

  -- 5. Resolve rank within this round+phase using the existing index
  select position into v_position
  from (
    select id,
           row_number() over (order by server_received_at asc, id asc) as position
    from buzz_signals
    where round_id = p_round_id
      and phase    = v_phase
  ) ranked
  where id = v_buzz_id;

  if v_position <> 1 then
    return jsonb_build_object(
      'position', v_position,
      'is_first', false,
      'phase',    v_phase::text
    );
  end if;

  -- 6. Claim first-buzz slot (optimistic; fails silently if another beat us)
  update rounds
  set    first_buzz_table_id = p_table_id,
         status              = 'buzz_received'
  where  id                  = p_round_id
    and  first_buzz_table_id is null
    and  status in ('buzzer_active', 'steal_active')
  returning id into v_claimed_id;

  if v_claimed_id is null then
    -- Lost the CAS race — another concurrent buzz won
    return jsonb_build_object(
      'position', v_position,
      'is_first', false,
      'phase',    v_phase::text
    );
  end if;

  return jsonb_build_object(
    'position',     v_position,
    'is_first',     true,
    'phase',        v_phase::text,
    'table_name',   v_table.display_name,
    'table_number', v_table.table_number
  );
end;
$$;
