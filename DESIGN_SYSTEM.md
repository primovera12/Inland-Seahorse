# Design System - Stripe-Inspired Modern UI

A comprehensive design system for the Dismantle Pro rebuild, inspired by Stripe's clean, professional, and modern aesthetic.

---

## Design Philosophy

### Core Principles

1. **Clarity Over Decoration** - Every element serves a purpose
2. **Generous Whitespace** - Let content breathe
3. **Subtle Depth** - Soft shadows, not harsh borders
4. **Consistent Rhythm** - Predictable spacing and sizing
5. **Refined Details** - Polish in micro-interactions
6. **Accessible by Default** - WCAG 2.1 AA compliant

### Visual Characteristics

- Clean, minimal interfaces
- Soft, muted color palette
- Subtle shadows for depth
- Smooth, purposeful animations
- Clear visual hierarchy
- Professional typography

---

## 1. Color System

### 1.1 Base Palette

```css
:root {
  /* ========== NEUTRALS ========== */
  /* Used for text, backgrounds, borders */

  --gray-50: #FAFAFA;      /* Page background */
  --gray-100: #F4F4F5;     /* Card hover, subtle bg */
  --gray-200: #E4E4E7;     /* Borders, dividers */
  --gray-300: #D4D4D8;     /* Disabled borders */
  --gray-400: #A1A1AA;     /* Placeholder text */
  --gray-500: #71717A;     /* Secondary text */
  --gray-600: #52525B;     /* Body text */
  --gray-700: #3F3F46;     /* Primary text */
  --gray-800: #27272A;     /* Headings */
  --gray-900: #18181B;     /* High emphasis text */
  --gray-950: #09090B;     /* Maximum contrast */

  /* ========== PRIMARY - Indigo ========== */
  /* Main brand color, CTAs, links */

  --primary-50: #EEF2FF;
  --primary-100: #E0E7FF;
  --primary-200: #C7D2FE;
  --primary-300: #A5B4FC;
  --primary-400: #818CF8;
  --primary-500: #6366F1;   /* Primary brand */
  --primary-600: #4F46E5;   /* Primary hover */
  --primary-700: #4338CA;   /* Primary active */
  --primary-800: #3730A3;
  --primary-900: #312E81;

  /* ========== SUCCESS - Green ========== */
  /* Positive actions, confirmations */

  --success-50: #F0FDF4;
  --success-100: #DCFCE7;
  --success-200: #BBF7D0;
  --success-500: #22C55E;
  --success-600: #16A34A;
  --success-700: #15803D;

  /* ========== WARNING - Amber ========== */
  /* Warnings, pending states */

  --warning-50: #FFFBEB;
  --warning-100: #FEF3C7;
  --warning-200: #FDE68A;
  --warning-500: #F59E0B;
  --warning-600: #D97706;
  --warning-700: #B45309;

  /* ========== ERROR - Red ========== */
  /* Errors, destructive actions */

  --error-50: #FEF2F2;
  --error-100: #FEE2E2;
  --error-200: #FECACA;
  --error-500: #EF4444;
  --error-600: #DC2626;
  --error-700: #B91C1C;

  /* ========== INFO - Blue ========== */
  /* Informational, neutral highlights */

  --info-50: #EFF6FF;
  --info-100: #DBEAFE;
  --info-200: #BFDBFE;
  --info-500: #3B82F6;
  --info-600: #2563EB;
  --info-700: #1D4ED8;
}
```

### 1.2 Semantic Color Tokens

```css
:root {
  /* Backgrounds */
  --bg-primary: #FFFFFF;
  --bg-secondary: var(--gray-50);
  --bg-tertiary: var(--gray-100);
  --bg-inverse: var(--gray-900);

  /* Text */
  --text-primary: var(--gray-900);
  --text-secondary: var(--gray-600);
  --text-tertiary: var(--gray-500);
  --text-muted: var(--gray-400);
  --text-inverse: #FFFFFF;
  --text-link: var(--primary-600);
  --text-link-hover: var(--primary-700);

  /* Borders */
  --border-default: var(--gray-200);
  --border-hover: var(--gray-300);
  --border-focus: var(--primary-500);
  --border-error: var(--error-500);

  /* Interactive */
  --interactive-primary: var(--primary-600);
  --interactive-primary-hover: var(--primary-700);
  --interactive-secondary: var(--gray-100);
  --interactive-secondary-hover: var(--gray-200);
}
```

