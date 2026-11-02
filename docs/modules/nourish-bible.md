# NourishOS: Nourish's Bible PRD

Version: 1.0
Status: Draft for Angel's review
Date: 2026-11-02
Module: Documents → Nourish's Bible (`/documents/bible`)
Repo path: `docs/modules/nourish-bible.md`
Companion: `docs/modules/nourish-bible-design-guide.md`
Mockup: "Nourish's Bible Flip Book" design canvas
Depends on: Approval Engine, Notification Engine, Audit Log, File Storage, SOP Library, Company Forms

---

## 1. Purpose

Nourish's Bible is one interactive book holding the standards staff use on shift: grooming, menus, service sequence, recipes, production procedures, SOP access and company forms.

It replaces the "Company Documents" card on the Documents hub.

### 1.1 Goals

- One place to find a standard, on a phone, in under three taps from the book's tabs.
- One master menu shared by Nourish Uluwatu, Ungasan and Berawa.
- Recipes protected by department, with immediate removal of access when someone leaves or moves.
- Department leaders can load content in bulk from a spreadsheet.
- Every published change is approved and keeps its version history.

### 1.2 Out of scope

- Offline reading. NourishOS has no service worker.
- Wholefood content at launch.
- Recipe costing, stock deduction and POS sync. Inventory and Purchasing were cut on 2026-08-15, so recipes link to nothing.
- Staff quizzes, reading acknowledgement and training tracking.
- Reading SOPs inside the book. SOP pages open the existing Drive documents.

---

## 2. Locked decisions

| # | Decision | Outcome |
|---|---|---|
| D1 | Company Documents | The card becomes Nourish's Bible. Forms move under General Information. |
| D2 | Content format | Mixed. Menu, Picture, Recipe, Production Procedure, Sequence of Service and Grooming are structured data. SOP pages link to SOP Library entries. |
| D3 | Menu navigation | Menu Food & Beverage → Category → Dish Name, with a category navigation bar and a Search menu button. |
| D4 | Outlet menus | One master menu. Each item is ticked for the outlets that sell it, with price overrides where an outlet differs. Uluwatu, Ungasan and Berawa share it from launch. |
| D5 | Menu ownership | Bar owns Breakfast in a Bowl and all drinks. Kitchen owns savoury food. The Bakery Kitchen owns From the Bakery, Dessert and Cakes, A Slice of Cake and Gelato Cup. |
| D6 | Menu text | Kept exactly as printed. Dish names and descriptions stay English when ID is selected. |
| D7 | Double prices | Pizza prices are Small and Large. Wine double prices stay unlabelled until confirmed (OI-1). |
| D8 | Recipe access | Own department only. Outlet managers, HR, GM and Director see all recipes. |
| D9 | Daily Workers and Trainees | Menu only. They have NourishOS logins. |
| D10 | Approval | Leader → HR Manager → GM. HR-authored content goes to GM only. |
| D11 | Outlet ticks | Outlet managers tick what their outlet sells without approval, logged. Prices need approval. |
| D12 | Animation | Cover opens once per day. Page turns run about 0.4 seconds. The book reopens on the last page read. |
| D13 | Wholefood | Launches as "Coming soon". |
| D14 | Central Kitchen | Sits under Kitchen with the same access. |
| D15 | Recipe delivery | Server check on every recipe open, with a view log. |
| D16 | Service Notes author | Head Chef, Bar Manager and Chief Baker, in the same workbook as recipes. |
| D17 | SOP access | All staff roles are added to `systemSettings/sopAccess`. |
| D18 | Build order | Phase 1 the book, Phase 2 editing, Phase 3 recipes. |

---

## 3. Scope by phase

### Phase 1: The book

- Book shell, cover, page turns, edge tabs, section and page tabs, Contents panel, EN/ID switch.
- General Information: Grooming Standard, Company Forms.
- F&B Service: Floor and Cashier with Menu, Sequence of Service, SOP.
- F&B Product: Kitchen, Bar, The Bakery Kitchen with Menu, Picture and SOP. Recipe and Procedure pages show "Coming soon".
- Wholefood: "Coming soon".
- Menu search and category bar.
- Outlet ticks, with one outlet document per outlet.
- Initial menu load by admin script from `MENU_NOURISH.pdf`, with every item ticked for all three restaurants.
- The same script loads Grooming and Sequence of Service if HR has the content ready. Otherwise those pages show "Coming soon".
- Service Notes pages show "Coming soon" until leaders upload them in Phase 2.

