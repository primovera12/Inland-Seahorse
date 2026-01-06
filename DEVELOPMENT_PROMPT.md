# Development Prompt - Dismantle Pro Rebuild

**Copy everything below this line to start a development session:**

---

## Project Context

I'm rebuilding an equipment dismantling and inland transportation quoting system called "Dismantle Pro". This is a complete rebuild of an existing system that grew organically without planning.

### What This System Does
- **Dismantling Quotes**: Generate professional quotes for heavy equipment dismantling/loading with costs for 6 port locations (NJ, Savannah, Houston, Chicago, Oakland, Long Beach)
- **Inland Transportation Quotes**: Multi-destination transportation quotes with Google Maps routing, truck recommendations, cargo tracking, and accessorial charges
- **CRM**: Unified customer/company/contact management with activity logging and follow-up reminders
- **Equipment Database**: Makes, models, dimensions, and location-based pricing

### Tech Stack (New Build)
- **Framework**: Next.js 15 (App Router)
- **React**: React 19
- **Language**: TypeScript 5.3+
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **API**: tRPC + Server Actions
- **Icons**: Lucide React
- **PDF**: @react-pdf/renderer
- **Testing**: Vitest + Playwright

### Design Style
Modern, clean, Stripe-inspired UI with:
- Inter font
- Indigo primary color (#6366F1)
- Soft shadows, generous whitespace
- Subtle animations
- Professional, minimal aesthetic

---

## Planning Documents

Read these files in the repository for complete specifications:

### 1. REBUILD_PLAN.md (2,000 lines)
Contains:
- System architecture
- Complete database schema (30+ tables)
- Project folder structure
- All screens catalog (67 screens)
- API endpoints (tRPC routers)
- Data migration strategy
- 22-week implementation roadmap
- Work standards

### 2. REBUILD_PLAN_ADDENDUM.md (1,024 lines)
Contains:
- Authentication system (email, OAuth, 2FA)
- 6 user roles (Super Admin → Owner → Admin → Manager → Member → Viewer)
- 50+ granular permissions
- Team management
- Audit logging
- Email notifications
- Reports & analytics
- Webhooks & API keys

### 3. FEATURE_INVENTORY.md (735 lines)
Contains:
- Complete list of 400+ features to preserve
- Dismantling quote features (multi-equipment, costs, etc.)
- Inland transportation features (destinations, loads, trucks)
- Smart helper functions (MUST preserve):
  - `parseSmartDimension()` - Feet vs inches auto-detection
  - `recommendTruck()` - Auto truck selection by cargo
  - `generateQuoteNumber()` - QT-YYYYMMDD-XXXX format
  - `parseEmailSignature()` - Extract contact from signatures
- CRM features
- Settings & configuration
- Verification checklist

### 4. DESIGN_SYSTEM.md (1,623 lines)
Contains:
- Color system with semantic tokens
- Typography scale
- Spacing system
- Shadow scale (Stripe-style soft shadows)
- Component specifications:
  - Buttons, Inputs, Cards, Tables
  - Modals, Toasts, Badges
  - Navigation, Forms, Empty states
- Layout templates
- Tailwind configuration
- Accessibility guidelines

---

## Database Notes

**IMPORTANT**: The old database is still in production use. The plan is:
1. Create a NEW Supabase project for the rebuild
2. Build everything against the new schema
3. When ready, migrate data from old → new
4. Keep old system read-only for 30 days as fallback

The new schema is fully documented in REBUILD_PLAN.md with:
- Unified `customers` table (merges old `companies` + `customers`)
- Proper organization multi-tenancy
- All amounts stored in cents (not dollars)
- JSONB for flexible data (equipment items, destinations)
- Proper RLS policies

---

## Implementation Phases

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| 1 | Foundation | Next.js setup, Auth, Dashboard shell |
| 2 | Users | User management, permissions, teams |
| 3 | Customers | Unified CRM with contacts |
| 4 | Equipment | Makes, models, rates, dimensions |
| 5 | Quotes | Dismantling quote builder + PDF |
| 6 | Inland | Transportation quote builder |
| 7 | Activity | Logging, reminders, notifications |
| 8 | Reports | Analytics, dashboards |
| 9 | Settings | All configuration screens |
| 10 | Testing | Unit, integration, E2E tests |
| 11 | Migration | Data migration, go-live |

---

## Critical Features to Preserve

These features MUST work exactly like the current system:

### Smart Dimension Parser
```typescript
// Input: "10.6" → Output: 126 inches (10 feet 6 inches)
// Input: "126" (above threshold) → Output: 126 inches
// Input: "10" (below threshold) → Output: 120 inches (10 feet)
parseSmartDimension(value, dimensionType, thresholds)
```

### Multi-Equipment Quotes
- Add multiple equipment items to one quote
- Each with independent location, costs, dimensions
- Single PDF with all equipment blocks

### Destination/Load Blocks (Inland)
- Multiple destinations (A, B, C...)
- Multiple loads per destination
- Cargo items per load with dimensions
- Truck recommendation per load
- Accessorial charges per load

### Live PDF Preview
- Real-time PDF generation as user types
- Debounced to prevent excessive updates
- Toggle show/hide preview panel

### Truck Recommendation
- Analyzes cargo weight and dimensions
- Recommends appropriate truck type
- Suggests multiple trucks if cargo too large
- Shows manual override indicator

---

## Current Task

[SPECIFY WHAT YOU WANT TO BUILD]

Examples:
- "Let's start Phase 1: Set up the Next.js 15 project with authentication"
- "Build the customer list page with search and filters"
- "Create the dismantling quote builder with live PDF preview"
- "Implement the smart dimension parser as a utility function"

---

## Code Standards

1. **TypeScript**: Strict mode, no `any` types
2. **Components**: Functional, use custom hooks for logic
3. **Styling**: Tailwind only, follow design system
4. **Forms**: React Hook Form + Zod validation
5. **State**: Zustand for global, React state for local
6. **API**: tRPC procedures with proper error handling
7. **Testing**: Write tests for business logic

---

## File Structure Reference

```
app/
├── (auth)/           # Auth pages (login, register)
├── (dashboard)/      # Main app pages
│   ├── dashboard/
│   ├── customers/
│   ├── quotes/
│   ├── inland/
│   ├── equipment/
│   ├── activity/
│   └── settings/
├── api/trpc/         # tRPC API routes
└── layout.tsx

components/
├── ui/               # shadcn/ui primitives
├── forms/            # Form components
├── features/         # Feature-specific components
├── layout/           # Sidebar, header, etc.
└── shared/           # Reusable components

lib/
├── api/              # tRPC client & routers
├── db/               # Supabase client & queries
├── services/         # Business logic
├── utils/            # Utilities
├── hooks/            # Custom hooks
└── store/            # Zustand stores
```

---

**Ready to start. What should I build?**
