-- ===========================================================================
-- aponomics practice: AP Microeconomics / Macroeconomics MCQ practice
-- ===========================================================================
--
-- Security model
--   * Students (anon + authenticated) can read only PUBLISHED questions, and
--     only the non-answer columns (column-level grants below). correct_index,
--     explanation and option_explanations are reachable only through the
--     security-definer functions in this file, which enforce the mode rules:
--     a mock's answers are revealed only after the mock is submitted.
--   * Sessions and answers are readable only by their owner. All writes go
--     through functions, so grading, scores and the timer can't be forged.
--   * Only accounts listed in practice_admins can write questions. No client
--     policy can write that table; add yourself in the SQL editor:
--
--       insert into public.practice_admins (user_id)
--       select id from auth.users where email = 'YOUR_EMAIL_HERE';
--
--   * Signed-out students never write to the database: their sessions live
--     in localStorage and are graded with practice_answer_key().
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.practice_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.practice_questions (
  id uuid primary key default gen_random_uuid(),
  course text not null check (course in ('micro', 'macro')),
  unit int not null check (unit between 1 and 6),
  topic text not null check (length(btrim(topic)) > 0),
  -- Only 'mcq' for now; FRQ will extend this check in a later migration.
  question_type text not null default 'mcq' check (question_type in ('mcq')),
  stem text not null check (length(btrim(stem)) >= 15),
  options jsonb,
  correct_index int,
  explanation text not null,
  option_explanations jsonb,
  difficulty int not null check (difficulty between 1 and 3),
  image_url text,
  image_alt text,
  graph jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  source_note text,
  -- Exact-duplicate guard. lib/practice/similarity.ts normalizeStem() mirrors this expression.
  stem_hash text generated always as (
    md5(btrim(regexp_replace(lower(stem), '[^a-z0-9]+', ' ', 'g')))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_questions_mcq_shape check (
    question_type <> 'mcq' or (
      jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4
      and correct_index between 0 and 3
      and jsonb_typeof(option_explanations) = 'array' and jsonb_array_length(option_explanations) = 4
    )
  ),
  constraint practice_questions_graph_shape check (graph is null or jsonb_typeof(graph) = 'object'),
  constraint practice_questions_figure_alt check (
    (image_url is null and graph is null) or length(btrim(coalesce(image_alt, ''))) > 0
  )
);

create unique index if not exists practice_questions_stem_hash_key on public.practice_questions (stem_hash);
create index if not exists practice_questions_bank_idx on public.practice_questions (course, status, unit);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  -- Nullable for forward compatibility; RLS only ever exposes a user's own rows,
  -- and signed-out sessions are kept in the browser instead.
  user_id uuid references auth.users (id) on delete cascade,
  course text not null check (course in ('micro', 'macro')),
  mode text not null check (mode in ('practice', 'mock', 'review')),
  unit_filter int[] not null default '{}',
  question_ids uuid[] not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  time_limit_seconds int check (time_limit_seconds > 0),
  -- The mock clock pauses while the tab is closed; this only ever decreases.
  time_remaining_seconds int check (time_remaining_seconds >= 0),
  score int check (score >= 0)
);

create index if not exists practice_sessions_user_idx on public.practice_sessions (user_id, started_at desc);

create table if not exists public.practice_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions (id) on delete cascade,
  question_id uuid not null references public.practice_questions (id) on delete cascade,
  selected_index int check (selected_index between 0 and 3),
  flagged boolean not null default false,
  eliminated int[] not null default '{}',
  time_spent_seconds int not null default 0 check (time_spent_seconds >= 0),
  is_correct boolean,
  answered_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create index if not exists practice_answers_question_idx on public.practice_answers (question_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.practice_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists practice_questions_touch on public.practice_questions;
create trigger practice_questions_touch
  before update on public.practice_questions
  for each row execute function public.practice_touch_updated_at();

create or replace function public.is_practice_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.practice_admins where user_id = auth.uid());
$$;

