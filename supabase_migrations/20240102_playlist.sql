-- Playlist de Estudos por Usuário
create table if not exists study_playlist_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  url text not null,
  created_at timestamptz default now()
);

-- RLS (Segurança)
alter table study_playlist_items enable row level security;

create policy "Users can manage their own playlist" 
  on study_playlist_items for all 
  using (auth.uid() = user_id);
