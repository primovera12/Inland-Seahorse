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
>
> ### What We Learned During Audit
> - The codebase is well-architected with clean module separation
> - 54 truck types with accurate specs (only 1 data error found: Dry Van 53' maxLegalCargoHeight)
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

### Current Focus
> **Next up:** Phase 1, Issue P1-04 — Drive axle weight can go negative
> **Phase file:** `phase-1-safety-compliance.md` → Section P1-04
> **Why next:** When cargo is positioned far rear, the steer axle subtraction can produce negative drive axle weights — physically impossible and breaks weight distribution scoring.

---

## Summary Statistics

| Phase | Description | Issues | Done | Remaining | Status |
|-------|-------------|--------|------|-----------|--------|
| 1 | Safety & DOT Compliance | 9 | 3 | 6 | In Progress |
| 2 | Cost Accuracy | 5 | 0 | 5 | Not Started |
| 3 | Algorithm Correctness | 7 | 0 | 7 | Not Started |
| 4 | Data & Coverage | 10 | 0 | 10 | Not Started |
| 5 | Advanced Compliance | 7 | 0 | 7 | Not Started |
| -- | Minor / Polish | 7 | 0 | 7 | Not Started |
| **Total** | | **45** | **3** | **42** | |

---

## Phase 1: Safety & DOT Compliance

| ID | Issue | Severity | File(s) | Line(s) | Status |
|----|-------|----------|---------|---------|--------|
| P1-01 | Dollar vs cents unit mismatch in escort costs | CRITICAL | `escort-calculator.ts`, `permit-calculator.ts` | 21-24, 27-29 | [x] Done |
| P1-02 | Hotshot tractor weight uses semi weight (17k vs 9k) | CRITICAL | `load-planner.ts`, `truck-selector.ts`, `types.ts` | 316 | [x] Done |
| P1-03 | Fallback placement at (0,0) creates overlapping cargo | CRITICAL | `load-planner.ts`, `types.ts`, `TrailerDiagram.tsx`, `LoadPlanVisualizer.tsx` | 154-161 | [x] Done |
| P1-04 | Drive axle weight can go negative | CRITICAL | `weight-distribution.ts` | 71-77 | [ ] Not Started |
| P1-05 | Tridem axle limit formula wrong (8k vs 5.5k per axle) | CRITICAL | `weight-distribution.ts` | 161-162 | [ ] Not Started |
| P1-06 | WLL not adjusted for tie-down angle (DOT 49 CFR 393) | CRITICAL | `securement-planner.ts` | 251-252 | [ ] Not Started |
| P1-07 | HOS 70-hour/8-day cycle not enforced | CRITICAL | `hos-validator.ts` | 201-230 | [ ] Not Started |
| P1-08 | Grid boundary overflow in stacking engine | CRITICAL | `stacking-engine.ts` | 115-118 | [ ] Not Started |
| P1-09 | Dry Van 53' maxLegalCargoHeight wrong (9.0 vs 9.5) | CRITICAL | `trucks.ts` | 633 | [ ] Not Started |

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
