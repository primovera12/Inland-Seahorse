# Phase 4: Data & Coverage Fixes

> **Priority:** HIGH to MEDIUM - Missing or incorrect state data causes permit cost errors and route detection failures.
> **Files Affected:** `state-permits.ts`, `state-detector.ts`, `permit-calculator.ts`

---

## P4-01: Alaska and Hawaii Missing from State Detector

### Problem
`state-detector.ts` lines 26-75: The bounding box array includes all 48 contiguous states plus DC, but omits Alaska (AK) and Hawaii (HI). Both states exist in `state-permits.ts` with full permit data, but route state detection will never identify them.

### Root Cause
State detector was built for continental US only. Alaska and Hawaii were added to permit data later.

### Implementation Plan

#### Subtask 1.1: Add bounding boxes
- [ ] Add Alaska:
  ```typescript
  { code: 'AK', name: 'Alaska', minLat: 51.0, maxLat: 71.4, minLng: -180.0, maxLng: -130.0 }
  ```
  Note: Alaska crosses the antimeridian — the Aleutian Islands extend past 180°. For simplicity, use -180 to -130 which covers the mainland and most islands.

- [ ] Add Hawaii:
  ```typescript
  { code: 'HI', name: 'Hawaii', minLat: 18.9, maxLat: 22.3, minLng: -160.3, maxLng: -154.8 }
  ```

#### Subtask 1.2: Handle non-contiguous route detection
- [ ] Alaska and Hawaii routes won't have polyline connections to continental US
- [ ] Detect based on pickup/dropoff coordinates, not route segments
- [ ] If either origin or destination is in AK/HI, flag special handling

#### Subtask 1.3: Add barge/ferry awareness
- [ ] Alaska-bound loads from lower 48 often go through WA/OR to AK via barge
- [ ] Hawaii loads ship via container from CA ports
- [ ] Add note in permit output when AK/HI detected

### Testing
- [ ] Test: Coordinates in Anchorage (61.2°N, -149.9°W) → detected as AK
- [ ] Test: Coordinates in Honolulu (21.3°N, -157.8°W) → detected as HI
- [ ] Test: Route from Seattle to Anchorage → includes WA and AK

---

## P4-02: North Carolina Combination Length Wrong

### Problem
`state-permits.ts` line 1433: North Carolina combination length limit shows 60 feet. The correct limit is 65 feet for most routes.

### Root Cause
Data entry error.

### Implementation Plan

#### Subtask 2.1: Verify correct NC length limits
- [ ] Check NCDOT website for current combination vehicle length limits
- [ ] Standard: 65' combination on designated highways
- [ ] Some local roads: 55-60' (restricted routes)

#### Subtask 2.2: Update state-permits.ts
- [ ] Change `maxLength.combination` from 60 to 65 for NC
- [ ] Add note about restricted route exceptions

#### Subtask 2.3: Audit other states for similar errors
- [ ] Cross-check combination length limits for all 50 states
- [ ] Common values: 65' (most states), 75' (some western states), 60' (restrictive states)
- [ ] Flag any that seem unusually low or high

### Testing
- [ ] Test: 62' combination through NC → no permit required (under 65')
- [ ] Test: 66' combination through NC → oversize length permit required

---

## P4-03: NYC Requires Separate Permits from NY State

### Problem
`state-permits.ts` lines 1385-1423: New York state permit data doesn't account for the fact that NYC (all 5 boroughs) requires completely separate permits from the NYC Department of Transportation, with different fees, different agencies, and different restrictions.

### Root Cause
State-level permit model doesn't support sub-state jurisdictions.

### Implementation Plan

#### Subtask 3.1: Add NYC as special jurisdiction
- [ ] Create a separate entry or flag in permit data:
  ```typescript
  // In NY state data, add:
  specialJurisdictions: [{
    name: 'New York City',
    agency: 'NYC DOT - Office of Permit Management',
    website: 'https://www.nyc.gov/html/dot/html/motorist/oversize.shtml',
    phone: '212-839-6540',
    geoBounds: { minLat: 40.49, maxLat: 40.92, minLng: -74.26, maxLng: -73.70 },
    additionalPermitRequired: true,
    additionalFees: {
      oversizeBase: 15000,  // $150 base
      overweightBase: 20000,  // $200 base
    },
    restrictions: [
      'No oversize vehicles on parkways',
      'Height limit 13\'6\" on most bridges',
      'No oversize on FDR Drive, West Side Highway',
      'Restricted hours: no oversize 7-10am, 3-7pm weekdays'
    ]
  }]
  ```

#### Subtask 3.2: Detect if route passes through NYC
- [ ] Check route coordinates against NYC bounding box
- [ ] If route passes through, add NYC permit costs to route total
- [ ] Add warning: "Route passes through NYC - separate NYC DOT permit required"

