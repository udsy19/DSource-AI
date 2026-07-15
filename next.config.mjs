import { ALLOWED_IMAGE_HOSTS } from "./src/utils/image-hosts.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vendored Caslon TTFs are read via fs at runtime by the spec-sheet PDF
  // route — trace them into standalone/serverless output.
  outputFileTracingIncludes: {
    "/api/spec-pdf": ["./src/assets/fonts/*.ttf"],
  },
  images: {
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https",
      hostname,
      port: "",
      pathname: "/**",
    })),
  },
};

export default nextConfig;
