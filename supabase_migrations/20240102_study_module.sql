-- Create subjects table
create table public.subjects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default 'from-indigo-500 to-purple-500', 
  level integer default 1,
  xp_current integer default 0,
  xp_next_level integer default 1000,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create study_topics table (Knowledge Garden items)
create table public.study_topics (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  title text not null,
  is_completed boolean default false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create study_sessions table (Logs for Heatmap)
create table public.study_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_id uuid references public.subjects(id) on delete set null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  duration_minutes integer not null,
  topics_covered text[], -- Array of topic names or IDs covered in this session
  notes text,
  xp_earned integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.subjects enable row level security;
alter table public.study_topics enable row level security;
alter table public.study_sessions enable row level security;

-- Policies for subjects
create policy "Users can view their own subjects"
  on public.subjects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own subjects"
  on public.subjects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own subjects"
  on public.subjects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own subjects"
  on public.subjects for delete
  using (auth.uid() = user_id);

-- Policies for study_topics
create policy "Users can view topics of their subjects"
  on public.study_topics for select
  using (exists (select 1 from public.subjects where id = study_topics.subject_id and user_id = auth.uid()));

create policy "Users can insert topics to their subjects"
  on public.study_topics for insert
  with check (exists (select 1 from public.subjects where id = study_topics.subject_id and user_id = auth.uid()));

create policy "Users can update topics of their subjects"
  on public.study_topics for update
  using (exists (select 1 from public.subjects where id = study_topics.subject_id and user_id = auth.uid()));

-- Policies for study_sessions
create policy "Users can view their own sessions"
  on public.study_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on public.study_sessions for insert
  with check (auth.uid() = user_id);
