import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Saída standalone para empacotar no Docker com imagem pequena.
  output: "standalone",
};

export default nextConfig;