#### Subtask 3.3: Add similar handling for other metro areas
- [ ] Chicago has specific oversize routing requirements
- [ ] Los Angeles county has additional requirements
- [ ] Document as future enhancement for Phase 5+

### Testing
- [ ] Test: Route through NYC → additional permit warning + cost
- [ ] Test: Route through upstate NY only → no NYC permit
- [ ] Test: Route through NJ to Long Island via NYC → NYC permit required

---

## P4-04: California Missing Continuous Permits & Bridge Analysis

### Problem
`state-permits.ts` lines 206-243: California permit data is missing several critical components:
- Continuous Special Permits (for frequent oversize haulers)
- Lane-count-based fee differentials (two-lane roads cost more)
- Bridge analysis requirements for specific routes
- Separate pricing for loads >16' wide or >16' high

### Root Cause
California has one of the most complex permit systems in the US. The data captured covers basic single-trip permits only.

### Implementation Plan

#### Subtask 4.1: Add continuous permit option
- [ ] Add to CA state data:
  ```typescript
  continuousPermit: {
    available: true,
    annualFee: 9000,  // $90 per year
    maxWidth: 14,
    maxHeight: 15,
    maxLength: 120,
    maxWeight: 110000,
    restrictions: 'Cannot be used on routes requiring bridge analysis'
  }
  ```

#### Subtask 4.2: Add bridge analysis requirements
- [ ] Loads over specific thresholds require Caltrans bridge analysis:
  - Weight > 110,000 lbs on state highways
  - Width > 14' on routes with bridge clearance concerns
- [ ] Add `bridgeAnalysisRequired: boolean` to permit output
- [ ] Cost estimate: $1,000-$2,500 per bridge analysis (takes 2-4 weeks)

#### Subtask 4.3: Add lane-count fee structure
- [ ] Two-lane roads: Higher permit fees (add 25% surcharge)
- [ ] This requires route analysis (which road types are used)
- [ ] For now, add as a flag/warning rather than exact calculation

#### Subtask 4.4: Update CA dimension surcharges
- [ ] Verify width surcharges match current Caltrans fee schedule
- [ ] Add height surcharges for >16' loads
- [ ] Add length surcharges for >100' loads

### Testing
- [ ] Test: Standard oversize in CA → single-trip permit calculated
- [ ] Test: 115,000 lb load in CA → bridge analysis flag
- [ ] Test: 15' wide load in CA → correct surcharges applied

---

## P4-05: Pennsylvania Length Surcharges Missing

### Problem
`state-permits.ts` lines 1646-1654: PA oversize permits show no length surcharges, but PennDOT charges additional fees for loads exceeding certain length thresholds.

### Implementation Plan

#### Subtask 5.1: Research PA length surcharge schedule
- [ ] Check PennDOT permit fee schedule for length surcharges
- [ ] Typical thresholds: 85', 95', 105', 120'

#### Subtask 5.2: Add length surcharges to PA data
- [ ] Add to `oversizePermits.singleTrip.dimensionSurcharges.length`:
  ```typescript
  length: [
    { threshold: 85, fee: 2500 },   // $25
    { threshold: 95, fee: 5000 },   // $50
    { threshold: 105, fee: 10000 }, // $100
    { threshold: 120, fee: 20000 }, // $200 + engineering review
  ]
  ```

### Testing
- [ ] Test: 90' load through PA → $25 length surcharge
- [ ] Test: 110' load through PA → $100 length surcharge

---

## P4-06: New Jersey Restrictions Understated

### Problem
`state-permits.ts` lines 1310-1318: NJ is described as having a single escort at 10.5' width, but the actual restrictions are far more complex:
- NJ Turnpike and Garden State Parkway prohibit most oversize loads entirely
- Bridge weight limits vary dramatically (some as low as 40,000 lbs)
- Police escort requirements at lower thresholds than listed
- Route-specific restrictions not captured

### Implementation Plan

#### Subtask 6.1: Add route restriction data
- [ ] Add to NJ state data:
  ```typescript
  routeRestrictions: [
    { route: 'NJ Turnpike', maxWidth: 8.5, maxHeight: 13.5, note: 'No oversize permits issued' },
    { route: 'Garden State Parkway', maxWidth: 8.5, maxHeight: 13.5, note: 'No commercial vehicles' },
    { route: 'Atlantic City Expressway', maxWidth: 12, maxHeight: 14, note: 'Permits available with restrictions' },
  ]
  ```

#### Subtask 6.2: Add bridge weight warnings
- [ ] Flag that NJ has numerous bridge restrictions below state GVW
- [ ] Add warning: "NJ requires individual bridge analysis for loads over 80,000 lbs"

