/**
 * Public Holiday 2026 — welcome-portal.md §7.4: "the 2026 public-holiday
 * calendar, ordered by the hire's own recorded religion (Hindu / Non-Hindu
 * lists)". Transcribed from PT Nourish Group Indonesia's signed 2026 Public
 * Holiday document (Head Chef / Wholefood Manager / Restaurant Manager as
 * department reps, acknowledged by the Group HR Manager, approved by the
 * Group GM). Static bundled content, not Firestore-backed — same call
 * Company Profile/Core Values/Grooming Standard already make: this is a
 * fixed, signed, year-specific list, not something that changes mid-year.
 * A future year's list is a data-file edit and a redeploy.
 *
 * Names are kept as given — Indonesian ceremonial/statutory terms, not
 * forced into an EN/ID `Pair` — the same call docs/modules/attendance.md
 * already makes for "Libur Nasional" staying untranslated, and the same one
 * `CompanyProfileLocation.name` makes for a proper noun.
 */

export interface PublicHoliday {
  /** 'YYYY-MM-DD' */
  date: string
  name: string
}

export interface PublicHolidayContent {
  year: number
  hindu: PublicHoliday[]
  nonHindu: PublicHoliday[]
}

export const PUBLIC_HOLIDAYS: PublicHolidayContent = {
  year: 2026,
  hindu: [
    { date: '2026-01-01', name: 'Tahun Baru 2026 Masehi' },
    { date: '2026-01-17', name: 'Hari Siwa Ratri' },
    { date: '2026-03-18', name: 'Pengerupukan' },
    { date: '2026-03-19', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)' },
    { date: '2026-03-20', name: 'Ngembak Geni' },
    { date: '2026-04-04', name: 'Hari Saraswati' },
    { date: '2026-04-08', name: 'Hari Pagerwesi' },
    { date: '2026-05-01', name: 'Hari Buruh Internasional' },
    { date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE' },
    { date: '2026-06-01', name: 'Hari Lahir Pancasila' },
    { date: '2026-06-16', name: 'Penampahan Galungan' },
    { date: '2026-06-17', name: 'Hari Raya Galungan' },
    { date: '2026-06-18', name: 'Umanis Galungan' },
    { date: '2026-06-27', name: 'Hari Raya Kuningan' },
    { date: '2026-08-17', name: 'Hari Proklamasi Kemerdekaan RI' },
    { date: '2026-10-31', name: 'Hari Saraswati' },
    { date: '2026-11-04', name: 'Hari Pagerwesi' },
  ],
  nonHindu: [
    { date: '2026-01-01', name: 'Tahun Baru 2026 Masehi' },
    { date: '2026-01-16', name: 'Isra Mikraj Nabi Muhammad S.A.W.' },
    { date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili' },
    { date: '2026-03-19', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)' },
    { date: '2026-03-21', name: 'Idul Fitri 1447 Hijriah I' },
    { date: '2026-03-22', name: 'Idul Fitri 1447 Hijriah II' },
    { date: '2026-04-03', name: 'Wafat Yesus Kristus' },
    { date: '2026-04-05', name: 'Kebangkitan Yesus Kristus (Paskah)' },
    { date: '2026-05-01', name: 'Hari Buruh Internasional' },
    { date: '2026-05-14', name: 'Kenaikan Yesus Kristus' },
    { date: '2026-05-27', name: 'Idul Adha 1447 Hijriah' },
    { date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE' },
    { date: '2026-06-01', name: 'Hari Lahir Pancasila' },
    { date: '2026-06-16', name: '1 Muharam Tahun Baru Islam 1448 Hijriah' },
    { date: '2026-08-17', name: 'Hari Proklamasi Kemerdekaan RI' },
    { date: '2026-08-25', name: 'Maulid Nabi Muhammad S.A.W.' },
    { date: '2026-12-25', name: 'Kelahiran Yesus Kristus' },
  ],
}
