# NourishOS: Nourish's Bible Design Guide

Version: 1.0
Status: Draft for Angel's review
Date: 2026-11-02
Repo path: `docs/modules/nourish-bible-design-guide.md`
Companion: `docs/modules/nourish-bible.md`
Reference: "Nourish's Bible Flip Book" design canvas (desktop and phone), Welcome Card

---

## 1. Direction

The Bible feels like opening a real company book. It borrows the Welcome Card's materials: kraft paper, pandan seal, amber foil, dashed ticket lines and mono labels.

It is still a working tool. A cook mid-rush must reach a recipe faster than they could find a paper binder, so motion serves orientation and never makes anyone wait twice.

### 1.1 Basalt exception

Basalt bans gradients, a second brand colour and page-load motion. This exception applies only to the reader at `/documents/bible`, the same way the Welcome Portal has its own.

| Basalt rule | Reader exception |
|---|---|
| No gradients | Stage background and kraft cover use gradients |
| One brand colour | Amber and kraft join Pandan |
| Cool paper canvas | Book pages use warm paper |
| No page-load motion | Cover opens once per day, and page turns are allowed |
| Tokens only | Holds. All values are `--bible-*` tokens |

Still in force everywhere: Archivo and IBM Plex Mono, tabular figures, WCAG AA contrast, `prefers-reduced-motion`, bilingual labels, and status never shown by colour alone.

Editor, upload and approval screens are normal Basalt screens with `StatusPill` and `AuditTimeline`. `AuditTimeline` is not built yet, so Phase 2 must build it. The exception does not reach these screens.

Record this in the Basalt change log as the next version, scoped to this route.

---

## 2. Tokens

Define these on the reader root only.

```css
.bible-root {
  --bible-pandan: #0E4F47;
  --bible-teal: #0B332F;
  --bible-teal-deep: #082420;
  --bible-amber: #FFC98A;
  --bible-amber-dim: #E0A968;
  --bible-olive: #3A4A22;
  --bible-kraft-light: #E2B87F;
  --bible-kraft: #C79A5E;
  --bible-kraft-dark: #B7864A;
  --bible-paper: #F4EFE4;
  --bible-paper-edge: #CFC5B2;
  --bible-ink: #14201D;
  --bible-ink-soft: #47524E;
  --bible-ink-muted: #5A6661;
  --bible-placeholder: #8A5A1E;
  --bible-cream-soft: rgba(244, 239, 228, 0.72);
  --bible-line: rgba(20, 32, 29, 0.2);
  --bible-glass-line: rgba(255, 255, 255, 0.16);
}
```

| Use | Value |
|---|---|
| Stage | Two soft radial glows over `160deg` Pandan → teal → deep teal, as in the Welcome Card |
| Kraft cover | `155deg` kraft light → kraft → kraft dark |
| Page text | `--bible-ink` on `--bible-paper` |
| Muted text | `--bible-ink-muted` on paper, 5.2:1 |
| Accent text on paper | `--bible-placeholder`, 5.1:1 |
| Text on kraft | `--bible-teal-deep`. Do not use lighter text |
| Active tab | `--bible-amber` with `--bible-ink` text |

The stage stays dark in light and Night Pass modes. Book pages stay paper in both, so a recipe reads the same on every device.

Do not use `--bible-amber` as text on paper. It fails contrast.

---

## 3. Typography

| Element | Face | Size and weight |
|---|---|---|
| Cover title | Archivo | 46px, 800 |
| Title page headline | Archivo | 34px, 700 |
| Chapter numeral | Archivo | 168px, 800 |
| Chapter title | Archivo | 36px, 700 |
| Page heading | Archivo | 25px, 700 |
| Dish description | Archivo | 13.5px minimum desktop, 14px phone |
| Row label | Archivo | 13.5 to 14.5px, 600 to 700 |
| Running head, page number, prices, codes | IBM Plex Mono | 11 to 13px, 600 |
| Search input | Archivo | 16px minimum |

Use `.tabular` on all prices and quantities. Long Indonesian headings wrap. Do not truncate them.

---

## 4. Layout

### 4.1 Immersive reader

The reader hides the app sidebar and header, because the open book needs its width. It stays inside the auth guard. The top-left book icon closes the book, then returns to the Documents hub.

### 4.2 Desktop, 1280px and wider

```text
┌───────────────────────────────────────────────────────────┐
│ [Book]  NOURISH / Nourish's Bible       [Contents] [EN|ID]│ 64
├───────────────────────────────────────────────────────────┤
│    3. F&B Product  (A)(B)(C)  |  Menu Picture Recipe ...  │ 56
├───────────────────────────────────────────────────────────┤
│  [Tab 01]  ┌──────────────┬──────────────┐  [Tab 04]      │
│  [Tab 02]  │  Left page   │  Right page  │                │
│  [Tab 03]  │  420 × 572   │  420 × 572   │                │
│            └──────────────┴──────────────┘                │
├───────────────────────────────────────────────────────────┤
│                      (<)  32–33 / 43  (>)                 │ 68
└───────────────────────────────────────────────────────────┘
```

