/* INH — Supabase data access. Functions return data already mapped to the
   shape the UI expects, so screens stay presentational. RLS on the server
   decides what each role can actually read/write; these calls just ask. */
import { supabase } from './supabase.js';

/* ----------------------------- formatting ----------------------------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const TONES = ['#6b6355', '#8a7d6a', '#5e6b6a', '#76706a', '#7a6f63', '#646a5c'];

const d = (s) => (s ? new Date(s + (s.length === 10 ? 'T00:00:00' : '')) : null);
const fmtDate = (s) => { const x = d(s); return x ? `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}` : ''; };
const fmtDayMon = (s) => { const x = d(s); return x ? `${x.getDate()} ${MONTHS[x.getMonth()]}` : ''; };
const fmtRange = (a, b) => { const x = fmtDayMon(a), y = fmtDayMon(b); return x && y ? `${x} – ${y}` : (x || y || ''); };
const fmtSize = (n) => (n ? (n / 1048576).toFixed(1) + ' MB' : '');
const initialsOf = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
const todayISO = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

/* ------------------------------ profile ------------------------------- */
export async function getMyProfile() {
  const { data: u } = await supabase.auth.getUser();
  const id = u?.user?.id;
  if (!id) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) throw error;
  return { ...data, initials: data.initials || initialsOf(data.full_name) };
}

export async function updateMyName(fullName) {
  const { data: u } = await supabase.auth.getUser();
  const id = u?.user?.id;
  const { error } = await supabase.from('profiles')
    .update({ full_name: fullName, initials: initialsOf(fullName) }).eq('id', id);
  if (error) throw error;
}

/* ------------------------------ projects ------------------------------ */
export async function listProjects() {
  const { data, error } = await supabase.from('projects')
    .select('*').order('code', { ascending: true });
  if (error) throw error;
  return (data || []).map(p => ({
    id: p.id, name: p.name, code: p.code, address: p.address, type: p.type,
    progress: p.progress, status: p.status, est_handover: p.est_handover,
  }));
}

