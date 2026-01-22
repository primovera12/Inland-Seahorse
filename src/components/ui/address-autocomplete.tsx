'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '@/lib/google-maps'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AddressComponents {
  address: string
  city?: string
  state?: string
  zip?: string
  country?: string
  lat?: number
  lng?: number
  placeId?: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (components: AddressComponents) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Enter address...',
  className,
  disabled,
  id,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  // Create a new session token (should be done at start of each new search session)
  const createNewSession = useCallback(() => {
    if (isLoaded) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
    }
  }, [isLoaded])

  // Parse address components from Place result
  const parseAddressComponents = useCallback(
    (place: google.maps.places.PlaceResult, currentValue: string): AddressComponents => {
      const result: AddressComponents = {
        address: place.formatted_address || currentValue,
        placeId: place.place_id,
      }

      // Get lat/lng
      if (place.geometry?.location) {
        result.lat = place.geometry.location.lat()
        result.lng = place.geometry.location.lng()
      }

      // Parse address components
      place.address_components?.forEach((component) => {
        const types = component.types

        if (types.includes('locality')) {
          result.city = component.long_name
        } else if (types.includes('administrative_area_level_1')) {
          result.state = component.short_name
        } else if (types.includes('postal_code')) {
          result.zip = component.long_name
        } else if (types.includes('country')) {
          result.country = component.short_name
        }
      })

      return result
    },
    []
  )

  // Store callbacks in refs to avoid issues with stale closures
  const onChangeRef = useRef(onChange)
  const onSelectRef = useRef(onSelect)
  const valueRef = useRef(value)

  useEffect(() => {
    onChangeRef.current = onChange
    onSelectRef.current = onSelect
    valueRef.current = value
  })

  // Initialize services once when API is loaded
  useEffect(() => {
    if (!isLoaded) return

    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService()
    }

    // Create a hidden div for PlacesService (required by API)
    if (!placesServiceRef.current) {
      const div = document.createElement('div')
      placesServiceRef.current = new google.maps.places.PlacesService(div)
    }

    // Create initial session token
    createNewSession()

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [isLoaded, createNewSession])

  // Fetch predictions with debouncing and session token
  const fetchPredictions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || !input.trim()) {
      setPredictions([])
      return
    }

    // Clear any pending request
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce to reduce API calls
    debounceRef.current = setTimeout(() => {
      // Ensure we have a session token
      if (!sessionTokenRef.current) {
        createNewSession()
      }

      autocompleteServiceRef.current?.getPlacePredictions(
        {
          input,
          componentRestrictions: { country: ['us', 'ca'] },
          types: ['geocode', 'establishment'],
          sessionToken: sessionTokenRef.current!,
        },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results)
          } else {
            setPredictions([])
          }
        }
      )
    }, 300) // 300ms debounce
  }, [createNewSession])

  // Handle place selection
  const handleSelectPlace = useCallback((placeId: string, description: string) => {
    if (!placesServiceRef.current) return

    // Use the session token for the place details request (completes the session)
    placesServiceRef.current.getDetails(
      {
        placeId,
        fields: ['formatted_address', 'address_components', 'geometry', 'place_id', 'name'],
        sessionToken: sessionTokenRef.current!,
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const address = place.formatted_address || description
          onChangeRef.current(address)

          if (onSelectRef.current) {
            const components = parseAddressComponents(place, address)
            onSelectRef.current(components)
          }
        }

        // Clear predictions and create new session token for next search
        setPredictions([])
        setShowDropdown(false)
        createNewSession()
      }
    )
  }, [parseAddressComponents, createNewSession])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    fetchPredictions(newValue)
    setShowDropdown(true)
  }

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true)
    if (value && predictions.length === 0) {
      fetchPredictions(value)
    }
    setShowDropdown(true)
  }

  // Handle blur with delay to allow click on dropdown
  const handleBlur = () => {
    setIsFocused(false)
    // Delay hiding dropdown to allow click events to fire
    setTimeout(() => {
      setShowDropdown(false)
    }, 200)
  }

  return (
    <div className="relative">
      <MapPin
        className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors z-10',
          isFocused && 'text-primary'
        )}
      />
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled || !isLoaded}
        className={cn('pl-10', className)}
        autoComplete="off"
      />
      {!isLoaded && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Predictions dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none text-sm border-b last:border-b-0"
              onMouseDown={(e) => {
                e.preventDefault() // Prevent blur from firing before click
                handleSelectPlace(prediction.place_id, prediction.description)
              }}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="font-medium">
                    {prediction.structured_formatting?.main_text || prediction.description}
                  </div>
                  {prediction.structured_formatting?.secondary_text && (
                    <div className="text-xs text-muted-foreground">
                      {prediction.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
