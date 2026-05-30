/* INH — App shell, routing, role switching, live data */
import { useState, useEffect } from 'react';
import { Icon } from './components/Icon.jsx';
import { Btn, Pill, AppHeader, TabBar, Sidebar, Sheet, Dialog } from './components/primitives.jsx';
import { INH_DATA } from './data/data.js';
import { supabase, IS_LIVE, normalizeLogin } from './lib/supabase.js';
import * as api from './lib/api.js';
import { Login, Register, ForgotFlow, Field } from './screens/auth/Auth.jsx';
import { getLang, setLang, LANGUAGES, t } from './lib/i18n.js';
import { OverviewScreen, UpdatesScreen, DocumentsScreen, CAN_EDIT } from './screens/core/CoreScreens.jsx';
import {
  ProjectsScreen, FeesScreen, FeesDetailScreen, UsersScreen, TeamScreen, MoreScreen,
} from './screens/owner/OwnerScreens.jsx';

const initialsOf = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

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
  return (
    <Sheet onClose={onClose}>
      <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3', background: photo.tone, position: 'relative', marginBottom: 14, backgroundImage: photo.thumb ? `url(${photo.thumb})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {!photo.thumb && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.32 }}>
            <Icon name="image" size={46} color="#fff" stroke={1.5} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>{photo.room}</div>
          <div className="inh-row__sub">{photo.date} · {photo.count} photos</div>
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
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(IS_LIVE);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

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
    if (!IS_LIVE) return;
    try { await api.setPhaseTaskDone(task.id, next); onChanged && onChanged(); }
    catch (e) { setErr(e?.message || 'Could not update'); setDone(!next); }
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
  return (
    <Sheet title="Sub-task" onClose={onClose}>
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

      <label className="inh-label">Date</label>
      <input type="date" value={date} onChange={e => saveDate(e.target.value)} disabled={!canEdit}
        style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--surface)', padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', color: 'var(--fg-1)', boxSizing: 'border-box' }} />
      <p className="meta" style={{ margin: '6px 0 14px' }}>Items with a date show on "This week".</p>

      <label className="inh-label">Remark</label>
      <textarea value={note} onChange={e => setNote(e.target.value)} disabled={!canEdit}
        placeholder={canEdit ? 'Add a note about this sub-task…' : 'No remark'} rows={3}
        style={{ width: '100%', resize: 'vertical', borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--surface)', padding: '11px 13px', fontSize: 14, fontFamily: 'inherit', color: 'var(--fg-1)', boxSizing: 'border-box' }} />
      {canEdit && note !== (task.note || '') && (
        <div style={{ marginTop: 8 }}><Btn variant="ghost" size="sm" icon="check" onClick={saveNote} disabled={busy}>{busy ? 'Saving…' : 'Save remark'}</Btn></div>
      )}

      <label className="inh-label" style={{ marginTop: 16 }}>Photos</label>
      {loading ? (
        <p className="body-2">Loading…</p>
      ) : photos.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {photos.map((url, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: 10, backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center', background: 'var(--surface-2)' }} />
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

function PropertySheet({ role, projects, onClose }) {
  const list = role === 'homeowner' ? projects.slice(0, 1) : projects;
  return (
    <Sheet title={role === 'homeowner' ? 'Switch property' : 'Switch project'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {list.map((p, i) => (
          <div key={p.id} className="inh-row" style={{ borderRadius: 12, background: i === 0 ? 'var(--inh-lime-soft)' : 'transparent' }} onClick={onClose}>
            <div className="inh-row__ico" style={{ background: 'var(--inh-lime-tint)' }}><Icon name="building" size={20} color="var(--inh-charcoal)" /></div>
            <div className="inh-row__main"><div className="inh-row__title" style={{ fontSize: 14.5 }}>{p.name}</div><div className="inh-row__sub">{p.code}</div></div>
            {i === 0 && <Icon name="check" size={18} color="var(--inh-charcoal)" stroke={2.6} />}
          </div>
        ))}
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

function SettingsSheet({ lang, onChangeLang, onClose }) {
  return (
    <Sheet title={t('Settings & language')} onClose={onClose}>
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

function AddProjectSheet({ onClose, onSave }) {
  const [f, setF] = useState({ name: '', code: '', address: '', type: '', est_handover: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (v) => setF(s => ({ ...s, [k]: v }));
  const ready = f.name.trim() && f.code.trim();
  const save = async () => {
    if (!ready) return;
    setBusy(true); setErr(null);
    try { await onSave(f); onClose(); }
    catch (e) { setErr(e?.message || 'Could not create project'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet title="Add project" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Project name" icon="building" value={f.name} onChange={set('name')} placeholder="e.g. Lot 23, Bukit Indah" autoFocus />
        <Field label="Project code" icon="briefcase" value={f.code} onChange={set('code')} placeholder="e.g. P-2026-045" />
        <Field label="Address" icon="map-pin" value={f.address} onChange={set('address')} placeholder="Site address" />
        <Field label="Type" icon="home" value={f.type} onChange={set('type')} placeholder="e.g. Full home renovation" />
        <Field label="Est. handover" icon="calendar" type="date" value={f.est_handover} onChange={set('est_handover')} placeholder="" />
      </div>
      {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 10 }}>{err}</p>}
      <div style={{ marginTop: 18 }}><Btn variant="primary" icon="plus" onClick={save} disabled={busy || !ready}>{busy ? 'Creating…' : 'Create project'}</Btn></div>
    </Sheet>
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

  // data
  const [projects, setProjects] = useState(IS_LIVE ? [] : INH_DATA.projects);
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState(IS_LIVE ? [] : INH_DATA.users);
  const [homeowners, setHomeowners] = useState([]);
  const [fees, setFees] = useState(IS_LIVE ? [] : INH_DATA.projects);
  const [audit, setAudit] = useState(IS_LIVE ? [] : INH_DATA.audit);
  const [detail, setDetail] = useState(null);   // { projectId, phases, schedule, updates, documents, payments, members }

  const push = v => setStack(s => [...s, v]);
  const pop = () => setStack(s => s.slice(0, -1));
  const top = stack[stack.length - 1];

  const currentProject = projects[0];
  const activeProject = top?.project || currentProject;
  const activeProjectId = activeProject?.id;
  const live = v => (IS_LIVE ? (v ?? []) : undefined);   // demo → undefined → screen uses INH_DATA defaults

  // Real signed-in identity for the chrome (sidebar foot + header avatar).
  // In demo mode this stays null so screens fall back to roleMeta.
  const me = profile
    ? { name: profile.full_name || profile.name, initials: profile.initials || initialsOf(profile.full_name || profile.name) }
    : null;

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
    ]);
    const [p, pr, us, ho, fe, au, cr] = r.map(x => (x.status === 'fulfilled' ? x.value : null));
    if (p) setProjects(p);
    if (pr) setProfile(pr);
    if (us) setUsers(cr ? us.map(u => ({ ...u, ...(cr[u.id] || {}) })) : us);
    if (ho) setHomeowners(ho);
    if (fe) setFees(fe);
    if (au) setAudit(au);
  };

  const loadDetail = async (projectId) => {
    if (!IS_LIVE || !projectId) return;
    const r = await Promise.allSettled([
      api.listPhases(projectId), api.listSchedule(projectId), api.listUpdates(projectId),
      api.listDocuments(projectId), api.listPayments(projectId), api.listMembers(projectId),
    ]);
    const [phases, schedule, updates, documents, payments, members] = r.map(x => (x.status === 'fulfilled' ? x.value : []));
    setDetail({ projectId, phases, schedule, updates, documents, payments, members });
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

  const handleChangeRole = async (userId, role) => {
    if (!IS_LIVE) return;
    await api.setUserRole(userId, role);
    await reloadTop();
  };

  const handleAddAccount = async ({ email, login, password, fullName, role }) => {
    if (!IS_LIVE) return;
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
      setProjects(ps => [...ps, {
        id: 'p' + (ps.length + 1), name: form.name, code: form.code, address: form.address,
        type: form.type, progress: 0, status: 'pending', committed: 0, released: 0, pending: 0, releasedPct: 0,
      }]);
      return;
    }
    await api.createProject(form);
    await reloadTop();
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
    await loadDetail(activeProjectId);
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
    onYes: async () => { await api.deletePhase(phase.id); await loadDetail(activeProjectId); },
  });

  const handleDeleteTask = (task) => setConfirm({
    title: 'Delete this item?',
    body: `"${task.title}" and its photos/remark will be removed.`,
    onYes: async () => { await api.deletePhaseTask(task.id); setTask(null); await loadDetail(activeProjectId); },
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
    await loadDetail(activeProjectId);
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

  // ---- header config ----
  const header = () => {
    if (top) {
      // Note: this object's values are all evaluated before [top.type] selects
      // one, so guard top.project — the 'users' entry is pushed without one.
      const h = {
        overview:   { eyebrow: top.project?.code, title: 'Overview', back: pop },
        feesDetail: { eyebrow: 'Fees Release · Owner', title: top.project?.name, back: pop },
        users:      { eyebrow: 'Owner tools', title: 'Users', back: pop },
        team:       { eyebrow: top.project?.name, title: 'Team & Access', back: pop },
      }[top.type];
      return <AppHeader role={role} profile={me} {...h} />;
    }
    const base = {
      home: role === 'homeowner'
        ? { eyebrow: 'Your project', title: 'Overview', property: currentProject?.name, onProperty: () => setSheet('property'), onBell: () => {} }
        : { eyebrow: 'INH Design & Build', title: 'Projects', onBell: () => {} },
      updates:   { eyebrow: currentProject?.name || 'INH Design & Build', title: 'Updates', onBell: () => {} },
      documents: { eyebrow: currentProject?.name || 'INH Design & Build', title: 'Documents' },
      fees:      { eyebrow: 'Owner only', title: 'Fees Release' },
      more:      { title: 'More' },
    }[tab];
    return <AppHeader role={role} profile={me} {...base} onAvatar={() => setTab('more')} />;
  };

  // ---- body ----
  const body = () => {
    if (top) {
      if (top.type === 'overview')
        return <OverviewScreen role={role} project={top.project} phases={live(detail?.phases)} schedule={mergedSchedule}
          onEditProgress={CAN_EDIT(role) ? () => setSheet('progress') : null}
          onEditProject={CAN_EDIT(role) ? () => setSheet('editProject') : null}
          onAddSchedule={CAN_EDIT(role) ? () => setSheet('addSchedule') : null}
          onAddPhase={CAN_EDIT(role) ? () => setSheet('addPhase') : null}
          onMarkPhaseComplete={CAN_EDIT(role) ? handleMarkPhaseComplete : null}
          onAddItem={CAN_EDIT(role) ? handleAddItem : null}
          onItemPhoto={CAN_EDIT(role) ? (t => setPhoto({ add: true, room: t.title, taskId: t.id })) : null}
          onAddSchedulePhoto={CAN_EDIT(role) ? (t => setPhoto({ add: true, room: t.title, taskId: t.source === 'task' ? t.taskId : undefined })) : null}
          onToggleScheduleDone={CAN_EDIT(role) ? handleToggleSchedule : null}
          onTogglePhaseTask={CAN_EDIT(role) ? handleTogglePhaseTask : null}
          onMovePhase={CAN_EDIT(role) ? handleMovePhase : null}
          onMoveTask={CAN_EDIT(role) ? handleMoveTask : null}
          onDeleteSchedule={CAN_EDIT(role) ? handleDeleteSchedule : null}
          onDeletePhase={CAN_EDIT(role) ? handleDeletePhase : null}
          onOpenTask={t => setTask(t)} />;
      if (top.type === 'feesDetail')
        return <FeesDetailScreen project={top.project} payments={live(detail?.payments)} audit={IS_LIVE ? audit : undefined} onSetStatus={handleSetPayment} />;
      if (top.type === 'users')
        return <UsersScreen users={IS_LIVE ? users : undefined} onInvite={() => setSheet('invite')}
          onChangeRole={role === 'owner' && IS_LIVE ? handleChangeRole : null} meId={profile?.id} />;
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
          onToggleScheduleDone={CAN_EDIT(role) ? handleToggleSchedule : null}
          onTogglePhaseTask={CAN_EDIT(role) ? handleTogglePhaseTask : null}
          onMovePhase={CAN_EDIT(role) ? handleMovePhase : null}
          onMoveTask={CAN_EDIT(role) ? handleMoveTask : null}
          onDeleteSchedule={CAN_EDIT(role) ? handleDeleteSchedule : null}
          onDeletePhase={CAN_EDIT(role) ? handleDeletePhase : null}
          onOpenTask={t => setTask(t)} />;
      }
      return <ProjectsScreen role={role} projects={IS_LIVE ? projects : undefined}
        onOpenProject={p => push({ type: 'overview', project: p })}
        onAddProject={role === 'owner' ? () => setSheet('addProject') : null} />;
    }
    if (tab === 'updates')   return <UpdatesScreen role={role} updates={live(detail?.updates)} onPhoto={p => setPhoto(p)} />;
    if (tab === 'documents') return <DocumentsScreen role={role} documents={live(detail?.documents)}
      onUpload={CAN_EDIT(role) ? () => setSheet('uploadDoc') : null} onOpenDoc={handleOpenDoc} />;
    if (tab === 'fees')      return <FeesScreen fees={IS_LIVE ? fees : undefined} onOpenProject={p => push({ type: 'feesDetail', project: p })} />;
    if (tab === 'more')      return <MoreScreen role={role} profile={me}
      onUsers={() => push({ type: 'users' })} onTeam={() => push({ type: 'team', project: currentProject })}
      onAddAccount={IS_LIVE ? () => setSheet('invite') : null}
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
      <Sidebar role={role} active={tab} onChange={t => { setTab(t); setStack([]); }} onSignOut={signOut} profile={me} />
      <div className="inh-main">
        {header()}
        {body()}
        <TabBar role={role} active={tab} onChange={t => { setTab(t); setStack([]); }} />
      </div>
      {sheet === 'property' && <PropertySheet role={role} projects={projects} onClose={() => setSheet(null)} />}
      {sheet === 'invite' && <AddAccountSheet onClose={() => setSheet(null)} onCreate={handleAddAccount} callerRole={role} />}
      {sheet === 'editName' && <EditNameSheet initial={profile?.full_name || profile?.name || ''} onClose={() => setSheet(null)} onSave={handleEditName} />}
      {sheet === 'settings' && <SettingsSheet lang={lang} onChangeLang={changeLang} onClose={() => setSheet(null)} />}
      {sheet === 'support' && <SupportSheet onClose={() => setSheet(null)} />}
      {sheet === 'addProject' && <AddProjectSheet onClose={() => setSheet(null)} onSave={handleAddProject} />}
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
