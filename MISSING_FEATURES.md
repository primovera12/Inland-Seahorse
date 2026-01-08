# Missing Features Tracker - Dismantle Pro Rebuild

**Created**: January 7, 2026
**Last Updated**: January 7, 2026
**Total Features Missing**: ~65
**Completed**: 37 (Phase 1-7 Complete)

---

## Status Legend
- [ ] Not Started
- [x] Completed
- [~] In Progress
- [!] Blocked

---

## PHASE 1: HIGH PRIORITY - Core Quote Functionality (COMPLETED)

### 1.1 Miscellaneous Fees UI
**Priority**: CRITICAL
**Affects**: Dismantling Quotes, Inland Quotes
**Location**: `src/components/quotes/misc-fees-list.tsx`
**Status**: COMPLETED

- [x] Create `MiscFeesList` component
- [x] Add dynamic add/remove fee buttons
- [x] Fee fields: title, description, amount
- [x] Support percentage-based fees
- [x] Per-equipment block misc fees (multi-equipment mode) - compact mode available
- [x] Include misc fees in PDF generation
- [x] Include misc fees in quote save data

**Files Created/Modified**:
- `src/components/quotes/misc-fees-list.tsx` (new)
- `src/types/quotes.ts` (updated MiscellaneousFee type)
- `src/lib/pdf/quote-generator.ts` (added misc fees to PDF)
- `src/app/(dashboard)/quotes/new/page.tsx` (integrated)

---

### 1.2 Billing Information Fields
**Priority**: CRITICAL
**Affects**: Customer Form, PDF Generation
**Location**: `src/components/quotes/customer-form.tsx`
**Status**: COMPLETED

- [x] Add Billing Address field
- [x] Add Billing City field
- [x] Add Billing State field
- [x] Add Billing ZIP field
- [x] Add Payment Terms dropdown (Net 15, Net 30, Net 45, Due on Receipt)
- [x] Auto-copy from company address option
- [x] Include billing info in PDF
- [x] Save billing info to quote record

**Files Created/Modified**:
- `src/components/quotes/customer-form.tsx` (updated with BillingInfo interface)
- `src/lib/pdf/quote-generator.ts` (added billing info to PDF)
- `src/app/(dashboard)/quotes/new/page.tsx` (integrated billing state)

---

### 1.3 Email Signature Parser
**Priority**: HIGH
**Affects**: Customer Form
**Location**: `src/lib/email-signature-parser.ts`
**Status**: COMPLETED

- [x] Create `parseEmailSignature()` function
- [x] Extract: name (first, last)
- [x] Extract: email address
- [x] Extract: phone numbers (multiple formats)
- [x] Extract: company name
- [x] Extract: job title
- [x] Extract: address
- [x] Extract: website
- [x] Add "Paste Signature" button to customer form
- [x] Modal/textarea for pasting signature
- [x] Auto-populate form fields from parsed data

**Files Created/Modified**:
- `src/lib/email-signature-parser.ts` (new - 220 lines)
- `src/components/quotes/email-signature-dialog.tsx` (new - dialog component)
- `src/components/quotes/customer-form.tsx` (integrated dialog)

---

### 1.4 Auto-Save Drafts with UI
**Priority**: HIGH
**Affects**: Quote Creation Pages
**Location**: `src/app/(dashboard)/quotes/new/page.tsx`
**Status**: COMPLETED

- [x] Add debounced auto-save (3 seconds after last change)
- [x] Add `autoSaveStatus` state: 'saved' | 'saving' | 'unsaved' | 'error'
- [x] Display save status indicator in header
- [x] Show "Last saved: X minutes ago" timestamp
- [ ] Generate and track draft ID - using existing saveDraft mutation
- [ ] Clear draft on successful quote creation - pending
- [ ] Load existing draft on page mount (if exists) - pending
- [ ] "Discard Draft" button - pending

**Files Created/Modified**:
- `src/hooks/use-auto-save.ts` (new - custom hook)
- `src/components/ui/auto-save-indicator.tsx` (new - status indicator)
- `src/app/(dashboard)/quotes/new/page.tsx` (integrated auto-save)