create or replace function public.practice_clean_eliminated(p_values int[])
returns int[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array(select distinct x from unnest(p_values) as x where x between 0 and 3 order by x), '{}');
$$;

-- ---------------------------------------------------------------------------
-- Student functions
-- ---------------------------------------------------------------------------

-- Picks questions for a new session. Signed-in: creates the session row and
-- returns its id. Signed-out: returns question ids only (session lives locally).
-- Mocks follow the course blueprint (questions per unit) and fill any
-- shortfall from other units; the timer scales at 70 s/question if the bank
-- can't fill 60 yet. Keep blueprints in sync with lib/practice/courses.ts.
create or replace function public.practice_create_session(
  p_course text,
  p_mode text,
  p_units int[] default '{}',
  p_count int default 10
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_units int[] := coalesce(p_units, '{}');
  v_count int := least(greatest(coalesce(p_count, 10), 1), 60);
  v_ids uuid[] := '{}';
  v_blueprint int[];
  v_limit int;
  v_session_id uuid;
  u int;
begin
  if p_course is null or p_course not in ('micro', 'macro') then
    raise exception 'invalid course' using errcode = '22023';
  end if;
  if p_mode is null or p_mode not in ('practice', 'mock', 'review') then
    raise exception 'invalid mode' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v_units) as x where x is null or x not between 1 and 6) then
    raise exception 'invalid unit' using errcode = '22023';
  end if;

  if p_mode = 'mock' then
    v_blueprint := case p_course
      when 'micro' then array[8, 14, 14, 11, 7, 6]
      else array[4, 9, 13, 12, 15, 7]
    end;
    for u in 1..6 loop
      v_ids := v_ids || array(
        select q.id from public.practice_questions q
        where q.status = 'published' and q.question_type = 'mcq' and q.course = p_course and q.unit = u
        order by random()
        limit v_blueprint[u]
      );
    end loop;
    if cardinality(v_ids) < 60 then
      v_ids := v_ids || array(
        select q.id from public.practice_questions q
        where q.status = 'published' and q.question_type = 'mcq' and q.course = p_course
          and q.id <> all (v_ids)
        order by random()
        limit 60 - cardinality(v_ids)
      );
    end if;
    v_ids := array(select x from unnest(v_ids) as x order by random());
    v_limit := case when cardinality(v_ids) >= 60 then 4200 else cardinality(v_ids) * 70 end;

  elsif p_mode = 'review' then
    if v_uid is null then
      raise exception 'sign in to review mistakes' using errcode = '42501';
    end if;
    -- A question is due for review when its most recent graded (or flagged)
    -- answer was wrong or flagged. Answering it correctly, unflagged, clears it.
    v_ids := array(
      select r.question_id
      from (
        select distinct on (a.question_id) a.question_id, a.is_correct, a.flagged
        from public.practice_answers a
        join public.practice_sessions s on s.id = a.session_id
        where s.user_id = v_uid and s.course = p_course
          and (s.mode <> 'mock' or s.submitted_at is not null)
          and (a.is_correct is not null or a.flagged)
        order by a.question_id, a.answered_at desc
      ) as r
      join public.practice_questions q on q.id = r.question_id and q.status = 'published'
      where (r.is_correct = false or r.flagged)
        and (cardinality(v_units) = 0 or q.unit = any (v_units))
      order by random()
      limit v_count
    );

  else
    v_ids := array(
      select q.id from public.practice_questions q
      where q.status = 'published' and q.question_type = 'mcq' and q.course = p_course
        and (cardinality(v_units) = 0 or q.unit = any (v_units))
      order by random()
      limit v_count
    );
  end if;

  if cardinality(v_ids) > 0 and v_uid is not null then
    insert into public.practice_sessions
      (user_id, course, mode, unit_filter, question_ids, time_limit_seconds, time_remaining_seconds)
    values
      (v_uid, p_course, p_mode, v_units, v_ids, v_limit, v_limit)
    returning id into v_session_id;
  end if;

  return jsonb_build_object(
    'session_id', v_session_id,
    'question_ids', to_jsonb(v_ids),
    'time_limit_seconds', v_limit
  );
