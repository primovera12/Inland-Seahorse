# Full Data Migration Reference

## Database Connections

### OLD Database (Source)
- **Project**: `piwpnmitxtlnhjtjarbo`
- **URL**: `https://piwpnmitxtlnhjtjarbo.supabase.co`
- **Connection String**: `postgresql://postgres:Ba2xw22b.123@db.piwpnmitxtlnhjtjarbo.supabase.co:5432/postgres`
- **Anon Key**: Found in `.env.local` as `OLD_SUPABASE_ANON_KEY`

### NEW Database (Target)
- **Project**: `nsqcttbciocfumhvdnod`
- **URL**: `https://nsqcttbciocfumhvdnod.supabase.co`
- **Connection String**: `postgresql://postgres:Ba2xw22b.123@db.nsqcttbciocfumhvdnod.supabase.co:5432/postgres`
- **Anon Key**: Found in `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Service Role Key**: Found in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

---

## Existing Migration Scripts

Located in `/scripts/`:

| Script | Purpose | Safe to Re-run? |
|--------|---------|-----------------|
| `explore-old-db.mjs` | Lists all tables and row counts in old database | Yes (read-only) |
| `migrate-data.mjs` | Main migration - DELETES existing data first | NO - destructive |
| `migrate-missing-data.mjs` | Secondary data with ON CONFLICT DO NOTHING | Yes |
| `migrate-images.js` | Equipment images (base64 → storage) | Yes |
| `migrate-old-quotes.js` | Quotes with full data preservation | Yes |
| `migrate-missing-models.js` | Missing models only | Yes |
| `fix-rate-tiers.mjs` | Fix rate tier data | Partial |

---

## Complete Table Mapping

### Equipment Tables

| OLD Table | OLD Columns | NEW Table | NEW Columns | Notes |
|-----------|-------------|-----------|-------------|-------|
| `makes` | id, name, created_at | `makes` | id, name, popularity_rank, created_at, updated_at | Direct mapping |
| `models` | id, make_id, name, created_at | `models` | id, make_id, name, created_at, updated_at | Direct mapping |
| `equipment_dimensions` | id, model_id, transport_length, transport_width, transport_height, shipping_weight, operating_weight, front_image_base64, side_image_base64 | `equipment_dimensions` | id, model_id, length_inches, width_inches, height_inches, weight_lbs, front_image_url, side_image_url | Feet→Inches (×12), stored as total inches, displayed as ft-in. base64→URL |
| `rates` + `location_costs` | rate_id, make_id, model_id, location, local_drayage_cost, dismantling_loading_cost, loading_cost, blocking_bracing_cost, chassis_cost, tolls_cost, escorts_cost, miscellaneous_costs | `rates` | id, make_id, model_id, location, dismantling_loading_cost, loading_cost, blocking_bracing_cost, rigging_cost, storage_cost, transport_cost, equipment_cost, labor_cost, permit_cost, escort_cost, miscellaneous_cost | Dollars→Cents, column remapping |

### CRM Tables

| OLD Table | OLD Columns | NEW Table | NEW Columns | Notes |
|-----------|-------------|-----------|-------------|-------|
| `companies` | id, name, industry, website, phone, address, city, state, zip, billing_*, payment_terms, tax_id, tags, status | `companies` | Same + credit_limit, account_number, total_quotes, total_revenue, last_quote_at, last_activity_at | Direct + new fields |
| `customers` | id, name, company, phone, address, billing_*, payment_terms | `companies` | Merged into companies table | Merged by name, skip duplicates |
| `contacts` | id, company_id, first_name, last_name, email, phone, mobile, title, role, is_primary, notes | `contacts` | Same columns | Direct mapping |

### Quote Tables

**CRITICAL: Old quotes must be FULLY TRANSFORMED to match new schema**

The migration must "hydrate" old quotes with current equipment data so they work seamlessly when editing:

1. **Lookup equipment**: Find the make/model in the new DB to get `make_id` and `model_id`
2. **Lookup dimensions**: Get current `length_inches`, `width_inches`, `height_inches`, `weight_lbs` from `equipment_dimensions`
3. **Lookup images**: Get current `front_image_url`, `side_image_url` from `equipment_dimensions`
4. **Lookup rates**: Get current costs from `rates` table for the location
5. **Build complete quote_data**: Populate ALL fields so editing works exactly like a new quote

This ensures old quotes are not "broken" or have missing data when opened in the editor.

### Quote Transformation Example

**Old quote in old DB:**
```
quote_number: "Q-2024-001"
equipment_make: "Caterpillar"
equipment_model: "D6T"
location: "New Jersey"
subtotal: 5000.00 (dollars)
margin_percentage: 15
total_with_margin: 5750.00 (dollars)
```

**Migration process:**
```javascript
// 1. Find equipment IDs
const make = await query("SELECT id FROM makes WHERE name = 'Caterpillar'")
const model = await query("SELECT id FROM models WHERE make_id = $1 AND name = 'D6T'", [make.id])

