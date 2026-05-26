import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com", // For Google Auth Avatars
      },
      {
        protocol: "https",
        hostname: "*.playroomkit.com", // Playroom native fallback domains
      },
    ],
  },
};

export default nextConfig;
