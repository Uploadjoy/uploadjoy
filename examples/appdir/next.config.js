/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@uploadjoy/core", "@uploadjoy/react"],
  experimental: {
    esmExternals: true,
  },
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
