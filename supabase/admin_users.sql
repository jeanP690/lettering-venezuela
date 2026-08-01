-- ============================================================
-- Admin users compartidos (dashboard multi-usuario en la nube)
-- Ejecutar esto en Supabase SQL Editor
-- ============================================================

create table if not exists admin_users (
    usuario text primary key,
    pass text not null,
    rol text not null default 'editor' check (rol in ('admin', 'editor', 'viewer')),
    creado timestamptz default now()
);

alter table admin_users enable row level security;

drop policy if exists "Allow anon all admin_users" on admin_users;
create policy "Allow anon all admin_users" on admin_users for all using (true) with check (true);
