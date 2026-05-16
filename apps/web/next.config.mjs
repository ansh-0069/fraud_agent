/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    ML_SERVICE_URL: process.env.ML_SERVICE_URL || "http://127.0.0.1:8000",
  },
};

export default nextConfig;
