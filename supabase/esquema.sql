-- =====================================================================
-- Recreatic: esquema completo de la base de datos (Supabase / Postgres)
-- =====================================================================
-- Este archivo reúne, en orden, todo lo que ya está aplicado en el proyecto actual.
-- Sirve para reconstruir la base de datos en un proyecto NUEVO (SQL Editor de Supabase).
-- No lo ejecutes sobre el proyecto actual: fallaría con "already exists".
-- Después hay que desplegar la función de servidor de supabase/functions/eliminar-cuenta
-- y crear la primera cuenta de administrador (ver el final del archivo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Actividades de cada persona (copia en la nube)
-- ---------------------------------------------------------------------
create table public.actividades (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  titulo text not null,
  datos jsonb not null,
  modificado bigint not null,
  papelera bigint,
  actualizado timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.actividades enable row level security;
revoke all on public.actividades from anon, authenticated;
grant select, insert, update, delete on public.actividades to authenticated;
create policy "ver las propias" on public.actividades for select to authenticated using ((select auth.uid()) = user_id);
create policy "crear las propias" on public.actividades for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "editar las propias" on public.actividades for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "borrar las propias" on public.actividades for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- 2. Administradores y panel de administración
-- ---------------------------------------------------------------------
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create function public.es_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
create function public.es_admin_de(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = uid);
$$;
revoke execute on function public.es_admin_de(uuid) from public, anon, authenticated;

create function public.admin_resumen() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not public.es_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  select jsonb_build_object(
    'generado', now(),
    'totales', jsonb_build_object(
      'usuarios', (select count(*) from auth.users),
      'nuevos_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'activos_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
      'activos_24h', (select count(*) from auth.users where last_sign_in_at > now() - interval '1 day'),
      'actividades', (select count(*) from public.actividades where papelera is null),
      'en_papelera', (select count(*) from public.actividades where papelera is not null)),
    'usuarios', coalesce((select jsonb_agg(x order by x.ultimo_acceso desc nulls last) from (
      select u.id, u.email,
        coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') as nombre,
        coalesce(u.raw_app_meta_data->>'provider', 'email') as proveedor,
        u.created_at as creado, u.last_sign_in_at as ultimo_acceso,
        (select count(*) from public.actividades a where a.user_id = u.id and a.papelera is null) as actividades,
        (select max(a.modificado) from public.actividades a where a.user_id = u.id) as ultima_edicion,
        public.es_admin_de(u.id) as admin
      from auth.users u) x), '[]'::jsonb),
    'registros_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', d::date, 'n', (select count(*) from auth.users u where u.created_at::date = d::date)) order by d)
      from generate_series(current_date - 29, current_date, interval '1 day') d), '[]'::jsonb),
    'accesos_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', d::date, 'n', (select count(*) from auth.users u where u.last_sign_in_at::date = d::date)) order by d)
      from generate_series(current_date - 29, current_date, interval '1 day') d), '[]'::jsonb),
    'plantillas', coalesce((select jsonb_agg(jsonb_build_object('nombre', p, 'n', n) order by n desc) from (
      select datos->>'plantilla' p, count(*) n from public.actividades where papelera is null group by 1 order by 2 desc limit 10) t), '[]'::jsonb),
    'proveedores', coalesce((select jsonb_agg(jsonb_build_object('nombre', p, 'n', n)) from (
      select coalesce(raw_app_meta_data->>'provider', 'email') p, count(*) n from auth.users group by 1) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke execute on function public.es_admin() from public, anon;
revoke execute on function public.admin_resumen() from public, anon;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.admin_resumen() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Comunidad: actividades que sus autores deciden compartir
-- ---------------------------------------------------------------------
create table public.comunidad (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  autor text not null default 'Anónimo',
  titulo text not null,
  plantilla text not null,
  datos jsonb not null,
  publicado bigint not null,
  copias integer not null default 0,
  etiquetas text[] not null default '{}',
  votos int not null default 0,
  promedio numeric(3,2) not null default 0,
  destacada boolean not null default false,
  primary key (user_id, id)
);
create index comunidad_publicado_idx on public.comunidad (publicado desc);
alter table public.comunidad enable row level security;
revoke all on public.comunidad from anon, authenticated;
grant select on public.comunidad to anon, authenticated;
grant insert, delete on public.comunidad to authenticated;
grant update (autor, titulo, plantilla, datos, publicado, etiquetas) on public.comunidad to authenticated;
create policy comunidad_ver on public.comunidad for select to anon, authenticated using (true);
create policy comunidad_publicar on public.comunidad for insert to authenticated with check ((select auth.uid()) = user_id and copias = 0);
create policy comunidad_editar on public.comunidad for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy comunidad_quitar_propia on public.comunidad for delete to authenticated using ((select auth.uid()) = user_id);
create policy comunidad_quitar_admin on public.comunidad for delete to authenticated using (public.es_admin());

-- Quien publica no puede tocar valoraciones, copias ni "destacada": solo las funciones de más abajo (corren como propietario).
create function public.proteger_comunidad() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.votos := 0; new.promedio := 0; new.destacada := false; new.copias := 0;
    else
      new.votos := old.votos; new.promedio := old.promedio; new.destacada := old.destacada; new.copias := old.copias;
    end if;
  end if;
  return new;
end $$;
create trigger comunidad_proteger before insert or update on public.comunidad for each row execute function public.proteger_comunidad();

create function public.comunidad_copiada(p_user uuid, p_id text) returns void
language sql security definer set search_path = '' as $$
  update public.comunidad set copias = copias + 1 where user_id = p_user and id = p_id;
$$;
revoke execute on function public.comunidad_copiada(uuid, text) from public;
grant execute on function public.comunidad_copiada(uuid, text) to anon, authenticated;

create table public.valoraciones (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  autor_id uuid not null,
  act_id text not null,
  estrellas smallint not null check (estrellas between 1 and 5),
  primary key (user_id, autor_id, act_id)
);
alter table public.valoraciones enable row level security;
revoke all on public.valoraciones from anon, authenticated;
grant select on public.valoraciones to authenticated;
create policy valoraciones_propias on public.valoraciones for select to authenticated using ((select auth.uid()) = user_id);

create function public.valorar(p_autor uuid, p_id text, p_estrellas int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or p_estrellas not between 1 and 5 then raise exception 'No autorizado' using errcode = '42501'; end if;
  if not exists (select 1 from public.comunidad where user_id = p_autor and id = p_id) then return; end if;
  insert into public.valoraciones (user_id, autor_id, act_id, estrellas) values ((select auth.uid()), p_autor, p_id, p_estrellas)
  on conflict (user_id, autor_id, act_id) do update set estrellas = excluded.estrellas;
  update public.comunidad c set votos = s.n, promedio = s.m from (select count(*)::int n, round(avg(estrellas), 2) m from public.valoraciones where autor_id = p_autor and act_id = p_id) s where c.user_id = p_autor and c.id = p_id;
end $$;
create function public.destacar(p_autor uuid, p_id text, p_valor boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.es_admin() then raise exception 'No autorizado' using errcode = '42501'; end if;
  update public.comunidad set destacada = p_valor where user_id = p_autor and id = p_id;
end $$;

create table public.reportes (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null,
  act_id text not null,
  motivo text not null check (char_length(motivo) between 1 and 300),
  user_id uuid default auth.uid(),
  creada bigint not null default (extract(epoch from now()) * 1000)::bigint
);
alter table public.reportes enable row level security;
revoke all on public.reportes from anon, authenticated;
grant select, delete on public.reportes to authenticated;
create policy reportes_admin_ver on public.reportes for select to authenticated using (public.es_admin());
create policy reportes_admin_borrar on public.reportes for delete to authenticated using (public.es_admin());
create function public.reportar(p_autor uuid, p_id text, p_motivo text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if char_length(btrim(coalesce(p_motivo, ''))) not between 1 and 300 then raise exception 'Motivo no válido'; end if;
  if (select count(*) from public.reportes where autor_id = p_autor and act_id = p_id) >= 200 then return; end if;
  insert into public.reportes (autor_id, act_id, motivo) values (p_autor, p_id, btrim(p_motivo));
end $$;

revoke execute on function public.valorar(uuid, text, int), public.destacar(uuid, text, boolean), public.reportar(uuid, text, text) from public;
grant execute on function public.valorar(uuid, text, int), public.destacar(uuid, text, boolean) to authenticated;
grant execute on function public.reportar(uuid, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Clases, tareas y entregas
-- ---------------------------------------------------------------------
create table public.clases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 80),
  codigo text not null unique check (codigo ~ '^[A-Z0-9]{6}$'),
  creada bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create table public.tareas (
  id text primary key check (id ~ '^[a-z0-9]{8,16}$'),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  clase_id uuid references public.clases(id) on delete set null,
  titulo text not null check (char_length(titulo) between 1 and 200),
  plantilla text not null,
  datos jsonb not null,
  limite bigint,
  cerrada boolean not null default false,
  creada bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create table public.entregas (
  id uuid primary key default gen_random_uuid(),
  tarea_id text not null references public.tareas(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 60),
  puntos int not null default 0,
  aciertos int not null default 0,
  errores int not null default 0,
  segundos int not null default 0,
  creada bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create index clases_user_idx on public.clases (user_id);
create index tareas_user_idx on public.tareas (user_id);
create index tareas_clase_idx on public.tareas (clase_id);
create index entregas_tarea_idx on public.entregas (tarea_id);

alter table public.clases enable row level security;
alter table public.tareas enable row level security;
alter table public.entregas enable row level security;
revoke all on public.clases, public.tareas, public.entregas from anon, authenticated;
grant select, insert, update, delete on public.clases, public.tareas to authenticated;
grant select, delete on public.entregas to authenticated;

create policy clases_propias on public.clases for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy tareas_propias on public.tareas for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy entregas_ver on public.entregas for select to authenticated using (exists (select 1 from public.tareas t where t.id = tarea_id and t.user_id = (select auth.uid())));
create policy entregas_borrar on public.entregas for delete to authenticated using (exists (select 1 from public.tareas t where t.id = tarea_id and t.user_id = (select auth.uid())));

-- Los alumnos no tienen cuenta: leen y entregan solo mediante estas funciones (conocer el id de la tarea es el "permiso").
create function public.obtener_tarea(p_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', t.id, 'titulo', t.titulo, 'plantilla', t.plantilla, 'datos', t.datos, 'limite', t.limite, 'cerrada', t.cerrada, 'clase', c.nombre)
  from public.tareas t left join public.clases c on c.id = t.clase_id where t.id = p_id;
$$;
create function public.entregar_tarea(p_tarea text, p_nombre text, p_puntos int, p_aciertos int, p_errores int, p_segundos int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare t public.tareas;
begin
  select * into t from public.tareas where id = p_tarea;
  if not found or t.cerrada or (t.limite is not null and (extract(epoch from now()) * 1000) > t.limite) then return false; end if;
  if char_length(btrim(coalesce(p_nombre, ''))) not between 1 and 60 then return false; end if;
  if (select count(*) from public.entregas where tarea_id = p_tarea) >= 5000 then return false; end if;
  insert into public.entregas (tarea_id, nombre, puntos, aciertos, errores, segundos)
  values (p_tarea, btrim(p_nombre), greatest(0, least(coalesce(p_puntos, 0), 1000000)), greatest(0, least(coalesce(p_aciertos, 0), 100000)), greatest(0, least(coalesce(p_errores, 0), 100000)), greatest(0, least(coalesce(p_segundos, 0), 86400)));
  return true;
end $$;
create function public.tareas_de_clase(p_codigo text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('nombre', c.nombre, 'tareas', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'plantilla', t.plantilla, 'limite', t.limite, 'cerrada', t.cerrada, 'creada', t.creada) order by t.creada desc) from public.tareas t where t.clase_id = c.id), '[]'::jsonb))
  from public.clases c where c.codigo = upper(btrim(p_codigo));
$$;
revoke execute on function public.obtener_tarea(text), public.entregar_tarea(text, text, int, int, int, int), public.tareas_de_clase(text) from public;
grant execute on function public.obtener_tarea(text), public.entregar_tarea(text, text, int, int, int, int), public.tareas_de_clase(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Endurecimiento opcional: las funciones que exigen sesión no necesitan ser invocables sin ella
--    (ya se protegen por dentro; esto solo evita la llamada). Es seguro ejecutarlo también en el proyecto actual.
-- ---------------------------------------------------------------------
revoke execute on function public.valorar(uuid, text, int), public.destacar(uuid, text, boolean) from anon;

-- ---------------------------------------------------------------------
-- 6. Después de ejecutar este archivo
-- ---------------------------------------------------------------------
-- a) Desplegar la función de servidor de supabase/functions/eliminar-cuenta (permite "Eliminar mi cuenta").
-- b) Crear la cuenta de administrador: registrarse en la app con el correo del administrador y luego ejecutar:
--      insert into public.admins (user_id) select id from auth.users where email = 'CORREO_DEL_ADMINISTRADOR';
-- c) Authentication > URL Configuration: Site URL y Redirect URLs de la app; Providers: activar Google.
