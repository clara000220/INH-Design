/* INH — persist "where was the user" so reopening the app lands on the same
   screen instead of the home tab. We only save the lightweight shape of
   navigation (tab name, feed project id, stack entries as {type, projectId})
   — not the full project objects or any transient sheet/dialog/photo state.
   Rehydration happens AFTER projects load, so we can map projectId → project
   with the latest server data. */

const KEY = 'inh-session-v1';

export function saveSession(snapshot) {
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
    localStorage.setItem(KEY, JSON.stringify(safe));
  } catch { /* storage full / disabled — just skip */ }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return null;
    return v;
  } catch { return null; }
}

export function clearSession() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
