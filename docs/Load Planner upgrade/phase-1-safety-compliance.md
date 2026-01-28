# Phase 1: Safety & DOT Compliance Fixes

> **Priority:** CRITICAL - All 9 issues in this phase can cause DOT violations, incorrect safety calculations, or application crashes.
> **Files Affected:** 7 files across `src/lib/load-planner/`

---

## P1-01: Dollar vs Cents Unit Mismatch in Escort Costs

### Problem
Two files define escort cost constants in different units:
- `escort-calculator.ts` lines 21-24: Uses **dollars** (`ESCORT_COST_PER_DAY = 800`)
- `permit-calculator.ts` lines 27-29: Uses **cents** (`ESCORT_COST_PER_DAY = 80000`)

If both modules contribute to the same route cost, escort costs could be **100x too low or 100x too high** depending on which module's output is used downstream.

### Root Cause
No shared constants file for cost values. Each module defined its own independently.

### Implementation Plan

#### Subtask 1.1: Audit all cost constant definitions
- [ ] Search all files in `src/lib/load-planner/` for `ESCORT_COST`, `POLE_CAR_COST`, `POLICE_ESCORT`
- [ ] Document which unit each file uses (dollars vs cents)
- [ ] Identify all consumers of these constants

#### Subtask 1.2: Standardize to cents
- [ ] Create shared constants in `types.ts` or a new `constants.ts`:
  ```typescript
  export const ESCORT_COSTS = {
    PILOT_CAR_PER_DAY_CENTS: 80_000,      // $800/day
    POLE_CAR_PER_DAY_CENTS: 100_000,       // $1,000/day
    POLICE_ESCORT_PER_HOUR_CENTS: 10_000,  // $100/hour
  } as const
  ```
- [ ] Update `escort-calculator.ts` to import from shared constants
- [ ] Update `permit-calculator.ts` to import from shared constants
- [ ] Update `cost-optimizer.ts` if it has its own definitions

#### Subtask 1.3: Add unit annotations
- [ ] Add `_CENTS` suffix to all monetary variable names throughout the module
- [ ] Add JSDoc comments specifying units on all monetary fields

#### Subtask 1.4: Verify downstream consumers
- [ ] Check `load-planner.ts` where escort costs feed into `PlannedLoad.costBreakdown`
- [ ] Check `loadPlannerQuotes.ts` where costs are saved to database (database uses cents)
- [ ] Check UI components that display escort costs (verify division by 100 for display)

### Testing
- [ ] Create test: escort cost for 1-day route = $800 (80,000 cents)
- [ ] Create test: permit + escort combined cost outputs consistent units
- [ ] Verify database stores cents, UI displays dollars

---

## P1-02: Hotshot Tractor Weight Uses Semi Weight

### Problem
`LEGAL_LIMITS.TRACTOR_WEIGHT = 17,000` is applied universally to all truck types, including hotshots which use pickup trucks weighing 8,000-10,000 lbs. This overstates hotshot GVW by ~7,000-9,000 lbs.

**Example:**
- Hotshot with 16,500 lbs cargo + 7,000 lb trailer tare
- Current calc: 16,500 + 7,000 + 17,000 = 40,500 lbs (appears near half the legal limit)
- Correct calc: 16,500 + 7,000 + 9,000 = 32,500 lbs (well within limits)

### Root Cause
Single `TRACTOR_WEIGHT` constant used for all truck types. Hotshots, medium-duty trucks, and Class 8 tractors have different weights.

### Implementation Plan

#### Subtask 2.1: Add power unit weight to TruckType interface
- [ ] Add `powerUnitWeight` field to `TruckType` in `types.ts`:
  ```typescript
  interface TruckType {
    // ... existing fields
    powerUnitWeight: number  // Weight of tractor/pickup pulling this trailer (lbs)
  }
  ```

#### Subtask 2.2: Set per-truck power unit weights in trucks.ts
- [ ] Hotshot trailers: `powerUnitWeight: 9000` (heavy-duty pickup, ~F-350/Ram 3500)
- [ ] Standard semi trailers: `powerUnitWeight: 17000` (Class 8 day cab)
- [ ] Heavy haul trailers: `powerUnitWeight: 20000` (Class 8 with heavy-duty options)
- [ ] SPMT: `powerUnitWeight: 0` (self-propelled, no separate tractor)