// 2. Get current dimensions & images
const dimensions = await query("SELECT * FROM equipment_dimensions WHERE model_id = $1", [model.id])
// Returns: { length_inches: 234, width_inches: 120, height_inches: 132, weight_lbs: 48500, front_image_url: "...", side_image_url: "..." }

// 3. Get current rates for location
const rates = await query("SELECT * FROM rates WHERE model_id = $1 AND location = 'New Jersey'", [model.id])
// Returns all cost fields in cents

// 4. Build complete quote_data with ALL fields populated
```

**Result in new DB - fully functional quote:**
```javascript
{
  // IDs for foreign key relationships
  make_id: "uuid-of-caterpillar",
  model_id: "uuid-of-d6t",

  // Names for display
  make_name: "Caterpillar",
  model_name: "D6T",
  location: "New Jersey",

  // Dimensions from equipment_dimensions (in inches, displays as ft-in)
  length_inches: 234,  // displays as 19' 6"
  width_inches: 120,   // displays as 10' 0"
  height_inches: 132,  // displays as 11' 0"
  weight_lbs: 48500,

  // Images from equipment_dimensions
  front_image_url: "https://xxx.supabase.co/storage/v1/object/public/equipment-images/...",
  side_image_url: "https://xxx.supabase.co/storage/v1/object/public/equipment-images/...",

  // Costs from rates table (all in cents)
  costs: {
    dismantling_loading_cost: 150000,  // $1,500
    loading_cost: 75000,               // $750
    // ... all 11 cost fields
  },
  enabled_costs: {
    dismantling_loading_cost: true,
    loading_cost: true,
    // ... true for costs > 0
  },
  cost_overrides: {
    // null for all (no overrides from old quote)
  },
  cost_descriptions: {
    dismantling_loading_cost: "Dismantling & Loading",
    // ... standard descriptions
  },

  // Pricing (converted to cents)
  subtotal: 500000,        // $5,000 in cents
  margin_percentage: 15,
  margin_amount: 75000,    // $750 in cents
  total: 575000,           // $5,750 in cents

  // Required fields with defaults
  is_multi_equipment: false,
  equipment_blocks: [],
  is_custom_quote: false,
  version: 1,
  is_latest_version: true,

  // Timestamps preserved
  created_at: "2024-01-15T...",
  updated_at: "2024-01-15T..."
}
```

Now when you open this quote to edit, it has ALL the data it needs - dimensions, images, costs, everything. No glitches.

#### Dismantle Quote History

**Table columns:**
| OLD Column | NEW Column | Transform |
|------------|------------|-----------|
| id | id | Direct |
| quote_number | quote_number | Direct |
| status | status | Map: pending→draft |
| company_id | company_id | Direct (FK) |
| contact_id | contact_id | Direct (FK) |
| customer_name | customer_name | Direct |
| customer_email | customer_email | Direct |
| equipment_make | make_name | Direct |
| equipment_model | model_name | Direct |
| location | location | Direct |
| subtotal | subtotal | Dollars→Cents |
| margin_percentage | margin_percentage | Direct |
| margin_amount | margin_amount | Dollars→Cents |
| total_with_margin | total | Dollars→Cents |
| sent_at | sent_at | Direct |

**quote_data JSONB structure (NEW):**
```javascript
{
  // Required fields
  quote_number: string,
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired',

  // Customer info
  customer_name: string,
  customer_email: string,
  customer_phone: string,
  customer_company: string,
  company_id: uuid,
  contact_id: uuid,

  // Billing (from company or old quote)
  billing_address: string,
  billing_city: string,
  billing_state: string,
  billing_zip: string,
  payment_terms: string,

  // Equipment (lookup from models table)
  make_id: uuid,
  model_id: uuid,
  make_name: string,
  model_name: string,
  location: 'New Jersey' | 'Savannah' | 'Houston' | 'Chicago' | 'Oakland' | 'Long Beach',

  // Dimensions (lookup from equipment_dimensions table by model_id)
  // STORED in total inches, DISPLAYED as ft-in (e.g., 126 inches = 10' 6")
  length_inches: number,   // e.g., 126 (displays as 10' 6")
  width_inches: number,    // e.g., 102 (displays as 8' 6")
  height_inches: number,   // e.g., 144 (displays as 12' 0")
  weight_lbs: number,      // e.g., 48000

  // Images (lookup from equipment_dimensions table)
  front_image_url: string,
  side_image_url: string,

  // Costs structure (all in CENTS)
  costs: {
    dismantling_loading_cost: number,
    loading_cost: number,
    blocking_bracing_cost: number,
    rigging_cost: number,
    storage_cost: number,
    transport_cost: number,
    equipment_cost: number,
    labor_cost: number,
    permit_cost: number,
    escort_cost: number,
    miscellaneous_cost: number
  },
  enabled_costs: {
    dismantling_loading_cost: boolean,
    loading_cost: boolean,
    // ... all cost fields as booleans (true if value > 0)
  },
  cost_overrides: {
    dismantling_loading_cost: number | null,
    // ... all cost fields (null if no override)
  },
  cost_descriptions: {
    dismantling_loading_cost: 'Dismantling & Loading',
    loading_cost: 'Loading',
    blocking_bracing_cost: 'Blocking & Bracing',
    rigging_cost: 'Rigging',
    storage_cost: 'Storage',
    transport_cost: 'Transport',
    equipment_cost: 'Equipment',
    labor_cost: 'Labor',
    permit_cost: 'Permits',
    escort_cost: 'Escort',
    miscellaneous_cost: 'Miscellaneous'
  },

  // Pricing (CENTS)
  subtotal: number,
  margin_percentage: number,
  margin_amount: number,
  total: number,

  // Miscellaneous fees array
  miscellaneous_fees: [
    { id: uuid, title: string, description: string, amount: number, is_percentage: boolean }
  ],

  // Notes
  internal_notes: string,
  quote_notes: string,

  // Multi-equipment (default false for migrated quotes)
  is_multi_equipment: false,
  equipment_blocks: [],

  // Custom quote (default false for migrated quotes)
  is_custom_quote: false,

  // Versioning (default for migrated quotes)
  version: 1,
  is_latest_version: true,

  // Timestamps
  created_at: timestamp,
  updated_at: timestamp,
  sent_at: timestamp
}
```

#### Inland Quotes

Similar structure but with route/load data instead of equipment:
```javascript
{
  // Customer info (same as dismantle)

  // Route data (from quote_data or separate columns)
  destination_blocks: [
    {
      id: uuid,
      pickup: { address, city, state, zip, lat, lng, place_id },
      dropoff: { address, city, state, zip, lat, lng, place_id },
      distance_miles: number,
      rate_per_mile: number,  // cents
      line_haul: number       // cents
    }
  ],

  // Load data
  load_blocks: [
    {
      id: uuid,
      equipment_type: string,  // Flatbed, Step Deck, etc.
      cargo_items: [
        { description, length, width, height, weight, quantity }
      ],
      services: [
        { name, rate, quantity }
      ]
    }
  ],

  // Accessorial charges
  accessorial_charges: [
    { type_id, name, rate, quantity, billing_unit, total }
  ],

  // Pricing (same structure)
}

