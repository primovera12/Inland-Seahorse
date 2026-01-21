/**
 * State Detector for Load Planner
 *
 * Detects which US states a route passes through using:
 * - Route polyline analysis
 * - State boundary approximations
 * - Distance calculations per state
 *
 * Used to feed state-specific permit requirements
 */

import type { LatLng, StateSegment } from './route-calculator'
import { decodePolyline, calculateDistance, getStateName } from './route-calculator'

// Approximate state bounding boxes (minLat, maxLat, minLng, maxLng)
// These are rough approximations for quick state detection
interface StateBoundingBox {
  code: string
  name: string
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

const STATE_BOUNDING_BOXES: StateBoundingBox[] = [
  { code: 'AL', name: 'Alabama', minLat: 30.22, maxLat: 35.01, minLng: -88.47, maxLng: -84.89 },
  { code: 'AZ', name: 'Arizona', minLat: 31.33, maxLat: 37.00, minLng: -114.81, maxLng: -109.05 },
  { code: 'AR', name: 'Arkansas', minLat: 33.00, maxLat: 36.50, minLng: -94.62, maxLng: -89.64 },
  { code: 'CA', name: 'California', minLat: 32.53, maxLat: 42.01, minLng: -124.48, maxLng: -114.13 },
  { code: 'CO', name: 'Colorado', minLat: 36.99, maxLat: 41.00, minLng: -109.06, maxLng: -102.04 },
  { code: 'CT', name: 'Connecticut', minLat: 40.95, maxLat: 42.05, minLng: -73.73, maxLng: -71.79 },
  { code: 'DE', name: 'Delaware', minLat: 38.45, maxLat: 39.84, minLng: -75.79, maxLng: -75.05 },
  { code: 'FL', name: 'Florida', minLat: 24.40, maxLat: 31.00, minLng: -87.63, maxLng: -80.03 },
  { code: 'GA', name: 'Georgia', minLat: 30.36, maxLat: 35.00, minLng: -85.61, maxLng: -80.84 },
  { code: 'ID', name: 'Idaho', minLat: 41.99, maxLat: 49.00, minLng: -117.24, maxLng: -111.04 },
  { code: 'IL', name: 'Illinois', minLat: 36.97, maxLat: 42.51, minLng: -91.51, maxLng: -87.02 },
  { code: 'IN', name: 'Indiana', minLat: 37.77, maxLat: 41.76, minLng: -88.10, maxLng: -84.78 },
  { code: 'IA', name: 'Iowa', minLat: 40.38, maxLat: 43.50, minLng: -96.64, maxLng: -90.14 },
  { code: 'KS', name: 'Kansas', minLat: 36.99, maxLat: 40.00, minLng: -102.05, maxLng: -94.59 },
  { code: 'KY', name: 'Kentucky', minLat: 36.50, maxLat: 39.15, minLng: -89.57, maxLng: -81.96 },
  { code: 'LA', name: 'Louisiana', minLat: 28.93, maxLat: 33.02, minLng: -94.04, maxLng: -88.82 },
  { code: 'ME', name: 'Maine', minLat: 43.06, maxLat: 47.46, minLng: -71.08, maxLng: -66.95 },
  { code: 'MD', name: 'Maryland', minLat: 37.91, maxLat: 39.72, minLng: -79.49, maxLng: -75.05 },
  { code: 'MA', name: 'Massachusetts', minLat: 41.24, maxLat: 42.89, minLng: -73.50, maxLng: -69.93 },
  { code: 'MI', name: 'Michigan', minLat: 41.70, maxLat: 48.31, minLng: -90.42, maxLng: -82.12 },
  { code: 'MN', name: 'Minnesota', minLat: 43.50, maxLat: 49.38, minLng: -97.24, maxLng: -89.49 },
  { code: 'MS', name: 'Mississippi', minLat: 30.17, maxLat: 35.00, minLng: -91.66, maxLng: -88.10 },
  { code: 'MO', name: 'Missouri', minLat: 35.99, maxLat: 40.61, minLng: -95.77, maxLng: -89.10 },
  { code: 'MT', name: 'Montana', minLat: 44.36, maxLat: 49.00, minLng: -116.05, maxLng: -104.04 },
  { code: 'NE', name: 'Nebraska', minLat: 39.99, maxLat: 43.00, minLng: -104.05, maxLng: -95.31 },
  { code: 'NV', name: 'Nevada', minLat: 35.00, maxLat: 42.00, minLng: -120.01, maxLng: -114.04 },
  { code: 'NH', name: 'New Hampshire', minLat: 42.70, maxLat: 45.31, minLng: -72.56, maxLng: -70.70 },
  { code: 'NJ', name: 'New Jersey', minLat: 38.93, maxLat: 41.36, minLng: -75.56, maxLng: -73.89 },
  { code: 'NM', name: 'New Mexico', minLat: 31.33, maxLat: 37.00, minLng: -109.05, maxLng: -103.00 },
  { code: 'NY', name: 'New York', minLat: 40.50, maxLat: 45.02, minLng: -79.76, maxLng: -71.86 },
  { code: 'NC', name: 'North Carolina', minLat: 33.84, maxLat: 36.59, minLng: -84.32, maxLng: -75.46 },
  { code: 'ND', name: 'North Dakota', minLat: 45.94, maxLat: 49.00, minLng: -104.05, maxLng: -96.55 },
  { code: 'OH', name: 'Ohio', minLat: 38.40, maxLat: 42.00, minLng: -84.82, maxLng: -80.52 },
  { code: 'OK', name: 'Oklahoma', minLat: 33.62, maxLat: 37.00, minLng: -103.00, maxLng: -94.43 },
  { code: 'OR', name: 'Oregon', minLat: 41.99, maxLat: 46.29, minLng: -124.57, maxLng: -116.46 },
  { code: 'PA', name: 'Pennsylvania', minLat: 39.72, maxLat: 42.27, minLng: -80.52, maxLng: -74.69 },
  { code: 'RI', name: 'Rhode Island', minLat: 41.15, maxLat: 42.02, minLng: -71.86, maxLng: -71.12 },
  { code: 'SC', name: 'South Carolina', minLat: 32.03, maxLat: 35.22, minLng: -83.35, maxLng: -78.54 },
  { code: 'SD', name: 'South Dakota', minLat: 42.48, maxLat: 45.95, minLng: -104.06, maxLng: -96.44 },
  { code: 'TN', name: 'Tennessee', minLat: 34.98, maxLat: 36.68, minLng: -90.31, maxLng: -81.65 },
  { code: 'TX', name: 'Texas', minLat: 25.84, maxLat: 36.50, minLng: -106.65, maxLng: -93.51 },
  { code: 'UT', name: 'Utah', minLat: 37.00, maxLat: 42.00, minLng: -114.05, maxLng: -109.04 },
  { code: 'VT', name: 'Vermont', minLat: 42.73, maxLat: 45.02, minLng: -73.44, maxLng: -71.47 },
  { code: 'VA', name: 'Virginia', minLat: 36.54, maxLat: 39.47, minLng: -83.68, maxLng: -75.24 },
  { code: 'WA', name: 'Washington', minLat: 45.54, maxLat: 49.00, minLng: -124.85, maxLng: -116.92 },
  { code: 'WV', name: 'West Virginia', minLat: 37.20, maxLat: 40.64, minLng: -82.64, maxLng: -77.72 },
  { code: 'WI', name: 'Wisconsin', minLat: 42.49, maxLat: 47.08, minLng: -92.89, maxLng: -86.25 },
  { code: 'WY', name: 'Wyoming', minLat: 41.00, maxLat: 45.00, minLng: -111.06, maxLng: -104.05 },
  { code: 'DC', name: 'District of Columbia', minLat: 38.79, maxLat: 38.99, minLng: -77.12, maxLng: -76.91 },
]

// Major freight corridors for common route identification
export interface FreightCorridor {
  id: string
  name: string
  description: string
  states: string[]
  typicalDistance: number // miles
  commonOrigins: string[]
  commonDestinations: string[]
}

export const FREIGHT_CORRIDORS: FreightCorridor[] = [
  {
    id: 'i10-southern',
    name: 'I-10 Southern Corridor',
    description: 'Los Angeles to Jacksonville via Phoenix, El Paso, Houston',
    states: ['CA', 'AZ', 'NM', 'TX', 'LA', 'MS', 'AL', 'FL'],
    typicalDistance: 2460,
    commonOrigins: ['Los Angeles, CA', 'Phoenix, AZ'],
    commonDestinations: ['Houston, TX', 'New Orleans, LA', 'Jacksonville, FL'],
  },
  {
    id: 'i90-northern',
    name: 'I-90 Northern Corridor',
    description: 'Seattle to Boston via Chicago',
    states: ['WA', 'ID', 'MT', 'WY', 'SD', 'MN', 'WI', 'IL', 'IN', 'OH', 'PA', 'NY', 'MA'],
    typicalDistance: 3020,
    commonOrigins: ['Seattle, WA', 'Chicago, IL'],
    commonDestinations: ['Cleveland, OH', 'Buffalo, NY', 'Boston, MA'],
  },
  {
    id: 'i95-east-coast',
    name: 'I-95 East Coast Corridor',
    description: 'Miami to Maine via all East Coast states',
    states: ['FL', 'GA', 'SC', 'NC', 'VA', 'DC', 'MD', 'DE', 'PA', 'NJ', 'NY', 'CT', 'RI', 'MA', 'NH', 'ME'],
    typicalDistance: 1920,
    commonOrigins: ['Miami, FL', 'Jacksonville, FL'],
    commonDestinations: ['Washington, DC', 'New York, NY', 'Boston, MA'],
  },
  {
    id: 'i40-central',
    name: 'I-40 Central Corridor',
    description: 'Barstow to Wilmington via Albuquerque, OKC, Memphis',
    states: ['CA', 'AZ', 'NM', 'TX', 'OK', 'AR', 'TN', 'NC'],
    typicalDistance: 2555,
    commonOrigins: ['Los Angeles, CA', 'Albuquerque, NM'],
    commonDestinations: ['Oklahoma City, OK', 'Memphis, TN', 'Raleigh, NC'],
  },
  {
    id: 'i35-central-ns',
    name: 'I-35 Central North-South',
    description: 'Laredo to Duluth via Dallas, OKC, KC',
    states: ['TX', 'OK', 'KS', 'MO', 'IA', 'MN'],
    typicalDistance: 1568,
    commonOrigins: ['Laredo, TX', 'Dallas, TX'],
    commonDestinations: ['Kansas City, MO', 'Minneapolis, MN'],
  },
  {
    id: 'i70-midwest',
    name: 'I-70 Midwest Corridor',
    description: 'Denver to Baltimore via Kansas City, St. Louis, Indianapolis',
    states: ['CO', 'KS', 'MO', 'IL', 'IN', 'OH', 'WV', 'PA', 'MD'],
    typicalDistance: 1700,
    commonOrigins: ['Denver, CO', 'Kansas City, MO'],
    commonDestinations: ['Indianapolis, IN', 'Columbus, OH', 'Baltimore, MD'],
  },
  {
    id: 'i80-trans-america',
    name: 'I-80 Trans-America',
    description: 'San Francisco to New York via Salt Lake City, Omaha, Chicago',
    states: ['CA', 'NV', 'UT', 'WY', 'NE', 'IA', 'IL', 'IN', 'OH', 'PA', 'NJ', 'NY'],
    typicalDistance: 2900,
    commonOrigins: ['San Francisco, CA', 'Salt Lake City, UT'],
    commonDestinations: ['Chicago, IL', 'Cleveland, OH', 'New York, NY'],
  },
  {
    id: 'i75-great-lakes',
    name: 'I-75 Great Lakes to Gulf',
    description: 'Michigan to Florida via Ohio, Kentucky, Tennessee, Georgia',
    states: ['MI', 'OH', 'KY', 'TN', 'GA', 'FL'],
    typicalDistance: 1786,
    commonOrigins: ['Detroit, MI', 'Cincinnati, OH'],
    commonDestinations: ['Atlanta, GA', 'Tampa, FL', 'Miami, FL'],
  },
]

/**
 * Get the state code for a given lat/lng point using bounding box approximation
 * This is a fast local check that doesn't require API calls
 */
export function getStateFromPoint(point: LatLng): string | null {
  // Find states that contain this point
  const matches = STATE_BOUNDING_BOXES.filter(
    (box) =>
      point.lat >= box.minLat &&
      point.lat <= box.maxLat &&
      point.lng >= box.minLng &&
      point.lng <= box.maxLng
  )

  if (matches.length === 1) {
    return matches[0].code
  }

  if (matches.length > 1) {
    // Point is near a border - return the one whose center is closest
    let closest: StateBoundingBox | null = null
    let minDistance = Infinity

    for (const box of matches) {
      const centerLat = (box.minLat + box.maxLat) / 2
      const centerLng = (box.minLng + box.maxLng) / 2
      const distance = Math.sqrt(
        Math.pow(point.lat - centerLat, 2) + Math.pow(point.lng - centerLng, 2)
      )
      if (distance < minDistance) {
        minDistance = distance
        closest = box
      }
    }

    return closest?.code || null
  }

  return null
}

/**
 * Detect states from an encoded polyline without API calls
 * Uses bounding box approximation for fast local detection
 */
export function detectStatesFromPolyline(encodedPolyline: string): {
  states: string[]
  segments: StateSegment[]
  distances: Record<string, number>
} {
  const points = decodePolyline(encodedPolyline)
  return detectStatesFromPoints(points)
}

/**
 * Detect states from an array of lat/lng points
 * Uses bounding box approximation for fast local detection
 */
export function detectStatesFromPoints(points: LatLng[]): {
  states: string[]
  segments: StateSegment[]
  distances: Record<string, number>
} {
  const states: string[] = []
  const segments: StateSegment[] = []
  const distances: Record<string, number> = {}

  if (points.length === 0) {
    return { states, segments, distances }
  }

  let currentState = ''
  let segmentStartPoint = points[0]
  let segmentStartIndex = 0
  let order = 0

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    const detectedState = getStateFromPoint(point)

    if (detectedState && detectedState !== currentState) {
      // State changed
      if (currentState) {
        // Calculate segment distance
        let segmentDistance = 0
        for (let j = segmentStartIndex; j < i; j++) {
          segmentDistance += calculateDistance(points[j], points[j + 1])
        }

        segments.push({
          stateCode: currentState,
          stateName: getStateName(currentState),
          entryPoint: segmentStartPoint,
          exitPoint: points[i - 1] || point,
          distanceMiles: Math.round(segmentDistance * 10) / 10,
          order,
        })

        distances[currentState] = (distances[currentState] || 0) + segmentDistance
        order++
      }

      // Start new segment
      if (!states.includes(detectedState)) {
        states.push(detectedState)
      }
      currentState = detectedState
      segmentStartPoint = point
      segmentStartIndex = i
    }
  }

