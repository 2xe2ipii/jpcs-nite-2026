-- Add tiebreak_order to tables for randomized zero-score ordering
alter table tables add column tiebreak_order integer;

-- Rebuild table_scores view with first_scored_at and updated sort order:
--   1. current_score DESC        (higher scores rank first)
--   2. first_scored_at ASC       (tied non-zero: who got their first point earliest)
--   3. tiebreak_order ASC NULLS LAST (zero-score tables: randomized by admin)
--   4. table_number ASC          (final fallback)
drop view table_scores;

create view table_scores as
  select
    t.id,
    t.display_name,
    t.table_number,
    t.is_active,
    t.tiebreak_order,
    coalesce(sum(sl.delta), 0) as current_score,
    min(sl.created_at) filter (where sl.delta > 0) as first_scored_at
  from tables t
  left join score_ledger sl on sl.table_id = t.id
  group by t.id, t.display_name, t.table_number, t.is_active, t.tiebreak_order;

comment on view table_scores is 'All tables with current score, first scoring timestamp, and tiebreak order. Sorting is applied at query time.';