### Settings Tables

| OLD Table | NEW Table | Notes |
|-----------|-----------|-------|
| `company_settings` | `company_settings` | UPDATE existing row, includes logo_base64, colors, contact info, terms |
| `fuel_surcharge_index` | `fuel_surcharge_index` | Direct mapping with ON CONFLICT |
| `fuel_surcharge_settings` | `fuel_surcharge_settings` | Direct mapping with ON CONFLICT |
| `inland_rate_settings` | `inland_rate_settings` | Direct mapping with ON CONFLICT |

### Reference Data Tables

| OLD Table | NEW Table | Notes |
|-----------|-----------|-------|
| `inland_equipment_types` | `inland_equipment_types` | 10 truck types (Flatbed, Step Deck, etc.) |
| `inland_accessorial_types` | `inland_accessorial_types` | 21 accessorial types (Detention, Layover, etc.) |
| `rate_tiers` | `inland_rate_tiers` | 5 distance tiers, rate_per_mile dollars→cents |
| `permit_types` | `permit_types` | 6 permit types (OW, OS, SL, ESC, BAN, RSV) |
| `inland_service_types` | `inland_service_types` | Service type options |
| `inland_load_types` | `inland_load_types` | Load type options |
| `equipment_types` | `equipment_types` | Equipment type options |

