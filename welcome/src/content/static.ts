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
  heroImageUrl: '/hero-nourish.png',
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
      imageUrl: '/brand-nourish.png',
      body: p(
        'Kafe yang peduli kesehatan, didedikasikan untuk menyajikan hidangan organik kaya nutrisi yang dibuat dari bahan segar dan bersumber lokal. Dirancang untuk mereka yang mengutamakan kesehatan, Nourish menghadirkan menu seimbang berupa hidangan bergizi, smoothie superfood, dan pilihan berbasis nabati untuk menyehatkan tubuh dan pikiran.',
        'A health-conscious café dedicated to serving organic, nutrient-rich meals made from fresh, locally sourced ingredients. Designed for those who prioritize wellness, Nourish offers a balanced menu of wholesome dishes, superfood smoothies and plant-based options to nourish both body and mind.',
      ),
    },
    {
      name: 'The Bakery',
      imageUrl: '/brand-the-bakery.png',
      body: p(
        'Berfokus pada roti, pastry, dan produk panggang buatan tangan dari bahan-bahan alami berkualitas tinggi. Dengan perpaduan teknik tradisional dan cita rasa modern, The Bakery menghadirkan suasana hangat dan ramah, tempat pelanggan dapat menikmati kelezatan yang baru keluar dari oven, mulai dari roti sourdough hingga croissant yang lembut.',
        'Specializing in handcrafted bread, pastries and baked goods made from high-quality, natural ingredients. With a focus on traditional techniques and modern flavors, The Bakery brings a warm, inviting atmosphere where customers can enjoy fresh-from-the-oven delights, from sourdough loaves to delicate croissants.',
      ),
    },
    {
      name: 'Wholefoods',
      imageUrl: '/brand-wholefoods.png',
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

/**
 * Core Values — replaced 2026-09-26 with Nourish Bali's real INSPIRE values
 * copy, given directly (slogan plus a short line per letter). Restructured
 * from a flat `StaticBlock[]` into its own `CoreValuesContent` (a kicker, the
 * "INSPIRE" hero word, the slogan, and one `CoreValueItem` per letter) so
 * `SectionPage.tsx` can render the hero and each value's icon distinctly,
 * the same reasoning `CompanyProfileContent` replaced its own `StaticBlock[]`
 * for. `icon` is a name, not JSX — this file stays free of React so the
 * icon/name map lives in `SectionPage.tsx` next to the icons themselves.
 * Descriptions are translated to Indonesian as a first pass needing an
 * owner read-through, the same standing caveat this file's header carries.
 * **Deliberately reverses the previous copy's P value** — it read "Passion"
 * before; the given copy replaces it with "Professionalism".
 */
export interface CoreValueItem {
  letter: string
  word: Pair
  body: Pair
  icon: 'shield' | 'heart' | 'sparkle' | 'badge' | 'bulb' | 'handshake' | 'medal'
}

export interface CoreValuesContent {
  kicker: Pair
  hero: string
  slogan: Pair
  sloganNote: Pair
  values: CoreValueItem[]
}

export const CORE_VALUES: CoreValuesContent = {
  kicker: p('Nilai Inti', 'Core Value'),
  hero: 'INSPIRE',
  slogan: p('Menginspirasi dengan Tujuan, Menyehatkan dengan Kepedulian', 'Inspire with Purpose, Nourish with Care'),
  sloganNote: p(
    '(Seimbang antara pemenuhan profesional dan emosional)',
    '(Balanced between professional and emotional fulfillment)',
  ),
  values: [
    {
      letter: 'I',
      word: p('INTEGRITAS', 'INTEGRITY'),
      body: p(
        'Selalu bertindak jujur dan etis dalam setiap interaksi.',
        'Always act honestly and ethically in every interaction.',
      ),
      icon: 'shield',
    },
    {
      letter: 'N',
      word: p('NURTURE', 'NURTURE'),
      body: p(
        'Membangun kepercayaan dan hubungan jangka panjang dengan pelanggan.',
        'Build trust and long-term relationships with customers.',
      ),
      icon: 'heart',
    },
    {
      letter: 'S',
      word: p('SERVICE', 'SERVICE'),
      body: p(
        'Mengutamakan kepuasan pelanggan dan berupaya lebih untuk memenuhi kebutuhan mereka.',
        'Prioritize customer satisfaction and go above and beyond to meet their needs.',
      ),
      icon: 'sparkle',
    },
    {
      letter: 'P',
      word: p('PROFESIONALISME', 'PROFESSIONALISM'),
      body: p(
        'Menjaga standar tinggi dalam sikap, penampilan, dan komunikasi.',
        'Maintain high standards in conduct, appearance and communication.',
      ),
      icon: 'badge',
    },
    {
      letter: 'I',
      word: p('INOVASI', 'INNOVATION'),
      body: p(
        'Merangkul kreativitas dan beradaptasi untuk memberikan solusi yang unik.',
        'Embrace creativity and adapt to provide unique solutions.',
      ),
      icon: 'bulb',
    },
    {
      letter: 'R',
      word: p('RESPECT', 'RESPECT'),
      body: p(
        'Menghargai sudut pandang, waktu, dan kebutuhan pelanggan serta rekan kerja.',
        'Value the perspectives, time and needs of customers and colleagues.',
      ),
      icon: 'handshake',
    },
    {
      letter: 'E',
      word: p('EXCELLENCE', 'EXCELLENCE'),
      body: p(
        'Berusaha mencapai kinerja luar biasa dan perbaikan berkelanjutan.',
        'Strive for exceptional performance and continuous improvement.',
      ),
      icon: 'medal',
    },
  ],
}

/**
 * Grooming Standard moved to its own `content/grooming.ts` + `pages/GroomingSection.tsx`
 * on 2026-09-26, replacing this flat `StaticBlock[]` with the full bilingual
 * category/subcategory/position hierarchy from the supplied Grooming Standard
 * spec — see `content/grooming.ts`'s own header for why it's a separate file.
 */
