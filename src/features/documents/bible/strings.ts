/**
 * Reader copy, EN/ID (design guide §8). The main app has no i18n framework,
 * so — like employeeCommunicationFormat.ts's BILINGUAL map — the reader keeps
 * its own pairs. Dish names and descriptions are never translated (D6).
 */

export type Lang = 'en' | 'id'

export interface Pair {
  en: string
  id: string
}

export const t = (pair: Pair, lang: Lang) => pair[lang]

export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))

export const S = {
  book: { en: "Nourish's Bible", id: "Nourish's Bible" },
  subtitle: { en: 'The standards we work by', id: 'Standar kerja kita' },
  company: { en: 'Nourish Group Indonesia', id: 'Nourish Group Indonesia' },
  openHint: { en: 'Tap the book to open it', id: 'Ketuk buku untuk membukanya' },
  openFromStart: { en: 'Open from the start', id: 'Buka dari awal' },
  closeBook: { en: 'Close the book', id: 'Tutup buku' },
  contents: { en: 'Contents', id: 'Daftar Isi' },
  inThisChapter: { en: 'In this chapter', id: 'Di bab ini' },
  chapter: { en: 'Chapter', id: 'Bab' },
  edition: { en: 'Edition {n}', id: 'Edisi {n}' },
  page: { en: 'Page {n} of {total}', id: 'Halaman {n} dari {total}' },
  prev: { en: 'Previous page', id: 'Halaman sebelumnya' },
  next: { en: 'Next page', id: 'Halaman berikutnya' },
  search: { en: 'Search menu', id: 'Cari menu' },
  searchHint: { en: 'Dish, drink or ingredient', id: 'Menu, minuman, atau bahan' },
  searchingIn: { en: 'Searching {scope}', id: 'Mencari di {scope}' },
  noResults: { en: 'Nothing matches that search.', id: 'Tidak ada yang cocok.' },
  close: { en: 'Close', id: 'Tutup' },
  comingSoon: { en: 'Coming soon', id: 'Segera hadir' },
  comingSoonBody: { en: 'This page is being written.', id: 'Halaman ini sedang disusun.' },
  locked: { en: 'This recipe is for the {team} team.', id: 'Resep ini untuk tim {team}.' },
  retry: { en: 'Try again', id: 'Coba lagi' },
  noSignal: { en: 'No connection. Check your signal and try again.', id: 'Tidak ada koneksi. Cek sinyal lalu coba lagi.' },
  notPublished: { en: 'Not published yet', id: 'Belum diterbitkan' },
  notPublishedBody: { en: 'The book has no published edition yet.', id: 'Buku ini belum memiliki edisi terbit.' },
  notAvailable: { en: 'Not available yet', id: 'Belum tersedia' },
  taxNote: { en: 'Excludes 10% government tax + 6% service charge.', id: 'Belum termasuk pajak 10% dan service charge 6%.' },
  pricesInThousands: { en: 'Prices in thousands of rupiah, as printed.', id: 'Harga dalam ribuan rupiah, sesuai menu cetak.' },
  food: { en: 'Food', id: 'Makanan' },
  beverage: { en: 'Beverage', id: 'Minuman' },
  items: { en: '{n} items', id: '{n} menu' },
  backTo: { en: 'Back to {name}', id: 'Kembali ke {name}' },
  chooseDish: { en: 'Choose a dish from the category page.', id: 'Pilih menu dari halaman kategori.' },
  allOutlets: { en: 'All outlets (master menu)', id: 'Semua outlet (menu induk)' },
  outletFilter: { en: 'Outlet', id: 'Outlet' },
  manageOutletMenu: { en: 'Outlet menu', id: 'Menu outlet' },
  addForm: { en: 'Add form', id: 'Tambah formulir' },
  edit: { en: 'Edit', id: 'Ubah' },
  open: { en: 'Open', id: 'Buka' },
  noForms: { en: 'No forms have been added yet.', id: 'Belum ada formulir.' },
  noSops: { en: 'No SOPs for this section yet.', id: 'Belum ada SOP untuk bagian ini.' },
  frontOfHouse: { en: 'Front of House', id: 'Front of House' },
  backOfHouse: { en: 'Back of House', id: 'Back of House' },
  photoMissing: { en: 'Photo coming soon', id: 'Foto segera hadir' },
  allergen: {
    en: 'Food prepared here may contain milk, eggs, wheat, soybean, peanuts, tree nuts, fish and shellfish.',
    id: 'Makanan di sini dapat mengandung susu, telur, gandum, kedelai, kacang tanah, kacang pohon, ikan, dan kerang.',
  },
  notesHowToExplain: { en: 'How to explain', id: 'Cara menjelaskan' },
  notesPairing: { en: 'Pairing', id: 'Padanan' },
  notesUpsell: { en: 'Upsell', id: 'Upsell' },
  notesGuestQuestions: { en: 'Guest questions', id: 'Pertanyaan tamu' },
  servingHours: { en: 'Served {hours}', id: 'Disajikan {hours}' },
} satisfies Record<string, Pair>

