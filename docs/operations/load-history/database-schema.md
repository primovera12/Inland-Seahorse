# Load History - Database Schema

## Table: `load_history`

**Purpose**: Track every completed load with full details for margin tracking and business intelligence.

---

## Columns

### Identification
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key |

### Quote Links
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `load_planner_quote_id` | UUID | YES | FK to load_planner_quotes |
| `inland_quote_id` | UUID | YES | FK to inland_quotes |
| `quote_number` | VARCHAR(100) | YES | Reference quote number |

### Customer (Denormalized)
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `customer_name` | VARCHAR(255) | YES | Customer name |
| `customer_company` | VARCHAR(255) | YES | Customer company |

### Carrier Assignment
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `carrier_id` | UUID | YES | FK to carriers |
| `driver_id` | UUID | YES | FK to carrier_drivers |
| `truck_id` | UUID | YES | FK to carrier_trucks |

### Route
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `origin_city` | VARCHAR(100) | NO | Pickup city |
| `origin_state` | VARCHAR(50) | NO | Pickup state |
| `origin_zip` | VARCHAR(20) | YES | Pickup ZIP |
| `destination_city` | VARCHAR(100) | NO | Delivery city |
| `destination_state` | VARCHAR(50) | NO | Delivery state |
| `destination_zip` | VARCHAR(20) | YES | Delivery ZIP |
| `total_miles` | INTEGER | YES | Total route miles |

### Cargo
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `cargo_description` | TEXT | YES | - | What was shipped |
| `cargo_pieces` | INTEGER | YES | - | Number of pieces |
| `cargo_length_in` | INTEGER | YES | - | Length in inches |
| `cargo_width_in` | INTEGER | YES | - | Width in inches |
| `cargo_height_in` | INTEGER | YES | - | Height in inches |
| `cargo_weight_lbs` | INTEGER | YES | - | Weight in pounds |
| `is_oversize` | BOOLEAN | NO | `false` | Required oversize permits |
| `is_overweight` | BOOLEAN | NO | `false` | Required overweight permits |
| `equipment_type_used` | VARCHAR(50) | YES | - | flatbed, step_deck, etc. |

### Financials (all in cents)
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `customer_rate_cents` | INTEGER | YES | What customer paid |
| `carrier_rate_cents` | INTEGER | YES | What you paid carrier |
| `margin_cents` | INTEGER | YES | Profit (customer - carrier) |
| `margin_percentage` | DECIMAL(5,2) | YES | Margin % |
| `rate_per_mile_customer_cents` | INTEGER | YES | Customer rate ÷ miles |
| `rate_per_mile_carrier_cents` | INTEGER | YES | Carrier rate ÷ miles |

### Dates
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `quote_date` | DATE | YES | When quoted |
| `booked_date` | DATE | YES | When booked |
| `pickup_date` | DATE | YES | Actual pickup |
| `delivery_date` | DATE | YES | Actual delivery |
| `invoice_date` | DATE | YES | When invoiced |
| `paid_date` | DATE | YES | When paid |

### Status & Metadata
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `status` | VARCHAR(50) | NO | `'completed'` | Load status |
| `notes` | TEXT | YES | - | Internal notes |
| `created_at` | TIMESTAMPTZ | NO | `now()` | Created timestamp |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Updated timestamp |

---

## Status Values

- `booked` - Load is booked but not picked up
- `in_transit` - Load is on the way
- `delivered` - Load delivered, pending completion
- `completed` - Load fully completed
- `cancelled` - Load was cancelled

---

## SQL Definition

```sql
CREATE TABLE load_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quote Links
  load_planner_quote_id UUID REFERENCES load_planner_quotes(id) ON DELETE SET NULL,
  inland_quote_id UUID REFERENCES inland_quotes(id) ON DELETE SET NULL,
  quote_number VARCHAR(100),

  -- Customer (denormalized for history)
  customer_name VARCHAR(255),
  customer_company VARCHAR(255),

  -- Carrier Assignment
  carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES carrier_drivers(id) ON DELETE SET NULL,
  truck_id UUID REFERENCES carrier_trucks(id) ON DELETE SET NULL,

  -- Route
  origin_city VARCHAR(100) NOT NULL,
  origin_state VARCHAR(50) NOT NULL,
  origin_zip VARCHAR(20),
  destination_city VARCHAR(100) NOT NULL,
  destination_state VARCHAR(50) NOT NULL,
  destination_zip VARCHAR(20),
  total_miles INTEGER,

  -- Cargo
  cargo_description TEXT,
  cargo_pieces INTEGER,
  cargo_length_in INTEGER,
  cargo_width_in INTEGER,
  cargo_height_in INTEGER,
  cargo_weight_lbs INTEGER,
  is_oversize BOOLEAN NOT NULL DEFAULT false,
  is_overweight BOOLEAN NOT NULL DEFAULT false,
  equipment_type_used VARCHAR(50),

  -- Financials
  customer_rate_cents INTEGER,
  carrier_rate_cents INTEGER,
  margin_cents INTEGER,
  margin_percentage DECIMAL(5,2),
  rate_per_mile_customer_cents INTEGER,
  rate_per_mile_carrier_cents INTEGER,

  -- Dates
  quote_date DATE,
  booked_date DATE,
  pickup_date DATE,
  delivery_date DATE,
  invoice_date DATE,
  paid_date DATE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('booked', 'in_transit', 'delivered', 'completed', 'cancelled')),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for common queries
CREATE INDEX idx_lh_dates ON load_history(pickup_date DESC, delivery_date DESC);
CREATE INDEX idx_lh_lane ON load_history(origin_state, destination_state);
CREATE INDEX idx_lh_carrier ON load_history(carrier_id) WHERE carrier_id IS NOT NULL;
CREATE INDEX idx_lh_equipment ON load_history(equipment_type_used) WHERE equipment_type_used IS NOT NULL;
CREATE INDEX idx_lh_margin ON load_history(margin_percentage) WHERE margin_percentage IS NOT NULL;
CREATE INDEX idx_lh_dimensions ON load_history(cargo_length_in, cargo_width_in, cargo_height_in);
CREATE INDEX idx_lh_customer ON load_history(customer_name);

-- Full text search for cargo description
CREATE INDEX idx_lh_cargo_fts ON load_history USING gin(to_tsvector('english', cargo_description));
```

