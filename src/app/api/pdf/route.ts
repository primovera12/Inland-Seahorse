import { NextRequest, NextResponse } from 'next/server'
import type { UnifiedPDFData } from '@/lib/pdf/types'
import { generateQuotePDFHtml } from '@/lib/pdf/server/html-generator'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout for PDF generation

// Remote Chromium URL for serverless environments (official Sparticuz releases)
const CHROMIUM_REMOTE_URL = 'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'

export async function POST(request: NextRequest) {
  try {
    const data: UnifiedPDFData = await request.json()

    // Validate required fields
    if (!data.quoteNumber || !data.customer?.name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate HTML for the quote
    const html = generateQuotePDFHtml(data)

    // Dynamic imports
    const puppeteer = await import('puppeteer-core')
    const chromium = await import('@sparticuz/chromium-min')

    // Get executable path - downloads chromium if needed
    const executablePath = await chromium.default.executablePath(CHROMIUM_REMOTE_URL)

    // Launch browser with optimized settings for serverless
    const browser = await puppeteer.default.launch({
      args: chromium.default.args,
      executablePath,
      headless: 'shell',
      defaultViewport: {
        width: 794,
        height: 1123,
        deviceScaleFactor: 2,
      },
    })

    try {
      const page = await browser.newPage()

      // Set the HTML content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      })

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready')

      // Wait for images to load
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images)
            .filter(img => !img.complete)
            .map(img => new Promise((resolve) => {
              img.onload = img.onerror = resolve
            }))
        )
      })

      // Small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
        preferCSSPageSize: true,
      })

      // Convert Uint8Array to Buffer for NextResponse
      const buffer = Buffer.from(pdfBuffer)

      // Return PDF as response
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="quote-${data.quoteNumber}.pdf"`,
          'Cache-Control': 'no-store',
        },
      })
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
