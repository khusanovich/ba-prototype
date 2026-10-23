import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverActions: {
    bodySizeLimit: '4.5mb',
  },
};

export default nextConfig;