---

## Calculated Fields

These fields are calculated on insert/update:

```sql
-- Trigger to calculate margin fields
CREATE OR REPLACE FUNCTION calculate_load_margins()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate margin in cents
  IF NEW.customer_rate_cents IS NOT NULL AND NEW.carrier_rate_cents IS NOT NULL THEN
    NEW.margin_cents := NEW.customer_rate_cents - NEW.carrier_rate_cents;

    -- Calculate margin percentage
    IF NEW.customer_rate_cents > 0 THEN
      NEW.margin_percentage := (NEW.margin_cents::DECIMAL / NEW.customer_rate_cents) * 100;
    END IF;
  END IF;

  -- Calculate rate per mile
  IF NEW.total_miles IS NOT NULL AND NEW.total_miles > 0 THEN
    IF NEW.customer_rate_cents IS NOT NULL THEN
      NEW.rate_per_mile_customer_cents := NEW.customer_rate_cents / NEW.total_miles;
    END IF;
    IF NEW.carrier_rate_cents IS NOT NULL THEN
      NEW.rate_per_mile_carrier_cents := NEW.carrier_rate_cents / NEW.total_miles;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER load_history_calculate_margins
  BEFORE INSERT OR UPDATE ON load_history
  FOR EACH ROW
  EXECUTE FUNCTION calculate_load_margins();
```

---

## Row Level Security

```sql
ALTER TABLE load_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view load history" ON load_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert load history" ON load_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update load history" ON load_history
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete load history" ON load_history
  FOR DELETE USING (auth.uid() IS NOT NULL);
```

---

## Analytics Queries

### Similar Loads Lookup

```sql
-- Find similar loads for pricing reference
SELECT
  pickup_date,
  origin_city || ', ' || origin_state AS origin,
  destination_city || ', ' || destination_state AS destination,
  cargo_length_in || 'x' || cargo_width_in || 'x' || cargo_height_in AS dimensions,
  cargo_weight_lbs,
  equipment_type_used,
  customer_rate_cents,
  carrier_rate_cents,
  margin_percentage
FROM load_history
WHERE
  -- Same lane (or nearby)
  origin_state = $1
  AND destination_state = $2
  -- Similar dimensions (within 20%)
  AND cargo_length_in BETWEEN $3 * 0.8 AND $3 * 1.2
  AND cargo_width_in BETWEEN $4 * 0.8 AND $4 * 1.2
  AND cargo_height_in BETWEEN $5 * 0.8 AND $5 * 1.2
  -- Recent loads
  AND pickup_date >= CURRENT_DATE - INTERVAL '6 months'
ORDER BY pickup_date DESC
LIMIT 10;
```

### Lane Profitability

```sql
-- Most profitable lanes
SELECT
  origin_state,
  destination_state,
  COUNT(*) AS load_count,
  SUM(customer_rate_cents) AS total_revenue,
  SUM(carrier_rate_cents) AS total_cost,
  SUM(margin_cents) AS total_margin,
  AVG(margin_percentage) AS avg_margin_pct
FROM load_history
WHERE pickup_date >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY origin_state, destination_state
ORDER BY total_margin DESC
LIMIT 20;
```

### Carrier Performance

```sql
-- Carrier stats
SELECT
  c.company_name,
  COUNT(lh.id) AS load_count,
  SUM(lh.carrier_rate_cents) AS total_paid,
  AVG(lh.carrier_rate_cents) AS avg_rate,
  AVG(lh.margin_percentage) AS avg_margin_when_used
FROM load_history lh
JOIN carriers c ON c.id = lh.carrier_id
WHERE lh.pickup_date >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY c.id, c.company_name
ORDER BY load_count DESC;
```
