# Dismantle DB - Complete Rebuild Plan

## Executive Summary

This document outlines the complete rebuild of the Equipment Dismantling & Inland Transportation Rate Management System. The current application has grown organically without planning, resulting in significant technical debt, duplicated logic, and maintainability issues. This rebuild will create a modern, scalable, and maintainable application using Next.js 15 and React 19.

---

## Part 1: Current System Audit

### 1.1 Critical Issues Identified

#### A. Duplicate Customer Management Systems (CRITICAL)
```
Current State:
├── customers table → ClientManagementView.tsx (41KB)
│   └── Used by: Inland quotes (legacy)
│
├── companies table → CompanyManagementView.tsx (54KB)
│   └── contacts table (linked)
│   └── Used by: Activity logs, some quotes
│
└── PROBLEM: Two parallel systems managing the same data!
```

**Impact**: Data inconsistency, confusion, duplicate entries, no single source of truth for customer data.

#### B. Duplicated Business Logic (HIGH)
| Logic | Duplicated In | Lines |
|-------|---------------|-------|
| Dimension conversion (ft↔in) | QuoteView.tsx, InlandQuoteView.tsx | ~100 each |
| Truck recommendation | QuoteView.tsx, InlandQuoteView.tsx | ~150 each |
| Quote number generation | quoteGenerator.ts, InlandQuoteView.tsx | ~10 each |
| Currency formatting | Multiple components | ~5 each |
| Smart dimension parsing | QuoteView.tsx, InlandQuoteView.tsx | ~80 each |

#### C. Monolithic Components (HIGH)
| Component | Size | Issues |
|-----------|------|--------|
| QuoteView.tsx | 317KB (~8,000+ lines) | Unmaintainable, slow rendering |
| InlandQuoteView.tsx | 220KB (~5,500+ lines) | Same issues |
| InlandSettingsView.tsx | 70KB | Mixed concerns |
| PriceEntryView.tsx | 57KB | Could be split |

#### D. Multiple Quote Generators (MEDIUM)
```
lib/
├── quoteGenerator.ts (38KB) - Legacy dismantling
├── professionalQuoteGenerator.ts (77KB) - Current dismantling
├── inlandQuoteGenerator.ts (43KB) - Inland quotes
└── professionalInlandQuoteGenerator.ts (19KB) - Professional inland
```
**4 separate PDF generators with duplicated styling/layout logic!**

#### E. No Authentication Layer (CRITICAL)
- No user login/logout
- No role-based access control
- Security relies solely on Supabase RLS (which is configured as "open")
- API routes have no auth checks

#### F. No Proper API Layer (HIGH)
- Only 2 API routes exist (`/api/routes`, `/api/tickets/notify`)
- All CRUD operations happen client-side via Supabase
- No server-side validation
- No rate limiting per operation
- Sensitive logic exposed to client

#### G. Database Schema Issues (MEDIUM)
- 45+ SQL migration files with no versioning
- Multiple "fix" scripts indicate schema evolution problems
- Inconsistent naming conventions
- No clear relationships documented
- RLS policies are overly permissive

### 1.2 Feature Inventory (What Actually Works)

#### Dismantling Module
- [x] Equipment rate management (makes, models, prices)
- [x] Location-based pricing (6 locations)
- [x] Quote generation with PDF
- [x] Multi-equipment quotes
- [x] Equipment dimensions database
- [x] Quote history tracking
- [x] Quote status pipeline

#### Inland Transportation Module
- [x] Multi-destination routing
- [x] Google Places integration
- [x] Google Routes API (distance/duration)
- [x] Truck type recommendations
- [x] Accessorial charges
- [x] Service items & cargo tracking
- [x] Multi-load blocks per destination
- [x] PDF generation with maps

#### CRM Module
- [x] Company management (partial)
- [x] Contact management (partial)
- [x] Customer management (duplicate system)
- [x] Activity logging
- [x] Follow-up reminders

#### Admin Module
- [x] Company branding settings
- [x] Quote templates
- [x] Rate tier configuration
- [x] Fuel surcharge tracking
- [x] Ticket/feature request system

---

## Part 2: New System Architecture

### 2.1 Technology Stack

| Layer | Current | New |
|-------|---------|-----|
| Framework | Next.js 14 | **Next.js 15** |
| React | React 18 | **React 19** |
| Language | TypeScript 5 | TypeScript 5.3+ |
| Styling | Tailwind CSS 3.4 | **Tailwind CSS 4** |
| Database | Supabase | **Supabase (new instance)** |
| State | Component state | **Zustand** |
| Forms | Manual | **React Hook Form + Zod** |
| API | Client-side Supabase | **Server Actions + tRPC** |
| Auth | None | **Supabase Auth** |
| PDF | jsPDF | **@react-pdf/renderer** |
| Testing | None | **Vitest + Playwright** |
| Icons | Inline SVG | **Lucide React** |

### 2.2 Project Structure

