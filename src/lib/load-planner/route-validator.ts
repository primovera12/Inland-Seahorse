/**
 * Route Validator Module
 * Comprehensive route restriction checking for oversize/overweight loads.
 *
 * Identifies:
 * - Bridge weight limits
 * - Tunnel hazmat prohibitions
 * - Low clearances (uses bridge-heights.ts)
 * - Road width restrictions
 * - Seasonal restrictions (uses seasonal-restrictions.ts)
 *
 * Features:
 * - Route restriction checking
 * - Seasonal restriction awareness
 * - Alternative route suggestions
 * - Hazmat tunnel prohibitions
 */

import type { LatLng } from './route-calculator'
import { calculateDistance } from './route-calculator'
import {
  LOW_CLEARANCE_BRIDGES,
  checkBridgeClearance,
  findNearbyBridges,
  checkRouteBridgeClearances,
  type LowClearanceBridge,
} from './bridge-heights'
import {
  hasSeasonalRestrictions,
  getSeasonalRestriction,
  checkRouteSeasonalRestrictions,
  calculateAdjustedWeightLimits,
  type SeasonalRestriction,
} from './seasonal-restrictions'
import type { LoadItem, TruckType } from './types'
import { LEGAL_LIMITS } from './types'

// ============================================================================
// TYPES
// ============================================================================

export type RestrictionType =
  | 'bridge_weight'
  | 'tunnel_hazmat'
  | 'low_clearance'
  | 'road_width'
  | 'seasonal'

export interface RouteRestriction {
  type: RestrictionType
  location: LatLng
  description: string
  limit?: number // Weight in lbs, height in feet, width in feet
  severity: 'blocking' | 'warning'
  alternative?: string
}

export interface AlternateRoute {
  description: string
  addedMiles: number
  addedTime: number // minutes
}

export interface RouteValidation {
  isValid: boolean
  restrictions: RouteRestriction[]
  alternateRoutes: AlternateRoute[]
}

interface LoadDimensions {
  width: number
  height: number
  length: number
  weight: number
  hasHazmat: boolean
}

// ============================================================================
// TUNNEL HAZMAT RESTRICTIONS
// ============================================================================

/**
 * Known tunnels with hazmat prohibitions
 * These tunnels prohibit hazardous materials due to ventilation and safety concerns
 */
export const HAZMAT_TUNNELS: RouteRestriction[] = [
  {
    type: 'tunnel_hazmat',
    location: { lat: 40.7267, lng: -74.0114 },
    description: 'Holland Tunnel - No hazmat permitted',
    severity: 'blocking',
    alternative: 'Use George Washington Bridge or Outerbridge Crossing',
  },
  {
    type: 'tunnel_hazmat',
    location: { lat: 40.7498, lng: -74.0024 },
    description: 'Lincoln Tunnel - No hazmat permitted',
    severity: 'blocking',
    alternative: 'Use George Washington Bridge',
  },
  {
    type: 'tunnel_hazmat',
    location: { lat: 42.3663, lng: -71.0545 },
    description: 'Ted Williams Tunnel (I-90) - No hazmat permitted',
    severity: 'blocking',
    alternative: 'Use Tobin Bridge or Route 1A',
  },
  {
    type: 'tunnel_hazmat',
    location: { lat: 42.3629, lng: -71.0621 },
    description: 'Callahan Tunnel - No hazmat permitted',
    severity: 'blocking',
    alternative: 'Use Tobin Bridge',
  },
  {
    type: 'tunnel_hazmat',
    location: { lat: 39.2633, lng: -76.5706 },
    description: 'Baltimore Harbor Tunnel (I-895) - No hazmat permitted',
    severity: 'blocking',
    alternative: 'Use I-695 Key Bridge bypass',
  },
  {
    type: 'tunnel_hazmat',
    location: { lat: 39.2189, lng: -76.5297 },
    description: 'Fort McHenry Tunnel (I-95) - No hazmat permitted',
    severity: 'blocking',
    alternative: 'Use I-695 bypass',
  },
  {
    type: 'tunnel_hazmat',
    location: { lat: 36.8899, lng: -76.2547 },
    description: 'Hampton Roads Bridge-Tunnel - Hazmat restricted',
    severity: 'blocking',
    alternative: 'Use Monitor-Merrimac or Chesapeake Bay Bridge-Tunnel (with escort)',
  },
  {
    type: 'tunnel_hazmat',
    location: { lat: 36.9587, lng: -76.3181 },
    description: 'Monitor-Merrimac Bridge-Tunnel - Hazmat restricted',
    severity: 'blocking',
    alternative: 'Use I-664 with advance coordination',
  },
  {
    type: 'tunnel_hazmat',
    location: { lat: 37.0176, lng: -76.0632 },
    description: 'Chesapeake Bay Bridge-Tunnel - Hazmat restricted during high winds',
    severity: 'warning',
    alternative: 'Check with CBBT authority before crossing',
  },
  {
    type: 'tunnel_hazmat',
    location: { lat: 47.6009, lng: -122.3092 },
    description: 'SR 99 Tunnel (Seattle) - Hazmat restricted',
    severity: 'blocking',
    alternative: 'Use I-5 or SR 99 surface streets',
  },
  {
    type: 'tunnel_hazmat',
    location: { lat: 39.6795, lng: -105.9114 },
    description: 'Eisenhower-Johnson Memorial Tunnel (I-70) - Hazmat prohibited',
    severity: 'blocking',
    alternative: 'Use US-6 Loveland Pass (weather and weight permitting)',
  },
  {
    type: 'tunnel_hazmat',
    location: { lat: 37.8573, lng: -122.1825 },
    description: 'Caldecott Tunnel (SR-24) - Hazmat restricted',
    severity: 'warning',
    alternative: 'Check with Caltrans for specific materials',
  },
]

