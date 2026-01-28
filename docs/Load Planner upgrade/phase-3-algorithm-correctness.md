# Phase 3: Algorithm Correctness Fixes

> **Priority:** HIGH - These issues cause incorrect load assignments, packing failures, and inconsistent recommendations.
> **Files Affected:** `load-planner.ts`, `stacking-engine.ts`

---

## P3-01: Quantity Not Factored in Area Check

### Problem
`load-planner.ts` line 517: When checking if items can share a truck, the `usedArea` calculation doesn't account for item quantity. An item with `quantity: 5` is counted as occupying the area of 1 unit instead of 5.

```typescript
usedArea = existingItems.reduce((s, i) => s + (i.length * i.width), 0)
```

**Note:** By the time items reach this function, they should already be expanded by `expandItems()` (each unit has quantity=1). Verify whether `canShareTruck()` is ever called with unexpanded items.

### Root Cause
Potentially a non-issue if `expandItems()` always runs first. However, if any code path calls `canShareTruck()` before expansion, area is underestimated.

### Implementation Plan

#### Subtask 1.1: Trace all call paths to canShareTruck()
- [ ] Map every caller of `canShareTruck()` or equivalent area-check logic
- [ ] Verify that `expandItems()` has always run before area checks
- [ ] Document findings

#### Subtask 1.2: Add defensive quantity multiplication
- [ ] Even if expansion runs first, add safety:
  ```typescript
  usedArea = existingItems.reduce((s, i) => s + (i.length * i.width * (i.quantity || 1)), 0)
  ```
- [ ] This is a no-op when quantity=1 (post-expansion) but catches edge cases

#### Subtask 1.3: Add packing efficiency factor validation
- [ ] Current packing efficiency is 75% (`deck_area * 0.75`)
- [ ] Verify this is applied consistently in all area checks
- [ ] Consider cargo shape: cylindrical items waste more space than boxes

### Testing
- [ ] Test: 5 items of 4'x4' on 48'x8.5' deck (area = 80 of 408 sq ft) → fits
- [ ] Test: 20 items of 4'x4' (area = 320 of 408 sq ft) → fits at 78% utilization
- [ ] Test: 30 items of 4'x4' (area = 480 > 408) → doesn't fit, triggers second truck

---

## P3-02: Rebalancing Assigns Items That Don't Physically Fit

### Problem
`load-planner.ts` line 622: The `rebalanceLoads()` function tries to move the smallest item from a heavily-loaded truck to a lightly-loaded one. It checks `canAddItemToLoad()` with a 95% utilization target, but this function only checks weight capacity and area — it doesn't re-run the 2D placement algorithm to verify the item physically fits in the remaining deck space.

**Example:** A truck might have 30% weight capacity remaining but the only open deck space is a 2'x3' gap. Moving a 6'x4' item there passes the weight/area check but fails physical placement.

### Root Cause
Rebalancing uses a simplified fitness check (weight + area percentage) instead of the full placement algorithm.

### Implementation Plan

#### Subtask 2.1: Add physical fit validation to rebalancing
- [ ] After `canAddItemToLoad()` passes, run `findBestPlacement()` to verify:
  ```typescript
  const testPlacements = calculatePlacements([...targetLoad.items, itemToMove], targetLoad.recommendedTruck)
  const itemPlacement = testPlacements.find(p => p.itemId === itemToMove.id)
  if (!itemPlacement || itemPlacement.failed) {
    continue  // Skip this rebalance - item doesn't fit physically
  }
  ```

#### Subtask 2.2: Recalculate placements after successful rebalance
- [ ] When item is moved, recalculate all placements for both source and target loads
- [ ] Update `PlannedLoad.placements` arrays

#### Subtask 2.3: Add rebalancing success metrics
- [ ] Track how many rebalance attempts succeed vs fail
- [ ] If most fail, the initial assignment is likely already well-optimized

### Testing
- [ ] Test: Move 4'x4' item to truck with 4'x4' gap → succeeds
- [ ] Test: Move 6'x4' item to truck with only 3'x3' gaps → fails, stays on original truck
- [ ] Test: Rebalancing maintains valid placements for all items

---

## P3-03: 100% Utilization Fallback Prevents Rebalancing