---

### 1.5 Google Places Autocomplete
**Priority**: HIGH
**Affects**: Inland Quote Destination Addresses
**Location**: `src/components/inland/destination-block.tsx`
**Status**: COMPLETED

- [x] Create `AddressAutocomplete` component
- [x] Integrate Google Places API
- [x] Autocomplete for pickup address
- [x] Autocomplete for dropoff address
- [x] Auto-parse: street, city, state, ZIP
- [x] Capture lat/lng for route calculation
- [x] Debounce API calls - handled by Google
- [x] Handle API errors gracefully

**Files Created/Modified**:
- `src/components/ui/address-autocomplete.tsx` (new)
- `src/components/inland/destination-block.tsx` (integrated autocomplete)

---

## PHASE 2: MEDIUM PRIORITY - Productivity Features

### 2.1 Recent Equipment Quick-Select
**Priority**: MEDIUM
**Affects**: Equipment Selection
**Location**: `src/components/quotes/equipment-selector.tsx`
**Status**: COMPLETED (localStorage implementation)

- [x] Track equipment usage on model selection
- [x] Display "Recent" section in equipment selector
- [x] Show last 5 used equipment (configurable to 10)
- [x] One-click to select recent equipment
- [x] Display use count badge
- [x] Clear recent button

**Files Created/Modified**:
- `src/hooks/use-recent-equipment.ts` (new - localStorage hook)
- `src/components/quotes/equipment-selector.tsx` (updated)

---

### 2.2 Favorites System
**Priority**: MEDIUM
**Affects**: Equipment Selection, Rate Management
**Location**: `src/hooks/use-favorites.ts`, equipment components
**Status**: COMPLETED (localStorage implementation)

- [x] Create localStorage-based favorites system
- [x] Add `toggleFavorite()` function
- [x] Add `isFavorite()` function
- [x] Add `getFavorites()` function
- [x] Star icon on equipment items
- [x] Show favorites at top of equipment list
- [x] Add/Remove from favorites button in dimensions section

**Files Created/Modified**:
- `src/hooks/use-favorites.ts` (new - localStorage hook)
- `src/components/quotes/equipment-selector.tsx` (updated)

---

### 2.3 Equipment Mode for Cargo (Inland)
**Priority**: MEDIUM
**Affects**: Inland Quote Load Blocks
**Location**: `src/components/inland/load-block.tsx`
**Status**: COMPLETED

- [x] Add "Equipment Mode" toggle per cargo item
- [x] Equipment make/model selector (when toggled)
- [x] Auto-fill dimensions from equipment_dimensions table
- [x] Auto-fill weight from equipment record
- [x] Store `is_equipment` and `equipment_model_id` on cargo item
- [x] Oversize/overweight warnings display
- [ ] Support custom equipment entry - deferred to Phase 4
- [ ] Pull equipment images (if available) - deferred to Phase 3

**Files Created/Modified**:

- `src/components/inland/cargo-item-card.tsx` (new - equipment mode component)
- `src/components/inland/load-block.tsx` (integrated cargo items UI)
- `src/types/inland.ts` (updated CargoItem interface with equipment fields)

---

### 2.4 Destination Block Duplication
**Priority**: MEDIUM
**Affects**: Inland Quote Creation
**Location**: `src/components/inland/destination-block.tsx`
**Status**: COMPLETED

- [x] Add duplicate button to destination block header
- [x] Copy all block data (addresses, loads, services)
- [x] Generate new IDs for duplicated block and nested items
- [x] Insert after current block
- [x] Re-label all blocks (A, B, C...)
- [x] Toast notification on duplication

**Files Created/Modified**:
- `src/components/inland/destination-block.tsx` (added Copy icon and onDuplicate prop)
- `src/app/(dashboard)/inland/new/page.tsx` (added duplicateDestination function)

---

### 2.5 Truck Recommendation UI Integration
**Priority**: MEDIUM
**Affects**: Inland Quote Load Blocks
**Location**: `src/components/inland/load-block.tsx`
**Status**: COMPLETED

