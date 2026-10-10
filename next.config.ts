import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Increase body size limit for PDF uploads
    // Note: Vercel Hobby plan has a hard limit of 4.5 MB
    serverActions: {
      bodySizeLimit: '4.5mb',
    },
  },
};

export default nextConfig;