Chapter tabs stick out of the book's edge and sit behind the pages. A chapter's tab moves to the left edge once the reader reaches it, like a real thumb index.

### 4.3 Tablet and small laptop, 640 to 1279px

Use the phone's tab rows. At 1024px and wider, keep the two-page spread. Below 1024px, show one page.

### 4.4 Phone, below 640px

```text
┌──────────────────────────┐
│ [Book] Nourish's Bible [≡][EN|ID] │ 52
│ General Service Product Wholefood │ 52 chapter tabs
│ (A. Floor) (B. Cashier)  │ 48 scrolls sideways
│ Menu  Sequence  SOP      │ 48 scrolls sideways
│ ┌──────────────────────┐ │
│ │ One page, 350 × 548  │ │
│ └──────────────────────┘ │
│     (<) 12 / 43 (>)      │ 64
└──────────────────────────┘
```

Swiping left or right past 48px turns the page.

### 4.5 Page sizing

Pages keep a 0.734 width-to-height ratio.

```css
--page-h: min(572px, calc(100dvh - 188px));  /* desktop */
--page-h: min(548px, calc(100dvh - 296px));  /* phone */
```

On short screens, page bodies scroll inside the page. The book never overflows the screen.

### 4.6 Touch targets

Production uses Basalt's 48px minimum everywhere, with 8px between adjacent targets. The mockup uses 44px in places, so follow this guide rather than the mockup.

---

## 5. Pages

### 5.1 Anatomy

Every working page has a running head in mono, a heading, a body that scrolls if needed, and a dashed footer with NOURISH and the page number. A soft shadow falls into the spine side.

### 5.2 Templates

| Template | Contents |
|---|---|
| Cover | Kraft, dashed frame, NOURISH, title, subtitle, pandan seal, company name |
| Endpaper | Kraft, version and approval date |
| Title | Pandan page with the glass ticket card from the Welcome Card: notches, dashed perforation, headline, version chip, footer stub |
| Contents | Chapter and section rows with page numbers, each jumps to its page |
| Chapter opener | Pandan page, amber numeral, chapter title |
| In this chapter | Section rows that jump |
| Grooming | Uniform photo, then standard rows |
| Company Forms | Form rows with category, each opens Drive |
| Menu | Search button, Food and Beverage switch, two-column category grid with item counts |
| Category | Heading, search icon, group switch, serving hours, category bar, dish rows |
| Dish | Back link to category, photo, description, price, tag chips, tax note |
| Service Notes | Dish name, allergen notice, four note rows |
| Sequence of Service | Numbered steps |
| Recipe | Dish name, portion, yield and shelf-life chips, ingredient table |
| Production Procedure | Dish name, numbered steps with time and temperature |
| SOP | Code range, section rows, each opens its SOP Library entry |
| Coming soon | Short message, no fake content |
| Locked | Lock icon and the owning team's name |
| Back cover | Kraft, NOURISH, "Open from the start" |

### 5.3 Spread pairing

Desktop spreads are fixed so related pages sit together.

| Section | Spread 1 | Spread 2 | Spread 3 |
|---|---|---|---|
| Floor, Cashier | Menu + Category | Dish + Service Notes | Sequence of Service + SOP |
| Kitchen, Bar, Bakery | Menu + Category | Picture + Recipe | Procedure + SOP |

Phone shows the same pages in that order, one at a time.

### 5.4 Fixed book, live pages

The Category, Dish, Recipe and Procedure pages are slots. Choosing a category or dish changes what the slot shows, then flips to it if needed. The book does not hold one physical page per dish. Page numbers therefore stay stable as the menu changes.

---

## 6. Navigation

| Level | Desktop | Phone |
|---|---|---|
| Chapter | Edge tabs | Four tabs in a row |
| Section | Pills above the book | Pills, scroll sideways |
| Page type | Underlined text tabs | Underlined text tabs, scroll sideways |
| Contents | Panel slides from the left | Same |
| Next and previous | Round buttons and counter | Same, plus swipe |
| Category | Grid on Menu, bar on Category | Same |
| Search menu | Panel slides from the right | Full-width panel |

Rules:

- The current chapter, section and page type always show as active.
- Choosing a category keeps it visible in the category bar, scrolling the bar if needed.
- A section with no sub-sections shows the chapter name in the section row on phone.
- Hidden pages are also unreachable by keyboard.
- Menu-only staff do not see the Sequence of Service and SOP tabs.

### 6.1 Search panel

- Opens with the input focused.
- Shows the section it is searching in amber mono.
- Results show dish name, category and price. Choosing one closes the panel and flips to the dish.
- Empty result: "Nothing matches that search."

---

## 7. Motion

### 7.1 Opening

| Step | Start | Duration | Detail |
|---|---|---|---|
| Seal shrinks and fades | 0ms | 300ms | Scale 1 to 0 |
| Cover swings open | 200ms | 500ms | Around the spine |
| Book slides to centre | 0ms | 440ms | Half a page width |
| Left board appears | 260ms | 260ms | Fade |
| Title words rise | 460ms, then +90ms per word | 500ms | 10px rise and fade |
| Version chip fades in | 720ms | 450ms | |
| Note and footer fade in | 840ms | 450ms | |