### Phase 2: Editing

- Editor screens for menu items, Service Notes, Grooming and Sequence of Service.
- Draft, submit, approve and publish through the Approval Engine.
- Bulk upload for Items and Service Notes.
- Editions, version history, notifications and price overrides.

### Phase 3: Recipes

- Recipe and Procedure storage, editing and bulk upload.
- `getBibleRecipe` server check and view log.

---

## 4. Book structure

```text
Cover
Title page
Contents

1. General Information
   Grooming Standard (Front of House, Back of House)
   Company Forms

2. F&B Service
   A. Floor
      Menu, Category, Dish, Service Notes
      Sequence of Service
      SOP
   B. Cashier
      Same structure as Floor

3. F&B Product
   A. Kitchen (includes Central Kitchen)
      Menu, Category, Picture
      Recipe, Production Procedure
      SOP
   B. Bar
      Same structure as Kitchen
   C. The Bakery Kitchen
      Same structure as Kitchen

4. Wholefood
   Coming soon

Back cover
```

Floor and Cashier see the full 29-category menu. Kitchen, Bar and The Bakery Kitchen see only the categories they own.

---

## 5. Menu

### 5.1 Source

`MENU TEBAL NOURISH ULU & UNGASAN`, PDF created 2026-03-09: 29 categories, 233 items.

| Owner | Categories | Items |
|---|---|---|
| Kitchen | All Day Breakfast, Extras (Breakfast), Rolls / Toasties / Bagels, Bigger Stuff, Salad Bowls, Sides, Burgers + Wraps, Gourmet Pizzas | 71 |
| Bar | Breakfast in a Bowl, Juices, Smoothies, Coffee, Specialty Lattes, Extras (Coffee), Tea Please, Iced Tea, Cool Drinks, Healing Stuff, Soft Drinks, Bundaberg, Signature Cocktail, Healthy Soda, Wine List, Craft Beer + Beer, Santai Seltzer | 129 |
| The Bakery Kitchen | From the Bakery, Dessert and Cakes, A Slice of Cake, Gelato Cup | 33 |

Item codes are fixed: `KIT-001`, `BAR-001`, `TBK-001`. They match the leader workbooks and never change or get reused.

Ownership controls editing and recipes. It does not control who can read the menu, so Floor and Cashier still see every category.

### 5.2 Search

- Runs on the device against the loaded edition, so it does not depend on the broken global Search Service.
- Matches item name, description, category and dietary tags. All typed words must match.
- Name matches rank first. Results are capped at 40.
- Scope follows the current section: Bar searches Bar categories only.

### 5.3 Outlet view

- Staff at Uluwatu, Ungasan and Berawa see only items ticked for their outlet, with that outlet's price.
- All other users see the master menu and can filter by outlet.

---

## 6. Architecture decisions

### 6.1 Published content is compiled

Editors work on `bibleMenuItems`, `bibleMenuCategories` and `bibleContent`. Staff never read those. A publish compiles them into one immutable `bibleEditions/{editionId}` document, and `systemSettings/bibleEdition` points at the current one.

Reasons:

- A book open costs three document reads, not about 260.
- Each publish is its own record, which gives version history and follows the supersede-not-edit pattern.
- Search runs on the device.

The compiled document must stay under Firestore's 1 MiB limit. At 233 items with notes the estimate is about 250 KB. `publishBibleEdition` fails with a clear error above 900 KB, and the fix is to split editions by chapter.

### 6.2 Outlet state sits outside the edition

Ticks change often and need no approval, so they live in `bibleOutletMenus/{outletId}`. This keeps editions immutable. Approved price overrides are written to the same document.

The reader merges edition and outlet document on the device.

### 6.3 Recipes are server-only

`bibleRecipes` has no client read rule. `getBibleRecipe` is the only route, following the `getAppraisalRecommendation` precedent.

This is needed because custom claims hold only `role`, `departmentId` and `outletId`. Daily Worker and Trainee status lives on the employee record, and `requireActiveUser` reads live data while claims can lag by an hour.

### 6.4 Access summary callable

`getBibleAccess` returns what the signed-in user may open. The client uses it to show or lock pages. It is a display aid. Only recipes are enforced on the server (see §8.3).

### 6.5 Existing registers stay where they are

