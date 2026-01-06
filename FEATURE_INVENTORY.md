# Complete Feature Inventory - Dismantle DB

**CRITICAL**: This document lists EVERY feature that currently exists in the system. We MUST preserve ALL of these features in the rebuild. Check off each item as it gets implemented.

---

## 1. QUOTE GENERATION (Dismantling)

### 1.1 Equipment Selection
- [ ] **Make/Model Dropdown Selection** - Searchable dropdowns for selecting equipment
- [ ] **Popular Makes Sorting** - Common brands (CAT, Komatsu, John Deere) appear first
- [ ] **Model Auto-Filter** - Models filter based on selected make
- [ ] **Recent Equipment Quick-Select** - Shows last 10 used equipment for quick access
- [ ] **Favorites System** - Star/favorite frequently used equipment
- [ ] **Custom Equipment Mode** - Enter any make/model not in database
- [ ] **Filter by "Has Price"** - Show only equipment with pricing data
- [ ] **Filter by "Has Dimensions"** - Show only equipment with dimension data

### 1.2 Multi-Equipment Quotes
- [ ] **Equipment Blocks** - Add multiple equipment items to single quote
- [ ] **Per-Block Location Selection** - Each equipment can have different loading location
- [ ] **Per-Block Cost Overrides** - Independent cost customization per equipment
- [ ] **Per-Block Miscellaneous Fees** - Separate misc fees per equipment
- [ ] **Per-Block Dimensions** - Each block shows its equipment dimensions
- [ ] **Block Duplication** - Duplicate an equipment block with all settings
- [ ] **Block Removal** - Remove equipment blocks
- [ ] **Block Reordering** - Drag to reorder (if implemented)

### 1.3 Location-Based Pricing
- [ ] **6 Predefined Locations** - NJ, Savannah, Houston, Chicago, Oakland, Long Beach
- [ ] **Auto-Load Location Costs** - Costs load when location selected
- [ ] **Location Templates** - Default cost templates per location

### 1.4 Cost Management
- [ ] **12 Cost Categories**:
  - [ ] Dismantling/Loading Cost
  - [ ] Loading Cost
  - [ ] Blocking & Bracing Cost
  - [ ] NCB Survey Cost
  - [ ] Local Drayage Cost
  - [ ] Chassis Cost
  - [ ] Tolls Cost
  - [ ] Escorts Cost
  - [ ] Power Wash Cost
  - [ ] Waste Fluids Disposal Fee
  - [ ] Miscellaneous Cost
  - [ ] Miscellaneous Cost 2

- [ ] **Enable/Disable Individual Costs** - Toggle each cost on/off with checkbox
- [ ] **Cost Override** - Override database value with custom amount
- [ ] **Cost Description** - Add custom description for each cost line
- [ ] **Original vs Override Indicator** - Visual indicator when cost is overridden

### 1.5 Miscellaneous Fees
- [ ] **Dynamic Misc Fees** - Add unlimited miscellaneous fee line items
- [ ] **Title Field** - Name for the fee
- [ ] **Description Field** - Details for the fee
- [ ] **Amount Field** - Dollar amount
- [ ] **Add/Remove Buttons** - Add new or remove existing fees

### 1.6 Equipment Dimensions
- [ ] **Display Dimensions** - Show operating weight, L×W×H
- [ ] **Edit Dimensions Inline** - Edit dimensions while creating quote
- [ ] **Smart Dimension Parser** - Auto-detect feet vs inches input
- [ ] **Feet.Inches Format** - Enter 10.6 = 10 feet 6 inches
- [ ] **Configurable Thresholds** - Admin-set thresholds for ft/in detection
- [ ] **Dimension Conversion Display** - Show both inches and feet format

### 1.7 Equipment Images
- [ ] **Front Image Display** - Show equipment front view
- [ ] **Side Image Display** - Show equipment side view
- [ ] **Image Upload** - Upload PNG, JPEG, GIF, WebP, BMP, SVG
- [ ] **SVG to PNG Conversion** - Auto-convert SVG for PDF compatibility
- [ ] **Image in PDF** - Include equipment images in generated PDF
- [ ] **Remove Image** - Delete uploaded image

### 1.8 Customer Information
- [ ] **Customer Name Field**
- [ ] **Customer Email Field** (with validation)
- [ ] **Customer Company Field**
- [ ] **Customer Phone Field** (with validation)
- [ ] **Customer Address Field**