```
dismantle-pro/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                 # Dashboard shell with sidebar
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx               # Overview/home
│   │   │
│   │   ├── equipment/
│   │   │   ├── page.tsx               # Equipment list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx           # Equipment detail
│   │   │   ├── rates/
│   │   │   │   └── page.tsx           # Rate management
│   │   │   └── dimensions/
│   │   │       └── page.tsx           # Dimensions management
│   │   │
│   │   ├── quotes/
│   │   │   ├── page.tsx               # Quote list
│   │   │   ├── new/
│   │   │   │   └── page.tsx           # Create dismantling quote
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx           # Quote detail
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx
│   │   │   └── pipeline/
│   │   │       └── page.tsx           # Pipeline view
│   │   │
│   │   ├── inland/
│   │   │   ├── page.tsx               # Inland quotes list
│   │   │   ├── new/
│   │   │   │   └── page.tsx           # Create inland quote
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx           # Quote detail
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx           # Inland settings
│   │   │
│   │   ├── customers/                  # UNIFIED CUSTOMER SYSTEM
│   │   │   ├── page.tsx               # Customer list
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx           # Customer detail + contacts
│   │   │   │   ├── quotes/
│   │   │   │   │   └── page.tsx       # Customer's quotes
│   │   │   │   └── activity/
│   │   │   │       └── page.tsx       # Activity timeline
│   │   │   └── import/
│   │   │       └── page.tsx           # Bulk import
│   │   │
│   │   ├── activity/
│   │   │   ├── page.tsx               # Activity log
│   │   │   └── reminders/
│   │   │       └── page.tsx           # Follow-up reminders
│   │   │
│   │   ├── settings/
│   │   │   ├── page.tsx               # General settings
│   │   │   ├── branding/
│   │   │   │   └── page.tsx
│   │   │   ├── templates/
│   │   │   │   └── page.tsx
│   │   │   ├── locations/
│   │   │   │   └── page.tsx
│   │   │   ├── rate-tiers/
│   │   │   │   └── page.tsx
│   │   │   └── users/
│   │   │       └── page.tsx           # User management
│   │   │
│   │   └── support/
│   │       ├── page.tsx               # Tickets list
│   │       └── updates/
│   │           └── page.tsx           # What's new
│   │
│   ├── api/
│   │   ├── trpc/
│   │   │   └── [trpc]/
│   │   │       └── route.ts
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts
│   │
│   ├── layout.tsx
│   ├── page.tsx                       # Landing/redirect
│   └── globals.css
│
├── components/
│   ├── ui/                            # Design system primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── skeleton.tsx
│   │   └── ...
│   │
│   ├── forms/                         # Form components
│   │   ├── customer-form.tsx
│   │   ├── contact-form.tsx
│   │   ├── equipment-form.tsx
│   │   ├── rate-form.tsx
│   │   └── ...
│   │
│   ├── features/                      # Feature-specific components
│   │   ├── quotes/
│   │   │   ├── quote-builder/
│   │   │   │   ├── equipment-selector.tsx
│   │   │   │   ├── cost-breakdown.tsx
│   │   │   │   ├── customer-section.tsx
│   │   │   │   ├── dimensions-input.tsx
│   │   │   │   └── quote-summary.tsx
│   │   │   ├── quote-card.tsx
│   │   │   ├── quote-table.tsx
│   │   │   └── quote-pdf-preview.tsx
│   │   │
│   │   ├── inland/
│   │   │   ├── route-builder/
│   │   │   │   ├── destination-block.tsx
│   │   │   │   ├── load-block.tsx
│   │   │   │   ├── cargo-item.tsx
│   │   │   │   └── accessorial-charges.tsx
│   │   │   ├── truck-selector.tsx
│   │   │   ├── route-map.tsx
│   │   │   └── inland-pdf-preview.tsx
│   │   │
│   │   ├── customers/
│   │   │   ├── customer-card.tsx
│   │   │   ├── customer-table.tsx
│   │   │   ├── contact-list.tsx
│   │   │   └── activity-timeline.tsx
│   │   │
│   │   ├── equipment/
│   │   │   ├── equipment-table.tsx
│   │   │   ├── rate-matrix.tsx
│   │   │   └── dimension-editor.tsx
│   │   │
│   │   └── dashboard/
│   │       ├── stats-cards.tsx
│   │       ├── recent-quotes.tsx
│   │       └── pipeline-summary.tsx
│   │
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── mobile-nav.tsx
│   │   └── breadcrumbs.tsx
│   │
│   └── shared/
│       ├── data-table.tsx
│       ├── search-input.tsx
│       ├── status-badge.tsx
│       ├── empty-state.tsx
│       ├── loading-state.tsx
│       ├── error-boundary.tsx
│       └── confirm-dialog.tsx
│
├── lib/
│   ├── api/                           # API client & tRPC
│   │   ├── trpc.ts
│   │   ├── routers/
│   │   │   ├── customers.ts
│   │   │   ├── quotes.ts
│   │   │   ├── equipment.ts
│   │   │   ├── inland.ts
│   │   │   └── settings.ts
│   │   └── middleware.ts
│   │
│   ├── db/                            # Database utilities
│   │   ├── client.ts                  # Supabase client
│   │   ├── types.ts                   # Generated types
│   │   └── queries/
│   │       ├── customers.ts
│   │       ├── quotes.ts
│   │       └── equipment.ts
│   │
│   ├── services/                      # Business logic
│   │   ├── quote-calculator.ts
│   │   ├── truck-recommender.ts
│   │   ├── dimension-converter.ts
│   │   ├── pdf-generator.ts
│   │   └── route-calculator.ts
│   │
│   ├── utils/                         # Utilities
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   ├── cn.ts
│   │   └── constants.ts
│   │
│   ├── hooks/                         # Custom hooks
│   │   ├── use-customers.ts
│   │   ├── use-quotes.ts
│   │   ├── use-equipment.ts
│   │   ├── use-toast.ts
│   │   └── use-debounce.ts
│   │
│   └── store/                         # Zustand stores
│       ├── quote-store.ts
│       ├── inland-store.ts
│       └── ui-store.ts
│
├── types/
│   ├── database.ts                    # Supabase generated types
│   ├── api.ts                         # API types
│   └── forms.ts                       # Form schemas (Zod)
│
├── styles/
│   └── globals.css
│
├── public/
│   └── ...
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── supabase/
│   ├── migrations/                    # Ordered migrations
│   │   ├── 00001_initial_schema.sql
│   │   ├── 00002_customers.sql
│   │   └── ...
│   └── seed.sql
│
└── config files...
```

### 2.3 Database Architecture

#### New Unified Schema

