-- Contact notes (tasks & freeform notes per contact)
create table if not exists public.contact_notes (
  id          uuid        default gen_random_uuid() primary key,
  company_id  uuid        not null,
  contact_id  uuid        not null,
  kind        text        not null default 'note' check (kind in ('note', 'task')),
  body        text        not null default '',
  done        boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.contact_notes enable row level security;

create policy "company_owns_contact_notes" on public.contact_notes
  using  (company_id = current_company_id())
  with check (company_id = current_company_id());

-- Contact files (base64 stored directly, same pattern as company certifications)
create table if not exists public.contact_files (
  id          uuid        default gen_random_uuid() primary key,
  company_id  uuid        not null,
  contact_id  uuid        not null,
  name        text        not null,
  ext         text        not null default '',
  mime_type   text        not null default '',
  size_bytes  integer     not null default 0,
  data_url    text,
  created_at  timestamptz not null default now()
);

alter table public.contact_files enable row level security;

create policy "company_owns_contact_files" on public.contact_files
  using  (company_id = current_company_id())
  with check (company_id = current_company_id());