- [x] Wire `recommendTruckType()` to UI
- [x] Auto-calculate when cargo dimensions change (useMemo)
- [x] Display recommended truck with reason
- [x] "Apply" button to use recommendation
- [x] Show "Selected" badge when manual selection matches recommendation
- [x] Multi-truck suggestion display (if cargo too large)
- [x] Permit requirement warnings (oversize/overweight badges)
- [x] Cargo requirements summary (length, width, height, weight)

**Files Created/Modified**:

- `src/components/inland/load-block.tsx` (integrated truck recommendation UI)
- `src/lib/truck-recommendation.ts` (existing - already had logic)

---

### 2.6 Cost Description Override
**Priority**: MEDIUM
**Affects**: Dismantling Quote Costs
**Location**: `src/components/quotes/cost-breakdown.tsx`
**Status**: COMPLETED

- [x] Add description field per cost line
- [x] Show/hide description input (expand on click)
- [x] Store custom descriptions in quote data (draft auto-save)
- [x] FileText icon indicator when description exists
- [x] Default to standard description if empty

**Files Created/Modified**:
- `src/components/quotes/cost-breakdown.tsx` (added expand/collapse and description input)
- `src/app/(dashboard)/quotes/new/page.tsx` (added descriptionOverrides state)

---

### 2.7 Customer Address Fields
**Priority**: MEDIUM
**Affects**: Customer Form
**Location**: `src/components/quotes/customer-form.tsx`
**Status**: COMPLETED

- [x] Add Customer Street Address field
- [x] Add Customer City field
- [x] Add Customer State field
- [x] Add Customer ZIP field
- [x] Updated CustomerAddress interface to object type
- [x] Copy to billing address functionality updated

**Files Created/Modified**:
- `src/components/quotes/customer-form.tsx` (added CustomerAddress interface and fields)
- `src/app/(dashboard)/quotes/new/page.tsx` (updated customerAddress state to object)

---

## PHASE 3: IMPORTANT FEATURES

### 3.1 Equipment Images
**Priority**: IMPORTANT
**Affects**: Equipment Management, Quote PDF
**Location**: `src/components/quotes/`, equipment pages
**Status**: COMPLETED (Core functionality)

- [x] Add image upload component
- [x] Support front image upload
- [x] Support side image upload
- [x] Image preview in equipment selector
- [x] Store images in Supabase Storage
- [x] Display images in quote creation
- [x] Image removal/replace functionality
- [ ] Include images in PDF generation - deferred
- [ ] SVG to PNG conversion for PDF compatibility - deferred

**Files Created/Modified**:

- `src/components/ui/image-upload.tsx` (new - reusable upload component)
- `src/server/routers/equipment.ts` (added updateImages mutation)
- `src/app/(dashboard)/equipment/page.tsx` (added image management UI)
- `src/components/quotes/equipment-selector.tsx` (displays images when available)

---

### 3.2 Quote Validity Period
**Priority**: IMPORTANT
**Affects**: Quote Settings, PDF
**Location**: Settings, PDF generator
**Status**: COMPLETED

- [x] Add "Quote Valid For X Days" setting (already in settings page)
- [x] Calculate expiration date on quote (markAsSent mutation)
- [x] Show expiration date in quote list with status indicators
- [ ] Display validity period in PDF - deferred
- [ ] Auto-expire quotes past validity - deferred (requires cron job)

**Files Created/Modified**:

- `src/server/routers/quotes.ts` (updated markAsSent to set expires_at)
- `src/app/(dashboard)/quotes/history/page.tsx` (added Expires column with warnings)

---

### 3.3 Terms & Conditions
**Priority**: IMPORTANT
**Affects**: Settings, PDF
**Location**: `src/app/(dashboard)/settings/`, PDF generators
**Status**: COMPLETED

- [x] Create terms & conditions setting page
- [x] Textarea editor for T&C content (plain text, monospace)
- [x] Include T&C section in PDF footer
- [x] Different T&C for dismantle vs inland quotes (tabs)
- [x] T&C version tracking (auto-increment on save)

