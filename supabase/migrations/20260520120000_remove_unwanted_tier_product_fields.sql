-- Remove product fields that are not part of the v2 catalog workflow.

drop index if exists public.company_tier_products_company_color_idx;

alter table public.company_tier_products
  drop column if exists color_name,
  drop column if exists color_hex,
  drop column if exists unit_cost,
  drop column if exists labor_cost,
  drop column if exists default_margin,
  drop column if exists default_markup,
  drop column if exists notes;
