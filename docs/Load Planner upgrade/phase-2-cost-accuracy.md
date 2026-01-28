# Phase 2: Cost Accuracy Fixes

> **Priority:** HIGH - These issues cause incorrect financial estimates, leading to underquoting or overquoting customers.
> **Files Affected:** `permit-calculator.ts`, `cost-optimizer.ts`, `hos-validator.ts`

---

## P2-01: Weight Bracket Fee Uses Math.max Instead of Additive

### Problem
`permit-calculator.ts` lines 163-170: Overweight permit fees use `Math.max()` to compare bracket fees against previously calculated per-mile fees. This means whichever is higher wins, but DOT permit structures typically charge base + bracket (additive), not either/or.

```typescript
if (cargo.grossWeight <= bracket.upTo) {
  estimatedFee = Math.max(estimatedFee, owPermit.baseFee + bracket.fee)
  break
}
```

**Example of incorrect calculation:**
- Base fee: $20
- Per-mile fee for 100 miles at $0.03: $3.00 → running total: $23
- Weight bracket for 100,001 lbs: $50
- Current result: `Math.max(23, 20 + 50)` = $70 (happens to be correct here)
- But if per-mile fee were $60: `Math.max(60, 70)` = $70 (loses the $60 per-mile charge)

The real issue: per-mile fees and bracket fees should both apply, not compete.

### Root Cause
Ambiguity in how states structure overweight fees. Some use per-mile OR bracket, some use both. Code assumed either/or.

### Implementation Plan

#### Subtask 1.1: Research state fee structures
- [ ] Categorize states into fee models:
  - **Model A**: Base + per-mile only (no brackets)
  - **Model B**: Base + bracket only (no per-mile)
  - **Model C**: Base + per-mile + bracket (cumulative)
- [ ] Document which states use which model

#### Subtask 1.2: Add fee model metadata to state-permits.ts
- [ ] Add `overweightFeeModel: 'per-mile' | 'bracket' | 'cumulative'` to state data
- [ ] Default to `'bracket'` for states where model is unclear

#### Subtask 1.3: Update calculation logic
- [ ] Replace Math.max with model-aware calculation:
  ```typescript
  let fee = owPermit.baseFee
  if (model === 'per-mile' || model === 'cumulative') {
    fee += perMileFee
  }
  if (model === 'bracket' || model === 'cumulative') {
    fee += bracketFee
  }
  ```

#### Subtask 1.4: Add ton-mile validation
- [ ] Verify that `tonMileFee` and `perMileFee` are never both active for same state
- [ ] If both exist, log warning and use the larger one

### Testing
- [ ] Test: State with per-mile only → bracket fee ignored
- [ ] Test: State with bracket only → per-mile fee ignored
- [ ] Test: State with cumulative → both applied
- [ ] Test: Edge case at exact bracket boundary

---

## P2-02: Escort Costs Don't Scale with Route Distance

### Problem
`cost-optimizer.ts` lines 88-100: Escort costs are calculated as flat per-day charges without considering route length. A 500-mile oversize route requires 2-3 days of escort service, not 1 day.

```typescript
if (cargoWidth > 12) {
  costs.escorts += ESCORT_COST_PER_DAY  // Only charges 1 day regardless of distance
}
```

### Root Cause
Cost optimizer simplified escort costs as a presence/absence check without duration modeling.

### Implementation Plan

#### Subtask 2.1: Calculate escort duration from route distance
- [ ] Add escort duration calculation:
  ```typescript
  function calculateEscortDays(distanceMiles: number, isOversize: boolean): number {
    const avgSpeed = isOversize ? 35 : 45  // mph
    const drivingHoursPerDay = 10  // oversize typically limited to daylight
    const milesPerDay = avgSpeed * drivingHoursPerDay
    return Math.ceil(distanceMiles / milesPerDay)
  }
  ```

#### Subtask 2.2: Update cost optimizer to use duration
- [ ] Multiply escort cost by number of days:
  ```typescript
  const escortDays = calculateEscortDays(distanceMiles, true)
  if (cargoWidth > 12) costs.escorts += ESCORT_COST_PER_DAY * escortDays
  if (cargoWidth > 14) costs.escorts += ESCORT_COST_PER_DAY * escortDays  // second escort
  if (poleCarRequired) costs.poleCar += POLE_CAR_COST_PER_DAY * escortDays
  ```

#### Subtask 2.3: Pass route distance to cost optimizer
- [ ] Ensure `distanceMiles` is available in cost calculation context
- [ ] If distance unknown, use conservative default (500 miles) with warning

#### Subtask 2.4: Add mobilization/demobilization costs
- [ ] Escorts often charge mob/demob fee ($200-500) on top of daily rate
- [ ] Add as optional line item

