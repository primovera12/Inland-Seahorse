'use client'

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { UnifiedPDFData } from './types'
import { preloadPDFImages } from './pdf-utils'

export interface GeneratePDFOptions {
  filename?: string
  scale?: number
  quality?: number
  onProgress?: (progress: number) => void
}

// Pattern to match unsupported CSS color functions
const UNSUPPORTED_COLOR_PATTERN = /(lab|lch|oklch|oklab)\s*\([^)]+\)/gi

// Get safe inline styles for PDF generation (hex colors only, no CSS variables)
function getSafeInlineStyles(): string {
  return `
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0a0a0a;
      background: #ffffff;
    }
  `
}

// Create an isolated iframe for PDF rendering
// This avoids html2canvas parsing the main document's stylesheets
async function createIsolatedPDFFrame(element: HTMLElement): Promise<{ iframe: HTMLIFrameElement; cleanup: () => void }> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.left = '-9999px'
    iframe.style.top = '0'
    iframe.style.width = '210mm'
    iframe.style.height = '297mm'
    iframe.style.border = 'none'

    document.body.appendChild(iframe)

    iframe.onload = () => {
      const doc = iframe.contentDocument!
      const win = iframe.contentWindow!

      // Clone the element
      const clonedElement = element.cloneNode(true) as HTMLElement

      // Get computed styles from the original element and apply them inline
      applyComputedStylesInline(element, clonedElement, win)

      // Add safe base styles
      const styleEl = doc.createElement('style')
      styleEl.textContent = getSafeInlineStyles()
      doc.head.appendChild(styleEl)

      // Add the cloned element to iframe body
      doc.body.appendChild(clonedElement)

      resolve({
        iframe,
        cleanup: () => {
          document.body.removeChild(iframe)
        },
      })
    }

    // Trigger load by setting src
    iframe.src = 'about:blank'
  })
}

// Apply computed styles inline to avoid CSS variable resolution issues
function applyComputedStylesInline(original: HTMLElement, clone: HTMLElement, win: Window): void {
  const computedStyle = window.getComputedStyle(original)

  // Properties we care about for visual rendering
  const importantProps = [
    'color', 'background-color', 'background', 'border', 'border-color',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'font-family', 'font-size', 'font-weight', 'line-height', 'text-align',
    'padding', 'margin', 'width', 'max-width', 'min-width',
    'display', 'flex-direction', 'justify-content', 'align-items', 'gap',
    'grid-template-columns', 'grid-column', 'grid-row',
    'border-radius', 'box-shadow', 'opacity',
  ]

  importantProps.forEach((prop) => {
    let value = computedStyle.getPropertyValue(prop)
    // Replace any oklch/lab colors with fallback
    if (value && UNSUPPORTED_COLOR_PATTERN.test(value)) {
      value = value.replace(UNSUPPORTED_COLOR_PATTERN, '#000000')
    }
    if (value) {
      clone.style.setProperty(prop, value)
    }
  })

  // Process children recursively
  const originalChildren = Array.from(original.children) as HTMLElement[]
  const cloneChildren = Array.from(clone.children) as HTMLElement[]

  originalChildren.forEach((originalChild, index) => {
    if (cloneChildren[index]) {
      applyComputedStylesInline(originalChild, cloneChildren[index], win)
    }
  })
}