### 1.9 Billing Information
- [ ] **Billing Address Field**
- [ ] **Billing City Field**
- [ ] **Billing State Field**
- [ ] **Billing ZIP Field**
- [ ] **Payment Terms Field**

### 1.10 Customer Selection
- [ ] **Customer Dropdown** - Select from existing customers
- [ ] **Customer Search** - Search customers by name/company/email
- [ ] **Contact Selection** - Select from contacts linked to companies
- [ ] **Company Selection** - Select company, auto-fill from company data
- [ ] **Auto-Fill Customer Data** - Populate fields when customer selected
- [ ] **Add New Customer Inline** - Create new customer while making quote
- [ ] **Email Signature Parser** - Paste email signature to extract contact info

### 1.11 Pricing & Margin
- [ ] **Subtotal Calculation** - Sum of all enabled costs + misc fees
- [ ] **Margin Percentage Input** - Enter desired margin %
- [ ] **Margin Amount Display** - Shows calculated margin amount
- [ ] **Total with Margin** - Final price including margin
- [ ] **Real-Time Recalculation** - Updates as values change

### 1.12 Auto-Save & Drafts
- [ ] **Auto-Save Draft** - Automatically saves work in progress
- [ ] **Draft ID Tracking** - Unique ID for each draft
- [ ] **Auto-Save Status Indicator** - Shows "Saved", "Saving...", "Unsaved"
- [ ] **Last Saved Timestamp** - Shows when last saved
- [ ] **Clear Draft on Complete** - Removes draft after quote generated

### 1.13 Internal Notes
- [ ] **Internal Notes Field** - Notes visible only to staff, not on PDF

### 1.14 Quote Number Generation
- [ ] **Auto-Generated Quote Number** - Format: QT-YYYYMMDD-XXXX
- [ ] **Unique Number Guarantee** - No duplicate quote numbers

### 1.15 PDF Generation
- [ ] **Professional PDF Layout** - Clean, branded quote document
- [ ] **Company Logo in Header** - Custom logo from settings
- [ ] **Company Info in Header** - Address, phone, email, website
- [ ] **Company Colors** - Primary/secondary color theming
- [ ] **Quote Date** - Formatted date
- [ ] **Quote Number** - Prominent display
- [ ] **Customer Section** - Customer/billing info block
- [ ] **Equipment Details** - Make, model, dimensions, images
- [ ] **Cost Breakdown Table** - All costs with descriptions
- [ ] **Margin Row** - Shows margin percentage and amount
- [ ] **Total Section** - Final total prominently displayed
- [ ] **Terms & Conditions** - From settings
- [ ] **Quote Validity Period** - Days until expiration
- [ ] **Footer** - Company branding

### 1.16 Live PDF Preview
- [ ] **Real-Time Preview** - PDF updates as you type
- [ ] **Preview Toggle** - Show/hide preview panel
- [ ] **Debounced Generation** - Prevents excessive regeneration
- [ ] **Preview in Modal** - Full-screen preview option

### 1.17 Quote Actions
- [ ] **Download PDF** - Save PDF to device
- [ ] **Preview PDF** - View before downloading
- [ ] **Save to History** - Automatically saves to quote_history

---

## 2. INLAND TRANSPORTATION QUOTES

### 2.1 Destination Blocks System
- [ ] **Multiple Destinations** - Add destinations A, B, C, etc.
- [ ] **Destination Naming** - Auto-named "Destination A", "Destination B"
- [ ] **Add Destination** - Create new destination block
- [ ] **Remove Destination** - Delete destination (minimum 1)
- [ ] **Duplicate Destination** - Copy with all settings
- [ ] **Collapse/Expand** - Minimize destination blocks

### 2.2 Route Planning (Per Destination)
- [ ] **Pickup Address** - Google Places autocomplete
- [ ] **Dropoff Address** - Google Places autocomplete
- [ ] **Multiple Stops** - Add intermediate stops
- [ ] **Route Calculation** - Google Routes API integration
- [ ] **Distance Display** - Miles between points
- [ ] **Duration Display** - Estimated travel time
- [ ] **Auto-Calculate on Address Change** - Debounced route calculation
- [ ] **Route Map Display** - Visual map with polyline
- [ ] **Map Capture for PDF** - Screenshot map for quote PDF