// ============================================================================
// BRIDGE WEIGHT RESTRICTIONS
// ============================================================================

/**
 * Known bridges with weight restrictions
 * These are major crossings with posted weight limits
 */
export const WEIGHT_RESTRICTED_BRIDGES: RouteRestriction[] = [
  {
    type: 'bridge_weight',
    location: { lat: 29.7604, lng: -95.3698 },
    description: 'Houston Ship Channel Bridge - 80,000 lb limit',
    limit: 80000,
    severity: 'blocking',
    alternative: 'Coordinate with bridge authority for overweight permits',
  },
  {
    type: 'bridge_weight',
    location: { lat: 39.9526, lng: -75.1652 },
    description: 'Benjamin Franklin Bridge - Posted 80,000 lb limit',
    limit: 80000,
    severity: 'warning',
    alternative: 'Coordinate with DRPA for overweight crossings',
  },
  {
    type: 'bridge_weight',
    location: { lat: 40.6892, lng: -74.0445 },
    description: 'Bayonne Bridge - Check current posted limit',
    limit: 80000,
    severity: 'warning',
    alternative: 'Use Goethals Bridge or Outerbridge Crossing',
  },
  {
    type: 'bridge_weight',
    location: { lat: 42.3554, lng: -83.0658 },
    description: 'Ambassador Bridge (US-Canada) - Check posted limits',
    limit: 80000,
    severity: 'warning',
    alternative: 'Blue Water Bridge for superloads',
  },
  {
    type: 'bridge_weight',
    location: { lat: 37.8199, lng: -122.4783 },
    description: 'Golden Gate Bridge - 80,000 lb limit',
    limit: 80000,
    severity: 'blocking',
    alternative: 'Contact Golden Gate Bridge District for overweight permits',
  },
  {
    type: 'bridge_weight',
    location: { lat: 37.7966, lng: -122.3753 },
    description: 'Bay Bridge - Posted weight limits vary by span',
    limit: 80000,
    severity: 'warning',
    alternative: 'Contact Caltrans for superload coordination',
  },
  {
    type: 'bridge_weight',
    location: { lat: 38.5749, lng: -121.5068 },
    description: 'Tower Bridge (Sacramento) - Check posted limit',
    limit: 80000,
    severity: 'warning',
    alternative: 'Use I-80 or US-50 crossings',
  },
  {
    type: 'bridge_weight',
    location: { lat: 40.8176, lng: -73.9456 },
    description: 'George Washington Bridge - Weight restrictions for lower level',
    limit: 80000,
    severity: 'warning',
    alternative: 'Use upper level for heavy loads with permit',
  },
]

// ============================================================================
// ROAD WIDTH RESTRICTIONS
// ============================================================================

/**
 * Known road width restrictions
 * Areas where road geometry limits oversize loads
 */
