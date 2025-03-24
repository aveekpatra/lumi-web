/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize font loading
  optimizeFonts: true,
  // Enable React strict mode
  reactStrictMode: true,
  // Configure webpack to handle font loading
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
