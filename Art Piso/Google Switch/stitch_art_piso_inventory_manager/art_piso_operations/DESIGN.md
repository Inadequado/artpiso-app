---
name: Art Piso Operations
colors:
  surface: '#faf8ff'
  surface-dim: '#dad9e1'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3fa'
  surface-container: '#eeedf4'
  surface-container-high: '#e9e7ef'
  surface-container-highest: '#e3e1e9'
  on-surface: '#1a1b21'
  on-surface-variant: '#444651'
  inverse-surface: '#2f3036'
  inverse-on-surface: '#f1f0f7'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#4b1c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e2c00'
  on-tertiary-container: '#f39461'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#773205'
  background: '#faf8ff'
  on-background: '#1a1b21'
  surface-variant: '#e3e1e9'
  available-emerald: '#10B981'
  low-stock-amber: '#F59E0B'
  alert-rose: '#E11D48'
  surface-gray: '#F8FAFC'
  border-subtle: '#E2E8F0'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-primary:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
  data-secondary:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  sidebar-width: 260px
---

## Brand & Style

The design system is engineered for **Art Piso**, a high-utility operational tool for warehouse and stock management. The brand personality is **reliable, precise, and utilitarian**. It avoids decorative elements in favor of functional clarity, ensuring that warehouse staff and sales teams can make rapid decisions regarding stock availability and reservations.

The chosen design style is **Corporate / Modern**, leaning heavily into **Minimalism**. It utilizes a structured grid, generous but controlled whitespace, and a restricted color palette to reduce cognitive load in high-density data environments. Visual interest is generated through crisp typography and semantic color signaling rather than imagery or gradients. The interface feels like a professional instrument—stable, fast, and authoritative.

Key Principles:
- **Utility over Aesthetics:** Every element must serve a functional purpose.
- **Density with Clarity:** High information density is maintained through rigorous alignment and typographic hierarchy.
- **Operational Confidence:** Use of "Safe" blues and clear semantic states (Emerald, Amber, Rose) to provide immediate feedback on stock health.

## Colors

The palette is anchored by **Deep Professional Blue** (#1E3A8A) for primary actions and brand presence, signaling stability and trust. Neutral grays facilitate the structural framework, keeping the focus on data.

### Semantic Logic
- **Emerald (#10B981):** Used exclusively for "Available" states and successful confirmations.
- **Amber (#F59E0B):** Reserved for "Low Stock" warnings or pending reservations.
- **Rose (#E11D48):** Critical alerts, out-of-stock states, and destructive actions.

The default mode is **Light**, providing high contrast for text and numeric data which is essential for readability in varied lighting conditions (e.g., a brightly lit showroom or a dim warehouse office). Backgrounds use a very soft `surface-gray` to differentiate the app canvas from white content cards.

## Typography

This design system uses **Inter** as the primary typeface for its exceptional legibility and neutral character. A key differentiator is the inclusion of **JetBrains Mono** for technical identifiers (Lote codes, Quadra numbers, Order IDs), ensuring that alphanumeric strings are easily distinguishable and perfectly aligned.

### Numeric Clarity
Numbers are the "Source of Truth" in this system.
- Use `data-primary` for the main unit count (e.g., "30 cx").
- Use `data-secondary` for the calculated conversion (e.g., "64,8 m²") immediately below or beside the primary unit.
- Tabular figures (monospace) should be used within data grids to ensure decimal points align vertically, preventing reading errors during stock counts.

## Layout & Spacing

The layout utilizes a **12-column fluid grid** for desktop and a single-column flow for mobile. 

### Spacing Rhythm
- **Base Unit:** 4px. All margins and paddings are multiples of this base.
- **Dense Tables:** Row heights are kept compact (48px - 56px) to maximize information density without sacrificing touch targets.
- **Side Navigation:** A fixed 260px sidebar provides persistent access to core modules (Stock, Reservations, Adjustments).
- **Responsive Behavior:** 
  - **Desktop:** Uses a split-view or "Master-Detail" pattern where clicking a list item opens a 400px **slide-over drawer** from the right.
  - **Mobile:** The sidebar collapses into a bottom navigation bar or a hamburger menu. Details transition to a full-screen view or a bottom sheet.

## Elevation & Depth

To maintain a "flat yet functional" look, this design system avoids heavy shadows. It uses **Tonal Layers** and **Low-contrast Outlines** to define hierarchy.

- **Level 0 (Background):** Surface-gray (#F8FAFC).
- **Level 1 (Cards/Tables):** Pure White (#FFFFFF) with a 1px border (#E2E8F0). No shadow.
- **Level 2 (Drawers/Modals):** Pure White with a subtle "Ambient Shadow" (0px 4px 20px rgba(0, 0, 0, 0.05)) to provide a soft lift over the main content.
- **Interaction:** Buttons use a slight vertical offset (1px) on hover to indicate tactility, rather than a change in elevation.

## Shapes

The shape language is **Soft (0.25rem / 4px)**. This slight rounding takes the edge off the "technical" feel of the app, making it more approachable for daily use while maintaining a professional, structured appearance.

- **Small Components (Badges, Input Fields):** 4px radius.
- **Large Components (Cards, Drawers):** 8px (rounded-lg) for the top corners of mobile bottom sheets or the corners of desktop containers.
- **Status Badges:** Use a "capsule" or pill-shape (full rounding) to clearly distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Deep Blue background, white text. No gradient. Solid 4px radius.
- **Secondary:** White background, Slate Blue border and text.
- **Action (Ghost):** No border or background unless hovered. Used for row-level actions like "Edit" or "Details".

### Status Badges
- High-contrast text on a low-saturation background of the same hue (e.g., Emerald text on light emerald background).
- Displaying: `Available`, `Low Stock`, `Out of Stock`, `Reserved`, `Delivered`.

### Tables & Lists
- **Dense Row Layout:** Top line is `data-primary` (Product Name + Lote). Bottom line is `data-secondary` (Brand + Size).
- **Stock Column:** Always displays Boxes (cx) as the primary value, with m² as a sub-label.

### Slide-over Drawers
- Used for "Lote Details" and "Create Reservation".
- Contains vertical form fields and a sticky footer with primary/secondary actions (e.g., "Confirm Reservation").

### Input Fields
- Standard 4px rounded borders. 
- Focus state uses a 2px Primary Blue ring.
- Numeric inputs for "Boxes" should include increment/decrement steppers for tablet-friendly adjustments.