/** @type {import('next').NextConfig} */
const nextConfig = {
  // Il frontend parla SEMPRE con la stessa origine (/api/...): questo
  // rewrite proxa verso il Gateway reale in locale. Niente CORS da
  // configurare sul backend, e il client API non conosce host diversi.
  async rewrites() {
    return [
      {
        // Solo i prefissi del backend (/api/v1/*): la route locale
        // /api/chat non deve mai finire al Gateway.
        source: '/api/v1/:path*',
        destination: process.env.AIOS_GATEWAY_URL
          ? `${process.env.AIOS_GATEWAY_URL}/api/v1/:path*`
          : 'http://localhost:3000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
