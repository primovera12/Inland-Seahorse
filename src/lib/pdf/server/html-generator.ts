import type { UnifiedPDFData, CostCategory, ServiceLineItem } from '../types'
import { CATEGORY_STYLES, COST_LABELS, COST_FIELD_CATEGORIES, generateServiceLineItems } from '../types'
import { formatCurrency } from '@/lib/utils'
import { formatDimension, formatWeight, formatAddressMultiline, getLocationInfo, DEFAULT_PRIMARY_COLOR } from '../pdf-utils'

// Generate complete HTML document for PDF rendering
export function generateQuotePDFHtml(data: UnifiedPDFData): string {
  const primaryColor = data.company.primaryColor || DEFAULT_PRIMARY_COLOR
  const lineItems = generateServiceLineItems(data.equipment, data.isMultiEquipment)

  // Determine if this is a multi-equipment quote (2+ equipment)
  const isMultiEquipmentQuote = data.isMultiEquipment && data.equipment.length > 1

  // Generate equipment content based on single vs multi-equipment
  const equipmentContent = isMultiEquipmentQuote
    ? data.equipment.map((eq, index) => renderEquipmentWithServices(eq, primaryColor, index + 1)).join('')
    : `
      ${data.equipment.map((eq) => renderEquipmentSection(eq, primaryColor, false)).join('')}
      ${renderServicesTable(lineItems, primaryColor)}
    `

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Quote ${data.quoteNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${getStyles(primaryColor)}
  </style>
</head>
<body>
  <div class="pdf-container">
    <div class="card">
      ${renderHeader(data, primaryColor)}
      ${renderClientSection(data, primaryColor)}
      ${renderLocationSection(data, primaryColor)}
      ${equipmentContent}
      ${renderInlandTransportServices(data, primaryColor)}
      ${renderPricingSummary(data, lineItems, primaryColor)}
    </div>
    ${renderFooter(data)}
  </div>
</body>
</html>
`
}

function getStyles(primaryColor: string): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Manrope', system-ui, -apple-system, sans-serif;
      color: #334155;
      background: #ffffff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .pdf-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 24px;
    }

    .card {
      background: #ffffff;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    /* Header */
    .header {
      padding: 32px;
      border-bottom: 1px solid #f1f5f9;
      background: rgba(248, 250, 252, 0.5);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .company-info {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .company-logo {
      max-height: 60px;
      width: auto;
      object-fit: contain;
    }

    .company-name {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.05em;
      text-transform: uppercase;
      color: ${primaryColor};
    }

    .company-details {
      font-size: 14px;
      color: #64748b;
      line-height: 1.5;
    }

    .company-details p {
      margin-bottom: 4px;
    }

    .company-details .name {
      font-weight: 700;
      color: #1e293b;
    }

    .quote-info {
      text-align: right;
    }

    .quote-title {
      font-size: 30px;
      font-weight: 800;
      margin-bottom: 8px;
      color: ${primaryColor};
    }

    .quote-details {
      display: grid;
      grid-template-columns: auto auto;
      gap: 4px 16px;
      font-size: 14px;
    }

    .quote-details .label {
      color: #64748b;
      font-weight: 500;
    }

    .quote-details .value {
      color: #0f172a;
      font-weight: 700;
    }

    /* Sections */
    .section {
      padding: 32px;
      border-bottom: 1px solid #f1f5f9;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: ${primaryColor};
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title svg {
      width: 16px;
      height: 16px;
    }

    /* Client Info */
    .client-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px 32px;
    }

    .client-grid .info-block.span-2 {
      grid-column: span 2;
    }

    .info-block .label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin-bottom: 4px;
    }

    .info-block .value {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.4;
      word-break: break-word;
    }

    /* Location */
    .location-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .location-block {
      padding: 32px;
    }

    .location-block:first-child {
      border-right: 1px solid #f1f5f9;
    }

    .location-name {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .location-address {
      font-size: 14px;
      color: #64748b;
      margin-top: 4px;
    }

    /* Equipment */
    .equipment-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      border-bottom: 1px solid #f1f5f9;
    }

    .equipment-showcase {
      padding: 32px;
      border-right: 1px solid #f1f5f9;
    }

    .equipment-name {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }

    .equipment-location {
      font-size: 14px;
      color: #64748b;
      margin-top: 4px;
    }

    .equipment-images {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 16px;
    }

    .image-container {
      aspect-ratio: 16/9;
      background: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .image-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      text-align: center;
      margin-top: 8px;
    }

    .no-images {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 14px;
    }

    .specs-panel {
      padding: 32px;
      background: rgba(248, 250, 252, 0.3);
    }

    .spec-row {
      display: flex;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 12px;
    }

    .spec-row:last-child {
      margin-bottom: 0;
    }

    .spec-label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }

    .spec-value {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }

    /* Services Table */
    .services-table {
      width: 100%;
      border-collapse: collapse;
    }

    .services-table th {
      padding: 16px 32px;
      background: #f1f5f9;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      text-align: left;
    }

    .services-table th:nth-child(3),
    .services-table th:nth-child(4),
    .services-table th:nth-child(5) {
      text-align: right;
    }

    .services-table td {
      padding: 20px 32px;
      border-bottom: 1px solid #f1f5f9;
    }

    .services-table tr:nth-child(even) {
      background: rgba(248, 250, 252, 0.5);
    }

    .service-name {
      font-weight: 700;
      color: #0f172a;
    }

    .service-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }

    .category-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge-dismantle { background: #ffedd5; color: #c2410c; }
    .badge-loading { background: #dbeafe; color: #1d4ed8; }
    .badge-transport { background: #dcfce7; color: #15803d; }
    .badge-misc { background: #f3e8ff; color: #7c3aed; }

    .text-center { text-align: center; }
    .text-right { text-align: right; }

    .font-medium { font-weight: 500; }
    .font-bold { font-weight: 700; }

    /* Pricing Summary */
    .pricing-section {
      padding: 32px;
      background: #f8fafc;
      display: flex;
      justify-content: space-between;
      gap: 40px;
    }

    .terms-block {
      max-width: 400px;
    }

    .terms-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #0f172a;
      margin-bottom: 12px;
    }

    .terms-text {
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }

    .totals-block {
      width: 320px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      margin-bottom: 12px;
    }

    .total-row .label {
      color: #64748b;
      font-weight: 500;
    }

    .total-row .value {
      color: #0f172a;
      font-weight: 700;
    }

    .grand-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }

    .grand-total .label {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }

    .grand-total .value {
      font-size: 24px;
      font-weight: 900;
      color: ${primaryColor};
    }

    /* Footer */
    .footer {
      margin-top: 32px;
      text-align: center;
      color: #94a3b8;
      font-size: 10px;
    }

    .footer p {
      margin-bottom: 4px;
    }

    @media print {
      body { background: white; }
      .pdf-container { padding: 0; }
      .card { box-shadow: none; }
    }
  `
}

function renderHeader(data: UnifiedPDFData, primaryColor: string): string {
  const logoHtml = data.company.logoUrl
    ? `<img src="${data.company.logoUrl}" alt="${data.company.name}" class="company-logo" style="max-height: ${Math.max(60, (data.company.logoSizePercentage || 100) * 0.8)}px; max-width: ${(data.company.logoSizePercentage || 100) * 2.5}px;">`
    : `<div class="company-name">${data.company.name}</div>`

  return `
    <div class="header">
      <div class="company-info">
        ${logoHtml}
        <div class="company-details">
          ${data.company.name ? `<p class="name">${data.company.name}</p>` : ''}
          ${data.company.address ? `<p>${data.company.address}</p>` : ''}
          ${data.company.email ? `<p>${data.company.email}</p>` : ''}
          ${data.company.phone ? `<p>${data.company.phone}</p>` : ''}
        </div>
      </div>
      <div class="quote-info">
        <h1 class="quote-title">QUOTATION</h1>
        <div class="quote-details">
          <span class="label">Quote ID</span>
          <span class="value">#${data.quoteNumber}</span>
          <span class="label">Issue Date</span>
          <span class="value">${data.issueDate}</span>
          ${data.validUntil ? `
            <span class="label">Valid Until</span>
            <span class="value">${data.validUntil}</span>
          ` : ''}
        </div>
      </div>
    </div>
  `
}

function renderClientSection(data: UnifiedPDFData, primaryColor: string): string {
  const addressLines = formatAddressMultiline({
    address: data.customer.address,
    city: data.customer.city,
    state: data.customer.state,
    zip: data.customer.zip,
  })

  return `
    <div class="section">
      <h3 class="section-title">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Client Information
      </h3>
      <div class="client-grid">
        <!-- Row 1 -->
        <div class="info-block">
          <p class="label">Company Name</p>
          <p class="value">${data.customer.company || '-'}</p>
        </div>
        <div class="info-block">
          <p class="label">Contact Person</p>
          <p class="value">${data.customer.name}</p>
        </div>
        <div class="info-block">
          <p class="label">Phone Number</p>
          <p class="value">${data.customer.phone || '-'}</p>
        </div>
        <!-- Row 2 -->
        <div class="info-block">
          <p class="label">Email Address</p>
          <p class="value">${data.customer.email || '-'}</p>
        </div>
        <div class="info-block span-2">
          <p class="label">Address</p>
          <p class="value">${addressLines.join(', ') || '-'}</p>
        </div>
      </div>
    </div>
  `
}

function renderLocationSection(data: UnifiedPDFData, primaryColor: string): string {
  const hasInlandTransport = data.inlandTransport?.enabled && data.inlandTransport.pickup && data.inlandTransport.dropoff
  const isInlandOnlyQuote = data.quoteType === 'inland'

  if (isInlandOnlyQuote && hasInlandTransport) {
    const pickup = data.inlandTransport!.pickup
    const dropoff = data.inlandTransport!.dropoff
    const distanceMiles = data.inlandTransport!.distance_miles

    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid #f1f5f9;">
        <div class="location-block" style="border-right: 1px solid #f1f5f9;">
          <h3 class="section-title">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Pick-up Location
          </h3>
          <p class="location-name">${pickup.address || '-'}</p>
          ${(pickup.city || pickup.state || pickup.zip) ? `
            <p class="location-address">${[pickup.city, pickup.state, pickup.zip].filter(Boolean).join(', ')}</p>
          ` : ''}
        </div>
        <div class="location-block" style="border-right: 1px solid #f1f5f9;">
          <h3 class="section-title">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Delivery Location
          </h3>
          <p class="location-name">${dropoff.address || '-'}</p>
          ${(dropoff.city || dropoff.state || dropoff.zip) ? `
            <p class="location-address">${[dropoff.city, dropoff.state, dropoff.zip].filter(Boolean).join(', ')}</p>
          ` : ''}
        </div>
        <div class="location-block">
          <h3 class="section-title">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Transport Distance
          </h3>
          <p class="location-name">${distanceMiles ? `${Math.round(distanceMiles).toLocaleString()} miles` : '-'}</p>
        </div>
      </div>
      ${data.inlandTransport!.static_map_url ? `
        <div style="padding: 32px; border-bottom: 1px solid #f1f5f9;">
          <h3 class="section-title" style="color: ${primaryColor}; margin-bottom: 16px;">
            <svg style="width: 16px; height: 16px; margin-right: 8px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Route Preview
          </h3>
          <div style="border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            <img src="${data.inlandTransport!.static_map_url}" alt="Route map" style="width: 100%; height: auto; max-height: 250px; object-fit: cover; display: block;" />
          </div>
        </div>
      ` : ''}
    `
  }

  const locationInfo = data.location ? getLocationInfo(data.location) : null
  let html = ''

  if (locationInfo) {
    html += `
      <div class="section">
        <h3 class="section-title">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Equipment Location
        </h3>
        <p class="location-name">${locationInfo.name}</p>
        ${locationInfo.address ? `<p class="location-address">${locationInfo.address}</p>` : ''}
      </div>
    `
  }

  if (hasInlandTransport && !isInlandOnlyQuote) {
    const distanceMiles = data.inlandTransport!.distance_miles
    html += `
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid #f1f5f9;">
        <div class="location-block" style="border-right: 1px solid #f1f5f9;">
          <h3 class="section-title">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Transport Pick-up
          </h3>
          <p class="location-name">${data.inlandTransport!.pickup.address || '-'}</p>
          ${(data.inlandTransport!.pickup.city || data.inlandTransport!.pickup.state || data.inlandTransport!.pickup.zip) ? `
            <p class="location-address">${[data.inlandTransport!.pickup.city, data.inlandTransport!.pickup.state, data.inlandTransport!.pickup.zip].filter(Boolean).join(', ')}</p>
          ` : ''}
        </div>
        <div class="location-block" style="border-right: 1px solid #f1f5f9;">
          <h3 class="section-title">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Transport Delivery
          </h3>
          <p class="location-name">${data.inlandTransport!.dropoff.address || '-'}</p>
          ${(data.inlandTransport!.dropoff.city || data.inlandTransport!.dropoff.state || data.inlandTransport!.dropoff.zip) ? `
            <p class="location-address">${[data.inlandTransport!.dropoff.city, data.inlandTransport!.dropoff.state, data.inlandTransport!.dropoff.zip].filter(Boolean).join(', ')}</p>
          ` : ''}
        </div>
        <div class="location-block">
          <h3 class="section-title">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Transport Distance
          </h3>
          <p class="location-name">${distanceMiles ? `${Math.round(distanceMiles).toLocaleString()} miles` : '-'}</p>
        </div>
      </div>
      ${data.inlandTransport!.static_map_url ? `
        <div style="padding: 32px; border-bottom: 1px solid #f1f5f9;">
          <h3 class="section-title" style="color: ${primaryColor}; margin-bottom: 16px;">
            <svg style="width: 16px; height: 16px; margin-right: 8px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Route Preview
          </h3>
          <div style="border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
            <img src="${data.inlandTransport!.static_map_url}" alt="Route map" style="width: 100%; height: auto; max-height: 250px; object-fit: cover; display: block;" />
          </div>
        </div>
      ` : ''}
    `
  }

  return html
}

function renderEquipmentSection(
  equipment: UnifiedPDFData['equipment'][0],
  primaryColor: string,
  showQuantity: boolean
): string {
  const hasImages = equipment.frontImageUrl || equipment.sideImageUrl

  return `
    <div class="equipment-section">
      <div class="equipment-showcase">
        <h3 class="section-title" style="color: ${primaryColor};">
          Equipment Showcase
          ${showQuantity && equipment.quantity > 1 ? `<span style="color: #64748b; font-weight: 400; text-transform: none;">(Qty: ${equipment.quantity})</span>` : ''}
        </h3>
        <p class="equipment-name">${equipment.makeName} ${equipment.modelName}</p>
        <p class="equipment-location">Location: ${equipment.location}</p>
        ${hasImages ? `
          <div class="equipment-images">
            ${equipment.frontImageUrl ? `
              <div>
                <div class="image-container">
                  <img src="${equipment.frontImageUrl}" alt="Front View">
                </div>
                <p class="image-label">Front Perspective</p>
              </div>
            ` : ''}
            ${equipment.sideImageUrl ? `
              <div>
                <div class="image-container">
                  <img src="${equipment.sideImageUrl}" alt="Side View">
                </div>
                <p class="image-label">Profile View</p>
              </div>
            ` : ''}
          </div>
        ` : `
          <div class="image-container no-images" style="margin-top: 16px; height: 150px;">
            No images available
          </div>
        `}
      </div>
      <div class="specs-panel">
        <h3 class="section-title" style="color: ${primaryColor};">Technical Specifications</h3>
        <div class="spec-row">
          <span class="spec-label">Length</span>
          <span class="spec-value">${formatDimension(equipment.dimensions.length_inches)}</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Width</span>
          <span class="spec-value">${formatDimension(equipment.dimensions.width_inches)}</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Height</span>
          <span class="spec-value">${formatDimension(equipment.dimensions.height_inches)}</span>
        </div>
        <div class="spec-row">
          <span class="spec-label">Weight</span>
          <span class="spec-value">${formatWeight(equipment.dimensions.weight_lbs)}</span>
        </div>
      </div>
    </div>
  `
}

function getCategoryBadgeClass(category: CostCategory): string {
  switch (category) {
    case 'dismantling': return 'badge-dismantle'
    case 'logistics': return 'badge-loading'
    case 'transport': return 'badge-transport'
    case 'compliance': return 'badge-misc'
    case 'handling': return 'badge-misc'
    default: return 'badge-misc'
  }
}

function renderServicesTable(
  lineItems: ServiceLineItem[],
  primaryColor: string,
  showSubtotal?: boolean,
  subtotalLabel?: string,
  subtotalAmount?: number
): string {
  const rows = lineItems.map((item) => `
    <tr>
      <td>
        <p class="service-name">${item.description}</p>
      </td>
      <td>
        <span class="category-badge ${getCategoryBadgeClass(item.category)}">
          ${CATEGORY_STYLES[item.category].label}
        </span>
      </td>
      <td class="text-center font-medium">${item.quantity}</td>
      <td class="text-right font-medium">${formatCurrency(item.unitRate)}</td>
      <td class="text-right font-bold">${formatCurrency(item.lineTotal)}</td>
    </tr>
  `).join('')

  const subtotalRow = showSubtotal && subtotalAmount !== undefined ? `
    <tfoot>
      <tr style="background: #f1f5f9;">
        <td colspan="4" style="padding: 16px 32px; font-size: 14px; font-weight: 700; color: #334155;">
          ${subtotalLabel || 'Subtotal'}
        </td>
        <td style="padding: 16px 32px; text-align: right; font-size: 16px; font-weight: 700; color: ${primaryColor};">
          ${formatCurrency(subtotalAmount)}
        </td>
      </tr>
    </tfoot>
  ` : ''

  return `
    <table class="services-table">
      <thead>
        <tr>
          <th>Service Description</th>
          <th>Category</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Rate</th>
          <th style="text-align: right;">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      ${subtotalRow}
    </table>
  `
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
      description: customDescription || COST_LABELS[costField as keyof typeof COST_LABELS] || field,
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

// Render equipment with its services and subtotal (for multi-equipment)
function renderEquipmentWithServices(
  equipment: UnifiedPDFData['equipment'][0],
  primaryColor: string,
  equipmentNumber: number
): string {
  const lineItems = getEquipmentLineItems(equipment)
  const hasImages = equipment.frontImageUrl || equipment.sideImageUrl
  const equipmentTotal = equipment.totalWithQuantity

  return `
    <div style="border-bottom: 1px solid #f1f5f9;">
      <!-- Equipment Header -->
      <div style="padding: 24px 32px 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 8px; background: ${primaryColor};">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="color: white; font-weight: 700; font-size: 18px;">
              Equipment ${equipmentNumber}: ${equipment.makeName} ${equipment.modelName}
            </span>
            ${equipment.quantity > 1 ? `<span style="color: rgba(255,255,255,0.8); font-size: 14px;">(Qty: ${equipment.quantity})</span>` : ''}
          </div>
          <span style="color: rgba(255,255,255,0.8); font-size: 14px;">
            Location: ${equipment.location}
          </span>
        </div>
      </div>

      <!-- Equipment Images and Specs - Compact View -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; margin: 0 32px 16px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
        <!-- Equipment Images -->
        <div style="padding: 16px; border-right: 1px solid #e2e8f0;">
          ${hasImages ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              ${equipment.frontImageUrl ? `
                <div>
                  <div style="aspect-ratio: 16/9; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <img src="${equipment.frontImageUrl}" alt="Front View" style="width: 100%; height: 100%; object-fit: contain;">
                  </div>
                  <p style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; text-align: center; margin-top: 4px;">Front</p>
                </div>
              ` : ''}
              ${equipment.sideImageUrl ? `
                <div>
                  <div style="aspect-ratio: 16/9; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <img src="${equipment.sideImageUrl}" alt="Side View" style="width: 100%; height: 100%; object-fit: contain;">
                  </div>
                  <p style="font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; text-align: center; margin-top: 4px;">Side</p>
                </div>
              ` : ''}
            </div>
          ` : `
            <div style="aspect-ratio: 16/9; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center;">
              <p style="color: #94a3b8; font-size: 14px;">No images available</p>
            </div>
          `}
        </div>

        <!-- Technical Specifications - Compact -->
        <div style="padding: 16px; background: rgba(248, 250, 252, 0.5);">
          <h4 style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 12px;">
            Specifications
          </h4>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #64748b;">Length</span>
              <span style="font-weight: 700; color: #0f172a;">${formatDimension(equipment.dimensions.length_inches)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #64748b;">Width</span>
              <span style="font-weight: 700; color: #0f172a;">${formatDimension(equipment.dimensions.width_inches)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #64748b;">Height</span>
              <span style="font-weight: 700; color: #0f172a;">${formatDimension(equipment.dimensions.height_inches)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
              <span style="color: #64748b;">Weight</span>
              <span style="font-weight: 700; color: #0f172a;">${formatWeight(equipment.dimensions.weight_lbs)}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Equipment Services Table -->
      ${renderServicesTable(
        lineItems,
        primaryColor,
        true,
        `${equipment.makeName} ${equipment.modelName} Total`,
        equipmentTotal
      )}
    </div>
  `
}

// Helper to format billing unit for display
function formatBillingUnit(unit: string): string {
  switch (unit) {
    case 'hour': return '/hour'
    case 'day': return '/day'
    case 'week': return '/week'
    case 'month': return '/month'
    case 'way': return '/way'
    case 'stop': return '/stop'
    case 'flat': return 'flat'
    default: return ''
  }
}

// Helper to check if billing unit is variable (time-based)
function isVariableBillingUnit(unit: string): boolean {
  return ['hour', 'day', 'week', 'month'].includes(unit)
}

function renderInlandTransportServices(data: UnifiedPDFData, primaryColor: string): string {
  const inlandTransport = data.inlandTransport

  if (!inlandTransport?.enabled || !inlandTransport.load_blocks || inlandTransport.load_blocks.length === 0) {
    return ''
  }

  let loadBlocksHtml = ''
  inlandTransport.load_blocks.forEach((block, blockIndex) => {
    // Cargo items section - matches preview layout with cargo name as title, then dimensions below
    let cargoItemsHtml = ''
    if (block.cargo_items && block.cargo_items.length > 0) {
      const cargoItems = block.cargo_items.map(cargo => {
        // Determine cargo type name
        let cargoTypeName = cargo.description || 'Cargo'
        if (cargo.is_equipment) {
          if (cargo.is_custom_equipment) {
            cargoTypeName = [cargo.custom_make_name, cargo.custom_model_name].filter(Boolean).join(' ') || 'Equipment'
          } else {
            cargoTypeName = [cargo.equipment_make_name, cargo.equipment_model_name].filter(Boolean).join(' ') || 'Equipment'
          }
        }

        // Add oversize/overweight badges
        let badges = ''
        if (cargo.is_oversize) {
          badges += `<span style="display: inline-block; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #ffedd5; color: #c2410c; text-transform: uppercase; margin-left: 8px;">Oversize</span>`
        }
        if (cargo.is_overweight) {
          badges += `<span style="display: inline-block; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #fee2e2; color: #dc2626; text-transform: uppercase; margin-left: 8px;">Overweight</span>`
        }

        return `
          <div style="padding: 16px 24px; border-bottom: 1px solid #f1f5f9;">
            <!-- Cargo Title -->
            <p style="font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">
              ${cargoTypeName}${cargo.quantity > 1 ? `<span style="font-weight: 400; color: #64748b; margin-left: 8px;">(Qty: ${cargo.quantity})</span>` : ''}${badges}
            </p>
            <!-- Dimensions Grid -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
              <div>
                <span style="font-size: 12px; color: #64748b; display: block;">Length</span>
                <p style="font-size: 14px; font-weight: 500; color: #334155; margin: 4px 0 0 0;">${formatDimension(cargo.length_inches)}</p>
              </div>
              <div>
                <span style="font-size: 12px; color: #64748b; display: block;">Width</span>
                <p style="font-size: 14px; font-weight: 500; color: #334155; margin: 4px 0 0 0;">${formatDimension(cargo.width_inches)}</p>
              </div>
              <div>
                <span style="font-size: 12px; color: #64748b; display: block;">Height</span>
                <p style="font-size: 14px; font-weight: 500; color: #334155; margin: 4px 0 0 0;">${formatDimension(cargo.height_inches)}</p>
              </div>
              <div>
                <span style="font-size: 12px; color: #64748b; display: block;">Weight</span>
                <p style="font-size: 14px; font-weight: 500; color: #334155; margin: 4px 0 0 0;">${formatWeight(cargo.weight_lbs)}</p>
              </div>
            </div>
          </div>
        `
      }).join('')

      cargoItemsHtml = `
        <div style="margin-bottom: 16px; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="padding: 12px 24px; background: #f1f5f9;">
            <h4 style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0;">
              Cargo Details
            </h4>
          </div>
          ${cargoItems}
        </div>
      `
    }

    // Service items table
    let serviceItemsHtml = ''
    if (block.service_items.length > 0) {
      const serviceRows = block.service_items.map(item => `
        <tr>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 500; color: #0f172a;">${item.name}</td>
          <td style="padding: 12px 16px; font-size: 14px; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 16px; font-size: 14px; text-align: right;">${formatCurrency(item.rate)}</td>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; text-align: right;">${formatCurrency(item.total)}</td>
        </tr>
      `).join('')

      serviceItemsHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 8px 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; text-align: left;">Service</th>
              <th style="padding: 8px 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; text-align: center;">Qty</th>
              <th style="padding: 8px 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; text-align: right;">Rate</th>
              <th style="padding: 8px 16px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody style="border-top: 1px solid #f1f5f9;">
            ${serviceRows}
          </tbody>
        </table>
      `
    }

    // Accessorial charges section
    let accessorialsHtml = ''
    if (block.accessorial_charges.length > 0) {
      const accessorialRows = block.accessorial_charges.map(charge => {
        const isVariable = isVariableBillingUnit(charge.billing_unit)
        const rateDisplay = isVariable
          ? `${formatCurrency(charge.rate)}${formatBillingUnit(charge.billing_unit)}`
          : formatCurrency(charge.rate)
        // For variable rates, show "As incurred" instead of a misleading total
        const totalDisplay = isVariable
          ? `<span style="font-style: italic; color: #92400e;">As incurred</span>`
          : formatCurrency(charge.total)

        return `
          <tr>
            <td style="padding: 8px 12px; font-size: 12px; font-weight: 500; color: #92400e;">${charge.name}</td>
            <td style="padding: 8px 12px; font-size: 12px; color: #b45309;">${charge.billing_unit}</td>
            <td style="padding: 8px 12px; font-size: 12px; text-align: right; color: #b45309;">${rateDisplay}</td>
            <td style="padding: 8px 12px; font-size: 12px; font-weight: 700; text-align: right; color: #92400e;">${totalDisplay}</td>
          </tr>
        `
      }).join('')

      accessorialsHtml = `
        <div style="margin-top: 16px; padding: 16px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a;">
          <h4 style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #b45309; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <svg style="width: 12px; height: 12px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Accessorial Fees (If Applicable)
          </h4>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="padding: 8px 12px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #b45309; text-align: left;">Fee Type</th>
                <th style="padding: 8px 12px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #b45309; text-align: left;">Unit</th>
                <th style="padding: 8px 12px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #b45309; text-align: right;">Rate</th>
                <th style="padding: 8px 12px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #b45309; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody style="border-top: 1px solid #fde68a;">
              ${accessorialRows}
            </tbody>
          </table>
          <p style="font-size: 10px; color: #92400e; margin-top: 12px; font-style: italic;">
            * Time-based accessorial fees (per hour, day, etc.) are charged based on actual usage and may vary.
          </p>
        </div>
      `
    }

    loadBlocksHtml += `
      <div style="padding: 0 32px 24px;">
        <!-- Load Block Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 14px; font-weight: 700; color: #334155;">Load ${blockIndex + 1}</span>
            <span style="font-size: 12px; padding: 4px 8px; border-radius: 4px; background: #dbeafe; color: #1d4ed8; font-weight: 500;">${block.truck_type_name}</span>
          </div>
          <span style="font-size: 14px; font-weight: 700; color: ${primaryColor};">${formatCurrency(block.subtotal)}</span>
        </div>
        ${cargoItemsHtml}
        ${serviceItemsHtml}
        ${accessorialsHtml}
        ${block.notes ? `
          <div style="margin-top: 16px; background: #f0f9ff; padding: 12px; border-left: 3px solid #0ea5e9; border-radius: 4px;">
            <h4 style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #0369a1; margin-bottom: 4px;">Notes</h4>
            <p style="font-size: 11px; color: #334155; line-height: 1.6; margin: 0;">${block.notes}</p>
          </div>
        ` : ''}
      </div>
    `
  })

  // Inland transport total summary
  const totalSummaryHtml = `
    <div style="padding: 0 32px 24px;">
      <div style="display: flex; justify-content: flex-end;">
        <div style="width: 256px;">
          <div style="display: flex; justify-content: space-between; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            <span style="font-weight: 500; color: #334155;">Inland Transport Total</span>
            <span style="font-weight: 700; color: ${primaryColor};">${formatCurrency(inlandTransport.total)}</span>
          </div>
          ${(inlandTransport.accessorials_total ?? 0) > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #b45309; margin-top: 8px;">
              <span>+ Accessorials (if applicable)</span>
              <span style="font-weight: 500;">${formatCurrency(inlandTransport.accessorials_total || 0)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `

  return `
    <div style="border-bottom: 1px solid #f1f5f9;">
      <!-- Inland Transport Header -->
      <div style="padding: 32px 32px 16px;">
        <h3 class="section-title" style="color: ${primaryColor};">
          <svg style="width: 16px; height: 16px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Inland Transportation Services
        </h3>
      </div>
      ${loadBlocksHtml}
      ${totalSummaryHtml}
    </div>
  `
}

function renderPricingSummary(
  data: UnifiedPDFData,
  lineItems: ReturnType<typeof generateServiceLineItems>,
  primaryColor: string
): string {
  const servicesSubtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0)

  // Check if there are any variable accessorials
  const hasVariableAccessorials = data.inlandTransport?.load_blocks?.some(block =>
    block.accessorial_charges.some(charge => isVariableBillingUnit(charge.billing_unit))
  )

  return `
    <div class="pricing-section">
      <div class="terms-block">
        ${data.termsAndConditions ? `
          <h4 class="terms-title">Service Terms</h4>
          <p class="terms-text">${data.termsAndConditions}</p>
        ` : ''}
        ${data.customerNotes ? `
          <div style="margin-top: ${data.termsAndConditions ? '16px' : '0'}; background: #f0f9ff; padding: 12px; border-left: 3px solid #0ea5e9; border-radius: 4px;">
            <h4 class="terms-title" style="color: #0369a1; margin-bottom: 8px;">Notes</h4>
            <p class="terms-text" style="color: #334155;">${data.customerNotes}</p>
          </div>
        ` : ''}
      </div>
      <div class="totals-block">
        <div class="total-row">
          <span class="label">Subtotal (Services)</span>
          <span class="value">${formatCurrency(servicesSubtotal)}</span>
        </div>
        ${data.miscFeesTotal > 0 ? `
          <div class="total-row">
            <span class="label">Additional Fees</span>
            <span class="value">${formatCurrency(data.miscFeesTotal)}</span>
          </div>
        ` : ''}
        ${data.inlandTotal > 0 ? `
          <div class="total-row">
            <span class="label">Inland Transport</span>
            <span class="value">${formatCurrency(data.inlandTotal)}</span>
          </div>
        ` : ''}
        <div class="grand-total">
          <span class="label">Grand Total (USD)</span>
          <span class="value">${formatCurrency(data.grandTotal)}</span>
        </div>
        ${hasVariableAccessorials ? `
          <div style="margin-top: 12px; padding: 12px; border-radius: 6px; background: #fffbeb; border: 1px solid #fde68a;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
              <span style="color: #b45309; font-weight: 500;">* Accessorial fees (if applicable)</span>
              <span style="color: #92400e; font-weight: 700;">${formatCurrency(data.inlandTransport?.accessorials_total || 0)}</span>
            </div>
            <p style="font-size: 10px; color: #92400e; margin-top: 4px;">These fees are charged only when the listed services are required.</p>
          </div>
        ` : ''}
      </div>
    </div>
  `
}

function renderFooter(data: UnifiedPDFData): string {
  const year = new Date().getFullYear()

  return `
    <div class="footer">
      <p>&copy; ${year} ${data.company.name}. All rights reserved. This document is a confidential price quotation.</p>
      <p>Quote ID: ${data.quoteNumber}</p>
    </div>
  `
}