#### Subtask 2.3: Update all GVW calculations
- [ ] `load-planner.ts` line 316: Replace `LEGAL_LIMITS.TRACTOR_WEIGHT` with `truck.powerUnitWeight`
- [ ] `truck-selector.ts`: Same replacement in scoring function
- [ ] `weight-distribution.ts`: Use truck-specific tractor weight
- [ ] `cost-optimizer.ts`: Update weight calculations

#### Subtask 2.4: Update LEGAL_LIMITS constant
- [ ] Keep `TRACTOR_WEIGHT: 17000` as default/fallback
- [ ] Add comment: "Default for Class 8. Use truck.powerUnitWeight when available."

### Testing
- [ ] Test: Hotshot 40' with 16,000 lbs cargo should show GVW ~32,000 (not 40,000)
- [ ] Test: Flatbed 48' with 45,000 lbs cargo should show GVW ~77,000 (unchanged)
- [ ] Test: SPMT with 500,000 lbs should use powerUnitWeight: 0
- [ ] Verify truck recommendations change for borderline hotshot loads

---

## P1-03: Fallback Placement at (0,0) Creates Overlapping Cargo

### Problem
`load-planner.ts` lines 154-161: When the bin-packing algorithm can't find a valid position for an item, it silently places it at coordinates (0,0) regardless of whether that space is already occupied. This creates physically impossible overlapping cargo configurations.

