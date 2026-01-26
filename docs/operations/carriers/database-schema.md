# Carriers - Database Schema

## Overview

The Carriers module uses **3 related tables**:

```
carriers (1)
├── carrier_drivers (many)
└── carrier_trucks (many)
    └── assigned_driver_id → carrier_drivers
```

---

## Table 1: `carriers`

**Purpose**: Trucking companies or individual owner-operators.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `carrier_type` | VARCHAR(20) | NO | - | `'company'` or `'owner_operator'` |

#### Company Info
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `company_name` | VARCHAR(255) | YES | Company name |
| `mc_number` | VARCHAR(50) | YES | Motor Carrier number |
| `dot_number` | VARCHAR(50) | YES | DOT number |
| `ein_tax_id` | VARCHAR(50) | YES | Tax ID / EIN |

#### Address
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `address_line1` | VARCHAR(255) | YES | Street address |
| `address_line2` | VARCHAR(255) | YES | Suite, unit, etc. |
| `city` | VARCHAR(100) | YES | City |
| `state` | VARCHAR(50) | YES | State |
| `zip` | VARCHAR(20) | YES | ZIP code |

#### Billing
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `billing_email` | VARCHAR(255) | YES | - | Email for invoices |
| `payment_terms_days` | INTEGER | NO | `30` | Net 30, Net 15, etc. |
| `preferred_payment_method` | VARCHAR(50) | YES | - | check, ach, quick_pay, factoring |

#### Factoring Company
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `factoring_company_name` | VARCHAR(255) | YES | Factoring company name |
| `factoring_company_phone` | VARCHAR(50) | YES | Factoring phone |
| `factoring_company_email` | VARCHAR(255) | YES | Factoring email |

#### Insurance
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `insurance_company` | VARCHAR(255) | YES | Insurance provider |
| `insurance_policy_number` | VARCHAR(100) | YES | Policy number |
| `insurance_expiry` | DATE | YES | Insurance expiration |
| `cargo_insurance_limit_cents` | INTEGER | YES | Cargo coverage limit |

#### Status & Metadata
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `status` | VARCHAR(50) | NO | `'active'` | Carrier status |
| `notes` | TEXT | YES | - | Internal notes |
| `is_active` | BOOLEAN | NO | `true` | Soft delete flag |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Updated timestamp |

### SQL Definition

```sql
CREATE TABLE carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_type VARCHAR(20) NOT NULL CHECK (carrier_type IN ('company', 'owner_operator')),

  -- Company Info
  company_name VARCHAR(255),
  mc_number VARCHAR(50),
  dot_number VARCHAR(50),
  ein_tax_id VARCHAR(50),

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),

  -- Billing
  billing_email VARCHAR(255),
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  preferred_payment_method VARCHAR(50),

  -- Factoring
  factoring_company_name VARCHAR(255),
  factoring_company_phone VARCHAR(50),
  factoring_company_email VARCHAR(255),

  -- Insurance
  insurance_company VARCHAR(255),
  insurance_policy_number VARCHAR(100),
  insurance_expiry DATE,
  cargo_insurance_limit_cents INTEGER,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'preferred', 'on_hold', 'blacklisted')),

  -- Metadata
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_carriers_type ON carriers(carrier_type) WHERE is_active = true;
CREATE INDEX idx_carriers_status ON carriers(status) WHERE is_active = true;
CREATE INDEX idx_carriers_mc ON carriers(mc_number) WHERE mc_number IS NOT NULL;
CREATE INDEX idx_carriers_name ON carriers(company_name) WHERE is_active = true;
CREATE INDEX idx_carriers_state ON carriers(state) WHERE is_active = true;
```

---

## Table 2: `carrier_drivers`

**Purpose**: Individual drivers working for carriers.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `carrier_id` | UUID | NO | - | FK to carriers |
| `is_owner` | BOOLEAN | NO | `false` | True if driver IS the owner-operator |

#### Personal Info
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `first_name` | VARCHAR(100) | NO | First name |
| `last_name` | VARCHAR(100) | NO | Last name |
| `nickname` | VARCHAR(100) | YES | Preferred name |

