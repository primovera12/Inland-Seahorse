/**
 * Route Calculator for Load Planner
 *
 * Uses Google Maps Directions API to calculate routes and extract:
 * - Total distance and drive time
 * - Route polyline for map display
 * - States traversed along the route
 * - Distance per state (for permit calculations)
 */

// State boundary coordinates (approximate center points for state detection)
// Used with reverse geocoding to determine which state a point is in
const STATE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  AL: { lat: 32.806671, lng: -86.79113 },
  AK: { lat: 61.370716, lng: -152.404419 },
  AZ: { lat: 33.729759, lng: -111.431221 },
  AR: { lat: 34.969704, lng: -92.373123 },
  CA: { lat: 36.116203, lng: -119.681564 },
  CO: { lat: 39.059811, lng: -105.311104 },
  CT: { lat: 41.597782, lng: -72.755371 },
  DE: { lat: 39.318523, lng: -75.507141 },
  FL: { lat: 27.766279, lng: -81.686783 },
  GA: { lat: 33.040619, lng: -83.643074 },
  HI: { lat: 21.094318, lng: -157.498337 },
  ID: { lat: 44.240459, lng: -114.478828 },
  IL: { lat: 40.349457, lng: -88.986137 },
  IN: { lat: 39.849426, lng: -86.258278 },
  IA: { lat: 42.011539, lng: -93.210526 },
  KS: { lat: 38.5266, lng: -96.726486 },
  KY: { lat: 37.66814, lng: -84.670067 },
  LA: { lat: 31.169546, lng: -91.867805 },
  ME: { lat: 44.693947, lng: -69.381927 },
  MD: { lat: 39.063946, lng: -76.802101 },
  MA: { lat: 42.230171, lng: -71.530106 },
  MI: { lat: 43.326618, lng: -84.536095 },
  MN: { lat: 45.694454, lng: -93.900192 },
  MS: { lat: 32.741646, lng: -89.678696 },
  MO: { lat: 38.456085, lng: -92.288368 },
  MT: { lat: 46.921925, lng: -110.454353 },
  NE: { lat: 41.12537, lng: -98.268082 },
  NV: { lat: 38.313515, lng: -117.055374 },
  NH: { lat: 43.452492, lng: -71.563896 },
  NJ: { lat: 40.298904, lng: -74.521011 },
  NM: { lat: 34.840515, lng: -106.248482 },
  NY: { lat: 42.165726, lng: -74.948051 },
  NC: { lat: 35.630066, lng: -79.806419 },
  ND: { lat: 47.528912, lng: -99.784012 },
  OH: { lat: 40.388783, lng: -82.764915 },
  OK: { lat: 35.565342, lng: -96.928917 },
  OR: { lat: 44.572021, lng: -122.070938 },
  PA: { lat: 40.590752, lng: -77.209755 },
  RI: { lat: 41.680893, lng: -71.51178 },
  SC: { lat: 33.856892, lng: -80.945007 },
  SD: { lat: 44.299782, lng: -99.438828 },
  TN: { lat: 35.747845, lng: -86.692345 },
  TX: { lat: 31.054487, lng: -97.563461 },
  UT: { lat: 40.150032, lng: -111.862434 },
  VT: { lat: 44.045876, lng: -72.710686 },
  VA: { lat: 37.769337, lng: -78.169968 },
  WA: { lat: 47.400902, lng: -121.490494 },
  WV: { lat: 38.491226, lng: -80.954453 },
  WI: { lat: 44.268543, lng: -89.616508 },
  WY: { lat: 42.755966, lng: -107.30249 },
  DC: { lat: 38.897438, lng: -77.026817 },
}

export interface LatLng {
  lat: number
  lng: number
}

export interface StateSegment {
  stateCode: string
  stateName: string
  entryPoint: LatLng
  exitPoint: LatLng
  distanceMiles: number
  order: number
}

export interface RouteResult {
  totalDistanceMiles: number
  totalDurationMinutes: number
  estimatedDriveTime: string // "14h 30m" format
  statesTraversed: string[]
  stateSegments: StateSegment[]
  stateDistances: Record<string, number>
  routePolyline: string
  waypoints: LatLng[]
  warnings: string[]
}

export interface RouteCalculatorOptions {
  avoidTolls?: boolean
  avoidHighways?: boolean
  avoidFerries?: boolean
}

// State name to code mapping
const STATE_NAMES: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'District of Columbia': 'DC',
}

