# Load Planner - API Reference

## Overview

The Load Planner API is implemented as a tRPC router at `src/server/routers/loadPlannerQuotes.ts`.

---

## Router Registration

```typescript
// src/server/routers/_app.ts
import { loadPlannerQuotesRouter } from './loadPlannerQuotes'

export const appRouter = router({
  // ... existing routers
  loadPlannerQuotes: loadPlannerQuotesRouter,
})
```

---

## Endpoints

### 1. `getAll` - List Quotes

**Purpose**: Get paginated list of quotes with filters for history page.

**Access**: `protectedProcedure` (logged in users)

#### Input Schema

```typescript
z.object({
  // Pagination
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),

  // Filters
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']).optional(),
  search: z.string().optional(),  // Searches quote_number, customer_name, customer_company
  originState: z.string().optional(),
  destinationState: z.string().optional(),
  dateFrom: z.string().optional(),  // ISO date string
  dateTo: z.string().optional(),

  // Sorting
  sortBy: z.enum(['quote_number', 'customer_name', 'total_cents', 'created_at', 'status']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
```

#### Output

```typescript
{
  quotes: Array<{
    id: string
    quote_number: string
    status: string
    customer_name: string | null
    customer_company: string | null
    pickup_city: string | null
    pickup_state: string | null
    dropoff_city: string | null
    dropoff_state: string | null
    total_cents: number | null
    created_at: string
    updated_at: string
    // Counts from related tables
    cargo_items_count: number
    trucks_count: number
  }>
  total: number
  hasMore: boolean
}
```

#### Implementation Notes

```typescript
export const loadPlannerQuotesRouter = router({
  getAll: protectedProcedure
    .input(getAllInputSchema)
    .query(async ({ ctx, input }) => {
      const { limit, offset, status, search, originState, destinationState, dateFrom, dateTo, sortBy, sortOrder } = input

      let query = ctx.supabase
        .from('load_planner_quotes')
        .select(`
          id, quote_number, status, customer_name, customer_company,
          pickup_city, pickup_state, dropoff_city, dropoff_state,
          total_cents, created_at, updated_at,
          load_planner_cargo_items(count),
          load_planner_trucks(count)
        `, { count: 'exact' })
        .eq('is_active', true)

      // Apply filters
      if (status) query = query.eq('status', status)
      if (search) {
        query = query.or(`quote_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_company.ilike.%${search}%`)
      }
      if (originState) query = query.eq('pickup_state', originState)
      if (destinationState) query = query.eq('dropoff_state', destinationState)
      if (dateFrom) query = query.gte('created_at', dateFrom)
      if (dateTo) query = query.lte('created_at', dateTo)

      // Apply sorting and pagination
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query
      checkSupabaseError(error)

      return {
        quotes: data?.map(q => ({
          ...q,
          cargo_items_count: q.load_planner_cargo_items?.[0]?.count ?? 0,
          trucks_count: q.load_planner_trucks?.[0]?.count ?? 0,
        })) ?? [],
        total: count ?? 0,
        hasMore: (count ?? 0) > offset + limit,
      }
    }),
})
```

---

### 2. `getById` - Get Full Quote

**Purpose**: Get complete quote with all related data for editing.

**Access**: `protectedProcedure`

#### Input Schema

```typescript
z.object({
  id: z.string().uuid(),
})
```

#### Output

```typescript
{
  // Main quote
  id: string
  quote_number: string
  status: string
  // ... all quote fields

  // Related data
  cargo_items: Array<CargoItem>
  trucks: Array<Truck>
  service_items: Array<ServiceItem>
  accessorials: Array<Accessorial>
  permits: Array<Permit>
}
```

#### Implementation Notes

```typescript
getById: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    // Get main quote
    const { data: quote, error } = await ctx.supabase
      .from('load_planner_quotes')
      .select('*')
      .eq('id', input.id)
      .eq('is_active', true)
      .single()

    checkSupabaseError(error)
    assertDataExists(quote, 'Quote')

    // Get related data in parallel
    const [cargoItems, trucks, serviceItems, accessorials, permits] = await Promise.all([
      ctx.supabase.from('load_planner_cargo_items').select('*').eq('quote_id', input.id).order('sort_order'),
      ctx.supabase.from('load_planner_trucks').select('*').eq('quote_id', input.id).order('truck_index'),
      ctx.supabase.from('load_planner_service_items').select('*').eq('quote_id', input.id).order('sort_order'),
      ctx.supabase.from('load_planner_accessorials').select('*').eq('quote_id', input.id).order('sort_order'),
      ctx.supabase.from('load_planner_permits').select('*').eq('quote_id', input.id).order('state_code'),
    ])

    return {
      ...quote,
      cargo_items: cargoItems.data ?? [],
      trucks: trucks.data ?? [],
      service_items: serviceItems.data ?? [],
      accessorials: accessorials.data ?? [],
      permits: permits.data ?? [],
    }
  }),
```