```sql
-- =============================================
-- CORE: Organization & Users
-- =============================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CRM: Unified Customer System
-- =============================================

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  -- Company info
  company_name TEXT NOT NULL,
  trading_name TEXT,  -- DBA name
  industry TEXT,
  website TEXT,

  -- Primary address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',

  -- Billing (can be different)
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_postal_code TEXT,
  billing_country TEXT DEFAULT 'US',

  -- Business info
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  credit_limit DECIMAL(12,2),

  -- Classification
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect', 'lead', 'vip', 'churned')),
  tags TEXT[] DEFAULT '{}',

  -- Metadata
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Computed fields (updated by triggers)
  total_quotes INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  last_quote_date TIMESTAMPTZ
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,

  -- Personal info
  first_name TEXT NOT NULL,
  last_name TEXT,
  title TEXT,
  department TEXT,

  -- Contact methods
  email TEXT,
  phone TEXT,
  mobile TEXT,

  -- Role & preferences
  role TEXT DEFAULT 'general' CHECK (role IN ('primary', 'billing', 'operations', 'technical', 'decision_maker', 'general')),
  is_primary BOOLEAN DEFAULT FALSE,
  preferred_contact_method TEXT DEFAULT 'email',

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EQUIPMENT: Makes, Models, Rates
-- =============================================

CREATE TABLE equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,  -- Icon identifier
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE makes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  popularity_rank INTEGER DEFAULT 999,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id UUID REFERENCES makes(id) ON DELETE CASCADE NOT NULL,
  equipment_type_id UUID REFERENCES equipment_types(id),
  name TEXT NOT NULL,
  full_name TEXT,  -- "Caterpillar 320"
  year_start INTEGER,
  year_end INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipment_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES models(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Weight (stored in lbs)
  operating_weight_lbs DECIMAL(12,2),
  shipping_weight_lbs DECIMAL(12,2),

  -- Transport dimensions (stored in inches)
  transport_length_in DECIMAL(8,2),
  transport_width_in DECIMAL(8,2),
  transport_height_in DECIMAL(8,2),

  -- Overall dimensions (stored in inches)
  overall_length_in DECIMAL(8,2),
  overall_width_in DECIMAL(8,2),
  overall_height_in DECIMAL(8,2),

  -- Additional specs
  track_width_in DECIMAL(8,2),
  ground_clearance_in DECIMAL(8,2),
  engine_power_hp DECIMAL(8,2),
  bucket_capacity_cuyd DECIMAL(8,2),

  -- Images
  front_image_url TEXT,
  side_image_url TEXT,

  -- Classification
  equipment_category TEXT,  -- excavator, loader, etc.

  -- Data source
  data_source TEXT,
  verified BOOLEAN DEFAULT FALSE,

  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,  -- e.g., "NJ", "SAV"
  address TEXT,
  city TEXT,
  state TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

CREATE TABLE rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES models(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,

  -- Cost breakdown (in cents to avoid floating point)
  dismantling_loading_cost INTEGER,
  loading_cost INTEGER,
  blocking_bracing_cost INTEGER,
  ncb_survey_cost INTEGER,
  local_drayage_cost INTEGER,
  chassis_cost INTEGER,
  tolls_cost INTEGER,
  escorts_cost INTEGER,
  power_wash_cost INTEGER,
  waste_disposal_cost INTEGER,

  notes TEXT,
  is_verified BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),

  UNIQUE(model_id, location_id)
);

-- =============================================
-- QUOTES: Dismantling Quotes
-- =============================================

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  -- Quote identification
  quote_number TEXT NOT NULL,

  -- Customer link
  customer_id UUID REFERENCES customers(id),
  contact_id UUID REFERENCES contacts(id),

  -- Customer snapshot (in case customer is deleted)
  customer_name TEXT NOT NULL,
  customer_company TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  billing_address JSONB,  -- Full address object

  -- Equipment (stored as JSONB array for multi-equipment)
  equipment_items JSONB NOT NULL DEFAULT '[]',
  /*
  [
    {
      "make": "Caterpillar",
      "model": "320",
      "location": "New Jersey",
      "quantity": 1,
      "costs": { ... },
      "dimensions": { ... }
    }
  ]
  */

  -- Pricing
  subtotal INTEGER NOT NULL,  -- In cents
  margin_percentage DECIMAL(5,2) DEFAULT 15,
  margin_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,

  -- Miscellaneous fees
  misc_fees JSONB DEFAULT '[]',

  -- Status & workflow
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised')),

  -- Dates
  quote_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_quote_id UUID REFERENCES quotes(id),

  -- Notes
  internal_notes TEXT,
  customer_notes TEXT,
  terms_and_conditions TEXT,

  -- PDF
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(organization_id, quote_number)
);

-- =============================================
-- INLAND: Transportation Quotes
-- =============================================

CREATE TABLE truck_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Capacity limits
  max_weight_lbs INTEGER,
  max_length_in INTEGER,
  max_width_in INTEGER,
  max_height_in INTEGER,

  -- Pricing
  rate_multiplier DECIMAL(4,2) DEFAULT 1.0,

  -- Display
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE accessorial_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  default_amount INTEGER,  -- In cents
  is_percentage BOOLEAN DEFAULT FALSE,
  billing_unit TEXT DEFAULT 'flat' CHECK (billing_unit IN ('flat', 'hour', 'day', 'way', 'week', 'month', 'stop', 'mile')),

  -- Conditions
  condition_text TEXT,
  free_time_hours INTEGER,

  -- Display
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inland_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  -- Quote identification
  quote_number TEXT NOT NULL,
  work_order_number TEXT,

  -- Customer link
  customer_id UUID REFERENCES customers(id),
  contact_id UUID REFERENCES contacts(id),

  -- Customer snapshot
  customer_name TEXT NOT NULL,
  customer_company TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  billing_address JSONB,

  -- Destinations (supports multi-destination)
  destinations JSONB NOT NULL DEFAULT '[]',
  /*
  [
    {
      "id": "uuid",
      "name": "Destination A",
      "pickup": { "address": "...", "lat": 0, "lng": 0 },
      "dropoff": { "address": "...", "lat": 0, "lng": 0 },
      "stops": [],
      "route": { "distance_miles": 0, "duration_minutes": 0, "polyline": "..." },
      "loads": [
        {
          "truck_type_id": "uuid",
          "cargo_items": [...],
          "accessorial_charges": [...]
        }
      ],
      "pricing": {
        "rate_per_mile": 350,
        "base_rate": 0,
        "fuel_surcharge_percent": 15,
        "margin_percentage": 15
      }
    }
  ]
  */

  -- Totals
  line_haul_total INTEGER NOT NULL,
  fuel_surcharge_total INTEGER NOT NULL,
  accessorial_total INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  margin_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised')),

  -- Dates
  quote_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,

  -- Notes
  internal_notes TEXT,
  customer_notes TEXT,
  special_instructions TEXT,

  -- PDF & Map
  pdf_url TEXT,
  map_images JSONB DEFAULT '[]',  -- Array of base64 or URLs per destination

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(organization_id, quote_number)
);

-- =============================================
-- CRM: Activities & Reminders
-- =============================================

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  -- Links
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  inland_quote_id UUID REFERENCES inland_quotes(id) ON DELETE SET NULL,

  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'quote_sent', 'quote_accepted', 'quote_rejected', 'follow_up', 'status_change')),
  title TEXT NOT NULL,
  description TEXT,

  -- Call/meeting specific
  duration_minutes INTEGER,
  outcome TEXT CHECK (outcome IN ('completed', 'no_answer', 'voicemail', 'callback_requested', 'interested', 'not_interested', 'pending')),

  -- Follow-up
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  -- Links
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

  -- Reminder details
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  due_time TIME,

  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'snoozed', 'cancelled')),

  -- Snooze tracking
  snoozed_until TIMESTAMPTZ,
  snooze_count INTEGER DEFAULT 0,

  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id)
);

-- =============================================
-- SETTINGS
-- =============================================

CREATE TABLE organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) UNIQUE NOT NULL,

  -- Branding
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#4F46E5',
  secondary_color TEXT DEFAULT '#10B981',

  -- Contact
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Quote settings
  quote_validity_days INTEGER DEFAULT 30,
  default_margin_percentage DECIMAL(5,2) DEFAULT 15,
  quote_terms_and_conditions TEXT,
  quote_footer_text TEXT,

  -- Dimension conversion thresholds
  dimension_threshold_length INTEGER DEFAULT 70,
  dimension_threshold_width INTEGER DEFAULT 16,
  dimension_threshold_height INTEGER DEFAULT 18,

  -- Inland settings
  default_rate_per_mile INTEGER DEFAULT 350,  -- In cents
  default_fuel_surcharge_percent DECIMAL(5,2) DEFAULT 15,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rate_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  name TEXT NOT NULL,

  -- Conditions
  min_miles INTEGER,
  max_miles INTEGER,
  min_weight_lbs INTEGER,
  max_weight_lbs INTEGER,

  -- Pricing
  rate_per_mile INTEGER,  -- In cents
  base_rate INTEGER,
  rate_multiplier DECIMAL(4,2) DEFAULT 1.0,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fuel_surcharge_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  effective_date DATE NOT NULL,
  fuel_price_per_gallon DECIMAL(6,3) NOT NULL,
  surcharge_percentage DECIMAL(5,2) NOT NULL,
  source TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SUPPORT
-- =============================================

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,

  ticket_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  type TEXT DEFAULT 'feature' CHECK (type IN ('feature', 'bug', 'enhancement', 'question')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed', 'wont_fix')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  page TEXT,  -- Which page the ticket is about
  screenshot_url TEXT,

  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(organization_id, ticket_number)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_status ON customers(organization_id, status);
CREATE INDEX idx_customers_search ON customers USING gin(to_tsvector('english', company_name || ' ' || COALESCE(trading_name, '')));

CREATE INDEX idx_contacts_customer ON contacts(customer_id);
CREATE INDEX idx_contacts_email ON contacts(email);

CREATE INDEX idx_quotes_org ON quotes(organization_id);
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(organization_id, status);
CREATE INDEX idx_quotes_date ON quotes(organization_id, quote_date DESC);

CREATE INDEX idx_inland_quotes_org ON inland_quotes(organization_id);
CREATE INDEX idx_inland_quotes_customer ON inland_quotes(customer_id);

CREATE INDEX idx_activities_customer ON activities(customer_id);
CREATE INDEX idx_activities_date ON activities(organization_id, created_at DESC);

CREATE INDEX idx_reminders_due ON reminders(organization_id, due_date) WHERE status = 'pending';

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_quotes ENABLE ROW LEVEL SECURITY;
-- ... (add for all tables)

-- Example RLS policy for customers
CREATE POLICY "Users can view their organization's customers"
  ON customers FOR SELECT
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert customers in their organization"
  ON customers FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ... (similar policies for all tables)
```