### Problem
`load-planner.ts` lines 785-805: The primary assignment loop targets 85% utilization (`TARGET_UTILIZATION`). If no truck has room at 85%, the fallback loop allows up to 100% (`MAX_UTILIZATION`). Items assigned during fallback fill trucks to capacity, leaving zero room for the subsequent rebalancing pass.

### Root Cause
Two-pass approach with different thresholds but rebalancing doesn't account for how items were assigned.

### Implementation Plan

#### Subtask 3.1: Use 95% cap for fallback instead of 100%
- [ ] Change fallback utilization from 100% to 95%:
  ```typescript
  const FALLBACK_UTILIZATION = 0.95  // Leave 5% room for rebalancing
  ```

#### Subtask 3.2: Flag fallback-assigned items
- [ ] Mark items assigned during fallback pass:
  ```typescript
  item._assignedViaFallback = true
  ```
- [ ] Rebalancing can prioritize moving these items

#### Subtask 3.3: Consider new truck instead of 100% pack
- [ ] If no existing truck has room at 95%, create new truck instead of force-packing
- [ ] This may increase truck count but produces better balanced loads

### Testing
- [ ] Test: Items assigned at 85% → rebalancing can adjust
- [ ] Test: Items assigned at 95% fallback → some rebalancing possible
- [ ] Test: No items assigned at exactly 100% → always room for adjustment

---

## P3-04: Inconsistent Truck Scoring Between Item vs Load

### Problem
`load-planner.ts` lines 743 and 821: Two different functions score trucks:
- `findBestTruckForItem()` (line 286): Used when creating initial loads for single items
- `findBestTruckForLoad()` (line 821): Used when recommending truck for multi-item loads

These functions use different scoring logic, weights, and bonuses. The same cargo can receive different truck recommendations depending on whether it's evaluated as a single item or as part of a group.

### Root Cause
Functions evolved independently. `findBestTruckForItem` is simpler; `findBestTruckForLoad` may call `selectTrucks` from `truck-selector.ts` which has the full scoring algorithm.

### Implementation Plan

#### Subtask 4.1: Audit both scoring functions
- [ ] Document all scoring factors in `findBestTruckForItem()`
- [ ] Document all scoring factors in `findBestTruckForLoad()` / `selectTrucks()`
- [ ] Create comparison table showing differences

#### Subtask 4.2: Unify scoring through truck-selector.ts
- [ ] Both functions should delegate to `selectTrucks()` for consistent scoring
- [ ] `findBestTruckForItem()` can wrap a single-item ParsedLoad and call `selectTrucks()`
- [ ] This ensures equipment matching, availability tiers, and seasonal bonuses apply everywhere

#### Subtask 4.3: Verify permit consistency
- [ ] Permits determined during item scoring should match permits after load scoring
- [ ] If truck changes during load optimization, permits must be recalculated

### Testing
- [ ] Test: Single excavator scored alone → same truck as when scored as part of 1-item load
- [ ] Test: Score breakdown shows same factors in both paths
- [ ] Test: Permits consistent regardless of scoring path

---

## P3-05: Fragile Items Blocked from Floor Incorrectly

### Problem
`stacking-engine.ts` lines 268-275: When placing fragile items, the algorithm checks if ANY stackable items exist in the entire trailer. If so, it prevents the fragile item from being placed on the floor (height=0). This is wrong — it should only prevent placement ON TOP OF other items, not prevent floor placement.

```typescript
if (item.fragile && floorHeight === 0 && existingPlacements.length > 0) {
  const hasStackableBelow = existingPlacements.some(p => {
    const i = items.find(it => it.id === p.itemId)
    return i && i.stackable !== false && !i.bottomOnly
  })
  if (hasStackableBelow) continue  // WRONG: skips floor placement
}
```

The intent was likely: "don't stack fragile items on top of other items." But the condition fires when placing ON the floor if other items already exist elsewhere on the deck.

### Root Cause
Logic inverted. Should check items at the candidate position, not all items globally.

### Implementation Plan

#### Subtask 5.1: Fix fragile item placement logic
- [ ] Change check to only consider items directly below the candidate position:
  ```typescript
  if (item.fragile) {
    const itemsBelow = existingPlacements.filter(p =>
      p.y + getItemHeight(p) === candidateY &&  // directly below
      overlapsXZ(p, candidateX, candidateZ, item)  // same footprint area
    )
    if (itemsBelow.length > 0) continue  // Don't stack fragile on others
  }
  ```

