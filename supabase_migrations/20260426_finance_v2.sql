-- =====================================================================
-- Finance v2 - Reescrita completa do módulo financeiro
-- =====================================================================
-- ATENÇÃO: este script remove as tabelas antigas (revenues, investments,
-- expenses) e todos os seus dados. É intencional, conforme decisão do
-- usuário de "refazer do zero".
-- =====================================================================

-- 1) Limpeza do schema antigo
drop table if exists public.expenses cascade;
drop table if exists public.revenues cascade;
drop table if exists public.investments cascade;

-- 2) Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- =====================================================================
-- 3) finance_categories
-- =====================================================================
create table public.finance_categories (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  name          text not null,
  kind          text not null check (kind in ('expense','income','investment')),
  icon          text not null default 'Tag',
  color         text not null default '#6366f1',
  is_archived   boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default timezone('utc'::text, now()),
  updated_at    timestamptz not null default timezone('utc'::text, now())
);

create index idx_finance_categories_user      on public.finance_categories(user_id);
create index idx_finance_categories_user_kind on public.finance_categories(user_id, kind);
create unique index uq_finance_categories_user_name_kind
  on public.finance_categories(user_id, lower(name), kind);

create trigger trg_finance_categories_updated_at
  before update on public.finance_categories
  for each row execute function public.set_updated_at();

alter table public.finance_categories enable row level security;

create policy "categories_select_own" on public.finance_categories
  for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.finance_categories
  for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.finance_categories
  for update using (auth.uid() = user_id);
create policy "categories_delete_own" on public.finance_categories
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- 4) finance_installments  (compras parceladas: cabeçalho)
-- =====================================================================
create table public.finance_installments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  category_id     uuid references public.finance_categories on delete set null,
  title           text not null,
  total_amount    numeric(12,2) not null check (total_amount >= 0),
  total_count     integer not null check (total_count >= 1),
  first_due       date not null,
  payment_method  text,
  notes           text,
  created_at      timestamptz not null default timezone('utc'::text, now()),
  updated_at      timestamptz not null default timezone('utc'::text, now())
);

create index idx_finance_installments_user on public.finance_installments(user_id);

create trigger trg_finance_installments_updated_at
  before update on public.finance_installments
  for each row execute function public.set_updated_at();

alter table public.finance_installments enable row level security;

create policy "installments_select_own" on public.finance_installments
  for select using (auth.uid() = user_id);
create policy "installments_insert_own" on public.finance_installments
  for insert with check (auth.uid() = user_id);
create policy "installments_update_own" on public.finance_installments
  for update using (auth.uid() = user_id);
create policy "installments_delete_own" on public.finance_installments
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- 5) finance_recurring  (despesas/receitas que se repetem)
-- =====================================================================
create table public.finance_recurring (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  category_id     uuid references public.finance_categories on delete set null,
  kind            text not null check (kind in ('expense','income','investment')),
  title           text not null,
  amount          numeric(12,2) not null,
  day_of_month    integer not null check (day_of_month between 1 and 31),
  start_date      date not null,
  end_date        date,
  payment_method  text,
  notes           text,
  active          boolean not null default true,
  created_at      timestamptz not null default timezone('utc'::text, now()),
  updated_at      timestamptz not null default timezone('utc'::text, now())
);

create index idx_finance_recurring_user        on public.finance_recurring(user_id);
create index idx_finance_recurring_user_active on public.finance_recurring(user_id, active);

create trigger trg_finance_recurring_updated_at
  before update on public.finance_recurring
  for each row execute function public.set_updated_at();

alter table public.finance_recurring enable row level security;

create policy "recurring_select_own" on public.finance_recurring
  for select using (auth.uid() = user_id);
create policy "recurring_insert_own" on public.finance_recurring
  for insert with check (auth.uid() = user_id);
create policy "recurring_update_own" on public.finance_recurring
  for update using (auth.uid() = user_id);
create policy "recurring_delete_own" on public.finance_recurring
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- 6) finance_transactions  (núcleo: lançamento unificado)
-- =====================================================================
create table public.finance_transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users on delete cascade,
  kind               text not null check (kind in ('expense','income','investment')),
  category_id        uuid references public.finance_categories on delete set null,
  title              text not null,
  amount             numeric(12,2) not null check (amount >= 0),
  occurred_on        date not null,
  payment_method     text,
  notes              text,
  tags               text[] not null default '{}',
  recurring_id       uuid references public.finance_recurring on delete set null,
  installment_id     uuid references public.finance_installments on delete cascade,
  installment_index  integer,
  paid               boolean not null default true,
  created_at         timestamptz not null default timezone('utc'::text, now()),
  updated_at         timestamptz not null default timezone('utc'::text, now())
);

create index idx_finance_transactions_user            on public.finance_transactions(user_id);
create index idx_finance_transactions_user_date       on public.finance_transactions(user_id, occurred_on desc);
create index idx_finance_transactions_user_kind_date  on public.finance_transactions(user_id, kind, occurred_on desc);
create index idx_finance_transactions_category        on public.finance_transactions(category_id);
create index idx_finance_transactions_installment     on public.finance_transactions(installment_id);
create index idx_finance_transactions_recurring       on public.finance_transactions(recurring_id);

create trigger trg_finance_transactions_updated_at
  before update on public.finance_transactions
  for each row execute function public.set_updated_at();

alter table public.finance_transactions enable row level security;