---

## Part 3: UI/UX Design System

### 3.1 Design Principles

1. **Consistency** - Same patterns everywhere
2. **Clarity** - Information hierarchy is clear
3. **Efficiency** - Minimize clicks for common tasks
4. **Feedback** - Every action has visible response
5. **Accessibility** - WCAG 2.1 AA compliant

### 3.2 Color System

```css
/* Primary - Brand */
--primary-50: #EEF2FF;
--primary-100: #E0E7FF;
--primary-500: #6366F1;
--primary-600: #4F46E5;
--primary-700: #4338CA;

/* Secondary - Success */
--secondary-50: #ECFDF5;
--secondary-500: #10B981;
--secondary-600: #059669;

/* Neutral - Grays */
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;

/* Semantic */
--error-500: #EF4444;
--warning-500: #F59E0B;
--info-500: #3B82F6;
```

### 3.3 Typography Scale

```css
/* Font Family */
font-family: 'Inter', -apple-system, sans-serif;

/* Headings */
--text-h1: 2.25rem (36px) / 700 / 1.2
--text-h2: 1.875rem (30px) / 600 / 1.3
--text-h3: 1.5rem (24px) / 600 / 1.4
--text-h4: 1.25rem (20px) / 600 / 1.4
--text-h5: 1.125rem (18px) / 600 / 1.5

/* Body */
--text-lg: 1.125rem (18px) / 400 / 1.6
--text-base: 1rem (16px) / 400 / 1.6
--text-sm: 0.875rem (14px) / 400 / 1.5
--text-xs: 0.75rem (12px) / 400 / 1.5

/* Labels */
--text-label: 0.875rem (14px) / 500 / 1.4
```

