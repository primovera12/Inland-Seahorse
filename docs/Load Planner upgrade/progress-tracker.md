# Load Planner Upgrade - Progress Tracker

> **Audit Date:** January 27, 2026
> **Total Issues Found:** 45
> **Critical:** 9 | **High:** 17 | **Medium:** 19

---

## How To Use This File (New Chat Instructions)

> **If you are Claude starting a new chat session**, read this entire file first. It is your single source of truth for the Load Planner upgrade project.
>
> 1. Read the **Living Context** section below to understand what has been done and what state the code is in.
> 2. Read the **Current Focus** to know exactly what to work on next.
> 3. Read the relevant **phase file** (e.g. `phase-1-safety-compliance.md`) for detailed subtasks, code locations, and implementation instructions.
> 4. When you finish a task, **update this file immediately**:
>    - Mark the issue status as `[x] Done` in the phase table below
>    - Add an entry to the **Work Log** at the bottom with what you changed and which files were modified
>    - Update the **Living Context** section to reflect the new state of the project
>    - Update the **Current Focus** to point to the next task
> 5. All load planner source files live in `src/lib/load-planner/` inside the `dismantle-pro` folder.
> 6. Phase detail files with full subtask breakdowns are in this same folder (`docs/Load Planner upgrade/`).
>
> **This file must always be kept up to date. It is the memory of this project across chat sessions.**
>
> **IMPORTANT — Context limit rule:** When your context usage reaches **85%**, stop working immediately — even mid-task. Update this file with your progress (Living Context, Current Focus, Work Log), commit, and tell the user to start a new chat. Do not try to finish the current task if you are at 85%+.

---

## Living Context

