/* INH — demo data (fake, for prototype only) */

export const INH_DATA = {
  projects: [
    {
      id: 'p1', name: 'Lot 23, Bukit Indah', code: 'P-2026-023',
      address: '23 Jalan Indah 3/2, Bukit Indah, 81200 JB',
      type: 'Full home renovation', progress: 68, status: 'ontrack',
      committed: 184000, released: 125000, pending: 59000, releasedPct: 68,
    },
    {
      id: 'p2', name: '12 Jalan Setia', code: 'P-2026-031',
      address: '12 Jln Setia Tropika 1, 81100 JB',
      type: 'Kitchen & living', progress: 34, status: 'pending',
      committed: 96000, released: 25000, pending: 71000, releasedPct: 26,
    },
    {
      id: 'p3', name: 'Penthouse, Tower B', code: 'P-2026-018',
      address: 'Sky Habitat Tower B, #28-03',
      type: 'Bathroom & flooring', progress: 92, status: 'overdue',
      committed: 142000, released: 118000, pending: 24000, releasedPct: 83,
    },
  ],

  phases: [
    { name: 'Demolition & hacking', status: 'completed', pct: 100, dates: '3–9 Mar' },
    { name: 'Wiring & plumbing', status: 'completed', pct: 100, dates: '10–24 Mar' },
    { name: 'Carpentry & built-ins', status: 'progress', pct: 60, dates: '25 Mar – 18 May' },
    { name: 'Tiling & flooring', status: 'progress', pct: 30, dates: '5–28 May' },
    { name: 'Painting & finishing', status: 'upcoming', pct: 0, dates: '1–14 Jun' },
    { name: 'Handover & cleaning', status: 'upcoming', pct: 0, dates: '16–20 Jun' },
  ],

  thisWeek: [
    { day: 'MON', date: '12', title: 'Kitchen cabinet carcass install', when: 'Today', state: 'today' },
    { day: 'WED', date: '14', title: 'Living room feature wall tiling', when: 'Wed', state: 'upcoming' },
    { day: 'FRI', date: '16', title: 'Electrical second fix', when: 'Fri', state: 'upcoming' },
  ],

  updates: [
    { id: 'u1', room: 'Kitchen', date: '12 May 2026', isNew: true, count: 6, tone: '#6b6355' },
    { id: 'u2', room: 'Living room', date: '12 May 2026', isNew: true, count: 4, tone: '#8a7d6a' },
    { id: 'u3', room: 'Master bath', date: '8 May 2026', isNew: false, count: 9, tone: '#5e6b6a' },
    { id: 'u4', room: 'Hallway', date: '8 May 2026', isNew: false, count: 3, tone: '#76706a' },
    { id: 'u5', room: 'Bedroom 2', date: '2 May 2026', isNew: false, count: 5, tone: '#7a6f63' },
    { id: 'u6', room: 'Exterior', date: '2 May 2026', isNew: false, count: 7, tone: '#646a5c' },
    // A couple of updates that share their room name with a phase, so the
    // Project Progress accordion has photos to show when a phase is expanded.
    { id: 'u7', room: 'Demolition & hacking', date: '5 Mar 2026', isNew: false, count: 4, tone: '#5e6b6a' },
    { id: 'u8', room: 'Wiring & plumbing', date: '18 Mar 2026', isNew: false, count: 5, tone: '#76706a' },
  ],

  documents: [
    { id: 'd1', name: 'Milestone 2 Invoice', kind: 'invoice', meta: 'PDF · 2.4 MB · 12 May 2026', ready: true },
    { id: 'd2', name: 'Renovation Contract', kind: 'doc', meta: 'PDF · 5.1 MB · 28 Feb 2026', ready: true },
    { id: 'd3', name: 'Approved Floor Plan', kind: 'plan', meta: 'PDF · 8.7 MB · 2 Mar 2026', ready: true },
    { id: 'd4', name: 'Material Selection Sheet', kind: 'doc', meta: 'PDF · 1.2 MB · 15 Mar 2026', ready: true },
    { id: 'd5', name: 'Final Inspection Report', kind: 'doc', meta: 'Available after handover', ready: false },
  ],

  payments: [
    { id: 'pay1', contractor: 'Ah Seng Tiling', stage: 'Tiling & flooring', amount: 14200, date: 'Due 18 May', status: 'pending', method: 'Bank transfer' },
    { id: 'pay2', contractor: 'KL Electrical Works', stage: 'Wiring & plumbing', amount: 22800, date: 'Released 12 May', status: 'released', method: 'DuitNow · ref #44192' },
    { id: 'pay3', contractor: 'Mutiara Carpentry', stage: 'Carpentry & built-ins', amount: 38500, date: 'Due 30 May', status: 'pending', method: 'Bank transfer' },
    { id: 'pay4', contractor: 'Lim Plumbing Sdn Bhd', stage: 'Wiring & plumbing', amount: 9600, date: 'Released 24 Mar', status: 'released', method: 'DuitNow · ref #41003' },
    { id: 'pay5', contractor: 'Hng Demolition', stage: 'Demolition & hacking', amount: 7400, date: 'Overdue 5 May', status: 'overdue', method: 'Bank transfer' },
    { id: 'pay6', contractor: 'Cosmo Painting', stage: 'Painting & finishing', amount: 11000, date: 'On hold', status: 'hold', method: '—' },
  ],

  audit: [
    { actor: 'You (Owner)', action: 'Released RM 22,800 to KL Electrical Works', when: '12 May 2026, 14:02' },
    { actor: 'You (Owner)', action: 'Put Cosmo Painting on hold', when: '9 May 2026, 09:41' },
    { actor: 'You (Owner)', action: 'Released RM 9,600 to Lim Plumbing Sdn Bhd', when: '24 Mar 2026, 16:20' },
  ],

  users: [
    { id: 'us1', name: 'Tan Wei Ming', contact: 'boss@inh.com.my', role: 'owner', projects: 12, initials: 'TW' },
    { id: 'us2', name: 'Nurul Aisyah', contact: 'aisyah@inh.com.my', role: 'admin', projects: 5, initials: 'NA' },
    { id: 'us3', name: 'Raj Kumar', contact: 'raj@inh.com.my', role: 'admin', projects: 4, initials: 'RK' },
    { id: 'us4', name: 'Mr & Mrs Lee', contact: 'lee.family@gmail.com', role: 'homeowner', projects: 1, initials: 'LE' },
    { id: 'us5', name: 'Siti Rahman', contact: 'siti.r@outlook.com', role: 'homeowner', projects: 1, initials: 'SR' },
  ],

  team: {
    admins: [
      { id: 'us2', name: 'Nurul Aisyah', initials: 'NA', sub: 'Project manager' },
    ],
    homeowners: [
      { id: 'us4', name: 'Mr & Mrs Lee', initials: 'LE', sub: 'Client · owner of Lot 23' },
    ],
  },

  roleMeta: {
    owner:     { label: 'Owner',     badge: 'badge-owner',     person: 'Tan Wei Ming', initials: 'TW', sub: 'INH Design & Build' },
    admin:     { label: 'Admin',     badge: 'badge-admin',     person: 'Nurul Aisyah',  initials: 'NA', sub: 'Project manager' },
    homeowner: { label: 'Homeowner', badge: 'badge-homeowner', person: 'Mr & Mrs Lee',  initials: 'LE', sub: 'Lot 23, Bukit Indah' },
  },
};

export function rm(n) { return 'RM ' + n.toLocaleString('en-MY'); }
export function rmk(n) { return 'RM ' + (n / 1000).toFixed(0) + 'k'; }
