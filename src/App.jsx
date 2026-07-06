/* INH — App shell, routing, role switching, live data */
import { useState, useEffect, useRef } from 'react';
import { Icon } from './components/Icon.jsx';
import { Btn, Pill, AppHeader, TabBar, Sidebar, Sheet, Dialog } from './components/primitives.jsx';
import { INH_DATA } from './data/data.js';
import { supabase, IS_LIVE, normalizeLogin } from './lib/supabase.js';
import { DEFAULT_TEMPLATE } from './lib/template.js';
import * as api from './lib/api.js';
import { Login, Register, ForgotFlow, Field } from './screens/auth/Auth.jsx';
import { getLang, setLang, LANGUAGES, t } from './lib/i18n.js';
import { OverviewScreen, UpdatesScreen, DocumentsScreen, CAN_EDIT } from './screens/core/CoreScreens.jsx';
import {
  ProjectsScreen, FeesScreen, FeesDetailScreen, UsersScreen, TeamScreen, MoreScreen, PlanScreen,
  BackupScreen, backupIsDue,
} from './screens/owner/OwnerScreens.jsx';

const initialsOf = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
const todayISO = () => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

/* ---------- sheets ---------- */
const ROOM_PRESETS = ['Kitchen', 'Living room', 'Master bath', 'Bedroom', 'Exterior'];

function PhotoSheet({ photo, onClose, onAdd }) {
  const [room, setRoom] = useState(photo.room || '');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  if (photo.add) {
    const publish = async () => {
      if (!room.trim() || !onAdd) { onClose(); return; }
      setBusy(true); setErr(null);
      try { await onAdd(room.trim(), files); onClose(); }
      catch (e) { setErr(e?.message || 'Upload failed'); }
      finally { setBusy(false); }
    };
    return (
      <Sheet title="Add progress update" onClose={onClose}>
        <p className="body-2" style={{ marginBottom: 14 }}>Pick the area, then add photos. They publish to the homeowner's Updates feed.</p>
        <label className="inh-label">Room / area</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {ROOM_PRESETS.map(r => (
            <button key={r} onClick={() => setRoom(r)} className={'inh-chip' + (room === r ? ' active' : '')}>{r}</button>
          ))}
        </div>
        <Field label="" icon="image" value={room} onChange={setRoom} placeholder="…or type an area" />

        <label className="inh-label" style={{ marginTop: 14 }}>Photos</label>
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
          border: '1.5px dashed var(--border-strong)', borderRadius: 12, padding: '18px 14px', color: 'var(--fg-2)', fontWeight: 600, fontSize: 13.5,
        }}>
          <Icon name="camera" size={18} />
          {files.length ? `${files.length} photo${files.length > 1 ? 's' : ''} selected` : 'Choose photos'}
          <input type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => setFiles(Array.from(e.target.files || []))} />
        </label>

        {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 10 }}>{err}</p>}
        <div style={{ marginTop: 18 }}>
          <Btn variant="primary" icon="check" onClick={publish} disabled={busy || !room.trim()}>{busy ? 'Publishing…' : 'Publish update'}</Btn>
        </div>
      </Sheet>
    );
  }
  // Photo detail: gallery view. Big active photo on top, tap thumbnails or use
  // arrows to swap. Falls back to the thumbnail-only look when only one photo
  // is present (or in demo mode where photos is undefined).
  const photos = Array.isArray(photo.photos) && photo.photos.length ? photo.photos : (photo.thumb ? [photo.thumb] : []);
  const [idx, setIdx] = useState(0);
  const total = photos.length;
  const active = photos[idx] || photo.thumb;
  const go = (delta) => setIdx(i => (total ? ((i + delta) % total + total) % total : 0));
  return (
    <Sheet onClose={onClose}>
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3', background: photo.tone || 'var(--surface-2)', marginBottom: 12, backgroundImage: active ? `url(${active})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {!active && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.32 }}>
            <Icon name="image" size={46} color="#fff" stroke={1.5} />
          </div>
        )}
        {total > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous photo"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, borderRadius: 999, border: 'none', background: 'rgba(0,0,0,.55)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevron-left" size={22} color="#fff" />
            </button>
            <button onClick={() => go(1)} aria-label="Next photo"
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, borderRadius: 999, border: 'none', background: 'rgba(0,0,0,.55)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevron-right" size={22} color="#fff" />
            </button>
            <div style={{ position: 'absolute', right: 10, top: 10, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>
              {idx + 1} / {total}
            </div>
          </>
        )}
      </div>

      {total > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 12, WebkitOverflowScrolling: 'touch' }}>
          {photos.map((url, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={'Photo ' + (i + 1)}
              style={{
                flexShrink: 0, width: 68, height: 52, borderRadius: 8, border: i === idx ? '2px solid var(--inh-lime)' : '2px solid transparent',
                padding: 0, cursor: 'pointer', backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                opacity: i === idx ? 1 : 0.75,
              }} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{photo.room}</div>
          <div className="inh-row__sub">{photo.date} · {photo.count} photo{photo.count === 1 ? '' : 's'}</div>
        </div>
        {photo.isNew && <Pill status="new" />}
      </div>
    </Sheet>
  );
}

// Detail view for a sub-task: complete toggle, remark, and its photos.
function TaskDetailSheet({ task, projectId, onClose, onChanged, onDelete }) {
  const [done, setDone] = useState(task.done);
  const [note, setNote] = useState(task.note || '');
  const [date, setDate] = useState(task.due_date || '');
  const [end, setEnd] = useState(task.end_date || '');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(IS_LIVE);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (!IS_LIVE) return;
    let active = true;
    api.listTaskPhotos(task.id)
      .then(urls => { if (active) setPhotos(urls); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [task.id]);

  const toggle = async () => {
    const next = !done;
    setDone(next);
    setEnd(next ? todayISO() : '');   // ticking auto-fills the end (completion) date
    if (!IS_LIVE) return;
    try { await api.setPhaseTaskDone(task.id, next); onChanged && onChanged(); }
    catch (e) { setErr(e?.message || 'Could not update'); setDone(!next); }
  };
  const saveEnd = async (val) => {
    setEnd(val);
    if (!IS_LIVE) return;
    try { await api.setPhaseTaskEnd(task.id, val || null); onChanged && onChanged(); }
    catch (e) { setErr(e?.message || 'Could not set end date'); }
  };
  const saveNote = async () => {
    if (!IS_LIVE) return;
    setBusy(true); setErr(null);
    try { await api.setPhaseTaskNote(task.id, note); onChanged && onChanged(); }
    catch (e) { setErr(e?.message || 'Could not save remark'); }
    finally { setBusy(false); }
  };
  const saveDate = async (val) => {
    setDate(val);
    if (!IS_LIVE) return;
    try { await api.setPhaseTaskDate(task.id, val || null); onChanged && onChanged(); }
    catch (e) { setErr(e?.message || 'Could not set date'); }
  };
  const addPhotos = async (files) => {
    const list = Array.from(files || []);
    if (!IS_LIVE || !list.length) return;
    setBusy(true); setErr(null);
    try {
      await api.uploadTaskPhotos(projectId, task.id, task.title, list);
      const urls = await api.listTaskPhotos(task.id);
      setPhotos(urls);
      onChanged && onChanged();
    } catch (e) { setErr(e?.message || 'Upload failed'); }
    finally { setBusy(false); }
  };

  const canEdit = !!onChanged; // App only passes onChanged for editor roles
  // The remark is the only field that isn't auto-saved, so guard against losing it.
  const dirty = canEdit && note !== (task.note || '');
  const requestClose = () => { if (dirty) setConfirmClose(true); else onClose(); };
  const saveAndClose = async () => {
    if (!IS_LIVE) { onClose(); return; }
    setBusy(true); setErr(null);
    try { await api.setPhaseTaskNote(task.id, note); onChanged && onChanged(); onClose(); }
    catch (e) { setErr(e?.message || 'Could not save remark'); setConfirmClose(false); }
    finally { setBusy(false); }
  };
  return (
    <>
    <Sheet title="Sub-task" onClose={requestClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
        <button onClick={canEdit ? toggle : undefined} aria-label="Toggle complete"
          style={{ border: 'none', background: 'transparent', padding: 0, flexShrink: 0, display: 'flex', cursor: canEdit ? 'pointer' : 'default' }}>
          <Icon name={done ? 'check-circle' : 'circle'} size={26} color={done ? 'var(--success)' : 'var(--fg-3)'} stroke={done ? 2.2 : 1.8} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--fg-3)' : 'var(--fg-1)' }}>{task.title}</div>
          <div className="inh-row__sub">{done ? 'Completed' : 'In progress'}</div>
        </div>
        <Pill status={done ? 'completed' : 'progress'} />
      </div>

      <label className="inh-label">Start date</label>
      <input type="date" value={date} onChange={e => saveDate(e.target.value)} disabled={!canEdit}
        style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--surface)', padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', color: 'var(--fg-1)', boxSizing: 'border-box' }} />
      <p className="meta" style={{ margin: '6px 0 12px' }}>Items with a start date show on "This week".</p>

      <label className="inh-label">End date</label>
      <input type="date" value={end} onChange={e => saveEnd(e.target.value)} disabled={!canEdit}
        style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--surface)', padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', color: 'var(--fg-1)', boxSizing: 'border-box' }} />
      <p className="meta" style={{ margin: '6px 0 14px' }}>Auto-fills the day you tick the item complete.</p>

      <label className="inh-label">Remark</label>
      <textarea value={note} onChange={e => setNote(e.target.value)} disabled={!canEdit}
        placeholder={canEdit ? 'Add a note about this sub-task…' : 'No remark'} rows={3}
        style={{ width: '100%', resize: 'vertical', borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--surface)', padding: '11px 13px', fontSize: 14, fontFamily: 'inherit', color: 'var(--fg-1)', boxSizing: 'border-box' }} />
      {canEdit && (
        <div style={{ marginTop: 8 }}>
          <Btn variant={dirty ? 'primary' : 'ghost'} size="sm" icon="check" onClick={saveNote} disabled={busy || !dirty}>
            {busy ? 'Saving…' : dirty ? 'Save remark' : 'Saved'}
          </Btn>
          {dirty && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>Unsaved</span>}
        </div>
      )}

      <label className="inh-label" style={{ marginTop: 16 }}>Photos</label>
      {loading ? (
        <p className="body-2">Loading…</p>
      ) : photos.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {photos.map((url, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: 10, backgroundColor: 'var(--surface-2)', backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          ))}
        </div>
      ) : (
        <p className="body-2" style={{ marginBottom: 4 }}>No photos yet.</p>
      )}

      {canEdit && (
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', marginTop: 10,
          border: '1.5px dashed var(--border-strong)', borderRadius: 12, padding: '14px', color: 'var(--fg-2)', fontWeight: 600, fontSize: 13.5,
        }}>
          <Icon name="camera" size={18} /> {busy ? 'Working…' : 'Add photos'}
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={busy}
            onChange={e => addPhotos(e.target.files)} />
        </label>
      )}

      {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 10 }}>{err}</p>}

      {canEdit && onDelete && (
        <button onClick={() => onDelete(task)}
          style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', color: 'var(--error)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}>
          <Icon name="trash" size={15} color="var(--error)" /> Delete item
        </button>
      )}
    </Sheet>
    {confirmClose && (
      <Dialog onClose={() => setConfirmClose(false)}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', background: 'var(--warning-tint, var(--surface-2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="alert-triangle" size={24} color="var(--warning)" />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, textAlign: 'center', marginBottom: 6 }}>Unsaved changes</div>
        <p className="body-2" style={{ textAlign: 'center', marginBottom: 18 }}>You edited the remark but haven't saved it. Save before closing?</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={() => { setConfirmClose(false); onClose(); }} disabled={busy}>Discard</Btn>
          <Btn variant="primary" onClick={saveAndClose} disabled={busy}>{busy ? 'Saving…' : 'Save & close'}</Btn>
        </div>
      </Dialog>
    )}
    </>
  );
}