### 1.3 Status Colors

```css
/* Quote/Order Statuses */
--status-draft: var(--gray-500);
--status-draft-bg: var(--gray-100);

--status-pending: var(--warning-600);
--status-pending-bg: var(--warning-50);

--status-sent: var(--info-600);
--status-sent-bg: var(--info-50);

--status-accepted: var(--success-600);
--status-accepted-bg: var(--success-50);

--status-rejected: var(--error-600);
--status-rejected-bg: var(--error-50);

--status-expired: var(--gray-400);
--status-expired-bg: var(--gray-100);
```

---

## 2. Typography

### 2.1 Font Stack

```css
:root {
  /* Primary - Inter for UI */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;

  /* Monospace - For code, numbers */
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace;
}
```

### 2.2 Type Scale

```css
:root {
  /* Font Sizes */
  --text-xs: 0.75rem;      /* 12px */
  --text-sm: 0.875rem;     /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg: 1.125rem;     /* 18px */
  --text-xl: 1.25rem;      /* 20px */
  --text-2xl: 1.5rem;      /* 24px */
  --text-3xl: 1.875rem;    /* 30px */
  --text-4xl: 2.25rem;     /* 36px */

  /* Line Heights */
  --leading-none: 1;
  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Letter Spacing */
  --tracking-tighter: -0.05em;
  --tracking-tight: -0.025em;
  --tracking-normal: 0;
  --tracking-wide: 0.025em;
}
```

### 2.3 Typography Classes

```css
/* Headings */
.heading-1 {
  font-size: var(--text-3xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tight);
  color: var(--text-primary);
}

.heading-2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-tight);
  color: var(--text-primary);
}

.heading-3 {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
  color: var(--text-primary);
}

.heading-4 {
  font-size: var(--text-lg);
  font-weight: var(--font-medium);
  line-height: var(--leading-snug);
  color: var(--text-primary);
}

/* Body Text */
.body-large {
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
}

.body-default {
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--text-secondary);
}

.body-small {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--text-secondary);
}

/* Labels */
.label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: var(--leading-none);
  color: var(--text-primary);
}

/* Captions */
.caption {
  font-size: var(--text-xs);
  line-height: var(--leading-normal);
  color: var(--text-tertiary);
}

/* Monospace (for prices, codes) */
.mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-feature-settings: 'tnum';
}
```

---

## 3. Spacing System

### 3.1 Spacing Scale

```css
:root {
  --space-0: 0;
  --space-0.5: 0.125rem;   /* 2px */
  --space-1: 0.25rem;      /* 4px */
  --space-1.5: 0.375rem;   /* 6px */
  --space-2: 0.5rem;       /* 8px */
  --space-2.5: 0.625rem;   /* 10px */
  --space-3: 0.75rem;      /* 12px */
  --space-3.5: 0.875rem;   /* 14px */
  --space-4: 1rem;         /* 16px */
  --space-5: 1.25rem;      /* 20px */
  --space-6: 1.5rem;       /* 24px */
  --space-7: 1.75rem;      /* 28px */
  --space-8: 2rem;         /* 32px */
  --space-9: 2.25rem;      /* 36px */
  --space-10: 2.5rem;      /* 40px */
  --space-11: 2.75rem;     /* 44px */
  --space-12: 3rem;        /* 48px */
  --space-14: 3.5rem;      /* 56px */
  --space-16: 4rem;        /* 64px */
  --space-20: 5rem;        /* 80px */
  --space-24: 6rem;        /* 96px */
}
```

### 3.2 Layout Spacing

```css
:root {
  /* Page Layout */
  --page-padding-x: var(--space-6);
  --page-padding-y: var(--space-8);
  --page-max-width: 1440px;

  /* Sidebar */
  --sidebar-width: 256px;
  --sidebar-width-collapsed: 64px;

  /* Content Areas */
  --content-max-width: 1200px;
  --content-padding: var(--space-6);

  /* Section Spacing */
  --section-gap: var(--space-8);
  --section-gap-lg: var(--space-12);

  /* Card Spacing */
  --card-padding: var(--space-6);
  --card-padding-sm: var(--space-4);
  --card-gap: var(--space-4);

  /* Form Spacing */
  --form-gap: var(--space-5);
  --form-group-gap: var(--space-6);
  --input-padding-x: var(--space-3);
  --input-padding-y: var(--space-2.5);
}
```