### 3.4 Spacing Scale

```css
--space-0: 0
--space-1: 0.25rem (4px)
--space-2: 0.5rem (8px)
--space-3: 0.75rem (12px)
--space-4: 1rem (16px)
--space-5: 1.25rem (20px)
--space-6: 1.5rem (24px)
--space-8: 2rem (32px)
--space-10: 2.5rem (40px)
--space-12: 3rem (48px)
--space-16: 4rem (64px)
```

### 3.5 Component Library

#### Buttons
```tsx
// Variants: primary, secondary, outline, ghost, destructive
// Sizes: sm, md, lg
<Button variant="primary" size="md">Save Quote</Button>
```

#### Cards
```tsx
<Card>
  <CardHeader>
    <CardTitle>Quote Summary</CardTitle>
    <CardDescription>Review before sending</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

#### Data Tables
```tsx
<DataTable
  columns={columns}
  data={data}
  searchable
  sortable
  pagination
  selectable
  actions={[
    { label: 'Edit', onClick: handleEdit },
    { label: 'Delete', onClick: handleDelete, destructive: true }
  ]}
/>
```

#### Forms
```tsx
<Form onSubmit={handleSubmit}>
  <FormField name="company_name" label="Company Name" required>
    <Input placeholder="Enter company name" />
  </FormField>
  <FormField name="email" label="Email">
    <Input type="email" />
  </FormField>
</Form>
```

---

## Part 4: Screens Catalog

### 4.1 Authentication Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/login` | Email/password login with OAuth options |
| Register | `/register` | New account creation |
| Forgot Password | `/forgot-password` | Password reset flow |
| Verify Email | `/verify-email` | Email verification |

### 4.2 Dashboard Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Dashboard Home | `/dashboard` | Overview with key metrics, recent quotes, pipeline summary |

**Dashboard Metrics:**
- Total quotes this month
- Revenue (accepted quotes)
- Pending quotes
- Pipeline by status

### 4.3 Equipment Module Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Equipment List | `/equipment` | All equipment with search/filter |
| Equipment Detail | `/equipment/[id]` | Single equipment with all models |
| Rate Management | `/equipment/rates` | Matrix view of rates by location |
| Dimensions | `/equipment/dimensions` | Dimension data management |

### 4.4 Quotes Module Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Quotes List | `/quotes` | All dismantling quotes with filters |
| New Quote | `/quotes/new` | Quote builder wizard |
| Quote Detail | `/quotes/[id]` | View quote with actions |
| Edit Quote | `/quotes/[id]/edit` | Edit existing quote |
| Pipeline | `/quotes/pipeline` | Kanban board view |

**Quote Builder Steps:**
1. Select Customer (or create new)
2. Add Equipment Items (multi-equipment support)
3. Configure Costs (per item)
4. Review & Pricing (margins, misc fees)
5. Preview & Send

### 4.5 Inland Transportation Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Inland List | `/inland` | All inland quotes |
| New Inland Quote | `/inland/new` | Multi-destination builder |
| Inland Detail | `/inland/[id]` | View with map |
| Inland Settings | `/inland/settings` | Truck types, accessorials, rate tiers |

**Inland Quote Builder Steps:**
1. Select Customer
2. Add Destinations (multi-destination)
   - Pickup & Dropoff
   - Add Stops
   - Calculate Route
3. Add Loads per Destination
   - Select Truck Type
   - Add Cargo Items
   - Add Accessorials
4. Review Pricing
5. Preview & Send

### 4.6 Customer Module Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Customer List | `/customers` | All customers with search/filter |
| New Customer | `/customers/new` | Create customer form |
| Customer Detail | `/customers/[id]` | Customer overview |
| Customer Quotes | `/customers/[id]/quotes` | All quotes for customer |
| Customer Activity | `/customers/[id]/activity` | Activity timeline |
| Import Customers | `/customers/import` | Bulk CSV import |

### 4.7 Activity Module Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Activity Log | `/activity` | All activities across customers |
| Reminders | `/activity/reminders` | Follow-up reminder management |

### 4.8 Settings Screens

| Screen | Route | Description |
|--------|-------|-------------|
| General Settings | `/settings` | Organization settings |
| Branding | `/settings/branding` | Logo, colors, etc. |
| Templates | `/settings/templates` | Quote templates |
| Locations | `/settings/locations` | Manage locations |
| Rate Tiers | `/settings/rate-tiers` | Distance/weight-based tiers |
| Users | `/settings/users` | Team management |

### 4.9 Support Screens

| Screen | Route | Description |
|--------|-------|-------------|
| Tickets | `/support` | Feature requests & bugs |
| Updates | `/support/updates` | What's new |

---

## Part 5: API Endpoints

### 5.1 tRPC Router Structure

```typescript
// lib/api/routers/index.ts
export const appRouter = router({
  customers: customersRouter,
  contacts: contactsRouter,
  equipment: equipmentRouter,
  quotes: quotesRouter,
  inland: inlandRouter,
  activities: activitiesRouter,
  reminders: remindersRouter,
  settings: settingsRouter,
  support: supportRouter,
});
```

### 5.2 Customer Router