### 2.3 Load Blocks System
- [ ] **Multiple Loads Per Destination** - Add Load 1, Load 2, etc.
- [ ] **Load Naming** - Auto-numbered loads
- [ ] **Add Load Block** - Create new load
- [ ] **Remove Load Block** - Delete load (minimum 1)
- [ ] **Duplicate Load Block** - Copy with cargo/services
- [ ] **Active Load Selection** - Highlight current load being edited

### 2.4 Truck Type Selection
- [ ] **Truck Type Dropdown** - Select from configured truck types
- [ ] **Truck Capacity Display** - Max weight, length, width, height
- [ ] **Custom Truck Input** - Enter custom truck type on the fly
- [ ] **Create Custom Truck** - Save custom truck to database

### 2.5 Smart Truck Recommendation
- [ ] **Auto-Recommend Truck** - Based on cargo dimensions/weight
- [ ] **Recommendation Reason** - Explains why truck was chosen
- [ ] **Multi-Truck Suggestion** - Suggests multiple trucks if cargo too large
- [ ] **Manual Override Indicator** - Shows when user overrode recommendation
- [ ] **Re-Calculate on Cargo Change** - Updates recommendation when cargo changes

### 2.6 Cargo Items
- [ ] **Add Cargo Item** - Create new cargo entry
- [ ] **Remove Cargo Item** - Delete cargo
- [ ] **Cargo Description** - Free text description
- [ ] **Cargo Type Dropdown** - Predefined cargo types
- [ ] **Custom Cargo Type** - Enter custom type
- [ ] **Quantity Field** - Number of items
- [ ] **Weight (lbs)** - Per-item weight
- [ ] **Length (inches)** - Item length
- [ ] **Width (inches)** - Item width
- [ ] **Height (inches)** - Item height
- [ ] **Smart Dimension Input** - Feet vs inches detection
- [ ] **Cargo Image Upload** - Photo of cargo item

### 2.7 Equipment Mode for Cargo
- [ ] **Toggle Equipment Mode** - Switch cargo item to equipment lookup
- [ ] **Equipment Make Selection** - Choose from equipment database
- [ ] **Equipment Model Selection** - Choose model from make
- [ ] **Auto-Fill Dimensions** - Pull dimensions from equipment_dimensions
- [ ] **Auto-Fill Images** - Pull equipment images
- [ ] **Custom Equipment Toggle** - Enter make/model not in database

### 2.8 Service Items
- [ ] **Add Service Item** - Create new service line
- [ ] **Remove Service Item** - Delete service
- [ ] **Service Name** - Name of service
- [ ] **Service Description** - Details
- [ ] **Service Price** - Dollar amount
- [ ] **Service Quantity** - Number of units
- [ ] **Service Type Dropdown** - Predefined service types:
  - Line Haul
  - Drayage
  - Inland Transportation
  - Loading
  - Unloading
  - Fuel Surcharge
  - Flatbed Service
  - Lowboy Service
  - Step Deck Service
  - Oversized Load
  - Pilot Car / Escort
  - Tarp Service

### 2.9 Accessorial Charges
- [ ] **Add Accessorial** - Add from predefined types
- [ ] **Remove Accessorial** - Delete charge
- [ ] **Accessorial Modal** - Browse available types
- [ ] **Custom Accessorial** - Create custom charge on the fly
- [ ] **Amount Field** - Dollar or percentage
- [ ] **Percentage Toggle** - Charge as % of subtotal
- [ ] **Billing Unit** - flat, hour, day, way, week, month, stop
- [ ] **Quantity Field** - Number of units
- [ ] **Condition Text** - "If applicable" conditions
- [ ] **Free Time Hours** - Hours before charge applies

### 2.10 Rate Configuration
- [ ] **Rate Per Mile** - Base $/mile rate
- [ ] **Base Rate** - Minimum charge
- [ ] **Fuel Surcharge %** - Percentage surcharge
- [ ] **Margin Percentage** - Profit margin

### 2.11 Saved Lanes
- [ ] **Save Lane** - Save frequent routes
- [ ] **Lane Use Count** - Track usage frequency
- [ ] **Quick Select Lane** - Load saved route

### 2.12 Customer Information (Same as Dismantling)
- [ ] All customer fields from section 1.9-1.10

### 2.13 Inland Quote PDF
- [ ] **Professional Layout** - Branded document
- [ ] **Route Map Image** - Embedded map screenshot
- [ ] **Per-Destination Sections** - Separate sections for each destination
- [ ] **Cargo Details Table** - All cargo items with dimensions
- [ ] **Service Items Table** - All services with prices
- [ ] **Accessorial Charges Table** - Conditional charges
- [ ] **Total Calculations** - Subtotal, margin, total

