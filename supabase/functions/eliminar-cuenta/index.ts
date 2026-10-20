import { createClient } from 'npm:@supabase/supabase-js@2';

// Derecho de supresión: la persona autenticada elimina su propia cuenta. Sus actividades, clases, tareas, valoraciones
// y publicaciones de la Comunidad se borran en cascada (claves foráneas con ON DELETE CASCADE).
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data, error } = await usuario.auth.getUser();
  if (error || !data.user) return json({ error: 'No autorizado' }, 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: esAdmin } = await admin.from('admins').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (esAdmin) return json({ error: 'Una cuenta de administrador no se puede eliminar desde la aplicación.' }, 403);

  const { error: fallo } = await admin.auth.admin.deleteUser(data.user.id);
  if (fallo) return json({ error: 'No se pudo eliminar la cuenta.' }, 500);
  return json({ ok: true });
});
