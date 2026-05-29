-- INH Project Management — demo seed data
-- Safe to run once on a fresh project. Idempotent via fixed UUIDs +
-- `on conflict do nothing`, so re-running does not duplicate rows.
-- Run this AFTER the schema/RLS/triggers (0001–0003). It is inserted by the
-- postgres role in the SQL Editor, which bypasses RLS, so no login is needed.
-- The owner sees everything via is_owner(); these rows need no member links.

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
insert into public.projects (id, name, code, address, type, progress, status, est_handover) values
  ('11111111-1111-1111-1111-111111111111', 'Lot 23, Bukit Indah', 'P-2026-023', '23 Jalan Indah 3/2, Bukit Indah, 81200 JB', 'Full home renovation', 68, 'ontrack', '2026-06-20'),
  ('22222222-2222-2222-2222-222222222222', '12 Jalan Setia',      'P-2026-031', '12 Jln Setia Tropika 1, 81100 JB',          'Kitchen & living',     34, 'pending', '2026-08-15'),
  ('33333333-3333-3333-3333-333333333333', 'Penthouse, Tower B',  'P-2026-018', 'Sky Habitat Tower B, #28-03',               'Bathroom & flooring',  92, 'overdue', '2026-05-30')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Phases (attached to Lot 23)
-- ---------------------------------------------------------------------------
insert into public.phases (id, project_id, name, status, pct, start_date, end_date, sort_order) values
  ('a0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Demolition & hacking',   'completed', 100, '2026-03-03', '2026-03-09', 1),
  ('a0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Wiring & plumbing',      'completed', 100, '2026-03-10', '2026-03-24', 2),
  ('a0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Carpentry & built-ins',  'progress',   60, '2026-03-25', '2026-05-18', 3),
  ('a0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Tiling & flooring',      'progress',   30, '2026-05-05', '2026-05-28', 4),
  ('a0000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Painting & finishing',   'upcoming',    0, '2026-06-01', '2026-06-14', 5),
  ('a0000001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Handover & cleaning',    'upcoming',    0, '2026-06-16', '2026-06-20', 6)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Schedule (This week — Lot 23)
-- ---------------------------------------------------------------------------
insert into public.schedule_items (id, project_id, title, scheduled_date, state) values
  ('b0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Kitchen cabinet carcass install', '2026-05-12', 'today'),
  ('b0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Living room feature wall tiling',  '2026-05-14', 'upcoming'),
  ('b0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Electrical second fix',            '2026-05-16', 'upcoming')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Updates feed (Lot 23). Photo bytes would live in the update-photos bucket;
-- here we seed the feed rows only (count column is derived in the UI later).
-- ---------------------------------------------------------------------------
insert into public.updates (id, project_id, room, captured_on, is_new) values
  ('c0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Kitchen',     '2026-05-12', true),
  ('c0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Living room', '2026-05-12', true),
  ('c0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Master bath', '2026-05-08', false),
  ('c0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Hallway',     '2026-05-08', false),
  ('c0000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Bedroom 2',   '2026-05-02', false),
  ('c0000001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Exterior',    '2026-05-02', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Documents (Lot 23)
-- ---------------------------------------------------------------------------
insert into public.documents (id, project_id, name, kind, file_size, ready, issued_on) values
  ('d0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Milestone 2 Invoice',      'invoice', 2516582, true,  '2026-05-12'),
  ('d0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Renovation Contract',      'doc',     5347737, true,  '2026-02-28'),
  ('d0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Approved Floor Plan',      'plan',    9122611, true,  '2026-03-02'),
  ('d0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Material Selection Sheet', 'doc',     1258291, true,  '2026-03-15'),
  ('d0000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Final Inspection Report',  'doc',     null,    false, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Payments / FEES RELEASE (Lot 23). Owner-only at the RLS layer.
-- `method` is a display label only — never raw account/bank numbers (PDPA).
-- ---------------------------------------------------------------------------
insert into public.payments (id, project_id, contractor, stage, amount, due_date, status, method) values
  ('e0000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Ah Seng Tiling',        'Tiling & flooring',     14200, '2026-05-18', 'pending',  'Bank transfer'),
  ('e0000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'KL Electrical Works',   'Wiring & plumbing',     22800, '2026-05-12', 'released', 'DuitNow · ref #44192'),
  ('e0000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Mutiara Carpentry',     'Carpentry & built-ins', 38500, '2026-05-30', 'pending',  'Bank transfer'),
  ('e0000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Lim Plumbing Sdn Bhd',  'Wiring & plumbing',      9600, '2026-03-24', 'released', 'DuitNow · ref #41003'),
  ('e0000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Hng Demolition',        'Demolition & hacking',   7400, '2026-05-05', 'overdue',  'Bank transfer'),
  ('e0000001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Cosmo Painting',        'Painting & finishing',  11000, null,         'hold',     '—')
on conflict (id) do nothing;

-- Stamp the two already-released payments with a released_at so the UI shows a
-- date. (Done directly here; in the app, the release trigger sets this.)
update public.payments set released_at = '2026-05-12T14:02:00+08'::timestamptz
  where id = 'e0000001-0000-0000-0000-000000000002' and released_at is null;
update public.payments set released_at = '2026-03-24T16:20:00+08'::timestamptz
  where id = 'e0000001-0000-0000-0000-000000000004' and released_at is null;
