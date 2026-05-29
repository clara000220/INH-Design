/* INH — shared primitives */
import { Icon } from './Icon.jsx';
import { INH_DATA } from '../data/data.js';

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
export function AppHeader({ eyebrow, title, property, onProperty, role, onBell, onAvatar, back }) {
  const meta = INH_DATA.roleMeta[role];
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
          <div className="inh-prop" onClick={onProperty}>
            <Icon name="map-pin" size={14} color="var(--fg-3)" />
            {property}
            <Icon name="chevron-down" size={15} color="var(--fg-3)" />
          </div>
        )}
      </div>
      {onBell && (
        <button className="inh-iconbtn" onClick={onBell} aria-label="Notifications">
          <Icon name="bell" size={20} /><span className="dot" />
        </button>
      )}
      {meta && <div className="inh-avatar" onClick={onAvatar}>{meta.initials}</div>}
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
    { id: 'more', label: 'More', icon: 'more-horizontal' },
  ],
  owner: [
    { id: 'home', label: 'Projects', icon: 'briefcase' },
    { id: 'updates', label: 'Updates', icon: 'image' },
    { id: 'fees', label: 'Fees', icon: 'banknote' },
    { id: 'more', label: 'More', icon: 'more-horizontal' },
  ],
};

/* Desktop sidebar — replaces the bottom tab bar at >=960px */
export function Sidebar({ role, active, onChange, onSignOut }) {
  const tabs = TAB_DEFS[role] || TAB_DEFS.homeowner;
  const meta = INH_DATA.roleMeta[role];
  return (
    <aside className="inh-sidebar">
      <div className="inh-sidebar__brand">
        <img src="/assets/inh-appicon.png" alt="INH" />
        <span>INH</span>
      </div>
      <nav className="inh-sidebar__nav">
        {tabs.map(t => (
          <button key={t.id} className={'inh-navitem' + (active === t.id ? ' active' : '')} onClick={() => onChange(t.id)}>
            <Icon name={t.icon} size={20} stroke={active === t.id ? 2.2 : 2} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      {meta && (
        <div className="inh-sidebar__foot">
          <div className="inh-avatar">{meta.initials}</div>
          <div className="inh-sidebar__who">
            <div className="inh-sidebar__name">{meta.person}</div>
            <div className="inh-sidebar__role">{meta.label}</div>
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

export function TabBar({ role, active, onChange }) {
  const tabs = TAB_DEFS[role] || TAB_DEFS.homeowner;
  return (
    <div className="inh-tabbar">
      {tabs.map(t => (
        <button key={t.id} className={'inh-tab' + (active === t.id ? ' active' : '')} onClick={() => onChange(t.id)}>
          <span className="inh-tab__ico"><Icon name={t.icon} size={21} stroke={active === t.id ? 2.2 : 2} /></span>
          <span>{t.label}</span>
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
