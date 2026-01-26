# Load Planner - UI Specifications

## Pages Overview

| Route | Page | Purpose |
|-------|------|---------|
| `/load-planner` | Load Planner Form | Create/edit quotes |
| `/load-planner/history` | History List | View all saved quotes |

---

## Page 1: Load Planner History (`/load-planner/history`)

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER                                                                 │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Load Planner History                              [+ New Quote]    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ SEARCH BAR                                                             │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 🔍 [Search by quote #, customer name, company...        ] [⌘K]    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ FILTERS ROW                                                            │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ [Status      ▼] [Date Range    ▼] [Origin     ▼] [Destination ▼]  │ │
│ │ [Customer    ▼]                               [Clear All Filters]  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ STATS CARDS                                                            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ Total    │ │ Drafts   │ │ Sent     │ │ Accepted │ │ Value    │      │
│ │ 45       │ │ 12       │ │ 18       │ │ 15       │ │ $125,000 │      │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├────────────────────────────────────────────────────────────────────────┤
│ DATA TABLE                                                             │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ☐ │ Quote #↑  │ Customer    │ Route          │ Trucks│ Total │ ... │ │
│ │───┼───────────┼─────────────┼────────────────┼───────┼───────┼─────│ │
│ │ ☐ │ LP-001    │ ABC Corp    │ Houston → LA   │ 2     │$4,500 │ ... │ │
│ │ ☐ │ LP-002    │ XYZ Inc     │ Dallas → NYC   │ 1     │$6,200 │ ... │ │
│ │ ☐ │ LP-003    │ Acme LLC    │ Chicago → MIA  │ 3     │$8,100 │ ... │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ PAGINATION                                                             │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Showing 1-25 of 45 quotes        [10 ▼]    [< 1 2 3 ... 5 >]      │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Components

#### 1. Header
- Title: "Load Planner History"
- Primary action button: "+ New Quote" → navigates to `/load-planner`

#### 2. Search Bar
- Full-width input with search icon
- Placeholder: "Search by quote #, customer name, company..."
- Keyboard shortcut badge: "⌘K" (or "Ctrl+K" on Windows)
- Debounced search (300ms)
- Clear button when has value

#### 3. Filter Dropdowns

**Status Filter**
```typescript
options: [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft', count: 12 },
  { value: 'sent', label: 'Sent', count: 8 },
  { value: 'viewed', label: 'Viewed', count: 5 },
  { value: 'accepted', label: 'Accepted', count: 15 },
  { value: 'rejected', label: 'Rejected', count: 3 },
  { value: 'expired', label: 'Expired', count: 2 },
]
```

**Date Range Filter**
```typescript
options: [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range...' },  // Opens date picker
]
```

**Origin State Filter**
- Searchable dropdown
- Options from unique `pickup_state` values in database
- Shows count per state

**Destination State Filter**
- Searchable dropdown
- Options from unique `dropoff_state` values in database
- Shows count per state

**Customer Filter**
- Searchable dropdown
- Options from unique `customer_name` values
- Type to search

#### 4. Stats Cards

| Card | Data | Color |
|------|------|-------|
| Total | Count of all quotes | Gray |
| Drafts | Count where status='draft' | Yellow |
| Sent | Count where status='sent' | Blue |
| Accepted | Count where status='accepted' | Green |
| Total Value | Sum of total_cents | Purple |

#### 5. Data Table

**Columns**

| Column | Field | Sortable | Width |
|--------|-------|----------|-------|
| Checkbox | - | No | 40px |
| Quote # | `quote_number` | Yes | 120px |
| Customer | `customer_name`, `customer_company` | Yes | 180px |
| Route | `pickup_city/state` → `dropoff_city/state` | No | 200px |
| Trucks | `trucks_count` | Yes | 80px |
| Items | `cargo_items_count` | Yes | 80px |
| Total | `total_cents` (formatted) | Yes | 100px |
| Status | `status` | Yes | 100px |
| Created | `created_at` | Yes | 120px |
| Actions | - | No | 120px |

**Row Rendering**

```tsx
// Customer column - two lines
<div>
  <div className="font-medium">{customer_name || 'No name'}</div>
  {customer_company && (
    <div className="text-sm text-muted-foreground">{customer_company}</div>
  )}
</div>

// Route column
<div>
  {pickup_city}, {pickup_state} → {dropoff_city}, {dropoff_state}
</div>

// Status column - badge with color
<Badge variant={statusVariant[status]}>{status}</Badge>

// Status colors
const statusVariant = {
  draft: 'secondary',
  sent: 'default',
  viewed: 'outline',
  accepted: 'success',
  rejected: 'destructive',
  expired: 'secondary',
}

// Actions column
<div className="flex gap-1">
  <Button variant="ghost" size="icon" title="View">
    <Eye className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" title="Edit">
    <Pencil className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="icon" title="Duplicate">
    <Copy className="h-4 w-4" />
  </Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem>Generate PDF</DropdownMenuItem>
      <DropdownMenuItem>Copy Link</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

#### 6. Pagination

- Page size selector: 10, 25, 50, 100
- Page navigation: First, Prev, Page numbers, Next, Last
- Results count: "Showing 1-25 of 45 quotes"

#### 7. Bulk Actions

When rows are selected:
```
┌────────────────────────────────────────────────────────────────────────┐
│ 3 quotes selected                [Change Status ▼] [Delete] [Cancel]  │
└────────────────────────────────────────────────────────────────────────┘
```

#### 8. Empty State

When no quotes match filters:
```tsx
<div className="text-center py-12">
  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
  <h3 className="mt-4 text-lg font-medium">No quotes found</h3>
  <p className="mt-2 text-muted-foreground">
    {hasFilters
      ? "Try adjusting your filters"
      : "Get started by creating your first quote"}
  </p>
  {!hasFilters && (
    <Button className="mt-4" onClick={() => router.push('/load-planner')}>
      Create Quote
    </Button>
  )}
</div>
```

#### 9. Loading State

- Skeleton rows while loading
- Maintain table structure
- Show 5 skeleton rows

---

## Page 2: Load Planner Form (`/load-planner`)

### Edit Mode Detection

```typescript
// In page.tsx
const searchParams = useSearchParams()
const editId = searchParams.get('edit')
const isEditMode = !!editId

// Load existing data if editing
const { data: existingQuote } = trpc.loadPlannerQuotes.getById.useQuery(
  { id: editId! },
  { enabled: isEditMode }
)
```

### Auto-Fill on Edit

When `existingQuote` loads, populate form state:

```typescript
useEffect(() => {
  if (existingQuote) {
    // Customer tab
    setCustomerName(existingQuote.customer_name ?? '')
    setCustomerEmail(existingQuote.customer_email ?? '')
    setCustomerPhone(existingQuote.customer_phone ?? '')
    setCustomerCompany(existingQuote.customer_company ?? '')
    // ... etc

    // Route tab
    setPickup({
      address: existingQuote.pickup_address ?? '',
      city: existingQuote.pickup_city ?? '',
      state: existingQuote.pickup_state ?? '',
      zip: existingQuote.pickup_zip ?? '',
      lat: existingQuote.pickup_lat,
      lng: existingQuote.pickup_lng,
    })
    // ... dropoff

    // Cargo tab - convert from DB format to form format
    setCargoItems(existingQuote.cargo_items.map(item => ({
      ...item,
      // Convert inches to feet for display
      length: item.length_in ? item.length_in / 12 : 0,
      width: item.width_in ? item.width_in / 12 : 0,
      height: item.height_in ? item.height_in / 12 : 0,
    })))

    // Trucks tab
    setLoadPlan({
      loads: existingQuote.trucks.map(truck => ({
        id: truck.id,
        recommendedTruck: getTruckById(truck.truck_type_id),
        items: existingQuote.cargo_items
          .filter(item => item.assigned_truck_index === truck.truck_index),
        // ... etc
      })),
      totalTrucks: existingQuote.trucks.length,
    })

    // Pricing tab
    setServiceItems(existingQuote.service_items)
    setAccessorials(existingQuote.accessorials)

    // Permits tab
    setPermitCosts(existingQuote.permits.map(p => ({
      ...p,
      // Use override if set, otherwise calculated
      permitFee: p.permit_fee_cents ?? p.calculated_permit_fee_cents,
      escortCost: p.escort_cost_cents ?? p.calculated_escort_cost_cents,
    })))
  }
}, [existingQuote])
```

### Save Button Behavior

```typescript
const handleSave = async () => {
  const quoteData = buildQuoteData()

  if (isEditMode && editId) {
    // Update existing quote
    await updateQuote.mutateAsync({
      id: editId,
      ...quoteData,
    })
    toast.success('Quote updated')
  } else {
    // Create new quote
    const result = await createQuote.mutateAsync(quoteData)
    toast.success(`Quote ${result.quote_number} created`)
    // Redirect to history or stay on form
    router.push('/load-planner/history')
  }
}
```

### Header Changes in Edit Mode

```tsx
// Header shows different text in edit mode
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold">
      {isEditMode ? `Edit Quote ${existingQuote?.quote_number}` : 'Load Planner'}
    </h1>
    {isEditMode && existingQuote && (
      <p className="text-muted-foreground">
        Created {format(existingQuote.created_at, 'PPP')}
      </p>
    )}
  </div>
  <div className="flex gap-2">
    {isEditMode && (
      <Button variant="outline" onClick={() => router.push('/load-planner/history')}>
        Cancel
      </Button>
    )}
    <Button onClick={handleSave} disabled={isSaving}>
      {isSaving ? 'Saving...' : isEditMode ? 'Update Quote' : 'Save Quote'}
    </Button>
  </div>
</div>
```

---

## Shared Components

### SearchableSelect

Used for all searchable filter dropdowns:

```tsx
interface SearchableSelectProps {
  options: Array<{ value: string; label: string; count?: number }>
  value: string | undefined
  onChange: (value: string | undefined) => void
  placeholder: string
  searchPlaceholder?: string
  allowClear?: boolean
}

<SearchableSelect
  options={stateOptions}
  value={originState}
  onChange={setOriginState}
  placeholder="Origin State"
  searchPlaceholder="Search states..."
  allowClear
/>
```

### DateRangePicker

For custom date range selection:

```tsx
<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  presets={[
    { label: 'Today', value: { from: today, to: today } },
    { label: 'This Week', value: { from: startOfWeek, to: today } },
    // ...
  ]}
/>
```

### StatusBadge

Consistent status display:

```tsx
const StatusBadge = ({ status }: { status: QuoteStatus }) => {
  const config = {
    draft: { label: 'Draft', variant: 'secondary', icon: FileText },
    sent: { label: 'Sent', variant: 'default', icon: Send },
    viewed: { label: 'Viewed', variant: 'outline', icon: Eye },
    accepted: { label: 'Accepted', variant: 'success', icon: CheckCircle },
    rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
    expired: { label: 'Expired', variant: 'secondary', icon: Clock },
  }

  const { label, variant, icon: Icon } = config[status]

  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  )
}
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Focus search |
| `⌘N` / `Ctrl+N` | New quote |
| `Escape` | Clear search / Close dialogs |
| `Enter` (in table) | View selected quote |
| `E` (in table) | Edit selected quote |
| `D` (in table) | Duplicate selected quote |

---

## Responsive Behavior

### Mobile (<768px)
- Filters collapse into a "Filters" button that opens a sheet
- Table becomes card list view
- Stats cards scroll horizontally
- Actions in dropdown menu only

### Tablet (768px - 1024px)
- Filters wrap to second row
- Table shows fewer columns, rest in expandable row

### Desktop (>1024px)
- Full layout as designed
- All columns visible
