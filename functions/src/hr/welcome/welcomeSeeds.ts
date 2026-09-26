/**
 * welcome-portal.md §7.4 — the first-pass content for the four HR-editable
 * welcome sections, in the shapes `welcome/src/api.ts` renders.
 *
 * This is content, not engineering, and it carries the same standing caveat
 * `welcome/src/content/static.ts` does for the three static sections: the copy
 * below is a first pass and needs an owner read-through (open item M7 names
 * these two guides specifically). Nothing branches on any of it.
 *
 * Which is why `seedWelcomeContent` writes it to `draft` and never to
 * `published`: a new hire sees nothing from this file until HR has read it and
 * pressed Publish.
 *
 * Two sections are deliberately seeded as structure with no content, because
 * the source material §7.4 cites does not exist in this repo:
 *
 * - **Menu** — "one-time seed from the five menu PDFs", and there are no menu
 *   PDFs here. Inventing dish names and prices for a live F&B group would put
 *   fabricated figures one Publish click away from every new hire, so the seed
 *   lays out the categories and leaves every item list empty for HR to fill.
 * - **Org Chart** — needs a publicly reachable image URL (a `files/{id}` in
 *   this app's own bucket renders broken for an audience with no Firebase Auth
 *   session). Only the caption is seeded; the URL is HR's to paste.
 */

export interface SeedBilingual {
  id: string
  en: string
}

export interface SeedGuide {
  blocks: { heading: SeedBilingual; body: SeedBilingual }[]
}

export interface SeedMenu {
  categories: { title: SeedBilingual; items: { name: string; price: string; tags: string }[] }[]
}

export interface SeedOrgChart {
  imageUrl: string
  caption: SeedBilingual
}

const p = (id: string, en: string): SeedBilingual => ({ id, en })

/**
 * Drafted from docs/modules/attendance.md: the nine-code taxonomy (§2), the
 * monthly-recap grain (§1.1) and the HR Manager → GM approval chain (§6).
 *
 * What that doc does *not* define is shift-level conduct — when to call in
 * sick, how far ahead to ask for leave — because it is a ledger spec, not a
 * policy one. Those lines follow the practice the Company Profile already
 * states ("arrive 15 minutes early") and are the part most in need of HR's
 * read-through before publishing.
 *
 * §7.4 also asks for the dated public-holiday calendar, ordered by the hire's
 * religion. No such calendar exists anywhere in this repo, and the dates are
 * set annually by government decree, so the block below explains how holidays
 * are treated and points at HR for the list rather than inventing dates.
 */