---

## 4. Border Radius

```css
:root {
  --radius-none: 0;
  --radius-sm: 0.25rem;    /* 4px - Subtle rounding */
  --radius-default: 0.5rem; /* 8px - Default for inputs, buttons */
  --radius-md: 0.625rem;   /* 10px */
  --radius-lg: 0.75rem;    /* 12px - Cards */
  --radius-xl: 1rem;       /* 16px - Large cards, modals */
  --radius-2xl: 1.5rem;    /* 24px - Feature cards */
  --radius-full: 9999px;   /* Pills, avatars */
}
```

---

## 5. Shadows & Elevation

### 5.1 Shadow Scale (Stripe-style soft shadows)

```css
:root {
  /* Subtle elevation - Cards at rest */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);

  /* Light elevation - Hover states */
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1),
               0 1px 2px -1px rgb(0 0 0 / 0.1);

  /* Medium elevation - Dropdowns, popovers */
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1),
               0 2px 4px -2px rgb(0 0 0 / 0.1);

  /* High elevation - Modals */
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1),
               0 4px 6px -4px rgb(0 0 0 / 0.1);

  /* Maximum elevation - Notifications */
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1),
               0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* Inner shadow - Inputs */
  --shadow-inner: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);

  /* Focus ring */
  --shadow-focus: 0 0 0 3px rgb(99 102 241 / 0.2);

  /* Error focus ring */
  --shadow-focus-error: 0 0 0 3px rgb(239 68 68 / 0.2);
}
```

### 5.2 Elevation Tokens

```css
:root {
  --elevation-0: none;
  --elevation-1: var(--shadow-xs);
  --elevation-2: var(--shadow-sm);
  --elevation-3: var(--shadow-md);
  --elevation-4: var(--shadow-lg);
  --elevation-5: var(--shadow-xl);
}
```

---

## 6. Transitions & Animations

### 6.1 Timing Functions

```css
:root {
  /* Easing curves */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Durations */
  --duration-instant: 50ms;
  --duration-fast: 100ms;
  --duration-normal: 150ms;
  --duration-slow: 200ms;
  --duration-slower: 300ms;
  --duration-slowest: 500ms;
}
```

### 6.2 Standard Transitions

```css
/* Default transition */
.transition {
  transition-property: color, background-color, border-color,
                       box-shadow, transform, opacity;
  transition-duration: var(--duration-normal);
  transition-timing-function: var(--ease-in-out);
}

/* Quick transition for micro-interactions */
.transition-fast {
  transition-duration: var(--duration-fast);
}

/* Slow transition for layout changes */
.transition-slow {
  transition-duration: var(--duration-slow);
}

/* Transform only */
.transition-transform {
  transition-property: transform;
  transition-duration: var(--duration-normal);
  transition-timing-function: var(--ease-out);
}
```

### 6.3 Animation Keyframes

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Fade in up (for toasts, modals) */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Fade in down (for dropdowns) */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale in (for modals) */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Slide in from right (for sidebars) */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

/* Pulse (for loading states) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Spin (for loading spinners) */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Skeleton shimmer */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

---

## 7. Component Specifications

### 7.1 Buttons

```tsx
// Button Variants
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';
```

