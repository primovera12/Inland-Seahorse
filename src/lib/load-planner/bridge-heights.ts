/**
 * Bridge Heights Database for Load Planner
 *
 * Database of known low clearance bridges, tunnels, and overpasses
 * that pose hazards for oversize loads.
 *
 * Note: This is a curated list of notorious problem spots.
 * For comprehensive clearance data, commercial routing services
 * (PC*MILER, ALK Maps, etc.) should be consulted.
 */

import type { LatLng } from './route-calculator'
import { calculateDistance } from './route-calculator'

export interface LowClearanceBridge {
  id: string
  name: string
  location: string
  state: string
  highway: string
  clearanceHeight: number // feet
  coordinates: LatLng
  type: 'bridge' | 'tunnel' | 'overpass' | 'underpass'
  restrictionType: 'posted' | 'parkway' | 'structural'
  alternateRoute?: string
  notes?: string
  hazardLevel: 'caution' | 'warning' | 'danger' // 13-14', 12-13', <12'
  truckProhibited?: boolean
  lastVerified?: string // ISO date
}

/**
 * Notable low clearance structures across the US
 * This is NOT exhaustive - just the most infamous/dangerous locations
 */
export const LOW_CLEARANCE_BRIDGES: LowClearanceBridge[] = [
  // NEW YORK - Parkways are notorious for low clearances
  {
    id: 'ny-belt-pkwy-1',
    name: 'Belt Parkway Bridges',
    location: 'Belt Parkway, Brooklyn/Queens',
    state: 'NY',
    highway: 'Belt Parkway',
    clearanceHeight: 10.5,
    coordinates: { lat: 40.5869, lng: -73.8981 },
    type: 'overpass',
    restrictionType: 'parkway',
    alternateRoute: 'Use I-278 or local streets',
    notes: 'NO commercial vehicles allowed on parkways',
    hazardLevel: 'danger',
    truckProhibited: true,
  },
  {
    id: 'ny-hutchinson-pkwy',
    name: 'Hutchinson River Parkway Bridges',
    location: 'Westchester County',
    state: 'NY',
    highway: 'Hutchinson River Pkwy',
    clearanceHeight: 10.0,
    coordinates: { lat: 40.9357, lng: -73.7753 },
    type: 'overpass',
    restrictionType: 'parkway',
    alternateRoute: 'Use I-95 or I-287',
    notes: 'NO commercial vehicles - multiple low bridges',
    hazardLevel: 'danger',
    truckProhibited: true,
  },
  {
    id: 'ny-saw-mill-pkwy',
    name: 'Saw Mill River Parkway',
    location: 'Westchester County',
    state: 'NY',
    highway: 'Saw Mill River Pkwy',
    clearanceHeight: 9.5,
    coordinates: { lat: 41.0168, lng: -73.8584 },
    type: 'overpass',
    restrictionType: 'parkway',
    alternateRoute: 'Use I-87 (NY Thruway)',
    notes: 'One of the lowest parkways - NO trucks',
    hazardLevel: 'danger',
    truckProhibited: true,
  },
  {
    id: 'ny-11foot8-rome',
    name: 'Rome Railroad Bridge',
    location: 'Rome, NY - Erie Blvd',
    state: 'NY',
    highway: 'Erie Blvd E',
    clearanceHeight: 11.0,
    coordinates: { lat: 43.2129, lng: -75.4557 },
    type: 'bridge',
    restrictionType: 'structural',
    alternateRoute: 'Use NY-49 or NY-69',
    notes: 'Frequent truck strikes - "can opener" bridge',
    hazardLevel: 'danger',
  },

  // MASSACHUSETTS - Storrow Drive is infamous
  {
    id: 'ma-storrow-drive',
    name: 'Storrow Drive Bridges',
    location: 'Storrow Drive, Boston',
    state: 'MA',
    highway: 'Storrow Drive',
    clearanceHeight: 10.0,
    coordinates: { lat: 42.3546, lng: -71.0892 },
    type: 'overpass',
    restrictionType: 'parkway',
    alternateRoute: 'Use I-93 or I-90 (Mass Pike)',
    notes: 'Famous for truck strikes every move-in day - "Getting Storrowed"',
    hazardLevel: 'danger',
    truckProhibited: true,
  },
  {
    id: 'ma-memorial-drive',
    name: 'Memorial Drive Bridges',
    location: 'Memorial Drive, Cambridge',
    state: 'MA',
    highway: 'Memorial Drive',
    clearanceHeight: 10.5,
    coordinates: { lat: 42.3584, lng: -71.0942 },
    type: 'overpass',
    restrictionType: 'parkway',
    alternateRoute: 'Use I-93',
    notes: 'Low bridges along Charles River',
    hazardLevel: 'danger',
    truckProhibited: true,
  },

  // NORTH CAROLINA - The famous 11foot8 bridge
  {
    id: 'nc-11foot8',
    name: '11foot8 Bridge (The Can Opener)',
    location: 'Gregson St at Norfolk Southern RR, Durham',
    state: 'NC',
    highway: 'S Gregson St',
    clearanceHeight: 11.67, // Was 11.67, raised to 12.33 in 2019
    coordinates: { lat: 35.9988, lng: -78.9089 },
    type: 'bridge',
    restrictionType: 'structural',
    alternateRoute: 'Use Main St or Duke St',
    notes: 'World famous "Can Opener Bridge" - now raised to 12\'4" but still claims trucks',
    hazardLevel: 'danger',
    lastVerified: '2019-10-01',
  },

  // PENNSYLVANIA - Tunnels and old infrastructure
  {
    id: 'pa-liberty-tunnel',
    name: 'Liberty Tunnel',
    location: 'Pittsburgh - Route 51',
    state: 'PA',
    highway: 'PA-51',
    clearanceHeight: 13.0,
    coordinates: { lat: 40.4162, lng: -79.9855 },
    type: 'tunnel',
    restrictionType: 'structural',
    alternateRoute: 'Use I-376 or Fort Pitt Tunnel',
    notes: 'Oversize loads must use alternate routes',
    hazardLevel: 'warning',
  },
  {
    id: 'pa-squirrel-hill-tunnel',
    name: 'Squirrel Hill Tunnel',
    location: 'Pittsburgh - I-376',
    state: 'PA',
    highway: 'I-376',
    clearanceHeight: 13.5,
    coordinates: { lat: 40.4298, lng: -79.9188 },
    type: 'tunnel',
    restrictionType: 'structural',
    notes: 'Marginal clearance for standard loads',
    hazardLevel: 'caution',
  },

  // VIRGINIA - Older tunnels
  {
    id: 'va-hampton-roads-tunnel',
    name: 'Hampton Roads Bridge-Tunnel',
    location: 'I-64, Hampton Roads',
    state: 'VA',
    highway: 'I-64',
    clearanceHeight: 13.5,
    coordinates: { lat: 37.0046, lng: -76.3074 },
    type: 'tunnel',
    restrictionType: 'structural',
    notes: 'Oversize loads require VDOT coordination',
    hazardLevel: 'caution',
  },

  // MARYLAND - Baltimore tunnels
  {
    id: 'md-baltimore-harbor-tunnel',
    name: 'Baltimore Harbor Tunnel',
    location: 'I-895, Baltimore',
    state: 'MD',
    highway: 'I-895',
    clearanceHeight: 13.5,
    coordinates: { lat: 39.2473, lng: -76.5786 },
    type: 'tunnel',
    restrictionType: 'structural',
    alternateRoute: 'Use I-695 Francis Scott Key Bridge (if open)',
    notes: 'Hazmat restrictions also apply',
    hazardLevel: 'caution',
  },
  {
    id: 'md-fort-mchenry-tunnel',
    name: 'Fort McHenry Tunnel',
    location: 'I-95, Baltimore',
    state: 'MD',
    highway: 'I-95',
    clearanceHeight: 13.5,
    coordinates: { lat: 39.2639, lng: -76.5820 },
    type: 'tunnel',
    restrictionType: 'structural',
    notes: 'Primary I-95 tunnel - check for restrictions',
    hazardLevel: 'caution',
  },

  // WEST VIRGINIA - Mountain tunnels
  {
    id: 'wv-wheeling-tunnel',
    name: 'Wheeling Tunnel',
    location: 'I-70, Wheeling',
    state: 'WV',
    highway: 'I-70',
    clearanceHeight: 13.5,
    coordinates: { lat: 40.0640, lng: -80.7209 },
    type: 'tunnel',
    restrictionType: 'structural',
    notes: 'Marginal clearance - verify load height',
    hazardLevel: 'caution',
  },

  // COLORADO - Mountain passes with low clearances
  {
    id: 'co-eisenhower-tunnel',
    name: 'Eisenhower-Johnson Memorial Tunnel',
    location: 'I-70, Continental Divide',
    state: 'CO',
    highway: 'I-70',
    clearanceHeight: 13.5,
    coordinates: { lat: 39.6795, lng: -105.9114 },
    type: 'tunnel',
    restrictionType: 'structural',
    alternateRoute: 'Use US-6 Loveland Pass (weather permitting)',
    notes: 'Highest vehicular tunnel in the world - hazmat prohibited',
    hazardLevel: 'caution',
  },

  // CALIFORNIA - Urban areas
  {
    id: 'ca-caldecott-tunnel',
    name: 'Caldecott Tunnel',
    location: 'SR-24, Oakland/Orinda',
    state: 'CA',
    highway: 'SR-24',
    clearanceHeight: 14.6,
    coordinates: { lat: 37.8573, lng: -122.1825 },
    type: 'tunnel',
    restrictionType: 'structural',
    notes: 'Hazmat restrictions - check Caltrans for permits',
    hazardLevel: 'caution',
  },

  // GEORGIA - Historic structures
  {
    id: 'ga-talmadge-bridge',
    name: 'Talmadge Memorial Bridge Approaches',
    location: 'US-17, Savannah',
    state: 'GA',
    highway: 'US-17',
    clearanceHeight: 14.0,
    coordinates: { lat: 32.0809, lng: -81.0912 },
    type: 'overpass',
    restrictionType: 'structural',
    notes: 'Approach bridges have lower clearance than main span',
    hazardLevel: 'caution',
  },

  // LOUISIANA - Urban overpasses
  {
    id: 'la-i10-metairie',
    name: 'I-10 Metairie Road Overpass',
    location: 'Metairie, New Orleans area',
    state: 'LA',
    highway: 'Metairie Rd',
    clearanceHeight: 12.5,
    coordinates: { lat: 29.9833, lng: -90.1534 },
    type: 'overpass',
    restrictionType: 'structural',
    alternateRoute: 'Use Veterans Memorial Blvd',
    notes: 'Frequent truck strikes',
    hazardLevel: 'danger',
  },

  // ILLINOIS - Chicago urban area
  {
    id: 'il-lake-shore-drive',
    name: 'Lake Shore Drive Viaducts',
    location: 'Lake Shore Drive, Chicago',
    state: 'IL',
    highway: 'US-41 (LSD)',
    clearanceHeight: 12.0,
    coordinates: { lat: 41.8826, lng: -87.6126 },
    type: 'overpass',
    restrictionType: 'parkway',
    alternateRoute: 'Use I-90/94',
    notes: 'Multiple low viaducts - trucks prohibited',
    hazardLevel: 'danger',
    truckProhibited: true,
  },

  // OHIO - Older industrial areas
  {
    id: 'oh-detroit-shoreway',
    name: 'Detroit-Shoreway Bridges',
    location: 'Detroit Ave, Cleveland',
    state: 'OH',
    highway: 'Detroit Ave',
    clearanceHeight: 12.5,
    coordinates: { lat: 41.4855, lng: -81.7310 },
    type: 'overpass',
    restrictionType: 'structural',
    alternateRoute: 'Use I-90',
    notes: 'Historic neighborhood with low railroad bridges',
    hazardLevel: 'warning',
  },

  // TENNESSEE
  {
    id: 'tn-jefferson-st-bridge',
    name: 'Jefferson Street Railroad Bridge',
    location: 'Nashville - Jefferson St',
    state: 'TN',
    highway: 'Jefferson St',
    clearanceHeight: 11.5,
    coordinates: { lat: 36.1697, lng: -86.8134 },
    type: 'bridge',
    restrictionType: 'structural',
    alternateRoute: 'Use I-65 or Charlotte Ave',
    notes: 'Frequent truck strikes',
    hazardLevel: 'danger',
  },

  // TEXAS - Despite wide roads, some problem spots exist
  {
    id: 'tx-gessner-overpass',
    name: 'Gessner Road Overpass',
    location: 'Houston - US-290 at Gessner',
    state: 'TX',
    highway: 'Gessner Rd',
    clearanceHeight: 12.5,
    coordinates: { lat: 29.8064, lng: -95.5310 },
    type: 'overpass',
    restrictionType: 'structural',
    alternateRoute: 'Use US-290 mainlanes',
    notes: 'Frontage road underpass is lower than expected',
    hazardLevel: 'warning',
  },

  // WASHINGTON - Seattle area
  {
    id: 'wa-aurora-bridge',
    name: 'Aurora Bridge (George Washington Memorial)',
    location: 'Seattle - SR-99',
    state: 'WA',
    highway: 'SR-99',
    clearanceHeight: 13.5,
    coordinates: { lat: 47.6506, lng: -122.3472 },
    type: 'bridge',
    restrictionType: 'structural',
    notes: 'Narrow lanes - oversize loads need escort',
    hazardLevel: 'caution',
  },
]