  // Close the last segment
  if (currentState) {
    let segmentDistance = 0
    for (let j = segmentStartIndex; j < points.length - 1; j++) {
      segmentDistance += calculateDistance(points[j], points[j + 1])
    }

    if (segmentDistance > 0) {
      segments.push({
        stateCode: currentState,
        stateName: getStateName(currentState),
        entryPoint: segmentStartPoint,
        exitPoint: points[points.length - 1],
        distanceMiles: Math.round(segmentDistance * 10) / 10,
        order,
      })
      distances[currentState] = (distances[currentState] || 0) + segmentDistance
    }
  }

  // Round all distances
  for (const state in distances) {
    distances[state] = Math.round(distances[state] * 10) / 10
  }

  return { states, segments, distances }
}

/**
 * Identify which freight corridor(s) a route might be using
 */
export function identifyFreightCorridors(statesTraversed: string[]): FreightCorridor[] {
  const matchingCorridors: FreightCorridor[] = []

  for (const corridor of FREIGHT_CORRIDORS) {
    // Check how many states in the route match this corridor
    const matchingStates = statesTraversed.filter((s) => corridor.states.includes(s))
    const matchRatio = matchingStates.length / statesTraversed.length

    // If at least 60% of route states are in this corridor, it's likely being used
    if (matchRatio >= 0.6 && matchingStates.length >= 2) {
      matchingCorridors.push(corridor)
    }
  }

  // Sort by match quality (more matching states = better match)
  matchingCorridors.sort((a, b) => {
    const aMatches = statesTraversed.filter((s) => a.states.includes(s)).length
    const bMatches = statesTraversed.filter((s) => b.states.includes(s)).length
    return bMatches - aMatches
  })

  return matchingCorridors
}

