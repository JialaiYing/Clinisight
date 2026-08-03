import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN hosts in dev so phones/other machines can load the app with HMR.
  allowedDevOrigins: [
    "10.0.0.4",
    "10.*.*.*",
    "192.168.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.2*.*.*",
    "172.30.*.*",
    "172.31.*.*",
  ],
};

export default nextConfig;
