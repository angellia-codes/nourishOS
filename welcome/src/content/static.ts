import type { Pair } from '../strings'

/**
 * welcome-portal.md §2 D4 / §7.4 — the three sections that are static in the
 * bundle rather than HR-editable. Company Profile, Core Values and the
 * Grooming Standard change when the company changes, which is a deploy either
 * way; the Menu, Org Chart, Attendance Guide and Do's & Don'ts change far more
 * often and come from `welcomeContent` instead.
 *
 * This is content, not engineering. The copy below is drawn from the Company
 * Profile PDF, the Core Value PDF and the Grooming Standard deck the spec
 * cites — **it is a first pass and needs an owner read-through** (open item
 * M7 covers the same ground for the two editable guides). Editing the strings
 * here is a data change; nothing branches on them.
 *
 * §7.4's HR-contact note is honoured by NOT hardcoding a name or a number
 * here: open item M8 records that the Company Profile and the Org Chart
 * disagree about who a hire contacts, so the contact block reads from the
 * editable content instead and this file says nothing about it.
 */

const p = (id: string, en: string): Pair => ({ id, en })

export interface StaticBlock {
  heading: Pair
  body: Pair
}

export const COMPANY_PROFILE: StaticBlock[] = [
  {
    heading: p('Siapa kami', 'Who we are'),
    body: p(
      'Nourish Group Indonesia adalah kelompok usaha makanan dan minuman di Bali, dengan beberapa outlet restoran, bar, bakery, dan ritel wholefood. Kami memasak dari bahan segar, menyajikannya dengan ramah, dan memperlakukan setiap tamu seperti tamu di rumah sendiri.',
      'Nourish Group Indonesia is a food and beverage group in Bali, with restaurant, bar, bakery and wholefood retail outlets. We cook from fresh produce, serve it warmly, and treat every guest the way we would treat a guest in our own home.',
    ),
  },
  {
    heading: p('Cara kami bekerja', 'How we work'),
    body: p(
      'Kami tim kecil yang saling mengandalkan. Kalau ada yang butuh bantuan, kita bantu — tidak menunggu diminta. Kalau ada yang salah, kita bicarakan lebih awal, bukan disembunyikan. Standar kami tinggi karena tamu mempercayakan makanannya kepada kita.',
      'We are a small team and we rely on each other. If someone needs a hand, we give one — without waiting to be asked. If something goes wrong, we raise it early rather than hide it. Our standards are high because guests trust us with what they eat.',
    ),
  },
  {
    heading: p('Hari pertamamu', 'Your first day'),
    body: p(
      'Datang 15 menit lebih awal, kenakan seragam sesuai standar penampilan di bagian berikutnya, dan bawa dokumen asli yang kamu unggah di formulir. Supervisor outletmu akan menemuimu dan mengenalkanmu ke tim.',
      'Arrive 15 minutes early, dressed to the grooming standard in the next section, and bring the original documents you uploaded in the form. Your outlet supervisor will meet you and introduce you to the team.',
    ),
  },
]

export const CORE_VALUES: StaticBlock[] = [
  {
    heading: p('INSPIRE', 'INSPIRE'),
    body: p(
      'Nilai inti kami dieja INSPIRE. Tujuh kata ini yang kami pakai untuk memutuskan hal-hal yang tidak ada di SOP mana pun.',
      'Our core values spell INSPIRE. These seven words are what we use to decide the things no SOP covers.',
    ),
  },
  {
    heading: p('I — Integritas', 'I — Integrity'),
    body: p(
      'Jujur soal bahan, porsi, jam kerja, dan kesalahan. Termasuk saat tidak ada yang melihat.',
      'Honest about ingredients, portions, hours and mistakes. Including when nobody is watching.',
    ),
  },
  {
    heading: p('N — Nurture', 'N — Nurture'),
    body: p(
      'Kita menumbuhkan satu sama lain. Yang senior mengajar, yang baru bertanya — keduanya wajar.',
      'We grow each other. Seniors teach, new people ask — both are normal here.',
    ),
  },
  {
    heading: p('S — Service', 'S — Service'),
    body: p(
      'Layanan bukan sekadar sopan. Layanan adalah memperhatikan apa yang dibutuhkan tamu sebelum diminta.',
      'Service is not just politeness. It is noticing what a guest needs before they ask.',
    ),
  },
  {
    heading: p('P — Passion', 'P — Passion'),
    body: p(
      'Peduli pada hasil akhirnya. Piring yang keluar dari dapur adalah namamu.',
      'Care about the result. The plate that leaves the kitchen carries your name.',
    ),
  },
  {
    heading: p('I — Inovasi', 'I — Innovation'),
    body: p(
      'Kalau ada cara yang lebih baik, katakan. Ide terbaik sering datang dari yang paling dekat dengan pekerjaannya.',
      'If there is a better way, say so. The best ideas usually come from whoever is closest to the work.',
    ),
  },
  {
    heading: p('R — Respect', 'R — Respect'),
    body: p(
      'Ke tamu, ke rekan kerja, ke supplier, ke tempat kerja. Tanpa pengecualian.',
      'To guests, to colleagues, to suppliers, to the place we work in. No exceptions.',
    ),
  },
  {
    heading: p('E — Excellence', 'E — Excellence'),
    body: p(
      'Standar yang sama di hari sibuk dan di hari sepi. Konsistensi itulah keunggulan.',
      'The same standard on a busy day and a quiet one. Consistency is what excellence means.',
    ),
  },
]