---

### 3. `create` - Save New Quote

**Purpose**: Create a new quote with all related data.

**Access**: `protectedProcedure`

#### Input Schema

```typescript
z.object({
  // Main quote data
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  customer_company: z.string().optional(),
  company_id: z.string().uuid().optional(),
  // ... all quote fields

  // Related data
  cargo_items: z.array(cargoItemSchema),
  trucks: z.array(truckSchema),
  service_items: z.array(serviceItemSchema),
  accessorials: z.array(accessorialSchema),
  permits: z.array(permitSchema),
})
```

#### Output

```typescript
{
  id: string
  quote_number: string
}
```

#### Implementation Notes

- Generate quote number: `LP-${timestamp}-${random}`
- Use transaction for atomicity
- Log activity

```typescript
create: protectedProcedure
  .input(createInputSchema)
  .mutation(async ({ ctx, input }) => {
    const { cargo_items, trucks, service_items, accessorials, permits, ...quoteData } = input

    // Generate quote number
    const quote_number = `LP-${Date.now().toString(36).toUpperCase()}`

    // Insert main quote
    const { data: quote, error } = await ctx.supabase
      .from('load_planner_quotes')
      .insert({
        ...quoteData,
        quote_number,
        created_by: ctx.user.id,
      })
      .select('id, quote_number')
      .single()

    checkSupabaseError(error)

    // Insert related data
    if (cargo_items.length > 0) {
      await ctx.supabase.from('load_planner_cargo_items').insert(
        cargo_items.map((item, index) => ({ ...item, quote_id: quote.id, sort_order: index }))
      )
    }

    if (trucks.length > 0) {
      await ctx.supabase.from('load_planner_trucks').insert(
        trucks.map(truck => ({ ...truck, quote_id: quote.id }))
      )
    }

    // ... insert service_items, accessorials, permits

    // Log activity
    await ctx.adminSupabase.from('activity_logs').insert({
      user_id: ctx.user.id,
      activity_type: 'load_planner_quote_created',
      subject: `Load Planner Quote ${quote_number} created`,
      description: `Created quote for ${quoteData.customer_name || 'Unknown'}`,
      metadata: { quote_id: quote.id, quote_number },
    })

    return quote
  }),
```

---

### 4. `update` - Update Existing Quote

**Purpose**: Update quote and all related data.

**Access**: `protectedProcedure`

#### Input Schema

```typescript
z.object({
  id: z.string().uuid(),
  // ... same fields as create
})
```

#### Implementation Notes

- Delete existing related records and re-insert
- Update timestamps
- Log activity

```typescript
update: protectedProcedure
  .input(updateInputSchema)
  .mutation(async ({ ctx, input }) => {
    const { id, cargo_items, trucks, service_items, accessorials, permits, ...quoteData } = input

    // Update main quote
    const { data: quote, error } = await ctx.supabase
      .from('load_planner_quotes')
      .update({
        ...quoteData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, quote_number')
      .single()

    checkSupabaseError(error)

    // Replace related data (delete + insert)
    await Promise.all([
      ctx.supabase.from('load_planner_cargo_items').delete().eq('quote_id', id),
      ctx.supabase.from('load_planner_trucks').delete().eq('quote_id', id),
      ctx.supabase.from('load_planner_service_items').delete().eq('quote_id', id),
      ctx.supabase.from('load_planner_accessorials').delete().eq('quote_id', id),
      ctx.supabase.from('load_planner_permits').delete().eq('quote_id', id),
    ])

    // Re-insert with new data
    // ... same as create

    // Log activity
    await ctx.adminSupabase.from('activity_logs').insert({
      user_id: ctx.user.id,
      activity_type: 'load_planner_quote_updated',
      subject: `Load Planner Quote ${quote.quote_number} updated`,
      metadata: { quote_id: id },
    })

    return quote
  }),
```

---

### 5. `delete` - Soft Delete Quote

**Purpose**: Mark quote as inactive (soft delete).

**Access**: `managerProcedure` (manager+ role)

#### Input Schema

```typescript
z.object({
  id: z.string().uuid(),
})
```

#### Implementation

