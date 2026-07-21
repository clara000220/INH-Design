// INH — admin-reset-password Edge Function
// ---------------------------------------------------------------------------
// Lets an OWNER (only) reset another user's password without needing an email
// round-trip. Generates a fresh readable password, updates the auth user, and
// mirrors it into account_credentials so it shows up on the Users screen with
// the "reveal / copy" affordance that's already there for accounts owner
// created directly.
//
// Passwords are still stored **hashed** in `auth.users` — Supabase never sees
// the plaintext after this call returns. The mirror in `account_credentials`
// is protected by RLS (owner-only SELECT) and is deliberately a temporary
// aide, not a canonical store.
//
// Security:
//   1. The caller must present a valid session JWT.
//   2. The caller's role in `profiles` must be 'owner'. Admins cannot reset
//      other users' passwords — that would let an admin escalate by resetting
//      the owner's password. Owner is a hard gate.
//   3. Owner cannot reset their own password with this function — they should
//      use the standard password-change flow to avoid locking themselves out.
//   4. Writes an audit row so every reset is traceable (auto-inserted below
//      via the audit_log table; if the table doesn't exist yet, the reset
//      still succeeds — we swallow that particular error).
//
// Deploy:  supabase functions deploy admin-reset-password
// (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided
//  automatically — you never paste a key anywhere.)
// ---------------------------------------------------------------------------
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Readable 10-char password — mixed case + digits, but excludes look-alike
// characters (0/O, 1/l/I) so it's clean to read over the phone or WhatsApp.
function genPassword(len = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[arr[i] % alphabet.length];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uerr } = await caller.auth.getUser();
    if (uerr || !user) return json({ error: 'Not authenticated' }, 401);

    const admin = createClient(url, service);
    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (prof?.role !== 'owner') return json({ error: 'Only an owner can reset passwords' }, 403);

    const body = await req.json().catch(() => ({}));
    const targetId = String(body.userId ?? '').trim();
    if (!targetId) return json({ error: 'userId is required' }, 400);
    if (targetId === user.id) return json({ error: 'Use the account settings to change your own password' }, 400);

    // Confirm the target user exists and grab their email for the credentials mirror.
    const { data: targetProfile } = await admin.from('profiles').select('id, full_name, contact, role').eq('id', targetId).single();
    if (!targetProfile) return json({ error: 'That user does not exist' }, 404);
    if (targetProfile.role === 'owner') return json({ error: 'Cannot reset another owner’s password from here' }, 403);

    // Also fetch the auth email — profiles.contact is set by the sign-up flow
    // but may not always match the auth email, so prefer auth.
    const { data: authRes } = await admin.auth.admin.getUserById(targetId);
    const email = authRes?.user?.email || targetProfile.contact || '';

    const newPassword = genPassword();

    const { error: upErr } = await admin.auth.admin.updateUserById(targetId, { password: newPassword });
    if (upErr) return json({ error: upErr.message }, 400);

    // Mirror into account_credentials so the Users screen shows the new value.
    // upsert on user_id (which is the PK); if the row didn't exist yet we create it.
    await admin.from('account_credentials')
      .upsert({ user_id: targetId, login: email, temp_password: newPassword });

    // Best-effort audit trail. If the audit_log table isn't present, ignore.
    try {
      await admin.from('audit_log').insert({
        actor_id: user.id,
        action: 'reset_password',
        target: `${targetProfile.full_name || email} (${email})`,
      });
    } catch { /* audit table optional */ }

    return json({ ok: true, password: newPassword, login: email });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