create policy "transactions_select_own" on public.finance_transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.finance_transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.finance_transactions
  for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.finance_transactions
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- 7) finance_budgets
-- =====================================================================
create table public.finance_budgets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,
  category_id      uuid not null references public.finance_categories on delete cascade,
  monthly_limit    numeric(12,2) not null check (monthly_limit >= 0),
  alert_threshold  integer not null default 80 check (alert_threshold between 0 and 100),
  created_at       timestamptz not null default timezone('utc'::text, now()),
  updated_at       timestamptz not null default timezone('utc'::text, now())
);

create unique index uq_finance_budgets_user_category
  on public.finance_budgets(user_id, category_id);

create trigger trg_finance_budgets_updated_at
  before update on public.finance_budgets
  for each row execute function public.set_updated_at();

alter table public.finance_budgets enable row level security;

create policy "budgets_select_own" on public.finance_budgets
  for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.finance_budgets
  for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.finance_budgets
  for update using (auth.uid() = user_id);
create policy "budgets_delete_own" on public.finance_budgets
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- 8) finance_loans
-- =====================================================================
create table public.finance_loans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users on delete cascade,
  counterpart_name  text not null,
  direction         text not null check (direction in ('lent','borrowed')),
  principal         numeric(12,2) not null check (principal >= 0),
  taken_on          date not null,
  due_date          date,
  status            text not null default 'open' check (status in ('open','partial','paid')),
  notes             text,
  created_at        timestamptz not null default timezone('utc'::text, now()),
  updated_at        timestamptz not null default timezone('utc'::text, now())
);

create index idx_finance_loans_user        on public.finance_loans(user_id);
create index idx_finance_loans_user_status on public.finance_loans(user_id, status);

create trigger trg_finance_loans_updated_at
  before update on public.finance_loans
  for each row execute function public.set_updated_at();

alter table public.finance_loans enable row level security;

create policy "loans_select_own" on public.finance_loans
  for select using (auth.uid() = user_id);
create policy "loans_insert_own" on public.finance_loans
  for insert with check (auth.uid() = user_id);
create policy "loans_update_own" on public.finance_loans
  for update using (auth.uid() = user_id);
create policy "loans_delete_own" on public.finance_loans
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- 9) finance_loan_payments
-- =====================================================================
create table public.finance_loan_payments (
  id          uuid primary key default gen_random_uuid(),
  loan_id     uuid not null references public.finance_loans on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  paid_on     date not null,
  notes       text,
  created_at  timestamptz not null default timezone('utc'::text, now()),
  updated_at  timestamptz not null default timezone('utc'::text, now())
);

create index idx_finance_loan_payments_loan on public.finance_loan_payments(loan_id);
create index idx_finance_loan_payments_user on public.finance_loan_payments(user_id);

create trigger trg_finance_loan_payments_updated_at
  before update on public.finance_loan_payments
  for each row execute function public.set_updated_at();

alter table public.finance_loan_payments enable row level security;

create policy "loan_payments_select_own" on public.finance_loan_payments
  for select using (auth.uid() = user_id);
create policy "loan_payments_insert_own" on public.finance_loan_payments
  for insert with check (auth.uid() = user_id);
create policy "loan_payments_update_own" on public.finance_loan_payments
  for update using (auth.uid() = user_id);
create policy "loan_payments_delete_own" on public.finance_loan_payments
  for delete using (auth.uid() = user_id);

-- Atualiza status do empréstimo automaticamente após pagamento
create or replace function public.update_loan_status()
returns trigger
language plpgsql
as $$
declare
  total_paid numeric(12,2);
  total_principal numeric(12,2);
  loan_uuid uuid;
begin
  loan_uuid := coalesce(new.loan_id, old.loan_id);

  select coalesce(sum(amount), 0) into total_paid
    from public.finance_loan_payments
    where loan_id = loan_uuid;

  select principal into total_principal
    from public.finance_loans
    where id = loan_uuid;

  update public.finance_loans
    set status = case
      when total_paid <= 0 then 'open'
      when total_paid >= total_principal then 'paid'
      else 'partial'
    end
    where id = loan_uuid;

  return null;
end;
$$;

create trigger trg_loan_payments_recalc_status
  after insert or update or delete on public.finance_loan_payments
  for each row execute function public.update_loan_status();

-- =====================================================================
-- 10) finance_attachments  (metadados; binário fica no Storage)
-- =====================================================================
create table public.finance_attachments (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null references public.finance_transactions on delete cascade,
  user_id         uuid not null references auth.users on delete cascade,
  storage_path    text not null,
  file_name       text not null,
  mime_type       text,
  size_bytes      integer,
  created_at      timestamptz not null default timezone('utc'::text, now())
);

create index idx_finance_attachments_tx   on public.finance_attachments(transaction_id);
create index idx_finance_attachments_user on public.finance_attachments(user_id);

alter table public.finance_attachments enable row level security;

create policy "attachments_select_own" on public.finance_attachments
  for select using (auth.uid() = user_id);
create policy "attachments_insert_own" on public.finance_attachments
  for insert with check (auth.uid() = user_id);
create policy "attachments_update_own" on public.finance_attachments
  for update using (auth.uid() = user_id);
create policy "attachments_delete_own" on public.finance_attachments
  for delete using (auth.uid() = user_id);

-- =====================================================================
-- 11) Storage bucket para anexos
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('finance-attachments', 'finance-attachments', false)
on conflict (id) do nothing;

-- Path convention: <user_id>/<transaction_id>/<filename>
create policy "finance_attach_select_own"
  on storage.objects for select
  using (
    bucket_id = 'finance-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "finance_attach_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'finance-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "finance_attach_update_own"
  on storage.objects for update
  using (
    bucket_id = 'finance-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "finance_attach_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'finance-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
