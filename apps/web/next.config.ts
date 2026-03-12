import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@plantao-radar/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
