/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@mind/shared"],
  experimental: {
    serverComponentsExternalPackages: ["pg", "@mind/db"],
  },
};
export default nextConfig;