function genPassword() {
  // Friendly temporary password: e.g. "Inh-4827-quay". No ambiguous chars.
  const words = ['quay', 'lime', 'teak', 'arch', 'bolt', 'sill', 'jade', 'reef', 'pine', 'oryx'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = String(1000 + Math.floor(Math.random() * 9000));
  return `Inh-${n}-${w}`;
}

function AddAccountSheet({ onClose, onCreate, callerRole = 'owner' }) {
  // Owners may create admins or homeowners; admins may only create homeowners.
  const allowedRoles = callerRole === 'owner' ? ['admin', 'homeowner'] : ['homeowner'];
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState(genPassword());
  const [role, setRole] = useState('homeowner');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(null);   // { login, pw } once created
  // Accept a real email OR a plain username (letters/digits/._-).
  const ID_RE = /^([^\s@]+@[^\s@]+\.[^\s@]+|[a-z0-9._-]+)$/i;
  const ready = ID_RE.test(email.trim()) && pw.length >= 8;

  const create = async () => {
    if (!ready) { setErr('Enter an email or username, and an 8+ character password'); return; }
    setBusy(true); setErr(null);
    try {
      // normalizeLogin turns a bare username into a synthetic email so Supabase
      // accepts it; the sign-in screen applies the same mapping.
      await onCreate({ email: normalizeLogin(email), login: email.trim(), password: pw, fullName: name.trim(), role });
      setDone({ login: email.trim(), pw });
    } catch (e) { setErr(e?.message || 'Could not create account'); }
    finally { setBusy(false); }
  };

  if (done) return (
    <Sheet title="Account created" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon name="check-circle" size={32} color="var(--success)" />
        </div>
        <p className="body-2">The account is active immediately — no email confirmation needed. Share these sign-in details with your client.</p>
      </div>
      <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div><div className="meta">Login (email or username)</div><div style={{ fontWeight: 700, fontSize: 14.5 }}>{done.login}</div></div>
        <div><div className="meta">Temporary password</div><div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, letterSpacing: 0.5 }}>{done.pw}</div></div>
      </div>
      <p className="meta" style={{ marginTop: 10 }}>They sign in with exactly that login + password. (Password reset by email only works for real email addresses.)</p>
      <div style={{ marginTop: 16 }}><Btn variant="primary" icon="check" onClick={onClose}>Done</Btn></div>
    </Sheet>
  );

  return (
    <Sheet title="Add account" onClose={onClose}>
      <p className="body-2" style={{ marginBottom: 16 }}>Create a client account directly with a temporary password. Use a real email, or just a username (e.g. <b>admin</b>) — no email confirmation required.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Full name" icon="user" value={name} onChange={setName} placeholder="Client's name" autoFocus />
        <Field label="Email or username" icon="mail" value={email} onChange={setEmail} placeholder="client@email.com or a username" />
        <div>
          <label className="inh-label">Temporary password</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="inh-input" style={{ flex: 1 }}>
              <span className="lead"><Icon name="lock" size={18} /></span>
              <input value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 8 characters" />
            </div>
            <button onClick={() => setPw(genPassword())} aria-label="Generate password"
              style={{ flexShrink: 0, width: 46, borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="settings" size={18} color="var(--fg-1)" />
            </button>
          </div>
        </div>
        <div>
          <label className="inh-label">Role</label>
          {allowedRoles.length > 1 ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {allowedRoles.map(r => (
                <button key={r} onClick={() => setRole(r)} className={'inh-chip' + (role === r ? ' active' : '')} style={{ flex: 1, textTransform: 'capitalize' }}>{r}</button>
              ))}
            </div>
          ) : (
            <p className="body-2">New accounts are added as <b style={{ color: 'var(--fg-1)' }}>homeowners</b>.</p>
          )}
        </div>
      </div>
      {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div style={{ marginTop: 18 }}><Btn variant="primary" icon="user-plus" onClick={create} disabled={busy || !ready}>{busy ? 'Creating…' : 'Create account'}</Btn></div>
    </Sheet>
  );
}

function PropertySheet({ role, projects, selectedId, onSelect, onClose }) {
  const list = role === 'homeowner' ? projects.slice(0, 1) : projects;
  return (
    <Sheet title={role === 'homeowner' ? 'Switch property' : 'Switch project'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {list.map((p) => {
          const active = p.id === selectedId;
          return (
            <div key={p.id} className="inh-row" style={{ borderRadius: 12, cursor: 'pointer', background: active ? 'var(--inh-lime-soft)' : 'transparent' }}
              onClick={() => { onSelect && onSelect(p.id); onClose(); }}>
              <div className="inh-row__ico" style={{ background: 'var(--inh-lime-tint)' }}><Icon name="building" size={20} color="var(--inh-charcoal)" /></div>
              <div className="inh-row__main"><div className="inh-row__title" style={{ fontSize: 14.5 }}>{p.name}</div><div className="inh-row__sub">{p.code} · {p.progress}%</div></div>
              {active && <Icon name="check" size={18} color="var(--inh-charcoal)" stroke={2.6} />}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

function EditNameSheet({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try { await onSave(name.trim()); onClose(); }
    catch (e) { setErr(e?.message || 'Could not save'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title="Edit my name" onClose={onClose}>
      <p className="body-2" style={{ marginBottom: 16 }}>This is the name shown to your team across INH.</p>
      <Field label="Full name" icon="user" value={name} onChange={setName} placeholder="Your name" autoFocus />
      {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div style={{ marginTop: 18 }}><Btn variant="primary" icon="check" onClick={save} disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save name'}</Btn></div>
    </Sheet>
  );
}

function EditProjectSheet({ project, onClose, onSave }) {
  const [f, setF] = useState({
    name: project?.name || '', code: project?.code || '', address: project?.address || '',
    type: project?.type || '', est_handover: project?.est_handover ? String(project.est_handover).slice(0, 10) : '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (v) => setF(s => ({ ...s, [k]: v }));
  const ready = f.name.trim() && f.code.trim();
  const save = async () => {
    if (!ready) return;
    setBusy(true); setErr(null);
    try {
      await onSave({ name: f.name.trim(), code: f.code.trim(), address: f.address.trim(), type: f.type.trim(), est_handover: f.est_handover });
      onClose();
    } catch (e) { setErr(e?.message || 'Could not save project'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title="Edit project" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Project name" icon="building" value={f.name} onChange={set('name')} placeholder="e.g. Lot 23, Bukit Indah" autoFocus />
        <Field label="Project code" icon="briefcase" value={f.code} onChange={set('code')} placeholder="e.g. P-2026-045" />
        <Field label="Address" icon="map-pin" value={f.address} onChange={set('address')} placeholder="Site address" />
        <Field label="Type" icon="home" value={f.type} onChange={set('type')} placeholder="e.g. Full home renovation" />
        <Field label="Est. handover (timeline)" icon="calendar" type="date" value={f.est_handover} onChange={set('est_handover')} placeholder="" />
      </div>
      {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div style={{ marginTop: 18 }}><Btn variant="primary" icon="check" onClick={save} disabled={busy || !ready}>{busy ? 'Saving…' : 'Save changes'}</Btn></div>
    </Sheet>
  );
}

function SettingsSheet({ lang, onChangeLang, onClose, onEditTemplate }) {
  return (
    <Sheet title={t('Settings & language')} onClose={onClose}>
      {onEditTemplate && (
        <>
          <label className="inh-label">Default project items</label>
          <button onClick={onEditTemplate} className="inh-row" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', textAlign: 'left', marginBottom: 16 }}>
            <div className="inh-row__ico" style={{ background: 'var(--inh-lime-tint)' }}><Icon name="briefcase" size={19} color="var(--inh-charcoal)" /></div>
            <div className="inh-row__main"><div className="inh-row__title" style={{ fontSize: 14.5 }}>Edit add-project checklist</div><div className="inh-row__sub">The phases & items shown when adding a project</div></div>
            <Icon name="chevron-right" size={17} color="var(--fg-3)" />
          </button>
        </>
      )}
      <label className="inh-label">{t('Language')}</label>
      <p className="body-2" style={{ marginBottom: 14 }}>{t('Choose the language for the app.')}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {LANGUAGES.map(l => (
          <button key={l.code} onClick={() => onChangeLang(l.code)} className="inh-row"
            style={{ borderRadius: 12, border: '1px solid var(--border)', background: lang === l.code ? 'var(--inh-lime-soft)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
            <div className="inh-row__ico" style={{ background: 'var(--inh-lime-tint)' }}>
              <Icon name="globe" size={20} color="var(--inh-charcoal)" />
            </div>
            <div className="inh-row__main"><div className="inh-row__title" style={{ fontSize: 14.5 }}>{l.label}</div></div>
            {lang === l.code && <Icon name="check" size={18} color="var(--inh-charcoal)" stroke={2.6} />}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function SupportSheet({ onClose }) {
  const email = 'hello@inhdesign.com.my';
  return (
    <Sheet title={t('Support')} onClose={onClose}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--inh-lime-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Icon name="message-circle" size={26} color="var(--inh-charcoal)" />
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{t('Need a hand?')}</div>
        <p className="body-2" style={{ marginTop: 6 }}>{t("Contact INH Design & Build and we'll help you out.")}</p>
      </div>
      <a href={'mailto:' + email} style={{ textDecoration: 'none' }}>
        <Btn variant="primary" icon="mail">{t('Email support')}</Btn>
      </a>
    </Sheet>
  );
}

function AddProjectSheet({ onClose, onCreate, onAddItems, suggestedCode, template = [] }) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: '', code: suggestedCode || '', address: '', type: '', est_handover: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [created, setCreated] = useState(null);
  const [sel, setSel] = useState([]);
  const set = (k) => (v) => setF(s => ({ ...s, [k]: v }));
  const ready = f.name.trim() && f.code.trim();

  const continueToItems = async () => {
    if (!ready) return;
    setBusy(true); setErr(null);
    try {
      const proj = await onCreate({ name: f.name.trim(), code: f.code.trim(), address: f.address.trim(), type: f.type.trim(), est_handover: f.est_handover });
      if (!proj) { onClose(); return; }   // demo mode → no item picker
      setCreated(proj);
      setSel((template || []).map(ph => ({ name: ph.name, on: true, tasks: (ph.tasks || []).map(t => ({ title: t, on: true })) })));
      setStep(2);
    } catch (e) { setErr(e?.message || 'Could not create project'); }
    finally { setBusy(false); }
  };

  const togglePhase = (i) => setSel(s => s.map((p, idx) => (idx === i ? { ...p, on: !p.on } : p)));
  const toggleTask = (i, j) => setSel(s => s.map((p, idx) => (idx === i ? { ...p, tasks: p.tasks.map((t, jx) => (jx === j ? { ...t, on: !t.on } : t)) } : p)));
  const setAll = (on) => setSel(s => s.map(p => ({ ...p, on, tasks: p.tasks.map(t => ({ ...t, on })) })));
  const chosen = sel.filter(p => p.on).map(p => ({ name: p.name, tasks: p.tasks.filter(t => t.on).map(t => t.title) }));

  const addItems = async () => {
    setBusy(true); setErr(null);
    try {
      if (chosen.length && onAddItems) await onAddItems(created.id, chosen);
      onClose();
    } catch (e) { setErr(e?.message || 'Could not add items'); }
    finally { setBusy(false); }
  };

  if (step === 2) return (
    <Sheet title="Add items" onClose={onClose}>
      <p className="body-2" style={{ marginBottom: 10 }}>Pick the phases and items to add to <b style={{ color: 'var(--fg-1)' }}>{created?.name}</b>. Untick anything you don't need.</p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
        <button className="inh-link" style={{ fontSize: 12.5 }} onClick={() => setAll(true)}>Select all</button>
        <button className="inh-link" style={{ fontSize: 12.5 }} onClick={() => setAll(false)}>Clear all</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '46vh', overflowY: 'auto' }}>
        {sel.length === 0 && <p className="body-2">No template items. You can add phases manually on the project.</p>}
        {sel.map((p, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', background: p.on ? 'var(--inh-lime-soft)' : 'transparent' }}>
            <button onClick={() => togglePhase(i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
              <Icon name={p.on ? 'check-circle' : 'circle'} size={19} color={p.on ? 'var(--success)' : 'var(--fg-3)'} stroke={p.on ? 2.2 : 1.8} />
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{p.name}</span>
            </button>
            {p.on && p.tasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8, paddingLeft: 28 }}>
                {p.tasks.map((t, j) => (
                  <button key={j} onClick={() => toggleTask(i, j)} style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', padding: '3px 0' }}>
                    <Icon name={t.on ? 'check-circle' : 'circle'} size={15} color={t.on ? 'var(--success)' : 'var(--fg-3)'} stroke={t.on ? 2.2 : 1.8} />
                    <span style={{ fontSize: 13, color: t.on ? 'var(--fg-1)' : 'var(--fg-3)' }}>{t.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose} disabled={busy}>Skip</Btn>
        <Btn variant="primary" icon="plus" onClick={addItems} disabled={busy}>{busy ? 'Adding…' : `Add ${chosen.length} phase${chosen.length === 1 ? '' : 's'}`}</Btn>
      </div>
    </Sheet>
  );

  return (
    <Sheet title="Add project" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Project name" icon="building" value={f.name} onChange={set('name')} placeholder="e.g. Lot 23, Bukit Indah" autoFocus />
        <Field label="Project code (auto)" icon="briefcase" value={f.code} onChange={set('code')} placeholder="e.g. P-2026-045" />
        <Field label="Address" icon="map-pin" value={f.address} onChange={set('address')} placeholder="Site address" />
        <Field label="Type" icon="home" value={f.type} onChange={set('type')} placeholder="e.g. Full home renovation" />
        <Field label="Est. handover" icon="calendar" type="date" value={f.est_handover} onChange={set('est_handover')} placeholder="" />
      </div>
      {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div style={{ marginTop: 18 }}><Btn variant="primary" icon="arrow-right" onClick={continueToItems} disabled={busy || !ready}>{busy ? 'Creating…' : 'Create & choose items'}</Btn></div>
    </Sheet>
  );
}

/* Owner editor for the default add-project item template. */
function TemplateScreen({ template, onSave }) {
  const [tpl, setTpl] = useState(() => (template || []).map(p => ({ name: p.name, tasks: [...(p.tasks || [])] })));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);
  const setPhaseName = (i, v) => setTpl(s => s.map((p, idx) => (idx === i ? { ...p, name: v } : p)));
  const removePhase = (i) => setTpl(s => s.filter((_, idx) => idx !== i));
  const addPhase = () => setTpl(s => [...s, { name: '', tasks: [] }]);
  const setTask = (i, j, v) => setTpl(s => s.map((p, idx) => (idx === i ? { ...p, tasks: p.tasks.map((t, jx) => (jx === j ? v : t)) } : p)));
  const removeTask = (i, j) => setTpl(s => s.map((p, idx) => (idx === i ? { ...p, tasks: p.tasks.filter((_, jx) => jx !== j) } : p)));
  const addTask = (i) => setTpl(s => s.map((p, idx) => (idx === i ? { ...p, tasks: [...p.tasks, ''] } : p)));
  const save = async () => {
    setBusy(true); setErr(null); setSaved(false);
    const clean = tpl.map(p => ({ name: (p.name || '').trim(), tasks: p.tasks.map(t => (t || '').trim()).filter(Boolean) })).filter(p => p.name);
    try { await onSave(clean); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (e) { setErr(e?.message || 'Could not save'); }
    finally { setBusy(false); }
  };
  return (
    <div className="inh-scroll"><div className="inh-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p className="body-2">These phases and items appear (as a checklist) when you add a project, so you can pick them instead of typing each one.</p>
      {tpl.map((p, i) => (
        <div key={i} className="inh-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={p.name} onChange={e => setPhaseName(i, e.target.value)} placeholder="Phase name"
              style={{ flex: 1, border: '1px solid var(--border-strong)', borderRadius: 10, padding: '9px 11px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', color: 'var(--fg-1)', boxSizing: 'border-box' }} />
            <button onClick={() => removePhase(i)} aria-label="Remove phase" style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', padding: 4 }}><Icon name="trash" size={16} color="var(--error)" /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {p.tasks.map((t, j) => (
              <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Icon name="circle" size={13} color="var(--fg-3)" />
                <input value={t} onChange={e => setTask(i, j, e.target.value)} placeholder="Item…"
                  style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 9, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', color: 'var(--fg-1)', boxSizing: 'border-box' }} />
                <button onClick={() => removeTask(i, j)} aria-label="Remove item" style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', padding: 3 }}><Icon name="x" size={14} color="var(--fg-3)" /></button>
              </div>
            ))}
            <button onClick={() => addTask(i)} className="inh-link" style={{ fontSize: 12.5, alignSelf: 'flex-start', marginTop: 2 }}>+ Add item</button>
          </div>
        </div>
      ))}
      <button onClick={addPhase} style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 12, padding: '12px', background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 13.5, color: 'var(--fg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Icon name="plus" size={16} color="var(--fg-2)" /> Add phase
      </button>
      {err && <p style={{ color: 'var(--error)', fontSize: 12.5 }}>{err}</p>}
      <Btn variant="primary" icon="check" onClick={save} disabled={busy}>{busy ? 'Saving…' : saved ? 'Saved' : 'Save default items'}</Btn>
    </div></div>
  );
}

function UploadDocSheet({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState('doc');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const kinds = [['doc', 'Document'], ['invoice', 'Invoice'], ['plan', 'Plan']];
  const save = async () => {
    if (!file) return;
    setBusy(true); setErr(null);
    try { await onSave(file, { name: name.trim() || file.name, kind }); onClose(); }
    catch (e) { setErr(e?.message || 'Upload failed'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title="Upload document" onClose={onClose}>
      <p className="body-2" style={{ marginBottom: 14 }}>Add a file to this project. Members can view it; only INH staff can upload.</p>
      <Field label="Display name" icon="file-text" value={name} onChange={setName} placeholder="e.g. Milestone 3 Invoice" autoFocus />
      <label className="inh-label" style={{ marginTop: 14 }}>Type</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        {kinds.map(([v, l]) => (
          <button key={v} onClick={() => setKind(v)} className={'inh-chip' + (kind === v ? ' active' : '')} style={{ flex: 1 }}>{l}</button>
        ))}
      </div>
      <label className="inh-label" style={{ marginTop: 14 }}>File</label>
      <label style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
        border: '1.5px dashed var(--border-strong)', borderRadius: 12, padding: '18px 14px', color: 'var(--fg-2)', fontWeight: 600, fontSize: 13.5,
      }}>
        <Icon name="paperclip" size={18} />
        {file ? file.name : 'Choose a file'}
        <input type="file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx" style={{ display: 'none' }}
          onChange={e => setFile(e.target.files?.[0] || null)} />
      </label>
      {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div style={{ marginTop: 18 }}><Btn variant="primary" icon="check" onClick={save} disabled={busy || !file}>{busy ? 'Uploading…' : 'Upload'}</Btn></div>
    </Sheet>
  );
}

function AddScheduleSheet({ onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [state, setState] = useState('upcoming');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const ready = title.trim() && date;
  const save = async () => {
    if (!ready) return;
    setBusy(true); setErr(null);
    try { await onSave({ title: title.trim(), scheduled_date: date, state }); onClose(); }
    catch (e) { setErr(e?.message || 'Could not add item'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title="Add schedule item" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="What's happening" icon="hard-hat" value={title} onChange={setTitle} placeholder="e.g. Electrical second fix" autoFocus />
        <Field label="Date" icon="calendar" type="date" value={date} onChange={setDate} placeholder="" />
        <div>
          <label className="inh-label">Status</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['upcoming', 'Upcoming'], ['today', 'Today']].map(([v, l]) => (
              <button key={v} onClick={() => setState(v)} className={'inh-chip' + (state === v ? ' active' : '')} style={{ flex: 1 }}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div style={{ marginTop: 18 }}><Btn variant="primary" icon="plus" onClick={save} disabled={busy || !ready}>{busy ? 'Adding…' : 'Add item'}</Btn></div>
    </Sheet>
  );
}

function AddPhaseSheet({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [pct, setPct] = useState(0);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const addTask = () => {
    const t = taskInput.trim();
    if (!t) return;
    setTasks(ts => [...ts, t]);
    setTaskInput('');
  };
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    const pending = taskInput.trim();
    const allTasks = pending ? [...tasks, pending] : tasks;
    try { await onSave({ name: name.trim(), status, pct: Math.round(pct), start_date: start, end_date: end, tasks: allTasks }); onClose(); }
    catch (e) { setErr(e?.message || 'Could not add phase'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title="Add project phase" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Phase name" icon="briefcase" value={name} onChange={setName} placeholder="e.g. Painting & finishing" autoFocus />
        <div>
          <label className="inh-label">Status</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[['upcoming', 'Upcoming'], ['progress', 'In progress'], ['completed', 'Completed']].map(([v, l]) => (
              <button key={v} onClick={() => setStatus(v)} className={'inh-chip' + (status === v ? ' active' : '')} style={{ flex: 1 }}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="inh-label">Completion · {Math.round(pct)}%</label>
          <input type="range" min={0} max={100} value={pct} onChange={e => setPct(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--inh-charcoal)' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><Field label="Start" icon="calendar" type="date" value={start} onChange={setStart} placeholder="" /></div>
          <div style={{ flex: 1 }}><Field label="End" icon="calendar" type="date" value={end} onChange={setEnd} placeholder="" /></div>
        </div>
        <div>
          <label className="inh-label">Sub-tasks</label>
          {tasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {tasks.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', borderRadius: 9, padding: '8px 10px' }}>
                  <Icon name="circle" size={15} color="var(--fg-3)" />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{t}</span>
                  <button onClick={() => setTasks(ts => ts.filter((_, j) => j !== i))} aria-label="Remove"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', padding: 2 }}>
                    <Icon name="x" size={15} color="var(--fg-3)" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="inh-input" style={{ flex: 1 }}>
              <span className="lead"><Icon name="check-circle" size={18} /></span>
              <input value={taskInput} placeholder="Add a sub-task…"
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }} />
            </div>
            <button onClick={addTask} disabled={!taskInput.trim()} aria-label="Add sub-task"
              style={{ flexShrink: 0, width: 46, borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--surface)', cursor: taskInput.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={18} color="var(--fg-1)" />
            </button>
          </div>
        </div>
      </div>
      {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div style={{ marginTop: 18 }}><Btn variant="primary" icon="plus" onClick={save} disabled={busy || !name.trim()}>{busy ? 'Adding…' : 'Add phase'}</Btn></div>
    </Sheet>
  );
}

function ProgressSheet({ project, onClose, onSave }) {
  const [pct, setPct] = useState(project?.progress ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const save = async () => {
    setBusy(true); setErr(null);
    try { await onSave(Math.round(pct)); onClose(); }
    catch (e) { setErr(e?.message || 'Could not save progress'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title="Update progress" onClose={onClose}>
      <p className="body-2" style={{ marginBottom: 18 }}>Set overall completion for <b style={{ color: 'var(--fg-1)' }}>{project?.name}</b>. The homeowner sees this instantly.</p>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <span className="display" style={{ fontSize: 46, color: 'var(--inh-charcoal)' }}>{Math.round(pct)}%</span>
      </div>
      <input type="range" min={0} max={100} value={pct} onChange={e => setPct(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--inh-charcoal)' }} />
      {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div style={{ marginTop: 20 }}><Btn variant="primary" icon="check" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save progress'}</Btn></div>
    </Sheet>
  );
}

export default function App() {
  const [auth, setAuth] = useState('login');   // login | forgot | in
  const [role, setRole] = useState(IS_LIVE ? null : 'owner');
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [task, setTask] = useState(null);
  const [confirm, setConfirm] = useState(null);   // { title, body, onYes }
  const [lang, setLangState] = useState(getLang());
  const changeLang = (code) => { setLang(code); setLangState(code); };
  const [feedProjectId, setFeedProjectId] = useState(null);   // which project the owner views on Updates/Documents
  const [storageBytes, setStorageBytes] = useState(0);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);   // default add-project items
  const [pendingFees, setPendingFees] = useState(0);            // payments awaiting owner approval

  // data
  const [projects, setProjects] = useState(IS_LIVE ? [] : INH_DATA.projects);
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState(IS_LIVE ? [] : INH_DATA.users);
  const [homeowners, setHomeowners] = useState([]);
  const [fees, setFees] = useState(IS_LIVE ? [] : INH_DATA.projects);
  const [audit, setAudit] = useState(IS_LIVE ? [] : INH_DATA.audit);
  const [detail, setDetail] = useState(null);   // { projectId, phases, schedule, updates, documents, payments, members }
  const [demoNotes, setDemoNotes] = useState({}); // demo-mode notes by projectId (in memory)

  const push = v => setStack(s => [...s, v]);
  const pop = () => setStack(s => s.slice(0, -1));
  const top = stack[stack.length - 1];

  /* ---- Phone back button → pop the current screen instead of exiting ----
     We keep a mirror of the app's overlay depth in the browser history.
     Pressing back on the phone fires `popstate`; we close the topmost open
     thing (confirm → task → photo → sheet → screen stack → tab). When the
     app itself closes something via a button we synchronise history so the
     count stays in step. A sentinel entry is pushed on mount so the very
     first hardware-back press never leaves the app. */
  const depth = stack.length + (sheet ? 1 : 0) + (photo ? 1 : 0) + (task ? 1 : 0) + (confirm ? 1 : 0);
  const prevDepthRef = useRef(0);
  const syntheticBackRef = useRef(false);
  const backHandlerRef = useRef(null);

  useEffect(() => {
    // Sentinel: one spare history entry so the first back press is absorbed.
    if (typeof window !== 'undefined') window.history.pushState({ inhBase: true }, '');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prev = prevDepthRef.current;
    prevDepthRef.current = depth;
    if (depth > prev) {
      // Something opened — push one history entry per newly-opened layer.
      for (let i = 0; i < depth - prev; i++) window.history.pushState({ inhDepth: prev + i + 1 }, '');
    } else if (depth < prev) {
      // Something closed via a normal in-app action — unwind history to match.
      syntheticBackRef.current = true;
      window.history.go(-(prev - depth));
    }
  }, [depth]);

  // Keep an always-fresh close function so the popstate listener (registered
  // once) reads the latest state.
  backHandlerRef.current = () => {
    if (confirm) { setConfirm(null); return; }
    if (task) { setTask(null); return; }
    if (photo) { setPhoto(null); return; }
    if (sheet) { setSheet(null); return; }
    if (stack.length) { pop(); return; }
    // At the root — re-push a sentinel so a further back press has something
    // to consume; letting it fall through would exit the app.
    window.history.pushState({ inhBase: true }, '');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      if (syntheticBackRef.current) { syntheticBackRef.current = false; return; }
      backHandlerRef.current && backHandlerRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const currentProject = projects.find(p => p.id === feedProjectId) || projects[0];
  const baseProject = top?.project || currentProject;
  const activeProjectId = baseProject?.id;
  // Always resolve the freshest copy from the loaded list so the hero reflects
  // edits / auto-calculated progress (the stack only holds a snapshot).
  const activeProject = projects.find(p => p.id === activeProjectId) || baseProject;
  const live = v => (IS_LIVE ? (v ?? []) : undefined);   // demo → undefined → screen uses INH_DATA defaults

  // Real signed-in identity for the chrome (sidebar foot + header avatar).
  // In demo mode this stays null so screens fall back to roleMeta.
  const me = profile
    ? { name: profile.full_name || profile.name, initials: profile.initials || initialsOf(profile.full_name || profile.name) }
    : null;

  // Auto project code: P-<year>-<next 3-digit sequence> from existing codes.
  const nextProjectCode = (() => {
    const year = new Date().getFullYear();
    const nums = (projects || []).map(p => { const m = /(\d+)\s*$/.exec(p.code || ''); return m ? parseInt(m[1], 10) : 0; });
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `P-${year}-${String(next).padStart(3, '0')}`;
  })();

  // "This week" combines schedule_items with any dated phase-items, so a date
  // set on an item surfaces on the weekly schedule. Demo mode → undefined.
  const WEEK_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const todayISO = (() => { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; })();
  const mergedSchedule = IS_LIVE ? (() => {
    const base = (detail?.schedule || []).map(s => ({ ...s, source: 'schedule' }));
    const taskItems = (detail?.phases || []).flatMap(p => (p.tasks || [])
      .filter(t => t.due_date)
      .map(t => {
        const d = new Date(t.due_date); const ok = !isNaN(d);
        return {
          id: 'task-' + t.id, taskId: t.id, source: 'task', title: t.title, iso: t.due_date,
          state: t.done ? 'completed' : (t.due_date === todayISO ? 'today' : 'upcoming'),
          day: ok ? WEEK_DAYS[d.getDay()] : '', date: ok ? String(d.getDate()) : '',
        };
      }));
    return [...base, ...taskItems].sort((a, b) => String(a.iso || '').localeCompare(String(b.iso || '')));
  })() : undefined;

  // ---- live data loaders ----
  const reloadTop = async () => {
    if (!IS_LIVE) return;
    const r = await Promise.allSettled([
      api.listProjects(), api.getMyProfile(), api.listUsers(),
      api.listHomeowners(), api.listProjectFees(), api.listAudit(), api.listCredentials(),
      api.getStorageUsage(), api.getProjectTemplate(), api.pendingPaymentCount(),
    ]);
    const [p, pr, us, ho, fe, au, cr, sb, tpl, pc] = r.map(x => (x.status === 'fulfilled' ? x.value : null));
    if (p) setProjects(p);
    if (pr) setProfile(pr);
    if (us) setUsers(cr ? us.map(u => ({ ...u, ...(cr[u.id] || {}) })) : us);
    if (sb != null) setStorageBytes(sb);
    if (tpl && tpl.length) setTemplate(tpl);
    if (pc != null) setPendingFees(pc);
    if (ho) setHomeowners(ho);
    if (fe) setFees(fe);
    if (au) setAudit(au);
  };

  const loadDetail = async (projectId) => {
    if (!IS_LIVE || !projectId) return;
    const r = await Promise.allSettled([
      api.listPhases(projectId), api.listSchedule(projectId), api.listUpdates(projectId),
      api.listDocuments(projectId), api.listPayments(projectId), api.listMembers(projectId),
      api.listStatusNotes(projectId),
    ]);
    const [phases, schedule, updates, documents, payments, members, notes] = r.map(x => (x.status === 'fulfilled' ? x.value : []));
    setDetail({ projectId, phases, schedule, updates, documents, payments, members, notes });
  };

  // After an item changes, recompute the project's overall progress from item
  // completion and persist it, then refresh the detail + project list.
  const refreshAfterItemChange = async () => {
    if (!IS_LIVE) return;
    try {
      const phases = await api.listPhases(activeProjectId);
      const totals = phases.reduce((a, p) => {
        const tks = p.tasks || [];
        return { t: a.t + tks.length, d: a.d + tks.filter(x => x.done).length };
      }, { t: 0, d: 0 });
      if (totals.t > 0) await api.updateProjectProgress(activeProjectId, Math.round((totals.d / totals.t) * 100));
    } catch (e) { /* display still derives from items */ }
    await loadDetail(activeProjectId);
    await reloadTop();
  };

  // Real auth: restore any persisted session and react to sign in/out.
  useEffect(() => {
    if (!IS_LIVE) return;
    let active = true;
    // Load the role + top-level data. Deferred out of the auth callback below
    // so it never blocks signInWithPassword from resolving.
    const loadRole = async (session) => {
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      if (!active) return;
      setRole(data?.role || 'homeowner');
      reloadTop();
    };
    const apply = (session) => {
      if (!active) return;
      if (!session) { setAuth('login'); setRole(null); return; }
      // Enter the app synchronously; never await supabase calls inside the
      // onAuthStateChange callback — doing so deadlocks the auth client and
      // leaves sign-in stuck. Defer the data fetch to the next tick instead.
      setTab('home');
      setStack([]);
      setAuth('in');
      setTimeout(() => { if (active) loadRole(session); }, 0);
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => apply(session));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // Load the active project's detail whenever it changes.
  useEffect(() => {
    if (IS_LIVE && auth === 'in' && activeProjectId) loadDetail(activeProjectId);
  }, [activeProjectId, auth]);

  // Keep the stored overall progress in sync with item completion: when an
  // editor views a project whose items don't match the saved %, persist it.
  useEffect(() => {
    if (!IS_LIVE || !CAN_EDIT(role) || !detail?.phases || detail.projectId !== activeProjectId) return;
    const totals = detail.phases.reduce((a, p) => {
      const tks = p.tasks || [];
      return { t: a.t + tks.length, d: a.d + tks.filter(x => x.done).length };
    }, { t: 0, d: 0 });
    if (totals.t === 0) return;
    const pct = Math.round((totals.d / totals.t) * 100);
    const cur = projects.find(p => p.id === activeProjectId)?.progress;
    if (cur !== pct) {
      api.updateProjectProgress(activeProjectId, pct).then(() => reloadTop()).catch(() => {});
    }
  }, [detail, role]);

  // Load storage usage when the Plan screen opens (and after project deletes).
  useEffect(() => {
    if (IS_LIVE && (top?.type === 'plan' || top?.type === 'users')) api.getStorageUsage().then(setStorageBytes).catch(() => {});
  }, [top, projects]);

  // ---- auth handlers ----
  const signIn = async (email, password) => {
    if (!IS_LIVE) { setRole(role || 'owner'); setTab('home'); setStack([]); setAuth('in'); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // onAuthStateChange handles loading the role + data and entering the app.
  };

  const signUp = async (email, password, fullName) => {
    if (!IS_LIVE) { setRole('homeowner'); setTab('home'); setStack([]); setAuth('in'); return { needsConfirm: false }; }
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { full_name: fullName },           // read by the handle_new_user trigger
        emailRedirectTo: window.location.origin,  // confirmation link returns to this app
      },
    });
    if (error) throw error;
    // With "Confirm email" on, Supabase returns no session until the link is
    // clicked. Signal the Register screen to show its "check your inbox" state.
    return { needsConfirm: !data.session };
  };

  const signOut = async () => {
    if (IS_LIVE) await supabase.auth.signOut();
    setRole(IS_LIVE ? null : 'owner');
    setProfile(null); setDetail(null);
    setTab('home');
    setStack([]);
    setAuth('login');
  };

  const switchRole = r => { setRole(r); setTab('home'); setStack([]); setSheet(null); setPhoto(null); setTask(null); };

  // ---- interactive feature handlers ----
  const handleEditName = async (name) => {
    if (!IS_LIVE) { setProfile({ name, initials: initialsOf(name) }); return; }
    await api.updateMyName(name);
    await reloadTop();
  };

  const internalCount = () => users.filter(u => u.role === 'owner' || u.role === 'admin').length;

  const handleChangeRole = async (userId, role) => {
    if (!IS_LIVE) return;
    if (role === 'owner' || role === 'admin') {
      const u = users.find(x => x.id === userId);
      const alreadyInternal = u && (u.role === 'owner' || u.role === 'admin');
      if (!alreadyInternal && internalCount() >= 20) throw new Error('Internal user limit reached (max 20 owner/admin).');
    }
    await api.setUserRole(userId, role);
    await reloadTop();
  };

  const handleDeleteUser = async (userId) => {
    if (!IS_LIVE) return;
    await api.deleteUser(userId);
    await reloadTop();
  };

  const handleAssignUserProject = async (projectId, userId) => {
    if (!IS_LIVE) return;
    await api.addMember(projectId, userId);
    await reloadTop();
  };
  const handleUnassignUserProject = async (projectId, userId) => {
    if (!IS_LIVE) return;
    await api.removeMember(projectId, userId);
    await reloadTop();
  };

  const handleAddAccount = async ({ email, login, password, fullName, role }) => {
    if (!IS_LIVE) return;
    if ((role === 'owner' || role === 'admin') && internalCount() >= 20) {
      throw new Error('Internal user limit reached (max 20 owner/admin).');
    }
    const res = await api.adminCreateUser({ email, password, fullName, role });
    // Store the login + temp password (owner-visible) so it can be looked up
    // later. Don't fail the whole flow if this can't be saved.
    if (res?.userId) {
      try { await api.saveCredential(res.userId, login || email, password); }
      catch (e) { console.warn('Could not store credential:', e?.message); }
    }
    await reloadTop();
  };

  const handleAddProject = async (form) => {
    if (!IS_LIVE) {
      const demo = {
        id: 'p' + (projects.length + 1), name: form.name, code: form.code, address: form.address,
        type: form.type, progress: 0, status: 'pending', committed: 0, released: 0, pending: 0, releasedPct: 0,
      };
      setProjects(ps => [...ps, demo]);
      return null;   // demo: skip the item picker
    }
    const proj = await api.createProject(form);
    await reloadTop();
    return proj;
  };

  // Add the chosen template phases (with their items) to a freshly-created project.
  const handleAddProjectItems = async (projectId, phases) => {
    if (!IS_LIVE) return;
    for (const ph of phases) {
      await api.addPhase(projectId, { name: ph.name, status: 'upcoming', pct: 0, tasks: ph.tasks });
    }
    await reloadTop();
  };

  // Owner-only: save the editable default item template.
  const handleSaveTemplate = async (tpl) => {
    setTemplate(tpl);
    if (!IS_LIVE) return;
    await api.saveProjectTemplate(tpl);
  };

  // Build a printable project report (progress detail + photos) and open it
  // for the browser's "Save as PDF". Available to every role.
  const handleReport = () => {
    const p = activeProject;
    const phases = detail?.phases || [];
    const updates = detail?.updates || [];
    const totals = phases.reduce((a, ph) => { const tks = ph.tasks || []; return { t: a.t + tks.length, d: a.d + tks.filter(x => x.done).length }; }, { t: 0, d: 0 });
    const overall = totals.t ? Math.round((totals.d / totals.t) * 100) : (p?.progress ?? 0);
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
    const today = new Date().toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
    const phasesHtml = phases.map((ph, i) => {
      const tks = ph.tasks || []; const t = tks.length; const dn = tks.filter(x => x.done).length;
      const pct = t ? Math.round((dn / t) * 100) : ph.pct;
      const items = tks.map(it => `<li>${it.done ? '&#9745;' : '&#9744;'} ${esc(it.title)}${it.due_date ? ` <span class="muted">(${fmt(it.due_date)}${it.end_date ? ` &rarr; ${fmt(it.end_date)}` : ''})</span>` : ''}</li>`).join('');
      return `<div class="phase"><div class="ph-h"><b>${i + 1}. ${esc(ph.name)}</b><span>${dn}/${t} items &middot; ${pct}%</span></div>${items ? `<ul>${items}</ul>` : '<p class="muted">No items.</p>'}</div>`;
    }).join('');
    const photosHtml = updates.filter(u => u.thumb).map(u => `<figure class="photo"><img src="${u.thumb}"/><figcaption>${esc(u.room || '')}${u.date ? ' &middot; ' + esc(u.date) : ''}</figcaption></figure>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(p?.name || 'Project')} report</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#1d1d1b;margin:0;padding:34px}
  h1{font-size:24px;margin:0 0 2px}
  .sub{color:#666;font-size:12.5px;margin-bottom:18px}
  .hero{background:#2b2b26;color:#fff;border-radius:14px;padding:22px}
  .pct{font-size:46px;font-weight:800;color:#cfe04a;line-height:1}
  .bar{height:9px;background:rgba(255,255,255,.16);border-radius:6px;margin:12px 0;overflow:hidden}
  .bar>span{display:block;height:100%;background:#cfe04a}
  .meta{display:flex;justify-content:space-between;font-size:12px;color:#c4c4bd}
  h2{font-size:15px;border-bottom:2px solid #ececec;padding-bottom:6px;margin:24px 0 12px}
  .phase{margin-bottom:12px}
  .ph-h{display:flex;justify-content:space-between;font-size:14px}
  ul{margin:6px 0 0;padding-left:18px;font-size:13px}
  li{margin:2px 0}
  .muted{color:#8a8a8a;font-size:12px}
  .photos{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  .photo{margin:0}
  .photo img{width:100%;height:150px;object-fit:cover;border-radius:8px;display:block;background:#eee}
  figcaption{font-size:11px;color:#555;margin-top:3px}
  .foot{margin-top:28px;font-size:11px;color:#9a9a9a;border-top:1px solid #ececec;padding-top:10px}
  @media print{body{padding:0 6px}.photo img{height:135px}}
</style></head><body>
  <h1>${esc(p?.name || 'Project')}</h1>
  <div class="sub">${esc(p?.code || '')}${p?.type ? ' &middot; ' + esc(p.type) : ''} &middot; Generated ${today}</div>
  <div class="hero">
    <div class="pct">${overall}%</div>
    <div class="bar"><span style="width:${overall}%"></span></div>
    <div class="meta"><span>${esc(p?.type || 'Renovation project')}</span><span>Est. handover &middot; ${p?.est_handover ? fmt(p.est_handover) : '—'}</span></div>
  </div>
  <h2>Progress detail</h2>
  ${phasesHtml || '<p class="muted">No phases yet.</p>'}
  ${photosHtml ? `<h2>Photos</h2><div class="photos">${photosHtml}</div>` : ''}
  <div class="foot">INH Renovation &amp; Design &mdash; project report. Generated ${today}.</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},500);};</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { alert('Please allow pop-ups for this site to download the report.'); return; }
    w.document.write(html);
    w.document.close();
  };

  const handleEditProject = async (form) => {
    const id = activeProject?.id;
    if (!id) return;
    // Reflect immediately in the open project + list (the stack holds a snapshot).
    setStack(s => s.map((e, idx) => (idx === s.length - 1 && e.project ? { ...e, project: { ...e.project, ...form } } : e)));
    setProjects(ps => ps.map(p => (p.id === id ? { ...p, ...form } : p)));
    if (!IS_LIVE) return;
    await api.updateProject(id, form);
    await reloadTop();
  };

  const handleDeleteProject = (project) => setConfirm({
    title: 'Delete this project?',
    body: `"${project.name}" and all its phases, items, updates, documents and photos will be permanently removed, freeing their storage.`,
    onYes: async () => {
      await api.deleteProject(project.id);
      setStack([]); setTab('home'); setFeedProjectId(null);
      await reloadTop();
      try { setStorageBytes(await api.getStorageUsage()); } catch (e) { /* ignore */ }
    },
  });

  const handleAddNote = async (body) => {
    const text = String(body || '').trim();
    if (!text || !activeProjectId) return { ok: false, error: 'Please type a message.' };
    if (!IS_LIVE) {
      // Demo mode: keep the note in memory so the redesigned UI is fully usable.
      const entry = {
        id: 'demo-' + Date.now(), body: text, at: new Date().toISOString(),
        author: profile?.full_name || profile?.name || 'You',
        role: role || 'owner',
      };
      setDemoNotes(m => ({ ...m, [activeProjectId]: [...(m[activeProjectId] || []), entry] }));
      return { ok: true };
    }
    // Optimistic: append the note straight away so the poster sees it land.
    const optimistic = {
      id: 'tmp-' + Date.now(), body: text, at: new Date().toISOString(),
      author: profile?.full_name || profile?.name || 'You',
      role: profile?.role || role || 'homeowner',
    };
    setDetail(d => d && d.projectId === activeProjectId
      ? { ...d, notes: [...(d.notes || []), optimistic] } : d);
    try {
      await api.addStatusNote(activeProjectId, text);
      // Reload so the server-assigned id and author link replace the temp entry.
      await loadDetail(activeProjectId);
      return { ok: true };
    } catch (e) {
      // Roll back the optimistic entry and hand the error back to the caller.
      setDetail(d => d && d.projectId === activeProjectId
        ? { ...d, notes: (d.notes || []).filter(n => n.id !== optimistic.id) } : d);
      return { ok: false, error: e?.message || 'Could not save note.' };
    }
  };

  const handleSetStage = async (stage) => {
    const id = activeProject?.id;
    if (!id) return;
    const stage_dates = { ...(activeProject?.stage_dates || {}), [stage]: todayISO };
    setStack(s => s.map((e, idx) => (idx === s.length - 1 && e.project ? { ...e, project: { ...e.project, stage, stage_dates } } : e)));
    setProjects(ps => ps.map(p => (p.id === id ? { ...p, stage, stage_dates } : p)));
    if (!IS_LIVE) return;
    // Update stage and stage_dates separately so a missing stage_dates column
    // doesn't stop the stage itself from saving.
    try { await api.updateProject(id, { stage }); } catch (e) { /* stage column not migrated */ }
    try { await api.updateProject(id, { stage_dates }); } catch (e) { /* stage_dates not migrated */ }
    try { await reloadTop(); } catch (e) { /* ignore */ }
  };

  const handleUpdateFinance = async (patch) => {
    const id = activeProject?.id;
    if (!id) return;
    setStack(s => s.map((e, idx) => (idx === s.length - 1 && e.project ? { ...e, project: { ...e.project, ...patch } } : e)));
    setProjects(ps => ps.map(p => (p.id === id ? { ...p, ...patch } : p)));
    if (!IS_LIVE) return;
    try { await api.updateProject(id, patch); await reloadTop(); } catch (e) { /* keep optimistic */ }
  };

  const handleUpdateStageItems = async (stage, items) => {
    const id = activeProject?.id;
    if (!id) return;
    const stage_items = { ...(activeProject?.stage_items || {}), [stage]: items };
    setStack(s => s.map((e, idx) => (idx === s.length - 1 && e.project ? { ...e, project: { ...e.project, stage_items } } : e)));
    setProjects(ps => ps.map(p => (p.id === id ? { ...p, stage_items } : p)));
    if (!IS_LIVE) return;
    try { await api.updateProject(id, { stage_items }); await reloadTop(); } catch (e) { /* keep optimistic */ }
  };

  const handleUpdateProgress = async (id, progress) => {
    if (!IS_LIVE) {
      setProjects(ps => ps.map(p => p.id === id ? { ...p, progress, status: progress >= 100 ? 'ontrack' : p.status } : p));
      return;
    }
    await api.updateProjectProgress(id, progress);
    await reloadTop();
    await loadDetail(activeProjectId);
  };

  const handleAddUpdate = async (room, files = []) => {
    if (!IS_LIVE) return;
    await api.uploadUpdate(activeProjectId, room, files);
    await loadDetail(activeProjectId);
  };

  const handleAddSchedule = async (form) => {
    if (!IS_LIVE) return;
    await api.addScheduleItem(activeProjectId, form);
    await loadDetail(activeProjectId);
  };

  const handleAddPhase = async (form) => {
    if (!IS_LIVE) return;
    await api.addPhase(activeProjectId, form);
    await loadDetail(activeProjectId);
  };

  const handleMarkPhaseComplete = async (phase) => {
    if (!IS_LIVE) return;
    await api.updatePhase(phase.id, { status: 'completed', pct: 100 });
    await loadDetail(activeProjectId);
  };

  const handleAddItem = async (phase, title) => {
    if (!IS_LIVE) return;
    await api.addPhaseTask(phase.id, activeProjectId, title);
    await refreshAfterItemChange();
  };

  const handleTaskPhotoUpload = async (taskId, room, files = []) => {
    if (!IS_LIVE) return;
    await api.uploadTaskPhotos(activeProjectId, taskId, room, files);
    await loadDetail(activeProjectId);
  };

  const handleDeleteSchedule = (item) => {
    if (item.source === 'task') {
      // Unschedule (clear the date) — the item stays inside its phase.
      setConfirm({
        title: 'Remove from this week?',
        body: `"${item.title}" will be unscheduled. The item stays in its phase.`,
        onYes: async () => { await api.setPhaseTaskDate(item.taskId, null); await loadDetail(activeProjectId); },
      });
    } else {
      setConfirm({
        title: 'Delete this item?',
        body: `"${item.title}" will be removed from the schedule.`,
        onYes: async () => { await api.deleteScheduleItem(item.id); await loadDetail(activeProjectId); },
      });
    }
  };

  const handleDeletePhase = (phase) => setConfirm({
    title: 'Delete this phase?',
    body: `"${phase.name}" and all its items will be permanently removed.`,
    onYes: async () => { await api.deletePhase(phase.id); await refreshAfterItemChange(); },
  });

  const handleDeleteTask = (task) => setConfirm({
    title: 'Delete this item?',
    body: `"${task.title}" and its photos/remark will be removed.`,
    onYes: async () => { await api.deletePhaseTask(task.id); setTask(null); await refreshAfterItemChange(); },
  });

  const handleToggleSchedule = async (item) => {
    if (!IS_LIVE) return;
    if (item.source === 'task') {
      await api.setPhaseTaskDone(item.taskId, item.state !== 'completed');
    } else {
      await api.setScheduleState(item.id, item.state === 'completed' ? 'upcoming' : 'completed');
    }
    await loadDetail(activeProjectId);
  };

  const handleTogglePhaseTask = async (task) => {
    if (!IS_LIVE) return;
    await api.setPhaseTaskDone(task.id, !task.done);
    await refreshAfterItemChange();
  };

  const handleMovePhase = async (from, to) => {
    if (!IS_LIVE) return;
    const arr = (detail?.phases || []).slice();
    if (to < 0 || to >= arr.length) return;
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    await api.reorderPhases(arr.map(p => p.id));
    await loadDetail(activeProjectId);
  };

  const handleMoveTask = async (phase, from, to) => {
    if (!IS_LIVE) return;
    const arr = (phase.tasks || []).slice();
    if (to < 0 || to >= arr.length) return;
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    await api.reorderPhaseTasks(arr.map(t => t.id));
    await loadDetail(activeProjectId);
  };

  const handleUploadDoc = async (file, opts) => {
    if (!IS_LIVE) return;
    await api.uploadDocument(activeProjectId, file, opts);
    await loadDetail(activeProjectId);
  };

  const handleOpenDoc = async (doc) => {
    if (!IS_LIVE || !doc.storage_path) return;
    const url = await api.getDocumentUrl(doc.storage_path);
    window.open(url, '_blank', 'noopener');
  };

  const handleAddMember = async (userId) => {
    if (!IS_LIVE) return;
    await api.addMember(activeProjectId, userId);
    await loadDetail(activeProjectId);
    await reloadTop();
  };

  const handleRemoveMember = async (userId) => {
    if (!IS_LIVE) return;
    await api.removeMember(activeProjectId, userId);
    await loadDetail(activeProjectId);
    await reloadTop();
  };

  const handleSetPayment = async (id, status) => {
    if (!IS_LIVE) return;
    await api.setPaymentStatus(id, status);
    await loadDetail(activeProjectId);
    await reloadTop();
  };

  const handleAddPayment = async (form) => {
    if (!IS_LIVE) return;
    await api.addPayment(activeProjectId, form);
    await loadDetail(activeProjectId);
    await reloadTop();
  };

  const handleEditPayment = async (id, form) => {
    if (!IS_LIVE) return;
    await api.updatePayment(id, form);
    await loadDetail(activeProjectId);
    await reloadTop();
  };

  const handleDeletePayment = async (id) => {
    if (!IS_LIVE) return;
    await api.deletePayment(id);
    await loadDetail(activeProjectId);
    await reloadTop();
  };

  // ---- header config ----
  const header = () => {
    if (top) {
      // Note: this object's values are all evaluated before [top.type] selects
      // one, so guard top.project — the 'users' entry is pushed without one.
      const h = {
        overview:   { eyebrow: top.project?.code, title: 'Overview', back: pop },
        feesDetail: { eyebrow: 'Fees Release · Owner', title: top.project?.name, back: pop },
        users:      { eyebrow: 'Owner tools', title: 'Users', back: pop },
        plan:       { eyebrow: 'Owner tools', title: 'Plan & storage', back: pop },
        backup:     { eyebrow: 'Owner tools', title: 'Backup & export', back: pop },
        template:   { eyebrow: 'Settings', title: 'Default items', back: pop },
        team:       { eyebrow: top.project?.name, title: 'Team & Access', back: pop },
        documents:  { eyebrow: top.project?.name, title: 'Documents', back: pop },
      }[top.type];
      return <AppHeader role={role} profile={me} {...h} />;
    }
    const base = {
      home: role === 'homeowner'
        ? { eyebrow: 'Your project', title: 'Overview', property: currentProject?.name, onProperty: () => setSheet('property'), onBell: () => {} }
        : { eyebrow: 'INH Design & Build', title: 'Projects', onBell: () => {} },
      updates:   { eyebrow: 'INH Design & Build', title: 'Updates', property: currentProject?.name, onProperty: projects.length > 1 ? () => setSheet('property') : undefined, onBell: () => {} },
      documents: { eyebrow: 'INH Design & Build', title: 'Documents', property: currentProject?.name, onProperty: projects.length > 1 ? () => setSheet('property') : undefined },
      fees:      { eyebrow: role === 'owner' ? 'Owner approves' : 'Request payments', title: 'Fees Release' },
      more:      { title: 'More' },
    }[tab];
    return <AppHeader role={role} profile={me} {...base} onAvatar={() => setTab('more')} />;
  };

  // ---- body ----
  const body = () => {
    if (top) {
      if (top.type === 'overview')
        return <OverviewScreen role={role} project={activeProject} phases={live(detail?.phases)} schedule={mergedSchedule}
          onEditProgress={CAN_EDIT(role) ? () => setSheet('progress') : null}
          onEditProject={CAN_EDIT(role) ? () => setSheet('editProject') : null}
          onAddSchedule={CAN_EDIT(role) ? () => setSheet('addSchedule') : null}
          onAddPhase={CAN_EDIT(role) ? () => setSheet('addPhase') : null}
          onMarkPhaseComplete={CAN_EDIT(role) ? handleMarkPhaseComplete : null}
          onAddItem={CAN_EDIT(role) ? handleAddItem : null}
          onItemPhoto={CAN_EDIT(role) ? (t => setPhoto({ add: true, room: t.title, taskId: t.id })) : null}
          onAddSchedulePhoto={CAN_EDIT(role) ? (t => setPhoto({ add: true, room: t.title, taskId: t.source === 'task' ? t.taskId : undefined })) : null}
          onPhasePhoto={CAN_EDIT(role) ? (p => setPhoto({ add: true, room: p.name })) : null}
          onToggleScheduleDone={CAN_EDIT(role) ? handleToggleSchedule : null}
          onTogglePhaseTask={CAN_EDIT(role) ? handleTogglePhaseTask : null}
          onMovePhase={CAN_EDIT(role) ? handleMovePhase : null}
          onMoveTask={CAN_EDIT(role) ? handleMoveTask : null}
          onDeleteSchedule={CAN_EDIT(role) ? handleDeleteSchedule : null}
          onDeletePhase={CAN_EDIT(role) ? handleDeletePhase : null}
          onDeleteItem={CAN_EDIT(role) ? handleDeleteTask : null}
          onManageAccess={role === 'owner' ? () => push({ type: 'team', project: activeProject }) : null}
          onOpenDocs={CAN_EDIT(role) ? () => push({ type: 'documents', project: activeProject }) : null}
          onReport={handleReport}
          onSetStage={CAN_EDIT(role) ? handleSetStage : null}
          onUpdateStageItems={CAN_EDIT(role) ? handleUpdateStageItems : null}
          onUpdateFinance={CAN_EDIT(role) ? handleUpdateFinance : null}
          notes={IS_LIVE ? (detail?.notes || []) : (demoNotes[activeProjectId] || [])}
          onAddNote={handleAddNote}
          onOpenTask={t => setTask(t)} />;
      if (top.type === 'feesDetail')
        return <FeesDetailScreen project={top.project} payments={live(detail?.payments)} audit={IS_LIVE ? audit : undefined}
          onAdd={handleAddPayment}
          onSetStatus={role === 'owner' ? handleSetPayment : null}
          onEdit={role === 'owner' ? handleEditPayment : null}
          onDelete={role === 'owner' ? handleDeletePayment : null}
          canSetStatus={role === 'owner'} />;
      if (top.type === 'plan')
        return <PlanScreen users={IS_LIVE ? users : INH_DATA.users} projects={IS_LIVE ? projects : INH_DATA.projects} storageBytes={storageBytes} />;
      if (top.type === 'backup')
        return <BackupScreen onExport={IS_LIVE ? api.exportBackup : null} />;
      if (top.type === 'template')
        return <TemplateScreen template={template} onSave={handleSaveTemplate} />;
      if (top.type === 'users')
        return <UsersScreen users={IS_LIVE ? users : undefined} onInvite={() => setSheet('invite')}
          onChangeRole={role === 'owner' && IS_LIVE ? handleChangeRole : null}
          onDeleteUser={role === 'owner' && IS_LIVE ? handleDeleteUser : null}
          projects={IS_LIVE ? projects : []}
          onUserProjects={IS_LIVE ? api.listUserProjects : null}
          onAssignProject={role === 'owner' && IS_LIVE ? handleAssignUserProject : null}
          onUnassignProject={role === 'owner' && IS_LIVE ? handleUnassignUserProject : null}
          meId={profile?.id} storageBytes={storageBytes} />;
      if (top.type === 'documents')
        return <DocumentsScreen role={role} documents={live(detail?.documents)}
          onUpload={CAN_EDIT(role) ? () => setSheet('uploadDoc') : null} onOpenDoc={handleOpenDoc} />;
      if (top.type === 'team')
        return <TeamScreen project={top.project} members={live(detail?.members)} homeowners={homeowners}
          people={IS_LIVE ? users.filter(u => u.role !== 'owner') : undefined}
          owner={IS_LIVE
            ? users.find(u => u.role === 'owner')
            : { name: INH_DATA.roleMeta.owner.person, initials: INH_DATA.roleMeta.owner.initials }}
          onAddMember={handleAddMember} onRemoveMember={handleRemoveMember} />;
    }
    if (tab === 'home') {
      if (role === 'homeowner') {
        if (!currentProject) return <EmptyState text="No project assigned to your account yet." />;
        return <OverviewScreen role={role} project={currentProject} phases={live(detail?.phases)} schedule={mergedSchedule}
          onEditProgress={CAN_EDIT(role) ? () => setSheet('progress') : null}
          onEditProject={CAN_EDIT(role) ? () => setSheet('editProject') : null}
          onAddSchedule={CAN_EDIT(role) ? () => setSheet('addSchedule') : null}
          onAddPhase={CAN_EDIT(role) ? () => setSheet('addPhase') : null}
          onMarkPhaseComplete={CAN_EDIT(role) ? handleMarkPhaseComplete : null}
          onAddItem={CAN_EDIT(role) ? handleAddItem : null}
          onItemPhoto={CAN_EDIT(role) ? (t => setPhoto({ add: true, room: t.title, taskId: t.id })) : null}
          onAddSchedulePhoto={CAN_EDIT(role) ? (t => setPhoto({ add: true, room: t.title, taskId: t.source === 'task' ? t.taskId : undefined })) : null}
          onPhasePhoto={CAN_EDIT(role) ? (p => setPhoto({ add: true, room: p.name })) : null}
          onToggleScheduleDone={CAN_EDIT(role) ? handleToggleSchedule : null}
          onTogglePhaseTask={CAN_EDIT(role) ? handleTogglePhaseTask : null}
          onMovePhase={CAN_EDIT(role) ? handleMovePhase : null}
          onMoveTask={CAN_EDIT(role) ? handleMoveTask : null}
          onDeleteSchedule={CAN_EDIT(role) ? handleDeleteSchedule : null}
          onDeletePhase={CAN_EDIT(role) ? handleDeletePhase : null}
          onDeleteItem={CAN_EDIT(role) ? handleDeleteTask : null}
          onManageAccess={role === 'owner' ? () => push({ type: 'team', project: activeProject }) : null}
          onOpenDocs={CAN_EDIT(role) ? () => push({ type: 'documents', project: activeProject }) : null}
          onReport={handleReport}
          onSetStage={CAN_EDIT(role) ? handleSetStage : null}
          onUpdateStageItems={CAN_EDIT(role) ? handleUpdateStageItems : null}
          onUpdateFinance={CAN_EDIT(role) ? handleUpdateFinance : null}
          notes={IS_LIVE ? (detail?.notes || []) : (demoNotes[activeProjectId] || [])}
          onAddNote={handleAddNote}
          onOpenTask={t => setTask(t)} />;
      }
      return <ProjectsScreen role={role} projects={IS_LIVE ? projects : undefined}
        onOpenProject={p => push({ type: 'overview', project: p })}
        onAddProject={role === 'owner' ? () => setSheet('addProject') : null}
        onDeleteProject={role === 'owner' ? handleDeleteProject : null} />;
    }
    if (tab === 'updates')   return <UpdatesScreen role={role} updates={live(detail?.updates)} onPhoto={p => setPhoto(p)} />;
    if (tab === 'documents') return <DocumentsScreen role={role} documents={live(detail?.documents)}
      onUpload={CAN_EDIT(role) ? () => setSheet('uploadDoc') : null} onOpenDoc={handleOpenDoc} />;
    if (tab === 'fees')      return <FeesScreen fees={IS_LIVE ? fees : undefined} onOpenProject={p => push({ type: 'feesDetail', project: p })} isOwner={role === 'owner'} pendingCount={pendingFees} />;
    if (tab === 'more')      return <MoreScreen role={role} profile={me}
      onUsers={() => push({ type: 'users' })} onTeam={() => push({ type: 'team', project: currentProject })}
      onAddAccount={IS_LIVE ? () => setSheet('invite') : null}
      onPlan={role === 'owner' ? () => push({ type: 'plan' }) : null}
      onBackup={role === 'owner' && IS_LIVE ? () => push({ type: 'backup' }) : null}
      backupDue={role === 'owner' && IS_LIVE ? backupIsDue() : false}
      onSignOut={signOut} onEditName={() => setSheet('editName')}
      onSettings={() => setSheet('settings')} onSupport={() => setSheet('support')}
      onAllProjects={() => { setTab('home'); setStack([]); }}
      onManageUpdates={() => { setTab('updates'); setStack([]); }} />;
    return null;
  };

  // ---- render ----
  let device;
  if (auth === 'login') device = <Login onSignIn={signIn} onForgot={() => setAuth('forgot')} onRegister={() => setAuth('register')} live={IS_LIVE} />;
  else if (auth === 'register') device = <Register onSignUp={signUp} onBack={() => setAuth('login')} />;
  else if (auth === 'forgot') device = <ForgotFlow onBack={() => setAuth('login')} onDone={() => setAuth('login')} />;
  else device = (
    <div className="inh-app">
      <Sidebar role={role} active={tab} onChange={t => { setTab(t); setStack([]); }} onSignOut={signOut} profile={me} storageBytes={storageBytes} badges={role === 'owner' ? { fees: pendingFees } : undefined} />
      <div className="inh-main">
        {header()}
        {body()}
        <TabBar role={role} active={tab} onChange={t => { setTab(t); setStack([]); }} badges={role === 'owner' ? { fees: pendingFees } : undefined} />
      </div>
      {sheet === 'property' && <PropertySheet role={role} projects={projects} selectedId={currentProject?.id} onSelect={setFeedProjectId} onClose={() => setSheet(null)} />}
      {sheet === 'invite' && <AddAccountSheet onClose={() => setSheet(null)} onCreate={handleAddAccount} callerRole={role} />}
      {sheet === 'editName' && <EditNameSheet initial={profile?.full_name || profile?.name || ''} onClose={() => setSheet(null)} onSave={handleEditName} />}
      {sheet === 'settings' && <SettingsSheet lang={lang} onChangeLang={changeLang} onClose={() => setSheet(null)}
        onEditTemplate={CAN_EDIT(role) ? () => { setSheet(null); push({ type: 'template' }); } : null} />}
      {sheet === 'support' && <SupportSheet onClose={() => setSheet(null)} />}
      {sheet === 'addProject' && <AddProjectSheet onClose={() => setSheet(null)} onCreate={handleAddProject} onAddItems={handleAddProjectItems} suggestedCode={nextProjectCode} template={template} />}
      {sheet === 'editProject' && <EditProjectSheet project={activeProject} onClose={() => setSheet(null)} onSave={handleEditProject} />}
      {sheet === 'uploadDoc' && <UploadDocSheet onClose={() => setSheet(null)} onSave={handleUploadDoc} />}
      {sheet === 'addSchedule' && <AddScheduleSheet onClose={() => setSheet(null)} onSave={handleAddSchedule} />}
      {sheet === 'addPhase' && <AddPhaseSheet onClose={() => setSheet(null)} onSave={handleAddPhase} />}
      {sheet === 'progress' && <ProgressSheet project={activeProject} onClose={() => setSheet(null)} onSave={pct => handleUpdateProgress(activeProject.id, pct)} />}
      {photo && <PhotoSheet photo={photo} onClose={() => setPhoto(null)}
        onAdd={photo.taskId ? ((room, files) => handleTaskPhotoUpload(photo.taskId, room, files)) : handleAddUpdate} />}
      {task && <TaskDetailSheet task={task} projectId={activeProjectId} onClose={() => setTask(null)}
        onChanged={CAN_EDIT(role) ? (() => loadDetail(activeProjectId)) : null}
        onDelete={CAN_EDIT(role) ? handleDeleteTask : null} />}
      {confirm && (
        <Dialog onClose={() => setConfirm(null)}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="trash" size={24} color="var(--error)" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, textAlign: 'center', marginBottom: 6 }}>{confirm.title}</div>
          <p className="body-2" style={{ textAlign: 'center', marginBottom: 18 }}>{confirm.body}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={async () => { const fn = confirm.onYes; setConfirm(null); try { await fn(); } catch (e) { /* surfaced via reload */ } }}>Delete</Btn>
          </div>
        </Dialog>
      )}
    </div>
  );

  return (
    <div className="inh-root">
      {/* demo identity rail — only in demo mode (no Supabase keys). With real
          auth the role comes from the signed-in user's profile. */}
      {!IS_LIVE && (
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '10px 16px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', background: '#fff' }}>
          <img src="/assets/inh-appicon.png" alt="INH" style={{ width: 26, height: 26, borderRadius: 7 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--fg-2)', marginRight: 4 }}>Viewing as</span>
          {['owner', 'admin', 'homeowner'].map(r => (
            <button key={r} onClick={() => { switchRole(r); if (auth !== 'in') setAuth('in'); }}
              className={'inh-chip' + (role === r && auth === 'in' ? ' active' : '')}
              style={{ textTransform: 'capitalize', fontSize: 12.5, padding: '6px 13px' }}>{r}</button>
          ))}
          <button onClick={() => setAuth('login')} className="inh-chip" style={{ fontSize: 12.5, padding: '6px 13px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="lock" size={13} /> Login
          </button>
        </div>
      )}
      <div className="inh-stage">
        {device}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="inh-scroll">
      <div className="inh-pad" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Icon name="building" size={28} color="var(--fg-3)" />
        </div>
        <p className="body-2">{text}</p>
      </div>
    </div>
  );
}
