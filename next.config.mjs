/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/generate-profile": ["./public/logo.png"],
  },
};

export default nextConfig;
