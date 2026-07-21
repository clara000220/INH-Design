/* INH — core screens: Overview, Updates, Documents */
import { useState } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { Pill, ProgressBar } from '../../components/primitives.jsx';
import { INH_DATA, rm } from '../../data/data.js';

export const CAN_EDIT = role => role === 'admin' || role === 'owner';

/* Per-section accent palette. Each Overview section has its own tone so
   the eye can jump between them at a glance: coloured header icon, tinted
   title, and a matching strip along the top edge of the card. Tones are
   defined in one place so they stay consistent across the file. */
const SECTION_TONES = {
  status:   { fg: '#0284c7', tint: '#e0f2fe', icon: 'shield-check' },   // client status → sky
  money:    { fg: '#059669', tint: '#d1fae5', icon: 'wallet' },         // quotation & payments → emerald
  notes:    { fg: '#8a8f00', tint: 'var(--inh-lime-tint)', icon: 'message-circle' }, // notes → lime
  now:      { fg: '#d97706', tint: '#fef3c7', icon: 'clock' },          // what's happening now → amber
  week:     { fg: '#6366f1', tint: '#e0e7ff', icon: 'calendar' },       // this week → indigo
  progress: { fg: '#475569', tint: '#e2e8f0', icon: 'hard-hat' },       // project progress → slate
};

/* Section heading with a coloured icon chip. Pair with SectionCard so the
   card gets a matching accent strip on top. */
function SectionHead({ tone, icon, action, children, style }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 10px', ...style }}>
      <div className="inh-section" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: tone.fg }}>
        <span style={{ width: 22, height: 22, borderRadius: 7, background: tone.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={icon || tone.icon} size={13} color={tone.fg} stroke={2.4} />
        </span>
        <span>{children}</span>
      </div>
      {action}
    </div>
  );
}
/* A card that carries the section's accent as a thin coloured strip along
   its top edge. Any extra styles on `style` are merged over the defaults. */
function SectionCard({ tone, children, style, ...rest }) {
  return (
    <div className="inh-card" style={{ borderTop: `3px solid ${tone.fg}`, ...style }} {...rest}>
      {children}
    </div>
  );
}

// Pick an emoji for a phase from its name, so phases are easy to scan.
const PHASE_EMOJI = [
  [/inspect|defect/, '🔍'], [/design|plan/, '📐'], [/contractor|designer/, '🤝'],
  [/permit|approval|licen/, '📋'], [/measure/, '📏'], [/protect/, '🛡️'],
  [/electric|wiring/, '⚡'], [/air.?con|cooling|aircond/, '❄️'],
  [/plumb|water|drain|sink|toilet|sewer/, '🚰'], [/ceiling/, '🪟'], [/paint/, '🎨'],
  [/carpent|cabinet|built.?in|wardrobe|joinery/, '🪚'], [/light|fixture|lamp|fan/, '💡'],
  [/furniture|appliance|sofa/, '🛋️'], [/demol|hack|tear|hacking/, '🔨'],
  [/tile|tiling|floor/, '🧱'], [/kitchen/, '🍽️'], [/clean/, '🧹'], [/door|window/, '🚪'],
  [/home|setting|setup|handover/, '🏠'], [/roof/, '🏚️'], [/garden|landscap/, '🌿'],
];
function phaseEmoji(name) {
  const n = (name || '').toLowerCase();
  for (const [re, e] of PHASE_EMOJI) if (re.test(n)) return e;
  return '🔧';
}

