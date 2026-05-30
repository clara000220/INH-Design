/* INH — tiny i18n. Strings are keyed by their English text, so callers just
   wrap user-facing labels in t('English'). Current language lives in a module
   variable + localStorage; App keeps a matching state so the tree re-renders
   when it changes. */

const KEY = 'inh-lang';
const hasWindow = typeof window !== 'undefined';

let current = (hasWindow && localStorage.getItem(KEY)) || 'en';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Bahasa Melayu' },
];

export function getLang() { return current; }
export function setLang(code) {
  current = code === 'ms' ? 'ms' : 'en';
  if (hasWindow) localStorage.setItem(KEY, current);
}

// English source -> Malay. Anything missing falls back to the English key.
const MS = {
  // nav / tabs
  'Projects': 'Projek',
  'Overview': 'Ringkasan',
  'Updates': 'Kemas Kini',
  'Documents': 'Dokumen',
  'Fees': 'Yuran',
  'More': 'Lagi',
  // More — sections
  'Owner tools': 'Alat Pemilik',
  'My home': 'Rumah Saya',
  'Account': 'Akaun',
  // More — items
  'Users': 'Pengguna',
  'Team & Access': 'Pasukan & Akses',
  'All projects': 'Semua Projek',
  'My properties': 'Hartanah Saya',
  'Project contacts': 'Kenalan Projek',
  'Manage updates': 'Urus Kemas Kini',
  'Edit my name': 'Edit Nama Saya',
  'Settings & language': 'Tetapan & Bahasa',
  'Support': 'Sokongan',
  'Sign out': 'Log Keluar',
  // Users screen
  'Invite user': 'Jemput Pengguna',
  'registered': 'berdaftar',
  'user': 'pengguna',
  'users': 'pengguna',
  // Settings sheet
  'Language': 'Bahasa',
  'Choose the language for the app.': 'Pilih bahasa untuk aplikasi.',
  // Support sheet
  'Need a hand?': 'Perlukan bantuan?',
  'Contact INH Design & Build and we\'ll help you out.': 'Hubungi INH Design & Build dan kami akan membantu anda.',
  'Email support': 'E-mel sokongan',
};

export function t(text) {
  if (current === 'ms') return MS[text] || text;
  return text;
}