export const ATTENDANCE_GUIDE_SEED: SeedGuide = {
  blocks: [
    {
      heading: p('Jam kerja dan jadwal', 'Hours and roster'),
      body: p(
        'Jadwalmu dikeluarkan supervisor outletmu setiap minggu. Datang 15 menit sebelum shift dimulai, sudah berseragam dan siap bekerja — bukan baru tiba di menit shift dimulai.\nKalau kamu perlu menukar shift, minta persetujuan supervisor lebih dulu. Tukar shift yang tidak disetujui tetap tercatat atas namamu, bukan atas nama yang menggantikan.',
        'Your roster comes from your outlet supervisor each week. Arrive 15 minutes before your shift starts, already in uniform and ready to work — not walking in as the shift begins.\nIf you need to swap a shift, get your supervisor’s agreement first. An unapproved swap is still recorded against you, not against whoever covered.',
      ),
    },
    {
      heading: p('Bagaimana kehadiran dicatat', 'How attendance is recorded'),
      body: p(
        'Kehadiran dicatat per bulan, bukan per jam. Di akhir setiap bulan HR merekap jumlah hari untuk setiap kode di bawah, HR Manager memeriksanya, lalu General Manager menyetujuinya. Angka yang sudah disetujui itulah yang dipakai payroll.\nKalau menurutmu ada angka yang salah, bicarakan dengan supervisor atau HR di bulan yang sama. Setelah satu bulan disetujui, koreksi harus dibuat sebagai periode perbaikan tersendiri — jadi lebih cepat jauh lebih mudah.',
        'Attendance is recorded by the month, not by the hour. At the end of each month HR totals your days against the codes below, the HR Manager checks them and the General Manager approves them. Those approved totals are what payroll uses.\nIf a number looks wrong to you, raise it with your supervisor or HR inside the same month. Once a month is approved a correction has to be filed as a separate corrected period — so early is much easier than late.',
      ),
    },
    {
      heading: p('Kode kehadiran', 'The attendance codes'),
      body: p(
        'WD — Hari Kerja: kamu masuk kerja.\nDO — Libur: hari libur terjadwal, tetap dibayar.\nPH — Libur Nasional: hari libur nasional, tetap dibayar.\nDP — Day Payment: dibayar, diambil dari hakmu.\nAL — Cuti Tahunan: dibayar, diambil dari hak cutimu.\nMC — Cuti Sakit: dibayar, dengan surat dokter.\nEO — Extra Off: dibayar, diambil dari hakmu.\nSL — Cuti Khusus: dibayar, untuk keadaan tertentu seperti pernikahan atau duka.\nUL — Cuti Tanpa Gaji: tidak dibayar, dan ini satu-satunya kode yang dihitung sebagai absen.',
        'WD — Working Days: you were at work.\nDO — Day Off: a scheduled day off, still paid.\nPH — Public Holiday: a national holiday, still paid.\nDP — Day Payment: paid, drawn from your entitlement.\nAL — Annual Leave: paid, drawn from your leave entitlement.\nMC — Medical Certificate: paid, with a doctor’s letter.\nEO — Extra Off: paid, drawn from your entitlement.\nSL — Special Leave: paid, for specific circumstances such as a wedding or a bereavement.\nUL — Unpaid Leave: not paid, and the only code that counts as absence.',
      ),
    },
    {
      heading: p('Cuti dan izin', 'Leave and time off'),
      body: p(
        'Cuti diminta ke supervisormu, bukan lewat aplikasi ini — belum ada formulir cuti online. Minta jauh hari untuk cuti tahunan; di musim ramai, yang minta lebih awal lebih mungkin mendapat tanggalnya.\nCuti sakit: kabari supervisormu sebelum shift dimulai, bukan setelah kamu tidak muncul. Bawa surat dokter saat kamu kembali — tanpa surat, harinya dicatat sebagai UL, dan UL tidak dibayar.',
        'Leave is requested through your supervisor, not through this app — there is no online leave form yet. Ask well ahead for annual leave; in the busy season, whoever asks earliest is likeliest to get the dates.\nSick leave: tell your supervisor before your shift starts, not after you fail to appear. Bring the doctor’s letter when you return — without one the day is recorded as UL, and UL is unpaid.',
      ),
    },
    {
      heading: p('Libur nasional', 'Public holidays'),
      body: p(
        'Libur nasional (PH) dibayar dan tidak mengurangi hak cutimu. Karena kita bekerja di industri yang tetap buka di hari libur, sebagian dari kita justru masuk di hari itu dan mendapat hari libur pengganti — supervisormu yang mengaturnya di jadwal.\nDaftar tanggalnya mengikuti SKB pemerintah dan kalender hari raya di Bali, dan diedarkan HR setiap awal tahun. Minta daftar tahun ini ke HR atau supervisormu.',
        'Public holidays (PH) are paid and do not come out of your leave entitlement. Because we work in an industry that stays open on holidays, some of us do work them and take a replacement day instead — your supervisor arranges that in the roster.\nThe dates follow the government’s joint decree and the Balinese religious calendar, and HR circulates the list at the start of each year. Ask HR or your supervisor for this year’s list.',
      ),
    },
  ],
}

/**
 * Drafted from the Grooming Standard, Core Values (INSPIRE) and the attendance
 * rules above, exactly as §7.4 specifies. The static sections state the
 * standard; this one is the short, blunt version a hire can re-read in a
 * minute before a shift.
 */
