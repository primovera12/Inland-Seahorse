'use client'

import Image from 'next/image'
import { Shield, BarChart3, Settings } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Left Side: Cinematic Hero */}
      <div className="relative hidden w-1/2 lg:flex flex-col items-center justify-center p-12 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Background pattern */}
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />

        {/* Content */}
        <div className="relative z-20 max-w-lg text-center lg:text-left">
          {/* Logo and branding */}
          <div className="mb-8 flex items-center justify-center lg:justify-start gap-4">
            <div className="relative h-14 w-14 rounded-xl bg-white/10 backdrop-blur-sm p-2 ring-1 ring-white/20">
              <Image
                src="/logo-white.png"
                alt="Seahorse Express Logo"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">Seahorse Express</span>
          </div>

          <h1 className="text-white text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-6">
            Streamline Your<br />Transport Operations
          </h1>

          <p className="text-white/70 text-lg font-medium leading-relaxed mb-8">
            Professional rate management for dismantling and inland transportation.
            Enterprise-grade control at your fingertips.
          </p>

          {/* Feature icons */}
          <div className="flex gap-4 justify-center lg:justify-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/10">
              <Shield className="h-5 w-5 text-white/80" />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/10">
              <BarChart3 className="h-5 w-5 text-white/80" />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/10">
              <Settings className="h-5 w-5 text-white/80" />
            </div>
          </div>
        </div>

        {/* Bottom decorative element */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent z-10" />
      </div>

      {/* Right Side: Clean Form Panel */}
      <div className="flex w-full flex-col items-center justify-center bg-muted/30 dark:bg-background px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-[420px]">
          {/* Mobile Logo */}
          <div className="mb-10 flex flex-col items-center lg:hidden">
            <div className="mb-4 relative h-16 w-16 rounded-xl bg-primary shadow-lg shadow-primary/20 p-2">
              <Image
                src="/logo-white.png"
                alt="Seahorse Express Logo"
                fill
                className="object-contain p-2"
                priority
              />
            </div>
            <h2 className="text-xl font-bold text-foreground">Seahorse Express</h2>
          </div>

          {children}

          {/* Footer Links */}
          <div className="mt-8 flex justify-center gap-6 text-xs font-medium text-muted-foreground">
            <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  )
}
