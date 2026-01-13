'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'
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

// Libraries needed for Places
const libraries: ('places')[] = ['places']

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
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  })

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

  // Store callbacks in refs to avoid recreating autocomplete on every render
  const onChangeRef = useRef(onChange)
  const onSelectRef = useRef(onSelect)
  const valueRef = useRef(value)

  useEffect(() => {
    onChangeRef.current = onChange
    onSelectRef.current = onSelect
    valueRef.current = value
  })

  // Initialize autocomplete - only runs once when API is loaded
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'address_components', 'geometry', 'place_id', 'name'],
      types: ['geocode', 'establishment'],
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place.formatted_address) {
        onChangeRef.current(place.formatted_address)
        if (onSelectRef.current) {
          const components = parseAddressComponents(place, valueRef.current)
          onSelectRef.current(components)
        }
      }
    })

    autocompleteRef.current = autocomplete

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [isLoaded, parseAddressComponents])

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className="relative">
      <MapPin
        className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors',
          isFocused && 'text-primary'
        )}
      />
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
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
    </div>
  )
}
