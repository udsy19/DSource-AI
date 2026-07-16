import { ALLOWED_IMAGE_HOSTS } from "./src/utils/image-hosts.mjs";

// Starter Content-Security-Policy. This is a pragmatic, report-friendly
// baseline: 'unsafe-inline' is permitted for scripts/styles because Next.js
// and Tailwind currently emit inline runtime/styles. TODO: tighten by moving
// to nonces/hashes and dropping 'unsafe-inline' / 'unsafe-eval'.
// img-src includes data:/blob: (canvas exports, data-URI previews) plus the
// shared image-host whitelist so CSP matches what next/image will load.
const CSP = [
  "default-src 'self'",
  `img-src 'self' data: blob: ${ALLOWED_IMAGE_HOSTS.map((h) => `https://${h}`).join(" ")}`,
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Vendored Caslon TTFs are read via fs at runtime by the spec-sheet PDF
  // route — trace them into standalone/serverless output.
  outputFileTracingIncludes: {
    "/api/spec-pdf": ["./src/assets/fonts/*.ttf"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
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