SOP and Forms pages read `sops` and `companyForms`. Their add and edit screens remain unchanged. `/documents/company-forms` redirects to the book's Forms page, and `new` and `:id/edit` stay in place.

### 6.6 Upload files are never stored

Current `storage.rules` let any signed-in user read any file. Recipe workbooks therefore never go to Storage. The browser reads the file and sends parsed rows to a callable.

---

## 7. Data model

All documents extend `BaseDocument`. All client writes are denied.

```ts
type MenuGroup = 'food' | 'beverage'
type MenuOwner = 'kitchen' | 'bar' | 'bakery'
type DietaryTag = 'V' | 'VG' | 'GF' | 'VO'

interface BibleMenuCategory extends BaseDocument {
  label: string
  group: MenuGroup
  owner: MenuOwner
  servingHours: string | null   // "7 AM – 4 PM", as printed
  note: string | null           // add-on line, as printed
  sortOrder: number
}

interface BiblePrice {
  label: string | null          // 'Small', 'Large', a variant, or null
  amount: number                // whole rupiah, 115000
}

interface BibleServiceNotes {
  howToExplain: string
  pairing: string
  upsell: string
  guestQuestions: string
}

interface BibleMenuItem extends BaseDocument {
  itemCode: string              // KIT-001, immutable
  categoryId: string
  owner: MenuOwner
  name: string                  // as printed
  description: string           // as printed
  tags: DietaryTag[]
  prices: BiblePrice[]
  photoFileId: string | null    // File Storage reference
  serviceNotes: BibleServiceNotes | null
  needsNotes: boolean
  needsRecipe: boolean
  sortOrder: number
  lockedByRequestId: string | null // set while a change is pending
}

interface BibleContent extends BaseDocument {
  kind: 'grooming' | 'sequenceOfService'
  scope: 'frontOfHouse' | 'backOfHouse' | 'floor' | 'cashier'
  heading: { id: string; en: string }
  blocks: Array<{ label: { id: string; en: string }; body: { id: string; en: string } }>
  photoFileId: string | null
  lockedByRequestId: string | null
}

interface BibleEdition extends BaseDocument {
  editionNumber: number
  publishedAt: string
  publishedBy: string
  changeRequestId: string | null // null on the initial load
  categories: BibleMenuCategory[]
  items: Omit<BibleMenuItem, 'lockedByRequestId'>[]
  content: BibleContent[]
}

// systemSettings/bibleEdition
interface BibleEditionPointer extends BaseDocument {
  currentEditionId: string
}

// bibleOutletMenus/{outletId}: one per restaurant outlet
interface BibleOutletMenu extends BaseDocument {
  soldItemIds: string[]
  priceOverrides: Record<string, BiblePrice[]> // itemId → prices
}

type BibleChangeKind =
  | 'menuItems' | 'serviceNotes' | 'content' | 'priceOverride' | 'recipes'

interface BibleChangeRequest extends BaseDocument {
  kind: BibleChangeKind
  owner: MenuOwner | 'general' | 'outlet'
  outletId: string | null
  summary: string
  itemIds: string[]             // every record this draft locks
  source: 'form' | 'upload'
  payload: unknown              // absent for kind 'recipes'
  changeStatus: 'draft' | 'pendingApproval' | 'approved' | 'rejected' | 'returnedForRevision' | 'cancelled'
  approvalRequestId: string | null
  rejectionReason: string | null
}

// bibleChangeRequests/{id}/confidential/payload: recipe drafts only

interface BibleRecipeLine {
  variant: string               // 'All', 'Small', 'Large', 'Tuna'
  ingredient: string
  qty: number
  unit: string
  prepNote: string | null
}

interface BibleProcedureStep {
  variant: string
  stepNo: number
  instruction: string
  timeMinutes: number | null
  tempCelsius: number | null
}

interface BibleRecipe extends BaseDocument {   // id = itemId
  itemCode: string
  owner: MenuOwner
  portions: number
  yield: string
  shelfLife: string | null
  lines: BibleRecipeLine[]
  steps: BibleProcedureStep[]
  changeRequestId: string | null
}
```

Replaced recipes are kept in `bibleRecipes/{itemId}/versions/{versionId}`, which is also server-only.

Add the new names to `src/constants/collections.ts` and `functions/src/lib/collections.ts`.

---

## 8. Access

### 8.1 Reading

