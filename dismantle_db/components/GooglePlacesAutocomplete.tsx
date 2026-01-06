'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ParsedAddress } from '@/lib/supabase'

interface GooglePlacesAutocompleteProps {
  value: ParsedAddress | null
  onChange: (address: ParsedAddress | null) => void
  placeholder?: string
  label?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

// Extend Window to include google types
declare global {
  interface Window {
    google: typeof google
    initGooglePlaces?: () => void
  }
}

// Parse Google Place result into our address format
function parsePlace(place: google.maps.places.PlaceResult): ParsedAddress | null {
  if (!place.geometry?.location || !place.address_components) {
    return null
  }

  const getComponent = (types: string[]): string => {
    const component = place.address_components?.find((c) =>
      types.some((t) => c.types.includes(t))
    )
    return component?.long_name || ''
  }

  const getShortComponent = (types: string[]): string => {
    const component = place.address_components?.find((c) =>
      types.some((t) => c.types.includes(t))
    )
    return component?.short_name || ''
  }

  // Build street address from components
  const streetNumber = getComponent(['street_number'])
  const route = getComponent(['route'])
  let address = streetNumber && route ? `${streetNumber} ${route}` : route || getComponent(['premise', 'subpremise'])

  // Check if this is a business/establishment (has a name different from the address)
  const isEstablishment = place.types?.some(t =>
    ['establishment', 'point_of_interest', 'store', 'food', 'restaurant', 'lodging', 'health', 'finance'].includes(t)
  )
  const businessName = place.name

  // If it's a business and has a name, prepend it to the address
  if (isEstablishment && businessName && businessName !== address) {
    address = businessName
  }

  // Build formatted address with business name if applicable
  let formattedAddress = place.formatted_address || ''
  if (isEstablishment && businessName && !formattedAddress.startsWith(businessName)) {
    formattedAddress = `${businessName}, ${formattedAddress}`
  }

  return {
    address: address || place.formatted_address?.split(',')[0] || '',
    city: getComponent(['locality', 'sublocality', 'administrative_area_level_3']),
    state: getShortComponent(['administrative_area_level_1']),
    zip: getComponent(['postal_code']),
    country: getShortComponent(['country']),
    formatted_address: formattedAddress,
    place_id: place.place_id || '',
    lat: place.geometry.location.lat(),
    lng: place.geometry.location.lng(),
  }
}

// Load Google Maps script
let googleScriptLoaded = false
let googleScriptLoading = false
let googleScriptError: string | null = null
const loadCallbacks: Array<{ resolve: () => void; reject: (err: Error) => void }> = []

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded successfully
    if (googleScriptLoaded && window.google?.maps?.places) {
      resolve()
      return
    }

    // If there was a previous error, return it
    if (googleScriptError) {
      reject(new Error(googleScriptError))
      return
    }

    // If currently loading, queue this callback
    if (googleScriptLoading) {
      loadCallbacks.push({ resolve, reject })
      return
    }

    // Check if script already exists (maybe loaded by another component)
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkLoaded)
          googleScriptLoaded = true
          resolve()
        }
      }, 100)

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkLoaded)
        if (!window.google?.maps?.places) {
          reject(new Error('Google Maps script timeout - check API key and billing'))
        }
      }, 10000)
      return
    }

    googleScriptLoading = true

    // Create and configure script element
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    // Success handler - poll for google.maps.places to be available
    script.onload = () => {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkLoaded)
          googleScriptLoaded = true
          googleScriptLoading = false
          resolve()
          loadCallbacks.forEach((cb) => cb.resolve())
          loadCallbacks.length = 0
        }
      }, 50)

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkLoaded)
        if (!googleScriptLoaded) {
          const error = 'Google Maps Places library failed to initialize - check API key restrictions and enabled APIs'
          googleScriptError = error
          googleScriptLoading = false
          reject(new Error(error))
          loadCallbacks.forEach((cb) => cb.reject(new Error(error)))
          loadCallbacks.length = 0
        }
      }, 5000)
    }

    script.onerror = () => {
      const error = 'Failed to load Google Maps - check API key, billing, and network connection'
      googleScriptError = error
      googleScriptLoading = false
      reject(new Error(error))
      loadCallbacks.forEach((cb) => cb.reject(new Error(error)))
      loadCallbacks.length = 0
    }

    document.head.appendChild(script)
  })
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Enter address...',
  label,
  required = false,
  disabled = false,
  className = '',
}: GooglePlacesAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value?.formatted_address || '')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  // Initialize Google Places Autocomplete
  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return

    // Clear any existing autocomplete
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current)
    }

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      // Allow both addresses and establishments (businesses, places)
      componentRestrictions: { country: ['us', 'ca', 'mx'] }, // US, Canada, Mexico
      fields: ['address_components', 'formatted_address', 'geometry', 'place_id', 'name', 'types'],
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()

      if (!place.geometry) {
        // User pressed enter without selecting a suggestion
        return
      }

      const parsed = parsePlace(place)
      if (parsed) {
        setInputValue(parsed.formatted_address || '')
        onChange(parsed)
      }
    })

    autocompleteRef.current = autocomplete
  }, [onChange])

  // Load Google Maps script on mount
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError('Google Maps API key not configured')
      setIsLoading(false)
      return
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        setIsLoading(false)
        initAutocomplete()
      })
      .catch((err) => {
        setError(err.message)
        setIsLoading(false)
      })
  }, [initAutocomplete])

  // Re-initialize when input becomes available
  useEffect(() => {
    if (!isLoading && inputRef.current && window.google?.maps?.places) {
      initAutocomplete()
    }
  }, [isLoading, initAutocomplete])

  // Update input when value changes externally
  useEffect(() => {
    if (value?.formatted_address !== inputValue && !isFocused) {
      setInputValue(value?.formatted_address || '')
    }
  }, [value, inputValue, isFocused])

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Clear the parsed address if user is typing
    if (value && newValue !== value.formatted_address) {
      onChange(null)
    }
  }

  // Handle blur - clear if no valid selection
  const handleBlur = () => {
    setIsFocused(false)

    // If there's text but no valid address, keep it for now
    // The form validation will catch invalid addresses
  }

  // Handle clear button
  const handleClear = () => {
    setInputValue('')
    onChange(null)
    inputRef.current?.focus()
  }

  if (error) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={isLoading ? 'Loading...' : placeholder}
          disabled={disabled || isLoading}
          required={required}
          className={`
            w-full px-4 py-2.5 pr-10
            border rounded-lg
            text-gray-900 placeholder-gray-400
            transition-colors duration-200
            ${disabled || isLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            ${value ? 'border-green-300 focus:border-green-500 focus:ring-green-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'}
            focus:outline-none focus:ring-2
          `}
        />

        {/* Status indicator */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}

          {!isLoading && value && (
            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}

          {!isLoading && inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              tabIndex={-1}
            >
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Address details preview */}
      {value && (
        <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
          {value.city && <span>City: {value.city}</span>}
          {value.state && <span>State: {value.state}</span>}
          {value.zip && <span>ZIP: {value.zip}</span>}
        </div>
      )}
    </div>
  )
}
