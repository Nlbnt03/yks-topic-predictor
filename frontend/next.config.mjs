/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages için output: 'export' değil, normal SSR kullan
  // API istekleri doğrudan Workers URL'e gider
};

export default nextConfig;
