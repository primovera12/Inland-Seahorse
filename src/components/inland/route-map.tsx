'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
} from '@react-google-maps/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin, Route, Maximize2, Minimize2 } from 'lucide-react'
import type { InlandDestinationBlock } from '@/types/inland'

const containerStyle = {
  width: '100%',
  height: '100%',
}

const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795, // Center of US
}

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
}

// Marker colors for destinations A-F
const MARKER_COLORS = [
  '#6366F1', // Indigo (A)
  '#F59E0B', // Amber (B)
  '#10B981', // Emerald (C)
  '#EF4444', // Red (D)
  '#8B5CF6', // Violet (E)
  '#EC4899', // Pink (F)
]

interface RouteMapProps {
  destinationBlocks: InlandDestinationBlock[]
  className?: string
}

interface RouteInfo {
  distance: string
  duration: string
}

export function RouteMap({ destinationBlocks, className }: RouteMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [directions, setDirections] = useState<google.maps.DirectionsResult[]>([])
  const [routeInfos, setRouteInfos] = useState<Map<string, RouteInfo>>(new Map())
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  })

  // Filter destinations with valid addresses
  const validDestinations = useMemo(() => {
    return destinationBlocks.filter(
      (d) => d.pickup_address.trim() && d.dropoff_address.trim()
    )
  }, [destinationBlocks])

  // Calculate routes for all valid destinations
  const calculateRoutes = useCallback(async () => {
    if (!isLoaded || validDestinations.length === 0) return

    setIsCalculating(true)
    const directionsService = new google.maps.DirectionsService()
    const newDirections: google.maps.DirectionsResult[] = []
    const newRouteInfos = new Map<string, RouteInfo>()

    for (const dest of validDestinations) {
      try {
        const result = await directionsService.route({
          origin: dest.pickup_address,
          destination: dest.dropoff_address,
          travelMode: google.maps.TravelMode.DRIVING,
        })

        newDirections.push(result)

        // Extract route info
        const leg = result.routes[0]?.legs[0]
        if (leg) {
          newRouteInfos.set(dest.id, {
            distance: leg.distance?.text || 'N/A',
            duration: leg.duration?.text || 'N/A',
          })
        }
      } catch (error) {
        console.error(`Failed to calculate route for destination ${dest.label}:`, error)
      }
    }

    setDirections(newDirections)
    setRouteInfos(newRouteInfos)
    setIsCalculating(false)

    // Fit bounds to show all routes
    if (map && newDirections.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      newDirections.forEach((dir) => {
        dir.routes[0]?.legs[0]?.steps.forEach((step) => {
          bounds.extend(step.start_location)
          bounds.extend(step.end_location)
        })
      })
      map.fitBounds(bounds, 50)
    }
  }, [isLoaded, validDestinations, map])

  // Recalculate routes when destinations change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateRoutes()
    }, 1000) // Debounce

    return () => clearTimeout(timer)
  }, [calculateRoutes])

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  if (loadError) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          <p>Failed to load Google Maps</p>
        </CardContent>
      </Card>
    )
  }

  if (!isLoaded) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading map...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Route Map
            {validDestinations.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({validDestinations.length} route{validDestinations.length > 1 ? 's' : ''})
              </span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {isCalculating && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Calculating...
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <div className={isExpanded ? 'h-[500px]' : 'h-[300px]'}>
        {validDestinations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/30">
            <MapPin className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Enter pickup and dropoff addresses</p>
            <p className="text-xs">to see routes on the map</p>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={4}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={mapOptions}
          >
            {directions.map((direction, index) => (
              <DirectionsRenderer
                key={index}
                directions={direction}
                options={{
                  suppressMarkers: false,
                  polylineOptions: {
                    strokeColor: MARKER_COLORS[index % MARKER_COLORS.length],
                    strokeWeight: 4,
                    strokeOpacity: 0.8,
                  },
                }}
              />
            ))}
          </GoogleMap>
        )}
      </div>
      {/* Route info summary */}
      {routeInfos.size > 0 && (
        <div className="p-3 border-t bg-muted/20">
          <div className="grid gap-2">
            {validDestinations.map((dest, index) => {
              const info = routeInfos.get(dest.id)
              if (!info) return null
              return (
                <div
                  key={dest.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: MARKER_COLORS[index % MARKER_COLORS.length] }}
                    />
                    <span className="font-medium">Destination {dest.label}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {info.distance} • {info.duration}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
