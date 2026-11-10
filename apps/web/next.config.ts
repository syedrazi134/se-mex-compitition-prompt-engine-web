import type { NextConfig } from 'next';

const mediaHosts = (process.env.MEDIA_IMAGE_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      ...mediaHosts.map((hostname) => ({ protocol: 'https' as const, hostname })),
    ],
  },
};

export default nextConfig;
