'use client'

import { useEffect, useRef, useState } from 'react'
import { ParsedAddress } from '@/lib/supabase'

interface RouteMapProps {
  pickup: ParsedAddress | null
  dropoff: ParsedAddress | null
  distanceMiles?: number
  durationMinutes?: number
  className?: string
}

export default function RouteMap({ pickup, dropoff, distanceMiles, durationMinutes, className = '' }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load Google Maps script
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.maps) {
      setIsLoaded(true)
      return
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true))
      return
    }

    // Wait for script to be loaded by GooglePlacesAutocomplete
    const checkInterval = setInterval(() => {
      if (window.google?.maps) {
        setIsLoaded(true)
        clearInterval(checkInterval)
      }
    }, 100)

    return () => clearInterval(checkInterval)
  }, [])

  // Initialize map and render route
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        zoom: 5,
        center: { lat: 39.8283, lng: -98.5795 }, // Center of US
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      })

      directionsRendererRef.current = new google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: true, // We'll add custom markers
        polylineOptions: {
          strokeColor: '#6366f1',
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
      })
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    // If we have both pickup and dropoff, show the route
    if (pickup?.lat && pickup?.lng && dropoff?.lat && dropoff?.lng) {
      const directionsService = new google.maps.DirectionsService()

      directionsService.route(
        {
          origin: { lat: pickup.lat, lng: pickup.lng },
          destination: { lat: dropoff.lat, lng: dropoff.lng },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            directionsRendererRef.current?.setDirections(result)
            setError(null)

            // Add custom markers
            const pickupMarker = new google.maps.Marker({
              position: { lat: pickup.lat, lng: pickup.lng },
              map: mapInstanceRef.current,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#22c55e',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              },
              title: 'Pickup: ' + pickup.formatted_address,
            })

            const dropoffMarker = new google.maps.Marker({
              position: { lat: dropoff.lat, lng: dropoff.lng },
              map: mapInstanceRef.current,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#ef4444',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              },
              title: 'Dropoff: ' + dropoff.formatted_address,
            })

            markersRef.current = [pickupMarker, dropoffMarker]

            // Fit bounds to show the entire route
            const bounds = new google.maps.LatLngBounds()
            bounds.extend({ lat: pickup.lat, lng: pickup.lng })
            bounds.extend({ lat: dropoff.lat, lng: dropoff.lng })
            mapInstanceRef.current?.fitBounds(bounds, 50)
          } else {
            setError('Could not calculate route')
            console.error('Directions request failed:', status)
          }
        }
      )
    } else if (pickup?.lat && pickup?.lng) {
      // Just show pickup location
      mapInstanceRef.current?.setCenter({ lat: pickup.lat, lng: pickup.lng })
      mapInstanceRef.current?.setZoom(12)

      const pickupMarker = new google.maps.Marker({
        position: { lat: pickup.lat, lng: pickup.lng },
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#22c55e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'Pickup',
      })
      markersRef.current = [pickupMarker]
      directionsRendererRef.current?.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult)
    } else if (dropoff?.lat && dropoff?.lng) {
      // Just show dropoff location
      mapInstanceRef.current?.setCenter({ lat: dropoff.lat, lng: dropoff.lng })
      mapInstanceRef.current?.setZoom(12)

      const dropoffMarker = new google.maps.Marker({
        position: { lat: dropoff.lat, lng: dropoff.lng },
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'Dropoff',
      })
      markersRef.current = [dropoffMarker]
      directionsRendererRef.current?.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult)
    } else {
      // Reset to default view
      mapInstanceRef.current?.setCenter({ lat: 39.8283, lng: -98.5795 })
      mapInstanceRef.current?.setZoom(4)
      directionsRendererRef.current?.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult)
    }
  }, [isLoaded, pickup, dropoff])

  // Format duration
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border border-gray-200 ${className}`}>
      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full min-h-[200px]" />

      {/* Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-500 mt-2 text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Route Info Overlay */}
      {pickup && dropoff && distanceMiles && (
        <div className="absolute top-3 left-3 bg-white rounded-lg shadow-lg px-3 py-2 border border-gray-200">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="font-medium">{distanceMiles.toFixed(0)} mi</span>
            </div>
            {durationMinutes && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{formatDuration(durationMinutes)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 bg-white rounded-lg shadow-lg px-3 py-2 border border-gray-200">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow"></div>
            <span>Pickup</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow"></div>
            <span>Dropoff</span>
          </div>
        </div>
      </div>
    </div>
  )
}
