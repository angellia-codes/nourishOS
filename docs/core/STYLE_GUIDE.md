# NourishOS Style Guide

Version: 2.0
Product: Nourish Operational System (NourishOS)

---

# Brand Personality

Nourish is more than a restaurant brand.

It represents healthy living, warmth, craftsmanship, hospitality, and mindful experiences.

The interface should feel:

- Clean
- Calm
- Organic
- Premium
- Crafted
- Human
- Modern
- Spacious
- Trustworthy

The application should never feel overly corporate or overly playful. It should feel like it was built by people who understand food and hospitality — not like borrowed generic enterprise software.

---

# Design Principles

## 1. Simplicity First

Every screen should have a single primary purpose.

Avoid unnecessary decoration.

Less interface.
More content.

---

## 2. Natural Experience

Inspired by:

- Natural materials
- Organic shapes
- Warm lighting
- Fresh ingredients
- Scandinavian minimalism
- Japanese simplicity

---

## 3. Functional Beauty

Every visual element should improve usability.

No decorative UI that distracts from work.

---

## 4. Consistency

Every module should look and behave the same.

Users should never need to relearn navigation.

---

## 5. Calm Interface

Employees spend hours using this system — at a desk all day, or on a shared tablet during a shift.

Avoid aggressive colors.

Avoid visual noise.

Use whitespace generously.

---

# Visual Direction

Keywords

- Organic
- Premium
- Elegant
- Minimal
- Warm
- Earthy
- Crafted
- Soft
- Fresh
- Modern

Avoid

- Neon colors
- Heavy gradients
- Glassmorphism
- Excessive animations
- Comic illustrations
- Bright saturated colors
- Generic enterprise blue/indigo as a primary color
- Inter as the primary typeface — deliberately avoided; see Typography

---

# Color Palette

## Primary

Terracotta / Spice

HEX

#B5502C

Usage

- Primary buttons
- Active navigation
- Links
- Primary emphasis

---

## Secondary

Deep Olive

#3F4A3A

Usage

- Secondary buttons
- Alternate emphasis
- Dark-mode grounding surfaces

---

## Accent

Warm Ochre

#C08A2E

Usage

- Notifications
- Important indicators
- Small highlights

Note: Accent intentionally shares its hex with the Warning semantic color below. Ochre carries both "notable" and "caution" meaning — this keeps the palette tight instead of adding a color that exists for decoration alone.

---

## Background

Warm Linen

#FAF7F2

---

## Surface

Pure White

#FFFFFF

---

## Sunken Surface

#F2EDE4

Usage

- Form inputs
- Nested panels
- Alternating table rows

---

## Dark Surface

#2A2622

---

## Border

#E4DBCB

---

## Text Primary

#2A2622

---

## Text Secondary

#6E655A

---

## Success

#4C7A4C

---

## Warning

#C08A2E

---

## Error

#B23B3B

---

## Information

#3F6E8C

---

# Dark Mode

Background

#211D19

Surface

#2A2622

Sunken Surface

#201C18

Primary

#D97B4F

Secondary

#8FA383

Accent / Warning

#D9A64E

Text

#F2EDE4

Secondary Text

#B3A99B

Borders

#423B33

Success

#7FAF7A

Error

#D97066

Information

#7FADC9

---

# Typography

Primary Font

DM Sans

Usage

- UI
- Buttons
- Forms
- Tables
- Navigation

Weights

400

500

600

700

---

Secondary Font (Display)

Fraunces

Usage

- Dashboard Titles
- Welcome Messages
- Section Headers
- Marketing Pages

Never use Fraunces inside forms or dense data tables — it's a character font for titles and moments, not a working font.

---

Monospace

JetBrains Mono

Usage

- IDs
- Logs
- Technical Data

---

# Typography Scale

Display

48px — Fraunces

---

H1

36px — Fraunces

---

H2

30px — Fraunces or DM Sans (section-dependent)

---

H3

24px — DM Sans, weight 600

---

H4

20px — DM Sans, weight 600

---

Body

