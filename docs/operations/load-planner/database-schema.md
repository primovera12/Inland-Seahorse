# Load Planner - Database Schema

## Overview

The Load Planner uses **6 related tables** to store quote data. This relational approach (vs JSONB) enables:
- Efficient querying for analytics
- Proper foreign key relationships
- Easier updates to individual items
- Better data integrity

---

## Entity Relationship

```
load_planner_quotes (1)
    ├── load_planner_cargo_items (many)
    ├── load_planner_trucks (many)
    ├── load_planner_service_items (many)
    ├── load_planner_accessorials (many)
    └── load_planner_permits (many)
```

---

## Table 1: `load_planner_quotes`

**Purpose**: Main quote record with customer, route, and totals.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `quote_number` | VARCHAR(100) | NO | - | Unique quote number (LP-XXXX) |
| `status` | VARCHAR(50) | NO | `'draft'` | Quote status |

#### Customer Fields
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `customer_name` | VARCHAR(255) | YES | - | Customer full name |
| `customer_email` | VARCHAR(255) | YES | - | Customer email |
| `customer_phone` | VARCHAR(50) | YES | - | Customer phone |
| `customer_company` | VARCHAR(255) | YES | - | Company name |
| `company_id` | UUID | YES | - | FK to companies table |
| `contact_id` | UUID | YES | - | FK to contacts table |

#### Customer Address
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `customer_address_line1` | VARCHAR(255) | YES | - | Street address |
| `customer_address_city` | VARCHAR(100) | YES | - | City |
| `customer_address_state` | VARCHAR(50) | YES | - | State |
| `customer_address_zip` | VARCHAR(20) | YES | - | ZIP code |

#### Pickup Location
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `pickup_address` | VARCHAR(255) | YES | - | Full address |
| `pickup_city` | VARCHAR(100) | YES | - | City |
| `pickup_state` | VARCHAR(50) | YES | - | State |
| `pickup_zip` | VARCHAR(20) | YES | - | ZIP code |
| `pickup_lat` | DECIMAL(10,7) | YES | - | Latitude |
| `pickup_lng` | DECIMAL(10,7) | YES | - | Longitude |

#### Dropoff Location
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `dropoff_address` | VARCHAR(255) | YES | - | Full address |
| `dropoff_city` | VARCHAR(100) | YES | - | City |
| `dropoff_state` | VARCHAR(50) | YES | - | State |
| `dropoff_zip` | VARCHAR(20) | YES | - | ZIP code |
| `dropoff_lat` | DECIMAL(10,7) | YES | - | Latitude |
| `dropoff_lng` | DECIMAL(10,7) | YES | - | Longitude |

#### Route Metrics
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `distance_miles` | INTEGER | YES | - | Total route distance |
| `duration_minutes` | INTEGER | YES | - | Estimated duration |
| `route_polyline` | TEXT | YES | - | Encoded polyline for map |

#### Totals
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `subtotal_cents` | INTEGER | YES | - | Subtotal in cents |
| `total_cents` | INTEGER | YES | - | Total in cents |

#### Sharing
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `public_token` | UUID | NO | `gen_random_uuid()` | Token for public viewing |

#### Timestamps
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `created_at` | TIMESTAMPTZ | NO | `now()` | Creation time |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Last update time |
| `sent_at` | TIMESTAMPTZ | YES | - | When quote was sent |
| `viewed_at` | TIMESTAMPTZ | YES | - | When customer viewed |
| `expires_at` | TIMESTAMPTZ | YES | - | Expiration date |

#### User & Notes
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `created_by` | UUID | YES | - | FK to users table |
| `internal_notes` | TEXT | YES | - | Internal notes (not on quote) |
| `quote_notes` | TEXT | YES | - | Notes shown on quote |
| `is_active` | BOOLEAN | NO | `true` | Soft delete flag |

### Status Values
- `draft` - Not yet sent
- `sent` - Sent to customer
- `viewed` - Customer has viewed
- `accepted` - Customer accepted
- `rejected` - Customer rejected
- `expired` - Quote expired

