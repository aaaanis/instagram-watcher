/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Set output directory for production build
  distDir: '.next',
  // Environment variables
  env: {
    // Add any environment variables you want to expose to the client here
  },
  // API endpoints
  async rewrites() {
    return [
      // Example rewrite for API
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 