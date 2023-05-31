/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@uploadjoy/react", "@uploadjoy/core"],
  experimental: {
    esmExternals: true,
  }
}

module.exports = nextConfig
