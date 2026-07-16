/**
 * Allowed external image hosts — single source of truth shared by
 * next.config.mjs (next/image remotePatterns) and the visualizer API
 * (SSRF whitelist when downloading product images server-side).
 *
 * .mjs so next.config.mjs (native ESM) can import it directly.
 */
export const ALLOWED_IMAGE_HOSTS = [
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

export const isAllowedImageHost = (url) => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && ALLOWED_IMAGE_HOSTS.includes(hostname);
  } catch {
    return false;
  }
};