### 2.14 Inland Quote History
- [ ] **Save to History** - Store completed quotes
- [ ] **Edit Existing Quote** - Reload and modify
- [ ] **Quote Versioning** - Track revisions

---

## 3. EQUIPMENT & RATE MANAGEMENT

### 3.1 Price Entry View (Data Entry)
- [ ] **Tabular Interface** - Spreadsheet-like editing
- [ ] **Make Filter** - Filter by manufacturer
- [ ] **Model Filter** - Filter by model
- [ ] **Expandable Rows** - Click to expand details
- [ ] **Per-Location Costs** - Edit costs for each location
- [ ] **Inline Editing** - Edit directly in table
- [ ] **Auto-Save** - Saves 2 seconds after last change
- [ ] **Pagination** - 20 items per page
- [ ] **Favorites Toggle** - Quick favorite access
- [ ] **Add Model Modal** - Add new model for a make

### 3.2 Location Costs Editor (In Expanded Row)
- [ ] **All 12 Cost Fields** - Edit each cost type
- [ ] **Per-Location Tabs** - Switch between locations
- [ ] **Save Indicator** - Shows saving status
- [ ] **Notes Field** - Per-location notes

### 3.3 Dimensions Editor (In Expanded Row)
- [ ] **Operating Weight** - In pounds
- [ ] **Transport Length** - In inches (with ft.in input)
- [ ] **Transport Width** - In inches
- [ ] **Transport Height** - In inches
- [ ] **Smart Input Parsing** - Feet/inches detection
- [ ] **Image Upload** - Front and side images
- [ ] **Equipment Type** - Category classification

### 3.4 Search View
- [ ] **Global Search** - Search across make/model
- [ ] **Make Filter Dropdown**
- [ ] **Model Filter Dropdown**
- [ ] **Location Filter** - Show only rates for location
- [ ] **Favorites Only Toggle**
- [ ] **Sortable Columns** - Make, model, price, updated_at
- [ ] **Sort Direction Toggle** - Asc/desc
- [ ] **Pagination** - Configurable items per page
- [ ] **Expandable Details** - View all location costs
- [ ] **Clear All Filters Button**
- [ ] **Active Filters Indicator**

### 3.5 Export Functions
- [ ] **Simple CSV Export** - Basic rate data
- [ ] **Comprehensive CSV Export** - All data including dimensions
- [ ] **Export Filtered Results** - Only exports what's shown

### 3.6 Reset/Clear Data
- [ ] **Reset Confirmation Modal** - Type "RESET" to confirm
- [ ] **Clear All Location Costs** - For specific equipment

### 3.7 Manage View
- [ ] **Equipment Types Management** - CRUD for types
- [ ] **Makes Management** - CRUD for manufacturers
- [ ] **Models Management** - CRUD for models
- [ ] **Bulk Operations** - Mass updates

### 3.8 Add New Equipment
- [ ] **Add New Make** - Create manufacturer
- [ ] **Add New Model** - Create model under make
- [ ] **Initial Price** - Optional base price

---

## 4. CUSTOMER RELATIONSHIP MANAGEMENT (CRM)

### 4.1 Company Management
- [ ] **Company List View** - All companies with search
- [ ] **Company Status** - Active, Inactive, Prospect, VIP
- [ ] **Status Color Coding** - Visual status indicators
- [ ] **Company Search** - By name, industry
- [ ] **Status Filter** - Filter by status
- [ ] **Create Company** - Full company form
- [ ] **Edit Company** - Update details
- [ ] **Delete Company** - With confirmation

### 4.2 Company Details
- [ ] **Company Name** (required)
- [ ] **Industry**
- [ ] **Website**
- [ ] **Phone**
- [ ] **Address** - Line 1, City, State, ZIP
- [ ] **Billing Address** - Separate billing address
- [ ] **Payment Terms** - Default "Net 30"
- [ ] **Tax ID**
- [ ] **Tags** - Custom tags array
- [ ] **Notes** - Internal notes

### 4.3 Contact Management
- [ ] **Contacts Per Company** - Multiple contacts
- [ ] **Contact List** - Sorted by primary, then name
- [ ] **Create Contact** - Add new contact
- [ ] **Edit Contact** - Update details
- [ ] **Delete Contact** - With confirmation
- [ ] **Primary Contact Flag** - Mark as primary

