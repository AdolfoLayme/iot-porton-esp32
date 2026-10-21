-- Portón IoT: miembros autorizados e historial de órdenes.
-- Nadie se registra solo: las filas de miembros las crea la función `miembros` (service role).

create table public.miembros (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  rol text not null default 'miembro' check (rol in ('admin', 'miembro')),
  activo boolean not null default true,
  creado timestamptz not null default now()
);

create table public.historial (
  id bigserial primary key,
  ts timestamptz not null default now(),
  user_id text not null,
  orden text not null,
  resultado text not null,
  motivo text not null default ''
);
create index historial_ts on public.historial (ts desc);

alter table public.miembros enable row level security;
alter table public.historial enable row level security;

-- security definer: evita recursión de RLS al consultar miembros desde una política de miembros.
create function public.es_miembro_activo() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros where user_id = auth.uid() and activo);
$$;
create function public.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.miembros where user_id = auth.uid() and activo and rol = 'admin');
$$;

-- Cada miembro ve su propia fila; el admin ve a todos. Escrituras solo por la función `miembros`.
create policy "miembro lee su fila" on public.miembros for select to authenticated
  using (user_id = auth.uid() or public.es_admin());

-- Historial: lo escribe solo el servidor (webhook del ESP32); lo leen los miembros activos.
create policy "miembros leen historial" on public.historial for select to authenticated
  using (public.es_miembro_activo());

revoke all on public.miembros, public.historial from anon;
revoke insert, update, delete on public.miembros, public.historial from authenticated;
