/* INH — owner/admin screens: Projects, Fees, FeesDetail, Users, Team, More */
import { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { Btn, Pill, ProgressBar, Avatar, RoleBadge, Dialog, Sheet } from '../../components/primitives.jsx';
import { Field } from '../auth/Auth.jsx';
import { INH_DATA, rm, rmk } from '../../data/data.js';
import { CAN_EDIT } from '../core/CoreScreens.jsx';
import { t } from '../../lib/i18n.js';

/* =================== PROJECTS LIST (admin & owner home) =================== */
export function ProjectsScreen({ role, projects = INH_DATA.projects, onOpenProject, onAddProject }) {
  const list = projects;
  return (
    <div className="inh-scroll">
      <div className="inh-pad">
        {onAddProject && (
          <Btn variant="charcoal" icon="plus" onClick={onAddProject} style={{ marginBottom: 16 }}>Add project</Btn>
        )}
        {role === 'admin' && (
          <p className="body-2" style={{ marginBottom: 12 }}>Showing the {list.length} projects assigned to you.</p>
        )}
        {list.length === 0 && (
          <p className="body-2" style={{ marginTop: 8 }}>No projects yet.</p>
        )}
        <div className="inh-cardgrid">
        {list.map(p => (
          <div key={p.id} className="inh-card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => onOpenProject(p)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>{p.name}</div>
                <div className="inh-row__sub">{p.code} · {p.type}</div>
              </div>
              <Pill status={p.status} />
            </div>
            <div style={{ margin: '16px 0 8px' }}><ProgressBar pct={p.progress} green={p.progress === 100} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="meta">{p.progress}% complete</span>
              <span className="meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Open <Icon name="chevron-right" size={13} /></span>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}

/* =================== FEES — overview (OWNER ONLY) =================== */
export function FeesScreen({ fees = INH_DATA.projects, onOpenProject }) {
  const [filter, setFilter] = useState('All');
  const totals = fees.reduce((a, p) => ({
    committed: a.committed + p.committed, released: a.released + p.released, pending: a.pending + p.pending,
  }), { committed: 0, released: 0, pending: 0 });
  const chips = ['All', 'Pending release', 'Released', 'Overdue', 'On hold'];
  return (
    <div className="inh-scroll">
      <div className="inh-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* summary band */}
        <div className="inh-hero">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
            <Icon name="shield" size={15} color="var(--inh-lime)" />
            <span className="inh-eyebrow" style={{ color: 'var(--on-dark-2)' }}>Fees Release · Owner only</span>
          </div>
          <div className="inh-eyebrow" style={{ color: 'var(--on-dark-2)', marginBottom: 3 }}>Committed to contractors</div>
          <div className="display" style={{ color: 'var(--inh-lime)', fontSize: 38, marginBottom: 14 }}>{rm(totals.committed)}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '11px 13px' }}>
              <div style={{ fontSize: 11, color: 'var(--on-dark-2)', fontWeight: 600 }}>Released</div>
              <div className="inh-figure" style={{ fontSize: 16, color: 'var(--on-dark)', marginTop: 2 }}>{rm(totals.released)}</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '11px 13px' }}>
              <div style={{ fontSize: 11, color: 'var(--on-dark-2)', fontWeight: 600 }}>Pending</div>
              <div className="inh-figure" style={{ fontSize: 16, color: 'var(--inh-lime)', marginTop: 2 }}>{rm(totals.pending)}</div>
            </div>
          </div>
        </div>

        <div className="inh-chiprow" style={{ padding: 0 }}>
          {chips.map(c => <button key={c} className={'inh-chip' + (filter === c ? ' active' : '')} onClick={() => setFilter(c)}>{c}</button>)}
        </div>

        <div className="inh-cardgrid">
          {fees.map(p => (
            <div key={p.id} className="inh-card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => onOpenProject(p)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16 }}>{p.name}</div>
                  <div className="inh-row__sub">{p.code}</div>
                </div>
                <Pill status={p.status === 'ontrack' ? 'ontrack' : p.status} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '14px 0 9px' }}>
                <div><div className="meta">Committed</div><div className="inh-figure" style={{ fontSize: 16 }}>{rmk(p.committed)}</div></div>
                <div style={{ textAlign: 'right' }}><div className="meta">Pending release</div><div className="inh-figure" style={{ fontSize: 16, color: 'var(--warning)' }}>{rmk(p.pending)}</div></div>
              </div>
              <ProgressBar pct={p.releasedPct} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span className="meta">{p.releasedPct}% released to contractors</span>
                <Icon name="chevron-right" size={15} color="var(--fg-3)" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =================== FEES — project payment detail =================== */
export function FeesDetailScreen({ project, payments: paymentsProp = INH_DATA.payments, audit = INH_DATA.audit, onSetStatus }) {
  const [confirm, setConfirm] = useState(null); // {pay, action}
  const [payments, setPayments] = useState(paymentsProp);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setPayments(paymentsProp); }, [paymentsProp]);

  const act = async () => {
    const { pay, action } = confirm;
    const status = action === 'release' ? 'released' : 'hold';
    setBusy(true);
    try {
      if (onSetStatus) await onSetStatus(pay.id, status);
      setPayments(ps => ps.map(p => p.id === pay.id ? { ...p, status, date: action === 'release' ? 'Released just now' : 'On hold' } : p));
      setToast(action === 'release' ? `Released ${rm(pay.amount)} to ${pay.contractor}` : `${pay.contractor} put on hold`);
    } catch (e) {
      setToast(e?.message || 'Could not update payment');
    } finally {
      setBusy(false);
      setConfirm(null);
      setTimeout(() => setToast(null), 2600);
    }
  };

  return (
    <div className="inh-scroll" style={{ position: 'relative' }}>
      <div className="inh-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="inh-hero" style={{ padding: 18 }}>
          <div className="inh-eyebrow" style={{ color: 'var(--on-dark-2)' }}>{project.code}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 19, color: 'var(--on-dark)', margin: '3px 0 14px' }}>{project.name}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div><div className="meta" style={{ color: 'var(--on-dark-2)' }}>Committed</div><div className="inh-figure" style={{ color: 'var(--on-dark)', fontSize: 17 }}>{rmk(project.committed)}</div></div>
            <div style={{ textAlign: 'center' }}><div className="meta" style={{ color: 'var(--on-dark-2)' }}>Released</div><div className="inh-figure" style={{ color: 'var(--inh-lime)', fontSize: 17 }}>{project.releasedPct}%</div></div>
            <div style={{ textAlign: 'right' }}><div className="meta" style={{ color: 'var(--on-dark-2)' }}>Pending</div><div className="inh-figure" style={{ color: 'var(--on-dark)', fontSize: 17 }}>{rmk(project.pending)}</div></div>
          </div>
        </div>

        <div>
          <div className="inh-section">Contractor payments</div>
          <div className="inh-card" style={{ overflow: 'hidden' }}>
            {payments.map(p => (
              <div key={p.id} style={{ padding: 16, borderTop: '1px solid var(--border)' }} className="pay-block">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div className="inh-row__ico" style={{ marginTop: 2 }}><Icon name="hard-hat" size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div className="inh-row__title">{p.contractor}</div>
                      <div className="inh-figure" style={{ fontSize: 15 }}>{rm(p.amount)}</div>
                    </div>
                    <div className="inh-row__sub">{p.stage}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span className="meta">{p.date} · {p.method}</span>
                      <Pill status={p.status} />
                    </div>
                    {(p.status === 'pending' || p.status === 'overdue' || p.status === 'hold') && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <Btn variant="charcoal" size="sm" icon="check" onClick={() => setConfirm({ pay: p, action: 'release' })}>Approve &amp; release</Btn>
                        {p.status !== 'hold' && <Btn variant="ghost" size="sm" icon="pause" onClick={() => setConfirm({ pay: p, action: 'hold' })}>Hold</Btn>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* audit trail */}
        <div>
          <div className="inh-section" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="shield-check" size={13} color="var(--fg-3)" /> Audit trail</div>
          <div className="inh-card" style={{ padding: '4px 0' }}>
            {audit.map((a, i) => (
              <div key={i} style={{ padding: '11px 16px', borderTop: i ? '1px solid var(--border)' : 'none', display: 'flex', gap: 11 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--inh-lime)', marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg-1)' }}>{a.action}</div>
                  <div className="meta" style={{ marginTop: 1 }}>{a.actor} · {a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {confirm && (
        <Dialog onClose={() => setConfirm(null)}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: confirm.action === 'release' ? 'var(--inh-lime-tint)' : 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={confirm.action === 'release' ? 'banknote' : 'pause'} size={26} color="var(--inh-charcoal)" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, textAlign: 'center', marginBottom: 6 }}>
            {confirm.action === 'release' ? 'Release payment?' : 'Put on hold?'}
          </div>
          <p className="body-2" style={{ textAlign: 'center', marginBottom: 18 }}>
            {confirm.action === 'release'
              ? <>You're releasing <b style={{ color: 'var(--fg-1)' }}>{rm(confirm.pay.amount)}</b> to {confirm.pay.contractor}. This is logged and cannot be undone.</>
              : <>Hold the {rm(confirm.pay.amount)} payment to {confirm.pay.contractor}? You can release it later.</>}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Btn>
            <Btn variant={confirm.action === 'release' ? 'charcoal' : 'danger'} onClick={act} disabled={busy}>
              {busy ? 'Working…' : confirm.action === 'release' ? 'Release' : 'Put on hold'}
            </Btn>
          </div>
        </Dialog>
      )}

      {toast && (
        <div style={{ position: 'absolute', left: 16, right: 16, bottom: 18, zIndex: 90,
          background: 'var(--inh-charcoal)', color: 'var(--on-dark)', borderRadius: 14, padding: '13px 16px',
          display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-lg)', animation: 'sheetUp .24s ease' }}>
          <Icon name="check-circle" size={20} color="var(--inh-lime)" />
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}

/* =================== USERS DIRECTORY (owner, under More) =================== */
const ROLE_OPTIONS = ['owner', 'admin', 'homeowner'];

export function UsersScreen({ users = INH_DATA.users, onInvite, onChangeRole, meId }) {
  const count = users.length;
  const [edit, setEdit] = useState(null);   // user being edited
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [revealed, setRevealed] = useState(() => new Set());
  const [copied, setCopied] = useState(null);
  const canEdit = !!onChangeRole;           // live + owner

  const toggleReveal = (id) => setRevealed(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const copy = (id, text) => { try { navigator.clipboard?.writeText(text); setCopied(id); setTimeout(() => setCopied(c => (c === id ? null : c)), 1500); } catch { /* ignore */ } };

  const apply = async (role) => {
    if (!edit || role === edit.role) { setEdit(null); return; }
    setBusy(true); setErr(null);
    try { await onChangeRole(edit.id, role); setEdit(null); }
    catch (e) { setErr(e?.message || 'Could not change role'); }
    finally { setBusy(false); }
  };

  return (
    <div className="inh-scroll">
      <div className="inh-pad">
        <Btn variant="charcoal" icon="user-plus" onClick={onInvite} style={{ marginBottom: 16 }}>{t('Add account')}</Btn>
        <div className="inh-hero" style={{ padding: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="users" size={24} color="var(--inh-lime)" />
          </div>
          <div>
            <div className="display" style={{ color: 'var(--inh-lime)', fontSize: 30, lineHeight: 1 }}>{count}</div>
            <div className="inh-eyebrow" style={{ color: 'var(--on-dark-2)', marginTop: 4 }}>{count === 1 ? t('user') : t('users')} {t('registered')}</div>
          </div>
        </div>
        <div className="inh-card" style={{ overflow: 'hidden' }}>
          {users.map(u => {
            const isMe = u.id === meId;
            const tappable = canEdit && !isMe;
            return (
              <div key={u.id} className="inh-row" style={{ cursor: tappable ? 'pointer' : 'default' }}
                onClick={tappable ? () => { setErr(null); setEdit(u); } : undefined}>
                <Avatar initials={u.initials} light={u.role !== 'owner'} />
                <div className="inh-row__main">
                  <div className="inh-row__title" style={{ fontSize: 14.5 }}>{u.name}{isMe && <span className="inh-row__sub" style={{ marginLeft: 6 }}>(you)</span>}</div>
                  <div className="inh-row__sub">{u.contact} · {u.projects} {u.projects === 1 ? 'project' : 'projects'}</div>
                  {u.tempPassword && (
                    <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <span className="inh-chip" style={{ padding: '3px 9px', fontSize: 11.5 }}>ID: {u.login || u.contact}</span>
                      <span className="inh-chip" style={{ padding: '3px 9px', fontSize: 11.5, fontFamily: 'var(--font-display)', letterSpacing: 0.3, minWidth: 78, textAlign: 'center' }}>
                        {revealed.has(u.id) ? u.tempPassword : '••••••••'}
                      </span>
                      <button onClick={() => toggleReveal(u.id)} aria-label={revealed.has(u.id) ? 'Hide password' : 'Show password'}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', padding: 3 }}>
                        <Icon name={revealed.has(u.id) ? 'eye-off' : 'eye'} size={15} color="var(--fg-3)" />
                      </button>
                      <button onClick={() => copy(u.id, u.tempPassword)} aria-label="Copy password"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', padding: 3, alignItems: 'center', gap: 4 }}>
                        <Icon name="copy" size={14} color="var(--fg-3)" />
                        {copied === u.id && <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>Copied</span>}
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <RoleBadge role={u.role} />
                  {tappable && <Icon name="chevron-right" size={16} color="var(--fg-3)" />}
                </div>
              </div>
            );
          })}
        </div>
        {canEdit && <p className="meta" style={{ marginTop: 10 }}>Tap a user to change their role. You can't change your own.</p>}
      </div>

      {edit && (
        <Sheet title={t('Change role')} onClose={() => setEdit(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Avatar initials={edit.initials} light={edit.role !== 'owner'} />
            <div>
              <div className="inh-row__title" style={{ fontSize: 15 }}>{edit.name}</div>
              <div className="inh-row__sub">{edit.contact}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ROLE_OPTIONS.map(r => {
              const meta = INH_DATA.roleMeta[r];
              const active = edit.role === r;
              return (
                <button key={r} onClick={() => apply(r)} disabled={busy} className="inh-row"
                  style={{ borderRadius: 12, border: '1px solid var(--border)', background: active ? 'var(--inh-lime-soft)' : 'transparent', cursor: busy ? 'default' : 'pointer', textAlign: 'left' }}>
                  <div className="inh-row__ico" style={{ background: 'var(--inh-lime-tint)' }}>
                    <Icon name={r === 'owner' ? 'shield-check' : r === 'admin' ? 'briefcase' : 'home'} size={19} color="var(--inh-charcoal)" />
                  </div>
                  <div className="inh-row__main">
                    <div className="inh-row__title" style={{ fontSize: 14.5 }}>{meta.label}</div>
                    <div className="inh-row__sub">{r === 'owner' ? 'Full access, incl. Fees Release' : r === 'admin' ? 'Manage assigned projects' : 'Views their own project'}</div>
                  </div>
                  {active ? <Icon name="check" size={18} color="var(--inh-charcoal)" stroke={2.6} /> : <span style={{ width: 18 }} />}
                </button>
              );
            })}
          </div>
          {err && <p style={{ color: 'var(--error)', fontSize: 12.5, marginTop: 12 }}>{err}</p>}
          {busy && <p className="meta" style={{ marginTop: 10 }}>Saving…</p>}
        </Sheet>
      )}
    </div>
  );
}

/* =================== TEAM & ACCESS (per project, owner) =================== */
const DEMO_MEMBERS = [
  ...INH_DATA.team.admins.map(m => ({ ...m, role: 'admin' })),
  ...INH_DATA.team.homeowners.map(m => ({ ...m, role: 'homeowner' })),
];

export function TeamScreen({ project, members = DEMO_MEMBERS, homeowners = [], people, owner, onAddMember, onRemoveMember }) {
  const [picker, setPicker] = useState(null);   // 'admin' | 'homeowner' — which role to add
  const [busy, setBusy] = useState(false);

  const owners = members.filter(m => m.role === 'owner');
  const admins = members.filter(m => m.role === 'admin');
  const hos = members.filter(m => m.role === 'homeowner');
  const memberIds = new Set(members.map(m => m.id));
  // Addable pool: all non-owner users (live) or the homeowner list (demo).
  const pool = people ?? homeowners;
  const candidates = pool.filter(p => !memberIds.has(p.id) && (!picker || p.role === picker));

  const add = async (userId) => {
    if (!onAddMember) { setPicker(null); return; }
    setBusy(true);
    try { await onAddMember(userId); } finally { setBusy(false); setPicker(null); }
  };
  const remove = async (userId) => {
    if (!onRemoveMember) return;
    setBusy(true);
    try { await onRemoveMember(userId); } finally { setBusy(false); }
  };

  const Member = ({ m, label, removable }) => (
    <div className="inh-row" style={{ cursor: 'default' }}>
      <Avatar initials={m.initials} light />
      <div className="inh-row__main">
        <div className="inh-row__title" style={{ fontSize: 14.5 }}>{m.name}</div>
        <div className="inh-row__sub">{m.sub || label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="inh-chip" style={{ padding: '5px 11px', fontSize: 12 }}>{label}</span>
        {removable && (
          <button className="inh-iconbtn" style={{ width: 32, height: 32 }} disabled={busy}
            onClick={() => remove(m.id)} aria-label={`Remove ${m.name}`}>
            <Icon name="x" size={15} color="var(--fg-3)" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="inh-scroll">
      <div className="inh-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p className="body-2">Control who can access <b style={{ color: 'var(--fg-1)' }}>{project.name}</b>. Only people listed here can open this project. Changes are logged.</p>

        <div>
          <div className="inh-section">Owner</div>
          <div className="inh-card" style={{ overflow: 'hidden' }}>
            {owners.length
              ? owners.map(m => <Member key={m.id} m={m} label="Owner" />)
              : owner
                ? (
                  <div className="inh-row" style={{ cursor: 'default' }}>
                    <Avatar initials={owner.initials} />
                    <div className="inh-row__main"><div className="inh-row__title" style={{ fontSize: 14.5 }}>{owner.name}</div><div className="inh-row__sub">Full access · fixed</div></div>
                    <RoleBadge role="owner" />
                  </div>
                )
                : (
                  <div className="inh-row" style={{ cursor: 'default' }}>
                    <div className="inh-row__main"><div className="inh-row__sub">No owner found.</div></div>
                  </div>
                )}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="inh-section" style={{ margin: '4px 0 10px' }}>Admins</div>
            {onAddMember && <button className="inh-link" style={{ fontSize: 12.5 }} onClick={() => setPicker('admin')}>+ Add admin</button>}
          </div>
          <div className="inh-card" style={{ overflow: 'hidden' }}>
            {admins.length ? admins.map(m => <Member key={m.id} m={m} label="Admin" removable />)
              : <div className="inh-row" style={{ cursor: 'default' }}><div className="inh-row__main"><div className="inh-row__sub">No admins assigned.</div></div></div>}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="inh-section" style={{ margin: '4px 0 10px' }}>Homeowners</div>
            {onAddMember && <button className="inh-link" style={{ fontSize: 12.5 }} onClick={() => setPicker('homeowner')}>+ Add homeowner</button>}
          </div>
          <div className="inh-card" style={{ overflow: 'hidden' }}>
            {hos.length ? hos.map(m => <Member key={m.id} m={m} label="Homeowner" removable />)
              : <div className="inh-row" style={{ cursor: 'default' }}><div className="inh-row__main"><div className="inh-row__sub">No homeowner assigned yet.</div></div></div>}
          </div>
        </div>
      </div>

      {picker && (
        <Sheet title={picker === 'admin' ? 'Add admin to project' : 'Add homeowner to project'} onClose={() => setPicker(null)}>
          <p className="body-2" style={{ marginBottom: 14 }}>Pick a {picker} to give access to this project.</p>
          {candidates.length === 0 && <p className="body-2">No more {picker}s to add. Create one from the Users screen first.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {candidates.map(h => (
              <button key={h.id} className="inh-row" disabled={busy} onClick={() => add(h.id)}
                style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                <Avatar initials={h.initials} light />
                <div className="inh-row__main">
                  <div className="inh-row__title" style={{ fontSize: 14.5 }}>{h.name}</div>
                  {h.contact && <div className="inh-row__sub">{h.contact}</div>}
                </div>
                <Icon name="plus" size={18} color="var(--inh-charcoal)" />
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* =================== MORE =================== */
export function MoreScreen({ role, profile, onUsers, onTeam, onAddAccount, onSignOut, onEditName, onSettings, onSupport, onAllProjects, onManageUpdates }) {
  const meta = INH_DATA.roleMeta[role];
  const name = profile?.name || meta.person;
  const initials = profile?.initials || meta.initials;
  const Group = ({ children }) => <div className="inh-card" style={{ overflow: 'hidden' }}>{children}</div>;
  const Item = ({ icon, label, danger, onClick, tint }) => (
    <div className="inh-row" onClick={onClick}>
      <div className="inh-row__ico" style={{ background: tint || 'var(--surface-2)' }}>
        <Icon name={icon} size={19} color={danger ? 'var(--error)' : tint ? 'var(--inh-charcoal)' : 'var(--fg-2)'} />
      </div>
      <div className="inh-row__main"><div className="inh-row__title" style={{ fontSize: 14.5, color: danger ? 'var(--error)' : 'var(--fg-1)' }}>{label}</div></div>
      {!danger && <Icon name="chevron-right" size={17} color="var(--fg-3)" />}
    </div>
  );
  return (
    <div className="inh-scroll">
      <div className="inh-pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="inh-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar initials={initials} size={52} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>{name}</div>
            <div className="inh-row__sub">{meta.sub}</div>
          </div>
          <RoleBadge role={role} />
        </div>

        {role === 'owner' && (
          <div>
            <div className="inh-section">{t('Owner tools')}</div>
            <Group>
              <Item icon="users" label={t('Users')} tint="var(--inh-lime-tint)" onClick={onUsers} />
              <Item icon="shield-check" label={t('Team & Access')} tint="var(--inh-lime-tint)" onClick={onTeam} />
            </Group>
          </div>
        )}

        {role === 'admin' && onAddAccount && (
          <div>
            <div className="inh-section">{t('Staff tools')}</div>
            <Group>
              <Item icon="user-plus" label={t('Add account')} tint="var(--inh-lime-tint)" onClick={onAddAccount} />
            </Group>
          </div>
        )}

        <div>
          <div className="inh-section">{role === 'homeowner' ? t('My home') : t('Projects')}</div>
          <Group>
            <Item icon="building" label={role === 'homeowner' ? t('My properties') : t('All projects')} onClick={onAllProjects} />
            <Item icon="message-circle" label={t('Project contacts')} onClick={onTeam} />
            {CAN_EDIT(role) && <Item icon="image" label={t('Manage updates')} onClick={onManageUpdates} />}
          </Group>
        </div>

        <div>
          <div className="inh-section">{t('Account')}</div>
          <Group>
            <Item icon="user" label={t('Edit my name')} onClick={onEditName} />
            <Item icon="settings" label={t('Settings & language')} onClick={onSettings} />
            <Item icon="help-circle" label={t('Support')} onClick={onSupport} />
          </Group>
        </div>

        <Group><Item icon="log-out" label={t('Sign out')} danger onClick={onSignOut} /></Group>
        <p className="meta" style={{ textAlign: 'center' }}>INH Project Management v2.1</p>
      </div>
    </div>
  );
}