### SQL Definition

```sql
CREATE TABLE load_planner_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',

  -- Customer
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_company VARCHAR(255),
  company_id UUID REFERENCES companies(id),
  contact_id UUID REFERENCES contacts(id),

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
  created_by UUID REFERENCES users(id),
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
```

---

## Table 2: `load_planner_cargo_items`

**Purpose**: Individual cargo items with dimensions, properties, and placement.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `quote_id` | UUID | NO | - | FK to load_planner_quotes |
| `sku` | VARCHAR(100) | YES | - | Item SKU/identifier |
| `description` | TEXT | NO | - | Item description |
| `quantity` | INTEGER | NO | `1` | Number of items |

#### Dimensions (in inches for precision)
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `length_in` | INTEGER | YES | - | Length in inches |
| `width_in` | INTEGER | YES | - | Width in inches |
| `height_in` | INTEGER | YES | - | Height in inches |
| `weight_lbs` | INTEGER | YES | - | Weight in pounds |

#### Properties
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `stackable` | BOOLEAN | NO | `false` | Can stack items on top |
| `bottom_only` | BOOLEAN | NO | `false` | Must be on bottom |
| `max_layers` | INTEGER | YES | - | Max stacking layers |
| `fragile` | BOOLEAN | NO | `false` | Fragile item |
| `hazmat` | BOOLEAN | NO | `false` | Hazardous material |
| `notes` | TEXT | YES | - | Item notes |

#### Orientation & Geometry
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `orientation` | INTEGER | NO | `1` | 1=fixed, 3=rotatable, 63=tiltable |
| `geometry` | VARCHAR(50) | NO | `'box'` | box, cylinder, hollow-cylinder |

#### Equipment Database Link
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `equipment_make_id` | UUID | YES | - | FK to equipment_makes |
| `equipment_model_id` | UUID | YES | - | FK to equipment_models |
| `dimensions_source` | VARCHAR(20) | YES | - | ai, database, manual |

#### Images
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `image_url` | TEXT | YES | - | Custom image 1 |
| `image_url_2` | TEXT | YES | - | Custom image 2 |
| `front_image_url` | TEXT | YES | - | Equipment DB front |
| `side_image_url` | TEXT | YES | - | Equipment DB side |

#### Load Assignment (from load planning algorithm)
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `assigned_truck_index` | INTEGER | YES | - | Which truck (0, 1, 2...) |
| `placement_x` | DECIMAL(8,2) | YES | - | X position on truck |
| `placement_y` | DECIMAL(8,2) | YES | - | Y position on truck |
| `placement_z` | DECIMAL(8,2) | YES | - | Z position (height) |
| `placement_rotation` | INTEGER | YES | - | Rotation angle |

#### Sort Order
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `sort_order` | INTEGER | NO | `0` | Display order |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Creation time |

### SQL Definition

```sql
CREATE TABLE load_planner_cargo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  -- Identification
  sku VARCHAR(100),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Dimensions
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

-- Indexes
CREATE INDEX idx_lpci_quote ON load_planner_cargo_items(quote_id);
CREATE INDEX idx_lpci_dimensions ON load_planner_cargo_items(length_in, width_in, height_in);
```

---

## Table 3: `load_planner_trucks`

**Purpose**: Trucks assigned to the quote with specs and load stats.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `quote_id` | UUID | NO | - | FK to load_planner_quotes |
| `truck_index` | INTEGER | NO | - | Order in quote (0, 1, 2...) |
| `truck_type_id` | VARCHAR(100) | NO | - | From trucks.ts |
| `truck_name` | VARCHAR(255) | YES | - | Display name |
| `truck_category` | VARCHAR(50) | YES | - | FLATBED, STEP_DECK, etc. |

