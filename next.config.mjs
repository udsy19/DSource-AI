// Hosts allowed to serve images. Kept in sync with images.remotePatterns
// below so the CSP img-src matches what next/image will actually load.
const IMAGE_HOSTS = [
  "pub-132f3882c2074e84999a9ab982950552.r2.dev",
  "materialdepotimages.s3.ap-south-1.amazonaws.com",
  "www.ikea.com",
  "images.unsplash.com",
  "ashleyfurniture.scene7.com",
  "images.thdstatic.com",
  "www.nfm.com",
  "cdn-images.article.com",
  "assets.weimgs.com",
  "res.cloudinary.com",
  "assets.wfcdn.com",
  "cdn.roveconcepts.com",
  "target.scene7.com",
];

// Starter Content-Security-Policy. This is a pragmatic, report-friendly
// baseline: 'unsafe-inline' is permitted for scripts/styles because Next.js
// and Tailwind currently emit inline runtime/styles. TODO: tighten by moving
// to nonces/hashes and dropping 'unsafe-inline' / 'unsafe-eval'.
const CSP = [
  "default-src 'self'",
  `img-src 'self' data: blob: ${IMAGE_HOSTS.map((h) => `https://${h}`).join(" ")}`,
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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-132f3882c2074e84999a9ab982950552.r2.dev",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "materialdepotimages.s3.ap-south-1.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.ikea.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ashleyfurniture.scene7.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.thdstatic.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.nfm.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn-images.article.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.weimgs.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.wfcdn.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.roveconcepts.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "target.scene7.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
