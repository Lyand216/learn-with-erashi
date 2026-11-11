-- Catatan belajar: tabel data belajar per pengguna.
-- Jalankan file ini di SQL Editor Supabase, atau dengan `supabase db push`.

create table if not exists public.notes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  kind text not null default 'Chunk',
  topic text not null default '',
  body text not null default '',
  color text not null default 'y',
  note_date date not null default current_date,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null default '',
  answer text not null default '',
  topic text not null default '',
  box int not null default 0,
  lapse int not null default 0,
  due date not null default current_date,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  minutes int not null default 0,
  mode text not null default 'focus',
  topic text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.journal (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  hardest text not null default '',
  understood text not null default '',
  tomorrow text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.checklist (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  item_id text not null,
  done boolean not null default false,
  primary key (user_id, day, item_id)
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  focus_minutes int not null default 25,
  diffuse_minutes int not null default 5,
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_idx on public.notes (user_id);
create index if not exists cards_user_idx on public.cards (user_id);
create index if not exists focus_sessions_user_idx on public.focus_sessions (user_id);
create index if not exists journal_user_idx on public.journal (user_id);

alter table public.notes enable row level security;
alter table public.cards enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.journal enable row level security;
alter table public.checklist enable row level security;
alter table public.settings enable row level security;

-- auth.uid() dibungkus (select ...) supaya Postgres mengevaluasinya sekali per query,
-- bukan sekali per baris.
create policy "notes milik sendiri" on public.notes
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "cards milik sendiri" on public.cards
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "focus_sessions milik sendiri" on public.focus_sessions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "journal milik sendiri" on public.journal
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "checklist milik sendiri" on public.checklist
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "settings milik sendiri" on public.settings
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Satu panggilan RPC untuk menyimpan seluruh dataset secara atomik.
create or replace function public.save_dataset(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Tidak terautentikasi';
  end if;

  delete from public.notes n
  where n.user_id = v_uid
    and not exists (
      select 1 from jsonb_array_elements(coalesce(payload -> 'notes', '[]'::jsonb)) e
      where e ->> 'id' = n.id
    );

  insert into public.notes (id, user_id, title, kind, topic, body, color, note_date, position, created_at)
  select r.id, v_uid, r.title, r.kind, r.topic, r.body, r.color,
         coalesce(r.note_date, current_date), coalesce(r.position, 0), now()
  from jsonb_to_recordset(coalesce(payload -> 'notes', '[]'::jsonb))
    as r(id text, title text, kind text, topic text, body text, color text, note_date date, position int)
  on conflict (id) do update
    set title = excluded.title,
        kind = excluded.kind,
        topic = excluded.topic,
        body = excluded.body,
        color = excluded.color,
        note_date = excluded.note_date,
        position = excluded.position
    where public.notes.user_id = v_uid;

  delete from public.cards c
  where c.user_id = v_uid
    and not exists (
      select 1 from jsonb_array_elements(coalesce(payload -> 'cards', '[]'::jsonb)) e
      where e ->> 'id' = c.id
    );

  insert into public.cards (id, user_id, question, answer, topic, box, lapse, due, position, created_at)
  select r.id, v_uid, r.question, r.answer, r.topic, coalesce(r.box, 0), coalesce(r.lapse, 0),
         coalesce(r.due, current_date), coalesce(r.position, 0), now()
  from jsonb_to_recordset(coalesce(payload -> 'cards', '[]'::jsonb))
    as r(id text, question text, answer text, topic text, box int, lapse int, due date, position int)
  on conflict (id) do update
    set question = excluded.question,
        answer = excluded.answer,
        topic = excluded.topic,
        box = excluded.box,
        lapse = excluded.lapse,
        due = excluded.due,
        position = excluded.position
    where public.cards.user_id = v_uid;

  delete from public.focus_sessions s
  where s.user_id = v_uid
    and not exists (
      select 1 from jsonb_array_elements(coalesce(payload -> 'sessions', '[]'::jsonb)) e
      where e ->> 'id' = s.id
    );

  insert into public.focus_sessions (id, user_id, day, minutes, mode, topic, position, created_at)
  select r.id, v_uid, coalesce(r.day, current_date), coalesce(r.minutes, 0), r.mode, r.topic,
         coalesce(r.position, 0), now()
  from jsonb_to_recordset(coalesce(payload -> 'sessions', '[]'::jsonb))
    as r(id text, day date, minutes int, mode text, topic text, position int)
  on conflict (id) do update
    set day = excluded.day,
        minutes = excluded.minutes,
        mode = excluded.mode,
        topic = excluded.topic,
        position = excluded.position
    where public.focus_sessions.user_id = v_uid;

  delete from public.journal j
  where j.user_id = v_uid
    and not exists (
      select 1 from jsonb_array_elements(coalesce(payload -> 'journal', '[]'::jsonb)) e
      where e ->> 'id' = j.id
    );

  insert into public.journal (id, user_id, day, hardest, understood, tomorrow, position, created_at)
  select r.id, v_uid, coalesce(r.day, current_date), r.hardest, r.understood, r.tomorrow,
         coalesce(r.position, 0), now()
  from jsonb_to_recordset(coalesce(payload -> 'journal', '[]'::jsonb))
    as r(id text, day date, hardest text, understood text, tomorrow text, position int)
  on conflict (id) do update
    set day = excluded.day,
        hardest = excluded.hardest,
        understood = excluded.understood,
        tomorrow = excluded.tomorrow,
        position = excluded.position
    where public.journal.user_id = v_uid;

  delete from public.checklist c
  where c.user_id = v_uid
    and not exists (
      select 1
      from jsonb_each(coalesce(payload -> 'checklist', '{}'::jsonb)) d
      cross join lateral jsonb_each(d.value) i
      where d.key = c.day::text and i.key = c.item_id
    );

  insert into public.checklist (user_id, day, item_id, done)
  select v_uid,
         case when d.key ~ '^\d{4}-\d{2}-\d{2}$' then d.key::date else current_date end,
         i.key,
         coalesce(i.value, 'false')::boolean
  from jsonb_each(coalesce(payload -> 'checklist', '{}'::jsonb)) d
  cross join lateral jsonb_each(d.value) i
  on conflict (user_id, day, item_id) do update
    set done = excluded.done;

  insert into public.settings (user_id, focus_minutes, diffuse_minutes, updated_at)
  select v_uid, coalesce(s.focus_minutes, 25), coalesce(s.diffuse_minutes, 5), now()
  from jsonb_to_recordset(jsonb_build_array(coalesce(payload -> 'settings', '{}'::jsonb)))
    as s(focus_minutes int, diffuse_minutes int)
  on conflict (user_id) do update
    set focus_minutes = excluded.focus_minutes,
        diffuse_minutes = excluded.diffuse_minutes,
        updated_at = now();
end;
$$;