export async function createProject({ name, code, address, type, est_handover }) {
  const { data, error } = await supabase.from('projects')
    .insert({ name, code, address, type, est_handover: est_handover || null, progress: 0, status: 'pending' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateProjectProgress(id, progress) {
  const status = progress >= 100 ? 'ontrack' : undefined;
  const patch = { progress };
  if (status) patch.status = status;
  const { error } = await supabase.from('projects').update(patch).eq('id', id);
  if (error) throw error;
}

/* --------------------------- project detail --------------------------- */
export async function listPhases(projectId) {
  const { data, error } = await supabase.from('phases')
    .select('*, phase_tasks(id, title, note, done, sort_order, due_date, end_date)')
    .eq('project_id', projectId).order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map(p => ({
    id: p.id, name: p.name, status: p.status, pct: p.pct,
    dates: fmtRange(p.start_date, p.end_date),
    tasks: (p.phase_tasks || [])
      .slice().sort((a, b) => a.sort_order - b.sort_order)
      .map(t => ({ id: t.id, title: t.title, note: t.note || '', done: t.done, due_date: t.due_date, end_date: t.end_date })),
  }));
}

export async function addPhase(projectId, { name, status = 'upcoming', pct = 0, start_date, end_date, tasks = [] }) {
  const { data: rows } = await supabase.from('phases')
    .select('sort_order').eq('project_id', projectId).order('sort_order', { ascending: false }).limit(1);
  const sort_order = (rows?.[0]?.sort_order ?? 0) + 1;
  const { data: phase, error } = await supabase.from('phases').insert({
    project_id: projectId, name, status, pct,
    start_date: start_date || null, end_date: end_date || null, sort_order,
  }).select('id').single();
  if (error) throw error;
  const clean = (tasks || []).map(t => (typeof t === 'string' ? t : t?.title)).map(s => (s || '').trim()).filter(Boolean);
  if (clean.length) {
    const { error: te } = await supabase.from('phase_tasks').insert(
      clean.map((title, i) => ({ phase_id: phase.id, project_id: projectId, title, sort_order: i }))
    );
    if (te) throw te;
  }
  return phase.id;
}

// Add a single sub-task to an existing phase.
export async function addPhaseTask(phaseId, projectId, title) {
  const { data: rows } = await supabase.from('phase_tasks')
    .select('sort_order').eq('phase_id', phaseId).order('sort_order', { ascending: false }).limit(1);
  const sort_order = (rows?.[0]?.sort_order ?? -1) + 1;
  const { error } = await supabase.from('phase_tasks')
    .insert({ phase_id: phaseId, project_id: projectId, title: title.trim(), sort_order });
  if (error) throw error;
}

// Tick / untick a phase sub-task. Ticking auto-stamps today's end (completion)
// date; un-ticking clears it.
export async function setPhaseTaskDone(id, done) {
  const { error } = await supabase.from('phase_tasks')
    .update({ done, end_date: done ? todayISO() : null }).eq('id', id);
  if (error) throw error;
}

// Set/clear an item's end (completion) date.
export async function setPhaseTaskEnd(id, date) {
  const { error } = await supabase.from('phase_tasks').update({ end_date: date || null }).eq('id', id);
  if (error) throw error;
}

// Save the free-text remark on a sub-task.
export async function setPhaseTaskNote(id, note) {
  const { error } = await supabase.from('phase_tasks').update({ note: note || null }).eq('id', id);
  if (error) throw error;
}

// Set/clear an item's date. A dated item appears on the weekly schedule.
export async function setPhaseTaskDate(id, date) {
  const { error } = await supabase.from('phase_tasks').update({ due_date: date || null }).eq('id', id);
  if (error) throw error;
}

// Attach photos to a specific sub-task. Creates an update (tagged with task_id)
// so the photos also show in the Updates feed, and returns nothing.
export async function uploadTaskPhotos(projectId, taskId, room, files = []) {
  const { data: upd, error } = await supabase.from('updates')
    .insert({ project_id: projectId, room, task_id: taskId, is_new: true }).select('id').single();
  if (error) throw error;
  const list = Array.from(files);
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    const safe = f.name.replace(/[^\w.\-]+/g, '_');
    const path = `${projectId}/${upd.id}/${i}-${safe}`;
    const { error: ue } = await supabase.storage.from('update-photos').upload(path, f, { upsert: false });
    if (ue) throw ue;
    const { error: pe } = await supabase.from('update_photos')
      .insert({ update_id: upd.id, storage_path: path, sort_order: i });
    if (pe) throw pe;
  }
  return upd.id;
}

// All photos attached to a sub-task, newest first, as signed URLs.
export async function listTaskPhotos(taskId) {
  const { data, error } = await supabase.from('updates')
    .select('id, captured_on, update_photos(storage_path, sort_order)')
    .eq('task_id', taskId).order('captured_on', { ascending: false });
  if (error) throw error;
  const paths = [];
  (data || []).forEach(u => (u.update_photos || [])
    .slice().sort((a, b) => a.sort_order - b.sort_order)
    .forEach(p => paths.push(p.storage_path)));
  if (!paths.length) return [];
  const { data: signed } = await supabase.storage.from('update-photos').createSignedUrls(paths, 3600);
  return (signed || []).map(s => s.signedUrl).filter(Boolean);
}

// Edit a project's details (name, code, address, type, est. handover).
export async function updateProject(id, patch = {}) {
  const clean = {};
  ['name', 'code', 'address', 'type', 'est_handover'].forEach(k => {
    if (patch[k] !== undefined) clean[k] = patch[k] === '' ? null : patch[k];
  });
  const { error } = await supabase.from('projects').update(clean).eq('id', id);
  if (error) throw error;
}

export async function deletePhase(id) {
  const { error } = await supabase.from('phases').delete().eq('id', id);
  if (error) throw error;
}

export async function deletePhaseTask(id) {
  const { error } = await supabase.from('phase_tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteScheduleItem(id) {
  const { error } = await supabase.from('schedule_items').delete().eq('id', id);
  if (error) throw error;
}

// Update an existing phase (e.g. mark complete, change pct/status/name/dates).
export async function updatePhase(id, patch = {}) {
  const clean = {};
  ['name', 'status', 'pct', 'start_date', 'end_date'].forEach(k => {
    if (patch[k] !== undefined) clean[k] = patch[k];
  });
  if (clean.status === 'completed' && patch.pct === undefined) clean.pct = 100;
  const { error } = await supabase.from('phases').update(clean).eq('id', id);
  if (error) throw error;
}

// Persist a new phase order. Writes sort_order = array index for each id,
// which self-heals any gaps/duplicates from earlier inserts.
export async function reorderPhases(orderedIds = []) {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from('phases').update({ sort_order: i }).eq('id', orderedIds[i]);
    if (error) throw error;
  }
}

// Persist a new sub-task order within a phase.
export async function reorderPhaseTasks(orderedIds = []) {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from('phase_tasks').update({ sort_order: i }).eq('id', orderedIds[i]);
    if (error) throw error;
  }
}

export async function addScheduleItem(projectId, { title, scheduled_date, state = 'upcoming' }) {
  const { error } = await supabase.from('schedule_items')
    .insert({ project_id: projectId, title, scheduled_date, state });
  if (error) throw error;
}

// Update a schedule item's state (e.g. tick it complete, or reopen it).
export async function setScheduleState(id, state) {
  const { error } = await supabase.from('schedule_items').update({ state }).eq('id', id);
  if (error) throw error;
}

export async function listSchedule(projectId) {
  const { data, error } = await supabase.from('schedule_items')
    .select('*').eq('project_id', projectId).order('scheduled_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(s => {
    const x = d(s.scheduled_date);
    return {
      id: s.id, title: s.title, state: s.state, iso: s.scheduled_date,
      day: x ? DAYS[x.getDay()] : '', date: x ? String(x.getDate()) : '',
      when: s.state === 'today' ? 'Today' : (x ? DAYS[x.getDay()][0] + DAYS[x.getDay()].slice(1).toLowerCase() : ''),
    };
  });
}

