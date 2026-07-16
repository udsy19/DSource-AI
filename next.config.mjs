import { ALLOWED_IMAGE_HOSTS } from "./src/utils/image-hosts.mjs";

// Starter Content-Security-Policy. This is a pragmatic, report-friendly
// baseline: 'unsafe-inline' is permitted for scripts/styles because Next.js
// and Tailwind currently emit inline runtime/styles. TODO: tighten by moving
// to nonces/hashes and dropping 'unsafe-inline' / 'unsafe-eval'.
//
// img-src allows any https image (plus data:/blob: for canvas exports and
// data-URI previews). The marketplace renders product photos from 161k
// records across UNBOUNDED supplier CDNs — an allowlist can never cover them,
// which is why those cards use a plain <img>. Images cannot execute code, so
// this keeps the XSS-relevant directives (script-src, object-src, base-uri,
// frame-ancestors) strict while letting third-party product images load. It
// mirrors the already-broad connect-src 'self' https:.
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob: https:",
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
  // Vendored Caslon TTFs + the brand mark are read via fs at runtime by the
  // spec-sheet PDF route — trace them into standalone/serverless output.
  outputFileTracingIncludes: {
    "/api/spec-pdf": ["./src/assets/fonts/*.ttf", "./src/assets/brand/*.png"],
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
