'use client'

import { useCallback, useState, useRef } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
} from '@react-google-maps/api'
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '@/lib/google-maps'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin, Route, Maximize2, Minimize2 } from 'lucide-react'

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

interface RouteData {
  distanceMiles: number
  durationMinutes: number
  polyline: string
}

interface SimpleRouteMapProps {
  origin: string
  destination: string
  className?: string
  onRouteCalculated?: (data: RouteData) => void
}

export function SimpleRouteMap({
  origin,
  destination,
  className,
  onRouteCalculated,
}: SimpleRouteMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const lastCalculatedRef = useRef<string>('')

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  const hasValidAddresses = origin.trim() && destination.trim()
  const currentHash = `${origin}|${destination}`
  const needsRecalculation = hasValidAddresses && currentHash !== lastCalculatedRef.current

  const calculateRoute = useCallback(async () => {
    if (!isLoaded || !hasValidAddresses) return

    setIsCalculating(true)
    const directionsService = new google.maps.DirectionsService()

    try {
      const result = await directionsService.route({
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      })

      setDirections(result)
      lastCalculatedRef.current = currentHash

      const route = result.routes[0]
      const leg = route?.legs[0]
      if (leg && route) {
        setRouteInfo({
          distance: leg.distance?.text || 'N/A',
          duration: leg.duration?.text || 'N/A',
        })

        const totalDistanceMeters = route.legs.reduce((sum, l) => sum + (l.distance?.value || 0), 0)
        const totalDurationSeconds = route.legs.reduce((sum, l) => sum + (l.duration?.value || 0), 0)
        const totalDistanceMiles = Math.round(totalDistanceMeters * 0.000621371 * 10) / 10
        const totalDurationMinutes = Math.round(totalDurationSeconds / 60)

        const overviewPolyline = route.overview_polyline as unknown
        const polylineString = typeof overviewPolyline === 'string'
          ? overviewPolyline
          : (overviewPolyline as { points?: string })?.points || ''

        onRouteCalculated?.({
          distanceMiles: totalDistanceMiles,
          durationMinutes: totalDurationMinutes,
          polyline: polylineString,
        })

        // Fit bounds to show the route
        if (map) {
          const bounds = new google.maps.LatLngBounds()
          route.legs[0]?.steps.forEach((step) => {
            bounds.extend(step.start_location)
            bounds.extend(step.end_location)
          })
          map.fitBounds(bounds, 50)
        }
      }
    } catch (error) {
      console.error('Failed to calculate route:', error)
    } finally {
      setIsCalculating(false)
    }
  }, [isLoaded, hasValidAddresses, origin, destination, currentHash, map, onRouteCalculated])

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
        {!hasValidAddresses ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/30">
            <MapPin className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Enter pickup and dropoff addresses</p>
            <p className="text-xs">to see the route on the map</p>
          </div>
        ) : !directions && !isCalculating ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/30">
            <Route className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Click &quot;Calculate Route&quot; to show the route</p>
            <Button
              variant="default"
              size="sm"
              className="mt-3"
              onClick={calculateRoute}
            >
              <Route className="h-4 w-4 mr-2" />
              Calculate Route
            </Button>
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
            {directions && (
              <DirectionsRenderer
                directions={directions}
                options={{
                  suppressMarkers: false,
                  polylineOptions: {
                    strokeColor: '#4285F4',
                    strokeWeight: 4,
                    strokeOpacity: 0.8,
                  },
                }}
              />
            )}
          </GoogleMap>
        )}
      </div>
      {/* Route info summary */}
      {routeInfo && (
        <div className="p-3 border-t bg-muted/20">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Distance &amp; Duration</span>
            <span className="font-medium">
              {routeInfo.distance} &bull; {routeInfo.duration}
            </span>
          </div>
        </div>
      )}
      {/* Calculate Route button when route exists but needs recalculation */}
      {needsRecalculation && directions && (
        <div className="p-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={calculateRoute}
            disabled={isCalculating}
          >
            {isCalculating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Route className="h-4 w-4 mr-2" />
                Recalculate Route
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  )
}
