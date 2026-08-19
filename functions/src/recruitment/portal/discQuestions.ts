/**
 * DISC question bank — candidate_portal.md §10.1.
 *
 * Deliberately our own wording. The doc's own warning applies: published DISC
 * instruments are licensed products, so this is a plain four-choice
 * self-description set written for this codebase, not a reproduction of one.
 * It is decision *support* (§20) — it never decides an outcome by itself.
 *
 * A constant, not a Firestore collection: nothing in the app edits these, and
 * a seeded collection would need a migration every time the wording changes.
 * Move it to Firestore the day HR wants to author questions themselves.
 */

export const DISC_DIMENSIONS = ['D', 'I', 'S', 'C'] as const
export type DiscDimension = (typeof DISC_DIMENSIONS)[number]

export interface DiscQuestion {
  id: string
  prompt: string
  promptId: string
  options: { id: string; text: string; textId: string; dimension: DiscDimension }[]
}

/**
 * Every line is written twice, English then Indonesian, in one tuple — most
 * candidates read Indonesian first, and pairing the two here is what stops a
 * reworded English prompt from silently keeping a stale translation. Same
 * both-languages-verbatim treatment the F010 declaration gets
 * (portal/src/labels.ts), rather than a language switch nobody has to find.
 */
type Bilingual = [en: string, id: string]