#### Subtask 6.3: Update escort thresholds
- [ ] Verify police escort requirements with NJ DOT
- [ ] Update width/height thresholds if different from current data

### Testing
- [ ] Test: Route on NJ Turnpike with oversize → warning generated
- [ ] Test: Route on NJ local roads with oversize → permit calculated normally

---

## P4-07: Georgia Dimension Surcharges Missing

### Problem
`state-permits.ts` lines 430-470: GA oversize permits show no dimension surcharges, but GDOT typically charges surcharges for widths over 12' and 14'.

### Implementation Plan

#### Subtask 7.1: Research GA surcharge schedule
- [ ] Check GDOT permit fee schedule
- [ ] Add width and height surcharges

#### Subtask 7.2: Update GA data
- [ ] Add surcharges to `oversizePermits.singleTrip.dimensionSurcharges`

### Testing
- [ ] Test: 13' wide load through GA → width surcharge applied

---

## P4-08: Illinois Police Escort Fee Too Low

### Problem
`state-permits.ts` line 590: IL police escort fee listed as $250. Current IDOT rates are typically $300-$400+.

### Implementation Plan

#### Subtask 8.1: Verify current IL escort rates
- [ ] Check IDOT website or contact for current escort fee schedule
- [ ] Update `policeEscort` fee in IL state data

### Testing
- [ ] Test: Wide load through IL requiring police → updated fee reflected

---

## P4-09: 13 States Missing Per-Axle Weight Breakdowns

### Problem
Multiple states in `state-permits.ts` only specify gross weight limits without per-axle breakdowns (single, tandem, tridem). This prevents accurate axle weight validation.

**States missing per-axle data:** CO, CT, DE, GA, IA, IL, IN, KY, LA, ME, and potentially others.

### Implementation Plan

#### Subtask 9.1: Research per-axle limits for missing states
- [ ] For each state, look up:
  - Single axle limit
  - Tandem axle limit (specify spacing requirement)
  - Tridem axle limit (if applicable)
- [ ] Most states follow federal defaults (20k/34k/42k) but some differ

#### Subtask 9.2: Add federal defaults as fallback
- [ ] When state-specific data is unavailable, use federal limits:
  ```typescript
  maxWeight: {
    gross: 80000,
    single: 20000,      // federal default
    tandem: 34000,      // federal default
    tridem: 42000,      // federal default (spacing-dependent)
  }
  ```

#### Subtask 9.3: Update states with known differences
- [ ] FL: single 22,000, tandem 44,000 (more permissive)
- [ ] MI: very complex axle weight system (heaviest state)
- [ ] Add per-state overrides where they differ from federal

### Testing
- [ ] Test: All 50 states return per-axle limits (either specific or federal default)
- [ ] Test: FL correctly shows 22,000/44,000 (not federal defaults)

---

## P4-10: Cumulative vs Tiered Surcharges Ambiguous

### Problem
`permit-calculator.ts` lines 124-144: All dimension surcharges are applied cumulatively (a 15' wide load pays both the 12' surcharge and the 14' surcharge). Some states use tiered pricing where only the highest applicable bracket is charged.

### Implementation Plan

#### Subtask 10.1: Add surcharge model metadata
- [ ] Add `surchargeModel: 'cumulative' | 'tiered'` to each state's oversize permit data
- [ ] Default to `'cumulative'` when unclear (more conservative / higher estimate)

#### Subtask 10.2: Update calculation logic
- [ ] In `calculateDetailedStatePermit()`:
  ```typescript
  if (surchargeModel === 'cumulative') {
    // Apply all applicable surcharges (current behavior)
    for (const s of surcharges) if (dimension >= s.threshold) fee += s.fee
  } else {
    // Apply only highest applicable surcharge
    const applicable = surcharges.filter(s => dimension >= s.threshold)
    if (applicable.length > 0) fee += applicable[applicable.length - 1].fee
  }
  ```

#### Subtask 10.3: Research and classify states
- [ ] Classify at least the top 20 states by freight volume
- [ ] Document which model each uses

### Testing
- [ ] Test: Cumulative state, 15' wide, thresholds at 12' ($10) and 14' ($25) → total $35
- [ ] Test: Tiered state, same scenario → total $25 (highest bracket only)

---

## Phase 4 Completion Checklist

- [ ] All 10 issues addressed
- [ ] All 50 states + DC have complete permit data (including per-axle limits)
- [ ] Alaska and Hawaii detected correctly
- [ ] NYC special jurisdiction handled
- [ ] California permit complexity improved
- [ ] No data entry errors in length/weight limits
- [ ] Surcharge calculation model documented per state
