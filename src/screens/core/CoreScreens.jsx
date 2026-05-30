/* INH — core screens: Overview, Updates, Documents */
import { useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { Pill, ProgressBar } from '../../components/primitives.jsx';
import { INH_DATA } from '../../data/data.js';

export const CAN_EDIT = role => role === 'admin' || role === 'owner';

// Status derived from progress + est. handover date (overdue is date-driven).
export function projectStatus(p) {
  const pct = p?.progress ?? 0;
  if (pct >= 100) return 'completed';
  const h = p?.est_handover ? new Date(p.est_handover) : null;
  if (h && !isNaN(h)) { const today = new Date(); today.setHours(0, 0, 0, 0); if (h < today) return 'overdue'; }
  return p?.status && p.status !== 'overdue' ? p.status : 'ontrack';
}

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
export function OverviewScreen({ role, project, phases = INH_DATA.phases, schedule = INH_DATA.thisWeek, onEditProgress, onEditProject, onAddSchedule, onAddPhase, onMarkPhaseComplete, onAddItem, onItemPhoto, onAddSchedulePhoto, onToggleScheduleDone, onTogglePhaseTask, onOpenTask, onMovePhase, onMoveTask, onDeleteSchedule, onDeletePhase, onDeleteItem, onManageAccess }) {
  const [open, setOpen] = useState(2);
  const [itemDraft, setItemDraft] = useState('');
  const [dragPhase, setDragPhase] = useState(null);   // index of phase being dragged
  const [dragItem, setDragItem] = useState(null);     // index of item being dragged (within open phase)
  const handover = project?.est_handover
    ? new Date(project.est_handover).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
    : '20 Jun';

  // Overall progress auto-derives from item completion when items exist.
  const itemTotals = (phases || []).reduce((a, p) => {
    const tks = p.tasks || [];
    return { t: a.t + tks.length, d: a.d + tks.filter(x => x.done).length };
  }, { t: 0, d: 0 });
  const hasItems = itemTotals.t > 0;
  const overallPct = hasItems ? Math.round((itemTotals.d / itemTotals.t) * 100) : (project?.progress ?? 0);
  // "Overdue" is tied to the project's est. handover date, not a manual flag.
  const overdue = (() => {
    const h = project?.est_handover ? new Date(project.est_handover) : null;
    if (!h || isNaN(h)) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return h < today;
  })();
  const derivedStatus = overallPct >= 100 ? 'completed' : (overdue ? 'overdue' : 'ontrack');

  return (
    <div className="inh-scroll">
      <div className="inh-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Hero progress */}
        <div className="inh-hero">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="inh-eyebrow" style={{ color: 'var(--on-dark-2)' }}>{project?.name || 'Overall Progress'}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {onManageAccess && (
                <button onClick={onManageAccess} aria-label="Team & access"
                  style={{ border: 'none', background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--on-dark-2)', fontSize: 11.5, fontWeight: 600 }}>
                  <Icon name="users" size={12} color="var(--on-dark-2)" /> Team
                </button>
              )}
              {CAN_EDIT(role) && onEditProject && (
                <button onClick={onEditProject} aria-label="Edit project"
                  style={{ border: 'none', background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--on-dark-2)', fontSize: 11.5, fontWeight: 600 }}>
                  <Icon name="pencil" size={12} color="var(--on-dark-2)" /> Edit
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '6px 0 12px' }}>
            <div className="display" style={{ color: 'var(--inh-lime)', fontSize: 52 }}>{overallPct}%</div>
            <Pill status={derivedStatus} />
          </div>
          <ProgressBar pct={overallPct} dark green={overallPct >= 100} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, color: 'var(--on-dark-2)', fontSize: 12.5 }}>
            <span>{project?.type || 'Renovation project'}</span>
            <span>Est. handover · {handover}</span>
          </div>
          {CAN_EDIT(role) && (
            hasItems ? (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: 'var(--on-dark-2)', fontSize: 12.5, fontWeight: 600 }}>
                <Icon name="check-circle" size={15} color="var(--on-dark-2)" /> Auto-calculated from {itemTotals.d}/{itemTotals.t} items
              </div>
            ) : onEditProgress && (
              <button onClick={onEditProgress} style={{
                marginTop: 16, width: '100%', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)',
                color: 'var(--inh-lime)', borderRadius: 12, padding: '11px 14px', fontWeight: 700, fontSize: 13.5,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}>
                <Icon name="check-circle" size={16} color="var(--inh-lime)" /> Update overall progress
              </button>
            )
          )}
        </div>

        {/* What's happening now — derived from the schedule */}
        {(() => {
          const nowItem = (schedule || []).find(s => s.state === 'today') || (schedule || []).find(s => s.state !== 'completed');
          if (!nowItem) return null;
          return (
            <div>
              <div className="inh-section">What's happening now</div>
              <div className="inh-card" style={{ padding: 16, display: 'flex', gap: 13, alignItems: 'center' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--inh-lime-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="hard-hat" size={24} color="var(--inh-charcoal)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{nowItem.title}</div>
                  <div className="body-2" style={{ marginTop: 2 }}>{nowItem.state === 'today' ? 'Scheduled for today' : 'Coming up next'}</div>
                </div>
                <Pill status={nowItem.state} />
              </div>
            </div>
          );
        })()}

        {/* This week */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="inh-section" style={{ margin: '4px 0 10px' }}>This week</div>
            {CAN_EDIT(role) && onAddSchedule && <button className="inh-link" style={{ fontSize: 12.5 }} onClick={onAddSchedule}>+ Add item</button>}
          </div>
          <div className="inh-card" style={{ overflow: 'hidden' }}>
            {schedule.length === 0 && <div className="inh-row" style={{ cursor: 'default' }}><div className="inh-row__main"><div className="inh-row__sub">Nothing scheduled yet.</div></div></div>}
            {schedule.map((t, i) => {
              const done = t.state === 'completed';
              return (
              <div key={i} className="inh-row" style={{ cursor: 'default' }}>
                {CAN_EDIT(role) && onToggleScheduleDone ? (
                  <button onClick={() => onToggleScheduleDone(t)} title={done ? 'Mark not done' : 'Mark complete'} aria-label="Toggle complete"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', marginRight: 2 }}>
                    <Icon name={done ? 'check-circle' : 'circle'} size={22} color={done ? 'var(--success)' : 'var(--fg-3)'} stroke={done ? 2.2 : 1.8} />
                  </button>
                ) : null}
                <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: 'var(--fg-3)' }}>{t.day}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--fg-1)' }}>{t.date}</div>
                </div>
                <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }} />
                <div className="inh-row__main">
                  <div className="inh-row__title" style={{ fontSize: 14, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--fg-3)' : 'var(--fg-1)' }}>{t.title}</div>
                </div>
                {CAN_EDIT(role) && onAddSchedulePhoto && (
                  <button onClick={() => onAddSchedulePhoto(t)} title="Add progress photos" aria-label="Add progress photos"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border-strong)',
                      background: 'var(--surface)', cursor: 'pointer', marginRight: 8,
                    }}>
                    <Icon name="camera" size={16} color="var(--fg-2)" />
                  </button>
                )}
                <Pill status={t.state} />
                {CAN_EDIT(role) && onDeleteSchedule && (
                  <button onClick={() => onDeleteSchedule(t)} title="Delete item" aria-label="Delete item"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', marginLeft: 4 }}>
                    <Icon name="trash" size={15} color="var(--fg-3)" />
                  </button>
                )}
              </div>
            );})}
          </div>
        </div>

        {/* Project progress accordion */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="inh-section" style={{ margin: '4px 0 10px' }}>Project progress</div>
            {CAN_EDIT(role) && onAddPhase && <button className="inh-link" style={{ fontSize: 12.5 }} onClick={onAddPhase}>+ Add phase</button>}
          </div>
          <div className="inh-card" style={{ overflow: 'hidden' }}>
            {phases.length === 0 && <div className="inh-row" style={{ cursor: 'default' }}><div className="inh-row__main"><div className="inh-row__sub">No phases added yet.</div></div></div>}
            {phases.map((p, i) => {
              const tasks = p.tasks || [];
              const total = tasks.length;
              const doneN = tasks.filter(t => t.done).length;
              // Progress derives from item completion when the phase has items.
              const derivedPct = total ? Math.round((doneN / total) * 100) : p.pct;
              const isDone = p.status === 'completed' || (total > 0 && doneN === total);
              const editable = CAN_EDIT(role);
              return (
              <div key={i}
                onDragOver={e => { if (dragPhase != null) e.preventDefault(); }}
                onDrop={() => { if (dragPhase != null && dragPhase !== i && onMovePhase) onMovePhase(dragPhase, i); setDragPhase(null); }}
                style={{ borderTop: i ? '1px solid var(--border)' : 'none', background: dragPhase != null && dragPhase !== i ? 'var(--inh-lime-soft)' : 'transparent', transition: 'background .12s' }}>
                <div className="inh-row" onClick={() => setOpen(open === i ? -1 : i)} style={{ paddingTop: 13, paddingBottom: 13 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? 'var(--success)' : (derivedPct > 0 || p.status === 'progress') ? 'var(--inh-lime)' : 'var(--surface-2)',
                    color: isDone ? '#fff' : 'var(--inh-charcoal)' }}>
                    {isDone ? <Icon name="check" size={15} stroke={3} /> :
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12 }}>{i + 1}</span>}
                  </div>
                  <div className="inh-row__main">
                    <div className="inh-row__title" style={{ fontSize: 14.5 }}>{p.name}</div>
                    <div className="inh-row__sub">{total ? `${doneN}/${total} items · ${derivedPct}%` : p.dates}</div>
                  </div>
                  {editable && onMovePhase && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 1, marginRight: 2 }} onClick={e => e.stopPropagation()}>
                      <span draggable onDragStart={() => setDragPhase(i)} onDragEnd={() => setDragPhase(null)} title="Drag to reorder" aria-label="Drag to reorder"
                        style={{ cursor: 'grab', display: 'flex', padding: 3 }}>
                        <Icon name="grip" size={16} color="var(--fg-3)" />
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => i > 0 && onMovePhase(i, i - 1)} disabled={i === 0} aria-label="Move phase up"
                          style={{ border: 'none', background: 'transparent', padding: 2, cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.25 : 1, display: 'flex' }}>
                          <Icon name="chevron-up" size={16} color="var(--fg-2)" stroke={2.4} />
                        </button>
                        <button onClick={() => i < phases.length - 1 && onMovePhase(i, i + 1)} disabled={i === phases.length - 1} aria-label="Move phase down"
                          style={{ border: 'none', background: 'transparent', padding: 2, cursor: i === phases.length - 1 ? 'default' : 'pointer', opacity: i === phases.length - 1 ? 0.25 : 1, display: 'flex' }}>
                          <Icon name="chevron-down" size={16} color="var(--fg-2)" stroke={2.4} />
                        </button>
                      </div>
                    </div>
                  )}
                  {editable && onDeletePhase && (
                    <button onClick={e => { e.stopPropagation(); onDeletePhase(p); }} aria-label="Delete phase"
                      style={{ border: 'none', background: 'transparent', padding: 4, cursor: 'pointer', display: 'flex', marginRight: 2 }}>
                      <Icon name="trash" size={15} color="var(--fg-3)" />
                    </button>
                  )}
                  <Icon name="chevron-down" size={18} color="var(--fg-3)" style={{ transform: open === i ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                </div>
                {open === i && (
                  <div style={{ padding: '0 16px 16px 56px' }}>
                    <ProgressBar pct={derivedPct} green={isDone} />
                    <div style={{ marginTop: 8 }}>
                      <span className="meta">{isDone ? 'All items done' : total ? `${doneN} of ${total} items done` : `${derivedPct}% complete`}</span>
                    </div>

                    {/* Items — each can be ticked, photographed, or opened for remark/photos */}
                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
                      {tasks.map((t, ti) => (
                        <div key={t.id}
                          onDragOver={e => { if (dragItem != null) { e.preventDefault(); e.stopPropagation(); } }}
                          onDrop={e => { e.stopPropagation(); if (dragItem != null && dragItem !== ti && onMoveTask) onMoveTask(p, dragItem, ti); setDragItem(null); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', borderTop: ti ? '1px solid var(--border)' : 'none', background: dragItem != null && dragItem !== ti ? 'var(--inh-lime-soft)' : 'transparent', borderRadius: 6, transition: 'background .12s' }}>
                          <button onClick={() => editable && onTogglePhaseTask && onTogglePhaseTask(t)} aria-label="Toggle item"
                            style={{ border: 'none', background: 'transparent', padding: 0, flexShrink: 0, display: 'flex', cursor: editable && onTogglePhaseTask ? 'pointer' : 'default' }}>
                            <Icon name={t.done ? 'check-circle' : 'circle'} size={19} color={t.done ? 'var(--success)' : 'var(--fg-3)'} stroke={t.done ? 2.2 : 1.8} />
                          </button>
                          <button onClick={() => onOpenTask && onOpenTask(t)}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', padding: 0, textAlign: 'left', cursor: onOpenTask ? 'pointer' : 'default', minWidth: 0 }}>
                            <span style={{ flex: 1, fontSize: 13.5, color: t.done ? 'var(--fg-3)' : 'var(--fg-1)', textDecoration: t.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                            {t.due_date && <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}><Icon name="calendar" size={11} color="var(--fg-3)" />{new Date(t.due_date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}</span>}
                            {t.note && <Icon name="file-text" size={13} color="var(--fg-3)" />}
                          </button>
                          {editable && onItemPhoto && (
                            <button onClick={() => onItemPhoto(t)} aria-label="Add photo to item"
                              style={{ border: '1px solid var(--border-strong)', background: 'var(--surface)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                              <Icon name="camera" size={15} color="var(--fg-2)" />
                            </button>
                          )}
                          {onOpenTask && (
                            <button onClick={() => onOpenTask(t)} aria-label="Open item"
                              style={{ border: 'none', background: 'transparent', padding: 2, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                              <Icon name="chevron-right" size={16} color="var(--fg-3)" />
                            </button>
                          )}
                          {editable && onDeleteItem && (
                            <button onClick={() => onDeleteItem(t)} aria-label="Delete item"
                              style={{ border: 'none', background: 'transparent', padding: 3, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                              <Icon name="trash" size={14} color="var(--fg-3)" />
                            </button>
                          )}
                          {editable && onMoveTask && (
                            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                              <span draggable onDragStart={() => setDragItem(ti)} onDragEnd={() => setDragItem(null)} title="Drag to reorder" aria-label="Drag to reorder"
                                style={{ cursor: 'grab', display: 'flex', padding: 2 }}>
                                <Icon name="grip" size={14} color="var(--fg-3)" />
                              </span>
                              <button onClick={() => ti > 0 && onMoveTask(p, ti, ti - 1)} disabled={ti === 0} aria-label="Move item up"
                                style={{ border: 'none', background: 'transparent', padding: 2, cursor: ti === 0 ? 'default' : 'pointer', opacity: ti === 0 ? 0.25 : 1, display: 'flex' }}>
                                <Icon name="chevron-up" size={14} color="var(--fg-3)" stroke={2.4} />
                              </button>
                              <button onClick={() => ti < total - 1 && onMoveTask(p, ti, ti + 1)} disabled={ti === total - 1} aria-label="Move item down"
                                style={{ border: 'none', background: 'transparent', padding: 2, cursor: ti === total - 1 ? 'default' : 'pointer', opacity: ti === total - 1 ? 0.25 : 1, display: 'flex' }}>
                                <Icon name="chevron-down" size={14} color="var(--fg-3)" stroke={2.4} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {total === 0 && <div className="meta" style={{ padding: '4px 0' }}>No items yet. Add the tasks for this phase below.</div>}
                    </div>

                    {/* Add an item to this phase */}
                    {editable && onAddItem && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <div className="inh-input" style={{ flex: 1 }}>
                          <span className="lead"><Icon name="plus" size={16} /></span>
                          <input value={open === i ? itemDraft : ''} placeholder="Add an item…"
                            onChange={e => setItemDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && itemDraft.trim()) { e.preventDefault(); onAddItem(p, itemDraft.trim()); setItemDraft(''); } }} />
                        </div>
                        <button onClick={() => { if (itemDraft.trim()) { onAddItem(p, itemDraft.trim()); setItemDraft(''); } }} disabled={!itemDraft.trim()} aria-label="Add item"
                          style={{ flexShrink: 0, width: 44, borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--surface)', cursor: itemDraft.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="plus" size={18} color="var(--fg-1)" />
                        </button>
                      </div>
                    )}

                    {editable && onMarkPhaseComplete && !isDone && (
                      <div style={{ marginTop: 12 }}>
                        <button onClick={() => onMarkPhaseComplete(p)} style={{
                          display: 'flex', alignItems: 'center', gap: 6, border: 'none',
                          background: 'var(--inh-lime)', color: 'var(--inh-charcoal)', borderRadius: 10, padding: '8px 12px',
                          fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                        }}>
                          <Icon name="check-circle" size={15} color="var(--inh-charcoal)" /> Mark phase complete
                        </button>
                      </div>
                    )}
                    {isDone && (
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 700, fontSize: 12.5 }}>
                        <Icon name="check-circle" size={15} color="var(--success)" /> Phase complete
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
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
