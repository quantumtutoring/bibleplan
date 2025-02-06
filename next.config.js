/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
      return [
        {
          source: "/nasb",
          destination: "/",
          permanent: true, // true for 308 permanent redirect, false for 307 temporary redirect
        },
      ];
    },
  };
  
  module.exports = nextConfig;
  