### Testing
- [ ] Test: 100-mile route → 1 escort day ($800)
- [ ] Test: 500-mile route → 2 escort days ($1,600)
- [ ] Test: 1,000-mile route → 3 escort days ($2,400)
- [ ] Test: Wide load (>14') with 2 escorts → double the daily cost

---

## P2-03: Overheight Permit Costs Massively Underestimated

### Problem
`cost-optimizer.ts` lines 74-80: Height permit costs use small flat additions ($50-$100 per state) regardless of severity. Real overheight permits for loads 15'+ cost $500-$2,000+ per state, especially in states requiring route surveys, bridge clearance checks, and utility coordination.

```typescript
if (totalHeight > 15) costs.heightPermit += 50 * statesCount  // WAY too low
if (totalHeight > 16) costs.heightPermit += 100 * statesCount  // Still too low
```

### Root Cause
Permit cost estimates in cost-optimizer are independent of the detailed per-state data in state-permits.ts. The optimizer uses simplified flat rates instead of state-specific calculations.

### Implementation Plan

#### Subtask 3.1: Use actual state permit data instead of flat rates
- [ ] Import `calculateRoutePermits` from `permit-calculator.ts`
- [ ] Replace hardcoded height costs with actual state-by-state calculations
- [ ] If route states are known, use exact data; if not, use national average

#### Subtask 3.2: Add height severity tiers
- [ ] Tier 1 (13.6'-14.5'): Standard oversize permit ($75-200/state)
- [ ] Tier 2 (14.6'-15.5'): Enhanced permit + pole car ($300-800/state)
- [ ] Tier 3 (15.6'-16.5'): Route survey required ($800-2,000/state)
- [ ] Tier 4 (16.6'+): Superload classification ($2,000-5,000/state)

#### Subtask 3.3: Include utility coordination costs
- [ ] Loads over 16' in many states require utility company coordination
- [ ] Cost: $500-$2,000 per utility crossing that needs wire lifting
- [ ] Add as estimate based on route length (roughly 1 utility crossing per 50 miles in urban areas)

#### Subtask 3.4: Integrate with permit calculator
- [ ] Cost optimizer should call permit calculator for accurate estimates
- [ ] Avoid duplicating permit cost logic in two places

### Testing
- [ ] Test: 14' load → modest permit cost ($100-200/state)
- [ ] Test: 16' load → significant cost ($800-2,000/state)
- [ ] Test: 18' superload → very high cost ($3,000-5,000/state)
- [ ] Test: Cost optimizer matches permit calculator output

---

## P2-04: Oversize Speed Assumption Too High

### Problem
`hos-validator.ts` line 41: `OVERSIZE_AVG_SPEED: 45` mph is used for all oversize loads. Real-world oversize transport averages 30-40 mph due to:
- State-imposed speed limits for oversize (often 45 mph max, 55 on interstate)
- Escort vehicle speed restrictions
- City/town slowdowns
- Construction zones
- Scale house stops

**Impact:** A 500-mile trip calculated at 45 mph = 11.1 hours. At actual 35 mph = 14.3 hours. This 29% underestimate can push trips over HOS daily limits and underestimate escort days.

### Root Cause
Single speed value used for all oversize categories. Width/height severity affects speed limits.

### Implementation Plan

#### Subtask 4.1: Create speed lookup by oversize category
- [ ] Define speed tiers:
  ```typescript
  const OVERSIZE_SPEEDS = {
    LEGAL: 55,           // Standard legal load
    MILD_OVERSIZE: 45,   // Width 8.6'-10', height 13.6'-14'
    MODERATE_OVERSIZE: 40, // Width 10'-12', height 14'-15'
    HEAVY_OVERSIZE: 35,  // Width 12'-14', height 15'-16'
    SUPERLOAD: 30,       // Width 14'+, height 16'+, or >200k lbs
  }
  ```

#### Subtask 4.2: Determine speed category from cargo dimensions
- [ ] Function to classify load and return appropriate speed:
  ```typescript
  function getOversizeSpeed(width: number, height: number, weight: number): number
  ```

#### Subtask 4.3: Update HOS validator
- [ ] Use dimension-aware speed in drive time calculations
- [ ] Update `calculateDriveTime()` to accept speed parameter

#### Subtask 4.4: Update escort calculator
- [ ] Escort trip duration should use same speed as HOS
- [ ] Add `getOversizeSpeed()` call in escort day calculation

### Testing
- [ ] Test: Legal load → 55 mph average
- [ ] Test: 12' wide load → 40 mph average
- [ ] Test: 16' wide superload → 30 mph average
- [ ] Test: HOS validation correctly rejects trip that's feasible at 45 but not at 35 mph

---

## P2-05: Distance Defaults to 0 Silently

### Problem
`permit-calculator.ts` line 37: `distanceInState: number = 0` default means if the caller forgets to pass distance, all per-mile and ton-mile fees calculate as $0. This silently underestimates permit costs with no warning.

### Root Cause
Default parameter value of 0 chosen for backward compatibility but creates silent data quality issue.

### Implementation Plan

#### Subtask 5.1: Add warning for zero distance
- [ ] When `distanceInState <= 0` and state has per-mile fees:
  ```typescript
  if (distanceInState <= 0 && (owPermit.perMileFee || owPermit.tonMileFee)) {
    warnings.push(`Distance not provided for ${state.stateName} - per-mile fees not calculated`)
  }
  ```

#### Subtask 5.2: Add minimum distance fallback
- [ ] When distance is 0 but state is on route, use minimum assumption:
  ```typescript
  const effectiveDistance = distanceInState > 0 ? distanceInState : 50  // minimum 50 miles
  ```
- [ ] Add note in output: "Estimated minimum distance used - actual distance may increase costs"

#### Subtask 5.3: Audit all callers
- [ ] Search for all calls to `calculateStatePermit()` and `calculateDetailedStatePermit()`
- [ ] Verify all callers pass actual distance values
- [ ] Fix any callers that omit distance

### Testing
- [ ] Test: Distance = 0 with per-mile state → warning generated, minimum used
- [ ] Test: Distance = 100 with per-mile state → correct calculation
- [ ] Test: Distance = 0 with no per-mile state → no warning (not applicable)

---

## Phase 2 Completion Checklist

- [ ] All 5 issues fixed
- [ ] Permit cost estimates within 20% of real-world quotes for sample routes
- [ ] Escort costs scale linearly with distance
- [ ] HOS trip duration estimates match real-world oversize transport times
- [ ] No silent zero-cost calculations
- [ ] Cost optimizer and permit calculator produce consistent results