export const WIDTH_RESTRICTED_ROADS: RouteRestriction[] = [
  {
    type: 'road_width',
    location: { lat: 35.6762, lng: -105.9378 },
    description: 'NM-14 Turquoise Trail - Narrow curves, 12\' max width',
    limit: 12,
    severity: 'warning',
    alternative: 'Use I-25',
  },
  {
    type: 'road_width',
    location: { lat: 36.2089, lng: -112.0391 },
    description: 'Grand Canyon South Rim Roads - Limited oversize access',
    limit: 10,
    severity: 'warning',
    alternative: 'Coordinate with NPS for oversize deliveries',
  },
  {
    type: 'road_width',
    location: { lat: 37.7749, lng: -122.4194 },
    description: 'San Francisco City Streets - 8\'6" width limit on many streets',
    limit: 8.5,
    severity: 'warning',
    alternative: 'Use designated truck routes',
  },
  {
    type: 'road_width',
    location: { lat: 40.7128, lng: -74.006 },
    description: 'Manhattan Streets - Restricted oversize access',
    limit: 10,
    severity: 'warning',
    alternative: 'Use designated truck routes and off-peak hours',
  },
  {
    type: 'road_width',
    location: { lat: 42.3601, lng: -71.0589 },
    description: 'Boston Historic Districts - Narrow streets',
    limit: 10,
    severity: 'warning',
    alternative: 'Use designated truck routes',
  },
  {
    type: 'road_width',
    location: { lat: 29.9511, lng: -90.0715 },
    description: 'New Orleans French Quarter - Narrow historic streets',
    limit: 8,
    severity: 'blocking',
    alternative: 'Use I-10 and designated delivery routes',
  },
]

// ============================================================================
// COMBINED RESTRICTIONS DATABASE
// ============================================================================

/**
 * All known route restrictions combined
 */
export const KNOWN_RESTRICTIONS: RouteRestriction[] = [
  ...HAZMAT_TUNNELS,
  ...WEIGHT_RESTRICTED_BRIDGES,
  ...WIDTH_RESTRICTED_ROADS,
]

// ============================================================================
// RESTRICTION CHECKING FUNCTIONS
// ============================================================================

/**
 * Find restrictions near a coordinate (within radius in miles)
 */
export function findNearbyRestrictions(
  lat: number,
  lng: number,
  radiusMiles: number = 50
): RouteRestriction[] {
  return KNOWN_RESTRICTIONS.filter((restriction) => {
    const distance = calculateDistance(
      { lat, lng },
      restriction.location
    )
    return distance <= radiusMiles
  })
}

/**
 * Check bridge weight restrictions along route
 */
export function checkBridgeWeights(
  restrictions: RouteRestriction[],
  grossWeight: number
): RouteRestriction[] {
  return restrictions
    .filter((r) => r.type === 'bridge_weight')
    .filter((r) => {
      if (r.limit === undefined) return false
      return grossWeight > r.limit
    })
    .map((r) => ({
      ...r,
      description: `${r.description} - Your load (${grossWeight.toLocaleString()} lbs) exceeds limit`,
    }))
}

/**
 * Check tunnel hazmat restrictions
 */
export function checkTunnelRestrictions(
  restrictions: RouteRestriction[],
  hasHazmat: boolean
): RouteRestriction[] {
  if (!hasHazmat) return []

  return restrictions.filter((r) => r.type === 'tunnel_hazmat')
}

/**
 * Check low clearance restrictions using bridge-heights.ts data
 */
export function checkClearances(
  routePoints: LatLng[],
  totalHeight: number
): RouteRestriction[] {
  const result = checkRouteBridgeClearances(routePoints, totalHeight)

  return result.bridges
    .filter((b) => b.clearanceResult.severity === 'danger' || b.clearanceResult.severity === 'warning')
    .map((b) => ({
      type: 'low_clearance' as RestrictionType,
      location: b.bridge.coordinates,
      description: b.clearanceResult.clears
        ? `${b.bridge.name} - Only ${b.clearanceResult.clearance}' clearance (load height ${totalHeight}')`
        : `${b.bridge.name} - Your load (${totalHeight}') exceeds ${b.bridge.clearanceHeight}' clearance`,
      limit: b.bridge.clearanceHeight,
      severity: b.clearanceResult.clears ? ('warning' as const) : ('blocking' as const),
      alternative: b.bridge.alternateRoute,
    }))
}

/**
 * Check road width restrictions
 */
export function checkRoadWidths(
  restrictions: RouteRestriction[],
  loadWidth: number
): RouteRestriction[] {
  return restrictions
    .filter((r) => r.type === 'road_width')
    .filter((r) => {
      if (r.limit === undefined) return false
      return loadWidth > r.limit
    })
    .map((r) => ({
      ...r,
      description: `${r.description} - Your load (${loadWidth.toFixed(1)}') exceeds width limit`,
    }))
}

/**
 * Get seasonal restrictions for route states
 */