| Content | All signed-in staff | Daily Workers, Trainees | Kitchen staff | Bar staff | Bakery staff | Leadership |
|---|---|---|---|---|---|---|
| Menu, pictures, Service Notes, Grooming, Forms | Yes | Yes | Yes | Yes | Yes | Yes |
| Sequence of Service, SOPs | Yes | No | Yes | Yes | Yes | Yes |
| Kitchen recipes | No | No | Yes | No | No | Yes |
| Bar recipes | No | No | No | Yes | No | Yes |
| Bakery recipes | No | No | No | No | Yes | Yes |

### 8.2 Definitions

| Group | Rule |
|---|---|
| Leadership | `restaurantManager`, `hrManager`, `generalManager`, `director`, `superAdmin` |
| Kitchen staff | `departmentId` is `central_kitchen`, or `kitchen` at any outlet except `the_bakery_kitchen` |
| Bakery staff | `departmentId` is `kitchen` and `outletId` is `the_bakery_kitchen` |
| Bar staff | `departmentId` is `bar`, at any outlet |
| Menu-only staff | Linked employee has `employmentStatus` of `dailyWorker` or `ojt`, or `positionId` of `dailyWorker` or `trainee` |

A user with no linked employee record is menu-only unless they are Leadership. The check fails closed.

"Own department" means every role in that department, including Cook Helper and Steward.

### 8.3 Enforcement

| Content | Enforced by |
|---|---|
| Recipes and procedures | `getBibleRecipe`, on the server, every open |
| Sequence of Service and SOPs for menu-only staff | Client only, from `getBibleAccess` |
| Everything else | `firestore.rules`: signed-in read |

Sequence of Service sits in the edition, and SOP read rules key on role, so they cannot separate a Daily Worker from a permanent waiter. Neither is confidential, so client-side hiding is accepted. If this needs real enforcement, see OI-2.

### 8.4 Editing

| Role | Can draft | Approval route |
|---|---|---|
| `headChef` | Kitchen items, Service Notes, recipes, procedures | HR Manager → GM |
| `barManager` | Bar items, Service Notes, recipes, procedures | HR Manager → GM |
| `chiefBaker` | Bakery items, Service Notes, recipes, procedures | HR Manager → GM |
| `restaurantManager` | Sequence of Service, price overrides for own outlet. Floor leaders fill the shared workbook, and a Restaurant Manager uploads it. | HR Manager → GM |
| `restaurantManager` | Outlet ticks for own outlet | None, logged |
| `hrManager` | Grooming, General Information | GM only |

### 8.5 Permissions

New strings, in both `src/constants/permissions.ts` and `functions/src/lib/permissions.ts`:

| Permission | Granted to |
|---|---|
| `bible.edit` | `headChef`, `barManager`, `chiefBaker`, `restaurantManager`, `hrManager` |
| `bible.manageOutletMenu` | `restaurantManager` |

`ROLE_PERMISSIONS` only seeds a role the first time it is claimed, so existing `roles/{roleId}` documents must be updated through Settings > Roles & Permissions or a migration script.

Owner scope, such as Head Chef to Kitchen, is checked in code by `requireBibleOwner`. Reading the book needs no new permission.

---

## 9. Publishing workflow

```text
Draft → Pending Approval (HR Manager) → Pending Approval (GM) → Approved → Published
                     ↓                         ↓
              Rejected or Returned for Revision
```

1. A leader saves a draft from a form or an upload. This creates a `bibleChangeRequests` document.
2. `submitBibleChange` locks each listed record through `lockedByRequestId`, in a transaction. If any record is locked, the submit fails and names it.
3. The Approval Engine runs route `documents/bibleChange`.
4. On approval, the `bibleChange` handler applies the payload, clears locks and calls `publishEditionInternal`.
5. On rejection, it clears locks and notifies the author with the reason. The live book does not change.

Route, added to `functions/src/shared/approval/routes.ts`:

```ts
'documents/bibleChange': (context) =>
  context.requesterRoleId === 'hrManager'
    ? [{ sequence: 1, approverRole: 'generalManager' }]
    : [
        { sequence: 1, approverRole: 'hrManager' },
        { sequence: 2, approverRole: 'generalManager' },
      ],
```

Per the `submitApprovalInternal` contract, `requesterRoleId` comes from the validated user, never from `request.data`.

Publishing updates the pointer in one transaction, so readers see either the old or the new edition. Recipe changes update `bibleRecipes` and create no edition.

