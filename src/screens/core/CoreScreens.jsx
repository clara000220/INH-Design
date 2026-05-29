/* INH — core screens: Overview, Updates, Documents */
import { useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { Pill, ProgressBar } from '../../components/primitives.jsx';
import { INH_DATA } from '../../data/data.js';

export const CAN_EDIT = role => role === 'admin' || role === 'owner';

/* ---- shared placeholder photo tile (drop real renovation photos here) ---- */
export function PhotoTile({ room, tone, isNew, count, thumb, onClick }) {
  return (
    <div className="inh-photo" style={{
      background: tone, cursor: 'pointer',
      backgroundImage: thumb ? `url(${thumb})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center',
    }} onClick={onClick}>
      {!thumb && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.32 }}>
          <Icon name="image" size={34} color="#fff" stroke={1.6} />
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '20px 10px 8px', background: 'linear-gradient(transparent, rgba(42,37,35,0.55))' }}>
        <div style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{room}</div>
      </div>
      {isNew && <div className="inh-photo__badge"><Pill status="new" /></div>}
      <div className="inh-photo__count"><Icon name="image" size={11} color="#fff" /> {count}</div>
    </div>
  );
}

/* =================== OVERVIEW =================== */
export function OverviewScreen({ role, project, phases = INH_DATA.phases, schedule = INH_DATA.thisWeek, onEditProgress }) {
  const [open, setOpen] = useState(2);
  const handover = project?.est_handover
    ? new Date(project.est_handover).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
    : '20 Jun';
  return (
    <div className="inh-scroll">
      <div className="inh-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Hero progress */}
        <div className="inh-hero">
          <div className="inh-eyebrow" style={{ color: 'var(--on-dark-2)' }}>Overall Progress</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '6px 0 12px' }}>
            <div className="display" style={{ color: 'var(--inh-lime)', fontSize: 52 }}>{project.progress}%</div>
            <Pill status={project.status} />
          </div>
          <ProgressBar pct={project.progress} dark />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, color: 'var(--on-dark-2)', fontSize: 12.5 }}>
            <span>Carpentry &amp; built-ins</span>
            <span>Est. handover · {handover}</span>
          </div>
          {CAN_EDIT(role) && onEditProgress && (
            <button onClick={onEditProgress} style={{
              marginTop: 16, width: '100%', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)',
              color: 'var(--inh-lime)', borderRadius: 12, padding: '11px 14px', fontWeight: 700, fontSize: 13.5,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              <Icon name="check-circle" size={16} color="var(--inh-lime)" /> Update overall progress
            </button>
          )}
        </div>

        {/* What's happening now */}
        <div>
          <div className="inh-section">What's happening now</div>
          <div className="inh-card" style={{ padding: 16, display: 'flex', gap: 13, alignItems: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--inh-lime-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="hard-hat" size={24} color="var(--inh-charcoal)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Kitchen cabinet carcass install</div>
              <div className="body-2" style={{ marginTop: 2 }}>Mutiara Carpentry is on site today</div>
            </div>
            <Pill status="progress" />
          </div>
        </div>

        {/* This week */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="inh-section" style={{ margin: '4px 0 10px' }}>This week</div>
            {CAN_EDIT(role) && <button className="inh-link" style={{ fontSize: 12.5 }}>Edit schedule</button>}
          </div>
          <div className="inh-card" style={{ overflow: 'hidden' }}>
            {schedule.map((t, i) => (
              <div key={i} className="inh-row" style={{ cursor: 'default' }}>
                <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--fg-3)' }}>{t.day}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--fg-1)' }}>{t.date}</div>
                </div>
                <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
                <div className="inh-row__main">
                  <div className="inh-row__title" style={{ fontSize: 14 }}>{t.title}</div>
                </div>
                <Pill status={t.state} />
              </div>
            ))}
          </div>
        </div>

        {/* Project progress accordion */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="inh-section" style={{ margin: '4px 0 10px' }}>Project progress</div>
            {CAN_EDIT(role) && <button className="inh-link" style={{ fontSize: 12.5 }}>Edit phases</button>}
          </div>
          <div className="inh-card" style={{ overflow: 'hidden' }}>
            {phases.map((p, i) => (
              <div key={i} style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
                <div className="inh-row" onClick={() => setOpen(open === i ? -1 : i)} style={{ paddingTop: 13, paddingBottom: 13 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: p.status === 'completed' ? 'var(--success)' : p.status === 'progress' ? 'var(--inh-lime)' : 'var(--surface-2)',
                    color: p.status === 'completed' ? '#fff' : 'var(--inh-charcoal)' }}>
                    {p.status === 'completed' ? <Icon name="check" size={15} stroke={3} /> :
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12 }}>{i + 1}</span>}
                  </div>
                  <div className="inh-row__main">
                    <div className="inh-row__title" style={{ fontSize: 14.5 }}>{p.name}</div>
                    <div className="inh-row__sub">{p.dates}</div>
                  </div>
                  <Icon name="chevron-down" size={18} color="var(--fg-3)" style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </div>
                {open === i && (
                  <div style={{ padding: '0 16px 16px 56px' }}>
                    <ProgressBar pct={p.pct} green={p.status === 'completed'} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                      <span className="meta">{p.pct}% complete</span>
                      {CAN_EDIT(role) && <button className="inh-link" style={{ fontSize: 12 }}>Update tasks</button>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =================== UPDATES =================== */
export function UpdatesScreen({ role, updates = INH_DATA.updates, onPhoto }) {
  const [filter, setFilter] = useState('All');
  const rooms = ['All', 'Kitchen', 'Living room', 'Master bath', 'Exterior'];
  const list = updates.filter(u => filter === 'All' || u.room === filter);
  // group by date
  const groups = {};
  list.forEach(u => { (groups[u.date] = groups[u.date] || []).push(u); });
  return (
    <div className="inh-scroll" style={{ position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--canvas)', paddingTop: 10, paddingBottom: 10 }}>
        <div className="inh-chiprow">
          {rooms.map(r => (
            <button key={r} className={'inh-chip' + (filter === r ? ' active' : '')} onClick={() => setFilter(r)}>{r}</button>
          ))}
        </div>
      </div>
      <div className="inh-pad" style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {Object.keys(groups).map(date => (
          <div key={date}>
            <div className="inh-section" style={{ margin: '0 0 10px' }}>{date}</div>
            <div className="inh-photogrid">
              {groups[date].map(u => <PhotoTile key={u.id} {...u} onClick={() => onPhoto(u)} />)}
            </div>
          </div>
        ))}
      </div>
      {CAN_EDIT(role) && (
        <button className="inh-fab" aria-label="Add update" onClick={() => onPhoto({ add: true })}>
          <Icon name="camera" size={24} />
        </button>
      )}
    </div>
  );
}

/* =================== DOCUMENTS =================== */
export function DocumentsScreen({ role, documents = INH_DATA.documents, onUpload, onOpenDoc }) {
  const iconFor = k => ({ invoice: 'banknote', plan: 'map-pin', doc: 'file-text' }[k] || 'file-text');
  return (
    <div className="inh-scroll">
      <div className="inh-pad">
        {CAN_EDIT(role) && onUpload && (
          <button className="inh-btn inh-btn--ghost" style={{ marginBottom: 16 }} onClick={onUpload}>
            <Icon name="download" size={18} style={{ transform: 'rotate(180deg)' }} /> Upload document
          </button>
        )}
        <div className="inh-card" style={{ overflow: 'hidden' }}>
          {documents.map(d => (
            <div key={d.id} className="inh-row" style={{ opacity: d.ready ? 1 : 0.55, cursor: d.ready ? 'pointer' : 'default' }}
              onClick={() => d.ready && onOpenDoc && onOpenDoc(d)}>
              <div className="inh-row__ico" style={{ background: d.kind === 'invoice' ? 'var(--inh-lime-tint)' : 'var(--surface-2)' }}>
                <Icon name={iconFor(d.kind)} size={20} color={d.kind === 'invoice' ? 'var(--inh-charcoal)' : 'var(--fg-2)'} />
              </div>
              <div className="inh-row__main">
                <div className="inh-row__title">{d.name}</div>
                <div className="inh-row__sub">{d.meta}</div>
              </div>
              {d.ready ? <Icon name="chevron-right" size={18} color="var(--fg-3)" /> : <Pill status="upcoming">Pending</Pill>}
            </div>
          ))}
        </div>
        <p className="meta" style={{ marginTop: 14, lineHeight: 1.5 }}>
          Invoices here are client bills (money you pay INH). Contractor payments are handled separately by INH.
        </p>
      </div>
    </div>
  );
}