// Generate PDF from HTML element using isolated iframe
export async function generatePDFFromElement(
  element: HTMLElement,
  options: GeneratePDFOptions = {}
): Promise<jsPDF> {
  const { scale = 2, quality = 0.95, onProgress } = options

  onProgress?.(10)

  // Create isolated iframe with the element
  const { iframe, cleanup } = await createIsolatedPDFFrame(element)

  try {
    const doc = iframe.contentDocument!
    const targetElement = doc.body.firstElementChild as HTMLElement

    if (!targetElement) {
      throw new Error('Failed to render element in iframe')
    }

    onProgress?.(30)

    // Use html2canvas on the isolated iframe content
    const canvas = await html2canvas(targetElement, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      windowWidth: 794, // A4 width in pixels at 96dpi
      windowHeight: 1123, // A4 height in pixels at 96dpi
    })

    onProgress?.(60)

    // Calculate PDF dimensions (A4 size)
    const imgWidth = 210 // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const pageHeight = 297 // A4 height in mm

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // If content fits on one page
    if (imgHeight <= pageHeight) {
      const imgData = canvas.toDataURL('image/jpeg', quality)
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight)
    } else {
      // Multi-page handling
      let heightLeft = imgHeight
      let position = 0
      let pageNum = 1

      while (heightLeft > 0) {
        if (pageNum > 1) {
          pdf.addPage()
        }

        const imgData = canvas.toDataURL('image/jpeg', quality)
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)

        heightLeft -= pageHeight
        position -= pageHeight
        pageNum++

        onProgress?.(60 + Math.min(30, (pageNum / Math.ceil(imgHeight / pageHeight)) * 30))
      }
    }

    onProgress?.(100)

    return pdf
  } finally {
    cleanup()
  }
}

// Download PDF with the unified template
export async function downloadUnifiedPDF(
  element: HTMLElement,
  data: UnifiedPDFData,
  options: GeneratePDFOptions = {}
): Promise<void> {
  const pdf = await generatePDFFromElement(element, options)
  const filename = options.filename || `quote-${data.quoteNumber}.pdf`
  pdf.save(filename)
}

// Get PDF as Blob
export async function getUnifiedPDFBlob(
  element: HTMLElement,
  options: GeneratePDFOptions = {}
): Promise<Blob> {
  const pdf = await generatePDFFromElement(element, options)
  return pdf.output('blob')
}

// Get PDF as Data URL
export async function getUnifiedPDFDataUrl(
  element: HTMLElement,
  options: GeneratePDFOptions = {}
): Promise<string> {
  const pdf = await generatePDFFromElement(element, options)
  return pdf.output('dataurlstring')
}

// Helper to render template and generate PDF (for use without React rendering)
export async function generateUnifiedPDFDirect(
  data: UnifiedPDFData,
  options: GeneratePDFOptions = {}
): Promise<jsPDF> {
  // Create a hidden container for rendering
  const container = document.createElement('div')
  container.id = 'pdf-render-container'
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '210mm'
  container.style.backgroundColor = '#ffffff'
  document.body.appendChild(container)

  try {
    // Preload images
    await preloadPDFImages({
      companyLogoUrl: data.company.logoUrl,
      equipment: data.equipment,
    })

    // Import and render the template
    const { createRoot } = await import('react-dom/client')
    const { createElement } = await import('react')
    const { QuotePDFTemplate } = await import('./components/QuotePDFTemplate')

    // Create React root and render
    const root = createRoot(container)

    await new Promise<void>((resolve) => {
      root.render(createElement(QuotePDFTemplate, { data }))
      // Wait for render to complete
      setTimeout(resolve, 500)
    })

    // Find the rendered content
    const element = container.querySelector('#quote-pdf-content') as HTMLElement
    if (!element) {
      throw new Error('Failed to render PDF template')
    }

    // Generate PDF
    const pdf = await generatePDFFromElement(element, options)

    // Cleanup
    root.unmount()

    return pdf
  } finally {
    document.body.removeChild(container)
  }
}

// Print using browser's print dialog (preserves exact styling)
export function printQuote(): void {
  window.print()
}

// Open PDF in new tab for preview
export async function previewUnifiedPDF(
  element: HTMLElement,
  options: GeneratePDFOptions = {}
): Promise<void> {
  const dataUrl = await getUnifiedPDFDataUrl(element, options)
  const newWindow = window.open()
  if (newWindow) {
    newWindow.document.write(`
      <html>
        <head><title>Quote Preview</title></head>
        <body style="margin:0;padding:0;">
          <iframe src="${dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>
        </body>
      </html>
    `)
  }
}

export default {
  generatePDFFromElement,
  downloadUnifiedPDF,
  getUnifiedPDFBlob,
  getUnifiedPDFDataUrl,
  generateUnifiedPDFDirect,
  printQuote,
  previewUnifiedPDF,
}
