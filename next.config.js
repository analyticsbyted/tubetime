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
  // Experimental features removed - esmExternals is not recommended
};

export default nextConfig;

