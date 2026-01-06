import { NextRequest, NextResponse } from 'next/server'

// Google Routes API endpoint
const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'

interface RouteRequest {
  origin: {
    lat: number
    lng: number
  }
  destination: {
    lat: number
    lng: number
  }
  // Optional waypoints for multi-stop
  waypoints?: {
    lat: number
    lng: number
  }[]
}

interface RouteResponse {
  distance_meters: number
  distance_miles: number
  duration_seconds: number
  duration_minutes: number
  duration_text: string
  polyline: string
}

// Convert seconds to human-readable duration
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0) {
    return `${minutes} min`
  } else if (minutes === 0) {
    return `${hours} hr`
  } else {
    return `${hours} hr ${minutes} min`
  }
}

// Convert meters to miles
function metersToMiles(meters: number): number {
  return Math.round((meters / 1609.344) * 100) / 100
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_ROUTES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Routes API key not configured' },
        { status: 500 }
      )
    }

    const body: RouteRequest = await request.json()

    if (!body.origin || !body.destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      )
    }

    // Build the request body for Google Routes API
    const routeRequestBody: Record<string, unknown> = {
      origin: {
        location: {
          latLng: {
            latitude: body.origin.lat,
            longitude: body.origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: body.destination.lat,
            longitude: body.destination.lng,
          },
        },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE', // For consistent results
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
      },
      languageCode: 'en-US',
      units: 'IMPERIAL',
    }

    // Add waypoints if provided (for multi-stop)
    if (body.waypoints && body.waypoints.length > 0) {
      routeRequestBody.intermediates = body.waypoints.map((wp) => ({
        location: {
          latLng: {
            latitude: wp.lat,
            longitude: wp.lng,
          },
        },
      }))
    }

    // Call Google Routes API
    const response = await fetch(ROUTES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify(routeRequestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Routes API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to calculate route', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (!data.routes || data.routes.length === 0) {
      return NextResponse.json(
        { error: 'No route found between the specified locations' },
        { status: 404 }
      )
    }

    const route = data.routes[0]

    // Parse duration (format: "1234s")
    const durationSeconds = parseInt(route.duration?.replace('s', '') || '0', 10)

    const result: RouteResponse = {
      distance_meters: route.distanceMeters || 0,
      distance_miles: metersToMiles(route.distanceMeters || 0),
      duration_seconds: durationSeconds,
      duration_minutes: Math.round(durationSeconds / 60),
      duration_text: formatDuration(durationSeconds),
      polyline: route.polyline?.encodedPolyline || '',
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Route calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support GET for simple queries
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const originLat = searchParams.get('originLat')
  const originLng = searchParams.get('originLng')
  const destLat = searchParams.get('destLat')
  const destLng = searchParams.get('destLng')

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json(
      { error: 'Missing required parameters: originLat, originLng, destLat, destLng' },
      { status: 400 }
    )
  }

  // Create a mock request to reuse POST logic
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({
      origin: {
        lat: parseFloat(originLat),
        lng: parseFloat(originLng),
      },
      destination: {
        lat: parseFloat(destLat),
        lng: parseFloat(destLng),
      },
    }),
  })

  return POST(mockRequest)
}