### 4.4 Contact Details
- [ ] **First Name** (required)
- [ ] **Last Name**
- [ ] **Title/Position**
- [ ] **Email**
- [ ] **Phone**
- [ ] **Mobile**
- [ ] **Role** - General, Decision Maker, Billing, Operations, Technical
- [ ] **Is Primary** - Primary contact toggle
- [ ] **Notes**

### 4.5 Customer Management (Legacy)
- [ ] **Customer List** - Legacy customers table
- [ ] **Customer Search**
- [ ] **Sort By** - Name, company, created_at
- [ ] **Sort Order** - Asc/desc
- [ ] **Create Customer**
- [ ] **Edit Customer**
- [ ] **Delete Customer**
- [ ] **Email Signature Parser** - Extract info from signature

### 4.6 Import/Export
- [ ] **CSV Import** - Bulk import companies/contacts
- [ ] **Advanced Import View** - Column mapping
- [ ] **Validation During Import** - Error checking
- [ ] **Import Preview** - Review before saving

---

## 5. ACTIVITY TRACKING

### 5.1 Activity Log
- [ ] **Activity List** - All activities
- [ ] **Activity Types** - Call, Email, Meeting, Note
- [ ] **Customer Link** - Associate with customer
- [ ] **Contact Link** - Associate with contact
- [ ] **Quote Link** - Associate with quote
- [ ] **Create Activity** - Log new activity
- [ ] **Edit Activity** - Update details
- [ ] **Delete Activity**

### 5.2 Activity Details
- [ ] **Activity Type**
- [ ] **Title/Subject**
- [ ] **Description/Notes**
- [ ] **Duration** - For calls/meetings
- [ ] **Outcome** - Completed, No Answer, Voicemail, etc.
- [ ] **Follow-Up Date** - Schedule follow-up
- [ ] **Timestamp** - When activity occurred

### 5.3 Follow-Up Reminders
- [ ] **Reminder List** - All pending reminders
- [ ] **Priority Levels** - Low, Medium, High, Urgent
- [ ] **Status** - Pending, Completed, Snoozed, Cancelled
- [ ] **Due Date/Time**
- [ ] **Snooze Function** - Postpone reminder
- [ ] **Mark Complete**
- [ ] **Link to Customer/Quote**

---

## 6. QUOTE HISTORY & PIPELINE

### 6.1 Quote History View
- [ ] **All Quotes List** - Dismantling quotes
- [ ] **Search Quotes** - By number, customer, equipment
- [ ] **Filter by Status** - Draft, Sent, Accepted, Rejected, Expired
- [ ] **Filter by Date Range**
- [ ] **Sort Columns**
- [ ] **Pagination**
- [ ] **Quote Details Expansion**

### 6.2 Quote Status Management
- [ ] **Status Workflow** - Draft → Sent → Accepted/Rejected → Expired
- [ ] **Update Status** - Change quote status
- [ ] **Status History** - Track status changes
- [ ] **Version Tracking** - Quote revisions
- [ ] **Parent Quote Link** - Link to original quote

### 6.3 Quote Pipeline View
- [ ] **Kanban Board** - Visual pipeline
- [ ] **Drag-Drop** - Move between stages
- [ ] **Stage Totals** - Value per stage
- [ ] **Quick Actions** - Update status, view details

### 6.4 Inland Quote History
- [ ] **Inland Quotes List**
- [ ] **Edit Quote** - Reload into form
- [ ] **View Quote** - See details
- [ ] **Status Management**

---

## 7. SETTINGS & CONFIGURATION

### 7.1 Company Settings
- [ ] **Company Name**
- [ ] **Company Logo** - Upload/URL
- [ ] **Primary Color** - Hex color picker
- [ ] **Secondary Color**
- [ ] **Address**
- [ ] **Phone**
- [ ] **Email**
- [ ] **Website**

### 7.2 Quote Settings
- [ ] **Quote Validity Days** - Default expiration
- [ ] **Default Margin Percentage**
- [ ] **Terms & Conditions** - Text for quotes
- [ ] **Quote Footer Text**

### 7.3 Dimension Thresholds
- [ ] **Length Threshold** - Feet vs inches cutoff
- [ ] **Width Threshold**
- [ ] **Height Threshold**

