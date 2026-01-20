// Shared Google Maps configuration
// IMPORTANT: This must be defined OUTSIDE of components to prevent
// re-renders from creating new array references

export const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places']

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
