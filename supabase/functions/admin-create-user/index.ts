// INH — admin-create-user Edge Function
// ---------------------------------------------------------------------------
// Lets an OWNER or ADMIN create a client account directly, with a temporary
// password and NO email confirmation. This MUST run server-side: it uses the
// service_role key (auto-injected by Supabase as SUPABASE_SERVICE_ROLE_KEY),
// which can never be exposed in the browser.
//
// Security:
//   1. The caller must present a valid session JWT (the platform verifies it,
//      and we re-check the user below).
//   2. We look up the caller's role in `profiles`. Only 'owner' / 'admin' pass.
//   3. Target role is clamped: owners may create admin/homeowner, admins may
//      create homeowner only. Nobody creates an 'owner' through this endpoint.
//
// Deploy:  supabase functions deploy admin-create-user
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided
//  automatically — you do NOT paste any key anywhere.)
// ---------------------------------------------------------------------------
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Identify the caller from their JWT.
    const authHeader = req.headers.get('Authorization') ?? '';
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uerr } = await caller.auth.getUser();
    if (uerr || !user) return json({ error: 'Not authenticated' }, 401);

    // Service-role client (bypasses RLS) for the privileged work.
    const admin = createClient(url, service);

    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single();
    const callerRole = prof?.role;
    if (callerRole !== 'owner' && callerRole !== 'admin') {
      return json({ error: 'Only an owner or admin can add accounts' }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    const full_name = String(body.full_name ?? '').trim();
    let role = String(body.role ?? 'homeowner');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'A valid email is required' }, 400);
    if (password.length < 8) return json({ error: 'Temporary password must be at least 8 characters' }, 400);

    const allowed = callerRole === 'owner' ? ['admin', 'homeowner'] : ['homeowner'];
    if (!allowed.includes(role)) role = 'homeowner';

    // Create the user already email-confirmed, so they can sign in immediately.
    const { data: created, error: cerr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (cerr) return json({ error: cerr.message }, 400);
    const newId = created.user?.id;

    // The handle_new_user trigger creates the profile (defaulting to homeowner).
    // Make sure name/contact are set and apply the requested role.
    if (newId) {
      await admin.from('profiles')
        .update({ full_name: full_name || email.split('@')[0], contact: email, role })
        .eq('id', newId);
    }

    return json({ ok: true, userId: newId });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