export async function listUpdates(projectId) {
  const { data, error } = await supabase.from('updates')
    .select('*, update_photos(storage_path, sort_order)').eq('project_id', projectId)
    .order('captured_on', { ascending: false });
  if (error) throw error;
  const rows = data || [];
  const sorted = (u) => (u.update_photos || []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const firstPaths = rows.map(u => sorted(u)[0]?.storage_path).filter(Boolean);
  const urlByPath = {};
  if (firstPaths.length) {
    const { data: signed } = await supabase.storage.from('update-photos').createSignedUrls(firstPaths, 3600);
    (signed || []).forEach(s => { if (s.signedUrl) urlByPath[s.path] = s.signedUrl; });
  }
  return rows.map((u, i) => {
    const first = sorted(u)[0]?.storage_path;
    return {
      id: u.id, room: u.room, isNew: u.is_new,
      date: fmtDate(u.captured_on),
      count: sorted(u).length,
      tone: TONES[i % TONES.length],
      thumb: first ? urlByPath[first] || null : null,
    };
  });
}

// Create an update and upload its photos to the update-photos bucket.
// Path convention: <project_id>/<update_id>/<n>-<file> so storage RLS can
// extract the project id from the first segment.
export async function uploadUpdate(projectId, room, files = []) {
  const { data: upd, error } = await supabase.from('updates')
    .insert({ project_id: projectId, room, is_new: true }).select('id').single();
  if (error) throw error;
  const list = Array.from(files);
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    const safe = f.name.replace(/[^\w.\-]+/g, '_');
    const path = `${projectId}/${upd.id}/${i}-${safe}`;
    const { error: ue } = await supabase.storage.from('update-photos').upload(path, f, { upsert: false });
    if (ue) throw ue;
    const { error: pe } = await supabase.from('update_photos')
      .insert({ update_id: upd.id, storage_path: path, sort_order: i });
    if (pe) throw pe;
  }
  return upd.id;
}

