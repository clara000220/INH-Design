/* INH — shared primitives */
import { Icon } from './Icon.jsx';
import { INH_DATA } from '../data/data.js';
import { t } from '../lib/i18n.js';

export const STATUS_PILL = {
  released:  ['pill-released',  'Released'],
  pending:   ['pill-pending',   'Pending'],
  overdue:   ['pill-overdue',   'Overdue'],
  hold:      ['pill-hold',      'On hold'],
  progress:  ['pill-progress',  'In progress'],
  completed: ['pill-completed', 'Completed'],
  upcoming:  ['pill-upcoming',  'Upcoming'],
  ontrack:   ['pill-ontrack',   'On track'],
  today:     ['pill-today',     'Today'],
  new:       ['pill-new',       'NEW'],
};

export function Pill({ status, children }) {
  const [cls, label] = STATUS_PILL[status] || ['pill-hold', status];
  return <span className={'inh-pill ' + cls}>{children || label}</span>;
}

export function RoleBadge({ role }) {
  const meta = INH_DATA.roleMeta[role];
  return <span className={'inh-badge ' + meta.badge}>{meta.label}</span>;
}

export function Btn({ variant = 'primary', icon, children, onClick, disabled, size, style }) {
  return (
    <button
      className={'inh-btn inh-btn--' + variant + (size === 'sm' ? ' inh-btn--sm' : '')}
      onClick={onClick} disabled={disabled} style={style}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 19} />}
      {children}
    </button>
  );
}

export function ProgressBar({ pct, dark, green }) {
  return (
    <div className={'inh-track' + (dark ? ' inh-track--dark' : '')}>
      <div className={'inh-fill' + (green ? ' inh-fill--green' : '')} style={{ width: pct + '%' }} />
    </div>
  );
}

export function Avatar({ initials, size = 40, light }) {
  return (
    <div className="inh-avatar" style={{
      width: size, height: size, fontSize: size * 0.36,
      background: light ? 'var(--inh-lime-tint)' : 'var(--inh-charcoal)',
      color: light ? 'var(--inh-charcoal)' : 'var(--inh-lime)',
    }}>{initials}</div>
  );
}

/* App header: eyebrow + title + optional property dropdown + avatar/bell */
export function AppHeader({ eyebrow, title, property, onProperty, role, profile, onBell, onAvatar, back }) {
  const meta = INH_DATA.roleMeta[role];
  const initials = profile?.initials || meta?.initials;
  return (
    <div className="inh-header">
      {back && (
        <button className="inh-iconbtn" onClick={back} aria-label="Back">
          <Icon name="arrow-left" size={20} />
        </button>
      )}
      <div className="inh-header__main">
        {eyebrow && <div className="inh-eyebrow">{eyebrow}</div>}
        <div className="inh-title">{title}</div>
        {property && (
          onProperty ? (
            <button onClick={onProperty} aria-label="Switch project"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 6,
                border: '1.5px solid var(--inh-charcoal)', background: 'var(--inh-lime-soft)',
                borderRadius: 999, padding: '6px 13px', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, color: 'var(--inh-charcoal)' }}>
              <Icon name="building" size={15} color="var(--inh-charcoal)" />
              {property}
              <Icon name="chevron-down" size={16} color="var(--inh-charcoal)" stroke={2.4} />
            </button>
          ) : (
            <div className="inh-prop">
              <Icon name="map-pin" size={14} color="var(--fg-3)" />
              {property}
            </div>
          )
        )}
      </div>
      {onBell && (
        <button className="inh-iconbtn" onClick={onBell} aria-label="Notifications">
          <Icon name="bell" size={20} /><span className="dot" />
        </button>
      )}
      {initials && <div className="inh-avatar" onClick={onAvatar}>{initials}</div>}
    </div>
  );
}

/* Bottom tab bar — role-driven */
export const TAB_DEFS = {
  homeowner: [
    { id: 'home', label: 'Overview', icon: 'home' },
    { id: 'updates', label: 'Updates', icon: 'image' },
    { id: 'documents', label: 'Documents', icon: 'file-text' },
    { id: 'more', label: 'More', icon: 'more-horizontal' },
  ],
  admin: [
    { id: 'home', label: 'Projects', icon: 'briefcase' },
    { id: 'updates', label: 'Updates', icon: 'image' },
    { id: 'documents', label: 'Documents', icon: 'file-text' },
    { id: 'fees', label: 'Fees', icon: 'banknote' },
    { id: 'more', label: 'More', icon: 'more-horizontal' },
  ],
  owner: [
    { id: 'home', label: 'Projects', icon: 'briefcase' },
    { id: 'updates', label: 'Updates', icon: 'image' },
    { id: 'documents', label: 'Documents', icon: 'file-text' },
    { id: 'fees', label: 'Fees', icon: 'banknote' },
    { id: 'more', label: 'More', icon: 'more-horizontal' },
  ],
};

