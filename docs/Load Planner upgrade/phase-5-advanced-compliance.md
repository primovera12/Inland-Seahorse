# Phase 5: Advanced Compliance & Integration

> **Priority:** HIGH to MEDIUM - These are feature-level enhancements that improve DOT compliance accuracy and module coordination.
> **Files Affected:** Multiple new and existing modules

---

## P5-01: Add Bridge Formula B Validation

### Problem
Federal Bridge Formula B (23 CFR 658.17) governs the maximum weight allowed on any group of consecutive axles based on the number of axles and the distance between the first and last axle. Currently, the system only checks gross weight (80,000 lbs) and individual axle limits. Heavy loads that pass both checks can still violate Bridge Formula.

**Formula:** `W = 500 × ((LN / (N-1)) + 12N + 36)`
- W = maximum weight in pounds
- L = distance in feet between outer axles of the group
- N = number of axles in the group

**Example:** A 5-axle group spaced over 40 feet:
- W = 500 × ((40×5)/(5-1) + 12×5 + 36) = 500 × (50 + 60 + 36) = 73,000 lbs
- Even though tandem+tridem individual limits allow 34k+42k = 76,000 lbs, bridge formula caps at 73,000 lbs

### Implementation Plan

#### Subtask 1.1: Create bridge-formula.ts module
- [ ] New file: `src/lib/load-planner/bridge-formula.ts`
- [ ] Implement Bridge Formula B calculation:
  ```typescript
  export function calculateBridgeFormulaLimit(
    axleCount: number,
    outerAxleSpacing: number  // feet between first and last axle
  ): number {
    const N = axleCount
    const L = outerAxleSpacing
    return 500 * ((L * N / (N - 1)) + 12 * N + 36)
  }
  ```

#### Subtask 1.2: Add axle spacing data to truck types
- [ ] Add to `TruckType` interface:
  ```typescript
  axleConfiguration?: {
    tractorAxles: number        // typically 2 (steer + drive tandem = 3 axles)
    trailerAxles: number        // 2 (tandem), 3 (tridem), or more
    overallSpacing: number      // feet from steer to last trailer axle
    driveToTrailerSpacing: number  // feet from drive to trailer axle group
  }
  ```
- [ ] Populate for each truck type (typical values available from manufacturer specs)

#### Subtask 1.3: Integrate into weight validation
- [ ] In `weight-distribution.ts`, after calculating axle weights:
  ```typescript
  const bridgeLimit = calculateBridgeFormulaLimit(totalAxles, overallSpacing)
  if (grossWeight > bridgeLimit) {
    warnings.push(`Gross weight ${grossWeight} lbs exceeds Bridge Formula limit of ${bridgeLimit} lbs for ${totalAxles}-axle configuration`)
  }
  ```

#### Subtask 1.4: Add to truck scoring
- [ ] Penalize truck configurations that violate bridge formula
- [ ] Suggest adding axles (tridem vs tandem) when bridge formula is the binding constraint

### Testing
- [ ] Test: Standard 5-axle semi, 80,000 lbs, 51' spacing → bridge limit ~80,000 (passes)
- [ ] Test: Short-wheelbase 5-axle, 80,000 lbs, 36' spacing → bridge limit ~73,280 (fails)
- [ ] Test: 7-axle configuration with 150,000 lbs → calculate correct limit
- [ ] Verify against FHWA bridge formula calculator for known configurations

### DOT Reference
- 23 CFR 658.17 - Bridge Formula Weights
- FHWA Bridge Formula Weights Calculator

---

## P5-02: Add KPRA Validation (CA/OR/WA)

### Problem
Several western states enforce Kingpin-to-Rear-Axle (KPRA) distance limits. California's limit is 40 feet. A 53' trailer with cargo improperly loaded can violate KPRA even if all weight and dimension limits are met.

**KPRA:** Distance from the kingpin (fifth wheel connection) to the center of the rearmost trailer axle group.

**Why it matters:** Longer KPRA distances create wider turning radii and increase bridge stress. CA strictly enforces 40' KPRA — trailers exceeding this are fined and turned away at weigh stations.

### Implementation Plan

#### Subtask 2.1: Add KPRA limits to state data
- [ ] Add to applicable states in `state-permits.ts`:
  ```typescript
  kpraLimit: {
    maxDistance: 40,  // feet (CA)
    enforced: true,
    notes: 'Strictly enforced at weigh stations. 48\' trailers compliant; many 53\' trailers non-compliant.'
  }
  ```
