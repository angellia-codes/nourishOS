/**
 * welcome-portal.md §7.4 — "All labels are {id, en} pairs. The default
 * language follows navigator.language, with an EN/ID toggle. Every screen is
 * tested against the Indonesian string."
 *
 * Indonesian is usually the longer of the two, so it is what the layout has to
 * survive: no fixed-width buttons, no truncated primary labels (§9).
 */

export type Lang = 'id' | 'en'

export function detectLang(): Lang {
  // A hire in Bali is far more likely to want Indonesian, so anything that is
  // not explicitly an English locale gets `id`.
  const nav = typeof navigator === 'undefined' ? '' : navigator.language.toLowerCase()
  return nav.startsWith('en') ? 'en' : 'id'
}

export interface Pair {
  id: string
  en: string
}

export function t(pair: Pair, lang: Lang): string {
  return pair[lang]
}

const p = (id: string, en: string): Pair => ({ id, en })

export const STRINGS = {
  appName: p('Nourish Group Indonesia', 'Nourish Group Indonesia'),

  // Invalid link (§11)
  invalidTitle: p('Tautan ini tidak berlaku', "This link isn't valid"),
  invalidBody: p(
    'Hubungi HR untuk minta tautan baru. Tautan berlaku 30 hari sejak dikirim.',
    'Ask HR for a new one. A link is valid for 30 days from when it was sent.',
  ),

  loading: p('Memuat…', 'Loading…'),
  retry: p('Coba lagi', 'Try again'),

  // Form shell (§7.1)
  formTitle: p('Lengkapi data diri kamu', 'Complete your details'),
  formIntro: p(
    'Isi lima langkah ini sekali saja. Data tersimpan otomatis, jadi kamu bisa lanjut nanti dari tautan yang sama.',
    'Five steps, once. Everything saves as you go, so you can finish later from the same link.',
  ),
  stepOf: p('Langkah {n} dari {total}', 'Step {n} of {total}'),
  next: p('Lanjut', 'Continue'),
  back: p('Kembali', 'Back'),
  review: p('Periksa & kirim', 'Review & submit'),
  submit: p('Kirim ke HR', 'Send to HR'),
  submitting: p('Mengirim…', 'Sending…'),
  saving: p('Menyimpan…', 'Saving…'),
  saved: p('Tersimpan', 'Saved'),

  step1: p('Data pribadi', 'Personal'),
  step2: p('Kontak', 'Contact'),
  step3: p('Identitas & bank', 'Identity & bank'),
  step4: p('Kontak darurat', 'Emergency contact'),
  step5: p('Dokumen', 'Documents'),

  // Fields
  fullName: p('Nama lengkap (sesuai KTP)', 'Full name (as on your KTP)'),
  placeOfBirth: p('Tempat lahir', 'Place of birth'),
  birthDate: p('Tanggal lahir', 'Date of birth'),
  gender: p('Jenis kelamin', 'Gender'),
  religion: p('Agama', 'Religion'),
  maritalStatus: p('Status pernikahan', 'Marital status'),
  bloodType: p('Golongan darah', 'Blood type'),
  tshirtSize: p('Ukuran seragam', 'Uniform size'),
  motherName: p('Nama ibu kandung', "Mother's name"),
  phone: p('Nomor HP (WhatsApp)', 'Phone number (WhatsApp)'),
  personalEmail: p('Email pribadi', 'Personal email'),
  permanentAddressKtp: p('Alamat sesuai KTP', 'Address as on your KTP'),
  domicileAddress: p('Alamat domisili sekarang', 'Where you live now'),
  emergencyContactName: p('Nama kontak darurat', 'Emergency contact name'),
  emergencyContactPhone: p('Nomor HP kontak darurat', 'Emergency contact phone'),
  emergencyContactAddress: p('Alamat kontak darurat', 'Emergency contact address'),
  emergencyContactRelationship: p('Hubungan', 'Relationship'),
  emergencyContactRelationshipOther: p('Sebutkan hubungannya', 'Please specify'),
  nik: p('NIK (16 digit)', 'NIK (16 digits)'),
  npwp: p('NPWP (15 atau 16 digit)', 'NPWP (15 or 16 digits)'),
  bpjsTk: p('BPJS Ketenagakerjaan', 'BPJS Ketenagakerjaan'),
  bpjsKesehatan: p('BPJS Kesehatan', 'BPJS Kesehatan'),
  bankAccountName: p('Nama pemilik rekening', 'Account holder name'),
  bankAccountNumber: p('Nomor rekening BCA (10 digit)', 'BCA account number (10 digits)'),

  optional: p('opsional', 'optional'),
  bankNote: p(
    'Gaji dibayarkan lewat BCA. Periksa ulang nomornya — satu digit salah berarti gaji tidak masuk.',
    'Salary is paid through BCA. Check the number twice — one wrong digit means your pay does not arrive.',
  ),
  bpjsNote: p(
    'Kalau kartunya belum ada, kosongkan saja. Bisa menyusul lewat HR.',
    'Leave blank if you do not have the card yet. You can give it to HR later.',
  ),

  // Documents (§6)
  slotPhoto: p('Pas foto', 'Photo'),
  slotKtp: p('Scan KTP', 'KTP scan'),
  slotKk: p('Scan Kartu Keluarga', 'Family card (KK) scan'),
  slotSupporting: p('Dokumen pendukung', 'Supporting documents'),
  slotPhotoHint: p('Foto 4x6, latar merah.', '4x6 photo, red background.'),
  slotKtpHint: p('Harus jelas dan terbaca semua.', 'Every line has to be readable.'),
  slotKkHint: p('Halaman yang memuat namamu.', 'The page with your name on it.'),
  slotSupportingHint: p('Maksimal 2 berkas. Ijazah, sertifikat, dan sejenisnya.', 'Up to 2 files. Diploma, certificates, that sort of thing.'),
  copyNote: p(
    'Yang kamu unggah adalah salinan/foto. Dokumen aslinya tetap kamu simpan.',
    'You are uploading a copy or a photo. You keep the original.',
  ),
  takePhoto: p('Ambil foto', 'Take a photo'),
  chooseFile: p('Pilih berkas', 'Choose a file'),
  remove: p('Hapus', 'Remove'),
  uploading: p('Mengunggah…', 'Uploading…'),
  uploaded: p('Terunggah', 'Uploaded'),
  fileTooBig: p('Berkas terlalu besar. Maksimal 8MB.', 'That file is too large. 8MB maximum.'),

  // Review
  reviewTitle: p('Periksa sekali lagi', 'Check it over'),
  reviewIntro: p(
    'Setelah dikirim, data ini dikunci dan hanya HR yang bisa mengubahnya.',
    'Once you send this it locks, and only HR can change it.',
  ),
  edit: p('Ubah', 'Edit'),
  notFilled: p('Belum diisi', 'Not filled in'),
  fixBeforeSubmit: p('Ada yang perlu diperbaiki dulu.', 'A few things need fixing first.'),

  // Offline (§12)
  offlineTitle: p('Kamu sedang offline', "You're offline"),
  offlineBody: p(
    'Isianmu tersimpan di HP ini. Sambungkan internet lalu kirim lagi.',
    'What you typed is saved on this phone. Reconnect, then send it.',
  ),

  // Banner (§7.2)
  envelopeHint: p('Ketuk amplop untuk membukanya', 'Tap the envelope to open it'),
  welcomeTo: p('Selamat datang di Nourish, {name}', 'Welcome to Nourish, {name}'),
  chipSubmitted: p('Terkirim — HR sedang memeriksa datamu', 'Submitted — HR is checking your details'),
  chipVerified: p('Terverifikasi', 'Verified'),
  // The GM's own words to a new hire. Signed, so it is a message from a person
  // rather than a system notice — kept verbatim as supplied, not re-worded.
  bannerNote: p(
    'Kami sangat senang menyambut Anda menjadi bagian dari keluarga Nourish. Semoga Anda merasa diterima, didukung, dan terinspirasi dalam memulai perjalanan baru bersama kami.',
    'We’re truly happy to have you join the Nourish family. We hope you feel welcomed, supported, and inspired as you begin this new journey with us.',
  ),
  bannerSignerName: p('Made Bagia Arsana', 'Made Bagia Arsana'),
  bannerSignerTitle: p(
    'General Manager – Nourish Group Indonesia',
    'General Manager – Nourish Group Indonesia',
  ),
  rejectedNote: p(
    'HR mengembalikan datamu untuk diperbaiki. Buka formulirnya lagi di bawah.',
    'HR sent your details back for a correction. Open the form again below.',
  ),
  openForm: p('Buka formulir', 'Open the form'),

  // Home (§7.3)
  readSections: p('Yang perlu kamu tahu', 'What you need to know'),

  // Nav (§7.3)
  navHome: p('Beranda', 'Home'),
  navAbout: p('Tentang', 'About'),
  navStandards: p('Standar', 'Standards'),
  navMenu: p('Menu', 'Menu'),

  // Sections (§7.4)
  secProfile: p('Profil Perusahaan', 'Company Profile'),
  secValues: p('Nilai Inti', 'Core Values'),
  secOrgChart: p('Struktur Organisasi', 'Organization Chart'),
  secGrooming: p('Standar Penampilan', 'Grooming Standard'),
  secDosDonts: p('Boleh & Tidak Boleh', "Do's & Don'ts"),
  secAttendance: p('Panduan Absensi', 'Attendance Guide'),
  secMenu: p('Menu', 'Menu'),

  sectionEmpty: p('HR belum mengisi bagian ini.', 'HR has not filled this in yet.'),
  menuTaxNote: p(
    'Harga belum termasuk pajak pemerintah 10% dan service charge 6%.',
    'Prices are exclusive of 10% government tax and 6% service charge.',
  ),
  menuAllergenNote: p(
    'Ada alergi? Tanyakan ke tim sebelum memesan atau menyajikan. Dapur kami menangani kacang, susu, telur, gluten, dan makanan laut.',
    'Allergies? Ask the team before ordering or serving. Our kitchen handles nuts, dairy, egg, gluten and seafood.',
  ),
  menuLegend: p('GF bebas gluten · V vegetarian · VO bisa vegan · VG vegan', 'GF gluten free · V vegetarian · VO vegan option · VG vegan'),
  orgChartZoom: p('Cubit untuk memperbesar.', 'Pinch to zoom.'),

  // Company Profile (§7.4, replaced 2026-09-26)
  photoComingSoon: p('Foto segera hadir', 'Photo coming soon'),
  openInMaps: p('Buka di Google Maps', 'Open in Google Maps'),
} as const

