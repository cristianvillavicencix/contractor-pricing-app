-- Proposal assets stored as real Supabase Storage objects.
-- Metadata is scoped per company so the builder can reuse logos, covers,
-- material images, and gallery images without bloating company_settings.

insert into storage.buckets (id, name, public)
values ('proposal-assets', 'proposal-assets', true)
on conflict (id) do update
set public = excluded.public;

create table if not exists public.proposal_assets (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null,
  name text not null,
  category text not null check (
    category in ('Logos', 'Cover Images', 'Material Images', 'Gallery Images')
  ),
  file_path text not null,
  public_url text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposal_assets_company_created_idx
  on public.proposal_assets (company_id, created_at desc);

create index if not exists proposal_assets_company_category_idx
  on public.proposal_assets (company_id, category, created_at desc);

create unique index if not exists proposal_assets_company_file_path_idx
  on public.proposal_assets (company_id, file_path);

create or replace function public.update_proposal_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_proposal_assets_updated_at on public.proposal_assets;
create trigger set_proposal_assets_updated_at
  before update on public.proposal_assets
  for each row execute function public.update_proposal_assets_updated_at();

alter table public.proposal_assets enable row level security;

drop policy if exists "company_users_manage_proposal_assets" on public.proposal_assets;
create policy "company_users_manage_proposal_assets"
  on public.proposal_assets
  using (company_id = (select public.current_company_id()))
  with check (company_id = (select public.current_company_id()));

comment on table public.proposal_assets is
  'Reusable proposal builder assets. Binary files live in the proposal-assets Storage bucket.';

comment on column public.proposal_assets.file_path is
  'Full Storage object path, prefixed by company_id.';

comment on column public.proposal_assets.public_url is
  'Stable public URL for public proposal-assets bucket. Signed URL fallback can be used if bucket privacy changes.';
