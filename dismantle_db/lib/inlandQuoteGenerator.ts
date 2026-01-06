import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { InlandQuoteFormData, InlandEquipmentType, InlandDestinationBlock, RouteResult, supabase, CompanySettings } from './supabase'

// =============================================
// INLAND QUOTE PDF GENERATOR
// Styled to match the Professional Dismantle Quote
// =============================================

// Color Palette - Matching Dismantle Quote
const COLORS = {
  primary: [26, 86, 219] as [number, number, number],      // Blue for accents
  secondary: [55, 65, 81] as [number, number, number],     // Dark Gray
  accent: [234, 88, 12] as [number, number, number],       // Orange
  success: [22, 163, 74] as [number, number, number],      // Green
  light: [249, 250, 251] as [number, number, number],      // Light Gray
  border: [229, 231, 235] as [number, number, number],     // Border Gray
  text: [17, 24, 39] as [number, number, number],          // Near Black
  muted: [107, 114, 128] as [number, number, number]       // Muted Gray
}

// Billing unit labels for display
const BILLING_UNIT_LABELS: Record<string, string> = {
  flat: '',
  hour: '/hour',
  day: '/day',
  way: '/way',
  week: '/week',
  month: '/month',
  stop: '/stop',
}

interface InlandQuotePdfData {
  quoteNumber: string
  formData: InlandQuoteFormData
  totals: {
    lineHaul: number
    fuelSurcharge: number
    accessorialTotal: number
    serviceItemsTotal: number
    subtotal: number
    marginAmount: number
    total: number
  }
  route: RouteResult | null
  equipmentType?: InlandEquipmentType
  accessorialCharges: {
    type_id: string
    type_name: string
    amount: number
    is_percentage: boolean
    billing_unit?: string
    condition_text?: string | null
    quantity?: number
  }[]
  mapImage?: string // Base64 encoded map image
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// Parse hex color to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : COLORS.primary
}

// Detect image format from base64 string or data URI
function getImageFormat(imageData: string): 'PNG' | 'JPEG' | 'GIF' | 'WEBP' {
  if (imageData.includes('data:image/jpeg') || imageData.includes('data:image/jpg')) {
    return 'JPEG'
  }
  if (imageData.includes('data:image/gif')) {
    return 'GIF'
  }
  if (imageData.includes('data:image/webp')) {
    return 'WEBP'
  }
  if (imageData.includes('data:image/png')) {
    return 'PNG'
  }
  const base64Part = imageData.includes(',') ? imageData.split(',')[1] : imageData
  if (base64Part) {
    if (base64Part.startsWith('/9j/')) return 'JPEG'
    if (base64Part.startsWith('iVBOR')) return 'PNG'
    if (base64Part.startsWith('R0lGOD')) return 'GIF'
    if (base64Part.startsWith('UklGR')) return 'WEBP'
  }
  return 'PNG'
}