export function getSeasonalRestrictionsForRoute(
  routeStates: string[],
  loadWeight: number,
  date: Date = new Date()
): RouteRestriction[] {
  const result = checkRouteSeasonalRestrictions(routeStates, date)
  const restrictions: RouteRestriction[] = []

  for (const state of result.affectedStates) {
    const adjustedMax = state.maxGrossWeight
      || 80000 * (1 - state.weightReductionPercent / 100)

    if (loadWeight > adjustedMax) {
      restrictions.push({
        type: 'seasonal',
        location: { lat: 0, lng: 0 }, // Statewide restriction
        description: `${state.stateName} ${state.restrictionName}: Weight reduced to ${adjustedMax.toLocaleString()} lbs`,
        limit: adjustedMax,
        severity: 'warning',
        alternative: state.permitAvailable
          ? `Permits available ($${state.permitFee || 'varies'}) - check ${state.checkWebsite || 'state DOT'}`
          : 'Plan loads during non-restricted periods or use exempt routes',
      })
    }
  }

  return restrictions
}

// ============================================================================
// ALTERNATE ROUTE SUGGESTIONS
// ============================================================================

/**
 * Estimate added miles for bypassing a restriction type
 */
function estimateAddedMiles(restrictionType: RestrictionType): number {
  switch (restrictionType) {
    case 'tunnel_hazmat':
      return 20
    case 'low_clearance':
      return 10
    case 'bridge_weight':
      return 25
    case 'road_width':
      return 15
    case 'seasonal':
      return 0
    default:
      return 10
  }
}

/**
 * Estimate added time (minutes) for bypassing a restriction
 */
function estimateAddedTime(restrictionType: RestrictionType): number {
  switch (restrictionType) {
    case 'tunnel_hazmat':
      return 40
    case 'low_clearance':
      return 20
    case 'bridge_weight':
      return 45
    case 'road_width':
      return 30
    case 'seasonal':
      return 0
    default:
      return 20
  }
}

/**
 * Suggest alternate routes based on restrictions
 */
