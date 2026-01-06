import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Equipment Dismantling Rates',
  description: 'Internal rate management tool for equipment dismantling',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