// Validate and prepare image data for jsPDF
function prepareImageForPdf(imageData: string | null | undefined): string | null {
  if (!imageData || typeof imageData !== 'string') {
    return null
  }
  const trimmed = imageData.trim()
  if (trimmed.startsWith('data:image/')) {
    if (trimmed.includes('data:image/svg+xml')) {
      return null
    }
    return trimmed
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return null
  }
  const cleanBase64 = trimmed.replace(/[\s\n\r]/g, '')
  if (!/^[A-Za-z0-9+/]+=*$/.test(cleanBase64)) {
    return null
  }
  if (cleanBase64.startsWith('iVBOR')) {
    return `data:image/png;base64,${cleanBase64}`
  }
  if (cleanBase64.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${cleanBase64}`
  }
  if (cleanBase64.length > 100) {
    return `data:image/png;base64,${cleanBase64}`
  }
  return null
}

// Draw section header - matching dismantle style
function drawSectionHeader(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  color: [number, number, number] = COLORS.secondary
) {
  doc.setFillColor(...color)
  doc.roundedRect(x, y, width, 8, 1, 1, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(text.toUpperCase(), x + 4, y + 5.5)
  return y + 10
}

// Draw info row - matching dismantle style
function drawInfoRow(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelWidth: number = 30
) {
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.muted)
  doc.text(label, x, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  doc.text(value, x + labelWidth, y)
  return y + 5
}

// Helper function to add image with proper aspect ratio
function addImageWithAspectRatio(
  doc: jsPDF,
  imageData: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // Create a temporary image to get dimensions
  const img = new Image()
  img.src = imageData

  // Default dimensions if we can't determine
  let imgWidth = maxWidth
  let imgHeight = maxHeight

  // Try to calculate proper dimensions from the image
  // For now, use maxWidth and calculate height to maintain aspect
  // Since we can't get actual dimensions synchronously, use a reasonable default
  const aspectRatio = maxWidth / maxHeight

  // Fit within bounds while maintaining aspect ratio
  if (aspectRatio > 1) {
    // Wider than tall
    imgWidth = maxWidth
    imgHeight = maxWidth / aspectRatio
    if (imgHeight > maxHeight) {
      imgHeight = maxHeight
      imgWidth = maxHeight * aspectRatio
    }
  } else {
    // Taller than wide
    imgHeight = maxHeight
    imgWidth = maxHeight * aspectRatio
    if (imgWidth > maxWidth) {
      imgWidth = maxWidth
      imgHeight = maxWidth / aspectRatio
    }
  }

  try {
    doc.addImage(imageData, getImageFormat(imageData), x, y, imgWidth, imgHeight, undefined, 'FAST')
  } catch (err) {
    console.error('Failed to add image:', err)
  }

  return { width: imgWidth, height: imgHeight }
}

// Load company settings
async function loadCompanySettings(): Promise<CompanySettings | null> {
  try {
    const { data } = await supabase.from('company_settings').select('*').single()
    return data
  } catch {
    return null
  }
}

// Load truck/equipment types for name lookup
async function loadTruckTypes(): Promise<Map<string, string>> {
  try {
    // Load from inland_equipment_types (same table used in UI)
    const { data } = await supabase.from('inland_equipment_types').select('id, name')
    const map = new Map<string, string>()
    if (data) {
      data.forEach((truck: { id: string; name: string }) => {
        map.set(truck.id, truck.name)
      })
    }
    return map
  } catch {
    return new Map()
  }
}

// Helper function to format dimensions from inches to ft.in
function formatDimension(inches: number | null): string {
  if (!inches) return '-'
  const feet = Math.floor(inches / 12)
  const remainingInches = inches % 12
  return remainingInches > 0 ? `${feet}'${remainingInches}"` : `${feet}'`
}

// Generate the PDF
export async function generateInlandQuotePdf(data: InlandQuotePdfData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  const contentWidth = pageWidth - margin * 2

  // Load company settings and truck types
  const [settings, truckTypes] = await Promise.all([
    loadCompanySettings(),
    loadTruckTypes()
  ])
  const primaryColor = settings?.primary_color ? hexToRgb(settings.primary_color) : COLORS.primary
  const companyName = settings?.company_name || 'Transportation Services'

  let currentY = margin

  // ============================================
  // TOP SECTION: Two Column Layout
  // Left: Logo, Email, Website, Quote #, Date
  // Right: Client Information
  // ============================================
  const logoData = settings?.logo_base64 ? prepareImageForPdf(settings.logo_base64) : null
  const topSectionHeight = 48
  const leftBoxWidth = contentWidth * 0.48
  const rightBoxWidth = contentWidth * 0.48
  const rightBoxX = margin + leftBoxWidth + (contentWidth * 0.04)

  // LEFT BOX: Logo + Company Information + Quote Details
  doc.setFillColor(...COLORS.light)
  doc.roundedRect(margin, currentY, leftBoxWidth, topSectionHeight, 2, 2, 'F')

  let leftY = currentY + 4

  // Logo at top of left box
  if (logoData) {
    try {
      const logoWidthPercent = settings?.logo_width_percent || 50
      const maxLogoWidth = (leftBoxWidth - 8) * (logoWidthPercent / 100)
      const maxLogoHeight = 16
      const originalWidth = settings?.logo_width || 100
      const originalHeight = settings?.logo_height || 100
      const aspectRatio = originalWidth / originalHeight

      let logoWidth: number
      let logoHeight: number

      if (aspectRatio > (maxLogoWidth / maxLogoHeight)) {
        logoWidth = maxLogoWidth
        logoHeight = logoWidth / aspectRatio
      } else {
        logoHeight = maxLogoHeight
        logoWidth = logoHeight * aspectRatio
      }

      doc.addImage(logoData, getImageFormat(logoData), margin + 4, leftY, logoWidth, logoHeight)
      leftY += logoHeight + 3
    } catch (e) {
      console.error('Logo error:', e)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.text)
      doc.text(companyName, margin + 4, leftY + 4)
      leftY += 8
    }
  } else {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.text)
    doc.text(companyName, margin + 4, leftY + 4)
    leftY += 8
  }

  // Company contact info below logo
  if (settings?.company_email) {
    leftY = drawInfoRow(doc, 'Email:', settings.company_email, margin + 4, leftY, 16)
  }
  if (settings?.company_website) {
    leftY = drawInfoRow(doc, 'Website:', settings.company_website, margin + 4, leftY, 16)
  }

  // Quote # and Date in left box
  leftY += 2
  leftY = drawInfoRow(doc, 'Quote #:', data.quoteNumber, margin + 4, leftY, 16)
  drawInfoRow(doc, 'Date:', formatDate(new Date()), margin + 4, leftY, 16)

  // RIGHT BOX: Client Information
  doc.setFillColor(...COLORS.light)
  doc.roundedRect(rightBoxX, currentY, rightBoxWidth, topSectionHeight, 2, 2, 'F')

  // Client info header
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...primaryColor)
  doc.text('CLIENT INFORMATION', rightBoxX + 4, currentY + 6)

  let clientY = currentY + 12
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.text)
  if (data.formData.client_name) {
    doc.text(data.formData.client_name, rightBoxX + 4, clientY)
    clientY += 5
  }

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.muted)
  if (data.formData.client_company) {
    doc.text(data.formData.client_company, rightBoxX + 4, clientY)
    clientY += 4
  }
  if (data.formData.client_email) {
    doc.text(data.formData.client_email, rightBoxX + 4, clientY)
    clientY += 4
  }
  if (data.formData.client_phone) {
    doc.text(data.formData.client_phone, rightBoxX + 4, clientY)
  }

  currentY += topSectionHeight + 5

  // ============================================
  // DESTINATION BLOCKS OR LEGACY ROUTE/LOAD STRUCTURE
  // ============================================
  const hasDestinationBlocks = data.formData.destination_blocks && data.formData.destination_blocks.length > 0

  // Helper function to draw route information for a destination
  const drawRouteSection = (
    pickup: typeof data.formData.pickup,
    dropoff: typeof data.formData.dropoff,
    route: RouteResult | null,
    mapImageBase64?: string | null
  ) => {
    const hasMap = mapImageBase64 && mapImageBase64.length > 100
    const hasRoute = route && route.distance_miles > 0
    const routeSectionHeight = hasMap ? 65 : (hasRoute ? 45 : 30)

    doc.setFillColor(...COLORS.light)
    doc.roundedRect(margin, currentY, contentWidth, routeSectionHeight, 1, 1, 'F')

    // If we have a map image, show it on the right side with proper aspect ratio
    if (hasMap) {
      try {
        const maxMapWidth = 75
        const maxMapHeight = 50
        const mapAspectRatio = 1.6
        let mapWidth = maxMapWidth
        let mapHeight = maxMapWidth / mapAspectRatio

        if (mapHeight > maxMapHeight) {
          mapHeight = maxMapHeight
          mapWidth = maxMapHeight * mapAspectRatio
        }

        const mapX = pageWidth - margin - mapWidth - 3
        const mapY = currentY + 5

        doc.addImage(mapImageBase64!, 'PNG', mapX, mapY, mapWidth, mapHeight, undefined, 'FAST')
      } catch (e) {
        console.error('Failed to add map image:', e)
      }
    }

    const addressWidth = hasMap ? contentWidth - 80 : contentWidth - 10

    // Pickup with green dot
    doc.setFillColor(34, 197, 94)
    doc.circle(margin + 6, currentY + 8, 2.5, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.text)
    doc.text('PICKUP', margin + 12, currentY + 9)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.muted)
    if (pickup && pickup.formatted_address) {
      const pickupLines = doc.splitTextToSize(pickup.formatted_address, addressWidth)
      doc.text(pickupLines, margin + 12, currentY + 14)
    }

    // Dropoff with red dot
    const dropoffStartY = hasMap ? currentY + 26 : currentY + 18
    doc.setFillColor(239, 68, 68)
    doc.circle(margin + 6, dropoffStartY, 2.5, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.text)
    doc.text('DELIVERY', margin + 12, dropoffStartY + 1)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.muted)
    if (dropoff && dropoff.formatted_address) {
      const dropoffLines = doc.splitTextToSize(dropoff.formatted_address, addressWidth)
      doc.text(dropoffLines, margin + 12, dropoffStartY + 6)
    }

    // Distance with blue dot (below Delivery)
    if (route) {
      const distanceStartY = hasMap ? dropoffStartY + 18 : dropoffStartY + 12
      doc.setFillColor(59, 130, 246)
      doc.circle(margin + 6, distanceStartY, 2.5, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.text)
      doc.text('DISTANCE', margin + 12, distanceStartY + 1)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...COLORS.muted)
      const durationText = route.duration_minutes
        ? ` (${Math.floor(route.duration_minutes / 60)}h ${route.duration_minutes % 60}m)`
        : ''
      doc.text(`${route.distance_miles.toFixed(0)} miles${durationText}`, margin + 12, distanceStartY + 6)
    }

    currentY += routeSectionHeight + 5
  }

  // Helper function to draw load blocks
  const drawLoadBlocks = (loadBlocks: typeof data.formData.load_blocks, destLabel?: string) => {
    if (!loadBlocks || loadBlocks.length === 0) return

    for (let blockIndex = 0; blockIndex < loadBlocks.length; blockIndex++) {
      const block = loadBlocks[blockIndex]
      const blockNumber = blockIndex + 1
      const isMultipleBlocks = loadBlocks.length > 1

      if (currentY + 25 > pageHeight - 20) {
        doc.addPage()
        currentY = margin
      }

      const blockTitle = isMultipleBlocks ? `Load ${blockNumber}` : 'Load Details'
      currentY = drawSectionHeader(doc, blockTitle, margin, currentY, contentWidth, primaryColor)

      // Truck type if specified
      if (block.truck_type_id) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.text)
        const truckTypeName = truckTypes.get(block.truck_type_id) || 'Unknown Truck Type'
        doc.text(`Truck Type: ${truckTypeName}`, margin + 4, currentY + 2)
        currentY += 6
      }

      // ---- Cargo Items for this block ----
      if (block.cargo_items && block.cargo_items.length > 0) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.muted)
        doc.text('Cargo:', margin + 4, currentY + 2)
        currentY += 5

        const cargoTableData = block.cargo_items.map((item, index) => {
          const dimensions = [
            item.length_inches ? `L: ${formatDimension(item.length_inches)}` : '',
            item.width_inches ? `W: ${formatDimension(item.width_inches)}` : '',
            item.height_inches ? `H: ${formatDimension(item.height_inches)}` : '',
          ].filter(Boolean).join(' ')

          return [
            `${index + 1}`,
            item.description || 'N/A',
            item.cargo_type || 'General Freight',
            item.quantity.toString(),
            item.weight_lbs ? `${item.weight_lbs.toLocaleString()} lbs` : '-',
            dimensions || '-',
          ]
        })

        autoTable(doc, {
          startY: currentY,
          head: [['#', 'Description', 'Type', 'Qty', 'Weight', 'Dimensions']],
          body: cargoTableData,
          margin: { left: margin, right: margin },
          theme: 'plain',
          headStyles: {
            fillColor: [...COLORS.light],
            textColor: [...COLORS.text],
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: 2
          },
          bodyStyles: {
            fontSize: 7,
            cellPadding: 2,
            textColor: [...COLORS.text]
          },
          columnStyles: {
            0: { cellWidth: 8 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 25 },
            3: { cellWidth: 10 },
            4: { cellWidth: 22 },
            5: { cellWidth: 35 },
          },
          alternateRowStyles: {
            fillColor: [252, 252, 253]
          },
        })

        currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

        // Cargo images (if any)
        const cargoWithImages = block.cargo_items.filter(item => item.image_base64)
        if (cargoWithImages.length > 0) {
          doc.setFontSize(7)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...COLORS.muted)
          doc.text('Cargo Images:', margin + 4, currentY + 2)
          currentY += 5

          // Display cargo images in a row (max 3 per row)
          const imgMaxWidth = (contentWidth - 20) / 3
          const imgMaxHeight = 35
          let imgX = margin + 4
          let imagesInRow = 0

          for (const cargo of cargoWithImages) {
            if (imagesInRow >= 3) {
              imgX = margin + 4
              currentY += imgMaxHeight + 8
              imagesInRow = 0
            }

            if (currentY + imgMaxHeight + 10 > pageHeight - 20) {
              doc.addPage()
              currentY = margin
              imgX = margin + 4
              imagesInRow = 0
            }

            try {
              const preparedImage = prepareImageForPdf(cargo.image_base64)
              if (preparedImage) {
                // Add image with proper aspect ratio (fit within bounds)
                doc.addImage(preparedImage, getImageFormat(preparedImage), imgX, currentY, imgMaxWidth - 5, imgMaxHeight, undefined, 'FAST')

                // Label below image
                doc.setFontSize(6)
                doc.setFont('helvetica', 'normal')
                doc.setTextColor(...COLORS.muted)
                const label = cargo.description ? cargo.description.substring(0, 20) : 'Cargo'
                doc.text(label, imgX + (imgMaxWidth - 5) / 2, currentY + imgMaxHeight + 3, { align: 'center' })
              }
            } catch (err) {
              console.error('Failed to add cargo image:', err)
            }

            imgX += imgMaxWidth
            imagesInRow++
          }

          currentY += imgMaxHeight + 8
        }
      }

      // ---- Load Image for this block ----
      if (block.load_image_base64) {
        if (currentY + 50 > pageHeight - 20) {
          doc.addPage()
          currentY = margin
        }

        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.muted)
        doc.text('Load Image:', margin + 4, currentY + 2)
        currentY += 5

        try {
          const preparedImage = prepareImageForPdf(block.load_image_base64)
          if (preparedImage) {
            // Display load image with proper aspect ratio
            const maxImgWidth = contentWidth * 0.6
            const maxImgHeight = 45
            doc.addImage(preparedImage, getImageFormat(preparedImage), margin + 4, currentY, maxImgWidth, maxImgHeight, undefined, 'FAST')
            currentY += maxImgHeight + 5
          }
        } catch (err) {
          console.error('Failed to add load image:', err)
        }
      }

      // Block notes
      if (block.notes) {
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(...COLORS.muted)
        const noteLines = doc.splitTextToSize(`Notes: ${block.notes}`, contentWidth - 8)
        doc.text(noteLines.slice(0, 2), margin + 4, currentY)
        currentY += Math.min(noteLines.length, 2) * 3 + 2
      }

      currentY += 3 // Small space between blocks
    }
  }

  // Helper function to draw destination notes
  const drawDestinationNotes = (customerNotes: string, specialInstructions: string) => {
    if (!customerNotes && !specialInstructions) return

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.muted)
    doc.text('NOTES & INSTRUCTIONS', margin, currentY)
    currentY += 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)

    if (customerNotes) {
      const noteLines = doc.splitTextToSize(customerNotes, contentWidth)
      doc.text(noteLines.slice(0, 3), margin, currentY)
      currentY += Math.min(noteLines.length, 3) * 3 + 2
    }

    if (specialInstructions) {
      doc.setFont('helvetica', 'italic')
      const instrLines = doc.splitTextToSize(`Special: ${specialInstructions}`, contentWidth)
      doc.text(instrLines.slice(0, 2), margin, currentY)
      currentY += Math.min(instrLines.length, 2) * 3
    }

    currentY += 5
  }

  // Helper function to draw pricing section for a destination block
  const drawDestinationPricing = (destBlock: InlandDestinationBlock, destName: string) => {
    // Collect services and accessorials from this destination's load blocks
    const destServices: { name: string; description: string; quantity: number; price: number; blockNum?: number }[] = []
    const destAccessorials: { type_name: string; amount: number; is_percentage: boolean; billing_unit?: string; quantity: number; blockNum?: number }[] = []

    destBlock.load_blocks.forEach((block, idx) => {
      const blockNum = destBlock.load_blocks.length > 1 ? idx + 1 : undefined
      if (block.service_items) {
        block.service_items.forEach(item => {
          destServices.push({ ...item, blockNum })
        })
      }
      if (block.accessorial_charges) {
        block.accessorial_charges.forEach(charge => {
          destAccessorials.push({
            type_name: charge.type_name,
            amount: charge.amount,
            is_percentage: charge.is_percentage,
            billing_unit: charge.billing_unit,
            quantity: charge.quantity || 1,
            blockNum
          })
        })
      }
    })

    // Only show pricing if there are services or accessorials
    if (destServices.length === 0 && destAccessorials.length === 0) return

    if (currentY + 40 > pageHeight - 30) {
      doc.addPage()
      currentY = margin
    }

    currentY = drawSectionHeader(doc, `Pricing - ${destName}`, margin, currentY, contentWidth, primaryColor)

    // Services table
    if (destServices.length > 0) {
      const serviceTableData = destServices.map((item) => {
        const qtyDesc = item.quantity > 1 ? `${item.quantity} x ${formatCurrency(item.price)}` : ''
        const itemTotal = item.price * item.quantity
        const itemName = item.description ? `${item.name} - ${item.description}` : item.name
        const displayName = item.blockNum ? `${itemName} (Load ${item.blockNum})` : (itemName || 'Service')
        return [displayName, qtyDesc, formatCurrency(itemTotal)]
      })

      autoTable(doc, {
        startY: currentY,
        head: [['Service', 'Details', 'Amount']],
        body: serviceTableData,
        margin: { left: margin, right: margin },
        theme: 'plain',
        headStyles: {
          fillColor: [...COLORS.light],
          textColor: [...COLORS.text],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 2.5
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2.5,
          textColor: [...COLORS.text]
        },
        columnStyles: {
          0: { cellWidth: 'auto', fontStyle: 'bold' },
          1: { cellWidth: 45, textColor: [...COLORS.muted] },
          2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [252, 252, 253]
        },
      })

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

      // Services subtotal
      const servicesTotal = destServices.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.success)
      doc.text(`Services Total: ${formatCurrency(servicesTotal)}`, pageWidth - margin - 4, currentY, { align: 'right' })
      currentY += 8
    }

    // Accessorials table
    if (destAccessorials.length > 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.accent)
      doc.text('Accessorial Charges (If Applicable)', margin + 4, currentY + 2)
      currentY += 7

      const accessorialData = destAccessorials.map((charge) => {
        const qty = charge.quantity || 1
        const billingUnit = charge.billing_unit ? BILLING_UNIT_LABELS[charge.billing_unit] || '' : ''
        const rateStr = charge.is_percentage
          ? `${charge.amount}%`
          : `${formatCurrency(charge.amount)}${billingUnit}`
        const qtyStr = qty > 1 ? ` x ${qty}` : ''
        const amount = charge.is_percentage
          ? (data.totals.lineHaul * charge.amount / 100 * qty)
          : (charge.amount * qty)
        const displayName = charge.blockNum ? `${charge.type_name} (Load ${charge.blockNum})` : charge.type_name

        return [displayName, `${rateStr}${qtyStr}`, formatCurrency(amount)]
      })

      autoTable(doc, {
        startY: currentY,
        head: [['Charge', 'Rate', 'Amount']],
        body: accessorialData,
        margin: { left: margin, right: margin },
        theme: 'plain',
        headStyles: {
          fillColor: [255, 237, 213],
          textColor: [180, 83, 9],
          fontSize: 8,
          fontStyle: 'bold',
          cellPadding: 2.5
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2.5,
          textColor: [...COLORS.text]
        },
        columnStyles: {
          0: { cellWidth: 'auto', fontStyle: 'bold' },
          1: { cellWidth: 40 },
          2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        },
        alternateRowStyles: {
          fillColor: [255, 251, 235]
        },
      })

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3
    }

    // Destination total (only services - accessorials are conditional/informational only)
    const destServicesTotal = destServices.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const destTotal = destServicesTotal // Accessorials NOT included - they are "if applicable"

    // Page break check before destination total box to prevent cut-off
    if (currentY + 20 > pageHeight - 20) {
      doc.addPage()
      currentY = margin
    }

    doc.setFillColor(...primaryColor)
    doc.roundedRect(pageWidth - margin - 70, currentY, 70, 10, 1, 1, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(`${destName} Total:`, pageWidth - margin - 68, currentY + 6.5)
    doc.text(formatCurrency(destTotal), pageWidth - margin - 3, currentY + 6.5, { align: 'right' })
    currentY += 15
  }

  // ============================================
  // RENDER DESTINATION BLOCKS OR LEGACY STRUCTURE
  // ============================================
  if (hasDestinationBlocks) {
    // Loop through each destination block
    for (let destIndex = 0; destIndex < data.formData.destination_blocks.length; destIndex++) {
      const destBlock = data.formData.destination_blocks[destIndex]
      const isMultipleDestinations = data.formData.destination_blocks.length > 1

      // Page break check for destination header
      if (currentY + 40 > pageHeight - 20) {
        doc.addPage()
        currentY = margin
      }

      // Destination header (only show if multiple destinations)
      if (isMultipleDestinations) {
        doc.setFillColor(...primaryColor)
        doc.roundedRect(margin, currentY, contentWidth, 8, 1, 1, 'F')
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(255, 255, 255)
        doc.text(destBlock.name.toUpperCase(), margin + 4, currentY + 5.5)
        currentY += 12
      }

      // Route section header
      currentY = drawSectionHeader(doc, 'Route Information', margin, currentY, contentWidth, COLORS.secondary)

      // Draw route for this destination with its own map image
      drawRouteSection(destBlock.pickup, destBlock.dropoff, destBlock.route, destBlock.map_image_base64)

      // Draw load blocks for this destination
      drawLoadBlocks(destBlock.load_blocks)

      // Draw pricing for this destination (separate per destination)
      drawDestinationPricing(destBlock, destBlock.name)

      // Draw notes for this destination
      if (destBlock.customer_notes || destBlock.special_instructions) {
        if (currentY + 25 > pageHeight - 30) {
          doc.addPage()
          currentY = margin
        }
        drawDestinationNotes(destBlock.customer_notes, destBlock.special_instructions)
      }

      currentY += 5 // Space between destinations
    }
  } else {
    // Legacy structure: single route and load blocks
    currentY = drawSectionHeader(doc, 'Route Information', margin, currentY, contentWidth, COLORS.secondary)
    drawRouteSection(data.formData.pickup, data.formData.dropoff, data.route, data.mapImage)
    drawLoadBlocks(data.formData.load_blocks)
  }

  // ============================================
  // PRICING SECTION - Only for legacy mode (non-destination blocks)
  // When using destination blocks, pricing is shown per destination above
  // ============================================
  const allServices: { name: string; description: string; quantity: number; price: number; blockNum?: number; destNum?: number }[] = []
  const allAccessorials: { type_name: string; amount: number; is_percentage: boolean; billing_unit?: string; quantity: number; blockNum?: number; destNum?: number }[] = []

  // Only collect and show combined pricing for legacy mode
  const hasLoadBlocks = data.formData.load_blocks && data.formData.load_blocks.length > 0
  if (hasLoadBlocks && !hasDestinationBlocks) {
    data.formData.load_blocks.forEach((block, idx) => {
      const blockNum = data.formData.load_blocks.length > 1 ? idx + 1 : undefined
      if (block.service_items) {
        block.service_items.forEach(item => {
          allServices.push({ ...item, blockNum })
        })
      }
      if (block.accessorial_charges) {
        block.accessorial_charges.forEach(charge => {
          allAccessorials.push({
            type_name: charge.type_name,
            amount: charge.amount,
            is_percentage: charge.is_percentage,
            billing_unit: charge.billing_unit,
            quantity: charge.quantity || 1,
            blockNum
          })
        })
      }
    })
  }

  // Also add top-level service items and accessorial charges
  if (data.formData.service_items) {
    data.formData.service_items.forEach(item => {
      allServices.push(item)
    })
  }
  if (data.accessorialCharges) {
    data.accessorialCharges.forEach(charge => {
      allAccessorials.push({
        type_name: charge.type_name,
        amount: charge.amount,
        is_percentage: charge.is_percentage,
        billing_unit: charge.billing_unit,
        quantity: charge.quantity || 1
      })
    })
  }

  // Only show combined pricing section for legacy mode (not destination blocks)
  if (!hasDestinationBlocks && (allServices.length > 0 || allAccessorials.length > 0)) {
    if (currentY + 60 > pageHeight - 30) {
      doc.addPage()
      currentY = margin
    }

    currentY = drawSectionHeader(doc, 'Pricing', margin, currentY, contentWidth, primaryColor)

    // Services table
    if (allServices.length > 0) {
      const serviceTableData = allServices.map((item: { name: string; description: string; quantity: number; price: number; blockNum?: number; destNum?: number }) => {
        const qtyDesc = item.quantity > 1 ? `${item.quantity} x ${formatCurrency(item.price)}` : ''
        const itemTotal = item.price * item.quantity
        const itemName = item.description ? `${item.name} - ${item.description}` : item.name
        let displayName = itemName || 'Service'
        if (item.destNum && item.blockNum) {
          displayName = `${itemName} (Dest ${item.destNum}, Load ${item.blockNum})`
        } else if (item.destNum) {
          displayName = `${itemName} (Dest ${item.destNum})`
        } else if (item.blockNum) {
          displayName = `${itemName} (Load ${item.blockNum})`
        }
        return [displayName, qtyDesc, formatCurrency(itemTotal)]
      })

      autoTable(doc, {
        startY: currentY,
        head: [['Service', 'Details', 'Amount']],
        body: serviceTableData,
        margin: { left: margin, right: margin },
        theme: 'plain',
        headStyles: {
          fillColor: [...COLORS.light],
          textColor: [...COLORS.text],
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: 2.5
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2.5,
          textColor: [...COLORS.text]
        },
        columnStyles: {
          0: { cellWidth: 'auto', fontStyle: 'bold' },
          1: { cellWidth: 45, textColor: [...COLORS.muted] },
          2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [252, 252, 253]
        },
      })

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

      // Services subtotal
      const servicesTotal = allServices.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.success)
      doc.text(`Services Total: ${formatCurrency(servicesTotal)}`, pageWidth - margin - 4, currentY, { align: 'right' })
      currentY += 8
    }

    // Accessorials table
    if (allAccessorials.length > 0) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...COLORS.accent)
      doc.text('Accessorial Charges (If Applicable)', margin + 4, currentY + 2)
      currentY += 7

      const accessorialData = allAccessorials.map((charge: { type_name: string; amount: number; is_percentage: boolean; billing_unit?: string; quantity: number; blockNum?: number; destNum?: number }) => {
        const qty = charge.quantity || 1
        const billingUnit = charge.billing_unit ? BILLING_UNIT_LABELS[charge.billing_unit] || '' : ''
        const rateStr = charge.is_percentage
          ? `${charge.amount}%`
          : `${formatCurrency(charge.amount)}${billingUnit}`
        const qtyStr = qty > 1 ? ` x ${qty}` : ''
        const amount = charge.is_percentage
          ? (data.totals.lineHaul * charge.amount / 100 * qty)
          : (charge.amount * qty)
        let displayName = charge.type_name
        if (charge.destNum && charge.blockNum) {
          displayName = `${charge.type_name} (Dest ${charge.destNum}, Load ${charge.blockNum})`
        } else if (charge.destNum) {
          displayName = `${charge.type_name} (Dest ${charge.destNum})`
        } else if (charge.blockNum) {
          displayName = `${charge.type_name} (Load ${charge.blockNum})`
        }

        return [displayName, `${rateStr}${qtyStr}`, formatCurrency(amount)]
      })

      autoTable(doc, {
        startY: currentY,
        head: [['Charge', 'Rate', 'Amount']],
        body: accessorialData,
        margin: { left: margin, right: margin },
        theme: 'plain',
        headStyles: {
          fillColor: [255, 237, 213],
          textColor: [180, 83, 9],
          fontSize: 8,
          fontStyle: 'bold',
          cellPadding: 2.5
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2.5,
          textColor: [...COLORS.text]
        },
        columnStyles: {
          0: { cellWidth: 'auto', fontStyle: 'bold' },
          1: { cellWidth: 40 },
          2: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        },
        alternateRowStyles: {
          fillColor: [255, 251, 235]
        },
      })

      currentY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
    }
  }

  // ============================================
  // TOP-LEVEL LOAD IMAGE (if no blocks have it)
  // ============================================
  const hasBlockImages = data.formData.load_blocks?.some(b => b.load_image_base64)
  if (data.formData.load_image_base64 && !hasBlockImages) {
    if (currentY + 55 > pageHeight - 30) {
      doc.addPage()
      currentY = margin
    }

    currentY = drawSectionHeader(doc, 'Load Image', margin, currentY, contentWidth, COLORS.secondary)

    try {
      const preparedImage = prepareImageForPdf(data.formData.load_image_base64)
      if (preparedImage) {
        const maxImgWidth = contentWidth * 0.7
        const maxImgHeight = 50
        doc.addImage(preparedImage, getImageFormat(preparedImage), margin + (contentWidth - maxImgWidth) / 2, currentY, maxImgWidth, maxImgHeight, undefined, 'FAST')
        currentY += maxImgHeight + 5
      }
    } catch (err) {
      console.error('Failed to add load image:', err)
    }
  }

  // ============================================
  // GRAND TOTALS SECTION
  // Only show when there's 1 or fewer destination blocks
  // (When 2+ destinations, each has its own total already)
  // ============================================
  const showGrandTotal = !hasDestinationBlocks || data.formData.destination_blocks.length <= 1

  if (showGrandTotal) {
    if (currentY + 40 > pageHeight - 30) {
      doc.addPage()
      currentY = margin
    }

    currentY = drawSectionHeader(doc, 'Quote Total', margin, currentY, contentWidth, primaryColor)

    const totalsWidth = 90
    const totalsX = pageWidth - margin - totalsWidth

    doc.setFillColor(...COLORS.light)
    doc.roundedRect(totalsX, currentY, totalsWidth, 25, 2, 2, 'F')

    let totalsY = currentY + 8

    // Subtotal
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.muted)
    doc.text('Subtotal:', totalsX + 5, totalsY)
    doc.setTextColor(...COLORS.text)
    doc.text(formatCurrency(data.totals.subtotal), totalsX + totalsWidth - 5, totalsY, { align: 'right' })
    totalsY += 7

    // Total
    doc.setFillColor(...primaryColor)
    doc.roundedRect(totalsX, totalsY - 2, totalsWidth, 12, 0, 0, 'F')

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('TOTAL:', totalsX + 5, totalsY + 6)
    doc.text(formatCurrency(data.totals.total), totalsX + totalsWidth - 5, totalsY + 6, { align: 'right' })

    currentY += 35
  }

  // ============================================
  // NOTES (if any) - only for legacy structure, destination blocks show notes inline
  // ============================================
  if (!hasDestinationBlocks && (data.formData.customer_notes || data.formData.special_instructions)) {
    if (currentY + 25 > pageHeight - 30) {
      doc.addPage()
      currentY = margin
    }

    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.muted)
    doc.text('NOTES & INSTRUCTIONS', margin, currentY)
    currentY += 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)

    if (data.formData.customer_notes) {
      const noteLines = doc.splitTextToSize(data.formData.customer_notes, contentWidth)
      doc.text(noteLines.slice(0, 3), margin, currentY)
      currentY += Math.min(noteLines.length, 3) * 3 + 2
    }

    if (data.formData.special_instructions) {
      doc.setFont('helvetica', 'italic')
      const instrLines = doc.splitTextToSize(`Special: ${data.formData.special_instructions}`, contentWidth)
      doc.text(instrLines.slice(0, 2), margin, currentY)
      currentY += Math.min(instrLines.length, 2) * 3
    }

    currentY += 5
  }

  // ============================================
  // TERMS & CONDITIONS
  // ============================================
  if (settings?.terms_and_conditions && currentY < pageHeight - 40) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.muted)
    doc.text('TERMS & CONDITIONS', margin, currentY)
    currentY += 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)

    const termsLines = doc.splitTextToSize(settings.terms_and_conditions, contentWidth)
    doc.text(termsLines.slice(0, 4), margin, currentY)
  }

  // ============================================
  // FOOTER - Matching Dismantle Style
  // ============================================
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)

    doc.setFillColor(...COLORS.light)
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F')

    doc.setFontSize(7)
    doc.setTextColor(...COLORS.muted)

    // Footer text
    const footerText = settings?.footer_text || 'Thank you for your business!'
    doc.text(footerText, pageWidth / 2, pageHeight - 5, { align: 'center' })

    // Page number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' })
  }

  return doc.output('blob')
}
