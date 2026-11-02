/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@mind/shared"],
  experimental: {
    serverComponentsExternalPackages: ["pg", "@mind/db"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