#### Subtask 5.2: Allow fragile items on floor
- [ ] Fragile items should always be allowed on the floor (y=0)
- [ ] Only restrict stacking fragile items on top of non-fragile items

#### Subtask 5.3: Add fragile-on-fragile check
- [ ] Two fragile items should never be stacked on each other
- [ ] Add check: if item below is also fragile, skip position

### Testing
- [ ] Test: Fragile item placed first → goes on floor at y=0
- [ ] Test: Fragile item placed after non-fragile → goes on floor, not stacked on top
- [ ] Test: Non-fragile item can be placed on top of non-fragile (stacking works)
- [ ] Test: Nothing placed on top of fragile item (unless fragile item allows stacking via `stackable: true`)

---

## P3-06: Cumulative Stack Weight Not Validated

### Problem
`stacking-engine.ts` lines 251-256: When evaluating a stacking position, only the single item's weight is checked against `maxLoad`. If multiple items are stacked on the same base item, their cumulative weight is not validated.

```typescript
if (itemWeight > cell.maxLoad) {
  canPlace = false
}
```

**Example:** Base item has `maxLoad: 5000`. First stack item weighs 3,000 lbs (passes). Second stack item weighs 3,000 lbs (passes check individually but total 6,000 exceeds 5,000).

### Root Cause
maxLoad check is per-item instead of cumulative.

### Implementation Plan

#### Subtask 6.1: Track cumulative weight per grid cell
- [ ] Add `currentLoad` field to grid cells:
  ```typescript
  interface GridCell {
    maxLoad: number
    currentLoad: number  // weight already on this cell
    height: number
  }
  ```

#### Subtask 6.2: Check cumulative weight
- [ ] Before placing item, check: `cell.currentLoad + itemWeight <= cell.maxLoad`
- [ ] After placing, update: `cell.currentLoad += itemWeight`

#### Subtask 6.3: Distribute item weight across cells
- [ ] Item spanning multiple cells should distribute weight proportionally
- [ ] Weight per cell = total weight / number of cells occupied

### Testing
- [ ] Test: 5,000 lb maxLoad, stack 3,000 + 1,500 → allowed (4,500 < 5,000)
- [ ] Test: 5,000 lb maxLoad, stack 3,000 + 3,000 → rejected (6,000 > 5,000)
- [ ] Test: Heavy item on weak item → rejected even if single item fits

---

## P3-07: Empty Load Dimensions Yield -Infinity

### Problem
`load-planner.ts` lines 639-645: If all items are removed from a load during rebalancing, computing `Math.max(...[])` on an empty items array returns `-Infinity`, which would propagate through dimension calculations.

### Root Cause
No empty-array guard on Math.max/min spread operations.

### Implementation Plan

#### Subtask 7.1: Add empty array guards
- [ ] Wrap all dimension calculations:
  ```typescript
  load.length = load.items.length > 0 ? Math.max(...load.items.map(i => i.length)) : 0
  load.width = load.items.length > 0 ? Math.max(...load.items.map(i => i.width)) : 0
  load.height = load.items.length > 0 ? Math.max(...load.items.map(i => i.height)) : 0
  load.weight = load.items.reduce((s, i) => s + i.weight, 0)
  ```

#### Subtask 7.2: Remove empty loads after rebalancing
- [ ] After rebalancing, filter out loads with zero items:
  ```typescript
  plan.loads = plan.loads.filter(load => load.items.length > 0)
  ```

#### Subtask 7.3: Update totalTrucks count
- [ ] After removing empty loads, recalculate: `plan.totalTrucks = plan.loads.length`

### Testing
- [ ] Test: All items moved off a truck → truck removed from plan, no -Infinity
- [ ] Test: Rebalancing that empties a truck → plan.totalTrucks decremented
- [ ] Test: Plan with 0 items → empty loads array, no crash

---

## Phase 3 Completion Checklist

- [ ] All 7 issues fixed
- [ ] Load planning produces valid placements for all items
- [ ] No items assigned to trucks where they don't physically fit
- [ ] Truck scoring consistent regardless of entry point
- [ ] Fragile items correctly placed on floor, not stacked upon
- [ ] Stacking respects cumulative weight limits
- [ ] Empty loads handled gracefully