### 7.2 Page turn

| Property | Value |
|---|---|
| Duration | 400ms |
| Easing | `cubic-bezier(.45,.05,.3,1)` |
| Perspective | 2200px desktop, 1500px phone |
| Spread | Leaf rotates 0 to -180° around the spine |
| Phone | Page rotates to -112° and fades in the last third |
| Shading | Moving pages darken up to 14%, clearing within 180ms of landing |

### 7.3 Long jumps

Clicking a far tab riffles the pages. Stagger is at most 55ms per leaf, capped at 420ms in total. Production flips at most six blank leaves plus the real target page, so a 20-page jump costs the same as a short one.

### 7.4 When it plays

| Moment | Behaviour |
|---|---|
| First open of the day | Full opening |
| Later opens that day | Skip the cover and open on the last page read |
| Deep link from a notification | Skip the cover and open on that page |
| Closing with the book icon | Returns to Documents, with no closing animation |
| Reduced motion | 200ms fade, no rotation or word reveal |

Store these on the device, inside `try/catch`:

```text
bible.lastOpenedDate   date in Asia/Makassar
bible.lastPageKey      page key, not a page number
```

If storage fails or the key no longer exists, open at the title page without error.

### 7.5 Performance

- Animate `transform` and `opacity` only.
- Render the current spread, its neighbours and pages in flight. Do not mount all pages as the mockup does.
- Each page uses its own `perspective()` transform and fixed `z-index`, without `preserve-3d`.
- Apply `will-change` only during a flip.
- Do not use `backdrop-filter` on pages. Use solid dark fills in panels.
- Load the reader as a separate route chunk, with fonts already in the app.
- Serve photos at no more than 1200px wide, lazy-loaded one spread ahead.

---

## 8. States

| State | Display |
|---|---|
| Loading book | Closed cover with a quiet skeleton, no spinner over the whole screen |
| Loading recipe | Page skeleton inside the Recipe page |
| No signal | Message and Retry button on the stage |
| No edition yet | "Not published yet" |
| Locked recipe | Locked template, naming the team |
| Recipe not added | Coming soon template |
| SOP without link | Row reads "Not available yet", not tappable |
| Search with no match | One line, no illustration |
| Photo missing | Dashed paper placeholder with the dish name |

Copy:

| Key | English | Indonesian |
|---|---|---|
| Open hint | Tap the book to open it | Ketuk buku untuk membukanya |
| Search | Search menu | Cari menu |
| Search hint | Dish, drink or ingredient | Menu, minuman, atau bahan |
| No results | Nothing matches that search. | Tidak ada yang cocok. |
| Coming soon | Coming soon | Segera hadir |
| Locked | This recipe is for the {team} team. | Resep ini untuk tim {team}. |
| Retry | Try again | Coba lagi |
| No signal | No connection. Check your signal and try again. | Tidak ada koneksi. Cek sinyal lalu coba lagi. |
| Tax note | Excludes 10% government tax + 6% service charge. | Belum termasuk pajak 10% dan service charge 6%. |

Dish names and descriptions stay as printed in both languages.

---

## 9. Accessibility

- All tabs, rows and page controls are real buttons or links.
- After a page turn, move focus to the new page's heading and announce the page number through a polite live region.
- Left and Right arrow keys turn pages when focus is in the book. No global key handler.
- Icon-only buttons have `aria-label`.
- Contents and Search close with Escape and return focus to the button that opened them.
- Active tabs use `aria-pressed` or `aria-current`, and shape as well as colour.
- Cover and back cover are single buttons with clear labels.
- Non-current pages are removed from the accessibility tree.

---

## 10. Components

```text
src/features/documents/bible/
  BibleReaderPage.tsx
  book/
    Book.tsx              page turn, spread and phone layouts
    useBookNavigation.ts  position, jumps, last page, daily cover
    pages/                one component per §5.2 template
  nav/
    EdgeTabs.tsx
    SectionTabs.tsx
    PageTabs.tsx
    ContentsPanel.tsx
  menu/
    CategoryBar.tsx
    SearchPanel.tsx
    useMenuSearch.ts
  services/
    bibleService.ts       all reads and callables
  editor/                 Phase 2, Basalt screens
  styles/bible.css        tokens and book rules
```

Business logic stays in Cloud Functions. Components reach data only through `bibleService.ts`.

---

## 11. Mockup differences

| Mockup | Production |
|---|---|
| 44px controls in places | 48px minimum |
| All pages mounted | Only near pages mounted |
| Fixed-size artboards | Sizes follow §4.5 |
| Placeholder Grooming, Sequence, Forms, SOP links | Real content |
| Cover plays every time | Once per day |
| No locked or menu-only states | §8 and §6 |
| Recipe and Procedure shown with placeholders | Coming soon until Phase 3 |