export const DOS_AND_DONTS_SEED: SeedGuide = {
  blocks: [
    {
      heading: p('Sebelum shift', 'Before your shift'),
      body: p(
        'Lakukan: datang 15 menit lebih awal, seragam bersih dan disetrika, name tag di dada kiri, sepatu tertutup anti-slip.\nJangan: datang tepat di menit shift dimulai, memakai seragam kotor atau kusut, datang tanpa name tag, memakai sandal atau sepatu terbuka.',
        'Do: arrive 15 minutes early, uniform clean and pressed, name tag on your left chest, closed non-slip shoes.\nDon’t: arrive on the minute, wear a dirty or creased uniform, turn up without your name tag, wear sandals or open shoes.',
      ),
    },
    {
      heading: p('Di depan tamu', 'In front of guests'),
      body: p(
        'Lakukan: sapa setiap tamu, tatap matanya, dan katakan terus terang kalau kamu tidak tahu sesuatu — lalu cari yang tahu. Perhatikan apa yang tamu butuhkan sebelum diminta.\nJangan: berkerumun dan mengobrol di area tamu, membicarakan tamu atau rekan kerja di tempat yang bisa terdengar, berdebat dengan tamu, atau mengarang jawaban soal makanan.',
        'Do: greet every guest, meet their eye, and say honestly when you don’t know something — then find whoever does. Notice what a guest needs before they ask.\nDon’t: cluster and chat in the guest area, discuss guests or colleagues anywhere you can be overheard, argue with a guest, or invent an answer about the food.',
      ),
    },
    {
      heading: p('Makanan, alergi dan kebersihan', 'Food, allergies and hygiene'),
      body: p(
        'Lakukan: cuci tangan saat tiba, setiap ganti tugas, setelah dari toilet dan setelah memegang bahan mentah. Kuku pendek dan bersih. Tutup luka dengan plester berwarna tahan air dan sarung tangan. Tanyakan ke chef setiap kali tamu menyebut alergi.\nJangan: menebak soal bahan atau alergen, memakai perhiasan di dapur selain cincin kawin polos, menyentuh makanan siap saji dengan tangan kosong, atau tetap bekerja saat kamu sakit perut atau ada infeksi kulit — kabari supervisormu.',
        'Do: wash your hands on arrival, between tasks, after the toilet and after raw ingredients. Keep nails short and clean. Cover any cut with a coloured waterproof plaster and a glove. Ask the chef every time a guest mentions an allergy.\nDon’t: guess about ingredients or allergens, wear jewellery in the kitchen beyond a plain wedding band, handle ready-to-eat food with bare hands, or work through a stomach illness or a skin infection — tell your supervisor instead.',
      ),
    },
    {
      heading: p('Telepon dan media sosial', 'Phone and social media'),
      body: p(
        'Lakukan: simpan teleponmu selama shift dan pakai saat istirahat. Kalau ada urusan keluarga yang mendesak, bilang ke supervisormu.\nJangan: memegang telepon di area tamu atau di area persiapan makanan, memotret tamu, atau memposting apa pun tentang tamu, insiden, atau area belakang outlet ke media sosial.',
        'Do: keep your phone away during your shift and use it on your break. If something urgent is happening at home, tell your supervisor.\nDon’t: hold your phone in the guest area or in food prep, photograph guests, or post anything about a guest, an incident or the back of house on social media.',
      ),
    },
    {
      heading: p('Kejujuran dan barang perusahaan', 'Honesty and company property'),
      body: p(
        'Lakukan: catat setiap penjualan dan setiap void sesuai prosedur, laporkan barang rusak atau hilang begitu kamu tahu, dan serahkan barang yang tertinggal milik tamu ke Lost & Found di hari yang sama.\nJangan: mengambil makanan, minuman atau bahan tanpa izin, memberi diskon atau makanan gratis atas keputusan sendiri, atau memakai barang perusahaan untuk keperluan pribadi.',
        'Do: ring up every sale and every void the way the procedure says, report damage or a missing item as soon as you know, and hand anything a guest left behind to Lost & Found the same day.\nDon’t: take food, drink or ingredients without permission, give a discount or a free item on your own judgement, or use company property for personal purposes.',
      ),
    },
    {
      heading: p('Kalau ada yang salah', 'When something goes wrong'),
      body: p(
        'Lakukan: bicarakan lebih awal. Piring yang salah, tamu yang marah, kecelakaan kecil, alat yang rusak — semuanya lebih murah kalau diketahui di awal shift daripada ditemukan besok. Laporkan ke supervisormu; untuk cedera dan insiden keamanan, dibuat juga Incident Report.\nJangan: menyembunyikan kesalahan, menyalahkan rekan kerja, atau berharap tidak ada yang menyadarinya.',
        'Do: raise it early. A wrong plate, an angry guest, a small accident, broken equipment — all of it is cheaper known at the start of a shift than discovered tomorrow. Tell your supervisor; for injuries and security incidents an Incident Report goes in as well.\nDon’t: hide a mistake, blame a colleague, or hope nobody notices.',
      ),
    },
  ],
}

/**
 * Structure only — see this file's header for why no item carries a name or a
 * price. The categories are the ones common across the group's outlets; HR
 * adds, renames or removes them in the editor as each menu requires.
 */
export const MENU_SEED: SeedMenu = {
  categories: [
    { title: p('Sarapan', 'Breakfast'), items: [] },
    { title: p('Bowl dan Salad', 'Bowls & Salads'), items: [] },
    { title: p('Hidangan Utama', 'Mains'), items: [] },
    { title: p('Bakery', 'Bakery'), items: [] },
    { title: p('Pencuci Mulut', 'Desserts'), items: [] },
    { title: p('Kopi dan Teh', 'Coffee & Tea'), items: [] },
    { title: p('Minuman', 'Drinks'), items: [] },
  ],
}

/** Caption only — the image URL is HR's to paste, per this file's header. */
export const ORG_CHART_SEED: SeedOrgChart = {
  imageUrl: '',
  caption: p(
    'Struktur organisasi Nourish Group. Cari posisimu, lalu cari supervisor langsungmu — merekalah orang pertama yang kamu hubungi.',
    'The Nourish Group structure. Find your own position, then find your direct supervisor — they are your first point of contact.',
  ),
}

/** Keyed by WELCOME_SECTIONS' own ids, which are the document ids too. */
export const WELCOME_CONTENT_SEEDS = {
  menu: MENU_SEED,
  orgChart: ORG_CHART_SEED,
  attendanceGuide: ATTENDANCE_GUIDE_SEED,
  dosAndDonts: DOS_AND_DONTS_SEED,
} as const
