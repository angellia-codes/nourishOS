import type { Pair } from '../strings'

/**
 * Grooming Standard — replaced 2026-09-26 with the full bilingual spec
 * supplied for this pass (category → subcategory → leaf, plus a structurally
 * separate Position Standards list), split into its own file rather than
 * folded into `content/static.ts` because of sheer size: 11 positions × up to
 * 2 gender variants, plus ~20 Personal Grooming/Uniform & Accessories leaves,
 * each carrying several bilingual bullets. See `pages/GroomingSection.tsx`
 * for the renderer this feeds.
 *
 * One shape, `GroomingLeaf`, covers both "a subcategory's named variant" and
 * "a position's gender variant" — both are just an optional image placeholder
 * plus a bulleted, bilingual notes list. `name` is set only when a
 * subcategory/position has more than one variant (Hair's 11, Apron's 4,
 * Uniform Policy's 2); omitting it is how a single-leaf subcategory (Make-Up,
 * Nails, Facial Hair, Name Tag, Headgear) avoids a redundant duplicate
 * heading under its own subcategory heading.
 *
 * No `imageUrl` is set anywhere below — no real photos exist yet for any
 * category or position, the same situation Company Profile shipped with
 * initially. Every leaf with an image renders `ImagePlaceholder`'s dashed
 * placeholder box until HR supplies one.
 *
 * The English copy is transcribed verbatim from the supplied spec; the
 * Indonesian copy is the spec's own bilingual pairing (not a fresh
 * translation) — the spec was authored bilingual throughout.
 *
 * Content Rules — Policy Integrity Rule: substantive requirements are
 * preserved exactly, including where the source repeats near-identical text
 * across variants (all 4 Apron leaves share the same two bullets) — that
 * duplication is not collapsed, since doing so would be an edit to a
 * standard, not a data change.
 */

const p = (id: string, en: string): Pair => ({ id, en })

export interface GroomingLeaf {
  name?: Pair
  /** True wherever the source spec marks an `IMAGE: [...] EXAMPLE` placeholder
   *  (Name Tag, all 4 Apron variants, every position's gender variant) — kept
   *  separate from `imageUrl` because no real photos exist yet, so `imageUrl`
   *  is always unset and can't by itself say whether a leaf wants an image slot. */
  hasImage?: boolean
  imageUrl?: string
  notes: Pair[]
}

export interface GroomingSubcategory {
  id: string
  heading: Pair
  leaves: GroomingLeaf[]
}

export interface GroomingCategory {
  id: string
  heading: Pair
  icon: 'handshake' | 'sparkle' | 'shirt'
  subcategories: GroomingSubcategory[]
}

/**
 * Structurally separate from `GroomingCategory` — a flat list, each position
 * carrying one or two gender variants (never zero; some positions are
 * single-gender in the source, e.g. Bar/Kitchen Leader/Floor & Bar
 * Leader/Security are male-only and Floor & Cashier Leader is female-only).
 */
export interface GroomingPosition {
  id: string
  name: Pair
  male?: GroomingLeaf
  female?: GroomingLeaf
}

export interface GroomingContent {
  slogan: Pair
  definitionHeading: Pair
  definition: Pair
  categories: GroomingCategory[]
  positionsHeading: Pair
  positions: GroomingPosition[]
}

// Shared bullets repeated verbatim across all four Apron variants (§7.3 —
// the source repeats this text per variant rather than pointing at one copy).
const APRON_NOTES: Pair[] = [
  p(
    'Celemek harus bersih, rapi, disetrika, dan dikenakan dengan benar setiap saat.',
    'Aprons must be clean, neatly pressed, and properly worn at all times.',
  ),
  p(
    'Celemek harus menutupi bagian depan tubuh dan diikat dengan aman pada pinggang atau leher sesuai kebutuhan.',
    'The apron must cover the front body and be tied securely around the waist or neck as required.',
  ),
]

// Shared bullets repeated verbatim across the two same-content Hair variants
// (Waitress Women / Kitchen Women / Kitchen Bakery Women are identical in the source).
const HAIR_WOMEN_COVERED_NOTES: Pair[] = [
  p('Gunakan ballet bun yang rapi dengan hairnet.', 'Wear a neat ballet bun with a hairnet.'),
  p('Penggunaan hair cap dan topi wajib.', 'Wearing a hair cap and hat is mandatory.'),
  p(
    'Rambut panjang harus diikat sebelum menggunakan penutup rambut.',
    'Long hair should be tied before wearing the hair cover.',
  ),
  p('Tidak diperbolehkan ada rambut yang terurai.', 'No loose strands are allowed.'),
  p(
    'Ketentuan warna rambut natural berlaku apabila diwajibkan oleh kebijakan perusahaan.',
    'Natural hair color applies where required by company policy.',
  ),
]

