/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@team/shell"],
  env: {
    // NextAuth requires a valid URL at build time; fallback for static generation
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
  },
};

module.exports = nextConfig;