```typescript
// lib/api/routers/customers.ts
export const customersRouter = router({
  // Queries
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      status: z.enum(['active', 'inactive', 'prospect', 'lead', 'vip', 'churned']).optional(),
      limit: z.number().default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => { ... }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => { ... }),

  getWithContacts: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => { ... }),

  getQuotes: protectedProcedure
    .input(z.object({
      customerId: z.string().uuid(),
      type: z.enum(['dismantling', 'inland', 'all']).default('all'),
    }))
    .query(async ({ ctx, input }) => { ... }),

  // Mutations
  create: protectedProcedure
    .input(customerCreateSchema)
    .mutation(async ({ ctx, input }) => { ... }),

  update: protectedProcedure
    .input(customerUpdateSchema)
    .mutation(async ({ ctx, input }) => { ... }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { ... }),

  bulkImport: protectedProcedure
    .input(z.array(customerCreateSchema))
    .mutation(async ({ ctx, input }) => { ... }),
});
```

### 5.3 Quotes Router

```typescript
// lib/api/routers/quotes.ts
export const quotesRouter = router({
  // Queries
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional(),
      customerId: z.string().uuid().optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      limit: z.number().default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => { ... }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => { ... }),

  getNextNumber: protectedProcedure
    .query(async ({ ctx }) => { ... }),

  getPipelineStats: protectedProcedure
    .query(async ({ ctx }) => { ... }),

  // Mutations
  create: protectedProcedure
    .input(quoteCreateSchema)
    .mutation(async ({ ctx, input }) => { ... }),

  update: protectedProcedure
    .input(quoteUpdateSchema)
    .mutation(async ({ ctx, input }) => { ... }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']),
    }))
    .mutation(async ({ ctx, input }) => { ... }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { ... }),

  createRevision: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { ... }),

  generatePdf: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { ... }),

  sendEmail: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      recipientEmail: z.string().email(),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => { ... }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { ... }),
});
```

### 5.4 Equipment Router

```typescript
// lib/api/routers/equipment.ts
export const equipmentRouter = router({
  // Makes
  makes: router({
    list: protectedProcedure.query(async ({ ctx }) => { ... }),
    create: protectedProcedure.input(makeSchema).mutation(async ({ ctx, input }) => { ... }),
    update: protectedProcedure.input(makeUpdateSchema).mutation(async ({ ctx, input }) => { ... }),
    delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => { ... }),
  }),

  // Models
  models: router({
    list: protectedProcedure
      .input(z.object({ makeId: z.string().uuid().optional() }))
      .query(async ({ ctx, input }) => { ... }),
    getWithDimensions: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ ctx, input }) => { ... }),
    create: protectedProcedure.input(modelSchema).mutation(async ({ ctx, input }) => { ... }),
    update: protectedProcedure.input(modelUpdateSchema).mutation(async ({ ctx, input }) => { ... }),
  }),

  // Dimensions
  dimensions: router({
    get: protectedProcedure
      .input(z.object({ modelId: z.string().uuid() }))
      .query(async ({ ctx, input }) => { ... }),
    upsert: protectedProcedure
      .input(dimensionsSchema)
      .mutation(async ({ ctx, input }) => { ... }),
  }),

  // Rates
  rates: router({
    getMatrix: protectedProcedure
      .input(z.object({
        makeId: z.string().uuid().optional(),
        locationId: z.string().uuid().optional(),
      }))
      .query(async ({ ctx, input }) => { ... }),
    update: protectedProcedure
      .input(rateUpdateSchema)
      .mutation(async ({ ctx, input }) => { ... }),
    bulkUpdate: protectedProcedure
      .input(z.array(rateUpdateSchema))
      .mutation(async ({ ctx, input }) => { ... }),
  }),
});
```

### 5.5 Inland Router

```typescript
// lib/api/routers/inland.ts
export const inlandRouter = router({
  quotes: router({
    list: protectedProcedure.input(listSchema).query(async ({ ctx, input }) => { ... }),
    getById: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => { ... }),
    create: protectedProcedure.input(inlandQuoteSchema).mutation(async ({ ctx, input }) => { ... }),
    update: protectedProcedure.input(inlandQuoteUpdateSchema).mutation(async ({ ctx, input }) => { ... }),
    delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => { ... }),
  }),

  truckTypes: router({
    list: protectedProcedure.query(async ({ ctx }) => { ... }),
    create: protectedProcedure.input(truckTypeSchema).mutation(async ({ ctx, input }) => { ... }),
    update: protectedProcedure.input(truckTypeUpdateSchema).mutation(async ({ ctx, input }) => { ... }),
  }),

  accessorialTypes: router({
    list: protectedProcedure.query(async ({ ctx }) => { ... }),
    create: protectedProcedure.input(accessorialSchema).mutation(async ({ ctx, input }) => { ... }),
    update: protectedProcedure.input(accessorialUpdateSchema).mutation(async ({ ctx, input }) => { ... }),
  }),

  calculateRoute: protectedProcedure
    .input(z.object({
      pickup: addressSchema,
      dropoff: addressSchema,
      stops: z.array(addressSchema).optional(),
    }))
    .mutation(async ({ ctx, input }) => { ... }),

  recommendTruck: protectedProcedure
    .input(z.object({
      cargoItems: z.array(cargoItemSchema),
    }))
    .query(async ({ ctx, input }) => { ... }),
});
```

---

## Part 6: Data Migration Strategy

### 6.1 Migration Approach

**IMPORTANT**: The old database is in active use. We MUST NOT modify it during migration.

#### Phase 1: New Database Setup
1. Create new Supabase project
2. Run new schema migrations
3. Set up RLS policies
4. Configure authentication

#### Phase 2: Data Export from Old System
```sql
-- Export scripts (run on OLD database, READ-ONLY)

-- Export companies (will become customers)
COPY (
  SELECT
    id as legacy_id,
    name as company_name,
    industry,
    website,
    phone,
    address,
    city,
    state,
    zip as postal_code,
    billing_address as billing_address_line1,
    billing_city,
    billing_state,
    billing_zip as billing_postal_code,
    payment_terms,
    tax_id,
    tags,
    status,
    notes,
    created_at
  FROM companies
) TO '/tmp/companies_export.csv' WITH CSV HEADER;

-- Export contacts
COPY (
  SELECT * FROM contacts
) TO '/tmp/contacts_export.csv' WITH CSV HEADER;

-- Export customers (legacy table - will be merged)
COPY (
  SELECT * FROM customers
) TO '/tmp/customers_legacy_export.csv' WITH CSV HEADER;

-- Continue for all tables...
```