### 7.4 Quote Templates
- [ ] **Per-Location Templates** - Default costs
- [ ] **Default Template Flag** - Auto-load on location select
- [ ] **Template Management** - CRUD for templates

### 7.5 Dismantle Settings
- [ ] **Location-Specific Defaults**
- [ ] **Cost Field Defaults**

### 7.6 Inland Settings
- [ ] **Default Rate Per Mile**
- [ ] **Default Fuel Surcharge %**
- [ ] **Default Margin %**
- [ ] **Truck Type Management** - CRUD
- [ ] **Accessorial Type Management** - CRUD
- [ ] **Service Type Management** - CRUD
- [ ] **Load Type Management** - CRUD
- [ ] **Rate Tier Management** - Distance/weight tiers

### 7.7 Fuel Surcharge Index
- [ ] **Fuel Price Tracking** - DOE price index
- [ ] **Effective Date**
- [ ] **Auto-Calculate Surcharge**

---

## 8. SUPPORT & FEEDBACK

### 8.1 Tickets System
- [ ] **Floating Ticket Button** - Always visible
- [ ] **Create Ticket** - Feature request, bug, enhancement
- [ ] **Ticket Types** - Feature, Bug, Enhancement, Question
- [ ] **Priority Levels** - Low, Medium, High, Urgent
- [ ] **Status Tracking** - New, In Progress, Resolved, Closed
- [ ] **Page Reference** - Which page ticket is about
- [ ] **Screenshot Capture** - Attach screenshot
- [ ] **Admin Notes** - Internal notes
- [ ] **Email Notification** - Sends to admin email

### 8.2 Updates View
- [ ] **What's New** - Feature announcements
- [ ] **Version History**
- [ ] **Update Notifications**

---

## 9. UI/UX FEATURES

### 9.1 Navigation
- [ ] **Sidebar Navigation** - Collapsible sidebar
- [ ] **Tab-Based Views** - 18 main tabs
- [ ] **Mobile Responsive** - Sidebar drawer on mobile
- [ ] **Active Tab Indicator**
- [ ] **Section Grouping** - Equipment, Management, Inland, etc.

### 9.2 Toast Notifications
- [ ] **Success Toasts** - Green confirmation
- [ ] **Error Toasts** - Red alerts
- [ ] **Auto-Dismiss** - Timed disappearance
- [ ] **Manual Dismiss** - Click to close

### 9.3 Loading States
- [ ] **Skeleton Loaders** - Content placeholders
- [ ] **Spinner Indicators** - Action in progress
- [ ] **Disabled States** - During saves

### 9.4 Modals & Dialogs
- [ ] **Confirmation Dialogs** - Delete confirmations
- [ ] **Form Modals** - Inline form popups
- [ ] **Preview Modals** - PDF preview
- [ ] **Backdrop Click Close**
- [ ] **Escape Key Close**

### 9.5 Forms
- [ ] **Input Validation** - Real-time validation
- [ ] **Error Messages** - Field-level errors
- [ ] **Required Indicators** - Red asterisk
- [ ] **Placeholder Text** - Helper hints
- [ ] **Focus States** - Visual focus rings

### 9.6 Tables
- [ ] **Sortable Headers** - Click to sort
- [ ] **Pagination Controls** - Page numbers
- [ ] **Items Per Page** - Configurable
- [ ] **Expandable Rows** - Click to expand
- [ ] **Row Actions** - Edit, delete buttons

### 9.7 Searchable Dropdowns
- [ ] **Type to Search** - Filter options
- [ ] **Keyboard Navigation** - Arrow keys
- [ ] **Create New Option** - Add while selecting

---

## 10. INTEGRATIONS

### 10.1 Google Places API
- [ ] **Address Autocomplete** - Search as you type
- [ ] **Address Parsing** - Extract components
- [ ] **Lat/Lng Capture** - For route calculation

### 10.2 Google Routes API
- [ ] **Distance Calculation** - Miles between points
- [ ] **Duration Estimation** - Travel time
- [ ] **Polyline Data** - For map display
- [ ] **Multi-Stop Routes** - Via waypoints

### 10.3 Supabase
- [ ] **Database Operations** - CRUD via client
- [ ] **Real-Time (if used)**
- [ ] **Storage** - File uploads
- [ ] **Authentication** - (to be added)

### 10.4 Email (Resend)
- [ ] **Ticket Notifications** - Email on new ticket

---

## 11. DATA VALIDATION & SECURITY