- [ ] States with KPRA limits: CA (40'), OR (varies), WA (varies)

#### Subtask 2.2: Add KPRA data to truck types
- [ ] Add `kpraDistance` to `TruckType`:
  ```typescript
  kpraDistance?: number  // feet from kingpin to rear axle center
  ```
- [ ] Typical values:
  - 48' flatbed: ~38' (compliant in CA)
  - 53' flatbed: ~43' (NON-COMPLIANT in CA without sliding tandems)
  - 53' with tandems slid forward: ~40' (compliant but reduces rear overhang)

#### Subtask 2.3: Integrate into route validation
- [ ] When route includes CA/OR/WA:
  ```typescript
  if (stateHasKPRA && truck.kpraDistance > state.kpraLimit.maxDistance) {
    warnings.push(`${truck.name} KPRA distance (${truck.kpraDistance}') exceeds ${state.stateName} limit of ${state.kpraLimit.maxDistance}'`)
    suggestions.push('Use 48\' trailer or slide tandems forward on 53\' trailer')
  }
  ```

#### Subtask 2.4: Factor into truck scoring
- [ ] Penalize 53' trailers when route includes KPRA states
- [ ] Boost 48' trailers for CA/OR/WA routes

### Testing
- [ ] Test: 48' flatbed through CA → no KPRA warning
- [ ] Test: 53' flatbed through CA → KPRA warning with suggestion
- [ ] Test: 53' flatbed through TX (no KPRA) → no warning
- [ ] Test: Truck scoring prefers 48' for CA routes

---

## P5-03: Coordinate Escort Speed with HOS Speed

### Problem
`escort-calculator.ts` uses a hardcoded 45 mph speed for trip duration calculations. `hos-validator.ts` has its own speed constant. When escort requirements exist (meaning the load IS oversize), the actual speed should be lower. These modules don't share speed assumptions, leading to inconsistent time/cost estimates.

### Implementation Plan

#### Subtask 3.1: Create shared speed function
- [ ] In a shared utility or `types.ts`:
  ```typescript
  export function getEffectiveSpeed(cargo: CargoSpecs): number {
    if (cargo.width >= 16 || cargo.height >= 16 || cargo.grossWeight >= 200000) return 30
    if (cargo.width >= 12 || cargo.height >= 15) return 35
    if (cargo.width >= 10 || cargo.height >= 14) return 40
    if (cargo.width > 8.5 || cargo.height > 13.5) return 45
    return 55  // legal load
  }
  ```

#### Subtask 3.2: Update escort-calculator.ts
- [ ] Replace hardcoded 45 mph with `getEffectiveSpeed(cargo)`
- [ ] Recalculate escort days based on accurate speed

#### Subtask 3.3: Update hos-validator.ts
- [ ] Replace `OVERSIZE_AVG_SPEED: 45` with call to `getEffectiveSpeed(cargo)`
- [ ] This also addresses P2-04 (oversize speed too high)

#### Subtask 3.4: Update cost-optimizer.ts
- [ ] Use same speed function for any duration-based cost calculations

### Testing
- [ ] Test: Same cargo → same speed assumption in escort calc, HOS, and cost optimizer
- [ ] Test: 14' wide load → 35 mph in all modules
- [ ] Test: Legal load → 55 mph in all modules

---

## P5-04: Wire Seasonal Restrictions into Cost Optimizer

### Problem
`seasonal-restrictions.ts` defines spring thaw weight reductions for many northern states. However, `cost-optimizer.ts` doesn't check seasonal restrictions. A truck could be recommended that exceeds seasonal weight limits, and the cost estimate won't include the additional costs of seasonal compliance (reduced load = more trucks, or routing around restricted states).

### Implementation Plan

#### Subtask 4.1: Import seasonal checks into cost optimizer
- [ ] In `calculateTruckCost()`:
  ```typescript
  import { hasSeasonalRestrictions, calculateAdjustedWeightLimits } from './seasonal-restrictions'

  if (hasSeasonalRestrictions(state, currentDate)) {
    const adjusted = calculateAdjustedWeightLimits(state, currentDate)
    if (grossWeight > adjusted.maxGross) {
      costs.seasonalPenalty += additionalTruckCost  // may need extra truck
      warnings.push(`Seasonal weight restrictions in ${state} reduce GVW to ${adjusted.maxGross} lbs`)
    }
  }
  ```

#### Subtask 4.2: Add seasonal impact to truck scoring
- [ ] If load is planned during spring thaw season:
  - Reduce effective capacity of trucks for affected states
  - May recommend additional trucks or alternative routing

#### Subtask 4.3: Add date awareness
- [ ] Cost estimates should accept an optional `shipDate` parameter
- [ ] Default to current date if not provided

### Testing
- [ ] Test: 78,000 lb load through Minnesota in March (spring thaw) → seasonal warning + reduced capacity
- [ ] Test: Same load in July → no seasonal restriction
- [ ] Test: Cost estimate changes between winter and spring dates

---

## P5-05: Use 3D Placements in Truck Selector

### Problem
The stacking engine (`stacking-engine.ts`) calculates detailed 3D placements including vertical stacking. However, `truck-selector.ts` still uses 2D height analysis (max item height + deck height) without considering that stacked items increase total height.

**Example:** Two 5' tall items stacked on a 5' flatbed:
- 2D analysis: total height = 5 + 5 = 10' (legal)
- 3D reality: total height = 5 + 5 + 5 = 15' (needs permit!)

### Implementation Plan

#### Subtask 5.1: Calculate effective stack height
- [ ] After 3D placement, determine actual max height:
  ```typescript
  const maxStackHeight = Math.max(...placements3D.map(p => p.y + getItemHeight(p.itemId)))
  const totalHeight = maxStackHeight + truck.deckHeight
  ```

#### Subtask 5.2: Feed stack height into truck scoring
- [ ] Truck selector should use effective stack height (not single-item height) for:
  - Legal limit checks
  - Permit determination
  - Height penalty scoring

#### Subtask 5.3: Add stacking-aware height to PlannedLoad
- [ ] Add `effectiveHeight` field to `PlannedLoad`:
  ```typescript
  effectiveHeight: number  // max(all item positions + heights) - accounts for stacking
  ```

### Testing
- [ ] Test: Two 5' items stacked → effectiveHeight = 10', totalHeight = 15' (flatbed)
- [ ] Test: Same items on lowboy (2' deck) → totalHeight = 12' (legal)
- [ ] Test: Truck selector penalizes stacking that creates oversize

---

## P5-06: Model Step Deck Dual-Deck Heights

### Problem
Step deck trailers have two distinct deck surfaces:
- **Upper deck** (~11' long): Height = 5.0' from ground (same as flatbed)
- **Lower deck** (~37' long): Height = 3.5' from ground

Currently, the system models step decks as a single rectangle at 3.5' deck height. Items placed on the upper deck actually have only 8.5' of legal cargo height (13.5 - 5.0), not 10.0' (13.5 - 3.5).

### Implementation Plan

#### Subtask 6.1: Add deck zones to truck type
- [ ] Extend `TruckType` for multi-zone trailers:
  ```typescript
  deckZones?: {
    name: string          // 'upper' | 'lower' | 'well'
    startX: number        // feet from front of trailer
    endX: number          // feet from front
    deckHeight: number    // ground to deck surface
    maxCargoHeight: number // 13.5 - deckHeight
  }[]
  ```
- [ ] Step deck 48':
  ```typescript
  deckZones: [
    { name: 'upper', startX: 0, endX: 11, deckHeight: 5.0, maxCargoHeight: 8.5 },
    { name: 'lower', startX: 11, endX: 48, deckHeight: 3.5, maxCargoHeight: 10.0 },
  ]
  ```

#### Subtask 6.2: Update placement algorithm
- [ ] When placing items, check cargo height against the zone's maxCargoHeight:
  ```typescript
  const zone = getZoneAtPosition(truck, placement.x)
  if (item.height > zone.maxCargoHeight) {
    // Item too tall for this zone - try other zones
  }
  ```

#### Subtask 6.3: Update height-based permit determination
- [ ] Permit needed only if item on a zone exceeds that zone's legal height
- [ ] Short items can go on upper deck, tall items on lower deck

#### Subtask 6.4: Apply to all multi-zone trailers
- [ ] Step Deck (upper + lower)
- [ ] Double Drop (upper + well + lower)
- [ ] RGN (gooseneck + well)

### Testing
- [ ] Test: 9' tall item on step deck lower deck → legal (9 < 10)
- [ ] Test: 9' tall item on step deck upper deck → oversize (9 > 8.5)
- [ ] Test: Algorithm places 9' item on lower deck automatically
- [ ] Test: 7' item can go on either deck

---

## P5-07: Fix Weight Distribution Optimal Position

### Problem
`weight-distribution.ts` line 205: The suggested optimal cargo position uses 50% of deck length as the balance point. The actual optimal depends on the kingpin-to-rear-axle geometry. For most trailers, the ideal cargo center of gravity is at approximately 40-45% of the deck length from the front (slightly forward of center) to properly distribute between drive axles and trailer axles.

### Implementation Plan

#### Subtask 7.1: Calculate actual balance point
- [ ] The optimal CG position depends on axle locations:
  ```typescript
  // Kingpin is at the front of the trailer
  // Optimal CG splits weight proportionally between drive and trailer axles
  const optimalCGFromFront = truck.kpraDistance * (driveAxleCapacity / (driveAxleCapacity + trailerAxleCapacity))
  ```
- [ ] For standard trailer: ~42-45% from front (not 50%)

#### Subtask 7.2: Use truck-specific geometry when available
- [ ] If `axleConfiguration` data exists (from P5-01), use it
- [ ] Otherwise, use 0.42 as default ratio (better than 0.50)

#### Subtask 7.3: Update suggestion output
- [ ] Show optimal CG position in feet from front of trailer
- [ ] Show current CG position and deviation

### Testing
- [ ] Test: Centered cargo suggestion → ~42% from front (not 50%)
- [ ] Test: Rear-heavy cargo → suggestion to move forward
- [ ] Test: Front-heavy cargo → suggestion to move rearward

---

## Phase 5 Completion Checklist

- [ ] Bridge Formula B validation operational
- [ ] KPRA validation active for CA/OR/WA routes
- [ ] All modules use consistent speed assumptions
- [ ] Seasonal restrictions affect cost estimates
- [ ] 3D stacking height feeds into truck scoring and permit determination
- [ ] Step deck dual-deck zones modeled correctly
- [ ] Weight distribution optimal position uses actual axle geometry
- [ ] All new features have unit tests
- [ ] Integration test: Full plan with oversize cargo through CA → Bridge Formula + KPRA + seasonal + stacking all evaluate correctly
