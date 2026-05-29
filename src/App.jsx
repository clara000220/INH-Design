/* INH — App shell, routing, role switching */
import { useState, useEffect } from 'react';
import { Icon } from './components/Icon.jsx';
import { Btn, Pill, AppHeader, TabBar, Sheet } from './components/primitives.jsx';
import { IOSDevice } from './device/IOSDevice.jsx';
import { INH_DATA } from './data/data.js';
import { Login, ForgotFlow, Field } from './screens/auth/Auth.jsx';
import { OverviewScreen, UpdatesScreen, DocumentsScreen } from './screens/core/CoreScreens.jsx';
import {
  ProjectsScreen, FeesScreen, FeesDetailScreen, UsersScreen, TeamScreen, MoreScreen,
} from './screens/owner/OwnerScreens.jsx';

/* Scales the fixed 402×874 device to fit the available stage */
function DeviceStage({ children }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => {
      const availH = window.innerHeight - 96;   // demo bar + padding
      const availW = window.innerWidth - 32;
      setScale(Math.min(1, availH / 874, availW / 402));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{ height: 874 * scale, width: 402 * scale, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
}

function PhotoSheet({ photo, onClose }) {
  if (photo.add) {
    return (
      <Sheet title="Add update" onClose={onClose}>
        <p className="body-2" style={{ marginBottom: 16 }}>Publish photos to the homeowner's Updates feed.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Btn variant="charcoal" icon="camera" onClick={onClose}>Take photo</Btn>
          <Btn variant="ghost" icon="image" onClick={onClose}>Choose from library</Btn>
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

function PropertySheet({ role, onClose }) {
  const list = role === 'homeowner' ? INH_DATA.projects.slice(0, 1) : INH_DATA.projects;
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

export default function App() {
  const [auth, setAuth] = useState('login');   // login | forgot | in
  const [role, setRole] = useState('owner');
  const [tab, setTab] = useState('home');
  const [stack, setStack] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [photo, setPhoto] = useState(null);

  const project = INH_DATA.projects[0];
  const push = v => setStack(s => [...s, v]);
  const pop = () => setStack(s => s.slice(0, -1));
  const top = stack[stack.length - 1];

  const signIn = () => { setAuth('in'); setRole(role); setTab('home'); setStack([]); };
  const switchRole = r => { setRole(r); setTab('home'); setStack([]); setSheet(null); setPhoto(null); };

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
        ? { eyebrow: 'Your project', title: 'Overview', property: project.name, onProperty: () => setSheet('property'), onBell: () => {} }
        : { eyebrow: 'INH Design & Build', title: 'Projects', onBell: () => {} },
      updates:   { eyebrow: role === 'homeowner' ? project.name : 'INH Design & Build', title: 'Updates', onBell: () => {} },
      documents: { eyebrow: role === 'homeowner' ? project.name : 'INH Design & Build', title: 'Documents' },
      fees:      { eyebrow: 'Owner only', title: 'Fees Release' },
      more:      { title: 'More' },
    }[tab];
    return <AppHeader role={role} {...base} onAvatar={() => setTab('more')} />;
  };

  // ---- body ----
  const body = () => {
    if (top) {
      if (top.type === 'overview')   return <OverviewScreen role={role} project={top.project} />;
      if (top.type === 'feesDetail') return <FeesDetailScreen project={top.project} />;
      if (top.type === 'users')      return <UsersScreen onInvite={() => setSheet('invite')} />;
      if (top.type === 'team')       return <TeamScreen project={top.project} />;
    }
    if (tab === 'home') {
      return role === 'homeowner'
        ? <OverviewScreen role={role} project={project} />
        : <ProjectsScreen role={role} onOpenProject={p => push({ type: 'overview', project: p })} />;
    }
    if (tab === 'updates')   return <UpdatesScreen role={role} onPhoto={p => setPhoto(p)} />;
    if (tab === 'documents') return <DocumentsScreen role={role} />;
    if (tab === 'fees')      return <FeesScreen onOpenProject={p => push({ type: 'feesDetail', project: p })} />;
    if (tab === 'more')      return <MoreScreen role={role} onUsers={() => push({ type: 'users' })} onTeam={() => push({ type: 'team', project })} onSignOut={() => { setAuth('login'); }} />;
    return null;
  };

  // ---- render ----
  let device;
  if (auth === 'login') device = <Login onSignIn={signIn} onForgot={() => setAuth('forgot')} />;
  else if (auth === 'forgot') device = <ForgotFlow onBack={() => setAuth('login')} onDone={() => setAuth('login')} />;
  else device = (
    <div className="inh-app">
      {header()}
      {body()}
      <TabBar role={role} active={tab} onChange={t => { setTab(t); setStack([]); }} />
      {sheet === 'property' && <PropertySheet role={role} onClose={() => setSheet(null)} />}
      {sheet === 'invite' && <InviteSheet onClose={() => setSheet(null)} />}
      {photo && <PhotoSheet photo={photo} onClose={() => setPhoto(null)} />}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--canvas)' }}>
      {/* demo identity rail */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 16px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', background: '#fff' }}>
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
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <DeviceStage>
          <IOSDevice>{device}</IOSDevice>
        </DeviceStage>
      </div>
    </div>
  );
}
