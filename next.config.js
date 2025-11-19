/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use webpack instead of Turbopack for native module support (lightningcss)
  webpack: (config, { isServer }) => {
    // Handle native modules - exclude Node.js built-ins from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  // Enable experimental features if needed
  experimental: {
    // Add any experimental features here
  },
  // Environment variables that should be available on the server
  env: {
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  },
};

export default nextConfig;

