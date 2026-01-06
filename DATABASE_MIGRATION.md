# Database Architecture & Migration Plan

A comprehensive guide for the database setup, schema design, and migration from the old system to the new Dismantle Pro application.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current Database (Old)](#2-current-database-old)
3. [New Database Schema](#3-new-database-schema)
4. [Data Mapping (Old → New)](#4-data-mapping-old--new)
5. [Migration Process](#5-migration-process)
6. [Migration Scripts](#6-migration-scripts)
7. [Validation & Testing](#7-validation--testing)
8. [Rollback Plan](#8-rollback-plan)
9. [Post-Migration Tasks](#9-post-migration-tasks)

---

## 1. Overview

### The Challenge
- Old database is **in active production use**
- Cannot modify or disrupt current operations
- Must preserve ALL existing data
- Need zero-downtime migration

### The Solution
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   OLD SUPABASE  │     │   NEW SUPABASE  │     │   NEW APP       │
│   (Production)  │ ──► │   (Staging)     │ ──► │   (Go Live)     │
│                 │     │                 │     │                 │
│  - Keep running │     │  - Fresh schema │     │  - Point to new │
│  - Read-only    │     │  - Migrated data│     │  - Old = backup │
│    after cutover│     │  - Validated    │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Timeline
| Phase | Duration | Activities |
|-------|----------|------------|
| Setup | Day 1 | Create new Supabase project |
| Schema | Day 1-2 | Run all migrations |
| Development | Weeks 1-20 | Build app against new DB |
| Data Migration | Week 21 | Export → Transform → Import |
| Validation | Week 21 | Verify all data integrity |
| Cutover | Week 22 | Switch to new system |
| Monitoring | Week 22+ | Keep old DB read-only 30 days |

---

## 2. Current Database (Old)

### 2.1 Existing Tables

```
OLD DATABASE STRUCTURE
══════════════════════

EQUIPMENT & RATES
├── makes                    # Equipment manufacturers
├── models                   # Equipment models (FK → makes)
├── rates                    # Base pricing (FK → makes, models)
├── rate_lookup              # VIEW combining rates + makes + models
├── location_costs           # Per-location pricing (FK → rates)
├── equipment_dimensions     # Physical specs (FK → models)
└── equipment_types          # Equipment categories

QUOTES (DISMANTLING)
├── quote_history            # Saved dismantling quotes
├── quote_draft              # Auto-saved drafts
├── quote_templates          # Default cost templates
└── company_settings         # Branding, defaults

QUOTES (INLAND)
├── inland_quotes            # Transportation quotes
├── inland_accessorial_charges  # Per-quote charges
├── inland_accessorial_types    # Charge type definitions
├── inland_equipment_types      # Truck/trailer types
├── inland_quote_stops          # Multi-stop support
├── inland_rate_settings        # Default rates
└── inland_saved_lanes          # Saved routes

CUSTOMERS (DUPLICATE SYSTEMS!)
├── customers                # Legacy customer table
├── companies                # Company management
└── contacts                 # Contacts (FK → companies)

CRM
├── activity_logs            # Call/email/meeting logs
├── follow_up_reminders      # Reminder tasks
└── saved_lanes              # Duplicate of inland_saved_lanes?

SUPPORT
└── tickets                  # Feature requests, bugs

OTHER
├── recent_equipment         # Recently used equipment
├── favorites                # User favorites (localStorage backup?)
└── various fix/migration tables
```

### 2.2 Key Issues with Old Schema

| Issue | Tables Affected | Problem |
|-------|-----------------|---------|
| Duplicate customers | `customers`, `companies` | Two separate systems for same data |
| No authentication | All tables | RLS policies are "allow all" |
| No organization support | All tables | Single-tenant only |
| Inconsistent naming | Various | Mix of conventions |
| No audit trail | All tables | No tracking of who changed what |
| Amounts in dollars | Quote tables | Floating point precision issues |
| Unorganized migrations | 45+ SQL files | No versioning, many "fix" scripts |

### 2.3 Row Counts (Estimate Before Migration)

```sql
-- Run this on OLD database to get counts
SELECT 'makes' as table_name, COUNT(*) as row_count FROM makes
UNION ALL SELECT 'models', COUNT(*) FROM models
UNION ALL SELECT 'rates', COUNT(*) FROM rates
UNION ALL SELECT 'location_costs', COUNT(*) FROM location_costs
UNION ALL SELECT 'equipment_dimensions', COUNT(*) FROM equipment_dimensions
UNION ALL SELECT 'quote_history', COUNT(*) FROM quote_history
UNION ALL SELECT 'inland_quotes', COUNT(*) FROM inland_quotes
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'companies', COUNT(*) FROM companies
UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
UNION ALL SELECT 'activity_logs', COUNT(*) FROM activity_logs
UNION ALL SELECT 'tickets', COUNT(*) FROM tickets
ORDER BY table_name;
```

---

## 3. New Database Schema

### 3.1 Schema Design Principles

1. **Organization-scoped**: All data belongs to an organization
2. **User-tracked**: Created_by, updated_by on all records
3. **Amounts in cents**: Store money as integers (cents)
4. **Unified customers**: Single customer table with contacts
5. **Proper relationships**: Foreign keys with appropriate cascades
6. **Audit-ready**: Triggers for audit logging
7. **Proper RLS**: Row-level security based on user's organization

### 3.2 Complete New Schema

```sql
-- ============================================================
-- NEW DATABASE SCHEMA - DISMANTLE PRO
-- ============================================================
-- Run these migrations in order in the NEW Supabase project
-- ============================================================


-- ============================================================
-- MIGRATION 001: EXTENSIONS AND SETUP
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- Create custom types
CREATE TYPE user_role AS ENUM ('super_admin', 'owner', 'admin', 'manager', 'member', 'viewer');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised');
CREATE TYPE customer_status AS ENUM ('active', 'inactive', 'prospect', 'lead', 'vip', 'churned');
CREATE TYPE contact_role AS ENUM ('primary', 'billing', 'operations', 'technical', 'decision_maker', 'general');
CREATE TYPE activity_type AS ENUM ('call', 'email', 'meeting', 'note', 'task', 'quote_sent', 'quote_accepted', 'quote_rejected', 'follow_up', 'status_change');
CREATE TYPE activity_outcome AS ENUM ('completed', 'no_answer', 'voicemail', 'callback_requested', 'interested', 'not_interested', 'pending');
CREATE TYPE reminder_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE reminder_status AS ENUM ('pending', 'completed', 'snoozed', 'cancelled');
CREATE TYPE ticket_type AS ENUM ('feature', 'bug', 'enhancement', 'question');
CREATE TYPE ticket_status AS ENUM ('new', 'in_progress', 'resolved', 'closed', 'wont_fix');
CREATE TYPE billing_unit AS ENUM ('flat', 'hour', 'day', 'way', 'week', 'month', 'stop', 'mile');


-- ============================================================
-- MIGRATION 002: ORGANIZATIONS AND USERS
-- ============================================================

-- Organizations (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366F1',
  secondary_color TEXT DEFAULT '#22C55E',

  -- Contact
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Settings (JSONB for flexibility)
  settings JSONB DEFAULT '{
    "quote_validity_days": 30,
    "default_margin_percentage": 15,
    "dimension_threshold_length": 70,
    "dimension_threshold_width": 16,
    "dimension_threshold_height": 18,
    "default_rate_per_mile": 350,
    "default_fuel_surcharge_percent": 15
  }'::jsonb,

  -- Quote settings
  quote_terms_and_conditions TEXT,
  quote_footer_text TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- Profile
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,

  -- Role & Status
  role user_role DEFAULT 'member',
  is_active BOOLEAN DEFAULT TRUE,

  -- Preferences
  preferences JSONB DEFAULT '{}'::jsonb,

  -- Tracking
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  description TEXT,

  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

-- Team members
CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  role TEXT DEFAULT 'member' CHECK (role IN ('manager', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (team_id, user_id)
);

-- User permissions (for custom permissions beyond role)
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  permission TEXT NOT NULL,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  UNIQUE(user_id, permission)
);


-- ============================================================
-- MIGRATION 003: CUSTOMERS AND CONTACTS
-- ============================================================

-- Customers (unified - merges old companies + customers)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

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

  -- Billing address (if different)
  billing_same_as_primary BOOLEAN DEFAULT TRUE,
  billing_address_line1 TEXT,
  billing_address_line2 TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_postal_code TEXT,
  billing_country TEXT DEFAULT 'US',

  -- Business info
  phone TEXT,
  email TEXT,
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  credit_limit_cents INTEGER,

  -- Classification
  status customer_status DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',

  -- Metadata
  notes TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- Stats (updated by triggers)
  total_quotes INTEGER DEFAULT 0,
  total_revenue_cents BIGINT DEFAULT 0,
  last_quote_date TIMESTAMPTZ,

  -- Legacy reference (for migration)
  legacy_customer_id TEXT,
  legacy_company_id TEXT,

  -- Tracking
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts
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
  role contact_role DEFAULT 'general',
  is_primary BOOLEAN DEFAULT FALSE,
  preferred_contact_method TEXT DEFAULT 'email',

  -- Metadata
  notes TEXT,

  -- Legacy reference
  legacy_contact_id TEXT,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- MIGRATION 004: EQUIPMENT AND RATES
-- ============================================================

-- Equipment types (categories)
CREATE TABLE equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,

  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, slug)
);

-- Makes (manufacturers)
CREATE TABLE makes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,

  popularity_rank INTEGER DEFAULT 999,
  is_active BOOLEAN DEFAULT TRUE,

  -- Legacy reference
  legacy_make_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

-- Models
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id UUID REFERENCES makes(id) ON DELETE CASCADE NOT NULL,
  equipment_type_id UUID REFERENCES equipment_types(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  full_name TEXT,  -- e.g., "Caterpillar 320"

  year_start INTEGER,
  year_end INTEGER,

  is_active BOOLEAN DEFAULT TRUE,

  -- Legacy reference
  legacy_model_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment dimensions
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

  -- Images (base64 or URLs)
  front_image_url TEXT,
  side_image_url TEXT,
  front_image_base64 TEXT,
  side_image_base64 TEXT,

  -- Classification
  equipment_category TEXT,

  -- Data source & verification
  data_source TEXT,
  verified BOOLEAN DEFAULT FALSE,

  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations (port/hub locations)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  code TEXT NOT NULL,  -- e.g., "NJ", "SAV", "HOU"

  address TEXT,
  city TEXT,
  state TEXT,

  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, code)
);

-- Rates (per model per location)
CREATE TABLE rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES models(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,

  -- Costs (stored in CENTS to avoid floating point issues)
  dismantling_loading_cost_cents INTEGER,
  loading_cost_cents INTEGER,
  blocking_bracing_cost_cents INTEGER,
  ncb_survey_cost_cents INTEGER,
  local_drayage_cost_cents INTEGER,
  chassis_cost_cents INTEGER,
  tolls_cost_cents INTEGER,
  escorts_cost_cents INTEGER,
  power_wash_cost_cents INTEGER,
  waste_disposal_cost_cents INTEGER,
  miscellaneous_cost_cents INTEGER,
  miscellaneous_2_cost_cents INTEGER,

  notes TEXT,
  is_verified BOOLEAN DEFAULT FALSE,

  -- Legacy reference
  legacy_rate_id TEXT,
  legacy_location_cost_id TEXT,

  -- Tracking
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(model_id, location_id)
);


-- ============================================================
-- MIGRATION 005: DISMANTLING QUOTES
-- ============================================================

-- Quotes (dismantling)
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Quote identification
  quote_number TEXT NOT NULL,

  -- Customer link
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Customer snapshot (preserved even if customer deleted)
  customer_name TEXT NOT NULL,
  customer_company TEXT,
  customer_email TEXT,
  customer_phone TEXT,

  -- Billing snapshot
  billing_address JSONB,  -- Full address object
  payment_terms TEXT,

  -- Equipment items (JSONB array for multi-equipment)
  equipment_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  /*
  [
    {
      "id": "uuid",
      "make": "Caterpillar",
      "model": "320",
      "model_id": "uuid",
      "location": "New Jersey",
      "location_id": "uuid",
      "quantity": 1,
      "costs": {
        "dismantling_loading": 5000,
        "blocking_bracing": 800,
        ...
      },
      "enabled_costs": {
        "dismantling_loading": true,
        "blocking_bracing": true,
        ...
      },
      "cost_descriptions": {
        "dismantling_loading": "Custom description",
        ...
      },
      "dimensions": {
        "weight_lbs": 50000,
        "length_in": 360,
        "width_in": 120,
        "height_in": 132
      },
      "images": {
        "front": "base64...",
        "side": "base64..."
      },
      "misc_fees": [
        { "title": "Fee", "description": "Desc", "amount": 500 }
      ]
    }
  ]
  */

  -- Pricing (all in cents)
  subtotal_cents INTEGER NOT NULL,
  margin_percentage DECIMAL(5,2) DEFAULT 15,
  margin_amount_cents INTEGER NOT NULL,
  total_amount_cents INTEGER NOT NULL,

  -- Global miscellaneous fees
  misc_fees JSONB DEFAULT '[]'::jsonb,

  -- Status & workflow
  status quote_status DEFAULT 'draft',

  -- Dates
  quote_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Versioning
  version INTEGER DEFAULT 1,
  parent_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  original_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

  -- Notes
  internal_notes TEXT,
  customer_notes TEXT,
  terms_and_conditions TEXT,

  -- PDF
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Legacy reference
  legacy_quote_id TEXT,

  -- Tracking
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, quote_number)
);

-- Quote drafts (auto-save)
CREATE TABLE quote_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Draft data (complete form state)
  draft_data JSONB NOT NULL,

  -- Auto-save tracking
  last_saved_at TIMESTAMPTZ DEFAULT NOW(),

  -- One draft per user
  UNIQUE(organization_id, user_id)
);


-- ============================================================
-- MIGRATION 006: INLAND TRANSPORTATION
-- ============================================================

-- Truck types
CREATE TABLE truck_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  trailer_type TEXT,  -- flatbed, stepdeck, lowboy, van, reefer

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

  -- Legacy reference
  legacy_equipment_type_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

-- Accessorial charge types
CREATE TABLE accessorial_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  default_amount_cents INTEGER,
  is_percentage BOOLEAN DEFAULT FALSE,
  billing_unit billing_unit DEFAULT 'flat',

  -- Conditions
  condition_text TEXT,
  free_time_hours INTEGER,

  -- Display
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  -- Legacy reference
  legacy_accessorial_type_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

-- Service types (for service items dropdown)
CREATE TABLE service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  default_price_cents INTEGER,

  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

-- Inland quotes
CREATE TABLE inland_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Quote identification
  quote_number TEXT NOT NULL,
  work_order_number TEXT,

  -- Customer link
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Customer snapshot
  customer_name TEXT NOT NULL,
  customer_company TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  billing_address JSONB,
  payment_terms TEXT,

  -- Destinations (JSONB for multi-destination support)
  destinations JSONB NOT NULL DEFAULT '[]'::jsonb,
  /*
  [
    {
      "id": "uuid",
      "name": "Destination A",
      "pickup": {
        "address": "123 Main St, Newark, NJ",
        "city": "Newark",
        "state": "NJ",
        "zip": "07102",
        "lat": 40.735657,
        "lng": -74.172367,
        "place_id": "ChIJ..."
      },
      "dropoff": {
        "address": "456 Oak Ave, Houston, TX",
        ...
      },
      "stops": [...],
      "route": {
        "distance_miles": 1450.5,
        "duration_minutes": 1320,
        "polyline": "..."
      },
      "load_blocks": [
        {
          "id": "uuid",
          "name": "Load 1",
          "truck_type_id": "uuid",
          "truck_type_name": "Flatbed",
          "cargo_items": [
            {
              "id": "uuid",
              "description": "CAT 320 Excavator",
              "cargo_type": "Equipment",
              "quantity": 1,
              "weight_lbs": 50000,
              "length_in": 360,
              "width_in": 120,
              "height_in": 132,
              "is_equipment": true,
              "equipment_make": "Caterpillar",
              "equipment_model": "320"
            }
          ],
          "service_items": [
            {
              "id": "uuid",
              "name": "Line Haul",
              "description": "Transportation",
              "price_cents": 450000,
              "quantity": 1
            }
          ],
          "accessorial_charges": [
            {
              "id": "uuid",
              "type_id": "uuid",
              "name": "Detention",
              "amount_cents": 7500,
              "billing_unit": "hour",
              "quantity": 2,
              "condition_text": "After 2 hours free time"
            }
          ]
        }
      ],
      "map_image_base64": "..."
    }
  ]
  */

  -- Totals (all in cents)
  line_haul_total_cents INTEGER NOT NULL DEFAULT 0,
  fuel_surcharge_total_cents INTEGER NOT NULL DEFAULT 0,
  accessorial_total_cents INTEGER NOT NULL DEFAULT 0,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  margin_percentage DECIMAL(5,2) DEFAULT 15,
  margin_amount_cents INTEGER NOT NULL DEFAULT 0,
  total_amount_cents INTEGER NOT NULL,

  -- Status
  status quote_status DEFAULT 'draft',

  -- Dates
  quote_date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,

  -- Notes
  internal_notes TEXT,
  customer_notes TEXT,
  special_instructions TEXT,

  -- PDF & Maps
  pdf_url TEXT,

  -- Legacy reference
  legacy_inland_quote_id TEXT,

  -- Tracking
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, quote_number)
);

-- Saved lanes (frequent routes)
CREATE TABLE saved_lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,

  -- Origin
  origin_address TEXT NOT NULL,
  origin_city TEXT,
  origin_state TEXT,
  origin_zip TEXT,
  origin_lat DECIMAL(10,8),
  origin_lng DECIMAL(11,8),
  origin_place_id TEXT,

  -- Destination
  destination_address TEXT NOT NULL,
  destination_city TEXT,
  destination_state TEXT,
  destination_zip TEXT,
  destination_lat DECIMAL(10,8),
  destination_lng DECIMAL(11,8),
  destination_place_id TEXT,

  -- Route info
  distance_miles DECIMAL(10,2),
  typical_rate_per_mile_cents INTEGER,

  -- Usage
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  is_favorite BOOLEAN DEFAULT FALSE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate tiers (distance/weight-based pricing)
CREATE TABLE rate_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,

  -- Conditions
  min_miles INTEGER,
  max_miles INTEGER,
  min_weight_lbs INTEGER,
  max_weight_lbs INTEGER,

  -- Pricing (cents)
  rate_per_mile_cents INTEGER,
  base_rate_cents INTEGER,
  rate_multiplier DECIMAL(4,2) DEFAULT 1.0,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fuel surcharge index
CREATE TABLE fuel_surcharge_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  effective_date DATE NOT NULL,
  fuel_price_per_gallon DECIMAL(6,3) NOT NULL,
  surcharge_percentage DECIMAL(5,2) NOT NULL,
  source TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- MIGRATION 007: CRM (ACTIVITIES & REMINDERS)
-- ============================================================

-- Activities
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Links (at least one should be set)
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  inland_quote_id UUID REFERENCES inland_quotes(id) ON DELETE SET NULL,

  -- Activity details
  activity_type activity_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Call/meeting specific
  duration_minutes INTEGER,
  outcome activity_outcome,

  -- Follow-up
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT FALSE,

  -- Legacy reference
  legacy_activity_id TEXT,

  -- Tracking
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  -- Links
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,

  -- Reminder details
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  due_time TIME,

  priority reminder_priority DEFAULT 'medium',
  status reminder_status DEFAULT 'pending',

  -- Snooze tracking
  snoozed_until TIMESTAMPTZ,
  snooze_count INTEGER DEFAULT 0,

  completed_at TIMESTAMPTZ,

  -- Legacy reference
  legacy_reminder_id TEXT,

  -- Tracking
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- MIGRATION 008: SUPPORT AND AUDIT
-- ============================================================

-- Tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,

  ticket_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  type ticket_type DEFAULT 'feature',
  status ticket_status DEFAULT 'new',
  priority reminder_priority DEFAULT 'medium',

  page TEXT,
  screenshot_url TEXT,

  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,

  -- Legacy reference
  legacy_ticket_id TEXT,

  -- Tracking
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, ticket_number)
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- What happened
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'login', etc.
  resource_type TEXT NOT NULL,  -- 'quote', 'customer', 'user', etc.
  resource_id UUID,

  -- Details
  changes JSONB,  -- { field: { old: x, new: y } }
  metadata JSONB,  -- Additional context

  -- Request info
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'info', 'success', 'warning', 'error'
  category TEXT,  -- 'quote', 'customer', 'system', 'reminder'

  -- Link
  action_url TEXT,
  action_label TEXT,

  -- Status
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  -- Reference
  related_type TEXT,
  related_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration tracking (for old → new ID mapping)
CREATE TABLE migration_id_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  old_id TEXT NOT NULL,
  new_id UUID NOT NULL,
  migrated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(table_name, old_id)
);


-- ============================================================
-- MIGRATION 009: INDEXES
-- ============================================================

-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Users
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- Customers
CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_customers_status ON customers(organization_id, status);
CREATE INDEX idx_customers_search ON customers USING gin(to_tsvector('english', company_name || ' ' || COALESCE(trading_name, '')));
CREATE INDEX idx_customers_legacy ON customers(legacy_customer_id) WHERE legacy_customer_id IS NOT NULL;
CREATE INDEX idx_customers_legacy_company ON customers(legacy_company_id) WHERE legacy_company_id IS NOT NULL;

-- Contacts
CREATE INDEX idx_contacts_customer ON contacts(customer_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_primary ON contacts(customer_id, is_primary) WHERE is_primary = TRUE;

-- Makes & Models
CREATE INDEX idx_makes_org ON makes(organization_id);
CREATE INDEX idx_makes_name ON makes(organization_id, name);
CREATE INDEX idx_models_make ON models(make_id);
CREATE INDEX idx_models_name ON models(make_id, name);

-- Rates
CREATE INDEX idx_rates_model ON rates(model_id);
CREATE INDEX idx_rates_location ON rates(location_id);
CREATE INDEX idx_rates_model_location ON rates(model_id, location_id);

-- Quotes
CREATE INDEX idx_quotes_org ON quotes(organization_id);
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(organization_id, status);
CREATE INDEX idx_quotes_date ON quotes(organization_id, quote_date DESC);
CREATE INDEX idx_quotes_number ON quotes(organization_id, quote_number);

-- Inland Quotes
CREATE INDEX idx_inland_quotes_org ON inland_quotes(organization_id);
CREATE INDEX idx_inland_quotes_customer ON inland_quotes(customer_id);
CREATE INDEX idx_inland_quotes_status ON inland_quotes(organization_id, status);
CREATE INDEX idx_inland_quotes_date ON inland_quotes(organization_id, quote_date DESC);

-- Activities
CREATE INDEX idx_activities_customer ON activities(customer_id);
CREATE INDEX idx_activities_date ON activities(organization_id, created_at DESC);

-- Reminders
CREATE INDEX idx_reminders_due ON reminders(organization_id, due_date) WHERE status = 'pending';
CREATE INDEX idx_reminders_assigned ON reminders(assigned_to, due_date) WHERE status = 'pending';

-- Audit Logs
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read_at IS NULL;


-- ============================================================
-- MIGRATION 010: ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE truck_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessorial_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE inland_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_surcharge_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies for organization-scoped tables
-- (Example for customers - repeat pattern for all org-scoped tables)

CREATE POLICY "Users can view their organization's customers"
  ON customers FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert customers in their organization"
  ON customers FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update their organization's customers"
  ON customers FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete their organization's customers"
  ON customers FOR DELETE
  USING (organization_id = get_user_organization_id());

-- Repeat similar policies for all organization-scoped tables...
-- (Full policy definitions in separate migration file)


-- ============================================================
-- MIGRATION 011: FUNCTIONS AND TRIGGERS
-- ============================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_inland_quotes_updated_at BEFORE UPDATE ON inland_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_rates_updated_at BEFORE UPDATE ON rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update customer stats when quotes change
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update quote count and last quote date
  UPDATE customers SET
    total_quotes = (
      SELECT COUNT(*) FROM quotes WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    ) + (
      SELECT COUNT(*) FROM inland_quotes WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)
    ),
    total_revenue_cents = (
      SELECT COALESCE(SUM(total_amount_cents), 0) FROM quotes
      WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id) AND status = 'accepted'
    ) + (
      SELECT COALESCE(SUM(total_amount_cents), 0) FROM inland_quotes
      WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id) AND status = 'accepted'
    ),
    last_quote_date = GREATEST(
      (SELECT MAX(quote_date) FROM quotes WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id)),
      (SELECT MAX(quote_date) FROM inland_quotes WHERE customer_id = COALESCE(NEW.customer_id, OLD.customer_id))
    )
  WHERE id = COALESCE(NEW.customer_id, OLD.customer_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_stats_on_quote AFTER INSERT OR UPDATE OR DELETE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

CREATE TRIGGER update_customer_stats_on_inland_quote AFTER INSERT OR UPDATE OR DELETE ON inland_quotes
  FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- Generate quote number function
CREATE OR REPLACE FUNCTION generate_quote_number(org_id UUID, prefix TEXT DEFAULT 'QT')
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  random_part TEXT;
  new_number TEXT;
  exists_count INTEGER;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');

  LOOP
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    new_number := prefix || '-' || date_part || '-' || random_part;

    SELECT COUNT(*) INTO exists_count FROM quotes
    WHERE organization_id = org_id AND quote_number = new_number;

    IF exists_count = 0 THEN
      SELECT COUNT(*) INTO exists_count FROM inland_quotes
      WHERE organization_id = org_id AND quote_number = new_number;
    END IF;

    EXIT WHEN exists_count = 0;
  END LOOP;

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Data Mapping (Old → New)

### 4.1 Customer Merge Strategy

The old system has TWO customer tables. Here's how we merge them:

```
OLD: customers table          OLD: companies table
├── id                        ├── id
├── name                      ├── name
├── company         ─────────►├── (becomes company_name)
├── email                     ├── phone
├── phone                     ├── address, city, state, zip
├── address                   ├── billing_*, payment_terms
├── billing_*                 ├── tags, status
├── notes                     ├── notes
└── created_at                └── contacts[] (child table)

                    ▼▼▼ MERGE INTO ▼▼▼

NEW: customers table
├── id (new UUID)
├── organization_id
├── company_name ◄─── companies.name OR customers.company OR customers.name
├── trading_name
├── address_line1, city, state, postal_code
├── billing_address_line1, billing_city, etc.
├── phone, email
├── payment_terms
├── status ◄─── companies.status OR 'active'
├── tags ◄─── companies.tags OR []
├── notes ◄─── CONCAT(companies.notes, customers.notes)
├── legacy_customer_id ◄─── customers.id (for reference)
├── legacy_company_id ◄─── companies.id (for reference)
└── created_at
```

### 4.2 Complete Field Mapping Tables

#### Makes
| Old Field | New Field | Transform |
|-----------|-----------|-----------|
| id | legacy_make_id | Store as text |
| name | name | Direct copy |
| - | organization_id | Set to default org |
| - | popularity_rank | Calculate from usage |

#### Models
| Old Field | New Field | Transform |
|-----------|-----------|-----------|
| id | legacy_model_id | Store as text |
| name | name | Direct copy |
| make_id | make_id | Lookup new make ID |
| - | equipment_type_id | Infer from name/category |

#### Rates + Location Costs → Rates
| Old Field | New Field | Transform |
|-----------|-----------|-----------|
| rates.id | legacy_rate_id | Store as text |
| location_costs.id | legacy_location_cost_id | Store as text |
| location_costs.rate_id | model_id | Lookup via rate→model |
| location_costs.location | location_id | Lookup new location ID |
| location_costs.dismantling_loading_cost | dismantling_loading_cost_cents | × 100 (dollars to cents) |
| (all other costs) | (all other costs)_cents | × 100 |

#### Quote History → Quotes
| Old Field | New Field | Transform |
|-----------|-----------|-----------|
| id | legacy_quote_id | Store as text |
| quote_number | quote_number | Direct copy |
| rate_id | - | Not needed, data in equipment_items |
| equipment_make | equipment_items[0].make | Move to JSONB |
| equipment_model | equipment_items[0].model | Move to JSONB |
| location | equipment_items[0].location | Move to JSONB |
| all cost fields | equipment_items[0].costs | Move to JSONB, × 100 |
| margin_percentage | margin_percentage | Direct copy |
| margin_amount | margin_amount_cents | × 100 |
| subtotal | subtotal_cents | × 100 |
| total_with_margin | total_amount_cents | × 100 |
| customer_name | customer_name | Direct copy |
| customer_email | customer_email | Direct copy |
| status | status | Map to enum |
| created_at | created_at | Direct copy |

#### Inland Quotes
| Old Field | New Field | Transform |
|-----------|-----------|-----------|
| id | legacy_inland_quote_id | Store as text |
| quote_number | quote_number | Direct copy |
| client_* fields | customer_* fields | Rename |
| pickup_* | destinations[0].pickup.* | Move to JSONB |
| dropoff_* | destinations[0].dropoff.* | Move to JSONB |
| distance_miles | destinations[0].route.distance_miles | Move to JSONB |
| rate_per_mile | (calculate from totals) | |
| all totals | *_cents | × 100 |
| accessorial_charges (child) | destinations[0].load_blocks[0].accessorial_charges | Move to JSONB |

---

## 5. Migration Process

### 5.1 Pre-Migration Checklist

```markdown
## Before Starting Migration

### New Supabase Project
- [ ] Create new Supabase project
- [ ] Note connection strings
- [ ] Configure auth settings
- [ ] Set up storage buckets

### Schema Setup
- [ ] Run all migration files in order
- [ ] Verify all tables created
- [ ] Verify all indexes created
- [ ] Verify RLS policies active
- [ ] Test with sample data

### Environment
- [ ] Set up migration scripts repo
- [ ] Configure OLD database read-only connection
- [ ] Configure NEW database write connection
- [ ] Set up logging for migration

### Backup
- [ ] Full backup of OLD database
- [ ] Document current row counts
- [ ] Export critical tables to CSV as backup
```

### 5.2 Migration Steps

```
PHASE 1: PREPARATION (Day -7)
═══════════════════════════════════════════════════════════
1. Create new Supabase project
2. Run all schema migrations
3. Verify schema is correct
4. Create default organization
5. Create admin user
6. Test basic CRUD operations

PHASE 2: STATIC DATA (Day -3)
═══════════════════════════════════════════════════════════
1. Export and import equipment_types
2. Export and import makes
3. Export and import models
4. Export and import equipment_dimensions
5. Export and import locations
6. Verify counts match

PHASE 3: RATES DATA (Day -2)
═══════════════════════════════════════════════════════════
1. Export rates + location_costs
2. Transform to new schema (merge, convert to cents)
3. Import to new rates table
4. Verify pricing matches (spot check)

PHASE 4: CUSTOMER DATA (Day -1)
═══════════════════════════════════════════════════════════
1. Export companies
2. Export contacts
3. Export customers (legacy)
4. Run merge algorithm
5. Import unified customers
6. Import contacts
7. Verify relationships

PHASE 5: QUOTE DATA (Day 0 - Maintenance Window)
═══════════════════════════════════════════════════════════
1. Set OLD database to read-only
2. Final export of quote_history
3. Final export of inland_quotes
4. Transform and import quotes
5. Transform and import inland_quotes
6. Verify totals match

PHASE 6: CRM DATA (Day 0)
═══════════════════════════════════════════════════════════
1. Export activity_logs
2. Export follow_up_reminders
3. Transform and import
4. Verify counts

PHASE 7: VALIDATION (Day 0)
═══════════════════════════════════════════════════════════
1. Run all validation scripts
2. Compare row counts
3. Spot check data integrity
4. Test critical features
5. Sign-off on migration

PHASE 8: CUTOVER (Day 0)
═══════════════════════════════════════════════════════════
1. Update app configuration
2. Deploy new application
3. Verify production works
4. Monitor for errors
5. Keep old DB read-only (30 days)
```

---

## 6. Migration Scripts

### 6.1 Export Scripts (Run on OLD Database)

```sql
-- ============================================================
-- EXPORT SCRIPTS - Run on OLD Supabase
-- ============================================================

-- Export makes
COPY (
  SELECT id, name, created_at
  FROM makes
  ORDER BY name
) TO '/tmp/export_makes.csv' WITH CSV HEADER;

-- Export models
COPY (
  SELECT m.id, m.name, m.make_id, mk.name as make_name, m.created_at
  FROM models m
  JOIN makes mk ON m.make_id = mk.id
  ORDER BY mk.name, m.name
) TO '/tmp/export_models.csv' WITH CSV HEADER;

-- Export equipment dimensions
COPY (
  SELECT *
  FROM equipment_dimensions
) TO '/tmp/export_dimensions.csv' WITH CSV HEADER;

-- Export rates with location costs (combined)
COPY (
  SELECT
    r.id as rate_id,
    r.make_id,
    r.model_id,
    mk.name as make_name,
    md.name as model_name,
    lc.id as location_cost_id,
    lc.location,
    lc.dismantling_loading_cost,
    lc.loading_cost,
    lc.blocking_bracing_cost,
    lc.ncb_survey_cost,
    lc.local_drayage_cost,
    lc.chassis_cost,
    lc.tolls_cost,
    lc.escorts_cost,
    lc.power_wash_cost,
    lc.waste_fluids_disposal_fee,
    lc.miscellaneous_costs,
    lc.notes,
    lc.updated_at
  FROM rates r
  JOIN makes mk ON r.make_id = mk.id
  JOIN models md ON r.model_id = md.id
  LEFT JOIN location_costs lc ON lc.rate_id = r.id
  WHERE lc.id IS NOT NULL
  ORDER BY mk.name, md.name, lc.location
) TO '/tmp/export_rates_with_costs.csv' WITH CSV HEADER;

-- Export companies
COPY (
  SELECT *
  FROM companies
  ORDER BY name
) TO '/tmp/export_companies.csv' WITH CSV HEADER;

-- Export contacts
COPY (
  SELECT *
  FROM contacts
  ORDER BY company_id, first_name
) TO '/tmp/export_contacts.csv' WITH CSV HEADER;

-- Export legacy customers
COPY (
  SELECT *
  FROM customers
  ORDER BY name
) TO '/tmp/export_customers_legacy.csv' WITH CSV HEADER;

-- Export quote history
COPY (
  SELECT *
  FROM quote_history
  ORDER BY created_at
) TO '/tmp/export_quote_history.csv' WITH CSV HEADER;

-- Export inland quotes
COPY (
  SELECT *
  FROM inland_quotes
  ORDER BY created_at
) TO '/tmp/export_inland_quotes.csv' WITH CSV HEADER;

-- Export inland accessorial charges
COPY (
  SELECT *
  FROM inland_accessorial_charges
) TO '/tmp/export_inland_accessorials.csv' WITH CSV HEADER;

-- Export accessorial types
COPY (
  SELECT *
  FROM inland_accessorial_types
) TO '/tmp/export_accessorial_types.csv' WITH CSV HEADER;

-- Export equipment types (trucks)
COPY (
  SELECT *
  FROM inland_equipment_types
) TO '/tmp/export_truck_types.csv' WITH CSV HEADER;

-- Export activity logs
COPY (
  SELECT *
  FROM activity_logs
  ORDER BY created_at
) TO '/tmp/export_activity_logs.csv' WITH CSV HEADER;

-- Export reminders
COPY (
  SELECT *
  FROM follow_up_reminders
  ORDER BY due_date
) TO '/tmp/export_reminders.csv' WITH CSV HEADER;

-- Export tickets
COPY (
  SELECT *
  FROM tickets
  ORDER BY created_at
) TO '/tmp/export_tickets.csv' WITH CSV HEADER;
```

### 6.2 Transform Script (Node.js)

```typescript
// scripts/migrate-data.ts
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import * as fs from 'fs';

// Configuration
const OLD_SUPABASE_URL = process.env.OLD_SUPABASE_URL!;
const OLD_SUPABASE_KEY = process.env.OLD_SUPABASE_SERVICE_KEY!;
const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL!;
const NEW_SUPABASE_KEY = process.env.NEW_SUPABASE_SERVICE_KEY!;
const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID!;

const oldDb = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_KEY);
const newDb = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

// ID mapping storage
const idMap = new Map<string, Map<string, string>>();

function mapId(table: string, oldId: string, newId: string) {
  if (!idMap.has(table)) idMap.set(table, new Map());
  idMap.get(table)!.set(oldId, newId);
}

function getNewId(table: string, oldId: string): string | undefined {
  return idMap.get(table)?.get(oldId);
}

// Convert dollars to cents
function dollarsToCents(dollars: number | null): number | null {
  if (dollars === null || dollars === undefined) return null;
  return Math.round(dollars * 100);
}

// Migrate makes
async function migrateMakes() {
  console.log('Migrating makes...');

  const { data: oldMakes } = await oldDb.from('makes').select('*');

  for (const make of oldMakes || []) {
    const { data: newMake, error } = await newDb.from('makes').insert({
      organization_id: DEFAULT_ORG_ID,
      name: make.name,
      legacy_make_id: make.id,
      created_at: make.created_at,
    }).select().single();

    if (error) {
      console.error(`Failed to migrate make ${make.name}:`, error);
      continue;
    }

    mapId('makes', make.id, newMake.id);

    // Also store in migration_id_map table
    await newDb.from('migration_id_map').insert({
      table_name: 'makes',
      old_id: make.id,
      new_id: newMake.id,
    });
  }

  console.log(`Migrated ${oldMakes?.length || 0} makes`);
}

// Migrate models
async function migrateModels() {
  console.log('Migrating models...');

  const { data: oldModels } = await oldDb.from('models').select('*');

  for (const model of oldModels || []) {
    const newMakeId = getNewId('makes', model.make_id);
    if (!newMakeId) {
      console.error(`No new make ID for model ${model.name}`);
      continue;
    }

    const { data: newModel, error } = await newDb.from('models').insert({
      make_id: newMakeId,
      name: model.name,
      legacy_model_id: model.id,
      created_at: model.created_at,
    }).select().single();

    if (error) {
      console.error(`Failed to migrate model ${model.name}:`, error);
      continue;
    }

    mapId('models', model.id, newModel.id);

    await newDb.from('migration_id_map').insert({
      table_name: 'models',
      old_id: model.id,
      new_id: newModel.id,
    });
  }

  console.log(`Migrated ${oldModels?.length || 0} models`);
}

// Migrate locations (create from constants)
async function migrateLocations() {
  console.log('Creating locations...');

  const locations = [
    { name: 'New Jersey', code: 'NJ' },
    { name: 'Savannah', code: 'SAV' },
    { name: 'Houston', code: 'HOU' },
    { name: 'Chicago', code: 'CHI' },
    { name: 'Oakland', code: 'OAK' },
    { name: 'Long Beach', code: 'LB' },
  ];

  for (const loc of locations) {
    const { data, error } = await newDb.from('locations').insert({
      organization_id: DEFAULT_ORG_ID,
      name: loc.name,
      code: loc.code,
      sort_order: locations.indexOf(loc),
    }).select().single();

    if (error) {
      console.error(`Failed to create location ${loc.name}:`, error);
      continue;
    }

    // Map old location name to new ID
    mapId('locations', loc.name, data.id);
    mapId('locations', loc.code, data.id);
  }

  console.log(`Created ${locations.length} locations`);
}

// Migrate rates (combines rates + location_costs)
async function migrateRates() {
  console.log('Migrating rates...');

  const { data: oldLocationCosts } = await oldDb
    .from('location_costs')
    .select('*, rate:rates(make_id, model_id)');

  let migratedCount = 0;

  for (const lc of oldLocationCosts || []) {
    const rate = lc.rate as any;
    if (!rate) continue;

    const newModelId = getNewId('models', rate.model_id);
    const newLocationId = getNewId('locations', lc.location);

    if (!newModelId || !newLocationId) {
      console.error(`Missing mapping for rate: model=${rate.model_id}, location=${lc.location}`);
      continue;
    }

    const { error } = await newDb.from('rates').insert({
      model_id: newModelId,
      location_id: newLocationId,
      dismantling_loading_cost_cents: dollarsToCents(lc.dismantling_loading_cost),
      loading_cost_cents: dollarsToCents(lc.loading_cost),
      blocking_bracing_cost_cents: dollarsToCents(lc.blocking_bracing_cost),
      ncb_survey_cost_cents: dollarsToCents(lc.ncb_survey_cost),
      local_drayage_cost_cents: dollarsToCents(lc.local_drayage_cost),
      chassis_cost_cents: dollarsToCents(lc.chassis_cost),
      tolls_cost_cents: dollarsToCents(lc.tolls_cost),
      escorts_cost_cents: dollarsToCents(lc.escorts_cost),
      power_wash_cost_cents: dollarsToCents(lc.power_wash_cost),
      waste_disposal_cost_cents: dollarsToCents(lc.waste_fluids_disposal_fee),
      miscellaneous_cost_cents: dollarsToCents(lc.miscellaneous_costs),
      notes: lc.notes,
      legacy_rate_id: lc.rate_id,
      legacy_location_cost_id: lc.id,
      updated_at: lc.updated_at,
    });

    if (error) {
      console.error(`Failed to migrate rate:`, error);
      continue;
    }

    migratedCount++;
  }

  console.log(`Migrated ${migratedCount} rates`);
}

// Migrate customers (merge companies + legacy customers)
async function migrateCustomers() {
  console.log('Migrating customers...');

  // Get all companies
  const { data: companies } = await oldDb.from('companies').select('*');

  // Get all legacy customers
  const { data: legacyCustomers } = await oldDb.from('customers').select('*');

  // Create map of company names for deduplication
  const processedNames = new Set<string>();

  // First, migrate companies
  for (const company of companies || []) {
    const normalizedName = company.name.toLowerCase().trim();

    if (processedNames.has(normalizedName)) {
      console.log(`Skipping duplicate company: ${company.name}`);
      continue;
    }
    processedNames.add(normalizedName);

    const { data: newCustomer, error } = await newDb.from('customers').insert({
      organization_id: DEFAULT_ORG_ID,
      company_name: company.name,
      industry: company.industry,
      website: company.website,
      phone: company.phone,
      address_line1: company.address,
      city: company.city,
      state: company.state,
      postal_code: company.zip,
      billing_address_line1: company.billing_address,
      billing_city: company.billing_city,
      billing_state: company.billing_state,
      billing_postal_code: company.billing_zip,
      payment_terms: company.payment_terms || 'Net 30',
      tax_id: company.tax_id,
      status: company.status || 'active',
      tags: company.tags || [],
      notes: company.notes,
      legacy_company_id: company.id,
      created_at: company.created_at,
    }).select().single();

    if (error) {
      console.error(`Failed to migrate company ${company.name}:`, error);
      continue;
    }

    mapId('companies', company.id, newCustomer.id);
    mapId('customers_by_name', normalizedName, newCustomer.id);

    await newDb.from('migration_id_map').insert({
      table_name: 'companies',
      old_id: company.id,
      new_id: newCustomer.id,
    });
  }

  // Then, migrate legacy customers (that aren't duplicates)
  for (const customer of legacyCustomers || []) {
    const companyName = customer.company || customer.name;
    const normalizedName = companyName.toLowerCase().trim();

    // Check if already migrated via companies
    if (processedNames.has(normalizedName)) {
      // Just create the mapping
      const existingId = getNewId('customers_by_name', normalizedName);
      if (existingId) {
        mapId('customers', customer.id, existingId);

        await newDb.from('migration_id_map').insert({
          table_name: 'customers',
          old_id: customer.id,
          new_id: existingId,
        });
      }
      continue;
    }

    processedNames.add(normalizedName);

    const { data: newCustomer, error } = await newDb.from('customers').insert({
      organization_id: DEFAULT_ORG_ID,
      company_name: companyName,
      phone: customer.phone,
      email: customer.email,
      address_line1: customer.address,
      billing_address_line1: customer.billing_address,
      billing_city: customer.billing_city,
      billing_state: customer.billing_state,
      billing_postal_code: customer.billing_zip,
      payment_terms: customer.payment_terms || 'Net 30',
      notes: customer.notes,
      legacy_customer_id: customer.id,
      created_at: customer.created_at,
    }).select().single();

    if (error) {
      console.error(`Failed to migrate customer ${customer.name}:`, error);
      continue;
    }

    mapId('customers', customer.id, newCustomer.id);

    await newDb.from('migration_id_map').insert({
      table_name: 'customers',
      old_id: customer.id,
      new_id: newCustomer.id,
    });
  }

  console.log(`Migrated ${processedNames.size} unique customers`);
}

// Migrate contacts
async function migrateContacts() {
  console.log('Migrating contacts...');

  const { data: oldContacts } = await oldDb.from('contacts').select('*');

  let migratedCount = 0;

  for (const contact of oldContacts || []) {
    const newCustomerId = getNewId('companies', contact.company_id);

    if (!newCustomerId) {
      console.error(`No customer found for contact ${contact.first_name} ${contact.last_name}`);
      continue;
    }

    const { error } = await newDb.from('contacts').insert({
      customer_id: newCustomerId,
      first_name: contact.first_name,
      last_name: contact.last_name,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      mobile: contact.mobile,
      role: contact.role || 'general',
      is_primary: contact.is_primary || false,
      notes: contact.notes,
      legacy_contact_id: contact.id,
      created_at: contact.created_at,
    });

    if (error) {
      console.error(`Failed to migrate contact:`, error);
      continue;
    }

    migratedCount++;
  }

  console.log(`Migrated ${migratedCount} contacts`);
}

// Migrate quote history
async function migrateQuotes() {
  console.log('Migrating quotes...');

  const { data: oldQuotes } = await oldDb.from('quote_history').select('*');

  let migratedCount = 0;

  for (const quote of oldQuotes || []) {
    // Build equipment_items JSONB
    const equipmentItems = [{
      id: crypto.randomUUID(),
      make: quote.equipment_make,
      model: quote.equipment_model,
      location: quote.location,
      quantity: 1,
      costs: {
        dismantling_loading: dollarsToCents(quote.dismantling_loading_cost),
        loading: dollarsToCents(quote.loading_cost),
        blocking_bracing: dollarsToCents(quote.blocking_bracing_cost),
        ncb_survey: dollarsToCents(quote.ncb_survey_cost),
        local_drayage: dollarsToCents(quote.local_drayage_cost),
        chassis: dollarsToCents(quote.chassis_cost),
        tolls: dollarsToCents(quote.tolls_cost),
        escorts: dollarsToCents(quote.escorts_cost),
        power_wash: dollarsToCents(quote.power_wash_cost),
        waste_disposal: dollarsToCents(quote.waste_fluids_disposal_fee),
        miscellaneous: dollarsToCents(quote.miscellaneous_costs),
      },
    }];

    // Parse misc fees if stored as JSON
    let miscFees = [];
    if (quote.miscellaneous_fees_json) {
      try {
        const parsed = JSON.parse(quote.miscellaneous_fees_json);
        miscFees = parsed.map((fee: any) => ({
          ...fee,
          amount: dollarsToCents(fee.cost || fee.amount),
        }));
      } catch (e) {
        // Ignore parse errors
      }
    }

    const { error } = await newDb.from('quotes').insert({
      organization_id: DEFAULT_ORG_ID,
      quote_number: quote.quote_number,
      customer_name: quote.customer_name || 'Unknown',
      customer_email: quote.customer_email,
      equipment_items: equipmentItems,
      subtotal_cents: dollarsToCents(quote.subtotal) || 0,
      margin_percentage: quote.margin_percentage || 0,
      margin_amount_cents: dollarsToCents(quote.margin_amount) || 0,
      total_amount_cents: dollarsToCents(quote.total_with_margin) || 0,
      misc_fees: miscFees,
      status: mapQuoteStatus(quote.status),
      quote_date: quote.created_at?.split('T')[0],
      version: quote.version || 1,
      legacy_quote_id: quote.id,
      created_at: quote.created_at,
    });

    if (error) {
      console.error(`Failed to migrate quote ${quote.quote_number}:`, error);
      continue;
    }

    migratedCount++;
  }

  console.log(`Migrated ${migratedCount} quotes`);
}

function mapQuoteStatus(oldStatus: string | null): string {
  const statusMap: Record<string, string> = {
    'draft': 'draft',
    'sent': 'sent',
    'accepted': 'accepted',
    'rejected': 'rejected',
    'expired': 'expired',
  };
  return statusMap[oldStatus || 'draft'] || 'draft';
}

// Main migration function
async function runMigration() {
  console.log('Starting migration...');
  console.log('='.repeat(50));

  try {
    await migrateLocations();
    await migrateMakes();
    await migrateModels();
    await migrateRates();
    await migrateCustomers();
    await migrateContacts();
    await migrateQuotes();
    // Add more migration functions...

    console.log('='.repeat(50));
    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
```

---

## 7. Validation & Testing

### 7.1 Validation Queries

```sql
-- ============================================================
-- VALIDATION QUERIES - Run on NEW database after migration
-- ============================================================

-- Compare counts
SELECT
  'makes' as table_name,
  (SELECT COUNT(*) FROM makes) as new_count,
  (SELECT COUNT(*) FROM migration_id_map WHERE table_name = 'makes') as migrated_count
UNION ALL
SELECT
  'models',
  (SELECT COUNT(*) FROM models),
  (SELECT COUNT(*) FROM migration_id_map WHERE table_name = 'models')
UNION ALL
SELECT
  'customers',
  (SELECT COUNT(*) FROM customers),
  (SELECT COUNT(*) FROM migration_id_map WHERE table_name IN ('customers', 'companies'))
UNION ALL
SELECT
  'contacts',
  (SELECT COUNT(*) FROM contacts),
  (SELECT COUNT(*) FROM migration_id_map WHERE table_name = 'contacts')
UNION ALL
SELECT
  'quotes',
  (SELECT COUNT(*) FROM quotes),
  (SELECT COUNT(*) FROM migration_id_map WHERE table_name = 'quote_history');

-- Verify no orphaned records
SELECT 'Contacts without customers' as check_name, COUNT(*) as count
FROM contacts c
LEFT JOIN customers cu ON c.customer_id = cu.id
WHERE cu.id IS NULL

UNION ALL

SELECT 'Models without makes', COUNT(*)
FROM models m
LEFT JOIN makes mk ON m.make_id = mk.id
WHERE mk.id IS NULL

UNION ALL

SELECT 'Rates without models', COUNT(*)
FROM rates r
LEFT JOIN models m ON r.model_id = m.id
WHERE m.id IS NULL;

-- Verify amounts converted correctly (spot check)
SELECT
  mim.old_id,
  mim.new_id,
  q.total_amount_cents,
  q.total_amount_cents / 100.0 as total_dollars
FROM migration_id_map mim
JOIN quotes q ON q.legacy_quote_id = mim.old_id
WHERE mim.table_name = 'quote_history'
LIMIT 10;

-- Check for duplicate customers
SELECT company_name, COUNT(*) as count
FROM customers
GROUP BY company_name
HAVING COUNT(*) > 1;
```

### 7.2 Functional Tests

```typescript
// tests/migration-validation.test.ts
import { describe, it, expect } from 'vitest';

describe('Migration Validation', () => {
  it('should have all makes migrated', async () => {
    const oldCount = await getOldCount('makes');
    const newCount = await getNewCount('makes');
    expect(newCount).toBe(oldCount);
  });

  it('should have all models migrated', async () => {
    const oldCount = await getOldCount('models');
    const newCount = await getNewCount('models');
    expect(newCount).toBe(oldCount);
  });

  it('should have all rates migrated', async () => {
    const oldCount = await getOldCount('location_costs');
    const newCount = await getNewCount('rates');
    expect(newCount).toBe(oldCount);
  });

  it('should preserve quote totals correctly', async () => {
    const sampleQuotes = await getRandomQuotes(10);

    for (const { oldQuote, newQuote } of sampleQuotes) {
      expect(newQuote.total_amount_cents).toBe(
        Math.round(oldQuote.total_with_margin * 100)
      );
    }
  });

  it('should merge customers without duplicates', async () => {
    const duplicates = await findDuplicateCustomers();
    expect(duplicates.length).toBe(0);
  });

  it('should preserve contact relationships', async () => {
    const orphanedContacts = await findOrphanedContacts();
    expect(orphanedContacts.length).toBe(0);
  });
});
```

---

## 8. Rollback Plan

### 8.1 Before Cutover
If issues found BEFORE switching to new app:
1. Simply don't deploy new app
2. Delete new Supabase project
3. No impact to production

### 8.2 After Cutover
If issues found AFTER switching:

```markdown
## Emergency Rollback Procedure

### Step 1: Switch DNS/Config (5 minutes)
- Revert environment variables to OLD Supabase
- Redeploy old application version
- Old database is still read-only but functional

### Step 2: Re-enable Old Database (5 minutes)
- Remove read-only flag from old database
- Verify writes working

### Step 3: Investigate (No time limit)
- Keep new database intact for investigation
- Identify what went wrong
- Fix issues
- Re-attempt migration

### Step 4: Sync New Data (If Needed)
- If old system ran for a while, sync any new data
- Re-run migration for affected tables only
```

### 8.3 Data Created After Cutover

If users created data in new system before rollback:
```sql
-- Export any new data created in new system
COPY (
  SELECT * FROM quotes
  WHERE created_at > '2026-01-15 00:00:00'  -- Cutover time
) TO '/tmp/new_quotes_to_migrate_back.csv' WITH CSV HEADER;

-- Manually import these into old system if needed
```

---

## 9. Post-Migration Tasks

### 9.1 Immediate (Day 1)

- [ ] Monitor error rates
- [ ] Check all critical features
- [ ] Verify PDF generation
- [ ] Test quote creation end-to-end
- [ ] Confirm customer data accessible
- [ ] Validate search functionality

### 9.2 Week 1

- [ ] Review performance metrics
- [ ] Check for slow queries
- [ ] Verify backup jobs running
- [ ] Collect user feedback
- [ ] Fix any bugs found

### 9.3 Week 4

- [ ] Final validation of all data
- [ ] User acceptance sign-off
- [ ] Archive old database backup
- [ ] Delete read-only old database (after 30 days)
- [ ] Update documentation
- [ ] Close migration project

---

## Quick Reference Commands

```bash
# Create new Supabase project
supabase init
supabase db push

# Run migrations
psql $NEW_DATABASE_URL -f migrations/001_extensions.sql
psql $NEW_DATABASE_URL -f migrations/002_organizations.sql
# ... continue for all migration files

# Export from old (using supabase CLI)
supabase db dump --data-only > old_data_backup.sql

# Run migration script
npx ts-node scripts/migrate-data.ts

# Validate
psql $NEW_DATABASE_URL -f scripts/validate-migration.sql

# Check counts
psql $NEW_DATABASE_URL -c "SELECT table_name, COUNT(*) FROM migration_id_map GROUP BY table_name;"
```

---

*Database Migration Plan Version: 1.0*
*Created: January 2026*
*Last Updated: January 2026*
