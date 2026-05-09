import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/portfolios",
        destination: "/database",
        permanent: true,
      },
      {
        source: "/timeline-risk/:path*",
        destination: "/database",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