/**
 * Get neighboring states for border crossing warnings
 */
export function getNeighboringStates(stateCode: string): string[] {
  const neighbors: Record<string, string[]> = {
    AL: ['FL', 'GA', 'MS', 'TN'],
    AZ: ['CA', 'CO', 'NM', 'NV', 'UT'],
    AR: ['LA', 'MO', 'MS', 'OK', 'TN', 'TX'],
    CA: ['AZ', 'NV', 'OR'],
    CO: ['AZ', 'KS', 'NE', 'NM', 'OK', 'UT', 'WY'],
    CT: ['MA', 'NY', 'RI'],
    DE: ['MD', 'NJ', 'PA'],
    FL: ['AL', 'GA'],
    GA: ['AL', 'FL', 'NC', 'SC', 'TN'],
    ID: ['MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
    IL: ['IA', 'IN', 'KY', 'MO', 'WI'],
    IN: ['IL', 'KY', 'MI', 'OH'],
    IA: ['IL', 'MN', 'MO', 'NE', 'SD', 'WI'],
    KS: ['CO', 'MO', 'NE', 'OK'],
    KY: ['IL', 'IN', 'MO', 'OH', 'TN', 'VA', 'WV'],
    LA: ['AR', 'MS', 'TX'],
    ME: ['NH'],
    MD: ['DE', 'PA', 'VA', 'WV', 'DC'],
    MA: ['CT', 'NH', 'NY', 'RI', 'VT'],
    MI: ['IN', 'OH', 'WI'],
    MN: ['IA', 'ND', 'SD', 'WI'],
    MS: ['AL', 'AR', 'LA', 'TN'],
    MO: ['AR', 'IA', 'IL', 'KS', 'KY', 'NE', 'OK', 'TN'],
    MT: ['ID', 'ND', 'SD', 'WY'],
    NE: ['CO', 'IA', 'KS', 'MO', 'SD', 'WY'],
    NV: ['AZ', 'CA', 'ID', 'OR', 'UT'],
    NH: ['MA', 'ME', 'VT'],
    NJ: ['DE', 'NY', 'PA'],
    NM: ['AZ', 'CO', 'OK', 'TX', 'UT'],
    NY: ['CT', 'MA', 'NJ', 'PA', 'VT'],
    NC: ['GA', 'SC', 'TN', 'VA'],
    ND: ['MN', 'MT', 'SD'],
    OH: ['IN', 'KY', 'MI', 'PA', 'WV'],
    OK: ['AR', 'CO', 'KS', 'MO', 'NM', 'TX'],
    OR: ['CA', 'ID', 'NV', 'WA'],
    PA: ['DE', 'MD', 'NJ', 'NY', 'OH', 'WV'],
    RI: ['CT', 'MA'],
    SC: ['GA', 'NC'],
    SD: ['IA', 'MN', 'MT', 'ND', 'NE', 'WY'],
    TN: ['AL', 'AR', 'GA', 'KY', 'MO', 'MS', 'NC', 'VA'],
    TX: ['AR', 'LA', 'NM', 'OK'],
    UT: ['AZ', 'CO', 'ID', 'NV', 'NM', 'WY'],
    VT: ['MA', 'NH', 'NY'],
    VA: ['KY', 'MD', 'NC', 'TN', 'WV', 'DC'],
    WA: ['ID', 'OR'],
    WV: ['KY', 'MD', 'OH', 'PA', 'VA'],
    WI: ['IA', 'IL', 'MI', 'MN'],
    WY: ['CO', 'ID', 'MT', 'NE', 'SD', 'UT'],
    DC: ['MD', 'VA'],
  }

  return neighbors[stateCode.toUpperCase()] || []
}

/**
 * Validate that a route's states make geographic sense
 * (i.e., each state should be adjacent to the previous one)
 */
export function validateRouteGeography(statesTraversed: string[]): {
  isValid: boolean
  issues: string[]
} {
  const issues: string[] = []

  for (let i = 1; i < statesTraversed.length; i++) {
    const prevState = statesTraversed[i - 1]
    const currState = statesTraversed[i]
    const neighbors = getNeighboringStates(prevState)

    if (!neighbors.includes(currState)) {
      issues.push(`${prevState} and ${currState} are not adjacent states`)
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}

/**
 * Get state bounding box for visualization
 */
export function getStateBoundingBox(stateCode: string): StateBoundingBox | null {
  return STATE_BOUNDING_BOXES.find((box) => box.code === stateCode.toUpperCase()) || null
}

/**
 * Calculate the approximate center point of a state
 */
export function getStateCenter(stateCode: string): LatLng | null {
  const box = getStateBoundingBox(stateCode)
  if (!box) return null

  return {
    lat: (box.minLat + box.maxLat) / 2,
    lng: (box.minLng + box.maxLng) / 2,
  }
}

/**
 * Check if a route is entirely within a single state
 */
export function isIntraStateRoute(statesTraversed: string[]): boolean {
  return statesTraversed.length === 1
}

/**
 * Check if route crosses specific regions
 */
export function getRouteRegions(statesTraversed: string[]): string[] {
  const regions: Set<string> = new Set()

  const REGIONS: Record<string, string[]> = {
    Northeast: ['CT', 'DE', 'MA', 'MD', 'ME', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT', 'DC'],
    Southeast: ['AL', 'FL', 'GA', 'KY', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
    Midwest: ['IA', 'IL', 'IN', 'KS', 'MI', 'MN', 'MO', 'ND', 'NE', 'OH', 'SD', 'WI'],
    Southwest: ['AZ', 'NM', 'OK', 'TX'],
    West: ['CA', 'CO', 'NV', 'UT', 'WY'],
    'Pacific Northwest': ['ID', 'MT', 'OR', 'WA'],
  }

  for (const state of statesTraversed) {
    for (const [region, states] of Object.entries(REGIONS)) {
      if (states.includes(state)) {
        regions.add(region)
      }
    }
  }

  return Array.from(regions)
}