#### Contact
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `phone` | VARCHAR(50) | YES | Primary phone |
| `phone_secondary` | VARCHAR(50) | YES | Secondary phone |
| `email` | VARCHAR(255) | YES | Email address |

#### Address
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `address_line1` | VARCHAR(255) | YES | Street address |
| `city` | VARCHAR(100) | YES | City |
| `state` | VARCHAR(50) | YES | State |
| `zip` | VARCHAR(20) | YES | ZIP code |

#### CDL Information
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `cdl_number` | VARCHAR(50) | YES | CDL license number |
| `cdl_state` | VARCHAR(10) | YES | State that issued CDL |
| `cdl_class` | VARCHAR(10) | YES | Class: A, B, or C |
| `cdl_expiry` | DATE | YES | CDL expiration date |
| `cdl_endorsements` | VARCHAR(100) | YES | H, N, T, P, S endorsements |
| `medical_card_expiry` | DATE | YES | DOT medical card expiration |

#### Emergency Contact
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `emergency_contact_name` | VARCHAR(255) | YES | Emergency contact name |
| `emergency_contact_phone` | VARCHAR(50) | YES | Emergency contact phone |
| `emergency_contact_relationship` | VARCHAR(100) | YES | Relationship |

#### Status & Metadata
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `status` | VARCHAR(50) | NO | `'active'` | Driver status |
| `notes` | TEXT | YES | - | Internal notes |
| `is_active` | BOOLEAN | NO | `true` | Soft delete flag |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Updated timestamp |

### SQL Definition

```sql
CREATE TABLE carrier_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  is_owner BOOLEAN NOT NULL DEFAULT false,

  -- Personal
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  nickname VARCHAR(100),

  -- Contact
  phone VARCHAR(50),
  phone_secondary VARCHAR(50),
  email VARCHAR(255),

  -- Address
  address_line1 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),

  -- CDL
  cdl_number VARCHAR(50),
  cdl_state VARCHAR(10),
  cdl_class VARCHAR(10) CHECK (cdl_class IN ('A', 'B', 'C')),
  cdl_expiry DATE,
  cdl_endorsements VARCHAR(100),
  medical_card_expiry DATE,

  -- Emergency Contact
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relationship VARCHAR(100),

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'on_leave')),

  -- Metadata
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_cd_carrier ON carrier_drivers(carrier_id);
CREATE INDEX idx_cd_status ON carrier_drivers(status) WHERE is_active = true;
CREATE INDEX idx_cd_name ON carrier_drivers(last_name, first_name) WHERE is_active = true;
CREATE INDEX idx_cd_cdl_expiry ON carrier_drivers(cdl_expiry) WHERE cdl_expiry IS NOT NULL;
```

---

## Table 3: `carrier_trucks`

**Purpose**: Trucks/trailers owned or operated by carriers.

### Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |
| `carrier_id` | UUID | NO | - | FK to carriers |
| `assigned_driver_id` | UUID | YES | - | FK to carrier_drivers |

#### Identification
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `unit_number` | VARCHAR(50) | YES | Carrier's internal unit number |
| `vin` | VARCHAR(50) | YES | Vehicle Identification Number |
| `license_plate` | VARCHAR(50) | YES | License plate number |
| `license_plate_state` | VARCHAR(10) | YES | Plate state |

#### Vehicle Info
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `year` | INTEGER | YES | Year manufactured |
| `make` | VARCHAR(100) | YES | Manufacturer |
| `model` | VARCHAR(100) | YES | Model name |

#### Type
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `truck_type_id` | VARCHAR(100) | YES | Links to trucks.ts |
| `category` | VARCHAR(50) | YES | FLATBED, STEP_DECK, etc. |
| `custom_type_description` | VARCHAR(255) | YES | If not standard type |