export const GROOMING: StaticBlock[] = [
  {
    heading: p('Kenapa ini penting', 'Why this matters'),
    body: p(
      'Penampilan adalah hal pertama yang dilihat tamu, dan di dapur ini juga soal keamanan pangan. Standar di bawah berlaku untuk semua departemen kecuali disebutkan lain.',
      'Your appearance is the first thing a guest sees, and in the kitchen it is also food safety. The standards below apply to every department unless stated otherwise.',
    ),
  },
  {
    heading: p('Kebersihan diri', 'Personal hygiene'),
    body: p(
      'Mandi sebelum shift. Deodoran wajib, parfum menyengat tidak. Gigi dan napas bersih. Cuci tangan saat tiba, setiap ganti tugas, setelah dari toilet, dan setelah memegang bahan mentah.',
      'Shower before your shift. Deodorant yes, heavy fragrance no. Clean teeth and fresh breath. Wash your hands on arrival, between tasks, after the toilet, and after handling raw ingredients.',
    ),
  },
  {
    heading: p('Rambut', 'Hair'),
    body: p(
      'Bersih dan rapi. Rambut panjang diikat rapat ke belakang; di dapur wajib memakai penutup kepala. Jenggot dan kumis dicukur rapi. Pewarna rambut warna mencolok tidak diperbolehkan.',
      'Clean and tidy. Long hair tied back tightly; in the kitchen a head covering is required. Beards and moustaches neatly trimmed. Bright unnatural hair colour is not permitted.',
    ),
  },
  {
    heading: p('Kuku dan tangan', 'Nails and hands'),
    body: p(
      'Kuku pendek, bersih, tanpa cat kuku dan tanpa kuku palsu untuk semua yang memegang makanan. Luka terbuka ditutup plester tahan air berwarna dan sarung tangan.',
      'Nails short, clean, no polish and no false nails for anyone handling food. Open cuts covered with a coloured waterproof plaster and a glove.',
    ),
  },
  {
    heading: p('Make-up dan perhiasan', 'Make-up and jewellery'),
    body: p(
      'Make-up natural. Perhiasan dibatasi: jam tangan sederhana dan satu cincin polos. Di dapur, tidak ada perhiasan sama sekali kecuali cincin kawin polos.',
      'Natural make-up. Jewellery is limited: a plain watch and one plain ring. In the kitchen, no jewellery at all except a plain wedding band.',
    ),
  },
  {
    heading: p('Seragam dan name tag', 'Uniform and name tag'),
    body: p(
      'Seragam bersih dan disetrika setiap shift. Name tag selalu dipakai, di dada sebelah kiri, menghadap tamu. Sepatu tertutup, anti-slip, warna gelap. Apron diganti begitu kotor, bukan di akhir shift.',
      'Uniform clean and pressed every shift. Name tag always worn, left chest, facing the guest. Closed, non-slip, dark shoes. Aprons are changed as soon as they are soiled, not at the end of the shift.',
    ),
  },
  {
    heading: p('Per departemen', 'By department'),
    body: p(
      'Dapur dan bakery: penutup kepala, apron, sepatu tertutup, tanpa perhiasan. Service dan bar: seragam outlet, name tag, sepatu gelap. Ritel wholefood: seragam outlet dan name tag. Security: seragam lengkap sesuai ketentuan.',
      'Kitchen and bakery: head covering, apron, closed shoes, no jewellery. Service and bar: outlet uniform, name tag, dark shoes. Wholefood retail: outlet uniform and name tag. Security: full uniform as specified.',
    ),
  },
]
