/**
 * Client-side Route Calculator for Load Planner
 *
 * Uses Google Maps JavaScript API (works with referer-restricted API keys)
 * to calculate routes and extract state traversal data for permit calculations.
 */

import type { RouteResult, LatLng, StateSegment } from './route-calculator'

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
function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
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
function calculateDistance(point1: LatLng, point2: LatLng): number {
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
function formatDuration(minutes: number): string {
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
 * Reverse geocode a point to get the state code using Google Maps Geocoder
 * This uses the client-side API which works with referer-restricted keys
 */
async function reverseGeocodeState(
  geocoder: google.maps.Geocoder,
  point: LatLng
): Promise<string | null> {
  return new Promise((resolve) => {
    geocoder.geocode(
      { location: { lat: point.lat, lng: point.lng } },
      (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          // Find the administrative_area_level_1 component (state)
          for (const result of results) {
            for (const component of result.address_components) {
              if (component.types.includes('administrative_area_level_1')) {
                // Try short name first (e.g., "TX")
                if (component.short_name && component.short_name.length === 2) {
                  resolve(component.short_name.toUpperCase())
                  return
                }
                // Fall back to looking up long name
                const stateName = component.long_name
                if (STATE_NAMES[stateName]) {
                  resolve(STATE_NAMES[stateName])
                  return
                }
              }
            }
          }
        }
        resolve(null)
      }
    )
  })
}

/**
 * Detect states from a series of route points using client-side Geocoder
 */
async function detectStatesFromPoints(
  points: LatLng[],
  geocoder: google.maps.Geocoder
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
  const checkInterval = Math.max(1, Math.floor(points.length / 30))

  for (let i = 0; i < points.length; i++) {
    const point = points[i]

    // Calculate distance from previous point
    if (i > 0) {
      segmentDistance += calculateDistance(points[i - 1], point)
    }

    // Only geocode at intervals to avoid API rate limits
    if (i % checkInterval === 0 || i === points.length - 1) {
      try {
        const stateCode = await reverseGeocodeState(geocoder, point)

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
        // Continue on geocoding errors
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
 * Calculate a route using client-side Google Maps JavaScript API
 * This works with referer-restricted API keys
 */
export async function calculateRouteClientSide(
  origin: string,
  destination: string,
  waypoints?: string[]
): Promise<RouteResult> {
  // Ensure Google Maps is loaded
  if (typeof google === 'undefined' || !google.maps) {
    throw new Error('Google Maps JavaScript API is not loaded')
  }

  const directionsService = new google.maps.DirectionsService()
  const geocoder = new google.maps.Geocoder()

  // Build waypoints if provided
  const waypointLocations = waypoints?.map((wp) => ({
    location: wp,
    stopover: true,
  }))

  // Get directions
  const result = await directionsService.route({
    origin,
    destination,
    waypoints: waypointLocations,
    travelMode: google.maps.TravelMode.DRIVING,
  })

  const route = result.routes[0]
  if (!route) {
    throw new Error('No route found')
  }

  // Calculate totals across all legs
  let totalDistanceMeters = 0
  let totalDurationSeconds = 0

  for (const leg of route.legs) {
    totalDistanceMeters += leg.distance?.value || 0
    totalDurationSeconds += leg.duration?.value || 0
  }

  const totalDistanceMiles = Math.round(totalDistanceMeters * 0.000621371 * 10) / 10
  const totalDurationMinutes = Math.round(totalDurationSeconds / 60)

  // Get the polyline
  const overviewPolyline = route.overview_polyline as unknown
  const routePolyline =
    typeof overviewPolyline === 'string'
      ? overviewPolyline
      : (overviewPolyline as { points?: string })?.points || ''

  // Decode the polyline to get route points
  const decodedPoints = decodePolyline(routePolyline)

  // Sample waypoints (every ~10 miles or so, max 100 points)
  const sampleInterval = Math.max(1, Math.floor(decodedPoints.length / 100))
  const sampledWaypoints = decodedPoints.filter((_, i) => i % sampleInterval === 0)

  // Detect states along the route using client-side geocoding
  const stateDetectionResult = await detectStatesFromPoints(sampledWaypoints, geocoder)

  const warnings: string[] = []

  // Add warnings for long routes
  if (totalDistanceMiles > 2000) {
    warnings.push('Route exceeds 2,000 miles - consider driver rest requirements')
  }

  if (stateDetectionResult.states.length > 5) {
    warnings.push(
      `Route passes through ${stateDetectionResult.states.length} states - multiple permits may be required`
    )
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
