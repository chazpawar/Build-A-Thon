/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://lecturelite-api.vercel.app',
    NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL || 'https://lecturelite-api.vercel.app/auth'
  },
  
  // Add async redirects if needed
  async redirects() {
    return [
      {
        source: '/auth/google',
        destination: process.env.NEXT_PUBLIC_AUTH_URL ? `${process.env.NEXT_PUBLIC_AUTH_URL}/google` : 'https://lecturelite-api.vercel.app/auth/google',
        permanent: false,
      },
    ];
  },
  
  // Explicitly set image domains for Next.js Image component
  images: {
    domains: ['lecturelite-api.vercel.app', 'lh3.googleusercontent.com'],
  },
};

export default nextConfig;