```css
/* Base Button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-sans);
  font-weight: var(--font-medium);
  border-radius: var(--radius-default);
  transition: all var(--duration-normal) var(--ease-in-out);
  cursor: pointer;
  white-space: nowrap;
}

.btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.btn-sm {
  height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--text-sm);
}

.btn-md {
  height: 40px;
  padding: 0 var(--space-4);
  font-size: var(--text-sm);
}

.btn-lg {
  height: 48px;
  padding: 0 var(--space-5);
  font-size: var(--text-base);
}

/* Primary - Solid indigo */
.btn-primary {
  background: var(--primary-600);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-700);
}

.btn-primary:active:not(:disabled) {
  background: var(--primary-800);
}

/* Secondary - Gray background */
.btn-secondary {
  background: var(--gray-100);
  color: var(--text-primary);
  border: none;
}

.btn-secondary:hover:not(:disabled) {
  background: var(--gray-200);
}

/* Outline - Border only */
.btn-outline {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.btn-outline:hover:not(:disabled) {
  background: var(--gray-50);
  border-color: var(--border-hover);
}

/* Ghost - No background */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: none;
}

.btn-ghost:hover:not(:disabled) {
  background: var(--gray-100);
  color: var(--text-primary);
}

/* Destructive - Red */
.btn-destructive {
  background: var(--error-600);
  color: white;
  border: none;
}

.btn-destructive:hover:not(:disabled) {
  background: var(--error-700);
}

/* Link - Text only */
.btn-link {
  background: transparent;
  color: var(--primary-600);
  border: none;
  padding: 0;
  height: auto;
}

.btn-link:hover:not(:disabled) {
  color: var(--primary-700);
  text-decoration: underline;
}
```

### 7.2 Inputs

```css
/* Base Input */
.input {
  width: 100%;
  height: 40px;
  padding: var(--input-padding-y) var(--input-padding-x);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: white;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
  transition: all var(--duration-fast) var(--ease-in-out);
}

.input::placeholder {
  color: var(--text-muted);
}

.input:hover:not(:disabled) {
  border-color: var(--border-hover);
}

.input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: var(--shadow-focus);
}

.input:disabled {
  background: var(--gray-50);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

/* Error state */
.input-error {
  border-color: var(--error-500);
}

.input-error:focus {
  box-shadow: var(--shadow-focus-error);
}

/* Input sizes */
.input-sm { height: 32px; font-size: var(--text-xs); }
.input-lg { height: 48px; font-size: var(--text-base); }

/* Textarea */
.textarea {
  min-height: 100px;
  resize: vertical;
  padding: var(--space-3);
}

/* Select */
.select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-position: right 12px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 40px;
}
```

### 7.3 Cards

```css
/* Base Card */
.card {
  background: white;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* Card with shadow (elevated) */
.card-elevated {
  border: none;
  box-shadow: var(--shadow-sm);
}

.card-elevated:hover {
  box-shadow: var(--shadow-md);
}

/* Card sections */
.card-header {
  padding: var(--card-padding);
  border-bottom: 1px solid var(--border-default);
}

.card-body {
  padding: var(--card-padding);
}

.card-footer {
  padding: var(--card-padding);
  border-top: 1px solid var(--border-default);
  background: var(--gray-50);
}

/* Compact card */
.card-compact .card-header,
.card-compact .card-body,
.card-compact .card-footer {
  padding: var(--card-padding-sm);
}
```

### 7.4 Tables (Stripe-style)

```css
/* Table Container */
.table-container {
  background: white;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

/* Table */
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

/* Table Header */
.table thead {
  background: var(--gray-50);
}

.table th {
  padding: var(--space-3) var(--space-4);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  text-align: left;
  border-bottom: 1px solid var(--border-default);
  white-space: nowrap;
}

/* Sortable header */
.table th.sortable {
  cursor: pointer;
  user-select: none;
}

.table th.sortable:hover {
  color: var(--text-primary);
  background: var(--gray-100);
}

/* Table Body */
.table td {
  padding: var(--space-3) var(--space-4);
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-default);
  vertical-align: middle;
}

.table tbody tr:last-child td {
  border-bottom: none;
}

/* Row hover */
.table tbody tr:hover {
  background: var(--gray-50);
}

/* Clickable row */
.table tbody tr.clickable {
  cursor: pointer;
}

/* Selected row */
.table tbody tr.selected {
  background: var(--primary-50);
}

/* Numeric column */
.table td.numeric,
.table th.numeric {
  text-align: right;
  font-feature-settings: 'tnum';
  font-family: var(--font-mono);
}

/* Actions column */
.table td.actions {
  text-align: right;
  white-space: nowrap;
}
```

### 7.5 Badges & Status Pills