### 11.1 Input Validation
- [ ] **Email Validation** - Format checking
- [ ] **Phone Validation** - Format checking
- [ ] **URL Validation** - Format checking
- [ ] **Required Fields** - Enforce required
- [ ] **Number Validation** - Min/max, type

### 11.2 Sanitization
- [ ] **XSS Prevention** - HTML sanitization
- [ ] **SQL Injection Prevention** - Parameterized queries
- [ ] **Input Trimming** - Remove whitespace

### 11.3 Middleware Security
- [ ] **Rate Limiting** - 100 req/min pages, 30 req/min API
- [ ] **Bot Detection** - Block known bad bots
- [ ] **Suspicious Pattern Detection** - SQL injection, path traversal
- [ ] **Security Headers** - CSP, HSTS, X-Frame-Options

---

## 12. HELPER FUNCTIONS (Critical to Preserve)

### 12.1 Smart Dimension Parser
```typescript
// MUST PRESERVE: Auto-detects feet vs inches input
// - 10.6 → 10 feet 6 inches → 126 inches
// - 126 (above threshold) → 126 inches
// - 10 (below threshold) → 10 feet → 120 inches
parseSmartDimension(value, dimensionType)
parseSmartDimensionWithThresholds(value, dimensionType, thresholds)
wasEnteredAsFeetWithThresholds(value, dimensionType, thresholds)
```

### 12.2 Truck Recommendation
```typescript
// MUST PRESERVE: Recommends truck based on cargo
// - Checks weight capacity
// - Checks dimension capacity
// - Suggests multiple trucks if needed
recommendTruck(cargoItems, truckTypes)
```

### 12.3 Quote Number Generation
```typescript
// MUST PRESERVE: Generates unique quote numbers
// Format: QT-YYYYMMDD-XXXX (random 4 chars)
generateQuoteNumber()
```

### 12.4 Currency Formatting
```typescript
// MUST PRESERVE: Consistent currency display
formatCurrency(value) // → $1,234.00
```

### 12.5 Dimension Formatting
```typescript
// MUST PRESERVE: Inches to feet display
formatDimension(inches) // 126 → 10'6"
```

### 12.6 Email Signature Parser
```typescript
// MUST PRESERVE: Extracts contact info from signatures
parseEmailSignature(text) // → { name, email, phone, company, ... }
```

### 12.7 Image Format Detection
```typescript
// MUST PRESERVE: Detects image format from base64
getImageFormat(imageData) // → 'PNG' | 'JPEG' | 'GIF' | 'WEBP'
prepareImageForPdf(imageData) // → valid data URI
convertSvgToPng(svgData) // → PNG data URI
```

### 12.8 Popular Makes Sorting
```typescript
// MUST PRESERVE: CAT, Komatsu, etc. appear first
sortMakesByPopularity(makes)
POPULAR_MAKES = ['Caterpillar', 'Komatsu', 'John Deere', ...]
```

### 12.9 Favorites System
```typescript
// MUST PRESERVE: localStorage-based favorites
getFavorites() // → Set<string>
toggleFavorite(rateId)
isFavorite(rateId)
```

### 12.10 Route Totals Calculator
```typescript
// MUST PRESERVE: Calculates inland quote totals
calculateTotals(formData) // → { lineHaul, fuelSurcharge, ... }
```

---

## VERIFICATION CHECKLIST

Before considering the rebuild complete, verify:

1. [ ] All 12 cost categories work in dismantling quotes
2. [ ] Multi-equipment quotes generate correct PDF
3. [ ] Smart dimension input works (10.6 = 10'6")
4. [ ] Truck recommendation suggests correct trucks
5. [ ] Load blocks can be added/removed/duplicated
6. [ ] Destination blocks work for multi-stop routes
7. [ ] Live PDF preview updates in real-time
8. [ ] Equipment images appear in PDF
9. [ ] Map captures work for inland quotes
10. [ ] Customer auto-fill works from selection
11. [ ] Email signature parser extracts data
12. [ ] Quote history saves all data correctly
13. [ ] All 6 locations have correct cost fields
14. [ ] Export CSV includes all data
15. [ ] Activity logging works
16. [ ] Follow-up reminders work
17. [ ] Company/contact management works
18. [ ] All settings are configurable
19. [ ] Ticket system sends notifications

---

*Document Version: 1.0*
*Created: January 2026*
*Total Features: 400+*
