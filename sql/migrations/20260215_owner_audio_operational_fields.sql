-- MyPhone operational fields requested by business owner (audio)
-- Safe/idempotent migration for PostgreSQL/Supabase

begin;

-- 1) Stock operational fields
alter table if exists public.stock_items
  add column if not exists provider_name text,
  add column if not exists details text,
  add column if not exists received_at date,
  add column if not exists is_promo boolean not null default false,
  add column if not exists is_sealed boolean not null default false;

update public.stock_items
set received_at = coalesce(received_at, created_at::date)
where received_at is null;

create index if not exists idx_stock_items_received_at on public.stock_items (received_at desc);
create index if not exists idx_stock_items_provider_name on public.stock_items (provider_name);
create index if not exists idx_stock_items_is_promo on public.stock_items (is_promo) where is_promo = true;

-- Extend stock status enum if present.
do $$
begin
  if exists (select 1 from pg_type where typname = 'stock_status') then
    begin
      alter type stock_status add value if not exists 'service_tech';
    exception when duplicate_object then null;
    end;
    begin
      alter type stock_status add value if not exists 'drawer';
    exception when duplicate_object then null;
    end;
  end if;
end
$$;

-- 2) Sales commercial fields
alter table if exists public.sales
  add column if not exists currency text,
  add column if not exists fx_rate_used numeric(12, 2),
  add column if not exists total_usd numeric(14, 2),
  add column if not exists balance_due_ars numeric(14, 2),
  add column if not exists notes text,
  add column if not exists includes_cube_20w boolean not null default false;

update public.sales
set currency = coalesce(currency, 'ARS')
where currency is null;

update public.sales
set balance_due_ars = coalesce(balance_due_ars, 0)
where balance_due_ars is null;

alter table if exists public.sales
  alter column currency set default 'ARS',
  alter column balance_due_ars set default 0;

-- Keep only ARS/USD values
alter table if exists public.sales
  drop constraint if exists sales_currency_chk;

alter table if exists public.sales
  add constraint sales_currency_chk check (currency in ('ARS', 'USD'));

create index if not exists idx_sales_currency on public.sales (currency);
create index if not exists idx_sales_balance_due_ars on public.sales (balance_due_ars) where balance_due_ars > 0;
create index if not exists idx_sales_includes_cube_20w on public.sales (includes_cube_20w) where includes_cube_20w = true;

-- 3) Trade-ins reference fields
alter table if exists public.trade_ins
  add column if not exists sale_ref text,
  add column if not exists customer_name text,
  add column if not exists customer_phone text;

create index if not exists idx_trade_ins_sale_ref on public.trade_ins (sale_ref);

-- 4) Warranty exchange diagnostics
alter table if exists public.warranties
  add column if not exists issue_reason text,
  add column if not exists replacement_stock_item_id uuid,
  add column if not exists replacement_device_label text,
  add column if not exists notes text,
  add column if not exists replaced_at timestamptz;

alter table if exists public.warranties
  drop constraint if exists warranties_replacement_stock_item_id_fkey;

alter table if exists public.warranties
  add constraint warranties_replacement_stock_item_id_fkey
  foreign key (replacement_stock_item_id)
  references public.stock_items(id)
  on delete set null;

create index if not exists idx_warranties_replacement_stock_item_id on public.warranties (replacement_stock_item_id);

-- 5) Installment rules by channel (with/without Mercado Pago)
alter table if exists public.installment_rules
  add column if not exists channel text;

update public.installment_rules
set channel = coalesce(channel, 'standard')
where channel is null;

alter table if exists public.installment_rules
  alter column channel set default 'standard';

alter table if exists public.installment_rules
  drop constraint if exists installment_rules_channel_chk;

alter table if exists public.installment_rules
  add constraint installment_rules_channel_chk check (channel in ('standard', 'mercado_pago'));

create index if not exists idx_installment_rules_channel_brand_installments
  on public.installment_rules (channel, card_brand, installments);

-- 6) Plan canje matrix (iPhone line + battery band)
create table if not exists public.plan_canje_values (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  battery_min smallint not null,
  battery_max smallint not null,
  pct_of_reference numeric(5,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_canje_values_battery_range_chk
    check (battery_min >= 0 and battery_max <= 100 and battery_min <= battery_max),
  constraint plan_canje_values_pct_chk
    check (pct_of_reference >= 0 and pct_of_reference <= 100)
);

create unique index if not exists uq_plan_canje_values_model_battery_band
  on public.plan_canje_values (model, battery_min, battery_max);

-- Seed template values (editable by business)
insert into public.plan_canje_values (model, battery_min, battery_max, pct_of_reference)
values
  ('iPhone 11', 95, 100, 72),
  ('iPhone 11', 90, 94, 68),
  ('iPhone 11', 85, 89, 64),
  ('iPhone 11', 0, 84, 58),
  ('iPhone 12', 95, 100, 75),
  ('iPhone 12', 90, 94, 71),
  ('iPhone 12', 85, 89, 67),
  ('iPhone 12', 0, 84, 61),
  ('iPhone 13', 95, 100, 78),
  ('iPhone 13', 90, 94, 74),
  ('iPhone 13', 85, 89, 70),
  ('iPhone 13', 0, 84, 64),
  ('iPhone 14', 95, 100, 81),
  ('iPhone 14', 90, 94, 77),
  ('iPhone 14', 85, 89, 73),
  ('iPhone 14', 0, 84, 67),
  ('iPhone 15', 95, 100, 84),
  ('iPhone 15', 90, 94, 80),
  ('iPhone 15', 85, 89, 76),
  ('iPhone 15', 0, 84, 70),
  ('iPhone 16', 95, 100, 87),
  ('iPhone 16', 90, 94, 83),
  ('iPhone 16', 85, 89, 79),
  ('iPhone 16', 0, 84, 73)
on conflict do nothing;

commit;
