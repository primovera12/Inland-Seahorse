/**
 * Bridge Formula B Validation Module
 *
 * Federal Bridge Formula B (23 CFR 658.17) governs the maximum weight
 * allowed on any group of consecutive axles based on the number of axles
 * and the spacing between the outermost axles of the group.
 *
 * Formula: W = 500 × ((L × N / (N-1)) + 12N + 36)
 *   W = maximum weight in pounds
 *   L = distance in feet between outer axles of the group
 *   N = number of axles in the group
 *
 * Additionally, the formula cannot exceed 80,000 lbs gross for
 * standard (non-permit) vehicles on interstate highways.
 */

import {
  AxleWeights,
  AxleConfiguration,
  TruckType,
  BridgeFormulaCheck,
  BridgeFormulaResult,
  DEFAULT_AXLE_CONFIGS,
  AXLE_LIMITS,
} from './types'

export type { BridgeFormulaCheck, BridgeFormulaResult }

// ============================================================================
// TYPES
// ============================================================================

export interface AxlePosition {
  position: number      // feet from reference point (kingpin = 0)
  group: 'steer' | 'drive' | 'trailer'
  weight: number        // weight on this individual axle (lbs)
}

// ============================================================================
// BRIDGE FORMULA B CALCULATION
// ============================================================================

/**
 * Calculate the maximum weight allowed by Bridge Formula B
 * for a group of N axles spaced L feet apart.
 *
 * W = 500 × ((L × N / (N-1)) + 12N + 36)
 *
 * Special cases:
 * - N < 2: formula undefined (single axle uses per-axle limit)
 * - L <= 0: invalid spacing, returns 0
 */
export function calculateBridgeFormulaLimit(
  axleCount: number,
  outerAxleSpacing: number
): number {
  if (axleCount < 2) {
    return AXLE_LIMITS.SINGLE_AXLE
  }

  if (outerAxleSpacing <= 0) {
    return 0
  }

  const N = axleCount
  const L = outerAxleSpacing

  const W = 500 * ((L * N / (N - 1)) + 12 * N + 36)

  return Math.round(W)
}

// ============================================================================
// AXLE POSITION COMPUTATION
// ============================================================================

/**
 * Compute individual axle positions from an AxleConfiguration.
 *
 * Returns sorted array of individual axle positions with their group
 * membership and allocated weight.
 *
 * Axle groups are expanded from their center position:
 * - Steer: 1 axle at steerAxlePosition
 * - Drive: numberOfDriveAxles axles centered at driveAxlePosition
 *          spread evenly across driveAxleSpread
 * - Trailer: numberOfTrailerAxles axles centered at trailerAxlePosition
 *            spread evenly across trailerAxleSpread
 */
export function getAxlePositions(
  config: AxleConfiguration,
  axleWeights: AxleWeights
): AxlePosition[] {
  const positions: AxlePosition[] = []

  // Steer axle (always 1)
  // SPMT (powerUnitWeight=0) has steerAxle=0 — skip steer/drive
  if (axleWeights.steerAxle !== 0 || axleWeights.driveAxle !== 0) {
    positions.push({
      position: config.steerAxlePosition,
      group: 'steer',
      weight: axleWeights.steerAxle,
    })
  }

  // Drive axles
  const numDriveAxles = config.numberOfDriveAxles || 2
  const driveSpread = config.driveAxleSpread || 4.33 // ~52" typical tandem spacing
  const driveWeightPerAxle = axleWeights.driveAxle / numDriveAxles

  if (axleWeights.driveAxle !== 0) {
    if (numDriveAxles === 1) {
      positions.push({
        position: config.driveAxlePosition,
        group: 'drive',
        weight: driveWeightPerAxle,
      })
    } else {
      const startOffset = -driveSpread / 2
      const step = driveSpread / (numDriveAxles - 1)
      for (let i = 0; i < numDriveAxles; i++) {
        positions.push({
          position: config.driveAxlePosition + startOffset + i * step,
          group: 'drive',
          weight: driveWeightPerAxle,
        })
      }
    }
  }

  // Trailer axles
  const numTrailerAxles = config.numberOfTrailerAxles || 2
  const trailerSpread = config.trailerAxleSpread || 4.25 // ~51" typical tandem spacing
  const trailerWeightPerAxle = axleWeights.trailerAxles / numTrailerAxles

  if (numTrailerAxles === 1) {
    positions.push({
      position: config.trailerAxlePosition,
      group: 'trailer',
      weight: trailerWeightPerAxle,
    })
  } else {
    const startOffset = -trailerSpread / 2
    const step = trailerSpread / (numTrailerAxles - 1)
    for (let i = 0; i < numTrailerAxles; i++) {
      positions.push({
        position: config.trailerAxlePosition + startOffset + i * step,
        group: 'trailer',
        weight: trailerWeightPerAxle,
      })
    }
  }

  // Sort by position (front to rear)
  positions.sort((a, b) => a.position - b.position)

  return positions
}

