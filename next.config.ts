
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Enhanced security: Enable strict type checking and linting
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src', 'functions'] // Explicitly specify directories to lint
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // This is the fix for the cross-origin error in the development environment.
  allowedDevOrigins: ["https://*.cluster-oayqgyglpfgseqclbygurw4xd4.cloudworkstations.dev"],
};

export default nextConfig;
