import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@plantao-radar/shared'],
};

export default nextConfig;
