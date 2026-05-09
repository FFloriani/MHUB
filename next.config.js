/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async redirects() {
    return [{ source: '/api-docs', destination: '/docs/guia-ia', permanent: true }]
  },
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

