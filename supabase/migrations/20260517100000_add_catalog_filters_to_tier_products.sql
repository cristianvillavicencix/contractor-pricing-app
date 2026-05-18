alter table public.company_tier_products
  add column if not exists product_type text not null default '',
  add column if not exists color_name text not null default '',
  add column if not exists color_hex text not null default '';

create index if not exists company_tier_products_company_type_idx
  on public.company_tier_products (company_id, product_type);

create index if not exists company_tier_products_company_brand_idx
  on public.company_tier_products (company_id, product_brand);

create index if not exists company_tier_products_company_color_idx
  on public.company_tier_products (company_id, color_name);