> **Last Updated:** 2026-01-28
>
> ### Project State
> The Load Planner is a logistics optimization system inside the Seahorse Inland / dismantle-pro Next.js application. It handles cargo parsing (AI-powered via Claude), truck recommendation (54 trailer types with scoring), multi-truck load planning (2D/3D bin packing), 50-state permit calculation, escort/HOS/securement compliance, and quote generation with PDF sharing.
>
> ### What Has Been Done
> - Full audit of all load planner modules completed (Jan 27, 2026)
> - 45 issues identified across 5 severity phases
> - Detailed implementation plans written for all 45 issues (see phase files)
> - **P1-01 COMPLETED**: Dollar vs cents unit mismatch fixed. All monetary values now standardized to cents across escort-calculator, cost-optimizer, permit-calculator, and load-planner modules.
> - **P1-02 COMPLETED**: Hotshot tractor weight fixed. Added `powerUnitWeight` field to `TruckType` interface and all 62 truck definitions. Hotshot=9k, SPMT=0, heavy haul=20k, standard=17k. All GVW calculations across 7 files now use `truck.powerUnitWeight` instead of hardcoded `LEGAL_LIMITS.TRACTOR_WEIGHT`.
> - **P1-03 COMPLETED**: Fallback placement at (0,0) overlapping cargo fixed. Failed placements now marked with `failed: true` flag instead of silently overlapping. Fixed broken `canFitOnTruck()` and `rebalanceLoads()` merge verification that always passed due to fallback. Warnings generated for failed placements. Visualization shows failed items in red hatched style with "NOT PLACED" label.
> - **P1-04 COMPLETED**: Drive axle weight can no longer go negative. Replaced broken single-beam model (fixed 33% steer ratio, moments computed about inconsistent reference points) with proper 2-beam pin-jointed model. Beam 1 (trailer) solves kingpin + trailer axle reactions. Beam 2 (tractor) uses kingpin reaction to solve steer + drive axle weights via moment balance. Added `steerAxlePosition` to `AxleConfiguration` interface and all 18 default configs. Conservation law now always holds: steer + drive + trailer = totalGross. Added underload/imbalance warnings for negative axle weights, low steer axle (<10k lbs), and any axle below 5% of GVW. Self-propelled (SPMT) handled as special case (all weight on trailer axles).
> - **P1-05 COMPLETED**: Tridem axle limit formula corrected. Per-axle weight increment beyond tridem changed from 8,000 lbs to 5,500 lbs per axle (conservative estimate for typical 4-5 ft axle spacing per 23 CFR 658.17). Added named constant `PER_ADDITIONAL_AXLE: 5500` to `AXLE_LIMITS`. Formula in `scoreWeightDistribution()` now uses `AXLE_LIMITS.PER_ADDITIONAL_AXLE` instead of hardcoded magic number.
> - **P1-06 COMPLETED**: WLL now adjusted for tie-down angle per DOT 49 CFR 393.106. Added `effectiveWLL` field to `TieDownPoint` interface and `calculateEffectiveWLL(wll, angle)` helper using `wll × cos(angle)`. All compliance checks now use effective (angle-adjusted) WLL instead of rated WLL. Added `totalRatedWLL` field to `SecurementPlan` for transparency. Notes generated when angle reduces effectiveness by >15%. Validation messages report both rated and effective WLL when deficit exists. Steep angle warnings (>60°) now show actual effectiveness percentage.
> - **P1-07 COMPLETED**: HOS 70-hour/8-day cycle now fully enforced. Previously, `validateTripHOS()` only compared drive time to cycle remaining — it did not account for non-driving on-duty hours (pre-trip inspection, fueling, etc.) which also count toward the 70-hour limit per 49 CFR 395.3. Added `cycleHoursUsed`, `cycleDaysRemaining`, and `lastResetDate` fields to `HOSStatus` interface. Added `estimatedOnDutyTime`, `cycleViolation`, `restartRequired`, and `restartDelayHours` fields to `TripHOSValidation`. Added `calculateTotalOnDutyTime()` which computes drive time + non-driving on-duty time (45 min/day standard, +30 min/day for oversize). Added `resetAfter34HourRestart()` for full cycle reset. Validation now uses total on-duty hours (not just drive time) against cycle limit, detects whether a 34-hour restart can fix the violation, calculates restart delay for delivery timeline, and warns when cycle hours are running low (<20% margin). Schedule generation includes restart events. Delivery window accounts for restart delays.
> - **P1-08 COMPLETED**: Grid boundary overflow in stacking engine fixed. `buildStackingMap()` and `findBestPosition()` used `Math.ceil()` for end grid cell indices, which could produce an index exceeding array bounds when an item's edge aligned exactly with a grid boundary (e.g. `Math.ceil(48.0 / 0.5) = 96` but grid indices are 0-95). Changed all end-index calculations from `Math.ceil` to `Math.floor` in both functions. Added `Math.max(0, ...)` clamping on start indices as safety guard. Added skip for failed placements (`placement.failed`) in `buildStackingMap()` to prevent sentinel coordinates (-1, -1) from producing negative array indices. Added early-continue safety check when start > end index after clamping.
> - **P1-09 COMPLETED**: Dry Van 53' and Dry Van 48' `maxLegalCargoHeight` fixed from 9.0 to 9.5. The field is defined as `13.5 - deckHeight` (legal height clearance), and both dry vans have `deckHeight: 4.0`, so the correct value is 9.5. Verified all 62 truck definitions against the formula — only these 2 dry vans were wrong. Reefer trucks (53'/48') also show less than formula (8.5 instead of 9.5) but this is intentional due to refrigeration unit reducing interior clearance.
>
> ### What We Learned During Audit
> - The codebase is well-architected with clean module separation
> - 54 truck types with accurate specs (2 data errors found: Dry Van 53' and Dry Van 48' maxLegalCargoHeight) — both now FIXED
> - The AI parsing pipeline (Claude Opus 4.5) is a strong differentiator
> - Main risk areas: weight distribution math, DOT compliance gaps, cost estimation accuracy
> - ~~Two files use different unit systems for money (dollars vs cents) — must fix before any cost work~~ FIXED
> - ~~Fallback at (0,0) silently created overlapping cargo shown as valid~~ FIXED — now marked as failed
> - The `findBestTruckForItem()` and `findBestTruckForLoad()` use different scoring logic — needs unification
> - Step deck / double drop / RGN trailers have multi-zone decks not modeled in the placement algorithm
>
> ### Key Architecture Notes
> - All monetary values across the entire system now use **cents** (integer)
> - Shared cost constants live in `types.ts` as `ESCORT_COSTS` and `PERMIT_BASE_COSTS_CENTS`
> - `DEFAULT_COST_DATA` now uses `dailyCostCents` field (was `dailyCost` in dollars)
> - `PlanningOptions.fuelPrice` is now in cents per gallon (was dollars)
> - State permit data in `state-permits.ts` still stores fees in dollars — `permit-calculator.ts` converts to cents at the boundary with `* 100`
> - Each truck now has its own `powerUnitWeight` (tractor weight) — hotshot 9k, standard 17k, heavy haul 20k, SPMT 0
> - `truck-type-converter.ts` derives `powerUnitWeight` from category/name for database-backed trucks
> - Truck scoring flows: `truck-selector.ts` has the full algorithm; `load-planner.ts` has a simplified copy
> - Smart features (stacking, weight distribution, securement, HOS, escorts) are optional modules toggled via `PlanningOptions`
> - State permit data is in `state-permits.ts` (~2000 lines, all 50 states)
> - The placement algorithm uses 0.5-foot grid steps scanning the deck (fine for <10 items, watch performance for more)
> - `ItemPlacement` and `ItemPlacement3D` interfaces both have optional `failed?: boolean` field — when `true`, the item is assigned to the truck but has no valid deck position
> - `canFitOnTruck()` now verifies no failed placements exist (previously only checked count, which always matched due to fallback)
> - Weight distribution uses a **2-beam pin-jointed model**: trailer beam (kingpin + trailer axle) and tractor beam (steer + drive axle). The kingpin (fifth wheel) is the pin joint connecting them. This replaces the old single-beam model that used a fixed 33% steer ratio.
> - `AxleConfiguration` now includes `steerAxlePosition` (distance from kingpin to steer axle). Standard Class 8: -17 ft, heavy haul: -20 ft. Tractor CG assumed at 60% from steer toward drive axle.
> - Axle weights can be negative in extreme imbalance scenarios — `scoreWeightDistribution()` generates appropriate warnings and score penalties for these cases
> - Trailer axle limits for multi-axle (4+) trailers use `AXLE_LIMITS.TRIDEM_AXLE + (n - 3) * AXLE_LIMITS.PER_ADDITIONAL_AXLE` where `PER_ADDITIONAL_AXLE = 5,500` lbs — a conservative estimate for typical spacing. Full Bridge Formula B (spacing-dependent) is a separate future enhancement (P5-01)
> - Securement compliance uses **angle-adjusted effective WLL** (`wll × cos(angle)`) per 49 CFR 393.106. `TieDownPoint` has both `wll` (rated) and `effectiveWLL` (angle-adjusted). `SecurementPlan` has `totalWLL` (effective sum) and `totalRatedWLL` (rated sum). Compliance checks use effective WLL.
> - Stacking engine grid indices use **`Math.floor` for both start and end** positions. Grid resolution is 0.5 ft. Grid dimensions use `Math.ceil(deckDimension / GRID_RESOLUTION)` to cover the full deck. Failed placements (with `failed: true`) are skipped in `buildStackingMap()`. All indices are clamped: starts with `Math.max(0, ...)`, ends with `Math.min(gridSize - 1, ...)`.
> - HOS validation enforces the **70-hour/8-day cumulative cycle** per 49 CFR 395.3. The cycle counts ALL on-duty time (driving + non-driving duties like inspection, fueling). `HOSStatus` tracks `cycleHoursUsed`, `cycleDaysRemaining`, and optional `lastResetDate`. `TripHOSValidation` includes `estimatedOnDutyTime` (total on-duty), `cycleViolation`, `restartRequired`, and `restartDelayHours`. A 34-hour consecutive off-duty restart resets the full 70-hour cycle. Non-driving on-duty time is estimated at 45 min/driving-day (standard) or 75 min/driving-day (oversize, due to escort coordination).

