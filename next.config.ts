import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Izinkan akses dev dari LAN (HP / device lain). Tambahkan IP lain jika perlu. */
  allowedDevOrigins: ["192.168.18.155"],
};

export default nextConfig;