/**
 * Get total number of axles from an AxleConfiguration.
 */
export function getTotalAxleCount(config: AxleConfiguration): number {
  const steerAxles = 1
  const driveAxles = config.numberOfDriveAxles || 2
  const trailerAxles = config.numberOfTrailerAxles || 2
  return steerAxles + driveAxles + trailerAxles
}

// ============================================================================
// BRIDGE FORMULA VALIDATION
// ============================================================================

/**
 * Validate all consecutive axle groups against Bridge Formula B.
 *
 * Checks every possible group of 2 or more consecutive axles.
 * For a 5-axle vehicle, this checks groups of size 2, 3, 4, and 5
 * at every starting position.
 */
export function validateBridgeFormula(
  axleWeights: AxleWeights,
  truck: TruckType,
  axleConfig?: AxleConfiguration
): BridgeFormulaResult {
  const config = axleConfig || DEFAULT_AXLE_CONFIGS[truck.category]
  const positions = getAxlePositions(config, axleWeights)

  const checks: BridgeFormulaCheck[] = []
  const warnings: string[] = []

  // Skip validation for self-propelled (SPMT) — no tractor axles, specialized multi-axle
  if (truck.powerUnitWeight === 0) {
    return { passes: true, checks: [], violations: [], warnings: [], worstMarginPercent: 100 }
  }

  // Need at least 2 axles for Bridge Formula
  if (positions.length < 2) {
    return { passes: true, checks: [], violations: [], warnings: [], worstMarginPercent: 100 }
  }

  // Check all consecutive groups of 2+ axles
  for (let start = 0; start < positions.length; start++) {
    for (let end = start + 1; end < positions.length; end++) {
      const groupAxles = positions.slice(start, end + 1)
      const axleCount = groupAxles.length
      const outerSpacing = groupAxles[groupAxles.length - 1].position - groupAxles[0].position

      // Skip groups with zero or negative spacing
      if (outerSpacing <= 0) continue

      const actualWeight = groupAxles.reduce((sum, a) => sum + a.weight, 0)
      const allowedWeight = calculateBridgeFormulaLimit(axleCount, outerSpacing)

      // Describe the group by which axle groups are represented
      const groups = new Set(groupAxles.map(a => a.group))
      const groupNames = Array.from(groups).join(' + ')
      const groupDescription = `${groupNames} (${axleCount} axles, ${outerSpacing.toFixed(1)}' spacing)`

      checks.push({
        axleCount,
        outerSpacing,
        actualWeight: Math.round(actualWeight),
        allowedWeight,
        passes: actualWeight <= allowedWeight,
        margin: Math.round(allowedWeight - actualWeight),
        groupDescription,
      })
    }
  }

  const violations = checks.filter(c => !c.passes)

  for (const v of violations) {
    const overBy = v.actualWeight - v.allowedWeight
    warnings.push(
      `Bridge Formula B violation: ${v.groupDescription} — ` +
      `${v.actualWeight.toLocaleString()} lbs exceeds limit of ${v.allowedWeight.toLocaleString()} lbs ` +
      `(over by ${overBy.toLocaleString()} lbs)`
    )
  }

  // Warn when within 5% of a limit
  for (const c of checks) {
    if (c.passes && c.allowedWeight > 0) {
      const marginPercent = (c.margin / c.allowedWeight) * 100
      if (marginPercent < 5) {
        warnings.push(
          `Bridge Formula B near limit: ${c.groupDescription} — ` +
          `${c.actualWeight.toLocaleString()} lbs is within ${marginPercent.toFixed(1)}% of ` +
          `${c.allowedWeight.toLocaleString()} lb limit`
        )
      }
    }
  }

  // Calculate worst margin as percentage of allowed
  let worstMarginPercent = 100
  for (const c of checks) {
    if (c.allowedWeight > 0) {
      const marginPercent = (c.margin / c.allowedWeight) * 100
      if (marginPercent < worstMarginPercent) {
        worstMarginPercent = marginPercent
      }
    }
  }

  return {
    passes: violations.length === 0,
    checks,
    violations,
    warnings,
    worstMarginPercent: Math.round(worstMarginPercent * 10) / 10,
  }
}
