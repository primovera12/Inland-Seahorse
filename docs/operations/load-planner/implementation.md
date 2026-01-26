# Load Planner - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the Load Planner History feature.

---

## Prerequisites

Before starting:
1. Ensure you have access to the Supabase project
2. Understand the existing Load Planner v2 at `/inland/new-v2`
3. Review the [Database Schema](./database-schema.md)
4. Review the [API Reference](./api-reference.md)

---

## Task 1: Database Migration

**File**: `supabase/migrations/038_load_planner_quotes.sql`

### Step 1.1: Create the migration file

```sql
-- Migration: 038_load_planner_quotes.sql
-- Description: Create tables for Load Planner v2 quote storage
-- Author: [Your name]
-- Date: 2026-01-26

-- ============================================
-- Table 1: load_planner_quotes
-- ============================================

CREATE TABLE IF NOT EXISTS load_planner_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',

  -- Customer
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_company VARCHAR(255),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Customer Address
  customer_address_line1 VARCHAR(255),
  customer_address_city VARCHAR(100),
  customer_address_state VARCHAR(50),
  customer_address_zip VARCHAR(20),

  -- Pickup
  pickup_address VARCHAR(255),
  pickup_city VARCHAR(100),
  pickup_state VARCHAR(50),
  pickup_zip VARCHAR(20),
  pickup_lat DECIMAL(10,7),
  pickup_lng DECIMAL(10,7),

  -- Dropoff
  dropoff_address VARCHAR(255),
  dropoff_city VARCHAR(100),
  dropoff_state VARCHAR(50),
  dropoff_zip VARCHAR(20),
  dropoff_lat DECIMAL(10,7),
  dropoff_lng DECIMAL(10,7),

  -- Route
  distance_miles INTEGER,
  duration_minutes INTEGER,
  route_polyline TEXT,

  -- Totals
  subtotal_cents INTEGER,
  total_cents INTEGER,

  -- Sharing
  public_token UUID DEFAULT gen_random_uuid() NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- User & Notes
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  internal_notes TEXT,
  quote_notes TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Indexes
CREATE INDEX idx_lpq_quote_number ON load_planner_quotes(quote_number);
CREATE INDEX idx_lpq_status ON load_planner_quotes(status) WHERE is_active = true;
CREATE INDEX idx_lpq_customer ON load_planner_quotes(customer_name) WHERE is_active = true;
CREATE INDEX idx_lpq_created ON load_planner_quotes(created_at DESC) WHERE is_active = true;
CREATE INDEX idx_lpq_route ON load_planner_quotes(pickup_state, dropoff_state) WHERE is_active = true;
CREATE INDEX idx_lpq_public_token ON load_planner_quotes(public_token);

-- ============================================
-- Table 2: load_planner_cargo_items
-- ============================================

CREATE TABLE IF NOT EXISTS load_planner_cargo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  -- Identification
  sku VARCHAR(100),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Dimensions (inches)
  length_in INTEGER,
  width_in INTEGER,
  height_in INTEGER,
  weight_lbs INTEGER,

  -- Properties
  stackable BOOLEAN NOT NULL DEFAULT false,
  bottom_only BOOLEAN NOT NULL DEFAULT false,
  max_layers INTEGER,
  fragile BOOLEAN NOT NULL DEFAULT false,
  hazmat BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,

  -- Orientation & Geometry
  orientation INTEGER NOT NULL DEFAULT 1,
  geometry VARCHAR(50) NOT NULL DEFAULT 'box',

  -- Equipment Link
  equipment_make_id UUID,
  equipment_model_id UUID,
  dimensions_source VARCHAR(20),

  -- Images
  image_url TEXT,
  image_url_2 TEXT,
  front_image_url TEXT,
  side_image_url TEXT,

  -- Load Assignment
  assigned_truck_index INTEGER,
  placement_x DECIMAL(8,2),
  placement_y DECIMAL(8,2),
  placement_z DECIMAL(8,2),
  placement_rotation INTEGER,

  -- Metadata
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_lpci_quote ON load_planner_cargo_items(quote_id);

-- ============================================
-- Table 3: load_planner_trucks
-- ============================================

CREATE TABLE IF NOT EXISTS load_planner_trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  -- Truck Info
  truck_index INTEGER NOT NULL,
  truck_type_id VARCHAR(100) NOT NULL,
  truck_name VARCHAR(255),
  truck_category VARCHAR(50),

  -- Specs
  deck_length_ft DECIMAL(8,2),
  deck_width_ft DECIMAL(8,2),
  deck_height_ft DECIMAL(8,2),
  well_length_ft DECIMAL(8,2),
  max_cargo_weight_lbs INTEGER,

  -- Load Stats
  total_weight_lbs INTEGER,
  total_items INTEGER,
  is_legal BOOLEAN NOT NULL DEFAULT true,

  -- Permits & Warnings
  permits_required TEXT[],
  warnings TEXT[],
  truck_score INTEGER,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(quote_id, truck_index)
);

CREATE INDEX idx_lpt_quote ON load_planner_trucks(quote_id);

-- ============================================
-- Table 4: load_planner_service_items
-- ============================================

CREATE TABLE IF NOT EXISTS load_planner_service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  service_type_id UUID,
  name VARCHAR(255) NOT NULL,

  rate_cents INTEGER NOT NULL,
  quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
  total_cents INTEGER NOT NULL,

  truck_index INTEGER,

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_lpsi_quote ON load_planner_service_items(quote_id);

-- ============================================
-- Table 5: load_planner_accessorials
-- ============================================

CREATE TABLE IF NOT EXISTS load_planner_accessorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  accessorial_type_id UUID,
  name VARCHAR(255) NOT NULL,

  billing_unit VARCHAR(20) NOT NULL,
  rate_cents INTEGER NOT NULL,
  quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
  total_cents INTEGER NOT NULL,

  notes TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_lpa_quote ON load_planner_accessorials(quote_id);

-- ============================================
-- Table 6: load_planner_permits
-- ============================================

CREATE TABLE IF NOT EXISTS load_planner_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  state_code VARCHAR(2) NOT NULL,
  state_name VARCHAR(100),

  calculated_permit_fee_cents INTEGER,
  calculated_escort_cost_cents INTEGER,

  permit_fee_cents INTEGER,
  escort_cost_cents INTEGER,

  distance_miles INTEGER,
  escort_count INTEGER,
  pole_car_required BOOLEAN DEFAULT false,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(quote_id, state_code)
);

CREATE INDEX idx_lpp_quote ON load_planner_permits(quote_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE load_planner_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_cargo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_accessorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_permits ENABLE ROW LEVEL SECURITY;

-- Quotes policies
CREATE POLICY "Users can view quotes" ON load_planner_quotes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert quotes" ON load_planner_quotes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update quotes" ON load_planner_quotes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Child tables - access through quote
CREATE POLICY "Access cargo through quote" ON load_planner_cargo_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM load_planner_quotes q WHERE q.id = quote_id)
  );

CREATE POLICY "Access trucks through quote" ON load_planner_trucks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM load_planner_quotes q WHERE q.id = quote_id)
  );

CREATE POLICY "Access services through quote" ON load_planner_service_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM load_planner_quotes q WHERE q.id = quote_id)
  );

CREATE POLICY "Access accessorials through quote" ON load_planner_accessorials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM load_planner_quotes q WHERE q.id = quote_id)
  );

CREATE POLICY "Access permits through quote" ON load_planner_permits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM load_planner_quotes q WHERE q.id = quote_id)
  );

-- ============================================
-- Update timestamp trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_load_planner_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER load_planner_quotes_updated_at
  BEFORE UPDATE ON load_planner_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_load_planner_quotes_updated_at();
```

