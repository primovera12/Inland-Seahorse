'use client'

import { useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'

export function DynamicFavicon() {
  const { data: settings } = trpc.settings.get.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!settings?.favicon_url) return

    // Update or create favicon link element
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')

    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }

    link.href = settings.favicon_url
    link.type = 'image/x-icon'

    // Also update apple-touch-icon if present
    let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
    if (!appleIcon) {
      appleIcon = document.createElement('link')
      appleIcon.rel = 'apple-touch-icon'
      document.head.appendChild(appleIcon)
    }
    appleIcon.href = settings.favicon_url
  }, [settings?.favicon_url])

  return null
}