```css
/* Base Badge */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-0.5) var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  border-radius: var(--radius-full);
  white-space: nowrap;
}

/* Badge variants */
.badge-gray {
  background: var(--gray-100);
  color: var(--gray-700);
}

.badge-primary {
  background: var(--primary-100);
  color: var(--primary-700);
}

.badge-success {
  background: var(--success-100);
  color: var(--success-700);
}

.badge-warning {
  background: var(--warning-100);
  color: var(--warning-700);
}

.badge-error {
  background: var(--error-100);
  color: var(--error-700);
}

.badge-info {
  background: var(--info-100);
  color: var(--info-700);
}

/* Status dot */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.status-dot-success { background: var(--success-500); }
.status-dot-warning { background: var(--warning-500); }
.status-dot-error { background: var(--error-500); }
.status-dot-gray { background: var(--gray-400); }
```

### 7.6 Modals/Dialogs

```css
/* Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 50;
  animation: fadeIn var(--duration-normal) var(--ease-out);
}

/* Modal */
.modal {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 100%;
  max-height: calc(100vh - 32px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: scaleIn var(--duration-slow) var(--ease-out);
}

.modal-sm { max-width: 400px; }
.modal-lg { max-width: 700px; }
.modal-xl { max-width: 900px; }
.modal-full { max-width: calc(100vw - 32px); }

/* Modal Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--border-default);
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.modal-close {
  color: var(--text-tertiary);
  padding: var(--space-1);
  border-radius: var(--radius-default);
  transition: all var(--duration-fast);
}

.modal-close:hover {
  background: var(--gray-100);
  color: var(--text-primary);
}

/* Modal Body */
.modal-body {
  padding: var(--space-6);
  overflow-y: auto;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--border-default);
  background: var(--gray-50);
}
```

### 7.7 Navigation/Sidebar

```css
/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--gray-900);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 40;
  transition: width var(--duration-slow) var(--ease-in-out);
}

.sidebar-collapsed {
  width: var(--sidebar-width-collapsed);
}

/* Sidebar Logo */
.sidebar-logo {
  padding: var(--space-5);
  border-bottom: 1px solid rgb(255 255 255 / 0.1);
}

/* Nav Group */
.nav-group {
  padding: var(--space-4) var(--space-3);
}

.nav-group-title {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--gray-400);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

/* Nav Item */
.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2.5) var(--space-3);
  font-size: var(--text-sm);
  color: var(--gray-300);
  border-radius: var(--radius-default);
  transition: all var(--duration-fast);
  cursor: pointer;
}

.nav-item:hover {
  background: rgb(255 255 255 / 0.1);
  color: white;
}

.nav-item.active {
  background: rgb(255 255 255 / 0.15);
  color: white;
}

.nav-item-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
```

### 7.8 Toasts/Notifications

```css
/* Toast Container */
.toast-container {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Toast */
.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-default);
  max-width: 400px;
  animation: fadeInUp var(--duration-slow) var(--ease-out);
}

.toast-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.toast-message {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: var(--space-0.5);
}

.toast-close {
  flex-shrink: 0;
  color: var(--text-tertiary);
}

/* Toast variants */
.toast-success .toast-icon { color: var(--success-500); }
.toast-error .toast-icon { color: var(--error-500); }
.toast-warning .toast-icon { color: var(--warning-500); }
.toast-info .toast-icon { color: var(--info-500); }
```

### 7.9 Form Layout

```css
/* Form */
.form {
  display: flex;
  flex-direction: column;
  gap: var(--form-gap);
}

/* Form Group */
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1.5);
}

/* Form Row (horizontal) */
.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

/* Label */
.form-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
}

.form-label-required::after {
  content: ' *';
  color: var(--error-500);
}

/* Helper text */
.form-helper {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
}

/* Error message */
.form-error {
  font-size: var(--text-xs);
  color: var(--error-600);
}

/* Form Section */
.form-section {
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--border-default);
  margin-bottom: var(--space-6);
}

.form-section:last-child {
  padding-bottom: 0;
  border-bottom: none;
  margin-bottom: 0;
}

.form-section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-4);
}
```

### 7.10 Empty States

```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-12) var(--space-6);
}

.empty-state-icon {
  width: 48px;
  height: 48px;
  color: var(--gray-300);
  margin-bottom: var(--space-4);
}

.empty-state-title {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.empty-state-description {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  max-width: 400px;
  margin-bottom: var(--space-5);
}
```

### 7.11 Skeleton Loaders

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--gray-200) 0%,
    var(--gray-100) 50%,
    var(--gray-200) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-default);
}

.skeleton-text {
  height: 16px;
  width: 100%;
}