/* Desktop sidebar — replaces the bottom tab bar at >=960px */
export function Sidebar({ role, active, onChange, onSignOut, profile, storageBytes = 0, badges }) {
  const tabs = TAB_DEFS[role] || TAB_DEFS.homeowner;
  const meta = INH_DATA.roleMeta[role];
  const name = profile?.name || meta?.person;
  const initials = profile?.initials || meta?.initials;
  const GB = 1024 * 1024 * 1024;
  const storeLabel = storageBytes >= GB ? (storageBytes / GB).toFixed(1) + ' GB'
    : storageBytes >= 1024 * 1024 ? (storageBytes / (1024 * 1024)).toFixed(0) + ' MB'
    : (storageBytes / 1024).toFixed(0) + ' KB';
  const storePct = Math.min(100, Math.round((storageBytes / (10 * GB)) * 100));
  const showStore = role === 'owner' || role === 'admin';
  return (
    <aside className="inh-sidebar">
      <div className="inh-sidebar__brand">
        <img src="/assets/inh-appicon.png" alt="INH" />
        <span>INH</span>
      </div>
      <nav className="inh-sidebar__nav">
        {tabs.map(tab => (
          <button key={tab.id} className={'inh-navitem' + (active === tab.id ? ' active' : '')} onClick={() => onChange(tab.id)}>
            <Icon name={tab.icon} size={20} stroke={active === tab.id ? 2.2 : 2} />
            <span>{t(tab.label)}</span>
            {badges && badges[tab.id] > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--inh-lime)', color: 'var(--inh-charcoal)', borderRadius: 999, fontSize: 10.5, fontWeight: 800, minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{badges[tab.id]}</span>
            )}
          </button>
        ))}
      </nav>
      {showStore && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg-3)', fontWeight: 700, letterSpacing: '.04em', marginBottom: 5 }}>
            <span>STORAGE</span><span>{storeLabel} / 10 GB</span>
          </div>
          <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: storePct + '%', background: storePct > 90 ? 'var(--warning)' : 'var(--inh-lime)' }} />
          </div>
        </div>
      )}
      {(name || initials) && (
        <div className="inh-sidebar__foot">
          <div className="inh-avatar">{initials}</div>
          <div className="inh-sidebar__who">
            <div className="inh-sidebar__name">{name}</div>
            <div className="inh-sidebar__role">{meta?.label}</div>
          </div>
          {onSignOut && (
            <button className="inh-iconbtn" style={{ width: 34, height: 34 }} onClick={onSignOut} aria-label="Sign out">
              <Icon name="log-out" size={16} />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

export function TabBar({ role, active, onChange, badges }) {
  const tabs = TAB_DEFS[role] || TAB_DEFS.homeowner;
  return (
    <div className="inh-tabbar">
      {tabs.map(tab => (
        <button key={tab.id} className={'inh-tab' + (active === tab.id ? ' active' : '')} onClick={() => onChange(tab.id)}>
          <span className="inh-tab__ico" style={{ position: 'relative' }}>
            <Icon name={tab.icon} size={21} stroke={active === tab.id ? 2.2 : 2} />
            {badges && badges[tab.id] > 0 && (
              <span style={{ position: 'absolute', top: -3, right: -7, background: 'var(--inh-lime)', color: 'var(--inh-charcoal)', borderRadius: 999, fontSize: 9, fontWeight: 800, minWidth: 15, height: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>{badges[tab.id]}</span>
            )}
          </span>
          <span>{t(tab.label)}</span>
        </button>
      ))}
    </div>
  );
}

/* Bottom sheet */
export function Sheet({ title, onClose, children }) {
  return (
    <div className="inh-scrim" onClick={onClose}>
      <div className="inh-sheet" onClick={e => e.stopPropagation()}>
        <div className="inh-sheet__grab" />
        {title && <div className="inh-sheet__title">{title}</div>}
        {children}
      </div>
    </div>
  );
}

/* Centered confirm dialog */
export function Dialog({ children, onClose }) {
  return (
    <div className="inh-scrim inh-scrim--center" onClick={onClose}>
      <div className="inh-dialog" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}