### Current Focus
> **Phase 1 is COMPLETE.** All 9 safety & DOT compliance issues have been fixed.
>
> **Next up:** Phase 2, Issue P2-01 — Weight bracket fee uses Math.max instead of additive
> **Phase file:** `phase-2-cost-accuracy.md` → Section P2-01
> **Why next:** Phase 2 addresses cost accuracy issues. P2-01 is the first: `permit-calculator.ts` line 163-170 uses `Math.max()` to select the highest weight bracket fee, but many states use additive/cumulative brackets where all applicable fees stack.

---

## Summary Statistics

| Phase | Description | Issues | Done | Remaining | Status |
|-------|-------------|--------|------|-----------|--------|
| 1 | Safety & DOT Compliance | 9 | 9 | 0 | COMPLETE |
| 2 | Cost Accuracy | 5 | 0 | 5 | Not Started |
| 3 | Algorithm Correctness | 7 | 0 | 7 | Not Started |
| 4 | Data & Coverage | 10 | 0 | 10 | Not Started |
| 5 | Advanced Compliance | 7 | 0 | 7 | Not Started |
| -- | Minor / Polish | 7 | 0 | 7 | Not Started |
| **Total** | | **45** | **9** | **36** | |

---

## Phase 1: Safety & DOT Compliance

