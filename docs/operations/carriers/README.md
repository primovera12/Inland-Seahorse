# Carriers Management - Overview

## Purpose

Manage the trucking companies and owner-operators you work with as a 3PL broker. Track their drivers and trucks for load assignment and historical tracking.

---

## Business Context

As a **3PL logistics broker**, you don't own trucks. You work with:

1. **Carrier Companies** - Trucking companies with multiple drivers and trucks
2. **Owner-Operators** - Individual truck owners who drive their own truck

For each carrier, you need to track:
- Company/individual information
- MC#, DOT#, insurance
- Drivers (CDL info, contact)
- Trucks (specs, equipment)
- Payment terms

---

## Data Model

```
Carrier (Company or Owner-Operator)
├── Type: 'company' or 'owner_operator'
├── MC#, DOT#, Insurance
├── Contact & Billing Info
│
├── Drivers (1 or many)
│   ├── Name, Phone, Email
│   ├── CDL Info (number, state, class, expiry)
│   ├── Medical Card Expiry
│   └── Emergency Contact
│
└── Trucks (1 or many)
    ├── Unit Number, VIN, Plate
    ├── Type (Flatbed, Step Deck, RGN, etc.)
    ├── Dimensions & Capacity
    ├── Equipment (tarps, chains, etc.)
    └── Assigned Driver
```

---

## Features

### 1. Carrier Management
- Add/edit/delete carriers
- Support both company and owner-operator types
- Track MC#, DOT#, insurance info
- Manage billing and payment terms
- Track factoring company (if used)

### 2. Driver Management
- Add drivers to carriers
- Track CDL information
- Emergency contact info
- Assign drivers to trucks

### 3. Truck Management
- Add trucks to carriers
- Full specifications (dimensions, capacity)
- Equipment tracking (tarps, chains, straps)
- Registration and inspection dates
- Link to driver

### 4. Search & Filter
- Search by name, MC#, contact
- Filter by type, status, state
- All dropdowns searchable

---

## Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/carriers` | Carriers List | View all carriers |
| `/carriers/[id]` | Carrier Detail | View/edit carrier with tabs |

---

## Related Documents

- [Database Schema](./database-schema.md) - Complete table definitions
- [API Reference](./api-reference.md) - tRPC endpoints
- [UI Specifications](./ui-specifications.md) - Page layouts and components
- [Implementation Guide](./implementation.md) - Step-by-step tasks

---

## Key Concepts

### Carrier Types

**Company Carrier**
- Has company name, MC#, DOT#
- Multiple drivers
- Multiple trucks
- Billing to company

**Owner-Operator**
- Individual person
- Usually 1 driver (themselves) - marked with `is_owner: true`
- Usually 1-2 trucks
- May use factoring company

### Driver-Truck Assignment

- Each truck can have one assigned driver
- A driver can be assigned to one truck at a time
- Assignment tracked in `carrier_trucks.assigned_driver_id`

### Status Values

**Carrier Status**
- `active` - Currently working with
- `inactive` - No longer working with
- `preferred` - Preferred carrier (priority)
- `on_hold` - Temporarily not using
- `blacklisted` - Do not use

**Driver Status**
- `active` - Available for loads
- `inactive` - No longer with carrier
- `on_leave` - Temporarily unavailable

**Truck Status**
- `active` - Available for loads
- `inactive` - Not in use
- `out_of_service` - Needs repair
- `sold` - No longer owned
