# Operations Module Documentation

## Overview

This documentation covers the **Operations Module** - a comprehensive system for managing carriers, load planner quotes, and load history for Seahorse Inland (a 3PL logistics broker).

## Quick Links

| Document | Purpose |
|----------|---------|
| [REFERENCE.md](./REFERENCE.md) | **START HERE** - Full context for new sessions |
| [PROGRESS.md](./PROGRESS.md) | Track implementation progress |
| [LOG.md](./LOG.md) | Development activity log |

## Module Components

### 1. Load Planner History
- Save, view, and edit Load Planner v2 quotes
- Full data preservation (cargo, trucks, pricing, permits)
- [Full Specification](./load-planner/README.md)

### 2. Carriers Management
- Track trucking companies and owner-operators
- Manage drivers and their trucks
- [Full Specification](./carriers/README.md)

### 3. Load History
- Track completed loads with full details
- Business intelligence and margin tracking
- [Full Specification](./load-history/README.md)

## Documentation Structure

```
docs/operations/
├── README.md                 # This file
├── REFERENCE.md              # Context for new sessions
├── PROGRESS.md               # Progress tracker
├── LOG.md                    # Development log
│
├── load-planner/
│   ├── README.md             # Overview
│   ├── database-schema.md    # Database tables
│   ├── api-reference.md      # tRPC endpoints
│   ├── ui-specifications.md  # Page layouts
│   └── implementation.md     # Step-by-step tasks
│
├── carriers/
│   ├── README.md             # Overview
│   ├── database-schema.md    # Database tables
│   ├── api-reference.md      # tRPC endpoints
│   ├── ui-specifications.md  # Page layouts
│   └── implementation.md     # Step-by-step tasks
│
└── load-history/
    ├── README.md             # Overview
    ├── database-schema.md    # Database tables
    ├── api-reference.md      # tRPC endpoints
    ├── ui-specifications.md  # Page layouts
    └── implementation.md     # Step-by-step tasks
```

## Technology Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **API**: tRPC with Zod validation
- **UI**: Tailwind CSS + Radix UI
- **Forms**: React Hook Form + Zod

## Project Context

Seahorse Inland is a **3PL logistics broker** that:
- Does NOT own trucks - works with external carriers
- Brokers freight between shippers and carriers
- Needs to track carriers, their drivers, and trucks
- Records completed loads for margin tracking and business intelligence
