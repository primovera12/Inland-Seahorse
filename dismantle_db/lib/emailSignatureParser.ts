// Parse email signature to extract client information
export interface ParsedSignature {
  name?: string
  company?: string
  email?: string
  phone?: string
  address?: string
  billing_address?: string
  billing_city?: string
  billing_state?: string
  billing_zip?: string
}

export function parseEmailSignature(signature: string): ParsedSignature {
  const result: ParsedSignature = {}

  // Clean up the signature - remove extra whitespace and split into lines
  const lines = signature
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  // Email pattern
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

  // Phone patterns (various formats)
  const phonePatterns = [
    /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    /(?:phone|tel|cell|mobile|office|direct|fax)?:?\s*(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/gi,
  ]

  // Address patterns - look for city, state zip patterns
  const cityStateZipPattern = /([A-Za-z\s]+),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i

  // Website pattern
  const websitePattern = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi

  // Common title patterns to identify name lines
  const titlePatterns = [
    /\b(?:CEO|CFO|COO|CTO|CIO|CMO|VP|President|Director|Manager|Owner|Partner|Founder|Principal|Chairman|Supervisor|Coordinator|Administrator|Executive|Officer|Consultant|Specialist|Analyst|Engineer|Developer|Designer|Architect|Lead|Head|Chief)\b/i,
  ]

  // Company indicators
  const companyIndicators = [
    /\b(?:Inc\.?|LLC|Corp\.?|Corporation|Company|Co\.?|Ltd\.?|Limited|Group|Holdings|Enterprises|Industries|Services|Solutions|Associates|Partners|Consulting)\b/i,
  ]

  let foundEmail = false
  let foundPhone = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Extract email
    const emailMatches = line.match(emailPattern)
    if (emailMatches && !foundEmail) {
      result.email = emailMatches[0].toLowerCase()
      foundEmail = true
    }

    // Extract phone
    if (!foundPhone) {
      for (const pattern of phonePatterns) {
        const phoneMatches = line.match(pattern)
        if (phoneMatches) {
          // Clean up phone number
          let phone = phoneMatches[0].replace(/^(?:phone|tel|cell|mobile|office|direct|fax)?:?\s*/i, '')
          result.phone = phone.trim()
          foundPhone = true
          break
        }
      }
    }

    // Check for company name (line with company indicators)
    if (!result.company && companyIndicators.some(p => p.test(line))) {
      // Remove common prefixes and clean up
      let company = line.replace(/^(?:at|@|\||-|–|—)\s*/i, '').trim()
      // Remove email, phone, website from the line
      company = company.replace(emailPattern, '').replace(phonePatterns[0], '').trim()
      if (company.length > 2) {
        result.company = company
      }
    }

    // Check for address patterns
    const cityStateZipMatch = line.match(cityStateZipPattern)
    if (cityStateZipMatch) {
      result.billing_city = cityStateZipMatch[1].trim()
      result.billing_state = cityStateZipMatch[2].toUpperCase()
      result.billing_zip = cityStateZipMatch[3]

      // Check previous line for street address
      if (i > 0 && !result.billing_address) {
        const prevLine = lines[i - 1]
        // If previous line looks like a street address (contains numbers and common street words)
        if (/\d/.test(prevLine) && /\b(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|pl|place|pkwy|parkway|hwy|highway|suite|ste|floor|fl)\b/i.test(prevLine)) {
          result.billing_address = prevLine
          result.address = `${prevLine}, ${line}`
        } else {
          result.address = line
        }
      } else {
        result.address = line
      }
    }
  }

  // First line is often the name (if it doesn't contain email, phone, website, or company indicators)
  if (!result.name && lines.length > 0) {
    for (const line of lines) {
      // Skip if line contains email, phone, or looks like a company
      if (emailPattern.test(line)) continue
      if (phonePatterns[0].test(line)) continue
      if (companyIndicators.some(p => p.test(line))) continue
      if (websitePattern.test(line)) continue
      if (cityStateZipPattern.test(line)) continue
      if (/^(?:phone|tel|cell|mobile|office|direct|fax|email|e-mail|address):/i.test(line)) continue

      // Name should be relatively short and contain letters
      if (line.length > 3 && line.length < 50 && /[a-zA-Z]/.test(line)) {
        // Check if it has a title - if so, extract just the name part
        const titleMatch = line.match(titlePatterns[0])
        if (titleMatch) {
          // Name might be before or after the title
          const parts = line.split(/[,|–—-]/).map(p => p.trim())
          if (parts[0] && !titlePatterns[0].test(parts[0])) {
            result.name = parts[0]
          }
        } else {
          result.name = line
        }
        break
      }
    }
  }

  // Second pass: if we found a name, check if next line is a title at company
  if (result.name && !result.company) {
    const nameIndex = lines.findIndex(l => l === result.name)
    if (nameIndex >= 0 && nameIndex < lines.length - 1) {
      const nextLine = lines[nameIndex + 1]
      // Check if it's a title or company line
      if (titlePatterns[0].test(nextLine) || companyIndicators.some(p => p.test(nextLine))) {
        // Extract company from "Title at Company" or "Title, Company" pattern
        const atMatch = nextLine.match(/(?:at|@)\s+(.+)/i)
        const commaMatch = nextLine.match(/^.+?[,|]\s*(.+)/i)

        if (atMatch) {
          result.company = atMatch[1].trim()
        } else if (commaMatch && companyIndicators.some(p => p.test(commaMatch[1]))) {
          result.company = commaMatch[1].trim()
        } else if (companyIndicators.some(p => p.test(nextLine))) {
          // Just use the whole line as company
          let company = nextLine.replace(titlePatterns[0], '').replace(/^[,\s-–—|]+/, '').trim()
          if (company.length > 2) {
            result.company = company
          }
        }
      }
    }
  }

  return result
}
