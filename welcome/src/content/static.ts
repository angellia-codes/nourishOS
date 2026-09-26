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

/**
 * Company Profile — replaced 2026-09-26 with Nourish Bali's real profile copy
 * (slogan, about us, vision, mission, brands, services, outlets and HR
 * contact), given directly in both languages rather than the generic
 * heading/body list every other static section uses. `Brand`/`ServiceItem`
 * each carry an optional `imageUrl` — empty today, since no photos exist yet;
 * `ImagePlaceholder` (ui.tsx) renders a placeholder box until one is set, the
 * same fallback `SectionPage.tsx`'s `OrgChart` already uses for `welcomeContent`.
 * Everything language-neutral (phone, email, address, map links, the
 * Instagram handle) is a plain string, not a `Pair` — there is nothing to
 * translate and inventing a translation would only risk getting it wrong.
 */
export interface CompanyProfileBrand {
  name: string
  body: Pair
  imageUrl?: string
}

export interface CompanyProfileService {
  name: Pair
  body: Pair
}

export interface CompanyProfileLocation {
  name: string
  mapUrl: string
}

export interface CompanyProfileContact {
  phone: string
  phoneContactName: string
  email: string
  address: string
  instagramHandle: string
}

export interface CompanyProfileContent {
  /** Empty today — set this once a hero photo exists (see this section's own header note). */
  heroImageUrl?: string
  slogan: Pair
  aboutUsHeading: Pair
  aboutUs: Pair
  visionHeading: Pair
  vision: Pair
  missionHeading: Pair
  mission: Pair
  brandsHeading: Pair
  brands: CompanyProfileBrand[]
  servicesHeading: Pair
  services: CompanyProfileService[]
  locationsHeading: Pair
  locationsIntro: Pair
  locations: CompanyProfileLocation[]
  contactHeading: Pair
  contact: CompanyProfileContact
}

