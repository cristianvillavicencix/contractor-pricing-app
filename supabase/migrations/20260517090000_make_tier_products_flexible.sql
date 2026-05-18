-- Products should behave like an editable catalog, not a fixed Good/Better/Best matrix.
-- This removes the old fixed-tier check and one-product-per-trade-tier unique constraint.

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.company_tier_products'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%Good%'
      and pg_get_constraintdef(oid) ilike '%Better%'
      and pg_get_constraintdef(oid) ilike '%Best%'
  loop
    execute format('alter table public.company_tier_products drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.company_tier_products
  drop constraint if exists company_tier_products_company_id_trade_tier_key;

create index if not exists company_tier_products_company_trade_tier_idx
  on public.company_tier_products (company_id, trade, tier);
