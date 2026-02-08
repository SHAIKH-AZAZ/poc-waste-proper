import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: true
  },

  /**
   * Explicitly use Webpack
   * (required because Next.js 16 defaults to Turbopack)
   */
  webpack: (config, { isServer }) => {
    // Required for Web Workers / WASM / pdf.js / monaco-editor
    if (!isServer) {
      config.output.globalObject = "self";
    }

    return config;
  }
};

export default nextConfig;