/** "Step {n} of {total}" and friends. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`))
}

/** Dropdown options, mirroring the server enums in functions/src/hr/employees/helpers.ts. */
export const OPTIONS = {
  gender: [
    { value: 'male', label: p('Laki-laki', 'Male') },
    { value: 'female', label: p('Perempuan', 'Female') },
  ],
  religion: [
    { value: 'hindu', label: p('Hindu', 'Hindu') },
    { value: 'christian', label: p('Kristen', 'Christian') },
    { value: 'catholic', label: p('Katolik', 'Catholic') },
    { value: 'islam', label: p('Islam', 'Islam') },
    { value: 'other', label: p('Lainnya', 'Other') },
  ],
  maritalStatus: [
    { value: 'single', label: p('Belum menikah', 'Single') },
    { value: 'married', label: p('Menikah', 'Married') },
    { value: 'widowed', label: p('Duda/Janda', 'Widowed') },
  ],
  bloodType: [
    { value: 'A', label: p('A', 'A') },
    { value: 'B', label: p('B', 'B') },
    { value: 'AB', label: p('AB', 'AB') },
    { value: 'O', label: p('O', 'O') },
  ],
  tshirtSize: [
    { value: 'XS', label: p('XS', 'XS') },
    { value: 'S', label: p('S', 'S') },
    { value: 'M', label: p('M', 'M') },
    { value: 'L', label: p('L', 'L') },
    { value: 'XL', label: p('XL', 'XL') },
    { value: 'XXL', label: p('XXL', 'XXL') },
  ],
  emergencyContactRelationship: [
    { value: 'spouse', label: p('Suami/Istri', 'Spouse') },
    { value: 'parents', label: p('Orang tua', 'Parents') },
    { value: 'siblings', label: p('Saudara kandung', 'Siblings') },
    { value: 'children', label: p('Anak', 'Children') },
    { value: 'friends', label: p('Teman', 'Friends') },
    { value: 'other', label: p('Lainnya', 'Other') },
  ],
} as const