---

## 10. Bulk upload

### 10.1 Workbook format

Three workbooks exist, one per owner: `Nourish_Bible_Content_Kitchen.xlsx`, `_Bar.xlsx`, `_Bakery_Kitchen.xlsx`. Template version 1.0.

| Tab | Header row | First data row | Columns |
|---|---|---|---|
| `Items` | 1 | 2 | A Item ID, G Needs Notes, H Needs Recipe, I Portions, J Yield, K Shelf Life |
| `Service Notes` | 1 | 3 | A Item ID, D How to Explain, E Pairing, F Upsell, G Guest Questions |
| `Recipe` | 1 | 3 | A Item ID, C Size / Variant, D Ingredient, E Qty, F Unit, G Prep Note |
| `Procedure` | 1 | 3 | A Item ID, C Size / Variant, D Step No., E Instruction, F Time, G Temp |
| `_meta` | none | 1 | `template_version`, `department`, `department_id`, `item_prefix`, `item_count`, `recipe_rows`, `procedure_rows`, `menu_source` |

Row 2 on the three input tabs is an example with Item ID `EXAMPLE`, and the importer skips it.

A fourth workbook, `Nourish_Bible_Floor_Service.xlsx`, is one shared file for Floor leaders and Restaurant Managers. Template version 1.0, `_meta.workbook_type` is `service`.

| Tab | Header row | First data row | Columns |
|---|---|---|---|
| `Sequence of Service` | 1 | 3 | A Section, B Step No., C Step Name EN, D Step Name ID, E Standard EN, F Standard ID |
| `Outlet Menu` | 1 | 2 | A Item ID, E Menu Price, F to H Sold at Uluwatu, Ungasan, Berawa, I to K outlet price if different |

Row 2 of `Sequence of Service` is an example with its Check cell set to `Example`, and the importer skips it.

- `Sequence of Service` rows become `BibleContent` drafts and follow the §9 approval route.
- A Restaurant Manager's upload applies only to their own outlet's `Outlet Menu` columns.
- Sold ticks apply without approval, per D11. Outlet prices go through approval.

### 10.2 Flow

1. The leader selects the workbook on the upload screen.
2. The browser reads it and checks `_meta`. A wrong template, or a department outside the leader's scope, stops here.
3. `validateBibleImport` runs a dry run and returns errors by tab and row. Nothing is saved.
4. The leader fixes the file or accepts a preview of counts: items changed, notes changed, rows added.
5. `commitBibleImport` creates one change request covering all valid items.
6. It runs the §9 workflow as one batch.

### 10.3 Rules

- A later upload replaces an item's content for the tabs included. It does not merge.
- Blank notes do not overwrite existing notes.
- Rows are sent in chunks of up to 500, tied to one import session.
- Item IDs must belong to the uploader's owner scope.
- Variant labels are compared exactly. For sized items, each size needs its own lines.
- In Phase 2 the importer reads `Items` flags and `Service Notes`. In Phase 3 it also reads `Items` recipe fields, `Recipe` and `Procedure`.

---

## 11. Cloud Functions

All follow the canonical skeleton and are exported from `functions/src/index.ts`. New code lives in `functions/src/documents/bible/`.

| Function | Phase | Purpose | Check |
|---|---|---|---|
| `getBibleAccess` | 1 | Returns recipe owners and menu-only flag | Active user |
| `setBibleOutletMenu` | 1 | Saves ticks for one outlet | `bible.manageOutletMenu`, own outlet |
| `saveBibleChange` | 2 | Creates or updates a draft | `bible.edit`, owner scope |
| `submitBibleChange` | 2 | Locks records, starts approval | Author |
| `cancelBibleChange` | 2 | Withdraws a draft or pending request | Author |
| `validateBibleImport` | 2 | Dry run | `bible.edit`, owner scope |
| `commitBibleImport` | 2 | Creates the batch change | `bible.edit`, owner scope |
| `publishEditionInternal` | 2 | Compiles and publishes an edition | Internal |
| `getBibleRecipe` | 3 | Returns one recipe, logs the view | §8.2 |
| `getBibleChangePayload` | 3 | Returns a recipe draft to its author and approvers | Author or current approver |

Admin script: `functions/tools/import-bible-menu.mjs`. It is dry run by default, `--apply` to write, and idempotent on `itemCode`.

---

## 12. Firestore rules