// "5 days ago" / "today" / "in 3 days" for a YYYY-MM-DD start date.
function startRel(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'today';
  return diff > 0 ? `${diff} day${diff === 1 ? '' : 's'} ago` : `in ${-diff} day${-diff === 1 ? '' : 's'}`;
}

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
/* Quotation price + payments received (money IN). Staff edit; homeowner reads. */
function FinanceCard({ project, onUpdateFinance }) {
  const canEdit = !!onUpdateFinance;
  const quotation = Number(project?.quotation) || 0;
  const received = project?.received_payments || [];
  const totalReceived = received.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const balance = quotation - totalReceived;
  const [editQuot, setEditQuot] = useState(false);
  const [quotVal, setQuotVal] = useState(String(quotation || ''));
  const [rec, setRec] = useState({ amount: '', date: '', note: '' });
  if (!canEdit && quotation === 0 && received.length === 0) return null;

  const saveQuot = () => { onUpdateFinance({ quotation: Number(quotVal) || 0 }); setEditQuot(false); };
  const addRec = () => {
    const amt = Number(rec.amount);
    if (!amt) return;
    onUpdateFinance({ received_payments: [...received, { id: `${received.length}-${amt}`, amount: amt, date: rec.date || '', note: (rec.note || '').trim() }] });
    setRec({ amount: '', date: '', note: '' });
  };
  const removeRec = (i) => onUpdateFinance({ received_payments: received.filter((_, idx) => idx !== i) });
  const fmtDate = (iso) => (iso ? new Date(String(iso).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : '');
  const inS = { border: '1px solid var(--border-strong)', borderRadius: 10, padding: '8px 11px', fontSize: 14, fontFamily: 'inherit', color: 'var(--fg-1)', boxSizing: 'border-box' };

  return (
    <div>
      <SectionHead tone={SECTION_TONES.money}>Quotation &amp; payments</SectionHead>
      <SectionCard tone={SECTION_TONES.money} style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div><div className="meta">Quotation</div><div className="inh-figure" style={{ fontSize: 17 }}>{rm(quotation)}</div></div>
          <div style={{ textAlign: 'center' }}><div className="meta">Received</div><div className="inh-figure" style={{ fontSize: 17, color: 'var(--success)' }}>{rm(totalReceived)}</div></div>
          <div style={{ textAlign: 'right' }}><div className="meta">Balance</div><div className="inh-figure" style={{ fontSize: 17, color: balance > 0 ? 'var(--warning)' : 'var(--fg-1)' }}>{rm(balance)}</div></div>
        </div>

        {canEdit && (editQuot ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input type="number" value={quotVal} onChange={e => setQuotVal(e.target.value)} placeholder="Quotation amount" style={{ ...inS, flex: 1 }} autoFocus />
            <button onClick={saveQuot} style={{ border: 'none', background: 'var(--inh-lime)', color: 'var(--inh-charcoal)', borderRadius: 10, padding: '0 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Save</button>
          </div>
        ) : (
          <button onClick={() => { setQuotVal(String(quotation || '')); setEditQuot(true); }} className="inh-link" style={{ fontSize: 12.5, marginTop: 8 }}>{quotation ? 'Edit quotation' : 'Set quotation'}</button>
        ))}

        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div className="inh-row__sub" style={{ fontWeight: 700, marginBottom: 6 }}>Payments received</div>
          {received.map((r, i) => (
            <div key={r.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
              <div>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{rm(Number(r.amount) || 0)}</span>
                <span className="meta" style={{ marginLeft: 8 }}>{fmtDate(r.date)}{r.note ? ' · ' + r.note : ''}</span>
              </div>
              {canEdit && <button onClick={() => removeRec(i)} aria-label="Remove" style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', padding: 3 }}><Icon name="x" size={14} color="var(--fg-3)" /></button>}
            </div>
          ))}
          {received.length === 0 && <div className="meta">No payments received yet.</div>}
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <input type="number" value={rec.amount} onChange={e => setRec(s => ({ ...s, amount: e.target.value }))} placeholder="Amount (RM)" style={{ ...inS, width: 120 }} />
            <input type="date" value={rec.date} onChange={e => setRec(s => ({ ...s, date: e.target.value }))} style={{ ...inS, width: 150 }} />
            <input value={rec.note} onChange={e => setRec(s => ({ ...s, note: e.target.value }))} placeholder="Note (e.g. deposit)" style={{ ...inS, flex: 1, minWidth: 120 }} />
            <button onClick={addRec} disabled={!Number(rec.amount)} style={{ border: 'none', background: Number(rec.amount) ? 'var(--inh-lime)' : 'var(--surface-2)', color: 'var(--inh-charcoal)', borderRadius: 10, padding: '0 16px', fontWeight: 700, fontSize: 13, cursor: Number(rec.amount) ? 'pointer' : 'default' }}>Add</button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* Notes & feedback thread — homeowner + staff post here. Redesigned so it's
   obvious where to type, whose message is whose, and that the "Send"
   button is the primary action. onAddNote may be async and returns
   { ok, error } — we surface the error inline so posts never silently vanish. */
function NotesCard({ role, notes, onAddNote, noteDraft, setNoteDraft }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const list = notes || [];
  if (!onAddNote && list.length === 0) return null;

  const initialsOf = (name) => {
    const words = String(name || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  };
  const roleTint = (r) => r === 'homeowner' ? 'var(--inh-lime-tint)' : 'var(--surface-2)';
  const roleLabel = (r) => r === 'homeowner' ? 'Client' : r === 'admin' ? 'Staff' : r === 'owner' ? 'Owner' : 'Team';
  const fmtWhen = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return diff + ' min ago';
    if (now.toDateString() === d.toDateString()) return d.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const submit = async () => {
    const text = noteDraft.trim();
    if (!text || busy) return;
    setBusy(true); setErr('');
    // Clear the input immediately so it feels responsive; onAddNote is optimistic.
    setNoteDraft('');
    const res = await Promise.resolve(onAddNote(text));
    if (res && res.ok === false) {
      setErr(res.error || 'Could not save. Please try again.');
      setNoteDraft(text);   // restore what they typed
    }
    setBusy(false);
  };

  const canSend = onAddNote && noteDraft.trim() && !busy;

  const tone = SECTION_TONES.notes;
  return (
    <div>
      <SectionHead tone={tone} action={list.length > 0 && (
        <span style={{ background: tone.tint, color: tone.fg, fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 999 }}>{list.length}</span>
      )}>Notes &amp; feedback</SectionHead>
      <SectionCard tone={tone} style={{ padding: 0, overflow: 'hidden' }}>
        {/* Message list */}
        <div style={{ padding: list.length ? '14px 14px 4px' : '18px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.length === 0 && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--inh-lime-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="message-circle" size={17} color="var(--inh-charcoal)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--fg-1)' }}>
                  {role === 'homeowner' ? 'Send your first note to INH' : 'No messages yet'}
                </div>
                <div className="inh-row__sub" style={{ marginTop: 2 }}>
                  {role === 'homeowner'
                    ? 'Anything you type below will be sent to INH. Use this for questions, feedback, or approvals.'
                    : 'Anything you type below is also visible to the client. Use it for quick updates or replies to feedback.'}
                </div>
              </div>
            </div>
          )}
          {list.map((n, i) => {
            const mine = n.role === role;
            return (
              <div key={n.id || i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, borderRadius: 999, background: roleTint(n.role), color: 'var(--inh-charcoal)', fontWeight: 800, fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {initialsOf(n.author)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg-1)' }}>{n.author || 'Someone'}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: roleTint(n.role), color: 'var(--inh-charcoal)' }}>{roleLabel(n.role)}</span>
                    {mine && <span className="meta" style={{ fontSize: 10.5 }}>You</span>}
                    <span className="meta" style={{ fontSize: 11 }}>{fmtWhen(n.at)}</span>
                  </div>
                  <div style={{ marginTop: 4, padding: '8px 11px', background: mine ? 'var(--inh-lime-tint)' : 'var(--surface-2)', borderRadius: 12, color: 'var(--fg-1)', fontSize: 13.5, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {n.body}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer — clearly separated, wide input, prominent Send button */}
        {onAddNote && (
          <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)', padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 12, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--fg-3)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  {role === 'homeowner' ? 'Message INH' : 'Reply to the client'}
                </div>
                <textarea
                  value={noteDraft}
                  placeholder={role === 'homeowner' ? 'Type your question or feedback…' : 'Type a note the client will also see…'}
                  onChange={e => setNoteDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } }}
                  rows={2}
                  style={{ border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'inherit', fontSize: 14, color: 'var(--fg-1)', width: '100%', padding: 0 }}
                />
              </div>
              <button onClick={submit} disabled={!canSend} aria-label="Send message"
                style={{ flexShrink: 0, height: 48, minWidth: 76, borderRadius: 12, border: 'none', background: canSend ? 'var(--inh-lime)' : 'var(--border)', color: 'var(--inh-charcoal)', fontWeight: 800, fontSize: 13.5, cursor: canSend ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                {busy ? '…' : <><Icon name="send" size={16} color="var(--inh-charcoal)" />Send</>}
              </button>
            </div>
            <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="meta" style={{ fontSize: 11 }}>
                {role === 'homeowner' ? '👀 INH will see this immediately' : '👀 The client will see this immediately'}
              </span>
              <span className="meta" style={{ fontSize: 11 }}>Press <b>Ctrl+Enter</b> to send</span>
            </div>
            {err && (
              <div style={{ marginTop: 8, padding: '7px 10px', background: '#fdecec', border: '1px solid var(--error)', borderRadius: 8, color: 'var(--error)', fontSize: 12.5, fontWeight: 600 }}>
                {err}
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function OverviewScreen({ role, project, phases = INH_DATA.phases, schedule = INH_DATA.thisWeek, updates = INH_DATA.updates, onEditProgress, onEditProject, onAddSchedule, onAddPhase, onMarkPhaseComplete, onAddItem, onItemPhoto, onAddSchedulePhoto, onPhasePhoto, onOpenPhoto, onToggleScheduleDone, onTogglePhaseTask, onOpenTask, onMovePhase, onMoveTask, onDeleteSchedule, onDeletePhase, onDeleteItem, onManageAccess, onOpenDocs, onReport, onSetStage, onUpdateStageItems, onUpdateFinance, notes, onAddNote }) {
  const [open, setOpen] = useState(2);
  const [noteDraft, setNoteDraft] = useState('');
  const [stageItemDraft, setStageItemDraft] = useState('');
  const [itemDraft, setItemDraft] = useState('');
  const [dragPhase, setDragPhase] = useState(null);   // index of phase being dragged
  const [dragItem, setDragItem] = useState(null);     // index of item being dragged (within open phase)
  const [reorderIdx, setReorderIdx] = useState(null);  // index of phase currently in long-press reorder mode
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
              {onOpenDocs && (
                <button onClick={onOpenDocs} aria-label="Documents"
                  style={{ border: 'none', background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--on-dark-2)', fontSize: 11.5, fontWeight: 600 }}>
                  <Icon name="file-text" size={12} color="var(--on-dark-2)" /> Docs
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

        {/* Client status — high-level stage pipeline (admin updates, all can see) */}
        {(() => {
          const STAGES = [['measure', '📏 Measure'], ['quotation', '💬 Quotation'], ['contract', '📝 Contract'], ['deposit', '💰 Deposit']];
          const cur = Math.max(0, STAGES.findIndex(s => s[0] === (project?.stage || 'measure')));
          const editable = CAN_EDIT(role) && onSetStage;
          const sd = project?.stage_dates || {};
          const shortDate = iso => (iso ? new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) : '');
          const created = project?.created_at ? new Date(project.created_at) : null;
          const createdStr = created && !isNaN(created) ? created.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
          const days = created && !isNaN(created) ? Math.floor((Date.now() - created.getTime()) / 86400000) : null;
          const agoText = days == null ? '' : `Created ${createdStr} · ${days <= 0 ? 'today' : days === 1 ? '1 day ago' : days + ' days ago'}`;
          return (
            <div>
              <SectionHead tone={SECTION_TONES.status}>Client status</SectionHead>
              <SectionCard tone={SECTION_TONES.status} style={{ padding: 14 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {STAGES.map(([key, label], i) => {
                    const done = i < cur, active = i === cur;
                    return (
                      <button key={key} onClick={editable ? () => onSetStage(key) : undefined} disabled={!editable}
                        style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, cursor: editable ? 'pointer' : 'default', textAlign: 'center' }}>
                        <div style={{ height: 7, borderRadius: 4, background: (done || active) ? 'var(--inh-lime)' : 'var(--surface-2)' }} />
                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                          <span style={{ fontSize: 11.5, fontWeight: active ? 800 : done ? 700 : 600, lineHeight: 1.15, color: active ? 'var(--inh-charcoal)' : done ? 'var(--fg-1)' : 'var(--fg-3)', background: active ? 'var(--inh-lime)' : 'transparent', borderRadius: 999, padding: active ? '3px 10px' : '3px 0', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            {done && <Icon name="check" size={12} color="var(--success)" stroke={3} />}{label}
                          </span>
                        </div>
                        <div style={{ marginTop: 3, fontSize: 9.5, color: active ? 'var(--inh-charcoal)' : 'var(--fg-3)', fontWeight: active ? 700 : 400, minHeight: 12 }}>{sd[key] ? shortDate(sd[key]) : ''}</div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
                  {agoText && <span className="meta">{agoText}</span>}
                  {editable && <span className="meta">Tap a stage to update</span>}
                </div>

                {/* Sub-item checklist for the current stage */}
                {(() => {
                  const curKey = STAGES[cur][0];
                  const curLabel = STAGES[cur][1].replace(/^\S+\s/, '');
                  const sItems = (project?.stage_items && project.stage_items[curKey]) || [];
                  const ed = CAN_EDIT(role) && onUpdateStageItems;
                  if (!ed && sItems.length === 0) return null;
                  const toggle = (i) => onUpdateStageItems(curKey, sItems.map((it, idx) => (idx === i ? { ...it, done: !it.done } : it)));
                  const remove = (i) => onUpdateStageItems(curKey, sItems.filter((_, idx) => idx !== i));
                  const add = () => { const tx = stageItemDraft.trim(); if (!tx) return; onUpdateStageItems(curKey, [...sItems, { id: `${sItems.length}-${tx.slice(0, 5)}`, title: tx, done: false }]); setStageItemDraft(''); };
                  return (
                    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <div className="inh-row__sub" style={{ marginBottom: 6, fontWeight: 700 }}>{curLabel} tasks</div>
                      {sItems.map((it, i) => (
                        <div key={it.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                          <button onClick={() => ed && toggle(i)} aria-label="Toggle task" style={{ border: 'none', background: 'transparent', padding: 0, cursor: ed ? 'pointer' : 'default', display: 'flex', flexShrink: 0 }}>
                            <Icon name={it.done ? 'check-circle' : 'circle'} size={17} color={it.done ? 'var(--success)' : 'var(--fg-3)'} stroke={it.done ? 2.2 : 1.8} />
                          </button>
                          <span style={{ flex: 1, fontSize: 13, textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'var(--fg-3)' : 'var(--fg-1)' }}>{it.title}</span>
                          {ed && <button onClick={() => remove(i)} aria-label="Remove task" style={{ border: 'none', background: 'transparent', padding: 2, cursor: 'pointer', display: 'flex' }}><Icon name="x" size={13} color="var(--fg-3)" /></button>}
                        </div>
                      ))}
                      {sItems.length === 0 && <div className="meta" style={{ padding: '2px 0' }}>No tasks for this stage yet.</div>}
                      {ed && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <div className="inh-input" style={{ flex: 1 }}>
                            <span className="lead"><Icon name="plus" size={16} /></span>
                            <input value={stageItemDraft} placeholder={`Add a ${curLabel.toLowerCase()} task…`} onChange={e => setStageItemDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
                          </div>
                          <button onClick={add} disabled={!stageItemDraft.trim()} aria-label="Add task" style={{ flexShrink: 0, width: 44, borderRadius: 12, border: '1px solid var(--border-strong)', background: 'var(--surface)', cursor: stageItemDraft.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="plus" size={18} color="var(--fg-1)" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </SectionCard>
            </div>
          );
        })()}

        <FinanceCard project={project} onUpdateFinance={onUpdateFinance} />

        {/* Notes & feedback — anyone on the project (incl. homeowner) can post */}
        <NotesCard role={role} notes={notes} onAddNote={onAddNote} noteDraft={noteDraft} setNoteDraft={setNoteDraft} />


        {onReport && (
          <button onClick={onReport}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--fg-1)', borderRadius: 14, padding: '12px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
            <Icon name="download" size={17} color="var(--fg-2)" /> Download report
          </button>
        )}

        {/* What's happening now — derived from the schedule */}
        {(() => {
          const nowItem = (schedule || []).find(s => s.state === 'today') || (schedule || []).find(s => s.state !== 'completed');
          if (!nowItem) return null;
          return (
            <div>
              <SectionHead tone={SECTION_TONES.now}>What's happening now</SectionHead>
              <SectionCard tone={SECTION_TONES.now} style={{ padding: 16, display: 'flex', gap: 13, alignItems: 'center' }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: SECTION_TONES.now.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="hard-hat" size={24} color={SECTION_TONES.now.fg} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{nowItem.title}</div>
                  <div className="body-2" style={{ marginTop: 2 }}>{nowItem.state === 'today' ? 'Scheduled for today' : 'Coming up next'}</div>
                </div>
                <Pill status={nowItem.state} />
              </SectionCard>
            </div>
          );
        })()}

        {/* This-week card removed — the phase list already carries the
            in-flight work and having both was confusing to users. */}

        {/* Project progress accordion */}
        <div>
          <SectionHead tone={SECTION_TONES.progress}
            action={CAN_EDIT(role) && onAddPhase ? <button className="inh-link" style={{ fontSize: 12.5 }} onClick={onAddPhase}>+ Add phase</button> : null}>
            Project progress
          </SectionHead>
          <SectionCard tone={SECTION_TONES.progress} style={{ overflow: 'hidden' }}>
            {CAN_EDIT(role) && onMovePhase && phases.length > 1 && reorderIdx == null && (
              <div className="meta" style={{ padding: '10px 16px 0', fontSize: 12 }}>Tap a phase to expand · Hold 2 seconds to reorder</div>
            )}
            {phases.length === 0 && <div className="inh-row" style={{ cursor: 'default' }}><div className="inh-row__main"><div className="inh-row__sub">No phases added yet.</div></div></div>}
            {phases.map((p, i) => {
              const tasks = p.tasks || [];
              const total = tasks.length;
              const doneN = tasks.filter(t => t.done).length;
              // Progress derives from item completion when the phase has items.
              const derivedPct = total ? Math.round((doneN / total) * 100) : p.pct;
              const isDone = p.status === 'completed' || (total > 0 && doneN === total);
              const editable = CAN_EDIT(role);
              const inReorder = reorderIdx === i;
              // Long-press to enter reorder mode. Cancel if the finger moves,
              // if the pointer lifts before 2s, or if the row is scrolled.
              const startHold = (e) => {
                if (!editable || !onMovePhase || reorderIdx != null) return;
                const startX = e.clientX, startY = e.clientY;
                const timer = setTimeout(() => {
                  setReorderIdx(i);
                  if (navigator.vibrate) navigator.vibrate(25);
                  cleanup();
                }, 2000);
                const cancel = (ev) => {
                  if (Math.abs(ev.clientX - startX) > 6 || Math.abs(ev.clientY - startY) > 6) { clearTimeout(timer); cleanup(); }
                };
                const stop = () => { clearTimeout(timer); cleanup(); };
                const cleanup = () => {
                  window.removeEventListener('pointermove', cancel);
                  window.removeEventListener('pointerup', stop);
                  window.removeEventListener('pointercancel', stop);
                  window.removeEventListener('scroll', stop, true);
                };
                window.addEventListener('pointermove', cancel);
                window.addEventListener('pointerup', stop);
                window.addEventListener('pointercancel', stop);
                window.addEventListener('scroll', stop, true);
              };
              return (
              <div key={i}
                onDragOver={e => { if (dragPhase != null) e.preventDefault(); }}
                onDrop={() => { if (dragPhase != null && dragPhase !== i && onMovePhase) onMovePhase(dragPhase, i); setDragPhase(null); }}
                style={{
                  borderTop: i ? '1px solid var(--border)' : 'none',
                  background: inReorder ? 'var(--inh-lime-tint)' : (dragPhase != null && dragPhase !== i ? 'var(--inh-lime-soft)' : 'transparent'),
                  boxShadow: inReorder ? '0 6px 18px rgba(0,0,0,.12)' : 'none',
                  transform: inReorder ? 'scale(1.01)' : 'none',
                  transition: 'background .12s, box-shadow .18s, transform .18s',
                  position: 'relative',
                }}>
                <div className="inh-row"
                  onClick={() => { if (!inReorder) setOpen(open === i ? -1 : i); }}
                  onPointerDown={startHold}
                  style={{ paddingTop: 13, paddingBottom: 13, userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? 'var(--success)' : (derivedPct > 0 || p.status === 'progress') ? 'var(--inh-lime)' : 'var(--surface-2)',
                    color: isDone ? '#fff' : 'var(--inh-charcoal)' }}>
                    {isDone ? <Icon name="check" size={15} stroke={3} /> :
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 12 }}>{i + 1}</span>}
                  </div>
                  <div className="inh-row__main" style={{ minWidth: 0 }}>
                    <div className="inh-row__title" style={{ fontSize: 16 }}><span style={{ marginRight: 6 }}>{phaseEmoji(p.name)}</span>{p.name}</div>
                    <div className="inh-row__sub">
                      {inReorder ? 'Reorder mode — use ↑ ↓' : (total ? `${doneN}/${total} items · ${derivedPct}%` : p.dates)}
                    </div>
                  </div>
                  {inReorder ? (
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      <button onClick={() => { if (i > 0) { onMovePhase(i, i - 1); setReorderIdx(i - 1); } }} disabled={i === 0} aria-label="Move phase up"
                        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: i === 0 ? 'var(--surface-2)' : 'var(--surface)', cursor: i === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: i === 0 ? 0.4 : 1, boxShadow: i === 0 ? 'none' : '0 1px 3px rgba(0,0,0,.08)' }}>
                        <Icon name="chevron-up" size={18} color="var(--inh-charcoal)" stroke={2.6} />
                      </button>
                      <button onClick={() => { if (i < phases.length - 1) { onMovePhase(i, i + 1); setReorderIdx(i + 1); } }} disabled={i === phases.length - 1} aria-label="Move phase down"
                        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: i === phases.length - 1 ? 'var(--surface-2)' : 'var(--surface)', cursor: i === phases.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: i === phases.length - 1 ? 0.4 : 1, boxShadow: i === phases.length - 1 ? 'none' : '0 1px 3px rgba(0,0,0,.08)' }}>
                        <Icon name="chevron-down" size={18} color="var(--inh-charcoal)" stroke={2.6} />
                      </button>
                      <button onClick={() => setReorderIdx(null)} aria-label="Done reordering"
                        style={{ marginLeft: 2, width: 32, height: 32, borderRadius: 8, border: 'none', background: 'var(--inh-lime)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="check" size={17} color="var(--inh-charcoal)" stroke={2.8} />
                      </button>
                    </div>
                  ) : (editable && onDeletePhase && (
                    <button onClick={e => { e.stopPropagation(); onDeletePhase(p); }} aria-label="Delete phase"
                      style={{ border: 'none', background: 'transparent', padding: 6, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                      <Icon name="trash" size={17} color="var(--fg-3)" />
                    </button>
                  ))}
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
                            {t.due_date && <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}><Icon name="calendar" size={11} color="var(--fg-3)" />{new Date(String(t.due_date).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })}{startRel(t.due_date) ? ` · ${startRel(t.due_date)}` : ''}</span>}
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

                    {/* Progress photos for this phase — Updates rows whose room
                        matches the phase name. Case + whitespace insensitive so
                        small typos still group correctly. */}
                    {(() => {
                      if (!updates || updates.length === 0) return null;
                      const norm = (s) => String(s || '').trim().toLowerCase();
                      const key = norm(p.name);
                      const mine = updates.filter(u => norm(u.room) === key);
                      if (mine.length === 0) return null;
                      const totalPhotos = mine.reduce((s, u) => s + (u.count || 0), 0);
                      return (
                        <div style={{ marginTop: 14 }}>
                          <div className="inh-row__sub" style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="image" size={13} color="var(--fg-2)" />
                            Progress photos <span className="meta">· {totalPhotos} photo{totalPhotos === 1 ? '' : 's'} across {mine.length} update{mine.length === 1 ? '' : 's'}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {mine.map(u => (
                              <div key={u.id} onClick={() => onOpenPhoto && onOpenPhoto(u)}
                                style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 10, overflow: 'hidden', background: u.tone || 'var(--surface-2)', backgroundImage: u.thumb ? `url(${u.thumb})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', cursor: onOpenPhoto ? 'pointer' : 'default' }}>
                                {!u.thumb && (
                                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.32 }}>
                                    <Icon name="image" size={26} color="#fff" stroke={1.6} />
                                  </div>
                                )}
                                <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(42,37,35,0.7)', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Icon name="image" size={10} color="#fff" /> {u.count || 0}
                                </div>
                                {u.isNew && (
                                  <div style={{ position: 'absolute', top: 6, left: 6 }}><Pill status="new" /></div>
                                )}
                                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 8px 6px', background: 'linear-gradient(transparent, rgba(42,37,35,0.55))', color: '#fff', fontSize: 10.5, fontWeight: 600 }}>{u.date}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

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

                    {(editable && onPhasePhoto) || (editable && onMarkPhaseComplete && !isDone) ? (
                      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {editable && onPhasePhoto && (
                          <button onClick={() => onPhasePhoto(p)} style={{
                            display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border-strong)',
                            background: 'var(--surface)', color: 'var(--fg-1)', borderRadius: 10, padding: '8px 12px',
                            fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                          }}>
                            <Icon name="camera" size={15} color="var(--fg-2)" /> Take progress photos
                          </button>
                        )}
                        {editable && onMarkPhaseComplete && !isDone && (
                          <button onClick={() => onMarkPhaseComplete(p)} style={{
                            display: 'flex', alignItems: 'center', gap: 6, border: 'none',
                            background: 'var(--inh-lime)', color: 'var(--inh-charcoal)', borderRadius: 10, padding: '8px 12px',
                            fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                          }}>
                            <Icon name="check-circle" size={15} color="var(--inh-charcoal)" /> Mark phase complete
                          </button>
                        )}
                      </div>
                    ) : null}
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
          </SectionCard>
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