**Files Created/Modified**:

- `src/server/routers/settings.ts` (new - settings router with T&C mutations)
- `src/server/routers/_app.ts` (added settingsRouter)
- `src/app/(dashboard)/settings/terms/page.tsx` (new - T&C settings page)
- `src/app/(dashboard)/settings/page.tsx` (updated with tRPC integration and T&C link)
- `src/lib/pdf/quote-generator.ts` (added termsAndConditions to PDF)
- `src/lib/pdf/inland-quote-generator.ts` (added termsAndConditions to PDF)

---

### 3.4 Company Branding in PDF
**Priority**: IMPORTANT
**Affects**: PDF Generation
**Location**: `src/lib/pdf/`, Settings
**Status**: COMPLETED

- [x] Company logo upload in settings
- [x] Logo size adjustment slider (30-100%)
- [x] Logo placement in PDF header (async image loading)
- [x] Primary color setting (hex picker)
- [x] Secondary color setting (optional)
- [x] Company name in header
- [x] Company address in footer
- [x] Company phone/email/website in footer
- [x] Apply colors to PDF elements (tables, headers, total boxes)
- [x] PDF header preview in settings

**Files Created/Modified**:

- `src/components/ui/slider.tsx` (new - slider component)
- `src/app/(dashboard)/settings/page.tsx` (updated with logo upload, secondary color)
- `src/lib/pdf/quote-generator.ts` (added async logo support, enhanced branding)
- `src/lib/pdf/inland-quote-generator.ts` (added async logo support, enhanced branding)

---

### 3.5 Popular Makes Sorting
**Priority**: IMPORTANT
**Affects**: Equipment Selection
**Location**: `src/components/quotes/equipment-selector.tsx`
**Status**: COMPLETED

- [x] Define `POPULAR_MAKES` array (CAT, Komatsu, John Deere, Hitachi, Volvo, etc.)
- [x] Sort makes with popular first (sortMakesByPopularity helper)
- [x] Visual separator between popular and others (SelectSeparator + SelectGroup)
- [ ] Configurable popular makes in settings - deferred to Phase 4

**Files Created/Modified**:

- `src/types/equipment.ts` (added POPULAR_MAKES, isPopularMake, sortMakesByPopularity)
- `src/components/quotes/equipment-selector.tsx` (grouped makes dropdown)

---

## PHASE 4: ENHANCEMENT FEATURES (COMPLETED)

### 4.1 Multiple Stops per Destination
**Priority**: ENHANCEMENT
**Affects**: Inland Quotes
**Location**: `src/components/inland/destination-block.tsx`
**Status**: COMPLETED

- [x] Add "waypoints" array to destination block
- [x] "Add Stop" button
- [x] Reorder stops (drag or arrows)
- [x] Remove stop
- [x] Address autocomplete for waypoints
- [x] Stop type selection (pickup/dropoff/both)

**Files Created/Modified**:
- `src/types/inland.ts` (added Waypoint interface)
- `src/components/inland/destination-block.tsx` (waypoint management UI)

---

### 4.2 Block Reordering (Drag & Drop)
**Priority**: ENHANCEMENT
**Affects**: Multi-Equipment Mode, Destinations
**Location**: Quote creation pages
**Status**: COMPLETED

- [x] Install @dnd-kit library
- [x] Draggable destination blocks
- [x] Visual drag handles
- [x] Reorder animation
- [x] Update block labels on drop
- [x] Toast notification on reorder

**Files Created/Modified**:
- `src/components/inland/sortable-destination.tsx` (new - sortable wrapper)
- `src/app/(dashboard)/inland/new/page.tsx` (DndContext integration)

---

### 4.3 Dimension Conversion Display
**Priority**: ENHANCEMENT
**Affects**: Equipment Dimensions
**Location**: Dimension input components
**Status**: COMPLETED

- [x] Show both formats: `126" (10'6")`
- [x] Tooltip with all units (inches, feet, cm, meters)
- [x] Unit toggle button option
- [x] Reusable DimensionDisplay component