```text
match /bibleEditions/{editionId}     { allow read: if isSignedIn(); allow write: if false; }
match /systemSettings/bibleEdition   { allow read: if isSignedIn(); allow write: if false; }
match /bibleOutletMenus/{outletId}   { allow read: if isSignedIn(); allow write: if false; }

match /bibleMenuItems/{id}           { allow read: if canEditBible(); allow write: if false; }
match /bibleMenuCategories/{id}      { allow read: if canEditBible(); allow write: if false; }
match /bibleContent/{id}             { allow read: if canEditBible(); allow write: if false; }

match /bibleChangeRequests/{id} {
  allow read: if resource.data.createdBy == request.auth.uid
    || hasAnyRole(['hrManager', 'generalManager', 'director', 'superAdmin']);
  allow write: if false;
  match /confidential/{document=**} { allow read, write: if false; }
}

match /bibleRecipes/{document=**}    { allow read, write: if false; }
```

`canEditBible()` is `hasAnyRole(['headChef', 'barManager', 'chiefBaker', 'restaurantManager', 'hrManager', 'generalManager', 'director', 'superAdmin'])`.

Deny-all on `bibleRecipes` and the confidential payload means no client path reaches recipes.

---

## 13. Notifications

| Event | Recipient | Channel |
|---|---|---|
| Change submitted | Current approver, through `notifyStepApprovers` | In-app |
| Change approved | Author | In-app |
| Change rejected or returned | Author, with the reason | In-app |
| Edition published | Active users in affected departments | In-app |

Audience resolution follows `resolveAudienceUids` in announcements. Menu or Service Notes changes reach Floor, Cashier and the owner department. Grooming reaches all active users.

WhatsApp is not used. No Task Engine tasks are generated in this version, because the approval queue already tracks pending work.

---

## 14. Audit

Recorded with `recordAuditEvent`, category `Documents`, module `documents`:

| Event | Details |
|---|---|
| `BibleMenuImported` | Initial load, item count |
| `BibleOutletMenuChanged` | Outlet, items added and removed |
| `BibleChangeSubmitted`, `BibleChangeCancelled` | Change request, item count, source |
| `BibleChangeApproved`, `BibleChangeRejected` | Change request |
| `BibleEditionPublished` | Edition number, change request |
| `BibleRecipeViewed` | Item, viewer, outlet |
| `BibleRecipeDenied` | Item, viewer, reason |

---

## 15. Errors

| Situation | Behaviour |
|---|---|
| No signal on open | Retry message, not a blank page |
| No published edition | "Not published yet" |
| Recipe check fails | Retry. Never show old recipe content |
| Recipe not permitted | Locked page naming the owning team |
| Recipe not added yet | "Coming soon" |
| SOP has no Drive link | "Not available yet" |
| Record already locked | Names the item and the pending request |
| Upload has errors | List by tab and row, nothing saved |
| Edition over 900 KB | Publish fails, approval result is kept, HR Manager is alerted, and the error names the size |

---

## 16. Testing

- Add `firestore.rules` cases to `functions/test/rules.mjs` for every §12 block, including denial of `bibleRecipes` for `superAdmin`.
- Test `getBibleRecipe` for each §8.2 group, including a baker at the wrong outlet, a Daily Worker in Kitchen, a user with no employee record and a resigned user.
- Test route selection for HR and non-HR requesters.
- Test import against the three real workbooks, including a wrong department and a bad row.
- Hand-test on a mid-range Android phone before each phase ships.

---

## 17. Acceptance criteria

### Phase 1

1. The Documents hub shows Nourish's Bible in place of Company Documents.
2. All 233 items and 29 categories load with printed names, descriptions, tags and prices.
3. A user at Uluwatu, Ungasan or Berawa sees their outlet's items only.
4. An outlet tick reaches staff on their next open, without approval, and is logged.
5. Menu → Category → Dish works on phone and desktop, with the category bar and Search menu.
6. Search finds an item by ingredient, and Bar search returns no Kitchen items.
7. Company Forms open from the book, and the old forms URL redirects.
8. SOP pages list their department's entries for all staff roles, and an entry with no link shows "Not available yet".
9. Daily Workers and Trainees see no Sequence of Service or SOP pages.
10. Wholefood shows "Coming soon".
11. Cover plays once per day, and later visits reopen on the last page.
12. Reduced-motion users get a fade.

### Phase 2