### Root Cause
Defensive fallback was added to prevent crashes, but it masks a real problem (item doesn't fit) with a worse problem (overlapping items shown as valid).

### Implementation Plan

#### Subtask 3.1: Replace fallback with explicit failure handling
- [x] In `calculatePlacements()`, when `findBestPlacement()` returns null:
  ```typescript
  if (placement) {
    placements.push(placement)
    // ... add to occupied areas
  } else {
    // Item could not be placed - add to warnings
    placements.push({
      itemId: item.id,
      x: -1,  // sentinel value indicating failed placement
      z: -1,
      rotated: false,
      failed: true  // new field
    })
  }
  ```

#### Subtask 3.2: Add `failed` field to ItemPlacement interface
- [x] Update `ItemPlacement` interface to include `failed?: boolean`
- [x] Update `ItemPlacement3D` similarly

#### Subtask 3.3: Propagate placement failures to warnings
- [x] In `planLoads()`, after placement calculation, check for failed placements
- [x] Add warning: `"Item '{description}' could not be placed on deck — manual arrangement required"`
- [x] Include failed items in `PlannedLoad.warnings`

#### Subtask 3.4: Update visualization components
- [x] `LoadPlanVisualizer`: Show failed-placement items in red/warning color with "Not placed" badge
- [x] `TrailerDiagram`: Display "!" icon and red hatched pattern for items without valid placement
- [x] Label: "NOT PLACED" / "Manual arrangement needed" shown on failed items in diagrams

### Testing
- [ ] Test: Load 3 items that collectively exceed deck area - third should show as failed
- [ ] Test: Failed placement generates warning message
- [ ] Test: Visualization shows failed items distinctly
- [ ] Test: Weight calculations still include failed items (they're on the truck, just not positioned)

---

## P1-04: Drive Axle Weight Can Go Negative

### Problem
`weight-distribution.ts` lines 71-77: The calculation subtracts steer axle weight from drive axle weight AFTER computing moment-based distribution. When cargo is positioned far toward the rear of the trailer, `trailerAxleWeight` can exceed total cargo weight, making `driveAxleWeight` negative. Then subtracting steer weight makes it even more negative.

```typescript
const driveAxleWeight = tractorWeight + trailerTareWeight + totalCargoWeight - trailerAxleWeight
const steerAxleWeight = tractorWeight * steerAxleRatio  // 0.33
const adjustedDriveAxle = driveAxleWeight - steerAxleWeight  // Can go negative!
```

### Root Cause
Steer axle is modeled as a fixed ratio of tractor weight, but applied as a subtraction from an already-distributed total. The moment calculation doesn't account for the three-point support model (steer, drive, trailer axles).

### Implementation Plan

#### Subtask 4.1: Implement proper 3-axle static beam model
- [ ] Model the truck-trailer as a beam supported at 3 points:
  - Point A: Steer axle (front of tractor)
  - Point B: Drive axles (rear of tractor / fifth wheel area)
  - Point C: Trailer axles (rear of trailer)
- [ ] Use static equilibrium equations:
  ```
  Sum of forces: Ra + Rb + Rc = Total Weight
  Sum of moments about A: Rb*d_AB + Rc*d_AC = W_tractor*cg_tractor + W_trailer*cg_trailer + W_cargo*cg_cargo
  Sum of moments about B: Ra*d_AB - Rc*(d_AC - d_AB) = ... (second equation)
  ```

#### Subtask 4.2: Define axle positions per truck type
- [ ] Add to `TruckType` or create lookup:
  ```typescript
  axlePositions: {
    steerToKingpin: number,    // feet from steer axle to fifth wheel
    kingpinToTrailerAxle: number,  // feet from kingpin to trailer axle center
  }
  ```
- [ ] Typical values: steerToKingpin ~18-20', kingpinToTrailerAxle ~36-40'

#### Subtask 4.3: Add bounds checking
- [ ] Clamp all axle weights to minimum 0: `Math.max(0, calculatedWeight)`
- [ ] Add warning if any axle weight is < 5% of total (indicates severe imbalance)
- [ ] Add warning if steer axle drops below 10,000 lbs (steering safety issue)

#### Subtask 4.4: Update balance scoring
- [ ] Score should penalize configurations where axle weights approach 0
- [ ] Add "steering safety" warning when steer axle is underloaded

### Testing
- [ ] Test: 45,000 lb load centered on trailer - all axle weights positive and sum to GVW
- [ ] Test: 45,000 lb load at extreme rear - should warn about front axle underload
- [ ] Test: 45,000 lb load at extreme front - should warn about trailer axle underload
- [ ] Test: Sum of all axle weights always equals GVW (conservation check)

### DOT Reference
- FMVSS 393.100-108 (cargo securement and weight distribution)
- Federal Bridge Formula B (23 CFR 658.17)

---

## P1-05: Tridem Axle Limit Formula Wrong

### Problem
`weight-distribution.ts` lines 161-162: Uses 8,000 lbs per additional axle beyond 3 (tridem). The correct federal DOT value is approximately 5,500 lbs per additional axle.

```typescript
trailerAxleLimit = AXLE_LIMITS.TRIDEM_AXLE + (numTrailerAxles - 3) * 8000
```

### Root Cause
Incorrect constant used. The 8,000 figure may have been confused with the per-axle limit difference between single (20k) and tandem (34k) which is ~7,000 per axle.

### Implementation Plan

#### Subtask 5.1: Research correct per-axle weight increments
- [ ] Verify federal limits:
  - Single axle: 20,000 lbs
  - Tandem (2 axles, 40-96" spacing): 34,000 lbs
  - Tridem (3 axles): ~42,000-49,000 lbs (varies by spacing)
  - Quad (4 axles): varies by configuration
- [ ] Document source: 23 CFR 658.17 and FHWA Bridge Formula

#### Subtask 5.2: Update axle limit constants
- [ ] Define proper limits in `types.ts` or `weight-distribution.ts`:
  ```typescript
  const AXLE_LIMITS = {
    SINGLE: 20_000,
    TANDEM: 34_000,
    TRIDEM: 42_000,
    QUAD: 50_000,      // approximate, spacing-dependent
    PER_ADDITIONAL: 5_500,  // corrected from 8,000
  }
  ```

#### Subtask 5.3: Implement Bridge Formula B for accuracy
- [ ] The actual legal limit depends on axle spacing:
  ```
  W = 500 * (LN/(N-1) + 12N + 36)
  Where: W = max weight in lbs, L = distance between outer axles (ft), N = number of axles
  ```
- [ ] This is the authoritative federal formula for multi-axle groups

#### Subtask 5.4: Update validation logic
- [ ] Use Bridge Formula when axle spacing data is available
- [ ] Fall back to conservative fixed limits when spacing unknown

### Testing
- [ ] Test: 3-axle trailer with 42' spacing should allow ~42,000 lbs (not 49,000+)
- [ ] Test: 4-axle trailer should allow ~50,000 lbs (not 50,000 + 8,000 = 58,000)
- [ ] Test: Bridge Formula calculation matches FHWA calculator for known configurations

### DOT Reference
- 23 CFR 658.17 - Federal Bridge Formula B
- FHWA Bridge Formula Weights Calculator

---

## P1-06: WLL Not Adjusted for Tie-Down Angle

### Problem
`securement-planner.ts` lines 251-252: Working Load Limit (WLL) of tie-downs is used at face value without adjusting for the angle of the tie-down relative to the cargo. DOT 49 CFR 393.106 requires that the effective restraint force accounts for the angle.

**Example:**
- Chain rated at 5,400 lbs WLL
- Applied at 45-degree angle
- Effective horizontal restraint: 5,400 × cos(45°) = 3,818 lbs
- Effective vertical restraint: 5,400 × sin(45°) = 3,818 lbs
- Current code treats it as 5,400 lbs in all directions

### Root Cause
Simplified tie-down model that doesn't track application angle.

### Implementation Plan

#### Subtask 6.1: Add angle to tie-down data model
- [ ] Update tie-down interface:
  ```typescript
  interface TieDown {
    type: 'chain' | 'strap' | 'binder'
    wll: number           // rated WLL in lbs
    angle: number          // angle from horizontal in degrees (0-90)
    effectiveWLL: number   // wll * cos(angle) for horizontal restraint
  }
  ```

#### Subtask 6.2: Calculate effective WLL
- [ ] When generating tie-down positions:
  ```typescript
  const angleRad = (tieDown.angle * Math.PI) / 180
  tieDown.effectiveWLL = tieDown.wll * Math.cos(angleRad)
  ```
- [ ] Default angle: 45 degrees (typical for over-the-top securement)
- [ ] Direct attachment: 0 degrees (horizontal)

#### Subtask 6.3: Update compliance check
- [ ] Total effective restraint must meet DOT minimums:
  - Forward: 80% of cargo weight
  - Rearward: 50% of cargo weight
  - Lateral: 50% of cargo weight (each side)
- [ ] Use `effectiveWLL` (not raw WLL) in all compliance calculations
- [ ] Recalculate number of tie-downs needed based on reduced effective WLL

#### Subtask 6.4: Update securement plan output
- [ ] Show both rated WLL and effective WLL in securement plan
- [ ] If angle reduces effectiveness significantly, suggest more direct attachment methods

### Testing
- [ ] Test: 10,000 lb item with 4 chains at 45° → effective forward restraint = 4 × 5,400 × cos(45°) = 15,273 lbs (meets 80% = 8,000 lbs)
- [ ] Test: Same setup at 60° → effective = 4 × 5,400 × cos(60°) = 10,800 lbs (still meets)
- [ ] Test: Marginal case where angle adjustment causes non-compliance → plan should recommend additional tie-downs

### DOT Reference
- 49 CFR 393.106 - General requirements for cargo securement
- 49 CFR 393.110 - Methods of securement (aggregate WLL requirements)

---

## P1-07: HOS 70-Hour/8-Day Cycle Not Enforced

### Problem
`hos-validator.ts` lines 201-230: The validator checks whether a single trip can be completed within daily drive time limits (11 hours drive, 14 hours on-duty) but does not enforce the DOT 70-hour/8-day cumulative cycle limit. A driver with only 10 hours remaining on their cycle would be unable to complete a 15-hour trip even with rest breaks.

### Root Cause
HOS implementation focused on single-trip feasibility without tracking cumulative cycle hours.

### Implementation Plan

#### Subtask 7.1: Add cycle tracking to HOS model
- [ ] Add to `HOSStatus` interface:
  ```typescript
  interface HOSStatus {
    // existing fields...
    cycleHoursUsed: number     // hours used in current 8-day cycle
    cycleHoursRemaining: number // 70 - cycleHoursUsed
    cycleDaysRemaining: number  // days until oldest day rolls off
    lastResetDate?: string      // date of last 34-hour restart
  }
  ```

#### Subtask 7.2: Validate trip against cycle
- [ ] Before approving trip:
  ```typescript
  const totalDutyHoursNeeded = calculateTotalDutyHours(trip)
  if (totalDutyHoursNeeded > hosStatus.cycleHoursRemaining) {
    violations.push({
      type: 'CYCLE_VIOLATION',
      message: `Trip requires ${totalDutyHoursNeeded}h on-duty but only ${hosStatus.cycleHoursRemaining}h remain in 70-hour cycle`,
      suggestion: '34-hour restart required before this trip'
    })
  }
  ```

#### Subtask 7.3: Add 34-hour restart logic
- [ ] If cycle violation detected, calculate when restart would be available
- [ ] Factor restart into delivery date estimates

#### Subtask 7.4: Default cycle status for new trips
- [ ] When no driver cycle data available, assume fresh (70 hours available)
- [ ] Add input field for "driver hours available" in trip planning UI

### Testing
- [ ] Test: Fresh driver (70h available) on 20h trip → approved with 1 mandatory rest
- [ ] Test: Driver with 8h remaining on 12h trip → cycle violation, suggest restart
- [ ] Test: Multi-day trip correctly accumulates duty hours across days

### DOT Reference
- 49 CFR 395.3 - Maximum driving time for property-carrying vehicles
- 70-hour/8-day rule (or 60-hour/7-day for non-daily carriers)

---

## P1-08: Grid Boundary Overflow in Stacking Engine

### Problem
`stacking-engine.ts` lines 115-118: When calculating grid cell indices for item placement, `Math.ceil()` can produce an index that exceeds the array bounds.

```typescript
const endX = Math.min(gridLength - 1, Math.ceil((placement.x + itemLength) / GRID_RESOLUTION))
```

When an item's far edge exactly aligns with the deck end (e.g., 48.0' on a 48' deck), `Math.ceil(48.0 / 0.5) = 96`, but the grid array has indices 0-95 (96 cells). The `Math.min` should catch this, but if `GRID_RESOLUTION` doesn't divide evenly into deck length, edge cases can still overflow.

### Root Cause
Mixing `Math.ceil` and `Math.floor` for different bounds without consistent clamping.

### Implementation Plan

#### Subtask 8.1: Fix boundary calculations
- [ ] Use consistent clamping for all grid index calculations:
  ```typescript
  const startX = Math.max(0, Math.floor(placement.x / GRID_RESOLUTION))
  const endX = Math.min(gridLength - 1, Math.floor((placement.x + itemLength) / GRID_RESOLUTION))
  const startZ = Math.max(0, Math.floor(placement.z / GRID_RESOLUTION))
  const endZ = Math.min(gridWidth - 1, Math.floor((placement.z + itemWidth) / GRID_RESOLUTION))
  ```

#### Subtask 8.2: Add bounds assertion
- [ ] Add runtime check:
  ```typescript
  if (endX >= gridLength || endZ >= gridWidth) {
    console.warn(`Grid overflow: endX=${endX} >= gridLength=${gridLength}`)
    return // skip this placement
  }
  ```

#### Subtask 8.3: Add unit test for edge-aligned items
- [ ] Test: Item placed at x=0, length=48 on 48' deck → must not overflow
- [ ] Test: Item placed at x=47.5, length=0.5 on 48' deck → endX should be 95 (last cell)

### Testing
- [ ] Test: Place item at exact deck boundary - no crash
- [ ] Test: Place item 0.1' from deck end - correct grid cells marked
- [ ] Test: Full deck coverage with multiple items - no overlap or overflow

---

## P1-09: Dry Van 53' maxLegalCargoHeight Wrong

### Problem
`trucks.ts` line 633: Dry Van 53' has `maxLegalCargoHeight: 9.0` but the formula `13.5 - deckHeight` gives `13.5 - 4.0 = 9.5`. The value should be 9.5 ft.

### Root Cause
Manual data entry error. All other 53+ truck types have correct formula results.

### Implementation Plan

#### Subtask 9.1: Fix the value
- [ ] Change `maxLegalCargoHeight: 9.0` to `maxLegalCargoHeight: 9.5` on line 633

#### Subtask 9.2: Add validation script
- [ ] Create a one-time verification script that checks all trucks:
  ```typescript
  for (const truck of trucks) {
    const expected = 13.5 - truck.deckHeight
    if (Math.abs(truck.maxLegalCargoHeight - expected) > 0.1) {
      console.error(`${truck.id}: maxLegalCargoHeight ${truck.maxLegalCargoHeight} != 13.5 - ${truck.deckHeight} = ${expected}`)
    }
  }
  ```
- [ ] Run against all 54 truck types
- [ ] Exclude tanker types which use non-standard height model

#### Subtask 9.3: Consider computing maxLegalCargoHeight
- [ ] Instead of storing, compute: `get maxLegalCargoHeight() { return 13.5 - this.deckHeight }`
- [ ] This eliminates future data entry errors
- [ ] Evaluate: does any truck legitimately need a different max cargo height? (tankers do)

### Testing
- [ ] Test: Dry Van 53' with 9.4' cargo → should be legal (under 9.5')
- [ ] Test: All truck types pass formula validation (except tankers)
- [ ] Test: Truck recommendation for 9.2' tall cargo includes Dry Van 53' as option

---

## Phase 1 Completion Checklist

- [ ] All 9 issues fixed
- [ ] All unit tests pass
- [ ] Manual smoke test: Plan a load with hotshot, verify GVW
- [ ] Manual smoke test: Plan oversize load, verify escort costs consistent
- [ ] Manual smoke test: Heavy load on multi-axle, verify axle weights positive and sum correctly
- [ ] Manual smoke test: Stacking with fragile items, no grid overflow
- [ ] Code review completed
