import type { NextConfig } from "next";

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oahsgubjfguqtsvieqrw.supabase.co");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