#### Phase 3: Data Transform & Import
```typescript
// scripts/migrate-data.ts
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

async function migrateCustomers() {
  // Read exported companies
  const companies = parse(fs.readFileSync('/tmp/companies_export.csv'), { columns: true });

  // Read legacy customers
  const legacyCustomers = parse(fs.readFileSync('/tmp/customers_legacy_export.csv'), { columns: true });

  // Merge logic: Match by company name or email
  const mergedCustomers = mergeCustomerData(companies, legacyCustomers);

  // Insert into new database
  for (const customer of mergedCustomers) {
    const { data, error } = await newSupabase
      .from('customers')
      .insert({
        company_name: customer.name,
        // ... map all fields
        legacy_id: customer.legacy_id,  // Keep reference for quote migration
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to migrate customer:', customer.name, error);
      continue;
    }

    // Migrate contacts for this customer
    await migrateContacts(customer.legacy_id, data.id);
  }
}

// Similar functions for quotes, equipment, etc.
```

#### Phase 4: Validation
```typescript
// scripts/validate-migration.ts
async function validateMigration() {
  // Count checks
  const oldCompanyCount = await oldDb.from('companies').select('id', { count: 'exact' });
  const newCustomerCount = await newDb.from('customers').select('id', { count: 'exact' });

  console.log(`Companies: ${oldCompanyCount.count} → Customers: ${newCustomerCount.count}`);

  // Spot checks
  const sampleOldQuotes = await oldDb.from('quote_history').select('*').limit(10);
  for (const oldQuote of sampleOldQuotes.data) {
    const newQuote = await newDb.from('quotes')
      .select('*')
      .eq('legacy_id', oldQuote.id)
      .single();

    // Compare key fields
    if (newQuote.data.total_amount !== oldQuote.total_with_margin * 100) {
      console.error('Quote amount mismatch:', oldQuote.id);
    }
  }
}
```

#### Phase 5: Cutover Plan
1. Schedule maintenance window (e.g., Friday evening)
2. Announce to users
3. Final data export from old system
4. Run migration scripts
5. Validate data integrity
6. Update DNS/deployment to new app
7. Monitor for issues
8. Keep old system read-only for 30 days (rollback option)

### 6.2 ID Mapping Table

```sql
-- Create in new database to track old→new ID mappings
CREATE TABLE migration_id_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  old_id TEXT NOT NULL,
  new_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(table_name, old_id)
);

-- Example usage:
INSERT INTO migration_id_map (table_name, old_id, new_id)
VALUES ('companies', 'old-uuid-123', 'new-uuid-456');
```

---

## Part 7: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal**: Set up project infrastructure

- [ ] Initialize Next.js 15 project
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Set up Tailwind CSS 4
- [ ] Create new Supabase project
- [ ] Design and create database schema
- [ ] Set up Supabase Auth
- [ ] Configure tRPC
- [ ] Create base component library (buttons, inputs, cards)
- [ ] Set up Zustand stores
- [ ] Create layout components (sidebar, header)
- [ ] Implement authentication flows

**Deliverable**: Working authentication with basic dashboard shell

### Phase 2: Customer Module (Week 3-4)
**Goal**: Unified customer management

- [ ] Customer list page with search/filter
- [ ] Customer detail page
- [ ] Contact management within customer
- [ ] Customer form (create/edit)
- [ ] Bulk import functionality
- [ ] Activity timeline component
- [ ] Migrate old companies + customers data

**Deliverable**: Fully functional customer CRM

### Phase 3: Equipment Module (Week 5-6)
**Goal**: Equipment & rate management

- [ ] Makes management
- [ ] Models management
- [ ] Dimensions management
- [ ] Rate matrix view
- [ ] Inline rate editing
- [ ] Location management
- [ ] Migrate equipment data

**Deliverable**: Complete equipment database management

### Phase 4: Dismantling Quotes (Week 7-9)
**Goal**: Quote builder & management

- [ ] Quote builder wizard (5 steps)
- [ ] Equipment selector component
- [ ] Cost breakdown component
- [ ] Multi-equipment support
- [ ] Margin calculator
- [ ] PDF generator (using @react-pdf/renderer)
- [ ] Quote list with filters
- [ ] Quote detail page
- [ ] Pipeline (Kanban) view
- [ ] Quote status workflow
- [ ] Migrate quote history

**Deliverable**: Complete dismantling quote system

### Phase 5: Inland Transportation (Week 10-12)
**Goal**: Multi-destination quote builder

- [ ] Destination block component
- [ ] Google Places integration
- [ ] Route calculation API
- [ ] Map component with polylines
- [ ] Load block component
- [ ] Cargo item management
- [ ] Truck type selector with recommendations
- [ ] Accessorial charges management
- [ ] Inland PDF generator
- [ ] Inland quote list & detail
- [ ] Inland settings page
- [ ] Migrate inland quotes

**Deliverable**: Complete inland transportation module

### Phase 6: Activity & Reminders (Week 13)
**Goal**: CRM activity tracking

- [ ] Activity log component
- [ ] Activity form (call, email, meeting, note)
- [ ] Reminder management
- [ ] Due date notifications
- [ ] Activity timeline in customer detail
- [ ] Migrate activities

**Deliverable**: Activity tracking system

### Phase 7: Settings & Admin (Week 14)
**Goal**: Configuration & administration

- [ ] Organization settings
- [ ] Branding configuration
- [ ] Quote templates
- [ ] Rate tier management
- [ ] Fuel surcharge index
- [ ] User management (if multi-user)
- [ ] Migrate settings

