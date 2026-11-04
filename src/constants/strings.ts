import type { Pair } from '@/lib/i18n'

/**
 * App-shell copy, EN/ID (HR_OPERATIONS.md §16.4). Module pages are still
 * English-only; translate them a module at a time into pairs like these.
 */
export const S = {
  appName: { en: 'NourishOS', id: 'NourishOS' },
  openNav: { en: 'Open navigation', id: 'Buka navigasi' },
  closeNav: { en: 'Close navigation', id: 'Tutup navigasi' },
  close: { en: 'Close', id: 'Tutup' },
  collapse: { en: 'Collapse', id: 'Ciutkan' },
  expand: { en: 'Expand', id: 'Bentangkan' },
  collapseSidebar: { en: 'Collapse sidebar', id: 'Ciutkan sidebar' },
  expandSidebar: { en: 'Expand sidebar', id: 'Bentangkan sidebar' },
  toLight: { en: 'Switch to light mode', id: 'Ganti ke mode terang' },
  toDark: { en: 'Switch to dark mode', id: 'Ganti ke mode gelap' },
  toOtherLang: { en: 'Switch to Bahasa Indonesia', id: 'Ganti ke English' },
  signOut: { en: 'Sign out', id: 'Keluar' },
} satisfies Record<string, Pair>

/** Sidebar labels, keyed by route. */
export const NAV = {
  dashboard: { en: 'Dashboard', id: 'Dasbor' },
  people: { en: 'People', id: 'SDM' },
  employees: { en: 'Employees', id: 'Karyawan' },
  positions: { en: 'Positions', id: 'Jabatan' },
  inventory: { en: 'Inventory', id: 'Inventaris' },
  recruitment: { en: 'Recruitment', id: 'Rekrutmen' },
  trainingCatalogue: { en: 'Training Catalogue', id: 'Katalog Pelatihan' },
  myTraining: { en: 'My Training', id: 'Pelatihan Saya' },
  appraisal: { en: 'Appraisal', id: 'Penilaian Kinerja' },
  employeeCommunication: { en: 'Employee Communication', id: 'Komunikasi Karyawan' },
  payroll: { en: 'Payroll', id: 'Penggajian' },
  attendance: { en: 'Attendance', id: 'Kehadiran' },
  reports: { en: 'Reports', id: 'Laporan' },
  offboarding: { en: 'Offboarding', id: 'Offboarding' },
  calendar: { en: 'Calendar', id: 'Kalender' },
  operations: { en: 'Operations', id: 'Operasional' },
  dailyUpdates: { en: 'Daily Updates', id: 'Update Harian' },
  shiftReports: { en: 'Shift Reports', id: 'Laporan Shift' },
  lostFound: { en: 'Lost & Found', id: 'Barang Hilang & Temuan' },
  incidents: { en: 'Incident Reports', id: 'Laporan Insiden' },
  projects: { en: 'Projects', id: 'Proyek' },
  engineering: { en: 'Engineering', id: 'Engineering' },
  workOrders: { en: 'Work Orders', id: 'Work Order' },
  preventiveMaintenance: { en: 'Preventive Maintenance', id: 'Perawatan Preventif' },
  assets: { en: 'Assets', id: 'Aset' },
  security: { en: 'Security', id: 'Keamanan' },
  patrolCheckpoints: { en: 'Patrol Checkpoints', id: 'Titik Patroli' },
  fireExtinguishers: { en: 'Fire Extinguisher Checklist', id: 'Checklist APAR' },
  finance: { en: 'Finance', id: 'Keuangan' },
  documents: { en: 'Documents', id: 'Dokumen' },
  sopLibrary: { en: 'SOP Library', id: 'Pustaka SOP' },
  jobDescriptions: { en: 'Job Descriptions', id: 'Deskripsi Pekerjaan' },
  bible: { en: "Nourish's Bible", id: "Nourish's Bible" },
  welcomeContent: { en: 'Welcome Content', id: 'Konten Welcome' },
  communications: { en: 'Communications', id: 'Komunikasi' },
  announcements: { en: 'Announcements', id: 'Pengumuman' },
  tasks: { en: 'Tasks', id: 'Tugas' },
  settings: { en: 'Settings', id: 'Pengaturan' },
  rolePermissions: { en: 'Role Permissions', id: 'Hak Akses Peran' },
} satisfies Record<string, Pair>