export const CHAPTER_TITLES: Record<string, Pair> = {
  general: { en: 'General Information', id: 'Informasi Umum' },
  service: { en: 'F&B Service', id: 'Layanan F&B' },
  product: { en: 'F&B Product', id: 'Produk F&B' },
  wholefood: { en: 'Wholefood', id: 'Wholefood' },
}

export const CHAPTER_SHORT: Record<string, Pair> = {
  general: { en: 'General', id: 'Umum' },
  service: { en: 'Service', id: 'Layanan' },
  product: { en: 'Product', id: 'Produk' },
  wholefood: { en: 'Wholefood', id: 'Wholefood' },
}

export const SECTION_TITLES: Record<string, Pair> = {
  floor: { en: 'Floor', id: 'Floor' },
  cashier: { en: 'Cashier', id: 'Kasir' },
  kitchen: { en: 'Kitchen', id: 'Dapur' },
  bar: { en: 'Bar', id: 'Bar' },
  bakery: { en: 'The Bakery Kitchen', id: 'The Bakery Kitchen' },
}

/** The team a recipe belongs to, for the Locked page (§15). */
export const OWNER_TEAMS: Record<string, Pair> = {
  kitchen: { en: 'Kitchen', id: 'Dapur' },
  bar: { en: 'Bar', id: 'Bar' },
  bakery: { en: 'Bakery', id: 'Bakery' },
}

export const PAGE_TITLES: Record<string, Pair> = {
  endpaper: { en: 'Endpaper', id: 'Halaman Sampul' },
  title: { en: 'Title', id: 'Judul' },
  contents: S.contents,
  opener: S.chapter,
  toc: S.inThisChapter,
  grooming: { en: 'Grooming Standard', id: 'Standar Grooming' },
  forms: { en: 'Company Forms', id: 'Formulir Perusahaan' },
  menu: { en: 'Menu', id: 'Menu' },
  category: { en: 'Category', id: 'Kategori' },
  dish: { en: 'Dish', id: 'Hidangan' },
  notes: { en: 'Service Notes', id: 'Catatan Layanan' },
  sequence: { en: 'Sequence of Service', id: 'Urutan Layanan' },
  sop: { en: 'SOP', id: 'SOP' },
  picture: { en: 'Picture', id: 'Gambar' },
  recipe: { en: 'Recipe', id: 'Resep' },
  procedure: { en: 'Production Procedure', id: 'Prosedur Produksi' },
  soon: S.comingSoon,
  back: { en: 'Back cover', id: 'Sampul belakang' },
}

export const TAG_LABELS: Record<string, Pair> = {
  V: { en: 'vegan', id: 'vegan' },
  VG: { en: 'vegetarian', id: 'vegetarian' },
  VO: { en: 'vegan option', id: 'opsi vegan' },
  GF: { en: 'gluten free', id: 'bebas gluten' },
}

// localStorage throws outright in some private-browsing modes rather than
// returning null (same guard as welcome/src/token.ts) — a failed read is
// "nothing stored", never a blank reader. Design guide §7.4.
export function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

export const STORAGE = {
  lang: 'bible.lang',
  lastOpenedDate: 'bible.lastOpenedDate',
  lastPageKey: 'bible.lastPageKey',
} as const

/** Today in Asia/Makassar as YYYY-MM-DD — the cover plays once per business day. */
export const todayWita = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' })
