import { NextRequest, NextResponse } from 'next/server'
import { calculateRoute, type RouteResult } from '@/lib/load-planner/route-calculator'

export const runtime = 'nodejs'
export const maxDuration = 30 // Allow up to 30s for route calculation with geocoding

interface CalculateRouteRequest {
  origin: string
  destination: string
  waypoints?: string[]
  options?: {
    avoidTolls?: boolean
    avoidHighways?: boolean
    avoidFerries?: boolean
  }
}

interface CalculateRouteResponse {
  success: boolean
  route?: RouteResult
  error?: string
}

/**
 * POST /api/load-planner/calculate-route
 *
 * Calculate a route using Google Maps Directions API (server-side)
 * Returns distance, duration, states traversed, and permit-related data
 */
export async function POST(request: NextRequest) {
  try {
    const body: CalculateRouteRequest = await request.json()

    // Validate required fields
    if (!body.origin || !body.destination) {
      return NextResponse.json<CalculateRouteResponse>(
        {
          success: false,
          error: 'Origin and destination are required',
        },
        { status: 400 }
      )
    }

    // Trim addresses
    const origin = body.origin.trim()
    const destination = body.destination.trim()

    if (!origin || !destination) {
      return NextResponse.json<CalculateRouteResponse>(
        {
          success: false,
          error: 'Origin and destination cannot be empty',
        },
        { status: 400 }
      )
    }

    // Calculate route
    const routeResult = await calculateRoute(
      origin,
      destination,
      body.waypoints,
      body.options
    )

    return NextResponse.json<CalculateRouteResponse>({
      success: true,
      route: routeResult,
    })
  } catch (error) {
    console.error('Error calculating route:', error)
    return NextResponse.json<CalculateRouteResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate route',
      },
      { status: 500 }
    )
  }
}
