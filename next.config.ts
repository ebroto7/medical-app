import type { NextConfig } from "next";

// Validate environment variables at build time
// This will throw an error if any required env vars are missing
import "./src/lib/env";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "epsgadcvrzrwhqrckrey.supabase.co",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