// Code to state name mapping
const STATE_CODE_TO_NAME: Record<string, string> = Object.entries(STATE_NAMES).reduce(
  (acc, [name, code]) => {
    acc[code] = name
    return acc
  },
  {} as Record<string, string>
)

/**
 * Decode a Google Maps encoded polyline into an array of lat/lng points
 */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    // Decode latitude
    let shift = 0
    let result = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dlat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dlat

    // Decode longitude
    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dlng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    })
  }

  return points
}

/**
 * Calculate distance between two lat/lng points using Haversine formula
 */
export function calculateDistance(point1: LatLng, point2: LatLng): number {
  const R = 3958.8 // Earth's radius in miles
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180
  const dLng = ((point2.lng - point1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point1.lat * Math.PI) / 180) *
      Math.cos((point2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Format duration in minutes to "Xh Ym" format
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) {
    return `${mins}m`
  } else if (mins === 0) {
    return `${hours}h`
  } else {
    return `${hours}h ${mins}m`
  }
}

/**
 * Calculate a route using Google Maps Directions API
 *
 * Note: This is a server-side function that calls the Google Maps API directly
 * For client-side use, use the route-map.tsx component instead
 */
export async function calculateRoute(
  origin: string,
  destination: string,
  waypoints?: string[],
  options?: RouteCalculatorOptions
): Promise<RouteResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    throw new Error('Google Maps API key not configured')
  }

  // Build the Directions API URL
  const params = new URLSearchParams({
    origin,
    destination,
    key: apiKey,
    mode: 'driving',
    units: 'imperial',
  })

  // Add waypoints if provided
  if (waypoints && waypoints.length > 0) {
    params.append('waypoints', waypoints.join('|'))
  }

  // Add avoid parameters
  const avoid: string[] = []
  if (options?.avoidTolls) avoid.push('tolls')
  if (options?.avoidHighways) avoid.push('highways')
  if (options?.avoidFerries) avoid.push('ferries')
  if (avoid.length > 0) {
    params.append('avoid', avoid.join('|'))
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`

  const response = await fetch(url)
  const data = await response.json()

  if (data.status !== 'OK') {
    throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
  }

  const route = data.routes[0]
  if (!route) {
    throw new Error('No route found')
  }

  // Calculate totals across all legs
  let totalDistanceMeters = 0
  let totalDurationSeconds = 0

  for (const leg of route.legs) {
    totalDistanceMeters += leg.distance.value
    totalDurationSeconds += leg.duration.value
  }

  const totalDistanceMiles = Math.round(totalDistanceMeters * 0.000621371 * 10) / 10
  const totalDurationMinutes = Math.round(totalDurationSeconds / 60)

  // Decode the polyline to get route points
  const routePolyline = route.overview_polyline.points
  const decodedPoints = decodePolyline(routePolyline)

  // Sample waypoints (every ~10 miles or so, max 100 points)
  const sampleInterval = Math.max(1, Math.floor(decodedPoints.length / 100))
  const sampledWaypoints = decodedPoints.filter((_, i) => i % sampleInterval === 0)

  // Detect states along the route
  const stateDetectionResult = await detectStatesFromPoints(sampledWaypoints, apiKey)

  const warnings: string[] = []

  // Add warnings for long routes
  if (totalDistanceMiles > 2000) {
    warnings.push('Route exceeds 2,000 miles - consider driver rest requirements')
  }

  if (stateDetectionResult.states.length > 5) {
    warnings.push(`Route passes through ${stateDetectionResult.states.length} states - multiple permits may be required`)
  }

  return {
    totalDistanceMiles,
    totalDurationMinutes,
    estimatedDriveTime: formatDuration(totalDurationMinutes),
    statesTraversed: stateDetectionResult.states,
    stateSegments: stateDetectionResult.segments,
    stateDistances: stateDetectionResult.distances,
    routePolyline,
    waypoints: sampledWaypoints,
    warnings,
  }
}

/**
 * Detect states from a series of route points using reverse geocoding
 */
async function detectStatesFromPoints(
  points: LatLng[],
  apiKey: string
): Promise<{
  states: string[]
  segments: StateSegment[]
  distances: Record<string, number>
}> {
  const states: string[] = []
  const segments: StateSegment[] = []
  const distances: Record<string, number> = {}

  if (points.length === 0) {
    return { states, segments, distances }
  }

  let currentState = ''
  let segmentStartPoint = points[0]
  let segmentDistance = 0
  let order = 0

  // Sample points for geocoding (to avoid rate limits)
  // Check every ~20 miles (estimate based on total points)
  const checkInterval = Math.max(1, Math.floor(points.length / 50))

  for (let i = 0; i < points.length; i++) {
    const point = points[i]

    // Calculate distance from previous point
    if (i > 0) {
      segmentDistance += calculateDistance(points[i - 1], point)
    }

    // Only geocode at intervals to avoid API rate limits
    if (i % checkInterval === 0 || i === points.length - 1) {
      try {
        const stateCode = await reverseGeocodeState(point, apiKey)

        if (stateCode && stateCode !== currentState) {
          // State changed - record the previous segment
          if (currentState) {
            segments.push({
              stateCode: currentState,
              stateName: STATE_CODE_TO_NAME[currentState] || currentState,
              entryPoint: segmentStartPoint,
              exitPoint: points[i - 1] || point,
              distanceMiles: Math.round(segmentDistance * 10) / 10,
              order,
            })

            distances[currentState] = (distances[currentState] || 0) + segmentDistance
            order++
          }

          // Start new segment
          if (!states.includes(stateCode)) {
            states.push(stateCode)
          }
          currentState = stateCode
          segmentStartPoint = point
          segmentDistance = 0
        }
      } catch {
        // Continue on geocoding errors - don't break the whole calculation
        console.warn(`Failed to geocode point ${point.lat}, ${point.lng}`)
      }
    }
  }

  // Close the last segment
  if (currentState && segmentDistance > 0) {
    segments.push({
      stateCode: currentState,
      stateName: STATE_CODE_TO_NAME[currentState] || currentState,
      entryPoint: segmentStartPoint,
      exitPoint: points[points.length - 1],
      distanceMiles: Math.round(segmentDistance * 10) / 10,
      order,
    })
    distances[currentState] = (distances[currentState] || 0) + segmentDistance
  }

  // Round distances
  for (const state in distances) {
    distances[state] = Math.round(distances[state] * 10) / 10
  }

  return { states, segments, distances }
}

/**
 * Reverse geocode a point to get the state code
 */
async function reverseGeocodeState(point: LatLng, apiKey: string): Promise<string | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${point.lat},${point.lng}&key=${apiKey}&result_type=administrative_area_level_1`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]

      // Find the administrative_area_level_1 component (state)
      for (const component of result.address_components) {
        if (component.types.includes('administrative_area_level_1')) {
          // Try short name first (e.g., "TX")
          if (component.short_name && component.short_name.length === 2) {
            return component.short_name.toUpperCase()
          }
          // Fall back to looking up long name
          const stateName = component.long_name
          if (STATE_NAMES[stateName]) {
            return STATE_NAMES[stateName]
          }
        }
      }
    }
  } catch {
    // Ignore errors, return null
  }

  return null
}