**Deliverable**: Complete admin panel

### Phase 8: Polish & Testing (Week 15-16)
**Goal**: Quality assurance

- [ ] Write unit tests (Vitest)
- [ ] Write E2E tests (Playwright)
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Mobile responsiveness review
- [ ] Error handling & edge cases
- [ ] Loading states & skeletons
- [ ] Documentation

**Deliverable**: Production-ready application

### Phase 9: Migration & Launch (Week 17)
**Goal**: Go live

- [ ] Final data migration
- [ ] Data validation
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor & fix issues
- [ ] User training (if needed)

**Deliverable**: Live application with migrated data

---

## Part 8: Work Standards

### 8.1 Code Standards

#### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` if necessary)
- All functions must have return types
- Use interfaces for objects, types for unions

#### React
- Functional components only
- Custom hooks for reusable logic
- Props interfaces defined
- Server components by default, 'use client' only when needed

#### File Naming
- Components: `PascalCase.tsx`
- Utilities: `kebab-case.ts`
- Types: `types.ts` or `*.types.ts`
- Tests: `*.test.ts` or `*.spec.ts`

### 8.2 Git Workflow

```
main (production)
  └── develop (staging)
       ├── feature/customer-module
       ├── feature/quote-builder
       └── fix/rate-calculation
```

#### Commit Messages
```
feat: add customer import functionality
fix: correct rate calculation for multi-equipment
refactor: extract truck recommendation logic
docs: update API documentation
test: add quote builder e2e tests
```

### 8.3 Testing Requirements

- Unit tests for all business logic (services)
- Integration tests for API routes
- E2E tests for critical flows:
  - User authentication
  - Create customer
  - Create dismantling quote
  - Create inland quote
  - Update quote status

### 8.4 PR Requirements

- [ ] Tests pass
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Meaningful PR description
- [ ] Screenshots for UI changes
- [ ] Database migration included if schema changes

---

## Part 9: Risk Mitigation

### 9.1 Data Migration Risks

| Risk | Mitigation |
|------|------------|
| Data loss | Keep old database read-only for 30 days |
| ID reference breaks | Use migration_id_map table |
| Duplicate customers | Implement merge logic with manual review |
| Quote amounts mismatch | Validate all amounts after migration |

### 9.2 Technical Risks

| Risk | Mitigation |
|------|------------|
| Performance issues | Implement pagination, use database indexes |
| PDF generation slow | Generate async, cache results |
| Google API rate limits | Implement caching, debounce requests |
| Large file uploads | Use Supabase Storage with direct uploads |

### 9.3 User Adoption Risks

| Risk | Mitigation |
|------|------------|
| Users prefer old UI | Keep familiar patterns, add improvements gradually |
| Learning curve | Provide in-app guidance, tooltips |
| Feature regression | Thoroughly test all existing functionality |

---

## Part 10: Success Metrics

### 10.1 Technical Metrics
- [ ] Page load < 2 seconds
- [ ] Quote generation < 5 seconds
- [ ] 0 critical bugs in production
- [ ] 90%+ test coverage on business logic
- [ ] Lighthouse score > 90

### 10.2 User Metrics
- [ ] Quote creation time reduced by 30%
- [ ] Customer lookup time reduced by 50%
- [ ] 0 duplicate customer entries
- [ ] All existing features functional

---

## Appendix A: Component Specifications

### Quote Builder Component

```tsx
interface QuoteBuilderProps {
  customerId?: string;
  onSave: (quote: Quote) => void;
  onCancel: () => void;
}

// Steps
enum QuoteBuilderStep {
  CUSTOMER = 0,
  EQUIPMENT = 1,
  COSTS = 2,
  REVIEW = 3,
  PREVIEW = 4,
}

// State
interface QuoteBuilderState {
  step: QuoteBuilderStep;
  customer: Customer | null;
  equipmentItems: EquipmentItem[];
  miscFees: MiscFee[];
  marginPercentage: number;
  internalNotes: string;
  customerNotes: string;
}
```

### Customer Selector Component

```tsx
interface CustomerSelectorProps {
  value?: string;  // Customer ID
  onChange: (customerId: string) => void;
  onCreateNew: () => void;
}

// Features
- Search by company name, contact name, email
- Recently used customers
- Create new customer inline
- Show contact info in dropdown
```

---

## Appendix B: Database Queries Reference

### Common Queries

```sql
-- Get customer with all related data
SELECT
  c.*,
  (SELECT COUNT(*) FROM contacts WHERE customer_id = c.id) as contact_count,
  (SELECT COUNT(*) FROM quotes WHERE customer_id = c.id) as quote_count,
  (SELECT SUM(total_amount) FROM quotes WHERE customer_id = c.id AND status = 'accepted') as total_revenue,
  (SELECT MAX(quote_date) FROM quotes WHERE customer_id = c.id) as last_quote_date
FROM customers c
WHERE c.id = $1;

-- Get pipeline stats
SELECT
  status,
  COUNT(*) as count,
  SUM(total_amount) as total_value
FROM quotes
WHERE organization_id = $1
  AND quote_date >= NOW() - INTERVAL '30 days'
GROUP BY status;

-- Get rate matrix
SELECT
  m.id as model_id,
  m.name as model_name,
  mk.name as make_name,
  l.name as location_name,
  r.*
FROM rates r
JOIN models m ON r.model_id = m.id
JOIN makes mk ON m.make_id = mk.id
JOIN locations l ON r.location_id = l.id
WHERE mk.organization_id = $1
ORDER BY mk.name, m.name, l.sort_order;
```

---

## Appendix C: Environment Variables

```env
# Supabase (New Instance)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Google APIs
GOOGLE_MAPS_API_KEY=xxx
GOOGLE_ROUTES_API_KEY=xxx

# Email (Resend)
RESEND_API_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=https://app.dismantlepro.com
```

---

*Document Version: 1.0*
*Created: January 2026*
*Last Updated: January 2026*
