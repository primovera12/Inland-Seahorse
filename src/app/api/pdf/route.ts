import { NextRequest, NextResponse } from 'next/server'
import type { UnifiedPDFData } from '@/lib/pdf/types'
import { generateQuotePDFHtml } from '@/lib/pdf/server/html-generator'

export const runtime = 'nodejs'
export const maxDuration = 30 // 30 seconds timeout

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

    // Dynamic import for Puppeteer (only loaded when needed)
    const puppeteer = await import('puppeteer-core')

    // Get Chromium executable
    let executablePath: string

    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      // Running on Vercel/AWS - use @sparticuz/chromium
      const chromium = await import('@sparticuz/chromium')
      executablePath = await chromium.default.executablePath()
    } else {
      // Local development - use local Chrome
      // Try common Chrome paths
      const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
      ]

      const fs = await import('fs')
      executablePath = possiblePaths.find(p => fs.existsSync(p)) || ''

      if (!executablePath) {
        return NextResponse.json(
          { error: 'Chrome not found. Please install Chrome for local development.' },
          { status: 500 }
        )
      }
    }

    // Launch browser
    const browser = await puppeteer.default.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--single-process',
      ],
    })

    try {
      const page = await browser.newPage()

      // Set viewport for A4 size
      await page.setViewport({
        width: 794, // A4 width at 96 DPI
        height: 1123, // A4 height at 96 DPI
        deviceScaleFactor: 2,
      })

      // Set the HTML content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 15000,
      })

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