### Other Tables

| OLD Table | NEW Table | Notes |
|-----------|-----------|-------|
| `custom_fields` | `custom_fields` | Extensible field definitions |
| `tickets` | `tickets` | Support/feedback tickets |
| `activity_logs` | `activity_logs` | CRM activity tracking |

---

## Data Transformations

### Unit Conversions

**IMPORTANT: Dimension Storage & Display**
- **Storage**: All dimensions stored in **total inches** (integer)
- **Display**: Shown as **ft-in** format (e.g., "10' 6"" = 126 inches)
- **Old DB**: Stores dimensions in **feet** (decimal)
- **New DB**: Stores dimensions in **inches** (integer)

```javascript
// Feet to Inches (for migration)
function feetToInches(feet) {
  if (!feet) return 0
  return Math.round(parseFloat(feet) * 12)
}

// Inches to ft-in display (for UI)
function inchesToFtIn(totalInches) {
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches % 12
  return `${feet}' ${inches}"`
}

// Dollars to Cents
function dollarsToCents(dollars) {
  if (!dollars) return 0
  return Math.round(parseFloat(dollars) * 100)
}
```

**Examples:**
| Old DB (feet) | New DB (inches) | Display (ft-in) |
|---------------|-----------------|-----------------|
| 10.5 | 126 | 10' 6" |
| 8.25 | 99 | 8' 3" |
| 12.0 | 144 | 12' 0" |
| 6.75 | 81 | 6' 9" |

### Field Mappings

**Equipment Dimensions:**
- `transport_length` (feet) → `length_inches` (×12, stored as total inches, displayed as ft-in)
- `transport_width` (feet) → `width_inches` (×12, stored as total inches, displayed as ft-in)
- `transport_height` (feet) → `height_inches` (×12, stored as total inches, displayed as ft-in)
- `shipping_weight || operating_weight` → `weight_lbs`
- `front_image_base64` → `front_image_url` (upload to Supabase storage)
- `side_image_base64` → `side_image_url` (upload to Supabase storage)

**Dimension Display Format:**
```
Stored: 126 inches → Displayed: 10' 6"
Stored: 102 inches → Displayed: 8' 6"
Stored: 144 inches → Displayed: 12' 0"
```

**Rates (from location_costs):**
- `local_drayage_cost` → `transport_cost` (×100)
- `chassis_cost` → `equipment_cost` (×100)
- `tolls_cost` → `permit_cost` (×100)
- `escorts_cost` → `escort_cost` (×100)
- `miscellaneous_costs` → `miscellaneous_cost` (×100)

**Customers → Companies:**
- `customer.company || customer.name` → `company.name`
- Skip if company with same name (case-insensitive) already exists

**Quote Status Mapping:**
- `pending` → `draft`
- `sent` → `sent`
- `accepted` → `accepted`
- `rejected` → `rejected`
- `expired` → `expired`

---

## Migration Strategy: Safe Mode (Preserve Existing Data)

### Approach
Use `ON CONFLICT DO NOTHING` for all inserts to skip duplicates and preserve existing data.

### Order of Operations

1. **Equipment Data** (foreign key dependencies)
   - Makes first (no dependencies)
   - Models second (depends on makes)
   - Equipment Dimensions third (depends on models)
   - Rates fourth (depends on makes + models)

2. **CRM Data**
   - Companies (merge customers + companies, skip by name)
   - Contacts (depends on companies, skip by id)

3. **Quote Data**
   - Quote History (depends on companies/contacts, skip by quote_number)
   - Quote Drafts (skip by id)
   - Inland Quotes (depends on companies/contacts, skip by quote_number)

4. **Settings** (single row tables)
   - Company Settings (UPDATE existing row)
   - Fuel Surcharge Settings
   - Inland Rate Settings

5. **Reference Data** (skip duplicates)
   - Inland Equipment Types
   - Inland Accessorial Types
   - Rate Tiers
   - Permit Types
   - Service Types
   - Load Types
   - Equipment Types

6. **Other Data**
   - Custom Fields
   - Tickets

7. **Images** (separate script)
   - Download base64 from old DB
   - Upload to new Supabase Storage
   - Update URLs in equipment_dimensions

---

## Script to Create: migrate-full-safe.mjs

```javascript
import pg from 'pg'

