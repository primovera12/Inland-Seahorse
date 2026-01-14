'use client'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import { formatDimension, formatWeight, formatAddressMultiline, getLocationInfo, DEFAULT_PRIMARY_COLOR } from '../pdf-utils'
import type { UnifiedPDFData, ServiceLineItem, CostCategory } from '../types'
import { generateServiceLineItems, CATEGORY_STYLES } from '../types'

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
                    className="w-full h-full object-cover"
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
                    className="w-full h-full object-cover"
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
function ServicesTable({ lineItems, primaryColor }: {
  lineItems: ServiceLineItem[]
  primaryColor: string
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
                {item.subDescription && (
                  <p className="text-xs text-slate-500">{item.subDescription}</p>
                )}
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
      </table>
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

  // Generate service line items
  const lineItems = generateServiceLineItems(data.equipment, data.isMultiEquipment)

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

          {/* Equipment Section(s) */}
          {data.equipment.map((eq, index) => (
            <EquipmentSection
              key={eq.id}
              equipment={eq}
              primaryColor={primaryColor}
              showQuantity={data.isMultiEquipment}
            />
          ))}

          {/* Services Table */}
          <ServicesTable lineItems={lineItems} primaryColor={primaryColor} />

          {/* Pricing Summary */}
          <PricingSummarySection data={data} lineItems={lineItems} />
        </div>

        {/* Footer */}
        <FooterSection data={data} />
      </div>
    </div>
  )
}

export default QuotePDFTemplate