/**
 * Estimate states from origin/destination without calling API
 * Useful for quick estimates before full route calculation
 */
export function estimateStatesFromAddresses(origin: string, destination: string): string[] {
  const states: string[] = []

  // Extract state codes from addresses
  const extractState = (address: string): string | null => {
    // Try to find 2-letter state code
    const stateCodeMatch = address.match(/\b([A-Z]{2})\b/)
    if (stateCodeMatch && STATE_CODE_TO_NAME[stateCodeMatch[1]]) {
      return stateCodeMatch[1]
    }

    // Try to find state name
    for (const [name, code] of Object.entries(STATE_NAMES)) {
      if (address.toLowerCase().includes(name.toLowerCase())) {
        return code
      }
    }

    return null
  }

  const originState = extractState(origin)
  const destState = extractState(destination)

  if (originState) states.push(originState)
  if (destState && destState !== originState) states.push(destState)

  return states
}

/**
 * Get state name from code
 */
export function getStateName(code: string): string {
  return STATE_CODE_TO_NAME[code.toUpperCase()] || code
}

/**
 * Get state code from name
 */
export function getStateCode(name: string): string | undefined {
  return STATE_NAMES[name]
}

/**
 * Get all valid state codes
 */
export function getAllStateCodes(): string[] {
  return Object.keys(STATE_CODE_TO_NAME)
}

/**
 * Check if a state code is valid
 */
export function isValidStateCode(code: string): boolean {
  return code.toUpperCase() in STATE_CODE_TO_NAME
}
