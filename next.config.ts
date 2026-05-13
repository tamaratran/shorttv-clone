import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/shorttv-videos.firebasestorage.app/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "akamai-static.shorttv.live",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