/**
 * Check if a cargo height would have clearance issues at a specific bridge
 */
export function checkBridgeClearance(
  bridge: LowClearanceBridge,
  cargoTotalHeight: number // feet (cargo + trailer deck height)
): {
  clears: boolean
  clearance: number // feet of clearance (negative = won't fit)
  deficit: number // how many feet too tall (0 if fits)
  severity: 'ok' | 'caution' | 'warning' | 'danger'
} {
  const clearance = bridge.clearanceHeight - cargoTotalHeight
  const deficit = clearance < 0 ? Math.abs(clearance) : 0

  let severity: 'ok' | 'caution' | 'warning' | 'danger' = 'ok'

  if (clearance < 0) {
    severity = 'danger'
  } else if (clearance < 0.5) {
    severity = 'warning'
  } else if (clearance < 1) {
    severity = 'caution'
  }

  return {
    clears: clearance >= 0,
    clearance: Math.round(clearance * 10) / 10,
    deficit: Math.round(deficit * 10) / 10,
    severity,
  }
}

/**
 * Find bridges near a route that may pose clearance issues
 *
 * Note: This uses a simple proximity check. For production use,
 * you would want to check if the bridge is actually ON the route.
 */
export function findNearbyBridges(
  routePoints: LatLng[],
  maxDistanceMiles: number = 0.5 // Check bridges within 0.5 miles of route
): LowClearanceBridge[] {
  const nearbyBridges: LowClearanceBridge[] = []

  for (const bridge of LOW_CLEARANCE_BRIDGES) {
    for (const point of routePoints) {
      const distance = calculateDistance(point, bridge.coordinates)
      if (distance <= maxDistanceMiles) {
        if (!nearbyBridges.includes(bridge)) {
          nearbyBridges.push(bridge)
        }
        break // Found one close point, move to next bridge
      }
    }
  }

  return nearbyBridges
}