13. A leader can edit only their own owner scope.
14. A submitted change goes HR Manager → GM. HR-authored content goes to GM only.
15. A dish with a pending change cannot be included in a second submit.
16. A rejected change leaves the live book unchanged.
17. An approved change publishes a new edition, keeps the old one and notifies the right departments.
18. A workbook uploads as one batch with row-level errors shown first, and the file is not stored.

### Phase 3

19. A cook sees Kitchen recipes and is refused Bar and Bakery recipes.
20. A baker at The Bakery Kitchen sees Bakery recipes and is refused Kitchen recipes.
21. Central Kitchen staff see Kitchen recipes.
22. Daily Workers and Trainees are refused all recipes.
23. Access ends at once when a user is suspended or changes department.
24. Each open and refusal appears in the Audit Log.
25. Pizzas show Small and Large recipe lines.
26. No client query can read `bibleRecipes`.

---

## 18. Deviations

| Rule | Deviation | Reason |
|---|---|---|
| Approval Engine for all workflows | The initial menu load skips approval | The source is the printed, already-approved menu. Audited as `BibleMenuImported`. |
| Approval Engine for all workflows | Outlet ticks skip approval | Decision D11. Logged. |
| Task Engine integration | No tasks generated | The approval queue covers it. |
| Search Service | Search runs on the device | Search functions are not deployed, and the edition is already loaded. |
| File Storage for attachments | Upload workbooks are not stored | `storage.rules` allow any signed-in read. |
| `documents.md` versioning | Applies through editions rather than per-file versions | Content is structured, not files. |
| Basalt design system | Scoped exception | See design guide. |
| §8.2 "no linked employee is menu-only" | Phase 1 treats an unlinked user as full staff | Nothing populates `users/{uid}.employeeId` yet (OI-8), so the rule would hide Sequence of Service and SOPs from every non-leader. Recipes stay fail-closed: an unlinked non-leader gets no recipe owners. Restore the §8.2 rule when accounts are linked. |

---

## 19. Open items

**Resolved for Phase 1 (2026-11-02, by default):** OI-1 wine double prices stay unlabelled (the seed keeps them as two unlabelled prices). OI-2 and OI-3 Sequence of Service and SOP pages are hidden from menu-only users on the client only. OI-6 ticks cover the three restaurants only.

### Must resolve before implementation

| # | Item | Owner | Blocks |
|---|---|---|---|
| OI-1 | Are wine double prices glass and bottle? | Angel | Phase 1 price labels |
| OI-2 | Confirm client-only hiding of Sequence of Service and SOPs for Daily Workers and Trainees. The alternative is moving Sequence of Service behind a callable and a separate SOP route. | Angel | Phase 1 |
| OI-3 | Confirm Sequence of Service and SOPs are hidden from Daily Workers and Trainees at all. They were read strictly from "menu only". | Angel | Phase 1 |
| OI-4 | Load the 363 SOP entries into `sops`, and give staff view access to the Drive files. | HR | Phase 1 SOP pages |
| OI-5 | Confirm a Cashier SOP code and list. None was found in the SOP Manual. | Angel | Cashier SOP page |
| OI-6 | Do `chiefBaker` items also sell at The Bakery Uluwatu, and does that outlet need ticks? `restaurantManager` covers only the three restaurants. | Angel | Phase 1 ticks |
| OI-7 | Grooming content and uniform photos. | HR | Phase 1 Grooming |
| OI-8 | Confirm each staff record has `employeeId` on `users/{uid}` and a current `employmentStatus`. Unlinked users fall to menu-only. | HR | Phase 1 |

### Can defer

| # | Item |
|---|---|
| OI-9 | Service Notes and Sequence of Service in Indonesian. Fields hold one language per D6 and the workbook format, except `BibleContent`, which is bilingual. |
| OI-10 | Menu spelling corrections, such as "sauted" and "Proseco". Kept as printed per D6. |
| OI-11 | Wholefood chapter: product list, Sequence of Service, SOPs. |
| OI-12 | Offline reading, once a service worker exists. Recipes would need a separate security decision. |
| OI-13 | Alert HR on unusually high recipe viewing by one user. |
| OI-14 | Tighten `storage.rules` before any recipe photo is stored. |
| OI-15 | Reading acknowledgement and quizzes. |
| OI-16 | Regenerate workbooks when items are added, using the same fixed Item IDs. |