end;
$$;

-- Answer key for published questions, used by signed-out sessions (after each
-- practice answer, or once when a mock is submitted). The app never calls this
-- while a mock is in progress.
create or replace function public.practice_answer_key(p_question_ids uuid[])
returns table (question_id uuid, correct_index int, explanation text, option_explanations jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.correct_index, q.explanation, q.option_explanations
  from public.practice_questions q
  where q.id = any (p_question_ids[1:60])
    and (q.status = 'published' or public.is_practice_admin());
$$;

-- Grades one answer in a signed-in practice/review session (instant feedback).
-- The choice is locked once graded. Refuses mock sessions.
create or replace function public.practice_answer_question(
  p_session_id uuid,
  p_question_id uuid,
  p_selected_index int,
  p_flagged boolean default false,
  p_eliminated int[] default '{}',
  p_time_spent_seconds int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.practice_sessions%rowtype;
  q public.practice_questions%rowtype;
  a public.practice_answers%rowtype;
begin
  select * into s from public.practice_sessions where id = p_session_id and user_id = auth.uid();
  if not found then
    raise exception 'session not found' using errcode = 'P0002';
  end if;
  if s.mode = 'mock' then
    raise exception 'mock answers are graded when the mock is submitted' using errcode = '42501';
  end if;
  if s.submitted_at is not null then
    raise exception 'session already finished' using errcode = '22023';
  end if;
  if not (p_question_id = any (s.question_ids)) then
    raise exception 'question is not part of this session' using errcode = '22023';
  end if;
  if p_selected_index is null or p_selected_index not between 0 and 3 then
    raise exception 'invalid option' using errcode = '22023';
  end if;

  select * into q from public.practice_questions where id = p_question_id;
  if not found then
    raise exception 'question not found' using errcode = 'P0002';
  end if;

  select * into a from public.practice_answers where session_id = s.id and question_id = q.id;
  if not found or a.is_correct is null then
    insert into public.practice_answers as pa
      (session_id, question_id, selected_index, flagged, eliminated, time_spent_seconds, is_correct, answered_at)
    values (
      s.id, q.id, p_selected_index, coalesce(p_flagged, false),
      public.practice_clean_eliminated(p_eliminated),
      least(greatest(coalesce(p_time_spent_seconds, 0), 0), 86400),
      p_selected_index = q.correct_index, now()
    )
    on conflict (session_id, question_id) do update set
      selected_index = excluded.selected_index,
      flagged = excluded.flagged,
      eliminated = excluded.eliminated,
      time_spent_seconds = greatest(pa.time_spent_seconds, excluded.time_spent_seconds),
      is_correct = excluded.is_correct,
      answered_at = now()
    returning * into a;
  end if;

  return jsonb_build_object(
    'question_id', q.id,
    'selected_index', a.selected_index,
    'is_correct', a.is_correct,
    'correct_index', q.correct_index,
    'explanation', q.explanation,
    'option_explanations', q.option_explanations
  );
end;
$$;

-- Autosave for signed-in sessions: upserts ungraded selections, flags,
-- eliminations and time spent, and lowers the remaining mock time. Never
-- grades and never changes a choice that has already been graded.
create or replace function public.practice_save_progress(
  p_session_id uuid,
  p_answers jsonb default '[]',
  p_time_remaining_seconds int default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.practice_sessions%rowtype;
  item jsonb;
  v_qid uuid;
  v_sel int;
  v_elim int[];
begin
  select * into s from public.practice_sessions
  where id = p_session_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'session not found' using errcode = 'P0002';
  end if;
  if s.submitted_at is not null then
    raise exception 'session already finished' using errcode = '22023';
  end if;
  if p_answers is not null and jsonb_typeof(p_answers) <> 'array' then
    raise exception 'answers must be an array' using errcode = '22023';
  end if;

  for item in select value from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) loop
    v_qid := (item ->> 'question_id')::uuid;
    continue when v_qid is null or not (v_qid = any (s.question_ids));

    v_sel := (item ->> 'selected_index')::int;
    if v_sel is not null and v_sel not between 0 and 3 then
      v_sel := null;
    end if;
    v_elim := case
      when jsonb_typeof(item -> 'eliminated') = 'array'
        then array(select jsonb_array_elements_text(item -> 'eliminated')::int)
      else '{}'
    end;

    insert into public.practice_answers as pa
      (session_id, question_id, selected_index, flagged, eliminated, time_spent_seconds, answered_at)
    values (
      s.id, v_qid, v_sel,
      coalesce((item ->> 'flagged')::boolean, false),
      public.practice_clean_eliminated(v_elim),
      least(greatest(coalesce((item ->> 'time_spent_seconds')::int, 0), 0), 86400),
      now()
    )
    on conflict (session_id, question_id) do update set
      selected_index = case when pa.is_correct is null then excluded.selected_index else pa.selected_index end,
      flagged = excluded.flagged,
      eliminated = excluded.eliminated,
      time_spent_seconds = greatest(pa.time_spent_seconds, excluded.time_spent_seconds),
      answered_at = case
        when pa.flagged is distinct from excluded.flagged
          or (pa.is_correct is null and pa.selected_index is distinct from excluded.selected_index)
        then now()
        else pa.answered_at
      end;
  end loop;

  if p_time_remaining_seconds is not null and s.time_limit_seconds is not null then
    update public.practice_sessions
    set time_remaining_seconds = greatest(0, least(
      coalesce(time_remaining_seconds, time_limit_seconds), p_time_remaining_seconds
    ))
    where id = s.id;
  end if;
end;
$$;

-- Finishes a session. Mocks are graded here (unanswered questions count as
-- incorrect). Practice/review sessions grade any selection not yet checked.
-- Idempotent: submitting twice returns the same score.
create or replace function public.practice_submit_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.practice_sessions%rowtype;
  v_score int;
  v_answered int;
begin
  select * into s from public.practice_sessions
  where id = p_session_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'session not found' using errcode = 'P0002';
  end if;

  if s.submitted_at is null then
    if s.mode = 'mock' then
      insert into public.practice_answers (session_id, question_id)
      select s.id, q.id from public.practice_questions q where q.id = any (s.question_ids)
      on conflict (session_id, question_id) do nothing;

      update public.practice_answers pa
      set is_correct = (pa.selected_index is not null and pa.selected_index = q.correct_index)
      from public.practice_questions q
      where pa.session_id = s.id and q.id = pa.question_id;
    else
      update public.practice_answers pa
      set is_correct = (pa.selected_index = q.correct_index), answered_at = now()
      from public.practice_questions q
      where pa.session_id = s.id and q.id = pa.question_id
        and pa.is_correct is null and pa.selected_index is not null;
    end if;
  end if;

  select count(*) filter (where is_correct), count(*) filter (where selected_index is not null)
  into v_score, v_answered
  from public.practice_answers
  where session_id = s.id;

  if s.submitted_at is null then
    update public.practice_sessions
    set submitted_at = now(), score = v_score
    where id = s.id;
  end if;

  return jsonb_build_object(
    'score', v_score,
    'answered', v_answered,
    'total', cardinality(s.question_ids)
  );
end;
$$;

-- Answer key for a signed-in session: everything once submitted; before that,
-- only questions already graded (practice/review). Mocks: nothing until submit.
create or replace function public.practice_session_review(p_session_id uuid)
returns table (question_id uuid, correct_index int, explanation text, option_explanations jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  s public.practice_sessions%rowtype;
begin
  select * into s from public.practice_sessions where id = p_session_id and user_id = auth.uid();
  if not found then
    raise exception 'session not found' using errcode = 'P0002';
  end if;
  if s.mode = 'mock' and s.submitted_at is null then
    raise exception 'answers are available after the mock is submitted' using errcode = '42501';
  end if;

  return query
  select q.id, q.correct_index, q.explanation, q.option_explanations
  from public.practice_questions q
  where q.id = any (s.question_ids)
    and (
      s.submitted_at is not null
      or exists (
        select 1 from public.practice_answers pa
        where pa.session_id = s.id and pa.question_id = q.id and pa.is_correct is not null
      )
    );
end;
$$;

-- Aggregated stats for the dashboard and unit progress. p_tz is the student's
-- IANA time zone so the streak follows their calendar days.
create or replace function public.practice_my_stats(p_tz text default 'UTC')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text := coalesce(nullif(p_tz, ''), 'UTC');
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'sign in to see stats' using errcode = '42501';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;

  with mine as (
    select a.question_id, a.is_correct, a.answered_at, s.course, q.unit, q.topic
    from public.practice_answers a
    join public.practice_sessions s on s.id = a.session_id
    join public.practice_questions q on q.id = a.question_id
    where s.user_id = v_uid
      and a.is_correct is not null
      and (s.mode <> 'mock' or a.selected_index is not null)
  )
  select jsonb_build_object(
    'answered', (select count(*) from mine),
    'correct', (select count(*) filter (where is_correct) from mine),
    'unique_questions', (select count(distinct question_id) from mine),
    'by_unit', coalesce((
      select jsonb_agg(jsonb_build_object('course', course, 'unit', unit, 'answered', n, 'correct', c) order by course, unit)
      from (
        select course, unit, count(*) as n, count(*) filter (where is_correct) as c
        from mine group by course, unit
      ) as t
    ), '[]'::jsonb),
    'by_topic', coalesce((
      select jsonb_agg(jsonb_build_object('course', course, 'unit', unit, 'topic', topic, 'answered', n, 'correct', c))
      from (
        select course, unit, topic, count(*) as n, count(*) filter (where is_correct) as c
        from mine group by course, unit, topic
      ) as t
    ), '[]'::jsonb),
    'active_days', coalesce((
      select jsonb_agg(d order by d desc)
      from (
        select distinct (answered_at at time zone v_tz)::date as d
        from mine
        where answered_at > now() - interval '400 days'
      ) as t
    ), '[]'::jsonb),
    -- Same rule as review mode in practice_create_session.
    'review_due', coalesce((
      select jsonb_object_agg(course, n)
      from (
        select r.course, count(*)::int as n
        from (
          select distinct on (s.course, a.question_id) s.course, a.question_id, a.is_correct, a.flagged
          from public.practice_answers a
          join public.practice_sessions s on s.id = a.session_id
          where s.user_id = v_uid
            and (s.mode <> 'mock' or s.submitted_at is not null)
            and (a.is_correct is not null or a.flagged)
          order by s.course, a.question_id, a.answered_at desc
        ) as r
        join public.practice_questions q on q.id = r.question_id and q.status = 'published'
        where r.is_correct = false or r.flagged
        group by r.course
      ) as t
    ), '{}'::jsonb),
    'mocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'course', course, 'submitted_at', submitted_at,
        'score', score, 'total', cardinality(question_ids)
      ) order by submitted_at)
      from public.practice_sessions
      where user_id = v_uid and mode = 'mock' and submitted_at is not null
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin functions
-- ---------------------------------------------------------------------------

-- Full rows (including the answer key) for the admin screen.
create or replace function public.practice_admin_list()
returns setof public.practice_questions
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_practice_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query select * from public.practice_questions order by created_at desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.practice_admins from anon, authenticated;
revoke all on public.practice_questions from anon, authenticated;
revoke all on public.practice_sessions from anon, authenticated;
revoke all on public.practice_answers from anon, authenticated;

-- Students: question content only, never the answer key.
grant select (
  id, course, unit, topic, question_type, stem, options, difficulty,
  image_url, image_alt, graph, status, stem_hash, created_at, updated_at
) on public.practice_questions to anon, authenticated;

-- Admins (gated by RLS): write access to editable columns.
grant insert (
  course, unit, topic, question_type, stem, options, correct_index, explanation,
  option_explanations, difficulty, image_url, image_alt, graph, status, source_note
) on public.practice_questions to authenticated;
grant update (
  course, unit, topic, question_type, stem, options, correct_index, explanation,
  option_explanations, difficulty, image_url, image_alt, graph, status, source_note
) on public.practice_questions to authenticated;
grant delete on public.practice_questions to authenticated;

-- Owners read their own sessions/answers; writes go through functions.
grant select on public.practice_sessions to authenticated;
grant select on public.practice_answers to authenticated;

revoke all on function public.practice_touch_updated_at() from public, anon, authenticated;
revoke all on function public.practice_clean_eliminated(int[]) from public, anon, authenticated;
revoke all on function public.is_practice_admin() from public;
revoke all on function public.practice_create_session(text, text, int[], int) from public;
revoke all on function public.practice_answer_key(uuid[]) from public;
revoke all on function public.practice_answer_question(uuid, uuid, int, boolean, int[], int) from public, anon;
revoke all on function public.practice_save_progress(uuid, jsonb, int) from public, anon;
revoke all on function public.practice_submit_session(uuid) from public, anon;
revoke all on function public.practice_session_review(uuid) from public, anon;
revoke all on function public.practice_my_stats(text) from public, anon;
revoke all on function public.practice_admin_list() from public, anon;

grant execute on function public.is_practice_admin() to anon, authenticated;
grant execute on function public.practice_create_session(text, text, int[], int) to anon, authenticated;
grant execute on function public.practice_answer_key(uuid[]) to anon, authenticated;
grant execute on function public.practice_answer_question(uuid, uuid, int, boolean, int[], int) to authenticated;
grant execute on function public.practice_save_progress(uuid, jsonb, int) to authenticated;
grant execute on function public.practice_submit_session(uuid) to authenticated;
grant execute on function public.practice_session_review(uuid) to authenticated;
grant execute on function public.practice_my_stats(text) to authenticated;
grant execute on function public.practice_admin_list() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.practice_admins enable row level security;
alter table public.practice_questions enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_answers enable row level security;

-- practice_admins: no policies, so clients can neither read nor write it.

drop policy if exists "practice_questions read published" on public.practice_questions;
create policy "practice_questions read published"
  on public.practice_questions for select
  to anon, authenticated
  using (status = 'published' or (select public.is_practice_admin()));

drop policy if exists "practice_questions admin insert" on public.practice_questions;
create policy "practice_questions admin insert"
  on public.practice_questions for insert
  to authenticated
  with check ((select public.is_practice_admin()));

drop policy if exists "practice_questions admin update" on public.practice_questions;
create policy "practice_questions admin update"
  on public.practice_questions for update
  to authenticated
  using ((select public.is_practice_admin()))
  with check ((select public.is_practice_admin()));

-- Published questions can't be deleted (they're referenced by student history);
-- unpublish first, or keep them.
drop policy if exists "practice_questions admin delete drafts" on public.practice_questions;
create policy "practice_questions admin delete drafts"
  on public.practice_questions for delete
  to authenticated
  using ((select public.is_practice_admin()) and status = 'draft');

drop policy if exists "practice_sessions owner read" on public.practice_sessions;
create policy "practice_sessions owner read"
  on public.practice_sessions for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "practice_answers owner read" on public.practice_answers;
create policy "practice_answers owner read"
  on public.practice_answers for select
  to authenticated
  using (exists (
    select 1 from public.practice_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())
  ));