/**
 * Check route for bridge clearance warnings
 */
export function checkRouteBridgeClearances(
  routePoints: LatLng[],
  cargoTotalHeight: number // feet
): {
  hasIssues: boolean
  bridges: Array<{
    bridge: LowClearanceBridge
    clearanceResult: ReturnType<typeof checkBridgeClearance>
  }>
  warnings: string[]
  recommendations: string[]
} {
  const nearbyBridges = findNearbyBridges(routePoints)
  const issues: Array<{
    bridge: LowClearanceBridge
    clearanceResult: ReturnType<typeof checkBridgeClearance>
  }> = []
  const warnings: string[] = []
  const recommendations: string[] = []

  for (const bridge of nearbyBridges) {
    const clearanceResult = checkBridgeClearance(bridge, cargoTotalHeight)

    if (clearanceResult.severity !== 'ok') {
      issues.push({ bridge, clearanceResult })

      if (clearanceResult.severity === 'danger') {
        if (!clearanceResult.clears) {
          warnings.push(
            `WILL NOT FIT: ${bridge.name} (${bridge.state}) - clearance ${bridge.clearanceHeight}' vs load height ${cargoTotalHeight}' - ${clearanceResult.deficit}' too tall`
          )
        } else {
          warnings.push(
            `TIGHT CLEARANCE: ${bridge.name} (${bridge.state}) - only ${clearanceResult.clearance}' clearance`
          )
        }

        if (bridge.alternateRoute) {
          recommendations.push(`${bridge.name}: ${bridge.alternateRoute}`)
        }
      } else if (clearanceResult.severity === 'warning') {
        warnings.push(
          `Warning: ${bridge.name} (${bridge.state}) - ${clearanceResult.clearance}' clearance - proceed with caution`
        )
      }
    }

    // Also warn about truck-prohibited routes
    if (bridge.truckProhibited) {
      warnings.push(`${bridge.name}: Commercial vehicles PROHIBITED`)
      if (bridge.alternateRoute) {
        recommendations.push(`${bridge.name}: ${bridge.alternateRoute}`)
      }
    }
  }

  // Sort by severity
  issues.sort((a, b) => {
    const severityOrder = { danger: 0, warning: 1, caution: 2, ok: 3 }
    return severityOrder[a.clearanceResult.severity] - severityOrder[b.clearanceResult.severity]
  })

  return {
    hasIssues: issues.length > 0,
    bridges: issues,
    warnings,
    recommendations,
  }
}

