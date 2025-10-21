-- 1.1 Catálogo de Add-ons (similar a public.plans)
create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                    -- 'REVO_SEND'
  name text not null,                           -- 'REVO Send'
  billing_cycle text not null check (billing_cycle in ('monthly','yearly')),
  currency text not null default 'BRL',
  amount_cents integer not null,
  stripe_price_id text not null unique,         -- price_...
  trial_days integer null,                      -- opcional: ex. 14 se quiser trial do add-on
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(slug, billing_cycle)
);

comment on table public.addons is 'Catálogo local de add-ons mapeado para Stripe Prices.';

-- RLS: leitura pública (landing) e sem escrita por anon/authenticated
alter table public.addons enable row level security;
drop policy if exists "Permitir leitura pública dos addons" on public.addons;
create policy "Permitir leitura pública dos addons" on public.addons for select using (true);
revoke all on public.addons from anon, authenticated;
grant select on public.addons to anon, authenticated;
grant all on public.addons to service_role;

-- 1.2 Estado por empresa (qual add-on está ativo)
create table if not exists public.empresa_addons (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  addon_slug text not null references public.addons(slug),
  status text not null
    check (status in ('trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired')),
  billing_cycle text not null check (billing_cycle in ('monthly','yearly')),
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (empresa_id, addon_slug)
);

create index if not exists empresa_addons_sub_idx on public.empresa_addons(stripe_subscription_id);
create index if not exists empresa_addons_empresa_idx on public.empresa_addons(empresa_id);

-- Trigger de updated_at (idempotente)
create or replace function public.touch_updated_at() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin new.updated_at := now(); return new; end; $$;
alter function public.touch_updated_at() owner to postgres;
revoke all on function public.touch_updated_at() from public;

drop trigger if exists empresa_addons_touch on public.empresa_addons;
create trigger empresa_addons_touch before update on public.empresa_addons
for each row execute function public.touch_updated_at();

-- RLS para empresa_addons (somente membros veem sua empresa)
alter table public.empresa_addons enable row level security;
drop policy if exists "Membros veem seus add-ons" on public.empresa_addons;
create policy "Membros veem seus add-ons"
on public.empresa_addons for select
using (
  exists (
    select 1 from public.empresa_usuarios eu
    where eu.empresa_id = empresa_addons.empresa_id
      and eu.user_id = auth.uid()
  )
);

-- escrita somente via webhooks/service_role
revoke insert, update, delete on public.empresa_addons from anon, authenticated;
grant select on public.empresa_addons to authenticated;
grant all on public.empresa_addons to service_role;

-- 1.3 View de feature flags por empresa (facilita o front travar/destravar)
create or replace view public.empresa_features as
select
  e.id as empresa_id,
  -- REVO Send liberado se status ativo/trial e sem cancelamento programado
  (
    exists (
      select 1
      from public.empresa_addons ea
      where ea.empresa_id = e.id
        and ea.addon_slug = 'REVO_SEND'
        and ea.status in ('active','trialing')
        and coalesce(ea.cancel_at_period_end, false) = false
    )
  ) as revo_send_enabled
from public.empresas e;

alter view public.empresa_features owner to postgres;
-- RLS não se aplica a views; apenas conceda SELECT e confie nas RLS das tabelas base
grant select on public.empresa_features to authenticated;

-- Seed (substitua price_... pelos IDs reais do Stripe):
insert into public.addons (slug, name, billing_cycle, amount_cents, stripe_price_id, trial_days, active)
values
('REVO_SEND','REVO Send','monthly',   4900,  'price_revosend_monthly', 14, true),
('REVO_SEND','REVO Send','yearly',   47880, 'price_revosend_yearly',  14, true)
on conflict (slug, billing_cycle) do update set
    name = excluded.name,
    amount_cents = excluded.amount_cents,
    stripe_price_id = excluded.stripe_price_id,
    trial_days = excluded.trial_days,
    active = excluded.active;

notify pgrst, 'reload schema';