export function suggestAlternateRoutes(
  restrictions: RouteRestriction[]
): AlternateRoute[] {
  const alternates: AlternateRoute[] = []
  const seenAlternatives = new Set<string>()

  for (const restriction of restrictions) {
    if (restriction.alternative && !seenAlternatives.has(restriction.alternative)) {
      seenAlternatives.add(restriction.alternative)
      alternates.push({
        description: restriction.alternative,
        addedMiles: estimateAddedMiles(restriction.type),
        addedTime: estimateAddedTime(restriction.type),
      })
    }
  }

  // Generic alternatives for common restriction types
  if (
    restrictions.some((r) => r.type === 'tunnel_hazmat') &&
    !seenAlternatives.has('tunnel_bypass')
  ) {
    alternates.push({
      description: 'Use surface routes to bypass tunnels (hazmat)',
      addedMiles: 15,
      addedTime: 30,
    })
  }

  if (
    restrictions.some((r) => r.type === 'low_clearance') &&
    !seenAlternatives.has('clearance_bypass')
  ) {
    alternates.push({
      description: 'Use interstate/highway with adequate clearance',
      addedMiles: 10,
      addedTime: 20,
    })
  }

  return alternates
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate a route for a load - main entry point
 */
export function validateRoute(
  items: LoadItem[],
  truck: TruckType,
  routeStates: string[],
  date: Date = new Date(),
  waypoints?: LatLng[]
): RouteValidation {
  // Calculate load dimensions
  const maxWidth = Math.max(...items.map((i) => Math.max(i.width, i.length)))
  const maxHeight = Math.max(...items.map((i) => i.height))
  const totalHeight = maxHeight + (truck.deckHeight || 0)
  const totalWeight = items.reduce((sum, i) => sum + i.weight * (i.quantity || 1), 0)
  const grossWeight = totalWeight + (truck.tareWeight || 0) + (truck.powerUnitWeight ?? LEGAL_LIMITS.TRACTOR_WEIGHT)
  const hasHazmat = items.some((i) => i.hazmat)

  // Collect all restrictions to check
  let restrictionsToCheck: RouteRestriction[] = []

  // If waypoints provided, find nearby restrictions
  if (waypoints && waypoints.length > 0) {
    for (const wp of waypoints) {
      const nearby = findNearbyRestrictions(wp.lat, wp.lng, 30)
      restrictionsToCheck.push(...nearby)
    }
    // Deduplicate
    restrictionsToCheck = restrictionsToCheck.filter(
      (r, i, arr) => arr.findIndex((r2) => r2.description === r.description) === i
    )
  } else {
    // Use all known restrictions
    restrictionsToCheck = KNOWN_RESTRICTIONS
  }

  // Check each type of restriction
  const violations: RouteRestriction[] = []

  // Weight restrictions
  violations.push(...checkBridgeWeights(restrictionsToCheck, grossWeight))

  // Hazmat tunnel restrictions
  violations.push(...checkTunnelRestrictions(restrictionsToCheck, hasHazmat))

  // Clearance restrictions (uses bridge-heights.ts)
  if (waypoints && waypoints.length > 0) {
    violations.push(...checkClearances(waypoints, totalHeight))
  }

  // Road width restrictions
  violations.push(...checkRoadWidths(restrictionsToCheck, maxWidth))

  // Seasonal restrictions (uses seasonal-restrictions.ts)
  violations.push(...getSeasonalRestrictionsForRoute(routeStates, grossWeight, date))

  // Determine if route is valid
  const hasBlockingRestriction = violations.some((r) => r.severity === 'blocking')

  // Suggest alternates
  const alternateRoutes = suggestAlternateRoutes(violations)

  return {
    isValid: !hasBlockingRestriction,
    restrictions: violations,
    alternateRoutes,
  }
}

/**
 * Quick validation without full route analysis
 */
export function quickValidateRoute(
  loadDimensions: LoadDimensions,
  routeStates: string[],
  date: Date = new Date()
): RouteValidation {
  const violations: RouteRestriction[] = []

  // Check seasonal restrictions
  violations.push(
    ...getSeasonalRestrictionsForRoute(routeStates, loadDimensions.weight, date)
  )

  // Check all hazmat tunnels if load has hazmat
  if (loadDimensions.hasHazmat) {
    violations.push(...HAZMAT_TUNNELS)
  }

  // Check all weight-restricted bridges
  violations.push(...checkBridgeWeights(WEIGHT_RESTRICTED_BRIDGES, loadDimensions.weight))

  // Check all width-restricted roads
  violations.push(...checkRoadWidths(WIDTH_RESTRICTED_ROADS, loadDimensions.width))

  const hasBlockingRestriction = violations.some((r) => r.severity === 'blocking')
  const alternateRoutes = suggestAlternateRoutes(violations)

  return {
    isValid: !hasBlockingRestriction,
    restrictions: violations,
    alternateRoutes,
  }
}

// ============================================================================
// QUICK CHECKS
// ============================================================================

/**
 * Quick check if a load can use tunnels (no hazmat)
 */
export function canUseTunnels(items: LoadItem[]): boolean {
  return !items.some((i) => i.hazmat)
}

/**
 * Quick check if a load fits standard clearance (13.5')
 */
export function fitsStandardClearance(
  items: LoadItem[],
  truck: TruckType
): boolean {
  const maxHeight = Math.max(...items.map((i) => i.height))
  const totalHeight = maxHeight + (truck.deckHeight || 0)
  return totalHeight <= LEGAL_LIMITS.HEIGHT
}

/**
 * Check if route has seasonal restrictions active
 */
export function routeHasSeasonalRestrictions(
  routeStates: string[],
  date: Date = new Date()
): boolean {
  return routeStates.some((state) => hasSeasonalRestrictions(state, date))
}

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

/**
 * Generate a route validation summary
 */
export function generateRouteValidationSummary(validation: RouteValidation): string[] {
  const lines: string[] = []

  lines.push('Route Validation')
  lines.push('─────────────────────────────')

  if (validation.isValid) {
    lines.push('✓ Route is clear for this load')
  } else {
    lines.push('✗ Route has blocking restrictions')
  }

  if (validation.restrictions.length > 0) {
    lines.push('')
    lines.push(`Found ${validation.restrictions.length} restriction(s):`)

    for (const restriction of validation.restrictions) {
      const icon = restriction.severity === 'blocking' ? '🚫' : '⚠️'
      lines.push(`${icon} ${restriction.description}`)
    }
  }

  if (validation.alternateRoutes.length > 0) {
    lines.push('')
    lines.push('Suggested Alternatives:')

    for (const alt of validation.alternateRoutes) {
      lines.push(`  • ${alt.description}`)
      if (alt.addedMiles > 0) {
        lines.push(`    (+${alt.addedMiles} miles, +${alt.addedTime} min)`)
      }
    }
  }

  return lines
}

/**
 * Get restriction counts by type
 */
export function getRestrictionCounts(restrictions: RouteRestriction[]): Record<RestrictionType, number> {
  return {
    bridge_weight: restrictions.filter((r) => r.type === 'bridge_weight').length,
    tunnel_hazmat: restrictions.filter((r) => r.type === 'tunnel_hazmat').length,
    low_clearance: restrictions.filter((r) => r.type === 'low_clearance').length,
    road_width: restrictions.filter((r) => r.type === 'road_width').length,
    seasonal: restrictions.filter((r) => r.type === 'seasonal').length,
  }
}
