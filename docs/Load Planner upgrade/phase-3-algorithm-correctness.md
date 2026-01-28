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
- [x] Map every caller of `canShareTruck()` or equivalent area-check logic
- [x] Verify that `expandItems()` has always run before area checks
- [x] Document findings — all 5 callers use expanded items (quantity=1): `planLoads()` ×2, `tryAddToExistingLoads()` from 3 strategy planners

#### Subtask 1.2: Add defensive quantity multiplication
- [x] Even if expansion runs first, add safety:
  ```typescript
  usedArea = existingItems.reduce((s, i) => s + (i.length * i.width * (i.quantity || 1)), 0)
  ```
- [x] This is a no-op when quantity=1 (post-expansion) but catches edge cases
- [x] Also fixed weight check to use `getItemWeight(i)` instead of raw `i.weight`
- [x] Also fixed `rebalanceLoads()` merge-pass area check

#### Subtask 1.3: Add packing efficiency factor validation
- [x] Current packing efficiency is 75% (`deck_area * 0.75`)
- [x] Verified consistent in both `canFitOnTruck()` (`PACKING_EFFICIENCY = 0.75`) and `rebalanceLoads()` merge pass (`0.75` literal)
- [ ] Consider cargo shape: cylindrical items waste more space than boxes (deferred — `geometry` field exists on `LoadItem` but isn't used in area calculations)

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
- [x] Added `canFitOnTruck()` call to movable-items filter in `rebalanceLoads()`. This function checks weight, area (75% packing efficiency), and runs full `calculatePlacements()` to verify no failed placements. Items that pass weight/utilization but fail physical fit are skipped.

#### Subtask 2.2: Recalculate placements after successful rebalance
- [x] Already implemented — lines 651-652 recalculate placements for both source and target loads after every move
- [x] `PlannedLoad.placements` arrays updated via `calculatePlacements()` calls

#### Subtask 2.3: Add rebalancing success metrics
- [x] Not added as separate tracking — the fix naturally reduces failed placements to zero by preventing invalid moves. The existing post-rebalance failed-placement warning system (lines 886-900) serves as the diagnostic: if no warnings appear, all rebalance moves were valid.

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
- [x] Renamed `MAX_UTILIZATION` to `FALLBACK_UTILIZATION` and changed from 100 to 95
- [x] Hard 100% physical capacity limit still enforced in `canAddItemToLoad()` line 477

#### Subtask 3.2: Flag fallback-assigned items
- [x] **Skipped** — deemed unnecessary. With the 95% cap, fallback trucks land at 85-95% utilization, above the rebalancer's 90% source threshold. The rebalancer naturally targets these trucks without explicit flagging.

#### Subtask 3.3: Consider new truck instead of 100% pack
- [x] Already handled by existing code flow — when no existing load fits at the fallback cap (now 95%), the code falls through to creating a new dedicated truck (line 831). The lower cap means this path triggers more often for borderline cases, preferring a slightly higher truck count over force-packed loads that block rebalancing.

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
- [x] Document all scoring factors in `findBestTruckForItem()` — simplified: flat permit penalty (permits.length * 15), flat +20 legal bonus, simple drive-on match (+15), overkill check (height only), no tiers, no proportional penalties
- [x] Document all scoring factors in `findBestTruckForLoad()` / `selectTrucks()` — comprehensive: proportional penalties (height up to 40, width up to 25, weight up to 30), cost-weighted permits (up to 30), tiers (+10 to -30), 12 equipment profiles, seasonal/historical bonuses, weight overkill
- [x] Create comparison table showing differences — documented in work log entry #19

#### Subtask 4.2: Unify scoring through truck-selector.ts
- [x] Both functions now delegate to `selectTrucks()` for consistent scoring
- [x] `findBestTruckForItem()` wraps a single-item ParsedLoad and calls `selectTrucks()`
- [x] `findBestTruckForLoad()` creates a ParsedLoad with actual items (not a virtual "Load" item) and calls `selectTrucks()` — enables proper equipment matching from real descriptions
- [x] Equipment matching, availability tiers, and seasonal bonuses now apply everywhere

#### Subtask 4.3: Verify permit consistency
- [x] Permits now determined by same `determinePermits()` function in truck-selector.ts regardless of entry point (item vs load)
- [x] When truck changes during load optimization (planLoads line 822), `findBestTruckForLoad()` recalculates via `selectTrucks()` which includes fresh `determinePermits()` call

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
- [x] Replaced 8-line block with single check: `if (item.fragile && floorHeight > 0) continue`. Uses `floorHeight` (computed from grid cells at the candidate position) instead of global `existingPlacements.some()` scan. When `floorHeight > 0`, items exist below — skip. When `floorHeight === 0`, it's the floor — allow.

#### Subtask 5.2: Allow fragile items on floor
- [x] `floorHeight === 0` → condition is false → position NOT skipped. Fragile items always allowed on floor.
- [x] `floorHeight > 0` → condition is true → position skipped. Fragile items never stacked on other items.

#### Subtask 5.3: Add fragile-on-fragile check
- [x] Inherently prevented — both fragile items must go on the floor (`floorHeight > 0` blocks all stacking for fragile items). No explicit fragile-on-fragile check needed.
- [x] Reverse direction (non-fragile on top of fragile) already handled by `buildStackingMap()` — fragile items without explicit `stackable: true` have `canStack = false` in their grid cells.

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
- [x] Added `currentLoad: number` field to `StackingCell` interface in `types.ts`, initialized to 0 in `buildStackingMap()`.

#### Subtask 6.2: Check cumulative weight
- [x] `findBestPosition()` now checks `cell.currentLoad + weightPerCell > cell.maxLoad` instead of `itemWeight > cell.maxLoad`.
- [x] Weight accumulation happens in `buildStackingMap()` second pass — grid is rebuilt from scratch each call, so no post-place update needed.

#### Subtask 6.3: Distribute item weight across cells
- [x] `buildStackingMap()` second pass distributes stacked item weight as `itemWeight / numCells` across covered cells.
- [x] `findBestPosition()` computes new item's `weightPerCell = itemWeight / numCells` per orientation/position for the cumulative check.

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
- [x] `findBestTruckForLoad()` lines 508-510: ternary guard `items.length > 0 ? Math.max(...) : 0`
- [x] Rebalance move-pass `lowLoad` lines 606-608: added `, 0` fallback (matches existing `highLoad` pattern)
- [x] Merge-pass `combinedItems` lines 657-659: added `, 0` fallback
- [x] HOS validation `enhancedLoads` lines 1157-1159: ternary guard `enhancedLoads.length > 0 ? Math.max(...) : 0`

#### Subtask 7.2: Remove empty loads after rebalancing
- [x] Already implemented at lines 668-673: reverse-iteration splice for `items.length === 0`
- [x] Loads renumbered at lines 675-678

#### Subtask 7.3: Update totalTrucks count
- [x] Already handled at line 885: `totalTrucks: loads.length` set after `rebalanceLoads()` returns

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
