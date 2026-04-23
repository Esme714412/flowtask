-- ════════════════════════════════
--  FlowTask  Database Schema
-- ════════════════════════════════

-- ── profiles ─────────────────────
create table if not exists profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  avatar_url     text,
  level          int  not null default 1,
  xp             int  not null default 0,
  streak         int  not null default 0,
  last_active_date date,
  created_at     timestamptz default now()
);

-- auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── projects ─────────────────────
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null default '#38bdf8',
  start_date  date,
  end_date    date,
  created_at  timestamptz default now()
);

-- ── tasks ────────────────────────
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  project_id   uuid references projects(id) on delete set null,
  title        text not null,
  notes        text,
  due_date     date,
  importance   int  not null default 3 check (importance between 1 and 5),
  status       text not null default 'todo' check (status in ('todo','done','cancelled')),
  completed_at timestamptz,
  xp_earned    int  not null default 0,
  reminder_at  timestamptz,
  checklist    jsonb default '[]',
  created_at   timestamptz default now()
);

-- ── pomodoro_sessions ─────────────
create table if not exists pomodoro_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  task_id          uuid references tasks(id) on delete set null,
  duration_minutes int  not null default 25,
  completed        boolean not null default false,
  started_at       timestamptz default now()
);

-- ── daily_stats (heatmap + streak) ─
create table if not exists daily_stats (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  date           date not null,
  tasks_completed int not null default 0,
  xp_earned      int not null default 0,
  unique(user_id, date)
);

-- ════════════════════════════════
--  Row Level Security
-- ════════════════════════════════

alter table profiles          enable row level security;
alter table projects          enable row level security;
alter table tasks             enable row level security;
alter table pomodoro_sessions enable row level security;
alter table daily_stats       enable row level security;

-- profiles
create policy "own profile" on profiles
  for all using (auth.uid() = id);

-- projects
create policy "own projects" on projects
  for all using (auth.uid() = user_id);

-- tasks
create policy "own tasks" on tasks
  for all using (auth.uid() = user_id);

-- pomodoro
create policy "own pomodoro" on pomodoro_sessions
  for all using (auth.uid() = user_id);

-- daily stats
create policy "own daily_stats" on daily_stats
  for all using (auth.uid() = user_id);

-- ── weekly_summaries (AI 週報緩存) ─
create table if not exists weekly_summaries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  summary    jsonb not null,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

alter table weekly_summaries enable row level security;

create policy "own weekly_summaries" on weekly_summaries
  for all using (auth.uid() = user_id);