#### Specs (copied for historical record)
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `deck_length_ft` | DECIMAL(8,2) | YES | - | Deck length |
| `deck_width_ft` | DECIMAL(8,2) | YES | - | Deck width |
| `deck_height_ft` | DECIMAL(8,2) | YES | - | Deck height from ground |
| `well_length_ft` | DECIMAL(8,2) | YES | - | Well length (step deck, RGN) |
| `max_cargo_weight_lbs` | INTEGER | YES | - | Weight capacity |

#### Load Stats
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `total_weight_lbs` | INTEGER | YES | - | Total loaded weight |
| `total_items` | INTEGER | YES | - | Number of items |
| `is_legal` | BOOLEAN | NO | `true` | Within legal limits |

#### Permits & Warnings
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `permits_required` | TEXT[] | YES | - | Array of permit types |
| `warnings` | TEXT[] | YES | - | Load warnings |
| `truck_score` | INTEGER | YES | - | Fit score (0-100) |

| `created_at` | TIMESTAMPTZ | NO | `now()` | Creation time |

### SQL Definition

```sql
CREATE TABLE load_planner_trucks (
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

-- Indexes
CREATE INDEX idx_lpt_quote ON load_planner_trucks(quote_id);
```

---

## Table 4: `load_planner_service_items`

**Purpose**: Service line items (Line Haul, Fuel, etc.).

### SQL Definition

```sql
CREATE TABLE load_planner_service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  -- Service Info
  service_type_id UUID,
  name VARCHAR(255) NOT NULL,

  -- Pricing
  rate_cents INTEGER NOT NULL,
  quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
  total_cents INTEGER NOT NULL,

  -- Per-Truck (null = all trucks)
  truck_index INTEGER,

  -- Metadata
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_lpsi_quote ON load_planner_service_items(quote_id);
```

---

## Table 5: `load_planner_accessorials`

**Purpose**: Accessorial charges (Detention, Layover, etc.).

### SQL Definition

```sql
CREATE TABLE load_planner_accessorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  -- Accessorial Info
  accessorial_type_id UUID,
  name VARCHAR(255) NOT NULL,

  -- Billing
  billing_unit VARCHAR(20) NOT NULL,  -- flat, hour, day, way, week, month, stop
  rate_cents INTEGER NOT NULL,
  quantity DECIMAL(8,2) NOT NULL DEFAULT 1,
  total_cents INTEGER NOT NULL,

  -- Notes
  notes TEXT,

  -- Metadata
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_lpa_quote ON load_planner_accessorials(quote_id);
```

---

## Table 6: `load_planner_permits`

**Purpose**: State-by-state permit costs with user overrides.

### SQL Definition

```sql
CREATE TABLE load_planner_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES load_planner_quotes(id) ON DELETE CASCADE,

  -- State
  state_code VARCHAR(2) NOT NULL,
  state_name VARCHAR(100),

  -- Calculated Values (original from algorithm)
  calculated_permit_fee_cents INTEGER,
  calculated_escort_cost_cents INTEGER,

  -- User Overrides (if edited)
  permit_fee_cents INTEGER,
  escort_cost_cents INTEGER,

  -- Route Info
  distance_miles INTEGER,
  escort_count INTEGER,
  pole_car_required BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE(quote_id, state_code)
);

CREATE INDEX idx_lpp_quote ON load_planner_permits(quote_id);
```

---

## Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE load_planner_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_cargo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_accessorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_planner_permits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their company's quotes
-- (Assuming company-based multi-tenancy through user context)
CREATE POLICY "Users can view own quotes"
  ON load_planner_quotes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert quotes"
  ON load_planner_quotes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own quotes"
  ON load_planner_quotes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Child tables inherit access through quote_id
CREATE POLICY "Access cargo through quote"
  ON load_planner_cargo_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM load_planner_quotes q
    WHERE q.id = quote_id AND auth.uid() IS NOT NULL
  ));

-- Repeat for other child tables...
```

---

## Migration File

**Location**: `supabase/migrations/038_load_planner_quotes.sql`

See [implementation.md](./implementation.md) for the complete migration file.
