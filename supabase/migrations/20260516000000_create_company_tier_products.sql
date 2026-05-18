-- Per-company product assignments for Good/Better/Best tiers per trade.

create table if not exists public.company_tier_products (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null,
  trade text not null,
  tier text not null check (tier in ('Good', 'Better', 'Best')),
  product_name text not null default '',
  product_brand text not null default '',
  product_line text not null default '',
  image_url text not null default '',
  warranty_years integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, trade, tier)
);

create or replace function public.update_tier_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tier_products_updated_at on public.company_tier_products;
create trigger set_tier_products_updated_at
  before update on public.company_tier_products
  for each row execute function public.update_tier_products_updated_at();

alter table public.company_tier_products enable row level security;

drop policy if exists "company_users_manage_tier_products" on public.company_tier_products;
create policy "company_users_manage_tier_products"
  on public.company_tier_products
  using (company_id = (select public.current_company_id()))
  with check (company_id = (select public.current_company_id()));
