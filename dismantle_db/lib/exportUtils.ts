import { RateLookup, LocationCost, EquipmentDimensions, LOCATIONS } from './supabase'

// Extended rate data with dimensions and location costs
export interface RateWithFullData extends RateLookup {
  dimensions?: EquipmentDimensions | null
  locationCosts?: Map<string, LocationCost>
}

export function exportToCSV(data: RateLookup[], filename: string = 'rates-export.csv') {
  if (data.length === 0) {
    alert('No data to export')
    return
  }

  // CSV headers
  const headers = ['Make', 'Model', 'Price', 'Notes', 'Last Updated']

  // CSV rows
  const rows = data.map(rate => [
    rate.make,
    rate.model,
    rate.price !== null ? rate.price.toString() : '',
    rate.notes || '',
    new Date(rate.updated_at).toLocaleDateString()
  ])

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma
        const cellStr = String(cell).replace(/"/g, '""')
        return cellStr.includes(',') ? `"${cellStr}"` : cellStr
      }).join(',')
    )
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Comprehensive export with dimensions and location costs
export function exportComprehensiveToCSV(
  data: RateWithFullData[],
  filename: string = 'equipment-comprehensive-export.csv'
) {
  if (data.length === 0) {
    alert('No data to export')
    return
  }

  // Build comprehensive headers
  const baseHeaders = ['Make', 'Model', 'Price', 'Notes', 'Last Updated']
  const dimensionHeaders = [
    'Operating Weight (lbs)',
    'Transport Length (in)',
    'Transport Width (in)',
    'Transport Height (in)',
    'Has Front Image',
    'Has Side Image'
  ]

  // Location cost headers for each location
  const locationCostFields = [
    'Loading',
    'Blocking & Bracing',
    'NCB Survey',
    'Local Drayage',
    'Chassis',
    'Tolls',
    'Escorts',
    'Power Wash',
    'Waste Fluids'
  ]

  const locationHeaders: string[] = []
  LOCATIONS.forEach(location => {
    locationCostFields.forEach(field => {
      locationHeaders.push(`${location} - ${field}`)
    })
  })

  const headers = [...baseHeaders, ...dimensionHeaders, ...locationHeaders]

  // CSV rows
  const rows = data.map(rate => {
    // Base data
    const baseData = [
      rate.make,
      rate.model,
      rate.price !== null ? rate.price.toString() : '',
      rate.notes || '',
      new Date(rate.updated_at).toLocaleDateString()
    ]

    // Dimension data
    const dimensionData = [
      rate.dimensions?.operating_weight?.toString() || '',
      rate.dimensions?.transport_length?.toString() || '',
      rate.dimensions?.transport_width?.toString() || '',
      rate.dimensions?.transport_height?.toString() || '',
      rate.dimensions?.front_image_base64 ? 'Yes' : 'No',
      rate.dimensions?.side_image_base64 ? 'Yes' : 'No'
    ]

    // Location costs data
    const locationData: string[] = []
    LOCATIONS.forEach(location => {
      const costs = rate.locationCosts?.get(location)
      locationData.push(
        costs?.loading_cost?.toString() || '',
        costs?.blocking_bracing_cost?.toString() || '',
        costs?.ncb_survey_cost?.toString() || '',
        costs?.local_drayage_cost?.toString() || '',
        costs?.chassis_cost?.toString() || '',
        costs?.tolls_cost?.toString() || '',
        costs?.escorts_cost?.toString() || '',
        costs?.power_wash_cost?.toString() || '',
        costs?.waste_fluids_disposal_fee?.toString() || ''
      )
    })

    return [...baseData, ...dimensionData, ...locationData]
  })

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma or newline
        const cellStr = String(cell).replace(/"/g, '""')
        return (cellStr.includes(',') || cellStr.includes('\n')) ? `"${cellStr}"` : cellStr
      }).join(',')
    )
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Export only dimensions data
export function exportDimensionsToCSV(
  data: RateWithFullData[],
  filename: string = 'equipment-dimensions-export.csv'
) {
  if (data.length === 0) {
    alert('No data to export')
    return
  }

  // Filter to only items with dimensions
  const dataWithDimensions = data.filter(r => r.dimensions)

  if (dataWithDimensions.length === 0) {
    alert('No equipment with dimensions to export')
    return
  }

  const headers = [
    'Make',
    'Model',
    'Equipment Type',
    'Operating Weight (lbs)',
    'Transport Length (in)',
    'Transport Width (in)',
    'Transport Height (in)',
    'Has Front Image',
    'Has Side Image'
  ]

  const rows = dataWithDimensions.map(rate => [
    rate.make,
    rate.model,
    rate.dimensions?.equipment_type || 'other',
    rate.dimensions?.operating_weight?.toString() || '',
    rate.dimensions?.transport_length?.toString() || '',
    rate.dimensions?.transport_width?.toString() || '',
    rate.dimensions?.transport_height?.toString() || '',
    rate.dimensions?.front_image_base64 ? 'Yes' : 'No',
    rate.dimensions?.side_image_base64 ? 'Yes' : 'No'
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        const cellStr = String(cell).replace(/"/g, '""')
        return cellStr.includes(',') ? `"${cellStr}"` : cellStr
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToExcel(data: RateLookup[], filename: string = 'rates-export.xlsx') {
  // For Excel, we'll export as CSV with .xlsx extension
  // For a true Excel file, we'd need a library like xlsx
  exportToCSV(data, filename.replace('.xlsx', '.csv'))
}

export interface ExportStats {
  totalRecords: number
  withPrices: number
  withoutPrices: number
  averagePrice: number
  minPrice: number
  maxPrice: number
  withDimensions?: number
  withImages?: number
}

export function calculateStats(data: RateLookup[]): ExportStats {
  const withPrices = data.filter(r => r.price !== null)
  const prices = withPrices.map(r => r.price!)

  return {
    totalRecords: data.length,
    withPrices: withPrices.length,
    withoutPrices: data.length - withPrices.length,
    averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0
  }
}

export function calculateComprehensiveStats(data: RateWithFullData[]): ExportStats {
  const withPrices = data.filter(r => r.price !== null)
  const prices = withPrices.map(r => r.price!)
  const withDimensions = data.filter(r => r.dimensions !== null && r.dimensions !== undefined)
  const withImages = data.filter(r =>
    r.dimensions?.front_image_base64 || r.dimensions?.side_image_base64
  )

  return {
    totalRecords: data.length,
    withPrices: withPrices.length,
    withoutPrices: data.length - withPrices.length,
    averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    withDimensions: withDimensions.length,
    withImages: withImages.length
  }
}
