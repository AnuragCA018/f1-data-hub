/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — produces an `out/` folder you can drag to Netlify Drop.
  // API calls use NEXT_PUBLIC_API_URL (must be set to your live backend URL).
  output: "export",

  httpAgentOptions: {
    keepAlive: false,
  },

  images: {
    // Image optimisation requires a server; disable it for static export.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "media.formula1.com" },
      { protocol: "https", hostname: "www.formula1.com" },
    ],
  },
};

module.exports = nextConfig;

module.exports = nextConfig;