```typescript
delete: managerProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase
      .from('load_planner_quotes')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', input.id)
      .select('id, quote_number')
      .single()

    checkSupabaseError(error)

    // Log activity
    await ctx.adminSupabase.from('activity_logs').insert({
      user_id: ctx.user.id,
      activity_type: 'load_planner_quote_deleted',
      subject: `Load Planner Quote ${data.quote_number} deleted`,
      metadata: { quote_id: input.id },
    })

    return { success: true }
  }),
```

---

### 6. `duplicate` - Copy Quote

**Purpose**: Create a copy of an existing quote.

**Access**: `protectedProcedure`

#### Input Schema

```typescript
z.object({
  id: z.string().uuid(),
})
```

#### Implementation

```typescript
duplicate: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    // Get existing quote with all data
    const existing = await getById({ id: input.id })

    // Create new quote with copied data
    const { id, quote_number, created_at, updated_at, sent_at, viewed_at, public_token, ...quoteData } = existing

    return create({
      ...quoteData,
      status: 'draft',
      cargo_items: existing.cargo_items,
      trucks: existing.trucks,
      service_items: existing.service_items,
      accessorials: existing.accessorials,
      permits: existing.permits,
    })
  }),
```

---

### 7. `updateStatus` - Change Quote Status

**Purpose**: Quick status change without updating all data.

**Access**: `protectedProcedure`

#### Input Schema

```typescript
z.object({
  id: z.string().uuid(),
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired']),
})
```

---

### 8. `getFilterOptions` - Get Filter Dropdown Values

**Purpose**: Get unique values for filter dropdowns.

**Access**: `protectedProcedure`

#### Output

```typescript
{
  statuses: Array<{ value: string, count: number }>
  originStates: Array<{ value: string, count: number }>
  destinationStates: Array<{ value: string, count: number }>
}
```

---

### 9. `generateQuoteNumber` - Generate Unique Number

**Purpose**: Generate next quote number.

**Access**: `protectedProcedure`

#### Output

```typescript
{
  quote_number: string  // e.g., "LP-2024-0042"
}
```

---

## Zod Schemas

### Cargo Item Schema

```typescript
const cargoItemSchema = z.object({
  sku: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  length_in: z.number().int().min(0).optional(),
  width_in: z.number().int().min(0).optional(),
  height_in: z.number().int().min(0).optional(),
  weight_lbs: z.number().int().min(0).optional(),
  stackable: z.boolean().default(false),
  bottom_only: z.boolean().default(false),
  max_layers: z.number().int().optional(),
  fragile: z.boolean().default(false),
  hazmat: z.boolean().default(false),
  notes: z.string().optional(),
  orientation: z.number().int().default(1),
  geometry: z.enum(['box', 'cylinder', 'hollow-cylinder']).default('box'),
  equipment_make_id: z.string().uuid().optional(),
  equipment_model_id: z.string().uuid().optional(),
  dimensions_source: z.enum(['ai', 'database', 'manual']).optional(),
  image_url: z.string().url().optional(),
  image_url_2: z.string().url().optional(),
  front_image_url: z.string().url().optional(),
  side_image_url: z.string().url().optional(),
  assigned_truck_index: z.number().int().optional(),
  placement_x: z.number().optional(),
  placement_y: z.number().optional(),
  placement_z: z.number().optional(),
  placement_rotation: z.number().int().optional(),
})
```

### Truck Schema

```typescript
const truckSchema = z.object({
  truck_index: z.number().int().min(0),
  truck_type_id: z.string().min(1),
  truck_name: z.string().optional(),
  truck_category: z.string().optional(),
  deck_length_ft: z.number().optional(),
  deck_width_ft: z.number().optional(),
  deck_height_ft: z.number().optional(),
  well_length_ft: z.number().optional(),
  max_cargo_weight_lbs: z.number().int().optional(),
  total_weight_lbs: z.number().int().optional(),
  total_items: z.number().int().optional(),
  is_legal: z.boolean().default(true),
  permits_required: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
  truck_score: z.number().int().min(0).max(100).optional(),
})
```

---

## Error Handling

All endpoints use the standard error handling pattern:

```typescript
import { checkSupabaseError, assertDataExists } from '@/lib/errors'

// After Supabase query
checkSupabaseError(error)  // Throws TRPCError if error exists

// After expecting single result
assertDataExists(data, 'Quote')  // Throws NOT_FOUND if null
```

---

## Activity Logging

All mutations log to `activity_logs`:

| Activity Type | When |
|---------------|------|
| `load_planner_quote_created` | New quote saved |
| `load_planner_quote_updated` | Quote edited |
| `load_planner_quote_deleted` | Quote deleted |
| `load_planner_quote_duplicated` | Quote copied |
| `load_planner_quote_status_changed` | Status updated |
