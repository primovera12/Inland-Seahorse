// PDF Utility Functions

import { formatCurrency } from '@/lib/utils'
import { formatDimension, formatWeight, inchesToCm } from '@/lib/dimensions'

// Re-export for convenience
export { formatCurrency, formatDimension, formatWeight }

// Format dimension with metric (like template: "6,058 mm (20')")
export function formatDimensionWithMetric(inches: number): string {
  if (!inches || inches <= 0) return '-'

  const mm = Math.round(inches * 25.4)
  const feet = Math.floor(inches / 12)
  const remainingInches = Math.round(inches % 12)

  // Format like: "6,058 mm (20')" or "2,438 mm (8')"
  const feetStr = remainingInches > 0 ? `${feet}' ${remainingInches}"` : `${feet}'`
  return `${mm.toLocaleString()} mm (${feetStr})`
}

// Format weight with metric
export function formatWeightWithMetric(lbs: number): string {
  if (!lbs || lbs <= 0) return '-'

  const kg = Math.round(lbs * 0.453592)
  return `${kg.toLocaleString()} kg`
}

// Format address parts into single string
export function formatAddress(parts: {
  address?: string
  city?: string
  state?: string
  zip?: string
}): string {
  const lines: string[] = []

  if (parts.address) {
    lines.push(parts.address)
  }

  const cityStateZip = [parts.city, parts.state, parts.zip].filter(Boolean).join(', ')
  if (cityStateZip) {
    lines.push(cityStateZip)
  }

  return lines.join(', ')
}

// Format address for multi-line display
export function formatAddressMultiline(parts: {
  address?: string
  city?: string
  state?: string
  zip?: string
}): string[] {
  const lines: string[] = []

  if (parts.address) {
    lines.push(parts.address)
  }

  const cityStateZip = [parts.city, parts.state, parts.zip].filter(Boolean).join(', ')
  if (cityStateZip) {
    lines.push(cityStateZip)
  }

  return lines.length > 0 ? lines : ['-']
}

// Port/yard addresses for dismantle locations
export const LOCATION_ADDRESSES: Record<string, { name: string; address: string }> = {
  'New Jersey': {
    name: 'New Jersey Terminal',
    address: 'Port Newark, NJ',
  },
  Savannah: {
    name: 'Savannah Port',
    address: 'Garden City, GA',
  },
  Houston: {
    name: 'Houston Terminal',
    address: 'Houston, TX',
  },
  Chicago: {
    name: 'Chicago Yard',
    address: 'Chicago, IL',
  },
  Oakland: {
    name: 'Oakland Port',
    address: 'Oakland, CA',
  },
  'Long Beach': {
    name: 'Long Beach Port',
    address: 'Long Beach, CA',
  },
}

// Get location display info
export function getLocationInfo(location: string): { name: string; address: string } {
  return (
    LOCATION_ADDRESSES[location] || {
      name: location,
      address: '',
    }
  )
}

// Generate quote title based on type
export function getQuoteTitle(quoteType: 'dismantle' | 'inland'): string {
  return quoteType === 'dismantle' ? 'QUOTATION' : 'INLAND QUOTATION'
}

// Default primary color (navy blue from template)
export const DEFAULT_PRIMARY_COLOR = '#1e3a8a'

// Default secondary color (slate grey)
export const DEFAULT_SECONDARY_COLOR = '#475569'

// Convert hex to RGB for jsPDF
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : hexToRgb(DEFAULT_PRIMARY_COLOR)
}

// Load image as base64 for PDF embedding
export async function loadImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null

  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// Preload all images for PDF
export async function preloadPDFImages(data: {
  companyLogoUrl?: string
  equipment: Array<{ frontImageUrl?: string; sideImageUrl?: string }>
}): Promise<{
  logo: string | null
  equipmentImages: Array<{ front: string | null; side: string | null }>
}> {
  const imagePromises: Promise<string | null>[] = []

  // Company logo
  imagePromises.push(loadImageAsBase64(data.companyLogoUrl || ''))

  // Equipment images
  data.equipment.forEach((eq) => {
    imagePromises.push(loadImageAsBase64(eq.frontImageUrl || ''))
    imagePromises.push(loadImageAsBase64(eq.sideImageUrl || ''))
  })

  const results = await Promise.all(imagePromises)

  return {
    logo: results[0],
    equipmentImages: data.equipment.map((_, index) => ({
      front: results[1 + index * 2],
      side: results[2 + index * 2],
    })),
  }
}

// CSS for print optimization
export const PRINT_STYLES = `
  @media print {
    .no-print {
      display: none !important;
    }
    .print-shadow-none {
      box-shadow: none !important;
    }
    body {
      background-color: white !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-break {
      page-break-before: always;
    }
    .avoid-break {
      page-break-inside: avoid;
    }
  }
`

// Calculate content height for page breaks
export function shouldAddPageBreak(currentY: number, contentHeight: number, pageHeight: number = 280): boolean {
  return currentY + contentHeight > pageHeight
}
