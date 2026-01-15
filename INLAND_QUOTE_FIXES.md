# Inland Quote Page Fixes

## Tasks

### 1. [x] Clear Draft Not Persisting
- **Issue**: When pressing "Clear Draft", navigating away, and coming back, the cleared data is restored
- **Expected**: Cleared data should stay cleared (draft should be deleted from database)
- **Fixed**: Added `utils.inland.getDraft.invalidate()` in deleteDraftMutation's onSuccess callback

### 2. [x] Remove "Save as Template" Feature
- **Issue**: "Save as Template" button exists but not needed
- **Action**: Remove the button and related functionality
- **Fixed**: Removed saveTemplate mutation, handleSaveAsTemplate function, and button

### 3. [x] Move "Save Draft" Button
- **Issue**: "Save Draft" button is at the top, should be next to "Clear Draft"
- **Action**: Move button to be next to "Clear Draft" button
- **Fixed**: Restructured header buttons to place Save Draft next to Clear Draft

### 4. [x] Fix PDF Map Route Display (COMPLEX)
- **Issue**: Map in PDF shows a straight line instead of actual driving route
- **Expected**: Should show the actual route the truck will take
- **Fixed**:
  - Added `onRouteCalculated` callback to RouteMap component
  - RouteMap now extracts encoded polyline from Google Directions API response
  - Polyline is stored in destination block's `route_polyline` field
  - Static map URL now uses `path=enc:ENCODED_POLYLINE` for actual route display
  - Changes in: route-map.tsx, new/page.tsx, [id]/edit/page.tsx

### 5. [x] Equipment Images in PDF
- **Issue**: Equipment images not showing in PDF
- **Requirements**:
  - Show existing equipment images in PDF if they exist
  - Add upload areas for front and side images if not uploaded
  - Save uploaded images to library for future use
- **Fixed**:
  - Added `front_image_url` and `side_image_url` fields to CargoItem type
  - Updated cargo-item-card.tsx to show dual upload areas for equipment mode
  - When equipment is selected from database, images are auto-loaded from library
  - When images are uploaded for database equipment, they are saved back to library
  - Updated PDF template to display front/side images side-by-side for equipment
  - Updated InlandCargoItem type to include front/side image fields
  - Updated page.tsx and edit/page.tsx to pass image URLs through to PDF

### 6. [x] Remove Unused Table Header from Inland PDF
- **Issue**: "Service Description | Category | Qty | Unit Rate | Line Total" header exists but nothing under it
- **Action**: Remove this unused table header from inland quote PDF
- **Fixed**: Added conditional rendering to only show equipment/ServicesTable when `data.equipment.length > 0`

### 7. [x] Multiple Destination Blocks - Separate Tables in PDF
- **Issue**: Multiple destination blocks should show as separate tables in PDF
- **Expected**: Each destination block gets its own table, with Grand Total at the end
- **Fixed**: Rewrote InlandTransportServicesSection to render each destination with its own header and table
