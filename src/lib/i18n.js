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
  { code: 'zh', label: '中文' },
];

const CODES = LANGUAGES.map(l => l.code);

export function getLang() { return current; }
export function setLang(code) {
  current = CODES.includes(code) ? code : 'en';
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
  'Staff tools': 'Alat Kakitangan',
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
  'Add account': 'Tambah Akaun',
  'Change role': 'Tukar Peranan',
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

// English source -> Chinese (Simplified). Anything missing falls back to English.
const ZH = {
  // nav / tabs
  'Projects': '项目',
  'Overview': '概览',
  'Updates': '进度更新',
  'Documents': '文件',
  'Fees': '费用',
  'More': '更多',
  // More — sections
  'Owner tools': '业主工具',
  'Staff tools': '员工工具',
  'My home': '我的住宅',
  'Account': '账户',
  // More — items
  'Users': '用户',
  'Team & Access': '团队与权限',
  'All projects': '所有项目',
  'My properties': '我的房产',
  'Project contacts': '项目联系人',
  'Manage updates': '管理更新',
  'Edit my name': '编辑我的名字',
  'Settings & language': '设置与语言',
  'Support': '支持',
  'Sign out': '退出登录',
  // Users screen
  'Invite user': '邀请用户',
  'Add account': '添加账户',
  'Change role': '更改角色',
  'registered': '已注册',
  'user': '位用户',
  'users': '位用户',
  // Settings sheet
  'Language': '语言',
  'Choose the language for the app.': '选择应用程序的语言。',
  // Support sheet
  'Need a hand?': '需要帮助吗？',
  'Contact INH Design & Build and we\'ll help you out.': '联系 INH Design & Build，我们将为您提供帮助。',
  'Email support': '电邮支持',
};

const TABLES = { ms: MS, zh: ZH };

export function t(text) {
  const table = TABLES[current];
  return (table && table[text]) || text;
}