.skeleton-text-sm {
  height: 12px;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
}

.skeleton-button {
  height: 40px;
  width: 120px;
}

.skeleton-card {
  height: 200px;
}
```

---

## 8. Layout Templates

### 8.1 Page Layout

```tsx
// Standard page layout
<div className="page">
  <aside className="sidebar">...</aside>

  <main className="main-content">
    <header className="page-header">
      <div className="page-header-content">
        <h1 className="page-title">Page Title</h1>
        <p className="page-subtitle">Optional description</p>
      </div>
      <div className="page-actions">
        <Button>Action</Button>
      </div>
    </header>

    <div className="page-body">
      {/* Content */}
    </div>
  </main>
</div>
```

```css
.page {
  display: flex;
  min-height: 100vh;
  background: var(--bg-secondary);
}

.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6) var(--space-8);
  background: white;
  border-bottom: 1px solid var(--border-default);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}

.page-body {
  flex: 1;
  padding: var(--space-8);
  max-width: var(--content-max-width);
}
```

### 8.2 Dashboard Layout

```css
/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-6);
}

.stat-card {
  background: white;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  font-feature-settings: 'tnum';
}

.stat-change {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  margin-top: var(--space-2);
}

.stat-change-positive { color: var(--success-600); }
.stat-change-negative { color: var(--error-600); }
```

### 8.3 List/Detail Layout (Master-Detail)

```css
.master-detail {
  display: grid;
  grid-template-columns: 360px 1fr;
  height: calc(100vh - 64px);
}

.master-list {
  border-right: 1px solid var(--border-default);
  background: white;
  overflow-y: auto;
}

.detail-panel {
  background: var(--bg-secondary);
  overflow-y: auto;
  padding: var(--space-6);
}

.detail-panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
```

---

## 9. Icons

### 9.1 Icon System

Use **Lucide React** for icons - clean, consistent, and Stripe-like.

```tsx
import {
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Info,
  Trash2,
  Edit,
  MoreHorizontal,
  Download,
  Upload,
  Filter,
  Settings,
  User,
  Building2,
  FileText,
  Truck,
  Package,
  DollarSign,
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
```

### 9.2 Icon Sizes

```css
.icon-xs { width: 14px; height: 14px; }
.icon-sm { width: 16px; height: 16px; }
.icon-md { width: 20px; height: 20px; }
.icon-lg { width: 24px; height: 24px; }
.icon-xl { width: 32px; height: 32px; }
```

---

## 10. Responsive Breakpoints

```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}

/* Mobile-first approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

---

## 11. Dark Mode (Future Consideration)

While not implementing dark mode initially, the design system is prepared for it:

```css
/* Example dark mode tokens */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: var(--gray-900);
    --bg-secondary: var(--gray-950);
    --text-primary: var(--gray-50);
    --text-secondary: var(--gray-400);
    --border-default: var(--gray-800);
  }
}
```

---

## 12. Accessibility Guidelines

### 12.1 Focus Management
- All interactive elements must have visible focus states
- Focus ring color: `var(--shadow-focus)`
- Never remove outlines without replacement

### 12.2 Color Contrast
- Text on white: minimum 4.5:1 ratio
- Large text: minimum 3:1 ratio
- Interactive elements: minimum 3:1 ratio

### 12.3 Touch Targets
- Minimum touch target: 44×44px
- Spacing between targets: 8px minimum

### 12.4 Motion
- Respect `prefers-reduced-motion`
- Provide alternatives to motion-based feedback

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 13. Implementation Notes

### 13.1 Tailwind CSS Configuration

```typescript
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF2FF',
          // ... full scale
          600: '#4F46E5',
        },
        gray: {
          // Zinc scale for neutrals
          50: '#FAFAFA',
          // ... full scale
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'focus': '0 0 0 3px rgb(99 102 241 / 0.2)',
        'focus-error': '0 0 0 3px rgb(239 68 68 / 0.2)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      }
    }
  }
}
```

### 13.2 Component Library Setup

Use **shadcn/ui** as the component foundation:
- Pre-built accessible components
- Tailwind-based styling
- Easy customization
- Stripe-like aesthetic

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card table
```

---

*Design System Version: 1.0*
*Inspired by: Stripe, Linear, Vercel*
*Created: January 2026*