| ID | Issue | Severity | File(s) | Line(s) | Status |
|----|-------|----------|---------|---------|--------|
| P1-01 | Dollar vs cents unit mismatch in escort costs | CRITICAL | `escort-calculator.ts`, `permit-calculator.ts` | 21-24, 27-29 | [x] Done |
| P1-02 | Hotshot tractor weight uses semi weight (17k vs 9k) | CRITICAL | `load-planner.ts`, `truck-selector.ts`, `types.ts` | 316 | [x] Done |
| P1-03 | Fallback placement at (0,0) creates overlapping cargo | CRITICAL | `load-planner.ts`, `types.ts`, `TrailerDiagram.tsx`, `LoadPlanVisualizer.tsx` | 154-161 | [x] Done |
| P1-04 | Drive axle weight can go negative | CRITICAL | `weight-distribution.ts`, `types.ts` | 26-86 | [x] Done |
| P1-05 | Tridem axle limit formula wrong (8k vs 5.5k per axle) | CRITICAL | `weight-distribution.ts` | 161-162 | [x] Done |
| P1-06 | WLL not adjusted for tie-down angle (DOT 49 CFR 393) | CRITICAL | `securement-planner.ts` | 251-252 | [x] Done |
| P1-07 | HOS 70-hour/8-day cycle not enforced | CRITICAL | `hos-validator.ts` | 201-230 | [x] Done |
| P1-08 | Grid boundary overflow in stacking engine | CRITICAL | `stacking-engine.ts` | 115-118 | [x] Done |
| P1-09 | Dry Van 53' maxLegalCargoHeight wrong (9.0 vs 9.5) | CRITICAL | `trucks.ts` | 633 | [x] Done |

---

## Phase 2: Cost Accuracy

| ID | Issue | Severity | File(s) | Line(s) | Status |
|----|-------|----------|---------|---------|--------|
| P2-01 | Weight bracket fee uses Math.max instead of additive | HIGH | `permit-calculator.ts` | 163-170 | [ ] Not Started |
| P2-02 | Escort costs don't scale with route distance | HIGH | `cost-optimizer.ts` | 88-100 | [ ] Not Started |
| P2-03 | Overheight permit costs massively underestimated | HIGH | `cost-optimizer.ts` | 74-80 | [ ] Not Started |
| P2-04 | Oversize speed assumption too high (45 vs 35 mph) | HIGH | `hos-validator.ts` | 41-43 | [ ] Not Started |
| P2-05 | Distance defaults to 0 silently (no per-mile fees) | HIGH | `permit-calculator.ts` | 37 | [ ] Not Started |

---

## Phase 3: Algorithm Correctness

| ID | Issue | Severity | File(s) | Line(s) | Status |
|----|-------|----------|---------|---------|--------|
| P3-01 | Quantity not factored in area check | HIGH | `load-planner.ts` | 517 | [ ] Not Started |
| P3-02 | Rebalancing assigns items that don't physically fit | HIGH | `load-planner.ts` | 622 | [ ] Not Started |
| P3-03 | 100% utilization fallback prevents rebalancing | HIGH | `load-planner.ts` | 785-805 | [ ] Not Started |
| P3-04 | Inconsistent truck scoring between item vs load | HIGH | `load-planner.ts` | 743, 821 | [ ] Not Started |
| P3-05 | Fragile items blocked from floor incorrectly | HIGH | `stacking-engine.ts` | 268-275 | [ ] Not Started |
| P3-06 | Cumulative stack weight not validated | MEDIUM | `stacking-engine.ts` | 251-256 | [ ] Not Started |
| P3-07 | Empty load dimensions yield -Infinity | MEDIUM | `load-planner.ts` | 639-645 | [ ] Not Started |

---

## Phase 4: Data & Coverage

