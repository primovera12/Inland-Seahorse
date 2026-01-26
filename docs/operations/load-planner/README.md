# Load Planner History - Overview

## Purpose

Enable saving, viewing, and editing Load Planner v2 quotes with **complete data preservation**. When a user edits a quote from history, all data (customer, route, cargo, trucks, pricing, permits) must be restored exactly as saved.

---

## Features

### 1. Save Quotes
- Save Load Planner v2 quotes to database
- Preserve ALL form data across all tabs
- Generate unique quote numbers (LP-XXXX format)
- Track status (draft, sent, viewed, accepted, rejected, expired)

### 2. View History
- List all saved quotes with filters
- Search by quote number, customer, route
- Filter by status, date range, origin/destination
- Sort by any column
- Pagination support

### 3. Edit Quotes
- Load existing quote data into form
- Auto-fill all tabs with saved data
- Continue editing as if creating new quote
- Save updates to existing record

### 4. Quote Actions
- Duplicate quote (create copy)
- Delete quote (soft delete)
- Generate PDF
- Share public link

---

## Data Preserved

### Customer Tab
| Field | Stored In |
|-------|-----------|
| Customer name | `load_planner_quotes.customer_name` |
| Customer email | `load_planner_quotes.customer_email` |
| Customer phone | `load_planner_quotes.customer_phone` |
| Customer company | `load_planner_quotes.customer_company` |
| Company link | `load_planner_quotes.company_id` |
| Customer address | `load_planner_quotes.customer_address_*` |

### Route Tab
| Field | Stored In |
|-------|-----------|
| Pickup address | `load_planner_quotes.pickup_*` |
| Pickup coordinates | `load_planner_quotes.pickup_lat/lng` |
| Dropoff address | `load_planner_quotes.dropoff_*` |
| Dropoff coordinates | `load_planner_quotes.dropoff_lat/lng` |
| Distance | `load_planner_quotes.distance_miles` |
| Duration | `load_planner_quotes.duration_minutes` |
| Route polyline | `load_planner_quotes.route_polyline` |

### Cargo Tab
| Field | Stored In |
|-------|-----------|
| Each cargo item | `load_planner_cargo_items` (one row per item) |
| Description | `description` |
| Quantity | `quantity` |
| Dimensions (L×W×H) | `length_in`, `width_in`, `height_in` |
| Weight | `weight_lbs` |
| Properties | `stackable`, `fragile`, `hazmat`, etc. |
| Images | `image_url`, `front_image_url`, etc. |
| Equipment link | `equipment_make_id`, `equipment_model_id` |
| Placement | `placement_x/y/z`, `assigned_truck_index` |

### Trucks Tab
| Field | Stored In |
|-------|-----------|
| Each assigned truck | `load_planner_trucks` (one row per truck) |
| Truck type | `truck_type_id`, `truck_name`, `truck_category` |
| Specs | `deck_length_ft`, `deck_width_ft`, etc. |
| Load stats | `total_weight_lbs`, `total_items` |
| Permits required | `permits_required[]` |
| Warnings | `warnings[]` |

### Pricing Tab
| Field | Stored In |
|-------|-----------|
| Service items | `load_planner_service_items` (one row each) |
| Service name | `name` |
| Rate and quantity | `rate_cents`, `quantity`, `total_cents` |
| Per-truck assignment | `truck_index` |
| Accessorials | `load_planner_accessorials` (one row each) |
| Billing unit | `billing_unit` |

### Permits Tab
| Field | Stored In |
|-------|-----------|
| State permits | `load_planner_permits` (one row per state) |
| Calculated fees | `calculated_permit_fee_cents` |
| User overrides | `permit_fee_cents` (if edited) |
| Escort costs | `calculated_escort_cost_cents`, `escort_cost_cents` |
| Route details | `distance_miles`, `escort_count` |

---

## Related Documents

- [Database Schema](./database-schema.md) - Complete table definitions
- [API Reference](./api-reference.md) - tRPC endpoints
- [UI Specifications](./ui-specifications.md) - Page layouts and components
- [Implementation Guide](./implementation.md) - Step-by-step tasks

---

## Existing Code Reference

| Purpose | Location |
|---------|----------|
| Current Load Planner | `src/app/(dashboard)/inland/new-v2/page.tsx` |
| Load Planner Components | `src/components/load-planner/` |
| Type Definitions | `src/lib/load-planner/types.ts` |
| Trucks Database | `src/lib/load-planner/trucks.ts` |
| Existing Inland Router | `src/server/routers/inland.ts` |