### Step 1.2: Apply the migration

```bash
npx supabase db push
```

### Step 1.3: Verify tables created

Check in Supabase dashboard or run:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'load_planner%';
```

---

## Task 2: TypeScript Types

**File**: `src/types/load-planner-quotes.ts`

```typescript
// Load Planner Quote Types

export type LoadPlannerQuoteStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'

export interface LoadPlannerQuote {
  id: string
  quote_number: string
  status: LoadPlannerQuoteStatus

  // Customer
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_company: string | null
  company_id: string | null
  contact_id: string | null

  // Customer Address
  customer_address_line1: string | null
  customer_address_city: string | null
  customer_address_state: string | null
  customer_address_zip: string | null

  // Pickup
  pickup_address: string | null
  pickup_city: string | null
  pickup_state: string | null
  pickup_zip: string | null
  pickup_lat: number | null
  pickup_lng: number | null

  // Dropoff
  dropoff_address: string | null
  dropoff_city: string | null
  dropoff_state: string | null
  dropoff_zip: string | null
  dropoff_lat: number | null
  dropoff_lng: number | null

  // Route
  distance_miles: number | null
  duration_minutes: number | null
  route_polyline: string | null

  // Totals
  subtotal_cents: number | null
  total_cents: number | null

  // Sharing
  public_token: string

  // Timestamps
  created_at: string
  updated_at: string
  sent_at: string | null
  viewed_at: string | null
  expires_at: string | null

  // User & Notes
  created_by: string | null
  internal_notes: string | null
  quote_notes: string | null
  is_active: boolean
}