| ID | Issue | Severity | File(s) | Line(s) | Status |
|----|-------|----------|---------|---------|--------|
| P4-01 | Alaska and Hawaii missing from state detector | HIGH | `state-detector.ts` | 26-75 | [ ] Not Started |
| P4-02 | North Carolina combination length wrong (60 vs 65) | HIGH | `state-permits.ts` | 1433 | [ ] Not Started |
| P4-03 | NYC requires separate permits from NY state | HIGH | `state-permits.ts` | 1385-1423 | [ ] Not Started |
| P4-04 | California missing continuous permits & bridge analysis | HIGH | `state-permits.ts` | 206-243 | [ ] Not Started |
| P4-05 | Pennsylvania length surcharges missing | MEDIUM | `state-permits.ts` | 1646-1654 | [ ] Not Started |
| P4-06 | New Jersey restrictions understated | MEDIUM | `state-permits.ts` | 1310-1318 | [ ] Not Started |
| P4-07 | Georgia dimension surcharges missing | MEDIUM | `state-permits.ts` | 430-470 | [ ] Not Started |
| P4-08 | Illinois police escort fee too low ($250 vs $300-400) | MEDIUM | `state-permits.ts` | 590 | [ ] Not Started |
| P4-09 | 13 states missing per-axle weight breakdowns | MEDIUM | `state-permits.ts` | multiple | [ ] Not Started |
| P4-10 | Cumulative vs tiered surcharges ambiguous | MEDIUM | `permit-calculator.ts` | 124-144 | [ ] Not Started |

---

## Phase 5: Advanced Compliance

| ID | Issue | Severity | File(s) | Line(s) | Status |
|----|-------|----------|---------|---------|--------|
| P5-01 | No Bridge Formula B validation | HIGH | New module needed | -- | [ ] Not Started |
| P5-02 | No KPRA validation (CA/OR/WA) | HIGH | New module needed | -- | [ ] Not Started |
| P5-03 | Escort speed not coordinated with HOS speed | HIGH | `escort-calculator.ts`, `hos-validator.ts` | multiple | [ ] Not Started |
| P5-04 | Seasonal restrictions not checked by cost optimizer | MEDIUM | `cost-optimizer.ts`, `seasonal-restrictions.ts` | multiple | [ ] Not Started |
| P5-05 | 3D placements not used by truck selector | MEDIUM | `truck-selector.ts`, `stacking-engine.ts` | multiple | [ ] Not Started |
| P5-06 | Step deck dual-deck heights not modeled | MEDIUM | `load-planner.ts`, `trucks.ts` | multiple | [ ] Not Started |
| P5-07 | Weight distribution optimal position wrong (50% vs 45%) | MEDIUM | `weight-distribution.ts` | 205 | [ ] Not Started |

---

## Minor / Polish Issues

| ID | Issue | Severity | File(s) | Status |
|----|-------|----------|---------|--------|
| M-01 | Regional escort cost multipliers needed ($600-$1200 range) | MEDIUM | `escort-calculator.ts` | [ ] Not Started |
| M-02 | Width doesn't account for overhang/securement (+4-6") | MEDIUM | `truck-selector.ts` | [ ] Not Started |
| M-03 | No fuel surcharge index for date-aware costs | MEDIUM | `cost-optimizer.ts` | [ ] Not Started |
| M-04 | API key partially logged (security) | MEDIUM | `ai-parser.ts` | [ ] Not Started |
| M-05 | Delete + re-insert pattern in quote updates | MEDIUM | `loadPlannerQuotes.ts` | [ ] Not Started |
| M-06 | Permit fee staleness (data from Jan 2025) | MEDIUM | `state-permits.ts` | [ ] Not Started |
| M-07 | Bridge-specific weight limits not captured | MEDIUM | `state-permits.ts` | [ ] Not Started |

---

## Work Log

> Every completed task gets an entry here. This is the permanent record of what was changed, when, and in which files. Newest entries at the top.

