/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@mind/shared"],
  experimental: {
    serverComponentsExternalPackages: ["pg", "@mind/db"],
  },
  typescript: {
    // Typecheck is verified locally and in CI; saves ~500MB RAM during Render build
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
