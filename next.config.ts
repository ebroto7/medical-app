import type { NextConfig } from "next";

// Validate environment variables at build time
// This will throw an error if any required env vars are missing
import "./src/lib/env";

const nextConfig: NextConfig = {
  // Prevent bundling of server-side libraries that use native modules or dynamic requires
  serverExternalPackages: ["pino", "pino-pretty"],

  // Increase body size limit for GPX file uploads (up to 20MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb'
    }
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname,
        pathname: "/storage/**",
      },
    ],
  },

  // Security headers
  async headers() {
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' https://${supabaseUrl.hostname} data: blob:`,
              "font-src 'self' data:",
              `connect-src 'self' https://${supabaseUrl.hostname} wss://${supabaseUrl.hostname} ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:*`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ];
  }
};

export default nextConfig;
