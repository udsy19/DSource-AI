/** @type {import('next').NextConfig} */
const nextConfig = {
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
