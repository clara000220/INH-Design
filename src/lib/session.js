/* INH — persist "where was the user" so reopening the app lands on the same
   screen instead of the home tab. We only save the lightweight shape of
   navigation (tab name, feed project id, stack entries as {type, projectId})
   — not the full project objects or any transient sheet/dialog/photo state.
   Rehydration happens AFTER projects load, so we can map projectId → project
   with the latest server data.

   The snapshot is per-user (keyed by profile id) so if user A's session
   expires and user B signs in on the same device, they don't inherit A's
   last screen. A generic KEY_SHARED is used for demo mode / unknown user. */

const KEY_SHARED = 'inh-session-v1';
const keyFor = (userId) => userId ? `inh-session-v1:${userId}` : KEY_SHARED;

export function saveSession(snapshot, userId) {
  try {
    const safe = {
      tab: snapshot.tab || 'home',
      feedProjectId: snapshot.feedProjectId || null,
      stackRefs: (snapshot.stack || []).map(e => ({
        type: e?.type,
        projectId: e?.project?.id || null,
      })).filter(e => !!e.type),
      savedAt: Date.now(),
    };
    localStorage.setItem(keyFor(userId), JSON.stringify(safe));
  } catch { /* storage full / disabled — just skip */ }
}

export function loadSession(userId) {
  try {
    // Prefer the per-user snapshot; fall back to the generic one for anyone
    // upgrading from the pre-scoped version so their saved screen still works.
    const raw = localStorage.getItem(keyFor(userId)) || (userId ? localStorage.getItem(KEY_SHARED) : null);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return null;
    return v;
  } catch { return null; }
}

export function clearSession(userId) {
  try {
    localStorage.removeItem(keyFor(userId));
    if (!userId) localStorage.removeItem(KEY_SHARED);
  } catch { /* ignore */ }
}
