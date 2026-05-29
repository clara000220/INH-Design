/* INH — App shell, routing, role switching, live data */
import { useState, useEffect } from 'react';
import { Icon } from './components/Icon.jsx';
import { Btn, Pill, AppHeader, TabBar, Sidebar, Sheet } from './components/primitives.jsx';
import { INH_DATA } from './data/data.js';
import { supabase, IS_LIVE } from './lib/supabase.js';
import * as api from './lib/api.js';
import { Login, ForgotFlow, Field } from './screens/auth/Auth.jsx';
import { OverviewScreen, UpdatesScreen, DocumentsScreen, CAN_EDIT } from './screens/core/CoreScreens.jsx';
import {
  ProjectsScreen, FeesScreen, FeesDetailScreen, UsersScreen, TeamScreen, MoreScreen,
} from './screens/owner/OwnerScreens.jsx';

const initialsOf = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

/* ---------- sheets ---------- */
function PhotoSheet({ photo, onClose, onAdd }) {
  const [room, setRoom] = useState('');
  const [busy, setBusy] = useState(false);
  if (photo.add) {
    const publish = async () => {
      if (!room.trim() || !onAdd) { onClose(); return; }
      setBusy(true);
      try { await onAdd(room.trim()); onClose(); } finally { setBusy(false); }
    };
    return (
      <Sheet title="Add update" onClose={onClose}>
        <p className="body-2" style={{ marginBottom: 16 }}>Publish a new update to the homeowner's feed. Name the room or area it covers.</p>
        <Field label="Room / area" icon="image" value={room} onChange={setRoom} placeholder="e.g. Kitchen" autoFocus />
        <div style={{ marginTop: 18 }}>
          <Btn variant="primary" icon="check" onClick={publish} disabled={busy || !room.trim()}>{busy ? 'Publishing…' : 'Publish update'}</Btn>
        </div>
      </Sheet>
    );
  }
  return (
    <Sheet onClose={onClose}>
      <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3', background: photo.tone, position: 'relative', marginBottom: 14 }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.32 }}>
          <Icon name="image" size={46} color="#fff" stroke={1.5} />
        </div>
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

function InviteSheet({ onClose }) {
  const [r, setR] = useState('homeowner');
  return (
    <Sheet title="Invite user" onClose={onClose}>
      <p className="body-2" style={{ marginBottom: 16 }}>We'll email a first-time setup link. INH never sets passwords on a user's behalf.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Name" icon="user" value="" onChange={() => {}} placeholder="Full name" />
        <Field label="Email or phone" icon="mail" value="" onChange={() => {}} placeholder="you@email.com" />
        <div>
          <label className="inh-label">Initial role</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['admin', 'homeowner'].map(role => (
              <button key={role} onClick={() => setR(role)} className={'inh-chip' + (r === role ? ' active' : '')} style={{ flex: 1, textTransform: 'capitalize' }}>{role}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 18 }}><Btn variant="primary" icon="user-plus" onClick={onClose}>Send invite</Btn></div>
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
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await onSave(name.trim()); onClose(); } finally { setBusy(false); }
  };
  return (
    <Sheet title="Edit my name" onClose={onClose}>
      <p className="body-2" style={{ marginBottom: 16 }}>This is the name shown to your team across INH.</p>
      <Field label="Full name" icon="user" value={name} onChange={setName} placeholder="Your name" autoFocus />
      <div style={{ marginTop: 18 }}><Btn variant="primary" icon="check" onClick={save} disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save name'}</Btn></div>
    </Sheet>
  );
}

function AddProjectSheet({ onClose, onSave }) {
  const [f, setF] = useState({ name: '', code: '', address: '', type: '', est_handover: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF(s => ({ ...s, [k]: v }));
  const ready = f.name.trim() && f.code.trim();
  const save = async () => {
    if (!ready) return;
    setBusy(true);
    try { await onSave(f); onClose(); } finally { setBusy(false); }
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
      <div style={{ marginTop: 18 }}><Btn variant="primary" icon="plus" onClick={save} disabled={busy || !ready}>{busy ? 'Creating…' : 'Create project'}</Btn></div>
    </Sheet>
  );
}

function ProgressSheet({ project, onClose, onSave }) {
  const [pct, setPct] = useState(project?.progress ?? 0);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await onSave(Math.round(pct)); onClose(); } finally { setBusy(false); }
  };
  return (
    <Sheet title="Update progress" onClose={onClose}>
      <p className="body-2" style={{ marginBottom: 18 }}>Set overall completion for <b style={{ color: 'var(--fg-1)' }}>{project?.name}</b>. The homeowner sees this instantly.</p>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <span className="display" style={{ fontSize: 46, color: 'var(--inh-charcoal)' }}>{Math.round(pct)}%</span>
      </div>
      <input type="range" min={0} max={100} value={pct} onChange={e => setPct(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--inh-charcoal)' }} />
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

  // ---- live data loaders ----
  const reloadTop = async () => {
    if (!IS_LIVE) return;
    const r = await Promise.allSettled([
      api.listProjects(), api.getMyProfile(), api.listUsers(),
      api.listHomeowners(), api.listProjectFees(), api.listAudit(),
    ]);
    const [p, pr, us, ho, fe, au] = r.map(x => (x.status === 'fulfilled' ? x.value : null));
    if (p) setProjects(p);
    if (pr) setProfile(pr);
    if (us) setUsers(us);
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
    const apply = async (session) => {
      if (!session) { if (active) { setAuth('login'); setRole(null); } return; }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (!active) return;
      setRole(data?.role || 'homeowner');
      setTab('home');
      setStack([]);
      setAuth('in');
      reloadTop();
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

  const signOut = async () => {
    if (IS_LIVE) await supabase.auth.signOut();
    setRole(IS_LIVE ? null : 'owner');
    setProfile(null); setDetail(null);
    setTab('home');
    setStack([]);
    setAuth('login');
  };

  const switchRole = r => { setRole(r); setTab('home'); setStack([]); setSheet(null); setPhoto(null); };

  // ---- interactive feature handlers ----
  const handleEditName = async (name) => {
    if (!IS_LIVE) { setProfile({ name, initials: initialsOf(name) }); return; }
    await api.updateMyName(name);
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

  const handleUpdateProgress = async (id, progress) => {
    if (!IS_LIVE) {
      setProjects(ps => ps.map(p => p.id === id ? { ...p, progress, status: progress >= 100 ? 'ontrack' : p.status } : p));
      return;
    }
    await api.updateProjectProgress(id, progress);
    await reloadTop();
    await loadDetail(activeProjectId);
  };

  const handleAddUpdate = async (room) => {
    if (!IS_LIVE) return;
    await api.addUpdate(activeProjectId, room);
    await loadDetail(activeProjectId);
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
      const h = {
        overview:   { eyebrow: top.project.code, title: 'Overview', back: pop },
        feesDetail: { eyebrow: 'Fees Release · Owner', title: top.project.name, back: pop },
        users:      { eyebrow: 'Owner tools', title: 'Users', back: pop },
        team:       { eyebrow: top.project.name, title: 'Team & Access', back: pop },
      }[top.type];
      return <AppHeader role={role} {...h} />;
    }
    const base = {
      home: role === 'homeowner'
        ? { eyebrow: 'Your project', title: 'Overview', property: currentProject?.name, onProperty: () => setSheet('property'), onBell: () => {} }
        : { eyebrow: 'INH Design & Build', title: 'Projects', onBell: () => {} },
      updates:   { eyebrow: role === 'homeowner' ? currentProject?.name : 'INH Design & Build', title: 'Updates', onBell: () => {} },
      documents: { eyebrow: role === 'homeowner' ? currentProject?.name : 'INH Design & Build', title: 'Documents' },
      fees:      { eyebrow: 'Owner only', title: 'Fees Release' },
      more:      { title: 'More' },
    }[tab];
    return <AppHeader role={role} {...base} onAvatar={() => setTab('more')} />;
  };

  // ---- body ----
  const body = () => {
    if (top) {
      if (top.type === 'overview')
        return <OverviewScreen role={role} project={top.project} phases={live(detail?.phases)} schedule={live(detail?.schedule)}
          onEditProgress={CAN_EDIT(role) ? () => setSheet('progress') : null} />;
      if (top.type === 'feesDetail')
        return <FeesDetailScreen project={top.project} payments={live(detail?.payments)} audit={IS_LIVE ? audit : undefined} onSetStatus={handleSetPayment} />;
      if (top.type === 'users')
        return <UsersScreen users={IS_LIVE ? users : undefined} onInvite={() => setSheet('invite')} />;
      if (top.type === 'team')
        return <TeamScreen project={top.project} members={live(detail?.members)} homeowners={homeowners}
          onAddMember={handleAddMember} onRemoveMember={handleRemoveMember} />;
    }
    if (tab === 'home') {
      if (role === 'homeowner') {
        if (!currentProject) return <EmptyState text="No project assigned to your account yet." />;
        return <OverviewScreen role={role} project={currentProject} phases={live(detail?.phases)} schedule={live(detail?.schedule)} />;
      }
      return <ProjectsScreen role={role} projects={IS_LIVE ? projects : undefined}
        onOpenProject={p => push({ type: 'overview', project: p })}
        onAddProject={role === 'owner' ? () => setSheet('addProject') : null} />;
    }
    if (tab === 'updates')   return <UpdatesScreen role={role} updates={live(detail?.updates)} onPhoto={p => setPhoto(p)} />;
    if (tab === 'documents') return <DocumentsScreen role={role} documents={live(detail?.documents)} />;
    if (tab === 'fees')      return <FeesScreen fees={IS_LIVE ? fees : undefined} onOpenProject={p => push({ type: 'feesDetail', project: p })} />;
    if (tab === 'more')      return <MoreScreen role={role} profile={profile ? { name: profile.full_name || profile.name, initials: profile.initials } : null}
      onUsers={() => push({ type: 'users' })} onTeam={() => push({ type: 'team', project: currentProject })}
      onSignOut={signOut} onEditName={() => setSheet('editName')} />;
    return null;
  };

  // ---- render ----
  let device;
  if (auth === 'login') device = <Login onSignIn={signIn} onForgot={() => setAuth('forgot')} live={IS_LIVE} />;
  else if (auth === 'forgot') device = <ForgotFlow onBack={() => setAuth('login')} onDone={() => setAuth('login')} />;
  else device = (
    <div className="inh-app">
      <Sidebar role={role} active={tab} onChange={t => { setTab(t); setStack([]); }} onSignOut={signOut} />
      <div className="inh-main">
        {header()}
        {body()}
        <TabBar role={role} active={tab} onChange={t => { setTab(t); setStack([]); }} />
      </div>
      {sheet === 'property' && <PropertySheet role={role} projects={projects} onClose={() => setSheet(null)} />}
      {sheet === 'invite' && <InviteSheet onClose={() => setSheet(null)} />}
      {sheet === 'editName' && <EditNameSheet initial={profile?.full_name || profile?.name || ''} onClose={() => setSheet(null)} onSave={handleEditName} />}
      {sheet === 'addProject' && <AddProjectSheet onClose={() => setSheet(null)} onSave={handleAddProject} />}
      {sheet === 'progress' && <ProgressSheet project={activeProject} onClose={() => setSheet(null)} onSave={pct => handleUpdateProgress(activeProject.id, pct)} />}
      {photo && <PhotoSheet photo={photo} onClose={() => setPhoto(null)} onAdd={handleAddUpdate} />}
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