export async function listDocuments(projectId) {
  const { data, error } = await supabase.from('documents')
    .select('*').eq('project_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  const kindLabel = { invoice: 'PDF', plan: 'PDF', doc: 'PDF' };
  return (data || []).map(doc => ({
    id: doc.id, name: doc.name, kind: doc.kind, ready: doc.ready, storage_path: doc.storage_path,
    meta: doc.ready
      ? [kindLabel[doc.kind], fmtSize(doc.file_size), fmtDate(doc.issued_on)].filter(Boolean).join(' · ')
      : 'Available after handover',
  }));
}

// Upload a document file and register it. Path: <project_id>/<ts>-<file>.
export async function uploadDocument(projectId, file, { name, kind = 'doc' } = {}) {
  const safe = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${projectId}/${Date.now()}-${safe}`;
  const { error: ue } = await supabase.storage.from('documents').upload(path, file, { upsert: false });
  if (ue) throw ue;
  const { error } = await supabase.from('documents').insert({
    project_id: projectId, name: name || file.name, kind,
    file_size: file.size, storage_path: path, ready: true,
    issued_on: new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
}

export async function getDocumentUrl(storagePath) {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/* ------------------------------- fees --------------------------------- */
// Owner-only at the RLS layer; non-owners get an empty payments set.
export async function listProjectFees() {
  const [{ data: projects, error: pe }, { data: payments, error: ye }] = await Promise.all([
    supabase.from('projects').select('*').order('code'),
    supabase.from('payments').select('project_id, amount, status'),
  ]);
  if (pe) throw pe;
  if (ye) throw ye;
  const byProject = {};
  (payments || []).forEach(p => {
    const b = byProject[p.project_id] || (byProject[p.project_id] = { committed: 0, released: 0, pending: 0 });
    const amt = Number(p.amount);
    b.committed += amt;
    if (p.status === 'released') b.released += amt;
    else b.pending += amt;
  });
  return (projects || []).map(p => {
    const b = byProject[p.id] || { committed: 0, released: 0, pending: 0 };
    return {
      id: p.id, name: p.name, code: p.code, status: p.status,
      committed: b.committed, released: b.released, pending: b.pending,
      releasedPct: b.committed ? Math.round((b.released / b.committed) * 100) : 0,
    };
  });
}

export async function listPayments(projectId) {
  const { data, error } = await supabase.from('payments')
    .select('*').eq('project_id', projectId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(p => ({
    id: p.id, contractor: p.contractor, stage: p.stage, amount: Number(p.amount),
    status: p.status, method: p.method, due_date: p.due_date,
    date: p.status === 'released'
      ? 'Released ' + fmtDayMon(p.released_at || p.due_date)
      : p.status === 'overdue' ? 'Overdue ' + fmtDayMon(p.due_date)
      : p.status === 'hold' ? 'On hold'
      : p.due_date ? 'Due ' + fmtDayMon(p.due_date) : '',
  }));
}

export async function setPaymentStatus(id, status) {
  const { error } = await supabase.from('payments').update({ status }).eq('id', id);
  if (error) throw error; // trigger writes the audit row + stamps released_at
}

// Owner-only (RLS): add a contractor payment to a project.
export async function addPayment(projectId, { contractor, stage, amount, method, due_date, status = 'pending' }) {
  const { error } = await supabase.from('payments').insert({
    project_id: projectId, contractor, stage, amount,
    method, due_date: due_date || null, status,
  });
  if (error) throw error;
}

// Owner-only: edit a payment's details.
export async function updatePayment(id, patch = {}) {
  const clean = {};
  ['contractor', 'stage', 'amount', 'method', 'due_date', 'status'].forEach(k => {
    if (patch[k] !== undefined) clean[k] = patch[k] === '' ? null : patch[k];
  });
  const { error } = await supabase.from('payments').update(clean).eq('id', id);
  if (error) throw error;
}

// Owner-only: delete a payment.
export async function deletePayment(id) {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
}

export async function listAudit() {
  const { data, error } = await supabase.from('audit_log')
    .select('*').order('created_at', { ascending: false }).limit(20);
  if (error) throw error;
  return (data || []).map(a => ({
    actor: a.actor_label, action: a.action,
    when: new Date(a.created_at).toLocaleString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  }));
}

/* ---------------------------- users / team ---------------------------- */
export async function listUsers() {
  const [{ data: profiles, error: pe }, { data: members, error: me }] = await Promise.all([
    supabase.from('profiles').select('*').order('role'),
    supabase.from('project_members').select('user_id'),
  ]);
  if (pe) throw pe;
  if (me) throw me;
  const counts = {};
  (members || []).forEach(m => { counts[m.user_id] = (counts[m.user_id] || 0) + 1; });
  return (profiles || []).map(u => ({
    id: u.id, name: u.full_name, contact: u.contact, role: u.role,
    initials: u.initials || initialsOf(u.full_name),
    projects: counts[u.id] || 0,
  }));
}

// Owner/admin: create a client account directly (temp password, no email
// confirmation). Runs through the admin-create-user Edge Function, which holds
// the service_role key server-side and re-checks the caller's role.
export async function adminCreateUser({ email, password, fullName, role = 'homeowner' }) {
  // NOTE: the deployed Edge Function's URL slug is 'bright-service' (Supabase
  // locks the slug at creation; the dashboard title was renamed but the slug
  // stays). The app must invoke by slug, so this string must match the slug.
  const { data, error } = await supabase.functions.invoke('bright-service', {
    body: { email, password, full_name: fullName, role },
  });
  if (error) {
    let msg = error.message || 'Could not create account';
    try { const ctx = await error.context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// Store the login + temporary password for an account just created, so the
// owner can look them up later. RLS limits SELECT to the owner.
export async function saveCredential(userId, login, tempPassword) {
  const { error } = await supabase.from('account_credentials')
    .upsert({ user_id: userId, login, temp_password: tempPassword });
  if (error) throw error;
}

// Owner-only: map of user_id -> { login, tempPassword }. Returns {} for
// non-owners (RLS filters the rows out).
export async function listCredentials() {
  const { data, error } = await supabase.from('account_credentials')
    .select('user_id, login, temp_password');
  if (error) throw error;
  const map = {};
  (data || []).forEach(c => { map[c.user_id] = { login: c.login, tempPassword: c.temp_password }; });
  return map;
}

// Owner-only: change a user's role. RLS (profiles_owner_all) + the
// guard_profile_role trigger enforce that only an owner can do this server-side.
export async function setUserRole(userId, role) {
  const { error } = await supabase.from('profiles')
    .update({ role }).eq('id', userId);
  if (error) throw error;
}

export async function listHomeowners() {
  const { data, error } = await supabase.from('profiles')
    .select('id, full_name, initials').eq('role', 'homeowner').order('full_name');
  if (error) throw error;
  return (data || []).map(u => ({ id: u.id, name: u.full_name, initials: u.initials || initialsOf(u.full_name) }));
}

export async function listMembers(projectId) {
  const { data, error } = await supabase.from('project_members')
    .select('user_id, profiles(full_name, initials, role)').eq('project_id', projectId);
  if (error) throw error;
  return (data || []).map(m => ({
    id: m.user_id, name: m.profiles?.full_name, role: m.profiles?.role,
    initials: m.profiles?.initials || initialsOf(m.profiles?.full_name),
  }));
}

export async function addMember(projectId, userId) {
  const { error } = await supabase.from('project_members')
    .insert({ project_id: projectId, user_id: userId });
  if (error) throw error;
}

export async function removeMember(projectId, userId) {
  const { error } = await supabase.from('project_members')
    .delete().eq('project_id', projectId).eq('user_id', userId);
  if (error) throw error;
}