#### Specifications
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `deck_length_ft` | DECIMAL(8,2) | YES | Deck length in feet |
| `deck_width_ft` | DECIMAL(8,2) | YES | Deck width in feet |
| `deck_height_ft` | DECIMAL(8,2) | YES | Height from ground |
| `well_length_ft` | DECIMAL(8,2) | YES | Well length |
| `max_cargo_weight_lbs` | INTEGER | YES | Max weight capacity |
| `tare_weight_lbs` | INTEGER | YES | Empty trailer weight |
| `axle_count` | INTEGER | YES | Number of axles |

#### Equipment
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `has_tarps` | BOOLEAN | NO | `false` | Has tarps |
| `tarp_type` | VARCHAR(50) | YES | - | lumber, steel, smoke, coil |
| `has_chains` | BOOLEAN | NO | `false` | Has chains |
| `chain_count` | INTEGER | YES | - | Number of chains |
| `has_straps` | BOOLEAN | NO | `false` | Has straps |
| `strap_count` | INTEGER | YES | - | Number of straps |
| `has_coil_racks` | BOOLEAN | NO | `false` | Has coil racks |
| `has_load_bars` | BOOLEAN | NO | `false` | Has load bars |
| `has_ramps` | BOOLEAN | NO | `false` | Has ramps |
| `other_equipment` | TEXT | YES | - | Other equipment notes |

#### Compliance
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `registration_state` | VARCHAR(10) | YES | Registration state |
| `registration_expiry` | DATE | YES | Registration expiration |
| `annual_inspection_date` | DATE | YES | Last inspection |
| `annual_inspection_expiry` | DATE | YES | Inspection expiration |

#### Status & Metadata
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `status` | VARCHAR(50) | NO | `'active'` | Truck status |
| `notes` | TEXT | YES | - | Internal notes |
| `image_url` | TEXT | YES | - | Photo of truck |
| `is_active` | BOOLEAN | NO | `true` | Soft delete flag |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Updated timestamp |

### SQL Definition

```sql
CREATE TABLE carrier_trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
  assigned_driver_id UUID REFERENCES carrier_drivers(id) ON DELETE SET NULL,

  -- Identification
  unit_number VARCHAR(50),
  vin VARCHAR(50),
  license_plate VARCHAR(50),
  license_plate_state VARCHAR(10),

  -- Vehicle
  year INTEGER,
  make VARCHAR(100),
  model VARCHAR(100),

  -- Type
  truck_type_id VARCHAR(100),
  category VARCHAR(50),
  custom_type_description VARCHAR(255),

  -- Specs
  deck_length_ft DECIMAL(8,2),
  deck_width_ft DECIMAL(8,2),
  deck_height_ft DECIMAL(8,2),
  well_length_ft DECIMAL(8,2),
  max_cargo_weight_lbs INTEGER,
  tare_weight_lbs INTEGER,
  axle_count INTEGER,

  -- Equipment
  has_tarps BOOLEAN NOT NULL DEFAULT false,
  tarp_type VARCHAR(50),
  has_chains BOOLEAN NOT NULL DEFAULT false,
  chain_count INTEGER,
  has_straps BOOLEAN NOT NULL DEFAULT false,
  strap_count INTEGER,
  has_coil_racks BOOLEAN NOT NULL DEFAULT false,
  has_load_bars BOOLEAN NOT NULL DEFAULT false,
  has_ramps BOOLEAN NOT NULL DEFAULT false,
  other_equipment TEXT,

  -- Compliance
  registration_state VARCHAR(10),
  registration_expiry DATE,
  annual_inspection_date DATE,
  annual_inspection_expiry DATE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'out_of_service', 'sold')),

  -- Metadata
  notes TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_ct_carrier ON carrier_trucks(carrier_id);
CREATE INDEX idx_ct_driver ON carrier_trucks(assigned_driver_id) WHERE assigned_driver_id IS NOT NULL;
CREATE INDEX idx_ct_category ON carrier_trucks(category) WHERE is_active = true;
CREATE INDEX idx_ct_status ON carrier_trucks(status) WHERE is_active = true;
```

---

## Complete Migration

**File**: `supabase/migrations/039_carriers.sql`

Combine all three tables with RLS policies and triggers.