**Files Created/Modified**:
- `src/lib/dimensions.ts` (added conversion functions)
- `src/components/ui/dimension-display.tsx` (new - display component)
- `src/components/quotes/equipment-selector.tsx` (integrated)

---

### 4.4 Filter by "Has Price" / "Has Dimensions"
**Priority**: ENHANCEMENT
**Affects**: Equipment Selection
**Location**: `src/components/quotes/equipment-selector.tsx`
**Status**: COMPLETED

- [x] Add "Has Dimension Data" filter checkbox
- [x] Add "Has Rates" filter checkbox (location-aware)
- [x] Filter equipment list accordingly
- [x] Show indicator icons (Ruler, DollarSign) on equipment items
- [x] Model count display (X of Y models)

**Files Created/Modified**:
- `src/server/routers/equipment.ts` (added getModelsWithAvailability query)
- `src/components/quotes/equipment-selector.tsx` (filter UI)

---

### 4.5 Cargo Image Upload
**Priority**: ENHANCEMENT
**Affects**: Inland Quote Cargo Items
**Location**: `src/components/inland/cargo-item-card.tsx`
**Status**: COMPLETED

- [x] Image upload per cargo item
- [x] Image preview
- [x] Image removal button
- [x] Stored via Supabase Storage

**Files Created/Modified**:
- `src/types/inland.ts` (added image_url to CargoItem)
- `src/components/inland/cargo-item-card.tsx` (image upload UI)

---

### 4.6 Custom Equipment Entry
**Priority**: ENHANCEMENT
**Affects**: Equipment Selection
**Location**: `src/components/inland/cargo-item-card.tsx`
**Status**: COMPLETED

- [x] "Custom Equipment" toggle mode
- [x] Toggle between database and custom entry
- [x] Manual make name input
- [x] Manual model name input
- [x] Auto-update description from custom entries

**Files Created/Modified**:
- `src/types/inland.ts` (added is_custom_equipment, custom_make_name, custom_model_name)
- `src/components/inland/cargo-item-card.tsx` (custom equipment UI)

---

## PHASE 5: SETTINGS PAGES (COMPLETED)

### 5.1 Company Settings Page
**Location**: `src/app/(dashboard)/settings/page.tsx`
**Status**: COMPLETED (Integrated into main settings)

- [x] Company name
- [x] Company logo upload with size adjustment
- [x] Primary color picker
- [x] Secondary color picker
- [x] Address fields (street, city, state, zip)
- [x] Phone number
- [x] Email address
- [x] Website URL

---

### 5.2 Quote Settings Page
**Location**: `src/app/(dashboard)/settings/page.tsx`
**Status**: COMPLETED (Integrated into main settings)

- [x] Default quote validity (days)
- [x] Default margin percentage
- [x] Terms & conditions editor (separate page)
- [x] Quote number prefix format
- [x] Default payment terms

---

### 5.3 Dimension Threshold Settings
**Location**: `src/app/(dashboard)/settings/dismantle/page.tsx`
**Status**: COMPLETED

- [x] Length threshold with conversion display
- [x] Width threshold with conversion display
- [x] Height threshold with conversion display
- [x] Weight threshold with conversion display
- [x] Explanation of threshold behavior

---

### 5.4 Location Templates (Dismantle)
**Location**: `src/app/(dashboard)/settings/dismantle/page.tsx`
**Status**: COMPLETED

- [x] Per-location default costs
- [x] Create/edit/delete templates
- [x] Set default template per location
- [x] Duplicate template functionality

---

### 5.5 Inland Rate Settings
**Location**: `src/app/(dashboard)/settings/inland/page.tsx`
**Status**: COMPLETED

- [x] Default rate per mile
- [x] Default fuel surcharge %
- [x] Default margin %
- [x] Equipment types display
- [x] Accessorial type management (CRUD)
- [x] Feature toggles (Google Maps, route calc, truck recommendations)

---

