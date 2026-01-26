'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
} from '@react-google-maps/api'
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '@/lib/google-maps'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin, Route, Maximize2, Minimize2, CheckCircle2, RotateCcw } from 'lucide-react'

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
  // Existing calculated data from parent (to persist across tab changes)
  existingDistanceMiles?: number | null
  existingDurationMinutes?: number | null
  existingPolyline?: string
  onRouteCalculated?: (data: RouteData) => void
}

export function SimpleRouteMap({
  origin,
  destination,
  className,
  existingDistanceMiles,
  existingDurationMinutes,
  existingPolyline,
  onRouteCalculated,
}: SimpleRouteMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  // Track what origin/destination combination was last calculated
  const lastCalculatedRef = useRef<string>('')
  // Track if we've initialized from existing data
  const initializedFromExistingRef = useRef(false)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  const hasValidAddresses = origin.trim() && destination.trim()
  const currentHash = `${origin}|${destination}`

  // Check if we have existing data that matches current addresses
  const hasExistingData = existingDistanceMiles && existingDistanceMiles > 0

  // Initialize routeInfo from existing data on mount or when existing data changes
  useEffect(() => {
    if (hasExistingData && existingDurationMinutes && !initializedFromExistingRef.current) {
      // Format the existing data for display
      const hours = Math.floor(existingDurationMinutes / 60)
      const mins = existingDurationMinutes % 60
      const durationStr = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`

      setRouteInfo({
        distance: `${existingDistanceMiles.toLocaleString()} mi`,
        duration: durationStr,
      })

      // Mark that we've been calculated for this route
      lastCalculatedRef.current = currentHash
      initializedFromExistingRef.current = true
    }
  }, [hasExistingData, existingDistanceMiles, existingDurationMinutes, currentHash])

  // Reset initialized flag and clear old route when addresses change significantly
  useEffect(() => {
    if (lastCalculatedRef.current && lastCalculatedRef.current !== currentHash) {
      initializedFromExistingRef.current = false
      // Clear the old route so the map doesn't show stale data
      setDirections(null)
      setRouteInfo(null)
    }
  }, [currentHash])

  // Reset map to default view
  const resetMap = useCallback(() => {
    setDirections(null)
    setRouteInfo(null)
    lastCalculatedRef.current = ''
    initializedFromExistingRef.current = false
    if (map) {
      map.setCenter(defaultCenter)
      map.setZoom(4)
    }
  }, [map])

  // Whether the route needs to be (re)calculated
  const needsCalculation = hasValidAddresses && lastCalculatedRef.current !== currentHash && !hasExistingData
  const needsRecalculation = hasValidAddresses && lastCalculatedRef.current !== currentHash && hasExistingData

  const calculateRoute = useCallback(async () => {
    if (!isLoaded || !hasValidAddresses) return

    // IMPORTANT: Prevent duplicate API calls
    if (lastCalculatedRef.current === currentHash && !needsRecalculation) {
      console.log('Route already calculated for these addresses, skipping API call')
      return
    }

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
  }, [isLoaded, hasValidAddresses, origin, destination, currentHash, map, onRouteCalculated, needsRecalculation])

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  if (loadError) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[390px] text-muted-foreground">
          <p>Failed to load Google Maps</p>
        </CardContent>
      </Card>
    )
  }

  if (!isLoaded) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[390px]">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading map...</span>
        </CardContent>
      </Card>
    )
  }

  // Determine what to show based on state
  const showCalculatePrompt = hasValidAddresses && !routeInfo && !isCalculating
  const showMap = hasValidAddresses && (routeInfo || isCalculating || directions)
  const isRouteCalculated = routeInfo && !needsCalculation

  return (
    <Card className={className}>
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Route Map
            {isRouteCalculated && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </span>
          <div className="flex items-center gap-2">
            {isCalculating && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Calculating...
              </span>
            )}
            {(directions || routeInfo) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={resetMap}
                title="Reset map"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
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
      {/* Increased height by 30%: 300 -> 390, 500 -> 650 */}
      <div className={isExpanded ? 'h-[650px]' : 'h-[390px]'}>
        {!hasValidAddresses ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/30">
            <MapPin className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Enter pickup and dropoff addresses</p>
            <p className="text-xs">to see the route on the map</p>
          </div>
        ) : showCalculatePrompt ? (
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
      {/* Route info summary - show if we have route info OR existing data */}
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
      {/* Calculate Route button when addresses changed and need recalculation */}
      {needsRecalculation && (
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