export const COMPANY_PROFILE: CompanyProfileContent = {
  slogan: p('Lebih dari Sekadar Makanan, Ini Gaya Hidup', "More Than a Meal, It's a Lifestyle"),
  aboutUsHeading: p('Tentang Kami', 'About Us'),
  aboutUs: p(
    'Nourish Bali adalah tempat di mana kualitas, keberlanjutan, dan pengalaman bersantap Bali yang autentik menyatu untuk menciptakan gaya hidup sehat. Dengan menu yang beragam dan terinspirasi dari berbagai preferensi pola makan, mulai dari berbasis nabati hingga tinggi protein, Nourish menghadirkan hidangan yang lezat sekaligus menyehatkan. Berada di lingkungan yang tenang dan hangat, Nourish adalah tempat yang sempurna untuk bersantai, menikmati makanan sehat, dan merayakan momen-momen istimewa dalam hidup. Nourish bukan sekadar destinasi bersantap — ini adalah pengalaman yang menginspirasi kehidupan yang penuh kesadaran dan seimbang, selaras dengan alam.',
    "Nourish Bali is a place where quality, sustainability and an authentic Bali dining experience come together to create a healthy lifestyle. With a diverse menu inspired by various dietary preferences, from plant-based to high-protein options, Nourish offers dishes that are both delicious and nourishing. Set in a serene and welcoming environment, Nourish is the perfect spot to relax, enjoy healthy meals and celebrate special moments in life. Nourish is more than just a dining destination — it is an experience that inspires a mindful and balanced life, in harmony with nature.",
  ),
  visionHeading: p('Visi', 'Vision'),
  vision: p(
    'Menjadi destinasi bersantap sehat terdepan di Bali, yang dikenal karena menu inovatif, pelayanan luar biasa, serta komitmen terhadap kesejahteraan, keberlanjutan, dan budaya Bali yang penuh warna.',
    "To be the leading health-conscious dining destination in Bali, celebrated for innovative menus, exceptional service and a commitment to well-being, sustainability and the island's vibrant culture.",
  ),
  missionHeading: p('Misi', 'Mission'),
  mission: p(
    'Menghadirkan makanan yang utuh, lezat, dan menyehatkan yang menghubungkan orang-orang dengan cita rasa Bali yang kaya, mendukung gaya hidup sehat sembari menjunjung keberlanjutan dan kebersamaan.',
    'To provide wholesome, delicious and nourishing food that connects people with the vibrant flavors of Bali, supporting a healthy lifestyle while embracing sustainability and community.',
  ),
  brandsHeading: p('Merek dan Outlet Kami', 'Our Brands and Outlets'),
  brands: [
    {
      name: 'Nourish',
      body: p(
        'Kafe yang peduli kesehatan, didedikasikan untuk menyajikan hidangan organik kaya nutrisi yang dibuat dari bahan segar dan bersumber lokal. Dirancang untuk mereka yang mengutamakan kesehatan, Nourish menghadirkan menu seimbang berupa hidangan bergizi, smoothie superfood, dan pilihan berbasis nabati untuk menyehatkan tubuh dan pikiran.',
        'A health-conscious café dedicated to serving organic, nutrient-rich meals made from fresh, locally sourced ingredients. Designed for those who prioritize wellness, Nourish offers a balanced menu of wholesome dishes, superfood smoothies and plant-based options to nourish both body and mind.',
      ),
    },
    {
      name: 'The Bakery',
      body: p(
        'Berfokus pada roti, pastry, dan produk panggang buatan tangan dari bahan-bahan alami berkualitas tinggi. Dengan perpaduan teknik tradisional dan cita rasa modern, The Bakery menghadirkan suasana hangat dan ramah, tempat pelanggan dapat menikmati kelezatan yang baru keluar dari oven, mulai dari roti sourdough hingga croissant yang lembut.',
        'Specializing in handcrafted bread, pastries and baked goods made from high-quality, natural ingredients. With a focus on traditional techniques and modern flavors, The Bakery brings a warm, inviting atmosphere where customers can enjoy fresh-from-the-oven delights, from sourdough loaves to delicate croissants.',
      ),
    },
    {
      name: 'Wholefoods',
      body: p(
        'Tempat makan bergaya pasar yang mengutamakan bahan-bahan segar, alami, dan bersumber secara etis. Wholefoods menawarkan berbagai hidangan menyehatkan yang terinspirasi dari cita rasa global, dengan penekanan pada keberlanjutan dan praktik farm-to-table. Baik kamu mencari camilan sehat yang praktis maupun pilihan bahan pangan organik dan kebutuhan dapur pilihan, Wholefoods adalah destinasi untuk makan dengan penuh kesadaran.',
        "A market-style eatery that champions fresh, wholesome and ethically sourced ingredients. Wholefoods offers a variety of nourishing dishes inspired by global flavors, emphasizing sustainability and farm-to-table practices. Whether you're looking for a quick, healthy bite or a curated grocery selection of organic produce and pantry essentials, Wholefoods is a destination for mindful eating.",
      ),
    },
  ],
  servicesHeading: p('Layanan Kami', 'Our Services'),
  services: [
    {
      name: p('Bawa Pulang', 'Takeaway'),
      body: p(
        'Layanan bawa pulang kami cocok untuk pelanggan yang ingin menikmati hidangan lezat sambil beraktivitas. Cukup pesan, dan kami akan menyiapkannya dengan segar dan siap diambil. Baik untuk sarapan, makan siang, maupun makan malam, kami memastikan makananmu tetap hangat dan lezat.',
        'Our takeaway service is perfect for customers who want to enjoy delicious meals on the go. Simply place your order and we’ll have it freshly prepared and ready for pick-up. Whether it’s breakfast, lunch or dinner, we ensure your food stays warm and tasty.',
      ),
    },
    {
      name: p('Makan di Tempat', 'Dine-In'),
      body: p(
        'Kami menghadirkan pengalaman bersantap yang nyaman dan hangat. Dengan desain interior yang estetik dan pelayanan yang ramah, setiap kunjungan menjadi momen yang berkesan.',
        'We offer a cozy and welcoming dining experience. With aesthetic interior design and friendly service, every visit becomes a memorable moment.',
      ),
    },
  ],
  locationsHeading: p('Lokasi dan Lingkungan Kerja Kami', 'Our Location and Work Environments'),
  locationsIntro: p(
    'Tempat kerja yang hangat dengan fokus pada kolaborasi tim dan kepuasan pelanggan.',
    'A welcoming workplace with a focus on team collaboration and customer satisfaction.',
  ),
  locations: [
    { name: 'Nourish Ungasan', mapUrl: 'https://maps.app.goo.gl/xuHraFbNFu4TUfMb9' },
    { name: 'Nourish Uluwatu', mapUrl: 'https://maps.app.goo.gl/13do6r1CkeRGasEM9' },
    { name: 'Nourish Berawa', mapUrl: 'https://maps.app.goo.gl/UTyaSBCg9AU4K6Zu5' },
  ],
  contactHeading: p('Hubungi Kami', 'Contact Us'),
  contact: {
    phone: '+62 812-9310-1996',
    phoneContactName: 'Angellia Okta - Jr. HR Manager',
    email: 'hr@nourishbali.com',
    address: 'Jl. Raya Uluwatu Pecatu No. 250, Pecatu, Kec. Kuta Sel., Kab. Badung, Bali 80361',
    instagramHandle: '@nourishbali',
  },
}

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
