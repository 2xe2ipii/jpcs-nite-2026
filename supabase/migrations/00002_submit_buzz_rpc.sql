-- Function to submit a buzz and resolve its position/fastest status in one atomic operation.
-- This reduces the number of round-trips from the API from ~6 to 1.

drop function if exists submit_buzz(uuid, uuid);

create or replace function submit_buzz(
  p_table_id uuid,
  p_round_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_status round_status;
  v_eliminated_ids uuid[];
  v_table_active boolean;
  v_phase buzz_phase;
  v_inserted_id uuid;
  v_server_received timestamptz;
  v_position integer;
  v_is_first boolean := false;
  v_display_name varchar;
  v_table_number integer;
  v_updated_round_id uuid;
  v_eliminated_count integer;
begin
  -- 1. Table Validation
  select is_active, display_name, table_number 
  into v_table_active, v_display_name, v_table_number
  from tables 
  where id = p_table_id;

  if not found or not v_table_active then
    raise exception 'Table not found or inactive' using errcode = 'P0002';
  end if;

  -- 2. Round Validation
  select status, eliminated_table_ids 
  into v_round_status, v_eliminated_ids
  from rounds 
  where id = p_round_id;

  if not found then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;

  if v_round_status not in ('buzzer_active', 'steal_active') then
    raise exception 'Round is not in a buzzable state' using errcode = 'P0003';
  end if;

  if p_table_id = any(v_eliminated_ids) then
    raise exception 'Table is eliminated for this round' using errcode = 'P0004';
  end if;

  -- 3. Determine Phase
  if v_round_status = 'buzzer_active' then
    v_phase := 'initial';
  else
    v_eliminated_count := coalesce(array_length(v_eliminated_ids, 1), 0);
    -- Steal phase number tracks how many tables were eliminated so far.
    v_phase := cast('steal_' || least(greatest(1, v_eliminated_count), 10) as buzz_phase);
  end if;

  -- 4. Insert Buzz Signal
  insert into buzz_signals (round_id, table_id, phase)
  values (p_round_id, p_table_id, v_phase)
  returning id, server_received_at into v_inserted_id, v_server_received;

  -- 5. Calculate Position (Rank)
  -- Based on server_received_at, then ID for tie-breaking
  select count(*)
  into v_position
  from buzz_signals
  where round_id = p_round_id
    and phase = v_phase
    and (server_received_at < v_server_received 
         or (server_received_at = v_server_received and id <= v_inserted_id));

  -- 6. Resolve First Buzz Winner
  if v_position = 1 then
    -- Atomic update to lock the buzzer
    update rounds
    set first_buzz_table_id = p_table_id,
        status = 'buzz_received'
    where id = p_round_id
      and first_buzz_table_id is null
      and status in ('buzzer_active', 'steal_active')
    returning id into v_updated_round_id;

    if v_updated_round_id is not null then
      v_is_first := true;
    else
      -- Someone else JUST beat us to the update, even if we were "first" in the log
      v_is_first := false;
    end if;
  end if;

  -- 7. Return Result
  return json_build_object(
    'position', v_position,
    'is_first', v_is_first,
    'table_id', p_table_id,
    'display_name', v_display_name,
    'table_number', v_table_number,
    'phase', v_phase
  );
end;
$$;