export const GROOMING_CONTENT: GroomingContent = {
  slogan: p('Penampilan Mencerminkan Profesionalisme', 'Appearance Reflects Professionalism'),
  definitionHeading: p('Definisi', 'Definition'),
  definition: p(
    'Standar grooming adalah pedoman mengenai penampilan yang sesuai di tempat kerja, termasuk kebersihan diri dan pakaian atau perlengkapan grooming. Standar ini didasarkan pada beberapa unsur, termasuk kecerdasan, kebersihan, keselamatan, citra, dan individualitas rekan kerja.',
    'Grooming standards are guidelines for appropriate appearance in the workplace, including personal hygiene and grooming attire. They are based on several elements, including intelligence, cleanliness, safety, image, and the individuality of coworkers.',
  ),
  categories: [
    {
      id: 'restaurantAttitude',
      heading: p('Sikap di Restoran', 'Restaurant Attitude'),
      icon: 'handshake',
      subcategories: [
        {
          id: 'neatAppearance',
          heading: p('Penampilan Rapi', 'Neat Appearance'),
          leaves: [
            {
              notes: [
                p('Seragam harus bersih dan disetrika dengan rapi.', 'Uniform must be clean and ironed.'),
                p(
                  'Rambut harus rapi; rambut panjang harus diikat apabila diwajibkan.',
                  'Hair must be tidy; long hair must be tied back where required.',
                ),
                p('Kuku harus pendek dan bersih.', 'Nails must be short and clean.'),
                p('Hiasan kuku atau nail art tidak diperbolehkan.', 'Nail decorations or nail art are not permitted.'),
                p('Makeup harus natural dan tidak berlebihan.', 'Makeup should be natural and not excessive.'),
                p(
                  'Tindik telinga dan tato diperbolehkan, tetapi tidak boleh berlebihan.',
                  'Ear piercings and tattoos are permissible but should not be excessive.',
                ),
                p('Aksesori yang berlebihan tidak diperbolehkan.', 'Excessive accessories are not permitted.'),
                p(
                  'Segala jenis sandal tidak diperbolehkan selama bekerja.',
                  'Any type of sandal is not permitted while working.',
                ),
                p(
                  'Warna rambut harus natural apabila diwajibkan oleh kebijakan perusahaan.',
                  'Hair should remain natural in color where required by company policy.',
                ),
              ],
            },
          ],
        },
        {
          id: 'personalHygiene',
          heading: p('Kebersihan Pribadi', 'Personal Hygiene'),
          leaves: [
            {
              notes: [
                p('Mandi setiap hari dan gunakan deodorant.', 'Shower daily and use deodorant.'),
                p(
                  'Jaga napas tetap segar dan hindari bau badan.',
                  'Maintain fresh breath and avoid body odor.',
                ),
                p(
                  'Jaga kebersihan mulut serta pastikan mulut dan gigi tetap bersih.',
                  'Maintain oral hygiene and ensure the mouth and teeth are clean.',
                ),
                p(
                  'Kumis dan janggut tidak diperbolehkan pada posisi yang menetapkan larangan tersebut.',
                  'No mustache and beard where prohibited by the position standard.',
                ),
                p(
                  'Hindari lipstik yang terlalu terang atau makeup mata yang berlebihan.',
                  'Avoid bright lipstick or excessive eye makeup.',
                ),
                p('Merokok tidak diperbolehkan selama jam kerja.', 'Smoking is not permitted during working hours.'),
              ],
            },
          ],
        },
        {
          id: 'professionalAttitude',
          heading: p('Sikap Profesional', 'Professional Attitude'),
          leaves: [
            {
              notes: [
                p('Bersikap ramah, sopan, dan selalu tersenyum.', 'Be friendly, polite, and smile.'),
                p('Tidak menggunakan telepon seluler di area kerja.', 'Do not use phones in the work area.'),
                p(
                  'Jaga postur tubuh yang baik dan gunakan bahasa tubuh yang positif.',
                  'Maintain good posture and positive body language.',
                ),
              ],
            },
          ],
        },
        {
          id: 'serviceEthics',
          heading: p('Etika Pelayanan', 'Service Ethics'),
          leaves: [
            {
              notes: [
                p('Dengarkan tamu dan berikan solusi.', 'Listen to guests and offer solutions.'),
                p('Hindari perkataan kasar atau bergosip.', 'Avoid rude talk or gossip.'),
                p('Tunjukkan antusiasme dan rasa tanggung jawab.', 'Show enthusiasm and responsibility.'),
              ],
            },
          ],
        },
        {
          id: 'cleanlinessWhileServing',
          heading: p('Kebersihan Saat Melayani', 'Cleanliness While Serving'),
          leaves: [
            {
              notes: [
                p('Cuci tangan sebelum menangani makanan.', 'Wash hands before handling food.'),
                p('Gunakan sarung tangan apabila diwajibkan.', 'Wear gloves when required.'),
                p('Jangan menyentuh wajah atau rambut saat bekerja.', 'Do not touch the face or hair while working.'),
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'personalGrooming',
      heading: p('Grooming Pribadi', 'Personal Grooming'),
      icon: 'sparkle',
      subcategories: [
        {
          id: 'hair',
          heading: p('Rambut', 'Hair'),
          leaves: [
            {
              name: p('Perempuan — Umum', 'Women — General'),
              notes: [
                p(
                  'Rambut panjang harus diikat agar tidak mengganggu saat pelayanan.',
                  'Long hair must be tied back to avoid interference during service.',
                ),
                p(
                  'Gaya sederhana seperti low ponytail atau bun yang rapi direkomendasikan.',
                  'Simple styles such as a low ponytail or neat bun are recommended.',
                ),
                p(
                  'Jepit rambut sederhana dengan warna netral dapat digunakan.',
                  'Minimal, neutral-colored clips may be used.',
                ),
                p(
                  'Rambut pendek harus tetap terlihat bersih dan terawat.',
                  'Short hair should still appear clean and well-groomed.',
                ),
                p(
                  'Warna rambut harus tetap natural apabila diwajibkan oleh kebijakan perusahaan.',
                  'Hair color should remain natural where required by company policy.',
                ),
              ],
            },
            {
              name: p('Kasir Perempuan', 'Cashier Women'),
              notes: [
                p(
                  'Rambut dapat diwarnai, tetapi tidak dengan warna mencolok atau fashion color.',
                  'Hair may be colored, but not in striking colors or fashion colors.',
                ),
                p('Gunakan ballet bun yang rapi dengan hairnet.', 'Wear a neat ballet bun with a hairnet.'),
                p(
                  'Aksesori rambut yang mencolok atau dekoratif tidak diperbolehkan.',
                  'Flashy or decorative hair accessories are not allowed.',
                ),
                p('Rambut terurai tidak diperbolehkan selama bertugas.', 'Loose hair is not allowed while on duty.'),
                p(
                  'Rambut pendek harus selalu disisir dan rapi.',
                  'Short hair must be combed and tidy at all times.',
                ),
                p(
                  'Ketentuan warna rambut natural berlaku apabila diwajibkan oleh kebijakan perusahaan.',
                  'Natural hair color applies where required by company policy.',
                ),
              ],
            },
            { name: p('Waitress Perempuan', 'Waitress Women'), notes: HAIR_WOMEN_COVERED_NOTES },
            { name: p('Kitchen Perempuan', 'Kitchen Women'), notes: HAIR_WOMEN_COVERED_NOTES },
            {
              name: p('Hijab', 'Hijab'),
              notes: [
                p('Hijab harus bersih, polos, dan dikenakan dengan rapi.', 'Hijab must be clean, plain, and neatly worn.'),
                p(
                  'Hanya warna netral atau warna yang disetujui untuk seragam yang diperbolehkan.',
                  'Only neutral or uniform-approved colors are allowed.',
                ),
                p(
                  'Gaya hijab harus sederhana, aman, dan tidak mengganggu pekerjaan.',
                  'The style must be simple, secure, and must not interfere with work.',
                ),
                p(
                  'Ketentuan warna rambut natural berlaku apabila diwajibkan oleh kebijakan perusahaan.',
                  'Natural hair color applies where required by company policy.',
                ),
              ],
            },
            {
              name: p('Staf Office Perempuan', 'Office Staff Women'),
              notes: [
                p(
                  'Gaya rambut lebih fleksibel diperbolehkan, tetapi harus tetap rapi dan profesional.',
                  'More flexible hairstyles are allowed, but hair must remain neat and professional.',
                ),
                p(
                  'Rambut terurai diperbolehkan selama tidak mengganggu pekerjaan dan tetap terlihat formal.',
                  'Loose hair is acceptable if it does not interfere with work and still looks formal.',
                ),
                p(
                  'Aksesori kecil dan sederhana diperbolehkan selama tidak mencolok.',
                  'Small, simple accessories are allowed if they are not flashy.',
                ),
                p(
                  'Ketentuan warna rambut natural berlaku apabila diwajibkan oleh kebijakan perusahaan.',
                  'Natural hair color applies where required by company policy.',
                ),
              ],
            },
            { name: p('Kitchen Bakery Perempuan', 'Kitchen Bakery Women'), notes: HAIR_WOMEN_COVERED_NOTES },
            {
              name: p('Standar Umum (Pria)', 'Men — Common Standard'),
              notes: [
                p('Rambut harus dipotong rapi dan dijaga tetap pendek.', 'Hair must be cut neatly and kept short.'),
                p(
                  'Panjang rambut bagian belakang tidak boleh melebihi kerah kemeja.',
                  'The length at the back must not exceed the shirt collar.',
                ),
                p(
                  'Rambut harus bersih, rapi, dan ditata secara profesional.',
                  'Hair must be clean, neat, and professionally styled.',
                ),
                p('Gaya rambut mullet tidak diperbolehkan.', 'Mullet hairstyles are not permitted.'),
                p('Rambut wajah harus dirapikan atau dicukur bersih.', 'Facial hair must be well-trimmed or clean-shaven.'),
                p(
                  'Warna rambut harus natural; warna terang atau tidak umum tidak diperbolehkan.',
                  'Hair color must be natural; bright or unusual colors are not permitted.',
                ),
                p(
                  'Rambut tidak boleh terlihat berminyak; gunakan produk styling secukupnya.',
                  'Hair must not appear greasy; use styling products moderately.',
                ),
              ],
            },
            {
              name: p('Gaya Rambut yang Tidak Diperbolehkan (Pria)', 'Additional Prohibited Styles (Men)'),
              notes: [
                p(
                  'Gaya rambut yang mencolok atau terlalu menarik perhatian tidak diperbolehkan, termasuk:',
                  'Striking or attention-grabbing styles are not permitted, including:',
                ),
                p('Faux hawk', 'Faux hawk'),
                p('Mullet', 'Mullets'),
                p('Liberty spikes', 'Liberty spikes'),
                p(
                  'Rambut panjang dengan warna neon atau warna tidak natural',
                  'Long hair dyed in neon or unnatural colors',
                ),
                p('Pola yang dicukur pada rambut', 'Patterns shaved into hair'),
                p('Potongan yang sangat asimetris', 'Excessively asymmetrical cuts'),
                p('Mohawk', 'Mohawks'),
                p('Top knot', 'Top knots'),
                p('Undercut dengan desain', 'Undercuts with designs'),
                p('Extreme spikes', 'Extreme spikes'),
              ],
            },
            {
              name: p('Penutup Kepala — Pria', 'Headgear — Men'),
              notes: [
                p(
                  'Staf Floor, Bar, Kitchen, dan Security wajib menggunakan penutup kepala yang bersih dan sesuai selama jam kerja.',
                  'Floor, Bar, Kitchen, and Security staff are required to wear clean and proper headgear at all times during working hours.',
                ),
              ],
            },
            {
              name: p('Kitchen Bakery Pria', 'Kitchen Bakery Men'),
              notes: [
                p('Rambut harus dipotong rapi dan dijaga tetap pendek.', 'Hair must be cut neatly and kept short.'),
                p(
                  'Panjang rambut bagian belakang tidak boleh melebihi kerah kemeja.',
                  'The length at the back must not exceed the shirt collar.',
                ),
                p(
                  'Rambut harus bersih, rapi, dan ditata secara profesional.',
                  'Hair must be clean, neat, and professionally styled.',
                ),
                p('Penggunaan hair cap dan topi wajib.', 'Wearing a hair cap and hat is mandatory.'),
                p('Gaya rambut mullet tidak diperbolehkan.', 'Mullet hairstyles are not permitted.'),
                p('Rambut wajah harus dirapikan atau dicukur bersih.', 'Facial hair must be well-trimmed or clean-shaven.'),
                p(
                  'Warna rambut harus natural; warna terang atau tidak umum tidak diperbolehkan.',
                  'Hair color must be natural; bright or unusual colors are not permitted.',
                ),
                p(
                  'Rambut tidak boleh terlihat berminyak; gunakan produk styling secukupnya.',
                  'Hair must not appear greasy; use styling products moderately.',
                ),
              ],
            },
          ],
        },
        {
          id: 'makeUp',
          heading: p('Makeup', 'Make-Up'),
          leaves: [
            {
              notes: [
                p(
                  'Gunakan makeup natural dan hindari penggunaan yang berlebihan.',
                  'Use natural makeup and avoid excessive application.',
                ),
                p('Makeup berat atau dramatis tidak diperbolehkan.', 'Heavy or dramatic makeup is not allowed.'),
                p(
                  'Foundation, blush ringan, dan lipstik warna netral diperbolehkan.',
                  'Foundation, light blush, and neutral lipstick are acceptable.',
                ),
                p(
                  'Hindari glitter, warna terang, atau makeup mata yang terlalu bold.',
                  'Glitter, bright colors, or bold eye makeup should be avoided.',
                ),
                p(
                  'Pertahankan penampilan yang segar dan rapi sepanjang shift.',
                  'Maintain a fresh and neat appearance throughout the shift.',
                ),
              ],
            },
          ],
        },
        {
          id: 'nails',
          heading: p('Perawatan Kuku', 'Nail Grooming'),
          leaves: [
            {
              notes: [
                p(
                  'Kuku harus selalu bersih, dipotong rapi, dan pendek.',
                  'Nails must be clean, neatly trimmed, and short at all times.',
                ),
                p(
                  'Kuteks berwarna tidak diperbolehkan; hanya kuteks bening yang diperbolehkan.',
                  'No colored nail polish is allowed; clear polish only.',
                ),
                p(
                  'Kuku palsu dan nail art tidak diperbolehkan karena alasan kebersihan dan keselamatan.',
                  'Artificial nails and nail art are not allowed for hygiene and safety reasons.',
                ),
                p(
                  'Tangan dan kuku harus diperiksa secara berkala, terutama bagi food handler.',
                  'Hands and nails must be checked regularly, especially for food handlers.',
                ),
              ],
            },
          ],
        },
        {
          id: 'facialHair',
          heading: p('Rambut Wajah', 'Facial Hair'),
          leaves: [
            {
              notes: [
                p(
                  'Kumis dan janggut tidak diperbolehkan pada posisi yang menetapkan larangan tersebut.',
                  'No mustache and beard where the position-specific standard prohibits them.',
                ),
                p(
                  'Apabila diperbolehkan berdasarkan standar posisi, rambut wajah harus dirapikan dan tetap terlihat profesional.',
                  'Where permitted by a position standard, facial hair must be well-trimmed and professional.',
                ),
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'uniformAccessories',
      heading: p('Seragam & Aksesori', 'Uniform & Accessories'),
      icon: 'shirt',
      subcategories: [
        {
          id: 'nameTag',
          heading: p('Tanda Nama', 'Name Tag'),
          leaves: [
            {
              hasImage: true,
              notes: [
                p(
                  'Posisikan tanda nama sejajar dengan bagian atas dada, tidak terlalu rendah maupun terlalu tinggi.',
                  'Position the name tag parallel to the upper chest, not too low or too high.',
                ),
                p(
                  'Jangan menutupi logo seragam apabila seragam memiliki logo perusahaan.',
                  'Do not cover the uniform logo when the uniform has a company logo.',
                ),
                p('Pastikan tanda nama terpasang lurus dan tidak miring.', 'Make sure the name tag is straight and not tilted.'),
                p('Jaga tanda nama tetap bersih dan bebas noda.', 'Keep the name tag clean and stain-free.'),
                p(
                  'Jangan menggunakan tanda nama yang tergores atau pudar.',
                  'Do not use a name tag that is scratched or faded.',
                ),
                p(
                  'Tanda nama wajib digunakan selama jam kerja, terutama di area pelayanan tamu.',
                  'The name tag must be worn during working hours, especially in guest service areas.',
                ),
                p(
                  'Tanda nama harus bersih, tidak tergores, dan terpasang dengan benar di sisi kiri seragam setiap saat.',
                  'The name tag must be clean, unscratched, and properly worn at all times on the left side of the uniform.',
                ),
              ],
            },
          ],
        },
        {
          id: 'apron',
          heading: p('Apron', 'Apron'),
          leaves: [
            { name: p('Floor', 'Floor'), hasImage: true, notes: APRON_NOTES },
            { name: p('Kitchen', 'Kitchen'), hasImage: true, notes: APRON_NOTES },
            { name: p('Bar', 'Bar'), hasImage: true, notes: APRON_NOTES },
            { name: p('Kitchen Bakery', 'Kitchen Bakery'), hasImage: true, notes: APRON_NOTES },
          ],
        },
        {
          id: 'uniformPolicy',
          heading: p('Kebijakan Seragam & Tanda Nama', 'Uniform & Name Tag Policy'),
          leaves: [
            {
              name: p(
                'Kapan Mengajukan Penggantian Seragam kepada HR?',
                'When to Request a Uniform Change to HR?',
              ),
              notes: [
                p('Warna seragam memudar atau terdapat noda.', 'The color has faded or the uniform is stained.'),
                p('Terdapat sobekan atau kerusakan yang terlihat.', 'There are visible tears or damage.'),
              ],
            },
            {
              name: p('Penggantian Seragam & Tanda Nama', 'Uniform & Name Tag Replacement'),
              notes: [
                p(
                  'Karyawan dapat mengajukan penggantian apabila item mengalami kerusakan.',
                  'Employees may request a replacement if the item is damaged.',
                ),
                p(
                  'Apabila item hilang, karyawan wajib membayar biaya penggantian.',
                  'If the item is lost, the employee is required to pay the replacement cost.',
                ),
              ],
            },
          ],
        },
        {
          id: 'headgear',
          heading: p('Penutup Kepala', 'Headgear'),
          leaves: [
            {
              notes: [
                p(
                  'Staf Floor, Bar, Kitchen, dan Security wajib menggunakan penutup kepala yang bersih dan sesuai selama jam kerja.',
                  'Floor, Bar, Kitchen, and Security staff are required to wear clean and proper headgear at all times during working hours.',
                ),
                p(
                  'Posisi Kitchen dan Kitchen Bakery yang mewajibkan hair cap dan topi harus menggunakannya sesuai standar posisi masing-masing.',
                  'Kitchen and Kitchen Bakery positions requiring hair caps and hats must wear them as specified in their position standards.',
                ),
              ],
            },
          ],
        },
      ],
    },
  ],
  positionsHeading: p('Standar Posisi', 'Position Standards'),
  positions: [
    {
      id: 'floor',
      name: p('Floor', 'Floor'),
      male: {
        hasImage: true,
        notes: [
          p('Tidak diperbolehkan kumis dan janggut.', 'No mustache and beard.'),
          p('Kenakan T-shirt Nourish putih yang bersih dan rapi.', 'Wear a clean and neat white Nourish T-shirt.'),
          p(
            'Celana jeans panjang, celana chino, dan celana kain harus tetap dalam kondisi baik.',
            'Long jeans, chino trousers, and cloth trousers must remain intact.',
          ),
          p(
            'Celana harus berwarna solid tanpa motif; warna yang diperbolehkan antara lain hitam, cream, cokelat, dan denim.',
            'Trousers must be solid colors without patterns; acceptable colors include black, cream, brown, and denim.',
          ),
          p('Penggunaan tanda nama dan apron wajib.', 'Wearing a name tag and apron is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p(
            'Sneakers harus berwarna solid seperti hitam atau putih dan digunakan dengan kaus kaki.',
            'Sneakers must be solid colors such as black or white and must be worn with socks.',
          ),
        ],
      },
      female: {
        hasImage: true,
        notes: [
          p('Gunakan makeup natural dan hindari penggunaan yang berlebihan.', 'Use natural makeup and avoid excessive application.'),
          p('Makeup berat atau dramatis tidak diperbolehkan.', 'Heavy or dramatic makeup is not allowed.'),
          p('Kenakan T-shirt Nourish putih yang bersih dan rapi.', 'Wear a clean and neat white Nourish T-shirt.'),
          p(
            'Celana jeans panjang, celana chino, dan celana kain harus tetap dalam kondisi baik.',
            'Long jeans, chino trousers, and cloth trousers must remain intact.',
          ),
          p(
            'Celana harus berwarna solid tanpa motif; warna yang diperbolehkan antara lain hitam, cream, cokelat, dan denim.',
            'Trousers must be solid colors without patterns; acceptable colors include black, cream, brown, and denim.',
          ),
          p('Legging tidak boleh digunakan bersama celana tersebut.', 'Leggings must not be worn with these trousers.'),
          p('Penggunaan tanda nama dan apron wajib.', 'Wearing a name tag and apron is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p(
            'Sneakers harus berwarna solid seperti hitam atau putih dan digunakan dengan kaus kaki.',
            'Sneakers must be solid colors such as black or white and must be worn with socks.',
          ),
        ],
      },
    },
    {
      id: 'kitchen',
      name: p('Kitchen', 'Kitchen'),
      male: {
        hasImage: true,
        notes: [
          p('Penggunaan hair cap dan topi wajib.', 'Wearing a hair cap and hat is mandatory.'),
          p('Tidak diperbolehkan kumis dan janggut.', 'No mustache and beard.'),
          p('Kenakan T-shirt Nourish hijau yang bersih dan rapi.', 'Wear a clean and neat green Nourish T-shirt.'),
          p('Kenakan celana panjang katun hitam.', 'Wear black cotton long pants.'),
          p('Penggunaan apron wajib.', 'Wearing an apron is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p('Gunakan safety shoes khusus untuk pekerjaan di kitchen.', 'Use safety shoes specifically designed for the kitchen.'),
        ],
      },
      female: {
        hasImage: true,
        notes: [
          p('Penggunaan hair cap dan topi wajib.', 'Wearing a hair cap and hat is mandatory.'),
          p('Kenakan T-shirt Nourish hijau yang bersih dan rapi.', 'Wear a clean and neat green Nourish T-shirt.'),
          p('Kenakan celana panjang katun hitam.', 'Wear black cotton long pants.'),
          p('Penggunaan apron wajib.', 'Wearing an apron is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p('Gunakan safety shoes khusus untuk pekerjaan di kitchen.', 'Use safety shoes specifically designed for the kitchen.'),
        ],
      },
    },
    {
      id: 'bar',
      name: p('Bar', 'Bar'),
      male: {
        hasImage: true,
        notes: [
          p('Tidak diperbolehkan kumis dan janggut.', 'No mustache and beard.'),
          p('Kenakan T-shirt Nourish hijau yang bersih dan rapi.', 'Wear a clean and neat green Nourish T-shirt.'),
          p(
            'Celana jeans panjang, celana chino, dan celana kain harus tetap dalam kondisi baik.',
            'Long jeans, chino trousers, and cloth trousers must remain intact.',
          ),
          p(
            'Celana harus berwarna solid tanpa motif; warna yang diperbolehkan antara lain hitam, cream, cokelat, dan denim.',
            'Trousers must be solid colors without patterns; acceptable colors include black, cream, brown, and denim.',
          ),
          p('Penggunaan topi dan apron wajib.', 'Wearing a hat and apron is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p(
            'Sneakers harus berwarna solid seperti hitam atau putih dan digunakan dengan kaus kaki.',
            'Sneakers must be solid colors such as black or white and must be worn with socks.',
          ),
        ],
      },
    },
    {
      id: 'kitchenLeader',
      name: p('Kitchen Leader', 'Kitchen Leader'),
      male: {
        hasImage: true,
        notes: [
          p('Penggunaan hair cap dan topi wajib.', 'Wearing a hair cap and hat is mandatory.'),
          p('Tidak diperbolehkan kumis dan janggut.', 'No mustache and beard.'),
          p('Kenakan kemeja Nourish warna olive yang bersih dan rapi.', 'Wear a clean and neat olive Nourish shirt.'),
          p('Kenakan celana panjang katun hitam.', 'Wear black cotton long pants.'),
          p('Penggunaan apron wajib.', 'Wearing an apron is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p('Gunakan safety shoes khusus untuk pekerjaan di kitchen.', 'Use safety shoes specifically designed for the kitchen.'),
        ],
      },
    },
    {
      id: 'floorBarLeader',
      name: p('Floor & Bar Leader', 'Floor & Bar Leader'),
      male: {
        hasImage: true,
        notes: [
          p('Tidak diperbolehkan kumis dan janggut.', 'No mustache and beard.'),
          p('Kenakan kemeja Nourish warna olive yang bersih dan rapi.', 'Wear a clean and neat olive Nourish shirt.'),
          p(
            'Celana jeans panjang, celana chino, dan celana kain harus tetap dalam kondisi baik.',
            'Long jeans, chino trousers, and cloth trousers must remain intact.',
          ),
          p(
            'Celana harus berwarna solid tanpa motif; warna yang diperbolehkan antara lain hitam, cream, cokelat, dan denim.',
            'Trousers must be solid colors without patterns; acceptable colors include black, cream, brown, and denim.',
          ),
          p('Penggunaan tanda nama wajib.', 'Wearing a name tag is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p(
            'Sneakers harus berwarna solid seperti hitam atau putih dan digunakan dengan kaus kaki.',
            'Sneakers must be solid colors such as black or white and must be worn with socks.',
          ),
        ],
      },
    },
    {
      id: 'floorCashierLeader',
      name: p('Floor & Cashier Leader', 'Floor & Cashier Leader'),
      female: {
        hasImage: true,
        notes: [
          p('Gunakan makeup natural dan hindari penggunaan yang berlebihan.', 'Use natural makeup and avoid excessive application.'),
          p('Makeup berat atau dramatis tidak diperbolehkan.', 'Heavy or dramatic makeup is not allowed.'),
          p('Kenakan kemeja Nourish warna olive yang bersih dan rapi.', 'Wear a clean and neat olive Nourish shirt.'),
          p(
            'Celana jeans panjang, celana chino, dan celana kain harus tetap dalam kondisi baik.',
            'Long jeans, chino trousers, and cloth trousers must remain intact.',
          ),
          p(
            'Celana harus berwarna solid tanpa motif; warna yang diperbolehkan antara lain hitam, cream, cokelat, dan denim.',
            'Trousers must be solid colors without patterns; acceptable colors include black, cream, brown, and denim.',
          ),
          p('Legging tidak boleh digunakan bersama celana tersebut.', 'Leggings must not be worn with these trousers.'),
          p('Penggunaan tanda nama wajib.', 'Wearing a name tag is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p(
            'Sneakers harus berwarna solid seperti hitam atau putih dan digunakan dengan kaus kaki.',
            'Sneakers must be solid colors such as black or white and must be worn with socks.',
          ),
        ],
      },
    },
    {
      id: 'cashier',
      name: p('Kasir', 'Cashier'),
      male: {
        hasImage: true,
        notes: [
          p('Tidak diperbolehkan kumis dan janggut.', 'No mustache and beard.'),
          p('Kenakan T-shirt Nourish putih yang bersih dan rapi.', 'Wear a clean and neat white Nourish T-shirt.'),
          p(
            'Celana jeans panjang, celana chino, dan celana kain harus tetap dalam kondisi baik.',
            'Long jeans, chino trousers, and cloth trousers must remain intact.',
          ),
          p(
            'Celana harus berwarna solid tanpa motif; warna yang diperbolehkan antara lain hitam, cream, cokelat, dan denim.',
            'Trousers must be solid colors without patterns; acceptable colors include black, cream, brown, and denim.',
          ),
          p('Penggunaan tanda nama wajib.', 'Wearing a name tag is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p(
            'Sneakers harus berwarna solid seperti hitam atau putih dan digunakan dengan kaus kaki.',
            'Sneakers must be solid colors such as black or white and must be worn with socks.',
          ),
        ],
      },
      female: {
        hasImage: true,
        notes: [
          p('Gunakan makeup natural dan hindari penggunaan yang berlebihan.', 'Use natural makeup and avoid excessive application.'),
          p('Makeup berat atau dramatis tidak diperbolehkan.', 'Heavy or dramatic makeup is not allowed.'),
          p('Kenakan T-shirt Nourish putih yang bersih dan rapi.', 'Wear a clean and neat white Nourish T-shirt.'),
          p(
            'Celana jeans panjang, celana chino, dan celana kain harus tetap dalam kondisi baik.',
            'Long jeans, chino trousers, and cloth trousers must remain intact.',
          ),
          p(
            'Celana harus berwarna solid tanpa motif; warna yang diperbolehkan antara lain hitam, cream, cokelat, dan denim.',
            'Trousers must be solid colors without patterns; acceptable colors include black, cream, brown, and denim.',
          ),
          p('Legging tidak boleh digunakan bersama celana tersebut.', 'Leggings must not be worn with these trousers.'),
          p('Penggunaan tanda nama wajib.', 'Wearing a name tag is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p(
            'Sneakers harus berwarna solid seperti hitam atau putih dan digunakan dengan kaus kaki.',
            'Sneakers must be solid colors such as black or white and must be worn with socks.',
          ),
        ],
      },
    },
    {
      id: 'security',
      name: p('Security', 'Security'),
      male: {
        hasImage: true,
        notes: [
          p('Penggunaan topi wajib.', 'Wearing a hat is mandatory.'),
          p('Tidak diperbolehkan kumis dan janggut.', 'No mustache and beard.'),
          p(
            'Kenakan T-shirt Nourish lengan panjang warna abu-abu yang bersih dan rapi.',
            'Wear a clean and neat grey long-sleeve Nourish T-shirt.',
          ),
          p('Kenakan celana panjang kain hitam.', 'Wear black cloth long pants.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p(
            'Sneakers harus berwarna solid seperti hitam atau putih dan digunakan dengan kaus kaki, atau dapat menggunakan safety shoes khusus untuk security.',
            'Sneakers must be solid colors such as black or white and must be worn with socks, or safety shoes specifically designed for security may be used.',
          ),
        ],
      },
    },
    {
      id: 'backOffice',
      name: p('Back Office', 'Back Office'),
      female: {
        hasImage: true,
        notes: [
          p('Gunakan makeup natural dan hindari penggunaan yang berlebihan.', 'Use natural makeup and avoid excessive application.'),
          p('Makeup berat atau dramatis tidak diperbolehkan.', 'Heavy or dramatic makeup is not allowed.'),
          p('Kenakan kemeja/T-shirt yang bersih dan rapi.', 'Wear a clean and neat shirt/T-shirt.'),
          p(
            'Celana jeans panjang, celana chino, dan celana kain dalam gaya smart casual diperbolehkan.',
            'Smart casual long jeans, chino trousers, and cloth trousers are permitted.',
          ),
          p(
            'Celana harus berwarna solid tanpa motif; warna yang diperbolehkan antara lain hitam, cream, cokelat, dan denim.',
            'Trousers must be solid colors without patterns; acceptable colors include black, cream, brown, and denim.',
          ),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p(
            'Sneakers harus berwarna solid seperti hitam atau putih dan digunakan dengan kaus kaki.',
            'Sneakers must be solid colors such as black or white and must be worn with socks.',
          ),
        ],
      },
      male: {
        hasImage: true,
        notes: [
          p('Tidak diperbolehkan kumis dan janggut.', 'No mustache and beard.'),
          p('Kenakan kemeja/T-shirt yang bersih dan rapi.', 'Wear a clean and neat shirt/T-shirt.'),
          p(
            'Celana jeans panjang, celana chino, dan celana kain dalam gaya smart casual diperbolehkan.',
            'Smart casual long jeans, chino trousers, and cloth trousers are permitted.',
          ),
          p(
            'Celana harus berwarna solid tanpa motif; warna yang diperbolehkan antara lain hitam, cream, cokelat, dan denim.',
            'Trousers must be solid colors without patterns; acceptable colors include black, cream, brown, and denim.',
          ),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p(
            'Sneakers harus berwarna solid seperti hitam atau putih dan digunakan dengan kaus kaki.',
            'Sneakers must be solid colors such as black or white and must be worn with socks.',
          ),
        ],
      },
    },
    {
      id: 'kitchenBakery',
      name: p('Kitchen Bakery', 'Kitchen Bakery'),
      female: {
        hasImage: true,
        notes: [
          p('Penggunaan hair cap dan topi wajib.', 'Wearing a hair cap and hat is mandatory.'),
          p('Kenakan T-shirt The Bakery putih yang bersih dan rapi.', 'Wear a clean and neat white The Bakery T-shirt.'),
          p('Kenakan celana panjang katun hitam.', 'Wear black cotton long pants.'),
          p('Penggunaan apron wajib.', 'Wearing an apron is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p('Gunakan safety shoes khusus untuk pekerjaan di kitchen.', 'Use safety shoes specifically designed for the kitchen.'),
        ],
      },
      male: {
        hasImage: true,
        notes: [
          p('Penggunaan hair cap dan topi wajib.', 'Wearing a hair cap and hat is mandatory.'),
          p('Tidak diperbolehkan kumis dan janggut.', 'No mustache and beard.'),
          p('Kenakan T-shirt The Bakery putih yang bersih dan rapi.', 'Wear a clean and neat white The Bakery T-shirt.'),
          p('Kenakan celana panjang katun hitam.', 'Wear black cotton long pants.'),
          p('Penggunaan apron wajib.', 'Wearing an apron is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p('Gunakan safety shoes khusus untuk pekerjaan di kitchen.', 'Wear safety shoes specifically designed for the kitchen.'),
        ],
      },
    },
    {
      id: 'leaderKitchenBakery',
      name: p('Leader Kitchen Bakery', 'Leader Kitchen Bakery'),
      female: {
        hasImage: true,
        notes: [
          p('Penggunaan hair cap dan topi wajib.', 'Wearing a hair cap and hat is mandatory.'),
          p('Kenakan kemeja The Bakery putih yang bersih dan rapi.', 'Wear a clean and neat white The Bakery shirt.'),
          p('Kenakan celana panjang katun hitam.', 'Wear black cotton long pants.'),
          p('Penggunaan apron wajib.', 'Wearing an apron is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p('Gunakan safety shoes khusus untuk pekerjaan di kitchen.', 'Use safety shoes specifically designed for the kitchen.'),
        ],
      },
      male: {
        hasImage: true,
        notes: [
          p('Penggunaan hair cap dan topi wajib.', 'Wearing a hair cap and hat is mandatory.'),
          p('Tidak diperbolehkan kumis dan janggut.', 'No mustache and beard.'),
          p('Kenakan kemeja The Bakery putih yang bersih dan rapi.', 'Wear a clean and neat white The Bakery shirt.'),
          p('Kenakan celana panjang katun hitam.', 'Wear black cotton long pants.'),
          p('Penggunaan apron wajib.', 'Wearing an apron is mandatory.'),
          p(
            'Aksesori pada tangan dan jari diperbolehkan, termasuk cincin pernikahan, cincin tunangan, dan jam tangan.',
            'Accessories may be worn on the hands and fingers, including wedding rings, engagement rings, and watches.',
          ),
          p('Hiasan rantai/dompet serta slayer/bandana dilarang.', 'Chain/wallet decorations and slayer/bandanas are prohibited.'),
          p('Gunakan safety shoes khusus untuk pekerjaan di kitchen.', 'Wear safety shoes specifically designed for the kitchen.'),
        ],
      },
    },
  ],
}
