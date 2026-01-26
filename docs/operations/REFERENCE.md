# Operations Module - Reference Document

> **PURPOSE**: This document provides full context for continuing development in a new session.
> When starting a new session, share this file with Claude to resume work.

---

## Project Summary

**Project**: Seahorse Inland (Dismantle-Pro)
**Module**: Operations Module
**Status**: In Development (see [PROGRESS.md](./PROGRESS.md))

**What we're building**:
1. **Load Planner History** - Save/edit Load Planner v2 quotes with full data
2. **Carriers Management** - Track trucking companies, drivers, trucks
3. **Load History** - Track completed loads for margin analysis

**Business Context**:
- Seahorse Inland is a **3PL logistics broker** (does NOT own trucks)
- Works with external carriers (trucking companies + owner-operators)
- Needs to track: carriers → drivers → trucks → completed loads
- Goal: Build pricing database from historical data for business intelligence

---

## Current Progress

Check [PROGRESS.md](./PROGRESS.md) for detailed status.

**Summary**:
- [ ] Phase 1: Load Planner History
- [ ] Phase 2: Carriers Management
- [ ] Phase 3: Load History
- [ ] Phase 4: Integration
- [ ] Phase 5: Documentation

---

## Key Files & Locations

### Existing Code to Reference

| Purpose | File Path |
|---------|-----------|
| Load Planner v2 Page | `src/app/(dashboard)/inland/new-v2/page.tsx` |
| Load Planner Components | `src/components/load-planner/` |
| Load Planner Types | `src/lib/load-planner/types.ts` |
| Trucks Database | `src/lib/load-planner/trucks.ts` |
| Inland Router | `src/server/routers/inland.ts` |
| App Router Registry | `src/server/routers/_app.ts` |
| Sidebar Navigation | `src/components/layout/app-sidebar.tsx` |
| UI Components | `src/components/ui/` |
| Customers Page (pattern) | `src/app/(dashboard)/customers/page.tsx` |

### Files to Create

| Purpose | File Path |
|---------|-----------|
| Database Migration | `supabase/migrations/038_operations_module.sql` |
| Load Planner Quotes Types | `src/types/load-planner-quotes.ts` |
| Carriers Types | `src/types/carriers.ts` |
| Load History Types | `src/types/load-history.ts` |
| Load Planner Quotes Router | `src/server/routers/loadPlannerQuotes.ts` |
| Carriers Router | `src/server/routers/carriers.ts` |
| Load History Router | `src/server/routers/loadHistory.ts` |
| Load Planner Page | `src/app/(dashboard)/load-planner/page.tsx` |
| Load Planner History | `src/app/(dashboard)/load-planner/history/page.tsx` |
| Carriers List Page | `src/app/(dashboard)/carriers/page.tsx` |
| Carrier Detail Page | `src/app/(dashboard)/carriers/[id]/page.tsx` |
| Load History Page | `src/app/(dashboard)/load-history/page.tsx` |

---

## Sidebar Navigation Changes

**Current**:
```
Inland Transportation
├── Inland Quote
├── Load Planner (Testing)  ← /inland/new-v2
├── Inland History
└── Inland Settings
```

**Target**:
```
Inland Transportation
├── Inland Quote
├── Inland History
└── Inland Settings

Operations (NEW)
├── Load Planner            ← Move from /inland/new-v2 to /load-planner
├── Load Planner History    ← NEW /load-planner/history
├── Carriers                ← NEW /carriers
└── Load History            ← NEW /load-history
```

---

## Database Tables to Create

### 1. Load Planner Quotes (6 tables)

```
load_planner_quotes          - Main quote record
load_planner_cargo_items     - Cargo items (relational, not JSONB)
load_planner_trucks          - Assigned trucks
load_planner_service_items   - Service line items
load_planner_accessorials    - Accessorial charges
load_planner_permits         - State permit costs
```

### 2. Carriers (3 tables)

```
carriers                     - Trucking companies / owner-operators
carrier_drivers              - Individual drivers
carrier_trucks               - Trucks/trailers
```

### 3. Load History (1 table)

```
load_history                 - Completed loads with financials
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     QUOTE STAGE                              │
│  Load Planner v2 → Save → load_planner_quotes               │
│  (Customer, Route, Cargo, Trucks, Pricing, Permits)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     EXECUTION STAGE                          │
│  Quote Accepted → Assign Carrier → carrier_assignments      │
│  (Which carrier, driver, truck handled this load)           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     COMPLETION STAGE                         │
│  Load Completed → Record → load_history                     │
│  (Customer rate, Carrier cost, Margin, Dates)               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  BUSINESS INTELLIGENCE                       │
│  Historical Data → Analytics → Pricing Guidance             │
│  (Lane analysis, Carrier performance, Margin trends)        │
└─────────────────────────────────────────────────────────────┘
```

---

## UX/UI Requirements

### Every List Page Must Have:

1. **Global Search Bar**
   - Prominent at top
   - Cmd/Ctrl + K shortcut
   - Search multiple fields
   - Debounced 300ms

2. **Searchable Filter Dropdowns**
   - Type to filter options
   - Clear All Filters button
   - Show active filter count

3. **Table Features**
   - Sortable columns
   - Bulk select checkboxes
   - Inline status change
   - Pagination (10, 25, 50, 100)
   - Loading skeletons
   - Empty states

---

## How to Continue Development

### Starting a New Task

1. Read this file for context
2. Check [PROGRESS.md](./PROGRESS.md) for current status
3. Find the next uncompleted task
4. Read the detailed specification in the relevant folder
5. Implement the task
6. Update PROGRESS.md and LOG.md

### After Completing a Task

1. Mark task complete in [PROGRESS.md](./PROGRESS.md)
2. Add entry to [LOG.md](./LOG.md)
3. Commit changes (if requested)

---

## Common Commands

```bash
# Start dev server
npm run dev

# Run type check
npm run type-check

# Run tests
npm run test

# Generate Supabase types
npm run supabase:types

# Apply migration
npx supabase db push
```

---

## Questions to Ask User

If you need clarification:
1. Which specific task should I work on next?
2. Should I start with database, API, or UI?
3. Are there any design preferences for the UI?

---

## Document Locations

| Document | Purpose |
|----------|---------|
| [PROGRESS.md](./PROGRESS.md) | Track task completion |
| [LOG.md](./LOG.md) | Development activity log |
| [load-planner/](./load-planner/) | Load Planner specs |
| [carriers/](./carriers/) | Carriers specs |
| [load-history/](./load-history/) | Load History specs |