export interface LoadPlannerCargoItem {
  id: string
  quote_id: string
  sku: string | null
  description: string
  quantity: number
  length_in: number | null
  width_in: number | null
  height_in: number | null
  weight_lbs: number | null
  stackable: boolean
  bottom_only: boolean
  max_layers: number | null
  fragile: boolean
  hazmat: boolean
  notes: string | null
  orientation: number
  geometry: 'box' | 'cylinder' | 'hollow-cylinder'
  equipment_make_id: string | null
  equipment_model_id: string | null
  dimensions_source: 'ai' | 'database' | 'manual' | null
  image_url: string | null
  image_url_2: string | null
  front_image_url: string | null
  side_image_url: string | null
  assigned_truck_index: number | null
  placement_x: number | null
  placement_y: number | null
  placement_z: number | null
  placement_rotation: number | null
  sort_order: number
  created_at: string
}

export interface LoadPlannerTruck {
  id: string
  quote_id: string
  truck_index: number
  truck_type_id: string
  truck_name: string | null
  truck_category: string | null
  deck_length_ft: number | null
  deck_width_ft: number | null
  deck_height_ft: number | null
  well_length_ft: number | null
  max_cargo_weight_lbs: number | null
  total_weight_lbs: number | null
  total_items: number | null
  is_legal: boolean
  permits_required: string[] | null
  warnings: string[] | null
  truck_score: number | null
  created_at: string
}

export interface LoadPlannerServiceItem {
  id: string
  quote_id: string
  service_type_id: string | null
  name: string
  rate_cents: number
  quantity: number
  total_cents: number
  truck_index: number | null
  sort_order: number
  created_at: string
}

export interface LoadPlannerAccessorial {
  id: string
  quote_id: string
  accessorial_type_id: string | null
  name: string
  billing_unit: 'flat' | 'hour' | 'day' | 'way' | 'week' | 'month' | 'stop'
  rate_cents: number
  quantity: number
  total_cents: number
  notes: string | null
  sort_order: number
  created_at: string
}

export interface LoadPlannerPermit {
  id: string
  quote_id: string
  state_code: string
  state_name: string | null
  calculated_permit_fee_cents: number | null
  calculated_escort_cost_cents: number | null
  permit_fee_cents: number | null
  escort_cost_cents: number | null
  distance_miles: number | null
  escort_count: number | null
  pole_car_required: boolean
  notes: string | null
  created_at: string
}

// Full quote with all related data
export interface LoadPlannerQuoteWithDetails extends LoadPlannerQuote {
  cargo_items: LoadPlannerCargoItem[]
  trucks: LoadPlannerTruck[]
  service_items: LoadPlannerServiceItem[]
  accessorials: LoadPlannerAccessorial[]
  permits: LoadPlannerPermit[]
}

// List item (for history table)
export interface LoadPlannerQuoteListItem {
  id: string
  quote_number: string
  status: LoadPlannerQuoteStatus
  customer_name: string | null
  customer_company: string | null
  pickup_city: string | null
  pickup_state: string | null
  dropoff_city: string | null
  dropoff_state: string | null
  total_cents: number | null
  created_at: string
  updated_at: string
  cargo_items_count: number
  trucks_count: number
}
```

---

## Task 3: tRPC Router

**File**: `src/server/routers/loadPlannerQuotes.ts`

See [API Reference](./api-reference.md) for complete implementation.

### Step 3.1: Create the router file

### Step 3.2: Implement all endpoints

### Step 3.3: Register in `_app.ts`

```typescript
// src/server/routers/_app.ts
import { loadPlannerQuotesRouter } from './loadPlannerQuotes'

export const appRouter = router({
  // ... existing routers
  loadPlannerQuotes: loadPlannerQuotesRouter,
})
```

---

## Task 4: History Page UI

**File**: `src/app/(dashboard)/load-planner/history/page.tsx`

See [UI Specifications](./ui-specifications.md) for complete design.

### Step 4.1: Create the page file

### Step 4.2: Implement search bar

### Step 4.3: Implement filter dropdowns

### Step 4.4: Implement stats cards

### Step 4.5: Implement data table

### Step 4.6: Implement pagination

### Step 4.7: Implement bulk actions

### Step 4.8: Test all functionality

---

## Task 5: Edit Functionality

### Step 5.1: Modify Load Planner to detect edit mode

### Step 5.2: Fetch existing quote data

### Step 5.3: Auto-fill all tabs

### Step 5.4: Update save logic for edit vs create

### Step 5.5: Test complete edit flow

---

## Verification Checklist

After implementation, verify:

- [ ] All 6 database tables created
- [ ] RLS policies working
- [ ] Can create new quote from Load Planner
- [ ] Quote appears in history page
- [ ] Search works
- [ ] All filters work
- [ ] Sorting works
- [ ] Pagination works
- [ ] Can click Edit and form loads with data
- [ ] All tabs populated correctly
- [ ] Can save edits
- [ ] Can duplicate quote
- [ ] Can delete quote
- [ ] Activity logs created for all actions
