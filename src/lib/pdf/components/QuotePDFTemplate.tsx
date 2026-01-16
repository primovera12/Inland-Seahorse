'use client'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { formatDimension, formatWeight, formatAddressMultiline, getLocationInfo, DEFAULT_PRIMARY_COLOR } from '../pdf-utils'
import type { UnifiedPDFData, ServiceLineItem, CostCategory, InlandLoadBlock } from '../types'
import { generateServiceLineItems, CATEGORY_STYLES, COST_LABELS, COST_FIELD_CATEGORIES } from '../types'

interface QuotePDFTemplateProps {
  data: UnifiedPDFData
  className?: string
}

// Category badge component
function CategoryBadge({ category }: { category: CostCategory }) {
  const style = CATEGORY_STYLES[category]
  return (
    <span
      className={cn(
        'text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide',
        style.bg,
        style.text
      )}
    >
      {style.label}
    </span>
  )
}

// Header section with company info and quote details
function HeaderSection({ data }: { data: UnifiedPDFData }) {
  const primaryColor = data.company.primaryColor || DEFAULT_PRIMARY_COLOR

  return (
    <div
      className="p-8 border-b border-slate-100 flex justify-between items-start"
      style={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}
    >
      {/* Company Info */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {data.company.logoUrl ? (
            <img
              src={data.company.logoUrl}
              alt={data.company.name}
              className="w-auto object-contain"
              style={{
                height: `${Math.max(60, (data.company.logoSizePercentage || 100) * 0.8)}px`,
                maxWidth: `${(data.company.logoSizePercentage || 100) * 2.5}px`
              }}
            />
          ) : (
            <div className="text-2xl font-extrabold tracking-tighter uppercase" style={{ color: primaryColor }}>
              {data.company.name}
            </div>
          )}
        </div>
        <div className="text-sm space-y-1 text-slate-500">
          {data.company.address && <p>{data.company.address}</p>}
          {data.company.email && <p>{data.company.email}</p>}
          {data.company.phone && <p>{data.company.phone}</p>}
        </div>
      </div>

      {/* Quote Info */}
      <div className="text-right">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: primaryColor }}>
          {data.quoteType === 'dismantle' ? 'QUOTATION' : 'INLAND QUOTATION'}
        </h1>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-slate-500 font-medium">Quote ID</span>
          <span className="font-bold text-slate-900">#{data.quoteNumber}</span>
          <span className="text-slate-500 font-medium">Issue Date</span>
          <span className="text-slate-900">{data.issueDate}</span>
          {data.validUntil && (
            <>
              <span className="text-slate-500 font-medium">Valid Until</span>
              <span className="text-slate-900">{data.validUntil}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Client information section
function ClientSection({ data }: { data: UnifiedPDFData }) {
  const primaryColor = data.company.primaryColor || DEFAULT_PRIMARY_COLOR
  const addressLines = formatAddressMultiline({
    address: data.customer.address,
    city: data.customer.city,
    state: data.customer.state,
    zip: data.customer.zip,
  })

  return (
    <div className="p-8 border-b border-slate-100">
      <h3
        className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"
        style={{ color: primaryColor }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Client Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Company Name */}
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">
            Company Name
          </p>
          <p className="text-sm font-bold text-slate-900 leading-tight">
            {data.customer.company || '-'}
          </p>
        </div>

        {/* Contact Person */}
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">
            Contact Person
          </p>
          <p className="text-sm font-bold text-slate-900">{data.customer.name}</p>
        </div>

        {/* Phone */}
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">
            Phone Number
          </p>
          <p className="text-sm font-bold text-slate-900">{data.customer.phone || '-'}</p>
        </div>

        {/* Email */}
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">
            Email Address
          </p>
          <p className="text-sm font-bold text-slate-900 break-words">
            {data.customer.email || '-'}
          </p>
        </div>

        {/* Address */}
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">
            Billing Address
          </p>
          <p className="text-sm font-bold text-slate-900 leading-tight">
            {addressLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < addressLines.length - 1 && <br />}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  )
}

// Location section - handles both dismantle and inland quotes
function LocationSection({ data }: { data: UnifiedPDFData }) {
  const primaryColor = data.company.primaryColor || DEFAULT_PRIMARY_COLOR
  const hasInlandTransport = data.inlandTransport?.enabled && data.inlandTransport.pickup && data.inlandTransport.dropoff
  const isInlandOnlyQuote = data.quoteType === 'inland'

  // For inland-only quotes, just show pickup/dropoff/distance
  if (isInlandOnlyQuote && hasInlandTransport) {
    const pickup = data.inlandTransport!.pickup
    const dropoff = data.inlandTransport!.dropoff
    const distanceMiles = data.inlandTransport!.distance_miles
    const durationMinutes = data.inlandTransport!.duration_minutes
    const staticMapUrl = data.inlandTransport!.static_map_url

    return (
      <>
        <div className="grid grid-cols-3 gap-0 border-b border-slate-100">
          {/* Pickup */}
          <div className="p-8 border-r border-slate-100">
            <h3
              className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Pick-up Location
            </h3>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-900">{pickup.address || '-'}</p>
              {(pickup.city || pickup.state || pickup.zip) && (
                <p className="text-sm text-slate-500">
                  {[pickup.city, pickup.state, pickup.zip].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Dropoff */}
          <div className="p-8 border-r border-slate-100">
            <h3
              className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Delivery Location
            </h3>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-900">{dropoff.address || '-'}</p>
              {(dropoff.city || dropoff.state || dropoff.zip) && (
                <p className="text-sm text-slate-500">
                  {[dropoff.city, dropoff.state, dropoff.zip].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Transport Distance */}
          <div className="p-8">
            <h3
              className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Transport Distance
            </h3>
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-900">
                {distanceMiles ? `${Math.round(distanceMiles).toLocaleString()} miles` : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Route Map Preview */}
        {staticMapUrl && (
          <div className="p-8 border-b border-slate-100">
            <h3
              className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Route Preview
            </h3>
            <div className="rounded-lg overflow-hidden border border-slate-200">
              <img
                src={staticMapUrl}
                alt="Route map"
                className="w-full h-auto"
                style={{ maxHeight: '250px', objectFit: 'cover' }}
              />
            </div>
          </div>
        )}
      </>
    )
  }

  // For dismantle quotes, show equipment location (and optionally inland transport)
  const locationInfo = data.location ? getLocationInfo(data.location) : null

  return (
    <>
      {/* Equipment Location (for dismantle quotes) */}
      {locationInfo && (
        <div className="p-8 border-b border-slate-100">
          <h3
            className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ color: primaryColor }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Equipment Location
          </h3>
          <div className="space-y-1">
            <p className="text-base font-bold text-slate-900">{locationInfo.name}</p>
            {locationInfo.address && (
              <p className="text-sm text-slate-500">{locationInfo.address}</p>
            )}
          </div>
        </div>
      )}

      {/* Inland Transport (if enabled for dismantle quote) */}
      {hasInlandTransport && !isInlandOnlyQuote && (
        <>
          <div className="grid grid-cols-3 gap-0 border-b border-slate-100">
            {/* Pickup */}
            <div className="p-8 border-r border-slate-100">
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
                style={{ color: primaryColor }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Transport Pick-up
              </h3>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-900">{data.inlandTransport!.pickup.address || '-'}</p>
                {(data.inlandTransport!.pickup.city || data.inlandTransport!.pickup.state || data.inlandTransport!.pickup.zip) && (
                  <p className="text-sm text-slate-500">
                    {[data.inlandTransport!.pickup.city, data.inlandTransport!.pickup.state, data.inlandTransport!.pickup.zip].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Dropoff */}
            <div className="p-8 border-r border-slate-100">
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
                style={{ color: primaryColor }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Transport Delivery
              </h3>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-900">{data.inlandTransport!.dropoff.address || '-'}</p>
                {(data.inlandTransport!.dropoff.city || data.inlandTransport!.dropoff.state || data.inlandTransport!.dropoff.zip) && (
                  <p className="text-sm text-slate-500">
                    {[data.inlandTransport!.dropoff.city, data.inlandTransport!.dropoff.state, data.inlandTransport!.dropoff.zip].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Transport Distance */}
            <div className="p-8">
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
                style={{ color: primaryColor }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Transport Distance
              </h3>
              <div className="space-y-1">
                <p className="text-base font-bold text-slate-900">
                  {data.inlandTransport!.distance_miles ? `${Math.round(data.inlandTransport!.distance_miles).toLocaleString()} miles` : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Route Map Preview */}
          {data.inlandTransport!.static_map_url && (
            <div className="p-8 border-b border-slate-100">
              <h3
                className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"
                style={{ color: primaryColor }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Route Preview
              </h3>
              <div className="rounded-lg overflow-hidden border border-slate-200">
                <img
                  src={data.inlandTransport!.static_map_url}
                  alt="Route map"
                  className="w-full h-auto"
                  style={{ maxHeight: '250px', objectFit: 'cover' }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}

// Helper to format billing unit for rate display (e.g., "/hour")
function formatBillingUnit(unit: string): string {
  switch (unit) {
    case 'hour': return '/hr'
    case 'day': return '/day'
    case 'week': return '/wk'
    case 'month': return '/mo'
    case 'way': return '/way'
    case 'stop': return '/stop'
    case 'flat': return ''
    default: return ''
  }
}

// Helper to format billing unit as label (e.g., "Per Hour")
function formatBillingUnitLabel(unit: string): string {
  switch (unit) {
    case 'hour': return 'Per Hour'
    case 'day': return 'Per Day'
    case 'week': return 'Per Week'
    case 'month': return 'Per Month'
    case 'way': return 'Per Way'
    case 'stop': return 'Per Stop'
    case 'flat': return 'Flat Rate'
    default: return unit
  }
}

// Helper to check if billing unit is variable (time-based)
function isVariableBillingUnit(unit: string): boolean {
  return ['hour', 'day', 'week', 'month'].includes(unit)
}

// Inland transport services and accessorials section
function InlandTransportServicesSection({ data }: { data: UnifiedPDFData }) {
  const primaryColor = data.company.primaryColor || DEFAULT_PRIMARY_COLOR
  const inlandTransport = data.inlandTransport

  if (!inlandTransport?.enabled) {
    return null
  }

  // Use destination blocks if available, otherwise fall back to load_blocks
  const destinationBlocks = inlandTransport.destinationBlocks
  const hasDestinationBlocks = destinationBlocks && destinationBlocks.length > 0
  const hasLoadBlocks = inlandTransport.load_blocks && inlandTransport.load_blocks.length > 0
  const isInlandOnlyQuote = data.quoteType === 'inland'

  // For single destination in inland-only quotes, skip showing destination header
  // since it's already shown in LocationSection
  const hasSingleDestination = hasDestinationBlocks && destinationBlocks!.length === 1
  const skipDestinationHeader = isInlandOnlyQuote && hasSingleDestination

  if (!hasDestinationBlocks && !hasLoadBlocks) {
    return null
  }

  // Render load block content (shared between both modes)
  const renderLoadBlock = (block: InlandLoadBlock, blockIndex: number, showHeader = true) => (
    <div key={block.id} className="pb-4">
      {/* Load Block Header with Truck Type */}
      {showHeader && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-700">
              Load {blockIndex + 1}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium">
              {block.truck_type_name}
            </span>
          </div>
          <span className="text-sm font-bold" style={{ color: primaryColor }}>
            {formatCurrency(block.subtotal)}
          </span>
        </div>
      )}

      {/* Cargo Items Details */}
      {block.cargo_items && block.cargo_items.length > 0 && (
        <div className="mb-4 rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-3" style={{ backgroundColor: 'rgb(241, 245, 249)' }}>
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Cargo Details
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {block.cargo_items.map((cargo) => {
              const displayName = cargo.is_equipment
                ? `${cargo.equipment_make_name || cargo.custom_make_name || ''} ${cargo.equipment_model_name || cargo.custom_model_name || ''}`.trim() || cargo.description
                : cargo.description
              const hasEquipmentImages = cargo.is_equipment && (cargo.front_image_url || cargo.side_image_url)
              return (
                <div key={cargo.id} className="px-6 py-4">
                  {/* Equipment with front/side images */}
                  {hasEquipmentImages ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-slate-900">
                        {displayName}
                        {cargo.quantity > 1 && (
                          <span className="text-slate-500 font-normal ml-2">(Qty: {cargo.quantity})</span>
                        )}
                      </p>
                      {/* Equipment Images Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {cargo.front_image_url && (
                          <div className="space-y-1">
                            <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                              <img
                                src={cargo.front_image_url}
                                alt={`${displayName} - Front`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <p className="text-[9px] uppercase font-bold text-slate-400 text-center tracking-widest">
                              Front View
                            </p>
                          </div>
                        )}
                        {cargo.side_image_url && (
                          <div className="space-y-1">
                            <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                              <img
                                src={cargo.side_image_url}
                                alt={`${displayName} - Side`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <p className="text-[9px] uppercase font-bold text-slate-400 text-center tracking-widest">
                              Side View
                            </p>
                          </div>
                        )}
                      </div>
                      {/* Dimensions Grid */}
                      <div className="grid grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400">Length</span>
                          <p className="font-medium text-slate-700">
                            {formatDimension(cargo.length_inches)}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Width</span>
                          <p className="font-medium text-slate-700">
                            {formatDimension(cargo.width_inches)}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Height</span>
                          <p className="font-medium text-slate-700">
                            {formatDimension(cargo.height_inches)}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Weight</span>
                          <p className="font-medium text-slate-700">
                            {formatWeight(cargo.weight_lbs)}
                          </p>
                        </div>
                      </div>
                      {/* Oversize/Overweight Badges */}
                      {(cargo.is_oversize || cargo.is_overweight) && (
                        <div className="flex gap-2">
                          {cargo.is_oversize && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 uppercase">
                              Oversize
                            </span>
                          )}
                          {cargo.is_overweight && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 uppercase">
                              Overweight
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Standard cargo layout with single image */
                    <div className="flex gap-4">
                      {/* Cargo Image */}
                      {cargo.image_url && (
                        <div className="w-24 h-20 flex-shrink-0 rounded overflow-hidden border border-slate-200">
                          <img
                            src={cargo.image_url}
                            alt={displayName}
                            className="w-full h-full object-contain bg-slate-50"
                          />
                        </div>
                      )}
                      {/* Cargo Info */}
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900 mb-1">
                          {displayName}
                          {cargo.quantity > 1 && (
                            <span className="text-slate-500 font-normal ml-2">(Qty: {cargo.quantity})</span>
                          )}
                        </p>
                        {/* Dimensions Grid */}
                        <div className="grid grid-cols-4 gap-3 text-xs mt-2">
                          <div>
                            <span className="text-slate-400">Length</span>
                            <p className="font-medium text-slate-700">
                              {formatDimension(cargo.length_inches)}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">Width</span>
                            <p className="font-medium text-slate-700">
                              {formatDimension(cargo.width_inches)}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">Height</span>
                            <p className="font-medium text-slate-700">
                              {formatDimension(cargo.height_inches)}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-400">Weight</span>
                            <p className="font-medium text-slate-700">
                              {formatWeight(cargo.weight_lbs)}
                            </p>
                          </div>
                        </div>
                        {/* Oversize/Overweight Badges */}
                        {(cargo.is_oversize || cargo.is_overweight) && (
                          <div className="flex gap-2 mt-2">
                            {cargo.is_oversize && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700 uppercase">
                                Oversize
                              </span>
                            )}
                            {cargo.is_overweight && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 uppercase">
                                Overweight
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Service Items Table */}
      {block.service_items.length > 0 && (
        <table className="w-full text-left border-collapse mb-4">
          <thead>
            <tr style={{ backgroundColor: 'rgb(241, 245, 249)' }}>
              <th className="px-6 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                Service Description
              </th>
              <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 text-center">
                Qty
              </th>
              <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 text-right">
                Unit Rate
              </th>
              <th className="px-6 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 text-right">
                Line Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {block.service_items.map((item, index) => (
              <tr key={item.id} className={index % 2 === 1 ? 'bg-slate-50/50' : ''}>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                <td className="px-4 py-4 text-sm text-center font-medium">{item.quantity}</td>
                <td className="px-4 py-4 text-sm text-right font-medium">{formatCurrency(item.rate)}</td>
                <td className="px-6 py-4 text-sm font-bold text-right text-slate-900">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: 'rgb(241, 245, 249)' }}>
              <td colSpan={3} className="px-6 py-3 text-sm font-bold text-slate-700">
                Services Subtotal
              </td>
              <td className="px-6 py-3 text-right text-base font-bold text-slate-900">
                {formatCurrency(block.subtotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {/* Accessorial Charges (if applicable) */}
      {block.accessorial_charges.length > 0 && (
        <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-3 flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Accessorial Fees (If Applicable)
          </h4>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-amber-600">
                  Fee Type
                </th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-amber-600">
                  Unit
                </th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-amber-600 text-center">
                  Qty
                </th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-amber-600 text-right">
                  Rate
                </th>
                <th className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest text-amber-600 text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-200">
              {block.accessorial_charges.map((charge) => {
                const isVariable = isVariableBillingUnit(charge.billing_unit)
                const rateDisplay = `${formatCurrency(charge.rate)}${formatBillingUnit(charge.billing_unit)}`
                return (
                  <tr key={charge.id}>
                    <td className="px-3 py-2 text-xs font-medium text-amber-900">{charge.name}</td>
                    <td className="px-3 py-2 text-xs text-amber-700">{formatBillingUnitLabel(charge.billing_unit)}</td>
                    <td className="px-3 py-2 text-xs text-center text-amber-700">{charge.quantity}</td>
                    <td className="px-3 py-2 text-xs text-right text-amber-700 font-medium">{rateDisplay}</td>
                    <td className="px-3 py-2 text-xs font-bold text-right text-amber-900">
                      {isVariable ? (
                        <span className="italic text-amber-600">Billed as used</span>
                      ) : (
                        formatCurrency(charge.total)
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-amber-300">
                <td colSpan={4} className="px-3 py-2 text-xs font-bold text-amber-800">
                  Total Accessorial Fees (If Applicable)
                </td>
                <td className="px-3 py-2 text-sm font-bold text-right text-amber-900">
                  {formatCurrency(block.accessorials_total || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )

  return (
    <div className="border-b border-slate-100">
      {/* Inland Transport Header */}
      <div className="p-8 pb-4">
        <h3
          className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ color: primaryColor }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Inland Transportation Services
        </h3>
      </div>

      {/* Render by Destination Blocks if available */}
      {hasDestinationBlocks ? (
        <>
          {destinationBlocks!.map((dest, destIndex) => (
            <div key={dest.id} className="mb-6">
              {/* Destination Header - Skip for single destination in inland-only quotes */}
              {!skipDestinationHeader && (
                <div className="px-8 pb-4">
                  <div className="p-4 rounded-lg border-2 border-slate-200" style={{ borderLeftColor: primaryColor, borderLeftWidth: '4px' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {dest.label}
                      </span>
                      <span className="text-lg font-bold text-slate-900">Destination {dest.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 text-xs uppercase tracking-wide">Pickup</span>
                        <p className="font-medium text-slate-900">{dest.pickup_address || '-'}</p>
                        {(dest.pickup_city || dest.pickup_state) && (
                          <p className="text-slate-500 text-xs">
                            {[dest.pickup_city, dest.pickup_state, dest.pickup_zip].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs uppercase tracking-wide">Dropoff</span>
                        <p className="font-medium text-slate-900">{dest.dropoff_address || '-'}</p>
                        {(dest.dropoff_city || dest.dropoff_state) && (
                          <p className="text-slate-500 text-xs">
                            {[dest.dropoff_city, dest.dropoff_state, dest.dropoff_zip].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    {dest.distance_miles && (
                      <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500">
                        Distance: {Math.round(dest.distance_miles).toLocaleString()} miles
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Load Blocks for this destination */}
              <div className="px-8">
                {dest.load_blocks.map((loadBlock, loadIndex) => {
                  // Map load block to the expected format
                  const formattedBlock = {
                    id: loadBlock.id,
                    truck_type_id: loadBlock.truck_type_id,
                    truck_type_name: loadBlock.truck_type_name,
                    cargo_items: loadBlock.cargo_items?.map(cargo => ({
                      id: cargo.id,
                      description: cargo.description,
                      quantity: cargo.quantity,
                      length_inches: cargo.length_inches,
                      width_inches: cargo.width_inches,
                      height_inches: cargo.height_inches,
                      weight_lbs: cargo.weight_lbs,
                      is_oversize: cargo.is_oversize,
                      is_overweight: cargo.is_overweight,
                      is_equipment: cargo.is_equipment,
                      equipment_make_name: cargo.equipment_make_name,
                      equipment_model_name: cargo.equipment_model_name,
                      custom_make_name: cargo.custom_make_name,
                      custom_model_name: cargo.custom_model_name,
                      image_url: cargo.image_url,
                      front_image_url: cargo.front_image_url,
                      side_image_url: cargo.side_image_url,
                    })) || [],
                    service_items: loadBlock.service_items,
                    accessorial_charges: loadBlock.accessorial_charges,
                    subtotal: loadBlock.subtotal,
                    accessorials_total: loadBlock.accessorials_total || 0,
                  }
                  return renderLoadBlock(formattedBlock, loadIndex, dest.load_blocks.length > 1)
                })}
              </div>

              {/* Destination Subtotal - Skip for single destination */}
              {!skipDestinationHeader && (
                <div className="px-8 pb-4">
                  <div className="flex justify-end">
                    <div className="w-64 p-3 rounded-lg" style={{ backgroundColor: 'rgb(248, 250, 252)' }}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-600">Destination {dest.label} Total</span>
                        <span className="font-bold" style={{ color: primaryColor }}>
                          {formatCurrency(dest.subtotal)}
                        </span>
                      </div>
                      {(dest.accessorials_total ?? 0) > 0 && (
                        <div className="flex justify-between text-xs text-amber-600 mt-1">
                          <span>+ Accessorials (if applicable)</span>
                          <span className="font-medium">
                            {formatCurrency(dest.accessorials_total || 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Separator between destinations */}
              {destIndex < destinationBlocks!.length - 1 && (
                <div className="px-8 pb-4">
                  <div className="border-t-2 border-dashed border-slate-200" />
                </div>
              )}
            </div>
          ))}
        </>
      ) : (
        /* Fallback: Render load blocks directly (legacy mode) */
        <div className="px-8">
          {inlandTransport.load_blocks!.map((block, blockIndex) => renderLoadBlock(block, blockIndex))}
        </div>
      )}

      {/* Grand Total Summary - Only show for multiple destinations to avoid duplicate */}
      {!skipDestinationHeader && (
        <div className="px-8 pb-6">
          <div className="flex justify-end">
            <div className="w-72 space-y-2 p-4 rounded-lg border-2" style={{ borderColor: primaryColor }}>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Grand Total
              </div>
              <div className="flex justify-between text-base">
                <span className="font-medium text-slate-700">Inland Transport Total</span>
                <span className="font-bold text-lg" style={{ color: primaryColor }}>
                  {formatCurrency(inlandTransport.total)}
                </span>
              </div>
              {(inlandTransport.accessorials_total ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-amber-700 pt-2 border-t border-slate-200">
                  <span>+ Accessorials (if applicable)</span>
                  <span className="font-bold">
                    {formatCurrency(inlandTransport.accessorials_total || 0)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Equipment showcase section
function EquipmentSection({ equipment, primaryColor, showQuantity = false }: {
  equipment: UnifiedPDFData['equipment'][0]
  primaryColor: string
  showQuantity?: boolean
}) {
  const hasImages = equipment.frontImageUrl || equipment.sideImageUrl

  return (
    <div className="grid grid-cols-12 gap-0 border-b border-slate-100">
      {/* Equipment Images */}
      <div className="col-span-8 p-8 border-r border-slate-100">
        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: primaryColor }}>
          Equipment Showcase
          {showQuantity && equipment.quantity > 1 && (
            <span className="ml-2 text-slate-500 normal-case">(Qty: {equipment.quantity})</span>
          )}
        </h3>
        <div className="mb-2">
          <p className="text-lg font-bold text-slate-900">
            {equipment.makeName} {equipment.modelName}
          </p>
          <p className="text-sm text-slate-500">Location: {equipment.location}</p>
        </div>
        {hasImages ? (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {equipment.frontImageUrl && (
              <div className="space-y-2">
                <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                  <img
                    src={equipment.frontImageUrl}
                    alt="Front View"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[10px] uppercase font-bold text-slate-400 text-center tracking-widest">
                  Front Perspective
                </p>
              </div>
            )}
            {equipment.sideImageUrl && (
              <div className="space-y-2">
                <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                  <img
                    src={equipment.sideImageUrl}
                    alt="Side View"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[10px] uppercase font-bold text-slate-400 text-center tracking-widest">
                  Profile View
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center mt-4">
            <p className="text-slate-400 text-sm">No images available</p>
          </div>
        )}
      </div>

      {/* Technical Specifications */}
      <div className="col-span-4 p-8" style={{ backgroundColor: 'rgba(248, 250, 252, 0.3)' }}>
        <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: primaryColor }}>
          Technical Specifications
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-xs text-slate-500 font-medium">Length</span>
            <span className="text-xs font-bold text-slate-900">
              {formatDimension(equipment.dimensions.length_inches)}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-xs text-slate-500 font-medium">Width</span>
            <span className="text-xs font-bold text-slate-900">
              {formatDimension(equipment.dimensions.width_inches)}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-xs text-slate-500 font-medium">Height</span>
            <span className="text-xs font-bold text-slate-900">
              {formatDimension(equipment.dimensions.height_inches)}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-xs text-slate-500 font-medium">Weight</span>
            <span className="text-xs font-bold text-slate-900">
              {formatWeight(equipment.dimensions.weight_lbs)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Services table
function ServicesTable({ lineItems, primaryColor, showSubtotal, subtotalLabel, subtotalAmount }: {
  lineItems: ServiceLineItem[]
  primaryColor: string
  showSubtotal?: boolean
  subtotalLabel?: string
  subtotalAmount?: number
}) {
  return (
    <div className="flex-grow">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr style={{ backgroundColor: 'rgb(241, 245, 249)' }}>
            <th className="px-8 py-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Service Description
            </th>
            <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Category
            </th>
            <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 text-center">
              Qty
            </th>
            <th className="px-6 py-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 text-right">
              Unit Rate
            </th>
            <th className="px-8 py-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 text-right">
              Line Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lineItems.map((item, index) => (
            <tr key={item.id} className={index % 2 === 1 ? 'bg-slate-50/50' : ''}>
              <td className="px-8 py-5">
                <p className="font-bold text-slate-900">{item.description}</p>
              </td>
              <td className="px-6 py-5">
                <CategoryBadge category={item.category} />
              </td>
              <td className="px-6 py-5 text-center text-sm font-medium">{item.quantity}</td>
              <td className="px-6 py-5 text-right text-sm font-medium">
                {formatCurrency(item.unitRate)}
              </td>
              <td className="px-8 py-5 text-right font-bold text-slate-900">
                {formatCurrency(item.lineTotal)}
              </td>
            </tr>
          ))}
        </tbody>
        {showSubtotal && subtotalAmount !== undefined && (
          <tfoot>
            <tr style={{ backgroundColor: 'rgb(241, 245, 249)' }}>
              <td colSpan={4} className="px-8 py-4 text-sm font-bold text-slate-700">
                {subtotalLabel || 'Subtotal'}
              </td>
              <td className="px-8 py-4 text-right text-base font-bold" style={{ color: primaryColor }}>
                {formatCurrency(subtotalAmount)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

// Generate line items for a specific equipment
function getEquipmentLineItems(equipment: UnifiedPDFData['equipment'][0]): ServiceLineItem[] {
  const items: ServiceLineItem[] = []

  // Add enabled cost items
  Object.entries(equipment.enabledCosts).forEach(([field, enabled]) => {
    if (!enabled) return

    const costField = field as keyof typeof equipment.costs
    const cost = equipment.costOverrides[costField] ?? equipment.costs[costField]

    // Skip $0 costs
    if (cost <= 0) return

    const customDescription = equipment.costDescriptions?.[costField]

    items.push({
      id: `${equipment.id}-${costField}`,
      description: customDescription || COST_LABELS[costField as keyof typeof COST_LABELS] || costField,
      category: COST_FIELD_CATEGORIES[costField as keyof typeof COST_FIELD_CATEGORIES] || 'logistics',
      quantity: equipment.quantity,
      unitRate: cost,
      lineTotal: cost * equipment.quantity,
      equipmentId: equipment.id,
    })
  })

  // Add misc fees
  equipment.miscFees.forEach((fee) => {
    const feeAmount = fee.is_percentage
      ? Math.round(equipment.subtotal * (fee.amount / 10000))
      : fee.amount

    // Skip $0 fees
    if (feeAmount <= 0) return

    items.push({
      id: `${equipment.id}-misc-${fee.id}`,
      description: fee.title,
      subDescription: fee.description || undefined,
      category: 'logistics',
      quantity: 1,
      unitRate: feeAmount,
      lineTotal: feeAmount,
      equipmentId: equipment.id,
    })
  })

  return items
}

// Combined equipment section with services and subtotal (for multi-equipment)
function EquipmentWithServicesSection({
  equipment,
  primaryColor,
  equipmentNumber
}: {
  equipment: UnifiedPDFData['equipment'][0]
  primaryColor: string
  equipmentNumber: number
}) {
  const lineItems = getEquipmentLineItems(equipment)
  const hasImages = equipment.frontImageUrl || equipment.sideImageUrl
  const equipmentTotal = equipment.totalWithQuantity

  return (
    <div className="border-b border-slate-100">
      {/* Equipment Header */}
      <div className="px-8 pt-6 pb-4">
        <div
          className="flex items-center justify-between px-4 py-3 rounded-lg"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-lg">
              Equipment {equipmentNumber}: {equipment.makeName} {equipment.modelName}
            </span>
            {equipment.quantity > 1 && (
              <span className="text-white/80 text-sm">(Qty: {equipment.quantity})</span>
            )}
          </div>
          <span className="text-white/80 text-sm">
            Location: {equipment.location}
          </span>
        </div>
      </div>

      {/* Equipment Images and Specs - Compact View */}
      <div className="grid grid-cols-12 gap-0 mx-8 mb-4 rounded-lg overflow-hidden border border-slate-200">
        {/* Equipment Images */}
        <div className="col-span-8 p-4 border-r border-slate-200">
          {hasImages ? (
            <div className="grid grid-cols-2 gap-4">
              {equipment.frontImageUrl && (
                <div className="space-y-1">
                  <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={equipment.frontImageUrl}
                      alt="Front View"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 text-center tracking-widest">
                    Front
                  </p>
                </div>
              )}
              {equipment.sideImageUrl && (
                <div className="space-y-1">
                  <div className="aspect-video bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={equipment.sideImageUrl}
                      alt="Side View"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-[9px] uppercase font-bold text-slate-400 text-center tracking-widest">
                    Side
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center">
              <p className="text-slate-400 text-sm">No images available</p>
            </div>
          )}
        </div>

        {/* Technical Specifications - Compact */}
        <div className="col-span-4 p-4" style={{ backgroundColor: 'rgba(248, 250, 252, 0.5)' }}>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
            Specifications
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Length</span>
              <span className="font-bold text-slate-900">{formatDimension(equipment.dimensions.length_inches)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Width</span>
              <span className="font-bold text-slate-900">{formatDimension(equipment.dimensions.width_inches)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Height</span>
              <span className="font-bold text-slate-900">{formatDimension(equipment.dimensions.height_inches)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Weight</span>
              <span className="font-bold text-slate-900">{formatWeight(equipment.dimensions.weight_lbs)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Services Table */}
      <ServicesTable
        lineItems={lineItems}
        primaryColor={primaryColor}
        showSubtotal={true}
        subtotalLabel={`${equipment.makeName} ${equipment.modelName} Total`}
        subtotalAmount={equipmentTotal}
      />
    </div>
  )
}

// Pricing summary and terms
function PricingSummarySection({ data, lineItems }: {
  data: UnifiedPDFData
  lineItems: ServiceLineItem[]
}) {
  const primaryColor = data.company.primaryColor || DEFAULT_PRIMARY_COLOR

  // Calculate subtotals
  const servicesSubtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0)

  return (
    <div className="p-8 border-t border-slate-100" style={{ backgroundColor: 'rgb(248, 250, 252)' }}>
      <div className="flex flex-col md:flex-row justify-between gap-10">
        {/* Terms */}
        <div className="max-w-md">
          {data.termsAndConditions && (
            <>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-3">
                Service Terms
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {data.termsAndConditions}
              </p>
            </>
          )}
          {data.customerNotes && (
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-2">
                Notes
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {data.customerNotes}
              </p>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="w-full md:w-80 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 font-medium">Subtotal (Services)</span>
            <span className="text-slate-900 font-bold">{formatCurrency(servicesSubtotal)}</span>
          </div>

          {data.miscFeesTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Additional Fees</span>
              <span className="text-slate-900 font-bold">{formatCurrency(data.miscFeesTotal)}</span>
            </div>
          )}

          {data.inlandTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Inland Transport</span>
              <span className="text-slate-900 font-bold">{formatCurrency(data.inlandTotal)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-200">
            <span className="text-lg font-extrabold text-slate-900">Grand Total (USD)</span>
            <span className="text-2xl font-black" style={{ color: primaryColor }}>
              {formatCurrency(data.grandTotal)}
            </span>
          </div>

          {/* Accessorial Fees Note */}
          {(data.inlandTransport?.accessorials_total ?? 0) > 0 && (
            <div className="mt-3 p-3 rounded bg-amber-50 border border-amber-200">
              <div className="flex justify-between items-center text-xs">
                <span className="text-amber-700 font-medium">
                  * Accessorial fees (if applicable)
                </span>
                <span className="text-amber-900 font-bold">
                  {formatCurrency(data.inlandTransport?.accessorials_total || 0)}
                </span>
              </div>
              <p className="text-[10px] text-amber-600 mt-1">
                These fees are charged only when the listed services are required.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Footer
function FooterSection({ data }: { data: UnifiedPDFData }) {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-8 text-center text-slate-400 text-[10px]">
      <p>© {year} {data.company.name}. All rights reserved. This document is a confidential price quotation.</p>
      <p className="mt-1">Quote ID: {data.quoteNumber}</p>
    </footer>
  )
}

// Main PDF Template Component
export function QuotePDFTemplate({ data, className }: QuotePDFTemplateProps) {
  const primaryColor = data.company.primaryColor || DEFAULT_PRIMARY_COLOR

  // Generate service line items (for single equipment or combined view)
  const lineItems = generateServiceLineItems(data.equipment, data.isMultiEquipment)

  // Determine if this is a multi-equipment quote (2+ equipment)
  const isMultiEquipmentQuote = data.isMultiEquipment && data.equipment.length > 1

  return (
    <div
      id="quote-pdf-content"
      className={cn(
        'bg-white font-sans text-slate-700 min-h-screen',
        className
      )}
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      {/* Main Card */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-slate-200 flex flex-col">
          {/* Header */}
          <HeaderSection data={data} />

          {/* Client Information */}
          <ClientSection data={data} />

          {/* Location(s) */}
          <LocationSection data={data} />

          {/* Equipment and Services - only show if there's equipment */}
          {data.equipment.length > 0 && (
            isMultiEquipmentQuote ? (
              /* Multi-Equipment Layout: Each equipment has its own section with services and subtotal */
              <>
                {data.equipment.map((eq, index) => (
                  <EquipmentWithServicesSection
                    key={eq.id}
                    equipment={eq}
                    primaryColor={primaryColor}
                    equipmentNumber={index + 1}
                  />
                ))}
              </>
            ) : (
              /* Single Equipment Layout: Traditional equipment showcase + combined services table */
              <>
                {data.equipment.map((eq) => (
                  <EquipmentSection
                    key={eq.id}
                    equipment={eq}
                    primaryColor={primaryColor}
                    showQuantity={false}
                  />
                ))}
                {/* Services Table */}
                <ServicesTable lineItems={lineItems} primaryColor={primaryColor} />
              </>
            )
          )}

          {/* Inland Transport Services (if enabled) */}
          <InlandTransportServicesSection data={data} />

          {/* Pricing Summary / Grand Total */}
          <PricingSummarySection data={data} lineItems={lineItems} />
        </div>

        {/* Footer */}
        <FooterSection data={data} />
      </div>
    </div>
  )
}

export default QuotePDFTemplate
