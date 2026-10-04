/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@mind/shared", "@mind/db"],
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
};
export default nextConfig;
