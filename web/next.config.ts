import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.airtableusercontent.com" },
      { protocol: "https", hostname: "dl.airtable.com" },
      { protocol: "https", hostname: "replicate.delivery" },
    ],
  },
};

export default nextConfig;