### 5.6 Fuel Surcharge Index
**Location**: `src/app/(dashboard)/settings/inland/page.tsx`
**Status**: COMPLETED

- [x] Current fuel price input
- [x] Base fuel price for calculation
- [x] Surcharge calculation formula (linear)
- [x] Effective date tracking
- [x] Historical fuel price log
- [x] Calculated surcharge display

---

## PHASE 6: ADDITIONAL SYSTEMS (COMPLETED)
*See Phase 6 sections below*

---

## PHASE 7: DEFERRED ITEMS (COMPLETED)

### 7.1 Complete Auto-Save Draft Management
**Priority**: HIGH
**Affects**: Quote Creation
**Location**: `src/app/(dashboard)/quotes/new/page.tsx`
**Status**: COMPLETED

- [x] Load existing draft on page mount (if exists)
- [x] Clear draft on successful quote creation
- [x] "Discard Draft" button
- [x] Visual indicator when draft is restored

**Files Created/Modified**:
- `src/server/routers/quotes.ts` (added deleteDraft mutation)
- `src/app/(dashboard)/quotes/new/page.tsx` (draft loading, clearing, discard button)

---

### 7.2 Equipment Images in PDF
**Priority**: MEDIUM
**Affects**: PDF Generation
**Location**: `src/lib/pdf/quote-generator.ts`
**Status**: COMPLETED

- [x] Include front/side images in PDF (async version)
- [x] Image sizing and layout in PDF
- [x] Graceful fallback when images unavailable

**Files Created/Modified**:
- `src/lib/pdf/quote-generator.ts` (added frontImageUrl, sideImageUrl support)
- `src/app/(dashboard)/quotes/new/page.tsx` (pass equipment images to PDF)

---

### 7.3 Validity Period in PDF
**Priority**: MEDIUM
**Affects**: PDF Generation
**Location**: `src/lib/pdf/quote-generator.ts`
**Status**: COMPLETED

- [x] Display quote validity/expiration date in PDF header
- [x] Calculate expiration from settings (quote_validity_days)

**Files Created/Modified**:
- `src/app/(dashboard)/quotes/new/page.tsx` (added settings query, expiration calculation)

---

### 7.4 Configurable Popular Makes
**Priority**: LOW
**Affects**: Settings, Equipment Selection
**Location**: `src/app/(dashboard)/settings/dismantle/page.tsx`
**Status**: COMPLETED

- [x] Settings UI to manage popular makes list
- [x] Up/down reorder popular makes
- [x] Add/remove makes from popular list
- [x] Equipment selector uses configurable list

**Files Created/Modified**:
- `src/server/routers/settings.ts` (added getPopularMakes, updatePopularMakes)
- `src/app/(dashboard)/settings/dismantle/page.tsx` (added Popular Makes section)
- `src/components/quotes/equipment-selector.tsx` (uses configurable list)
- `supabase/migrations/007_popular_makes.sql` (new - popular_makes column)

---

### 7.5 Auto-Expire Quotes
**Priority**: LOW
**Affects**: Quote Management
**Location**: Backend/Cron
**Status**: DEFERRED

- [ ] Cron job or scheduled function to check expired quotes
- [ ] Update status to 'expired' when past validity
- [ ] Optional notification to user

*Note: Requires external cron service (Vercel Cron, etc.) - deferred for future implementation*

---

## PHASE 6: ADDITIONAL SYSTEMS - Details (COMPLETED)

### 6.1 Ticket/Feedback System
**Priority**: LOW
**Location**: Global component
**Status**: COMPLETED

- [x] Floating feedback button
- [x] Ticket submission form
- [x] Ticket types: Bug, Feature, Enhancement, Question
- [x] Priority levels
- [x] Screenshot capture (html2canvas)
- [x] Page reference auto-fill
- [x] Email notification to admin (Resend)
- [x] Ticket history view (admin)

