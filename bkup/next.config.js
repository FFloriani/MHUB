/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['canvas'],
  },
  transpilePackages: ['react-pdf', 'pdfjs-dist'],
}

module.exports = nextConfig