const { Client } = pg

const OLD_DB = 'postgresql://postgres:Ba2xw22b.123@db.piwpnmitxtlnhjtjarbo.supabase.co:5432/postgres'
const NEW_DB = 'postgresql://postgres:Ba2xw22b.123@db.nsqcttbciocfumhvdnod.supabase.co:5432/postgres'

const oldClient = new Client({ connectionString: OLD_DB, ssl: { rejectUnauthorized: false } })
const newClient = new Client({ connectionString: NEW_DB, ssl: { rejectUnauthorized: false } })

function feetToInches(feet) {
  if (!feet) return 0
  return Math.round(parseFloat(feet) * 12)
}

function dollarsToCents(dollars) {
  if (!dollars) return 0
  return Math.round(parseFloat(dollars) * 100)
}

async function migrate() {
  await oldClient.connect()
  await newClient.connect()

  // ... migration logic with ON CONFLICT DO NOTHING
  // See existing scripts for detailed implementation
}

migrate()
```

---

## Verification Queries

### Count Comparison
```sql
-- Run on both OLD and NEW databases
SELECT
  (SELECT COUNT(*) FROM makes) as makes,
  (SELECT COUNT(*) FROM models) as models,
  (SELECT COUNT(*) FROM equipment_dimensions) as dimensions,
  (SELECT COUNT(*) FROM rates) as rates,
  (SELECT COUNT(*) FROM companies) as companies,
  (SELECT COUNT(*) FROM contacts) as contacts,
  (SELECT COUNT(*) FROM quote_history) as quotes,
  (SELECT COUNT(*) FROM inland_quotes) as inland_quotes;
```

### Check for Missing Data
```sql
-- Find makes in old but not in new
SELECT name FROM old_db.makes
WHERE name NOT IN (SELECT name FROM new_db.makes);

-- Find quotes in old but not in new
SELECT quote_number FROM old_db.quote_history
WHERE quote_number NOT IN (SELECT quote_number FROM new_db.quote_history);
```

---

## Rollback Plan

If migration fails:
1. The NEW database has existing data that was preserved
2. OLD database is untouched (read-only during migration)
3. Can re-run safe migration scripts multiple times
4. For full reset: restore from Supabase backup

---

## Post-Migration Checklist

- [ ] Run `node scripts/explore-old-db.mjs` to see old data counts
- [ ] Run safe migration script
- [ ] Run `node scripts/migrate-images.js` for equipment images
- [ ] Verify counts match (accounting for existing new data)
- [ ] Test equipment catalog in app
- [ ] Test companies/contacts in CRM
- [ ] Test quote history
- [ ] Test inland quotes
- [ ] Verify company settings (logo, colors)
- [ ] Check rate tiers and accessorials

---

## Notes

- All timestamps are preserved from old database
- Original quote data stored in `quote_data._migrated_from` for reference
- Images are uploaded to Supabase Storage bucket `equipment-images`
- Company settings is a single-row table, always UPDATE not INSERT
