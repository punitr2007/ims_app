/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'tesseract.js',
    'cheerio',
    'tough-cookie',
    'axios-cookiejar-support',
  ],
};

export default nextConfig;
