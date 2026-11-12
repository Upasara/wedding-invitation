import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: https://images.unsplash.com https://firebasestorage.googleapis.com https://storage.googleapis.com${isDev ? ' http://127.0.0.1:9199 http://localhost:9199' : ''}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  `media-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com${isDev ? ' http://127.0.0.1:9199 http://localhost:9199' : ''}`,
  "frame-src 'self' https://challenges.cloudflare.com",
  `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://challenges.cloudflare.com${isDev ? ' http://127.0.0.1:9099 http://localhost:9099 http://127.0.0.1:8080 http://localhost:8080 http://127.0.0.1:9199 http://localhost:9199' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

