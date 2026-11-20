import type { NextConfig } from "next";

// Static export: the prototype is front-end only (mock data + localStorage),
// so it can be hosted on any static host (Vercel, Netlify, GitHub Pages).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
