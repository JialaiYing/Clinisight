import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js blocks cross-origin dev requests (HMR, RSC fetches) by default.
  // Without this, loading the app from another device on the LAN (e.g.
  // http://10.0.0.4:3000) compiles fine but never fully hydrates, so clicks
  // silently do nothing. Wildcards cover common private ranges so this
  // keeps working if the machine's LAN IP changes (DHCP).
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