/** Every question offers the same four dimensions, in a rotated order so the answer sheet has no pattern to game. */
const ITEMS: [Bilingual, Bilingual, Bilingual, Bilingual, Bilingual][] = [
  // prompt, D text, I text, S text, C text
  [
    ['At work I am at my best when I…', 'Saya bekerja paling baik ketika saya…'],
    ['take charge and get a result', 'mengambil alih dan mencapai hasil'],
    ['talk people round to an idea', 'mengajak orang lain menerima sebuah ide'],
    ['keep things steady for the team', 'menjaga suasana tetap stabil untuk tim'],
    ['get the details exactly right', 'mengerjakan detailnya dengan tepat'],
  ],
  [
    ['When a shift gets busy I…', 'Ketika shift menjadi sibuk, saya…'],
    ['make the call and move', 'segera mengambil keputusan lalu bergerak'],
    ['keep everyone upbeat', 'menjaga semangat semua orang'],
    ['hold my station and absorb it', 'bertahan di pos saya dan menanganinya'],
    ['follow the procedure closely', 'mengikuti prosedur dengan cermat'],
  ],
  [
    ['People would describe me as…', 'Orang lain menggambarkan saya sebagai orang yang…'],
    ['direct', 'terus terang'],
    ['outgoing', 'mudah bergaul'],
    ['patient', 'sabar'],
    ['precise', 'teliti'],
  ],
  [
    ['A guest complaint makes me want to…', 'Saat ada keluhan tamu, saya ingin…'],
    ['fix it on the spot', 'menyelesaikannya saat itu juga'],
    ['win the guest back personally', 'merebut kembali hati tamu itu secara pribadi'],
    ['listen until they feel heard', 'mendengarkan sampai tamu merasa didengar'],
    ['find out what went wrong', 'mencari tahu apa yang salah'],
  ],
  [
    ['I prefer a manager who…', 'Saya lebih suka atasan yang…'],
    ['gives me room to decide', 'memberi saya ruang untuk memutuskan'],
    ['talks things through with me', 'mau membahas persoalan bersama saya'],
    ['is consistent and fair', 'konsisten dan adil'],
    ['is clear about the standard', 'jelas menyampaikan standarnya'],
  ],
  [
    ['In a new team I…', 'Di tim yang baru, saya…'],
    ['push for a plan', 'mendorong agar rencana segera dibuat'],
    ['get to know everyone fast', 'cepat berkenalan dengan semua orang'],
    ['wait and fit in', 'menunggu dan menyesuaikan diri'],
    ['learn how things are done here', 'mempelajari cara kerja di tempat itu'],
  ],
  [
    ['My weak spot is that I can be…', 'Kelemahan saya, saya bisa menjadi…'],
    ['impatient', 'tidak sabaran'],
    ['talkative', 'terlalu banyak bicara'],
    ['slow to change', 'lambat menerima perubahan'],
    ['hard to please', 'sulit dipuaskan'],
  ],
  [
    ['I would rather be given…', 'Saya lebih suka diberi…'],
    ['a target', 'sebuah target'],
    ['a team', 'sebuah tim'],
    ['a routine', 'rutinitas yang tetap'],
    ['a checklist', 'daftar periksa'],
  ],
  [
    ['When I disagree with a decision I…', 'Kalau saya tidak setuju dengan sebuah keputusan, saya…'],
    ['say so straight away', 'langsung mengatakannya'],
    ['try to bring people with me', 'berusaha mengajak orang lain sependapat'],
    ['go along with it for now', 'mengikutinya dulu untuk sementara'],
    ['ask what it is based on', 'menanyakan dasar keputusan itu'],
  ],
  [
    ['Under pressure I get…', 'Di bawah tekanan, saya menjadi…'],
    ['blunt', 'bicara tanpa basa-basi'],
    ['louder', 'lebih banyak bersuara'],
    ['quiet', 'pendiam'],
    ['careful', 'lebih berhati-hati'],
  ],
  [
    ['I feel good at the end of a shift when…', 'Saya merasa puas di akhir shift kalau…'],
    ['we hit the numbers', 'target kami tercapai'],
    ['the guests enjoyed themselves', 'para tamu merasa senang'],
    ['nothing went wrong', 'tidak ada yang bermasalah'],
    ['everything was in order', 'semuanya rapi dan tertata'],
  ],
  [
    ['New procedure lands on the noticeboard. I…', 'Ada prosedur baru di papan pengumuman. Saya…'],
    ['ask why we changed it', 'menanyakan alasan perubahannya'],
    ['ask who else has tried it', 'menanyakan siapa lagi yang sudah mencobanya'],
    ['start using it as told', 'langsung menjalankannya sesuai arahan'],
    ['read it all before I start', 'membacanya sampai habis sebelum mulai'],
  ],
  [
    ['I would rather work…', 'Saya lebih suka bekerja…'],
    ['where I can lead', 'di tempat saya bisa memimpin'],
    ['where I meet people', 'di tempat saya bertemu banyak orang'],
    ['where I know my role', 'di tempat peran saya sudah jelas'],
    ['where the standard is clear', 'di tempat standarnya jelas'],
  ],
  [
    ['A colleague is not pulling their weight. I…', 'Ada rekan kerja yang tidak mengerjakan bagiannya. Saya…'],
    ['tell them', 'menegurnya langsung'],
    ['joke them into it', 'mengingatkannya sambil bercanda'],
    ['cover for them', 'menutupi pekerjaannya'],
    ['raise it with the leader', 'menyampaikannya kepada atasan'],
  ],
  [
    ['I make decisions…', 'Saya mengambil keputusan…'],
    ['fast', 'dengan cepat'],
    ['with other people', 'bersama orang lain'],
    ['after some thought', 'setelah dipikirkan matang'],
    ['with the facts in front of me', 'berdasarkan data yang ada di depan saya'],
  ],
  [
    ['Praise means most to me when it is about…', 'Pujian paling berarti bagi saya kalau tentang…'],
    ['what I achieved', 'hasil yang saya capai'],
    ['how I was with people', 'cara saya bergaul dengan orang lain'],
    ['how reliable I am', 'seberapa bisa saya diandalkan'],
    ['how accurate my work is', 'ketelitian pekerjaan saya'],
  ],
  [
    ['I learn a new task best by…', 'Saya paling cepat menguasai tugas baru dengan…'],
    ['trying it', 'langsung mencobanya'],
    ['being shown by someone', 'diajari langsung oleh orang lain'],
    ['practising it repeatedly', 'melatihnya berulang-ulang'],
    ['reading the steps first', 'membaca langkah-langkahnya lebih dulu'],
  ],
  [
    ['My workstation is usually…', 'Area kerja saya biasanya…'],
    ['set up for speed', 'ditata supaya kerja bisa cepat'],
    ['where the conversation is', 'menjadi tempat orang mengobrol'],
    ['the same every day', 'sama setiap hari'],
    ['spotless and labelled', 'bersih dan diberi label'],
  ],
  [
    ['If the plan changes at the last minute I…', 'Kalau rencana berubah mendadak, saya…'],
    ['take over and re-plan', 'mengambil alih dan menyusun ulang rencananya'],
    ['rally the team', 'membangkitkan semangat tim'],
    ['adapt without a fuss', 'menyesuaikan diri tanpa banyak keluhan'],
    ['ask what this affects', 'menanyakan apa saja yang terpengaruh'],
  ],
  [
    ['I would describe my pace as…', 'Ritme kerja saya bisa digambarkan sebagai…'],
    ['fast', 'cepat'],
    ['lively', 'enerjik'],
    ['steady', 'stabil'],
    ['measured', 'terukur'],
  ],
  [
    ['In a meeting I…', 'Dalam rapat, saya…'],
    ['push for a decision', 'mendorong agar keputusan segera diambil'],
    ['do most of the talking', 'paling banyak bicara'],
    ['listen more than I speak', 'lebih banyak mendengarkan daripada bicara'],
    ['note what was agreed', 'mencatat apa yang disepakati'],
  ],
  [
    ['A rule I disagree with — I…', 'Kalau ada aturan yang tidak saya setujui, saya…'],
    ['challenge it', 'mempertanyakannya secara terbuka'],
    ['find the person who can change it', 'mencari orang yang bisa mengubahnya'],
    ['follow it anyway', 'tetap mengikutinya'],
    ['check what it is there for', 'mencari tahu tujuan aturan itu dibuat'],
  ],
  [
    ['I most dislike…', 'Hal yang paling tidak saya sukai adalah…'],
    ['being slowed down', 'dihambat saat sedang bekerja'],
    ['being ignored', 'diabaikan'],
    ['sudden change', 'perubahan mendadak'],
    ['sloppy work', 'pekerjaan yang asal-asalan'],
  ],
  [
    ['Given a free hour at work I would…', 'Kalau ada satu jam luang saat bekerja, saya akan…'],
    ['start something new', 'memulai sesuatu yang baru'],
    ['help out front', 'membantu di area depan'],
    ['tidy and restock', 'merapikan dan mengisi ulang stok'],
    ['double-check the records', 'memeriksa ulang catatan'],
  ],
]

export const DISC_QUESTIONS: readonly DiscQuestion[] = ITEMS.map(([prompt, d, i, s, c], index) => {
  const number = index + 1
  const ordered: { text: Bilingual; dimension: DiscDimension }[] = [
    { text: d, dimension: 'D' },
    { text: i, dimension: 'I' },
    { text: s, dimension: 'S' },
    { text: c, dimension: 'C' },
  ]
  // Rotate by the question number so 'A' is not always the D answer.
  const rotation = index % 4
  const rotated = [...ordered.slice(rotation), ...ordered.slice(0, rotation)]

  return {
    id: `DISC-${String(number).padStart(3, '0')}`,
    prompt: prompt[0],
    promptId: prompt[1],
    options: rotated.map((option, position) => ({
      id: ['A', 'B', 'C', 'D'][position],
      text: option.text[0],
      textId: option.text[1],
      dimension: option.dimension,
    })),
  }
})

export const DISC_STYLE_LABELS: Record<DiscDimension, string> = {
  D: 'Dominance',
  I: 'Influence',
  S: 'Steadiness',
  C: 'Conscientiousness',
}