16px — DM Sans

---

Small

14px — DM Sans

---

Caption

12px — DM Sans

---

# Spacing System

Use an 8-point grid.

Spacing values

4

8

12

16

24

32

40

48

64

80

96

Never use arbitrary spacing.

---

# Border Radius

Small

4px

Medium

8px

Large

12px

Cards

12px

Buttons

8px

Dialogs

12px

Pills / Avatars / Badges

9999px (full)

Note: tighter than the previous 20px card radius — the Warm Utilitarian direction favors a more disciplined, less "bubbly SaaS" surface while still keeping every corner rounded rather than sharp.

---

# Shadows

Very soft, warm-tinted (not neutral black).

Cards

0 2px 10px rgba(80,55,30,.08)

Dialogs

0 12px 40px rgba(80,55,30,.16)

---

# Layout

Maximum content width

1440px

Dashboard

12-column grid

Page padding

32px Desktop

24px Tablet

16px Mobile

---

# Navigation

Desktop

Left Sidebar

Top Header

Content

---

Mobile

Bottom Navigation

Floating Action Button when appropriate

Hamburger Menu

---

# Buttons

Primary

Filled Terracotta

Warm off-white text

---

Secondary

Filled Deep Olive

Warm off-white text

---

Ghost

Bordered, transparent fill

Text-only emphasis

---

Danger

Muted Red

Never bright red.

---

Button Height

44px

Minimum Width

120px

Tablet / shared-device controls (outlet, frontline use)

48px minimum height

---

# Cards

Pure white surface, on the warm linen background

12px radius

Subtle warm-tinted border

Soft warm shadow

Internal padding

24px

---

# Forms

Rounded inputs

48px height

Sunken warm surface background (#F2EDE4)

Clear labels

Always validate

Show helpful error messages

---

# Tables

Comfortable row height

56px

Sticky headers

Search

Sorting

Pagination

Column visibility

Export

---

# Icons

Library

Lucide React

Style

Outline

2px stroke

Consistent sizing

---

# Illustrations

Style

Minimal

Organic

Soft

Flat

Earth tones

Avoid cartoon styles.

---

# Photography

Use real photography.

Focus on

Food

People

Craftsmanship

Ingredients

Hospitality

Natural light

Avoid stock-looking photos.

---

# Animations

Fast

Subtle

Natural

Duration

150–250ms

Avoid

Bounce

Elastic

Flash

---

# Notifications

Success

Green (#4C7A4C)

Warning

Ochre (#C08A2E)

Error

Muted Red (#B23B3B)

Information

Muted Blue (#3F6E8C)

Notifications should never interrupt work unnecessarily.

---

# Charts

Style

Minimal

No heavy gridlines

Rounded bars

Warm, muted colors drawn from the terracotta/olive palette — never default chart-library blues

Accessible contrast

---

# Accessibility

Minimum contrast ratio WCAG AA (4.5:1 for body text)

Warm-toned colors are less forgiving than cool-on-white — spot-check terracotta-on-linen and olive-on-linen text pairings specifically; do not assume a hex value is accessible just because it "reads warm."

Keyboard accessible

Visible focus states

Screen reader friendly

Touch targets

Minimum 44px everywhere; 48px minimum on tablet/shared-device surfaces used by outlet and frontline staff

---

# Responsive Breakpoints

Mobile

<640px

Tablet

640px

Laptop

1024px

Desktop

1280px

Wide

1536px

---

# Naming Convention

Modules

PascalCase

Components

PascalCase

Hooks

useCamelCase

Functions

camelCase

Constants

UPPER_SNAKE_CASE

Collections

camelCase

---

# Overall Experience

When using NourishOS, employees should feel that the software is:

Calm.

Organized.

Fast.

Professional.

Crafted.

Beautiful without trying to be flashy.

Every interaction — whether on a back-office desktop or a shared tablet at an outlet — should reinforce confidence, clarity, and efficiency, while reflecting the warmth and quality of the Nourish brand rather than the borrowed look of generic enterprise software.