/**
 * Get bridges in a specific state
 */
export function getBridgesInState(stateCode: string): LowClearanceBridge[] {
  return LOW_CLEARANCE_BRIDGES.filter(
    (b) => b.state === stateCode.toUpperCase()
  )
}

/**
 * Get all bridges below a certain height
 */
export function getBridgesBelowHeight(heightFeet: number): LowClearanceBridge[] {
  return LOW_CLEARANCE_BRIDGES.filter((b) => b.clearanceHeight < heightFeet)
}

/**
 * Get bridges by hazard level
 */
export function getBridgesByHazardLevel(
  level: 'caution' | 'warning' | 'danger'
): LowClearanceBridge[] {
  return LOW_CLEARANCE_BRIDGES.filter((b) => b.hazardLevel === level)
}

/**
 * Get all truck-prohibited routes
 */
export function getTruckProhibitedRoutes(): LowClearanceBridge[] {
  return LOW_CLEARANCE_BRIDGES.filter((b) => b.truckProhibited)
}

/**
 * Standard interstate clearance (for reference)
 */
export const STANDARD_CLEARANCES = {
  INTERSTATE_MINIMUM: 16.0, // feet - Federal minimum for interstates
  STANDARD_OVERPASS: 14.0, // feet - Typical overpass clearance
  LEGAL_HEIGHT_LIMIT: 13.5, // feet - Standard legal truck height
  PARKWAY_TYPICAL: 10.5, // feet - Many parkways have 10-11' clearances
} as const

/**
 * Get recommended minimum clearance for a cargo height
 */
export function getRecommendedClearance(cargoHeight: number): number {
  // Recommend at least 1 foot of clearance, ideally 2 feet
  return cargoHeight + 1.0
}

/**
 * Check if height requires special routing consideration
 */
export function needsHeightConsideration(totalHeight: number): {
  needs: boolean
  reason: string
} {
  if (totalHeight > 14.0) {
    return {
      needs: true,
      reason: 'Height exceeds standard overpass clearance (14\') - route survey recommended',
    }
  } else if (totalHeight > 13.5) {
    return {
      needs: true,
      reason: 'Height exceeds legal limit (13.5\') - avoid parkways and check bridge clearances',
    }
  } else if (totalHeight > 12.0) {
    return {
      needs: true,
      reason: 'Height may conflict with older infrastructure - verify route clearances',
    }
  }

  return { needs: false, reason: '' }
}
