-- Dias da semana por alimento (template): null = todos os dias da refeição; senão subset de 0=Dom..6=Sáb.
-- Só faz sentido com logged_date nulo (item modelo na refeição recorrente).

alter table public.diet_entries
  add column if not exists recurrence_days integer[];

comment on column public.diet_entries.recurrence_days is
  'Dias em que o item modelo aparece; null = todos os dias da refeição recorrente. Ignorado se logged_date não for nulo.';

notify pgrst, 'reload schema';