**Files Created/Modified**:
- `src/types/feedback.ts` (new - ticket types and constants)
- `src/server/routers/feedback.ts` (new - feedback tRPC router)
- `src/components/feedback/feedback-button.tsx` (new - floating button)
- `src/components/feedback/feedback-dialog.tsx` (new - submission form)
- `src/app/(dashboard)/settings/tickets/page.tsx` (new - admin view)
- `src/components/ui/textarea.tsx` (new - textarea component)
- `src/app/(dashboard)/layout.tsx` (added FeedbackButton)
- `src/components/layout/app-sidebar.tsx` (added Feedback link)
- `supabase/migrations/004_tickets_table.sql` (new - tickets table)

---

### 6.2 Quote Status Workflow
**Priority**: MEDIUM
**Location**: Quote management
**Status**: COMPLETED

- [x] Status values: Draft, Sent, Viewed, Accepted, Rejected, Expired
- [x] Status change actions (markAsSent, markAsViewed, markAsAccepted, markAsRejected)
- [x] Status history tracking (quote_status_history table)
- [x] Status change timestamps (sent_at, viewed_at, accepted_at, rejected_at)
- [x] Email notifications on status change (Resend integration)

**Files Created/Modified**:
- `src/types/quotes.ts` (added QuoteStatusHistory, status labels/colors)
- `src/server/routers/quotes.ts` (added status history tracking, email notifications)
- `src/components/quotes/status-history-timeline.tsx` (new - status history UI)
- `supabase/migrations/005_quote_status_history.sql` (new - status history table)

---

### 6.3 Quote Pipeline/Kanban View
**Priority**: LOW
**Location**: `src/app/(dashboard)/quotes/pipeline/`
**Status**: COMPLETED

- [x] Kanban board layout (using @dnd-kit)
- [x] Columns by status (Draft, Sent, Viewed, Accepted, Rejected)
- [x] Drag-drop between stages with status validation
- [x] Value totals per stage (count and total value)
- [x] Quick actions on cards (view, email, duplicate, delete, status changes)

**Files Created/Modified**:
- `src/app/(dashboard)/quotes/pipeline/page.tsx` (new - full Kanban view)
- `src/components/layout/app-sidebar.tsx` (added Pipeline link)

---

### 6.4 Quote Versioning
**Priority**: MEDIUM
**Location**: Quote system
**Status**: COMPLETED

- [x] Version number tracking (version field, is_latest_version)
- [x] Create revision from existing quote (createRevision mutation)
- [x] Link to parent quote (parent_quote_id)
- [x] Version comparison view (compareVersions query)
- [x] Version history list (getVersions query, VersionHistory component)

**Files Created/Modified**:
- `src/types/quotes.ts` (added versioning fields and QuoteVersion type)
- `src/server/routers/quotes.ts` (added createRevision, getVersions, compareVersions)
- `src/components/quotes/version-history.tsx` (new - version history UI)
- `supabase/migrations/006_quote_versioning.sql` (new - versioning columns)

---

## IMPLEMENTATION TRACKING

### Sprint 1 (Current)
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| Misc Fees UI | - | Not Started | |
| Billing Fields | - | Not Started | |
| Email Signature Parser | - | Not Started | |

### Sprint 2
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| Auto-Save Drafts | - | Not Started | |
| Google Places | - | Not Started | |
| Recent Equipment | - | Not Started | |

### Sprint 3
| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| Favorites System | - | Not Started | |
| Equipment Mode Cargo | - | Not Started | |
| Truck Recommendation UI | - | Not Started | |

---

## NOTES

### Dependencies
- Google Places requires API key configuration
- Image uploads require Supabase Storage setup
- Email notifications require email service (Resend already configured)

### Database Changes Required
- `recent_equipment` table
- `favorites` table (or localStorage)
- `quote_drafts` table updates
- Settings tables for new configurations

### Files to Create
- `src/lib/email-signature-parser.ts`
- `src/lib/favorites.ts`
- `src/components/ui/address-autocomplete.tsx`
- `src/components/quotes/misc-fees-list.tsx`
- `src/components/quotes/billing-form.tsx`
- Various settings pages

---

## CHANGELOG

### 2026-01-07
- Initial document created
- Identified 65+ missing features
- Organized into 6 phases by priority
