import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'nsqcttbciocfumhvdnod.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Configure for Puppeteer/Chromium serverless
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
};

export default nextConfig;
