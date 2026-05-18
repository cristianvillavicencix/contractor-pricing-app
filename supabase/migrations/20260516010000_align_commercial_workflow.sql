-- Safe additive schema alignment for Contacts -> Quotes -> Proposals -> Projects.

alter table public.projects
  add column if not exists quote_id uuid,
  add column if not exists proposal_id uuid,
  add column if not exists selected_option_id uuid,
  add column if not exists selected_tier text,
  add column if not exists approved_amount numeric not null default 0,
  add column if not exists start_date date,
  add column if not exists end_date date;

create unique index if not exists projects_company_proposal_unique
  on public.projects (company_id, proposal_id)
  where proposal_id is not null;

create table if not exists public.quote_line_items (
  id uuid default gen_random_uuid() primary key,
  quote_id uuid not null,
  company_id uuid not null,
  category text not null default 'other',
  description text not null default '',
  quantity numeric not null default 1 check (quantity > 0),
  unit text not null default 'each',
  unit_cost numeric not null default 0 check (unit_cost >= 0),
  total_cost numeric not null default 0 check (total_cost >= 0),
  markup_percent numeric not null default 0 check (markup_percent >= 0),
  margin_percent numeric not null default 0 check (margin_percent >= 0 and margin_percent < 100),
  final_price numeric not null default 0 check (final_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.proposal_options (
  id uuid default gen_random_uuid() primary key,
  quote_id uuid not null,
  company_id uuid not null,
  tier text not null check (tier in ('Good', 'Better', 'Best')),
  title text not null default '',
  description text not null default '',
  material_cost numeric not null default 0 check (material_cost >= 0),
  labor_cost numeric not null default 0 check (labor_cost >= 0),
  equipment_cost numeric not null default 0 check (equipment_cost >= 0),
  subcontractor_cost numeric not null default 0 check (subcontractor_cost >= 0),
  overhead_amount numeric not null default 0 check (overhead_amount >= 0),
  profit_amount numeric not null default 0,
  tax_amount numeric not null default 0 check (tax_amount >= 0),
  contingency_amount numeric not null default 0 check (contingency_amount >= 0),
  total_cost numeric not null default 0 check (total_cost >= 0),
  final_price numeric not null default 0 check (final_price >= 0),
  margin_percent numeric not null default 0 check (margin_percent >= 0 and margin_percent < 100),
  markup_percent numeric not null default 0 check (markup_percent >= 0),
  is_recommended boolean not null default false,
  created_at timestamptz not null default now(),
  unique (company_id, quote_id, tier)
);

create table if not exists public.proposals (
  id uuid default gen_random_uuid() primary key,
  quote_id uuid not null,
  company_id uuid not null,
  contact_id uuid,
  public_token text not null default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted_to_project')
  ),
  title text not null default '',
  message text not null default '',
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  accepted_option_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, quote_id),
  unique (public_token)
);

create table if not exists public.project_costs (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null,
  company_id uuid not null,
  category text not null default 'other',
  description text not null default '',
  amount numeric not null default 0 check (amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid,
  proposal_id uuid,
  company_id uuid not null,
  status text not null default 'unpaid' check (
    status in ('unpaid', 'partial', 'paid', 'refunded', 'cancelled')
  ),
  amount numeric not null default 0 check (amount >= 0),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null,
  name text not null,
  description text not null default '',
  brand text not null default '',
  unit_cost numeric not null default 0 check (unit_cost >= 0),
  labor_cost numeric not null default 0 check (labor_cost >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pricing_settings (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null unique,
  default_overhead_percent numeric not null default 0 check (default_overhead_percent >= 0),
  default_profit_margin_percent numeric not null default 35 check (
    default_profit_margin_percent >= 0 and default_profit_margin_percent < 100
  ),
  default_tax_percent numeric not null default 0 check (default_tax_percent >= 0),
  default_contingency_percent numeric not null default 0 check (default_contingency_percent >= 0),
  use_margin_or_markup text not null default 'margin' check (use_margin_or_markup in ('margin', 'markup')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposal_acceptances (
  id uuid default gen_random_uuid() primary key,
  quote_id uuid,
  company_id uuid not null,
  selected_option text,
  signed_name text,
  signed_at timestamptz,
  contract_checklist jsonb not null default '[]'::jsonb
);

alter table public.proposal_acceptances
  add column if not exists proposal_id uuid,
  add column if not exists contact_id uuid,
  add column if not exists accepted_option_id uuid,
  add column if not exists accepted_by_name text,
  add column if not exists accepted_by_email text,
  add column if not exists signature text,
  add column if not exists ip_address text,
  add column if not exists accepted_at timestamptz;

alter table public.company_tier_products
  add column if not exists product_id uuid,
  add column if not exists name text,
  add column if not exists description text not null default '',
  add column if not exists brand text,
  add column if not exists unit_cost numeric not null default 0 check (unit_cost >= 0),
  add column if not exists labor_cost numeric not null default 0 check (labor_cost >= 0),
  add column if not exists default_margin numeric not null default 0 check (default_margin >= 0 and default_margin < 100),
  add column if not exists default_markup numeric not null default 0 check (default_markup >= 0),
  add column if not exists is_active boolean not null default true;

update public.company_tier_products
set
  name = coalesce(name, product_name),
  brand = coalesce(brand, product_brand)
where name is null or brand is null;

alter table public.quote_line_items enable row level security;
alter table public.proposal_options enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_acceptances enable row level security;
alter table public.project_costs enable row level security;
alter table public.payments enable row level security;
alter table public.products enable row level security;
alter table public.pricing_settings enable row level security;

drop policy if exists "company_users_manage_quote_line_items" on public.quote_line_items;
create policy "company_users_manage_quote_line_items"
  on public.quote_line_items
  using (company_id = (select public.current_company_id()))
  with check (company_id = (select public.current_company_id()));

drop policy if exists "company_users_manage_proposal_options" on public.proposal_options;
create policy "company_users_manage_proposal_options"
  on public.proposal_options
  using (company_id = (select public.current_company_id()))
  with check (company_id = (select public.current_company_id()));

drop policy if exists "company_users_manage_proposals" on public.proposals;
create policy "company_users_manage_proposals"
  on public.proposals
  using (company_id = (select public.current_company_id()))
  with check (company_id = (select public.current_company_id()));

drop policy if exists "company_users_manage_proposal_acceptances" on public.proposal_acceptances;
create policy "company_users_manage_proposal_acceptances"
  on public.proposal_acceptances
  using (company_id = (select public.current_company_id()))
  with check (company_id = (select public.current_company_id()));

drop policy if exists "company_users_manage_project_costs" on public.project_costs;
create policy "company_users_manage_project_costs"
  on public.project_costs
  using (company_id = (select public.current_company_id()))
  with check (company_id = (select public.current_company_id()));

drop policy if exists "company_users_manage_payments" on public.payments;
create policy "company_users_manage_payments"
  on public.payments
  using (company_id = (select public.current_company_id()))
  with check (company_id = (select public.current_company_id()));

drop policy if exists "company_users_manage_products" on public.products;
create policy "company_users_manage_products"
  on public.products
  using (company_id = (select public.current_company_id()))
  with check (company_id = (select public.current_company_id()));

drop policy if exists "company_users_manage_pricing_settings" on public.pricing_settings;
create policy "company_users_manage_pricing_settings"
  on public.pricing_settings
  using (company_id = (select public.current_company_id()))
  with check (company_id = (select public.current_company_id()));
