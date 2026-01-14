import type { UnifiedPDFData, CostCategory } from '../types'
import { CATEGORY_STYLES, generateServiceLineItems } from '../types'
import { formatCurrency } from '@/lib/utils'
import { formatDimension, formatWeight, formatAddressMultiline, getLocationInfo, DEFAULT_PRIMARY_COLOR } from '../pdf-utils'

// Generate complete HTML document for PDF rendering
export function generateQuotePDFHtml(data: UnifiedPDFData): string {
  const primaryColor = data.company.primaryColor || DEFAULT_PRIMARY_COLOR
  const lineItems = generateServiceLineItems(data.equipment, data.isMultiEquipment)

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
      ${data.equipment.map((eq, i) => renderEquipmentSection(eq, primaryColor, data.isMultiEquipment)).join('')}
      ${renderServicesTable(lineItems, primaryColor)}
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
        <h1 class="quote-title">${data.quoteType === 'dismantle' ? 'QUOTATION' : 'INLAND QUOTATION'}</h1>
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
          <p class="label">Billing Address</p>
          <p class="value">${addressLines.join(', ')}</p>
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

    return `
      <div class="location-grid" style="border-bottom: 1px solid #f1f5f9;">
        <div class="location-block">
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
        <div class="location-block">
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
      </div>
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
    html += `
      <div class="location-grid" style="border-bottom: 1px solid #f1f5f9;">
        <div class="location-block">
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
        <div class="location-block">
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
      </div>
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
  lineItems: ReturnType<typeof generateServiceLineItems>,
  primaryColor: string
): string {
  const rows = lineItems.map((item, index) => `
    <tr>
      <td>
        <p class="service-name">${item.description}</p>
        ${item.subDescription ? `<p class="service-sub">${item.subDescription}</p>` : ''}
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
    </table>
  `
}

function renderPricingSummary(
  data: UnifiedPDFData,
  lineItems: ReturnType<typeof generateServiceLineItems>,
  primaryColor: string
): string {
  const servicesSubtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0)

  return `
    <div class="pricing-section">
      <div class="terms-block">
        ${data.termsAndConditions ? `
          <h4 class="terms-title">Service Terms</h4>
          <p class="terms-text">${data.termsAndConditions}</p>
        ` : ''}
        ${data.customerNotes ? `
          <div style="margin-top: 16px;">
            <h4 class="terms-title">Notes</h4>
            <p class="terms-text">${data.customerNotes}</p>
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
