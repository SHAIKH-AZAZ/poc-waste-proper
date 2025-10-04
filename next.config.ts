import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: true
  },
  webpack: (config, { isServer }) => {
    // Enable Web Workers support
    if (!isServer) {
      config.output.globalObject = 'self';
    }
    
    return config;
  },
};

export default nextConfig;
