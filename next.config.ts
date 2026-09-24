import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'overlay-account-playoff.ngrok-free.app',
    'overlay-account-playoff.ngrok-free.dev',
    // LAN address, for testing on a phone over the same Wi-Fi.
    '172.17.213.102',
  ],
};

export default nextConfig;
