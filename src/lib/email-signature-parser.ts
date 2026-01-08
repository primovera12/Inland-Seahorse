/**
 * Email Signature Parser
 * Extracts contact information from pasted email signatures
 */

export interface ParsedSignature {
  firstName?: string
  lastName?: string
  fullName?: string
  company?: string
  email?: string
  phone?: string
  mobile?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  title?: string
  website?: string
}

// Regex patterns
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_PATTERNS = [
  /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
  /(?:phone|tel|cell|mobile|office|direct|fax)?:?\s*(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/gi,
]
const CITY_STATE_ZIP_PATTERN = /([A-Za-z\s]+),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i
const WEBSITE_PATTERN = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi

// Title patterns (job titles)
const TITLE_PATTERN = /\b(?:CEO|CFO|COO|CTO|CIO|CMO|VP|Vice President|President|Director|Manager|Owner|Partner|Founder|Principal|Chairman|Supervisor|Coordinator|Administrator|Executive|Officer|Consultant|Specialist|Analyst|Engineer|Developer|Designer|Architect|Lead|Head|Chief|Sales|Account|Representative|Agent|Broker|Realtor|Attorney|Lawyer|Accountant|Doctor|Nurse|Professor|Teacher)\b/i

// Company indicators
const COMPANY_INDICATORS = /\b(?:Inc\.?|LLC|Corp\.?|Corporation|Company|Co\.?|Ltd\.?|Limited|Group|Holdings|Enterprises|Industries|Services|Solutions|Associates|Partners|Consulting|Logistics|Transport|Transportation|Trucking|Freight|Shipping|Equipment|Construction|Machinery|Heavy)\b/i

// Labels we want to strip from values
const LABEL_PATTERN = /^(?:phone|tel|cell|mobile|office|direct|fax|email|e-mail|address|name|company|title|website|web):?\s*/i

/**
 * Parse an email signature and extract contact information
 */
export function parseEmailSignature(signature: string): ParsedSignature {
  const result: ParsedSignature = {}

  // Clean up and split into lines
  const lines = signature
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  if (lines.length === 0) return result

  let foundEmail = false
  let foundPhone = false
  let foundMobile = false

  // First pass: extract structured data
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lowerLine = line.toLowerCase()

    // Extract email
    const emailMatches = line.match(EMAIL_PATTERN)
    if (emailMatches && !foundEmail) {
      result.email = emailMatches[0].toLowerCase()
      foundEmail = true
    }

    // Extract phone numbers
    if (!foundPhone || !foundMobile) {
      for (const pattern of PHONE_PATTERNS) {
        const phoneMatches = line.match(pattern)
        if (phoneMatches) {
          let phone = phoneMatches[0].replace(LABEL_PATTERN, '').trim()

          // Determine if mobile or office
          if (!foundMobile && /(?:cell|mobile)/i.test(lowerLine)) {
            result.mobile = phone
            foundMobile = true
          } else if (!foundPhone) {
            result.phone = phone
            foundPhone = true
          }
        }
      }
    }

    // Extract website
    if (!result.website && !EMAIL_PATTERN.test(line)) {
      const websiteMatches = line.match(WEBSITE_PATTERN)
      if (websiteMatches) {
        result.website = websiteMatches[0]
      }
    }

    // Extract company (line with company indicators)
    if (!result.company && COMPANY_INDICATORS.test(line)) {
      let company = line
        .replace(/^(?:at|@|\||-|–|—)\s*/i, '')
        .replace(EMAIL_PATTERN, '')
        .replace(PHONE_PATTERNS[0], '')
        .replace(WEBSITE_PATTERN, '')
        .trim()

      // Remove title if present
      company = company.replace(TITLE_PATTERN, '').replace(/^[,|\s-–—]+/, '').trim()

      if (company.length > 2) {
        result.company = company
      }
    }

    // Extract address (city, state, zip pattern)
    const cityStateZipMatch = line.match(CITY_STATE_ZIP_PATTERN)
    if (cityStateZipMatch) {
      result.city = cityStateZipMatch[1].trim()
      result.state = cityStateZipMatch[2].toUpperCase()
      result.zip = cityStateZipMatch[3]

      // Check previous line for street address
      if (i > 0) {
        const prevLine = lines[i - 1]
        if (/\d/.test(prevLine) && /\b(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pl|place|pkwy|parkway|hwy|highway|suite|ste|floor|fl)\b/i.test(prevLine)) {
          result.address = `${prevLine}, ${line}`
        } else {
          result.address = line
        }
      } else {
        result.address = line
      }
    }
  }

  // Second pass: extract name from first valid line
  if (!result.fullName) {
    for (const line of lines) {
      // Skip lines with identifiable content
      if (EMAIL_PATTERN.test(line)) continue
      if (PHONE_PATTERNS[0].test(line)) continue
      if (COMPANY_INDICATORS.test(line)) continue
      if (WEBSITE_PATTERN.test(line)) continue
      if (CITY_STATE_ZIP_PATTERN.test(line)) continue
      if (LABEL_PATTERN.test(line)) continue

      // Name should be short and contain letters
      if (line.length > 2 && line.length < 50 && /[a-zA-Z]/.test(line)) {
        // Check if it has a title
        const titleMatch = line.match(TITLE_PATTERN)
        if (titleMatch) {
          // Extract name before the title
          const parts = line.split(/[,|–—-]/).map(p => p.trim())
          if (parts[0] && !TITLE_PATTERN.test(parts[0])) {
            result.fullName = parts[0]
            // Try to extract title
            result.title = titleMatch[0]
          }
        } else {
          result.fullName = line
        }
        break
      }
    }
  }

  // Third pass: if we found a name, check next line for title/company
  if (result.fullName && !result.company) {
    const nameIndex = lines.findIndex(l => l === result.fullName)
    if (nameIndex >= 0 && nameIndex < lines.length - 1) {
      const nextLine = lines[nameIndex + 1]

      if (TITLE_PATTERN.test(nextLine) || COMPANY_INDICATORS.test(nextLine)) {
        // Extract from "Title at Company" pattern
        const atMatch = nextLine.match(/(?:at|@)\s+(.+)/i)
        if (atMatch) {
          result.company = atMatch[1].trim()
          const titleMatch = nextLine.match(TITLE_PATTERN)
          if (titleMatch) result.title = titleMatch[0]
        } else {
          // Try comma pattern "Title, Company"
          const commaMatch = nextLine.match(/^(.+?)[,|]\s*(.+)/i)
          if (commaMatch && COMPANY_INDICATORS.test(commaMatch[2])) {
            result.title = commaMatch[1].trim()
            result.company = commaMatch[2].trim()
          } else if (COMPANY_INDICATORS.test(nextLine)) {
            let company = nextLine.replace(TITLE_PATTERN, '').replace(/^[,\s-–—|]+/, '').trim()
            if (company.length > 2) {
              result.company = company
            }
          }
        }
      }
    }
  }

  // Parse full name into first/last
  if (result.fullName) {
    const nameParts = result.fullName.split(/\s+/)
    if (nameParts.length >= 2) {
      result.firstName = nameParts[0]
      result.lastName = nameParts.slice(1).join(' ')
    } else {
      result.firstName = result.fullName
    }
  }

  return result
}

/**
 * Format a parsed signature back into display text
 */
export function formatParsedSignature(parsed: ParsedSignature): string {
  const parts: string[] = []

  if (parsed.fullName) parts.push(`Name: ${parsed.fullName}`)
  if (parsed.title) parts.push(`Title: ${parsed.title}`)
  if (parsed.company) parts.push(`Company: ${parsed.company}`)
  if (parsed.email) parts.push(`Email: ${parsed.email}`)
  if (parsed.phone) parts.push(`Phone: ${parsed.phone}`)
  if (parsed.mobile) parts.push(`Mobile: ${parsed.mobile}`)
  if (parsed.address) parts.push(`Address: ${parsed.address}`)
  if (parsed.website) parts.push(`Website: ${parsed.website}`)

  return parts.join('\n')
}

/**
 * Check if a string looks like an email signature
 */
export function looksLikeSignature(text: string): boolean {
  // Should have multiple lines and contain at least email or phone
  const lines = text.split(/[\r\n]+/).filter(l => l.trim().length > 0)
  const hasEmail = EMAIL_PATTERN.test(text)
  const hasPhone = PHONE_PATTERNS.some(p => p.test(text))

  return lines.length >= 2 && (hasEmail || hasPhone)
}