| # | Date | Issue ID | What Was Done | Files Modified | Notes |
|---|------|----------|---------------|----------------|-------|
| 10 | 2026-01-28 | P1-09 | Fixed `maxLegalCargoHeight` for Dry Van 53' and Dry Van 48'. Both had `maxLegalCargoHeight: 9.0` but with `deckHeight: 4.0` the correct value per the formula `13.5 - deckHeight` is 9.5. The 9.0 value was likely based on typical dry van interior ceiling height (~108-110"), but the field represents the legal height limit based on federal 13.5 ft overall height, not the physical interior. Updated both to 9.5 with comments noting interior ceiling may be lower. Also ran full verification of all 62 truck definitions against the formula — only these 2 dry vans were incorrect. Reefer trucks (53'/48') intentionally use 8.5 (less than formula) because refrigeration units reduce interior clearance. The original audit only flagged Dry Van 53'; Dry Van 48' was a bonus find during systematic verification. | `trucks.ts` | TypeScript compiles clean. Pre-existing test errors unchanged. Impact: cargo between 9.0-9.5 ft tall will now correctly show Dry Van 53'/48' as options instead of being rejected. The 0.5 ft difference (6 inches) matters for palletized freight stacked to common heights. |
| 9 | 2026-01-28 | P1-08 | Fixed grid boundary overflow in stacking engine. `buildStackingMap()` and `findBestPosition()` used `Math.ceil()` for end grid cell indices (`endX`, `endZ`, `endGx`, `endGz`), which could produce an index exceeding array bounds when an item edge aligned exactly with a grid boundary. Example: item at x=0, length=48 on 48' deck → `Math.ceil(48.0 / 0.5) = 96`, but grid has indices 0-95. For non-exact boundaries, `Math.ceil` also marked one extra cell beyond the item footprint. Changed all four end-index calculations from `Math.ceil` to `Math.floor`. Added `Math.max(0, ...)` clamping on start indices (`startX`, `startZ`) to guard against negative coordinates (e.g. failed placements with sentinel -1 values from P1-03). Added `if (placement.failed) continue` in `buildStackingMap()` to skip failed placements entirely — these have no valid deck position and their sentinel coordinates would produce invalid grid indices. Added early-continue safety check (`if (startX > endX \|\| startZ > endZ) continue`) after clamping to skip degenerate ranges. | `stacking-engine.ts` | TypeScript compiles clean. Pre-existing test errors unchanged (all in unrelated test files). The `Math.floor` change is conservative: for exact grid-boundary alignments (e.g. item ending at exactly 3.0 ft → cell index 6 on 0.5 ft grid), `Math.floor` produces the same value as `Math.ceil` and still marks the boundary cell. For non-exact positions, `Math.floor` correctly stops at the last cell the item actually occupies, whereas `Math.ceil` would include one cell beyond. The `Math.min(gridLength - 1, ...)` clamp remains as an additional safety net. |
| 8 | 2026-01-28 | P1-07 | Enforced DOT 70-hour/8-day cumulative cycle limit in HOS validator. Previously, `validateTripHOS()` only compared drive time to `cycleRemaining`, ignoring non-driving on-duty hours (pre-trip inspection, fueling, paperwork) that also count toward the 70-hour limit per 49 CFR 395.3. A driver with 10 hours remaining on their cycle could be approved for a 15-hour on-duty trip. Added `cycleHoursUsed`, `cycleDaysRemaining`, `lastResetDate` to `HOSStatus` interface. Added `estimatedOnDutyTime`, `cycleViolation`, `restartRequired`, `restartDelayHours` to `TripHOSValidation`. Created `calculateTotalOnDutyTime()` — computes drive time + non-driving on-duty (45 min/day standard, +30 min/day oversize for escort coordination). Created `resetAfter34HourRestart()` — returns a fresh `HOSStatus` after a 34-hour restart per 49 CFR 395.3(d). Updated `validateTripHOS()` to use total on-duty hours (not just drive time) for cycle check, detect single-cycle vs multi-cycle violations, suggest 34-hour restart with delay calculation, and warn when cycle margin is <20%. Updated `updateHOSAfterDriving()` to track `cycleHoursUsed`. Updated `estimateDeliveryWindow()` to add restart delay to delivery timeline. Updated `generateTripPlan()` to include 34-hour restart events in schedule with DOT reference notes. Updated `getSmartLoadPlanSummary()` in `load-planner.ts` to display on-duty time, cycle violation, and restart info. Exported `resetAfter34HourRestart`, `calculateTotalOnDutyTime`, `updateHOSAfterDriving`, `resetAfterBreak` from `index.ts`. Added `HOS_LIMITS.CYCLE_DAYS_8`, `CYCLE_DAYS_7`, `RESTART_HOURS` (34), `NON_DRIVING_ON_DUTY_PER_DAY` (45 min) constants. | `types.ts`, `hos-validator.ts`, `load-planner.ts`, `index.ts` | TypeScript compiles clean. Pre-existing test errors unchanged (all in unrelated test files). Example impact: a driver with 8h cycle remaining assigned a 600-mile oversize trip (≈13.3h drive + ≈1.25h non-driving = 14.6h on-duty) would now correctly flag a cycle violation and suggest a 34-hour restart adding 34h to the delivery timeline. Previously this was silently approved because only 13.3h drive time was checked against 8h remaining, and the check only compared drive hours — now it compares total on-duty hours. |
| 7 | 2026-01-28 | P1-06 | Implemented angle-adjusted effective WLL for tie-down compliance per DOT 49 CFR 393.106. Previously, all compliance checks summed raw rated WLL values, ignoring the tie-down angle — a tie-down at 45° was treated as having full restraint capacity when it actually only provides cos(45°) ≈ 70.7% of its rated WLL. Added `calculateEffectiveWLL(wll, angle)` helper function (`wll × cos(angle)`). Added `effectiveWLL` field (required) to `TieDownPoint` interface — computed and set on every tie-down point creation in `generateTieDownPositions()`. Changed `generateSecurementPlan()` to sum `effectiveWLL` for compliance checking instead of raw `wll`. Added `totalRatedWLL` field to `SecurementPlan` for transparency (UI can show both). Compliance notes added when angle reduces effectiveness by >15%. Updated `validateSecurement()` to report both rated and effective WLL in deficit messages. Updated steep angle warnings (>60°) to show actual effectiveness percentage. Updated `generateLoadSecurementPlan()` summary to display both effective and rated WLL. Exported `calculateEffectiveWLL` from `index.ts`. | `types.ts`, `securement-planner.ts`, `index.ts` | TypeScript compiles clean. Pre-existing test errors unchanged. Example impact: 4 straps at 45° with 5,400 lb WLL each — old total: 21,600 lbs, new effective total: 15,274 lbs. For a 25,000 lb item (required WLL: 12,500 lbs), this still passes, but for heavier loads the angle adjustment can correctly flag non-compliance that was previously missed. |
| 6 | 2026-01-28 | P1-05 | Fixed tridem+ axle limit formula. Changed per-axle weight increment beyond tridem from 8,000 lbs to 5,500 lbs. The old 8,000 value was too permissive — likely confused with the single-to-tandem increment (20k→34k = 7k/axle). The correct conservative value for typical 4-5 ft axle spacing is ~5,500 lbs per additional axle per federal Bridge Formula B (23 CFR 658.17). Added named constant `AXLE_LIMITS.PER_ADDITIONAL_AXLE = 5500` to replace the magic number. Impact: multi-axle trailers (4+ axles) now have lower trailer axle limits — e.g. quad axle: 47,500 lbs (was 50,000), 5-axle: 53,000 lbs (was 58,000). This prevents overweight configurations from passing validation. | `types.ts`, `weight-distribution.ts` | TypeScript compiles clean. Pre-existing test errors unchanged. Full Bridge Formula B implementation (spacing-dependent limits) is tracked separately as P5-01. |
| 5 | 2026-01-28 | P1-04 | Replaced broken single-beam axle weight model with proper 2-beam pin-jointed static model. Old model: computed trailer axle via moments (with inconsistent reference points — cargo moments about kingpin but trailer moment about drive axle), then subtracted a fixed 33% steer ratio from the residual, which could go negative. New model: Beam 1 (trailer) — moments about kingpin solve trailer axle weight, then kingpin reaction = trailer load - trailer axle weight. Beam 2 (tractor) — kingpin reaction transferred to tractor, moments about steer axle solve drive axle weight, steer = tractor weight + kingpin reaction - drive. Conservation law (steer + drive + trailer = GVW) always holds. Added `steerAxlePosition` field to `AxleConfiguration` interface (required). Updated all 18 entries in `DEFAULT_AXLE_CONFIGS` with steer positions (standard: -17 ft, heavy haul: -20 ft, specialized: -18 ft). Added `TRACTOR_CG_RATIO = 0.6` constant. Added SPMT special case (powerUnitWeight=0 → all weight on trailer axles). Added 6 new warning checks in `scoreWeightDistribution()`: negative axle weight (3 checks, -40 score each), low steer axle <10k lbs (-20 score), any axle <5% of GVW (3 checks, -10 score each). Removed old `Math.max(0, ...)` clamping that broke conservation. | `types.ts`, `weight-distribution.ts` | TypeScript compiles clean. Pre-existing test errors unchanged. The old model also had an inconsistent moment reference point bug (cargo moment about kingpin, trailer moment about drive axle) — this is now fixed by the clean 2-beam decomposition. The `steerAxlePosition` field is now required on `AxleConfiguration` — no external code constructs this interface (only `DEFAULT_AXLE_CONFIGS` and function parameters that pass through from it). |
| 4 | 2026-01-28 | P1-03 | Replaced silent (0,0) fallback placement with explicit `failed: true` marking. Added `failed?: boolean` to `ItemPlacement` and `ItemPlacement3D` interfaces. Fixed `canFitOnTruck()` — was broken because fallback always produced a placement, so count check always passed; now also checks `!placements.some(p => p.failed)`. Fixed `rebalanceLoads()` merge verification with same pattern. Added per-load warnings when placements fail ("manual arrangement required"). Updated `TrailerDiagram.tsx` with red hatched pattern, "NOT PLACED" label, and dashed stroke for failed items in both top and side views. Updated `LoadPlanVisualizer.tsx` item list with red "Not placed" badge. `failed` flag propagates automatically to 3D placements via spread operator. | `types.ts`, `load-planner.ts`, `TrailerDiagram.tsx`, `LoadPlanVisualizer.tsx` | TypeScript compiles clean. Pre-existing test errors in unrelated files (permissions.test.ts, errors.test.ts) unchanged. The secondary fix to `canFitOnTruck()` is arguably the more impactful change — it was a broken verification that allowed items to be "placed" even when they didn't physically fit. |
| 3 | 2026-01-27 | P1-02 | Added `powerUnitWeight` field to `TruckType` interface and all 62 truck definitions (hotshot=9000, SPMT=0, heavy haul=20000, standard=17000). Replaced all `LEGAL_LIMITS.TRACTOR_WEIGHT` references in GVW calculations with `truck.powerUnitWeight`. Updated `truck-type-converter.ts` to derive power unit weight from category/name for DB-backed trucks. Fixed `QuotePDFTemplate.tsx` inline truck objects. | `types.ts`, `trucks.ts`, `load-planner.ts`, `truck-selector.ts`, `weight-distribution.ts`, `cost-optimizer.ts`, `escort-calculator.ts`, `route-validator.ts`, `truck-type-converter.ts`, `QuotePDFTemplate.tsx` | TypeScript compiles clean. `LEGAL_LIMITS.TRACTOR_WEIGHT` kept as fallback default. |
| 2 | 2026-01-27 | P1-01 | Standardized all monetary values to cents. Created shared `ESCORT_COSTS` and `PERMIT_BASE_COSTS_CENTS` constants in types.ts. Converted `escort-calculator.ts`, `cost-optimizer.ts`, `permit-calculator.ts` from dollars to cents. Updated `DEFAULT_COST_DATA.dailyCost` → `dailyCostCents`. Updated `PlanningOptions.fuelPrice` to cents. Fixed all display formatting in `load-planner.ts` and `PlanComparisonPanel.tsx` to divide by 100. | `types.ts`, `escort-calculator.ts`, `cost-optimizer.ts`, `permit-calculator.ts`, `load-planner.ts`, `PlanComparisonPanel.tsx` | TypeScript compiles clean. State permit data still in dollars internally — converted at boundary in permit-calculator. |
| 1 | 2026-01-27 | -- | Initial audit completed. 45 issues documented across 5 phases. Created progress tracker and 5 phase detail files. | `docs/Load Planner upgrade/*` (new files) | No code changes. Audit only. |

---

## Decisions & Notes

> Record any decisions made during implementation that future sessions should know about.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-27 | Fix P1-01 (unit mismatch) before all other issues | Any cost-related fix built on top of mismatched units would itself be wrong. This is the foundation. |
| 2026-01-27 | Phase order: Safety → Cost → Algorithm → Data → Advanced | Safety/DOT issues carry legal risk. Cost issues affect revenue. Algorithm issues affect UX. Data issues are incremental improvements. |
| 2026-01-27 | Standardize all monetary values to cents (integers) | Matches database schema, avoids floating-point rounding, consistent with existing quote system. |
| 2026-01-28 | Use 2-beam pin-jointed model (not fixed steer ratio) for axle weights | A fixed 33% steer ratio ignores load position entirely, making steer weight constant regardless of cargo placement. The 2-beam model correctly computes all 3 axle groups from physics, conserves total weight, and naturally produces negative values for impossible configurations (which are then flagged as warnings). |
