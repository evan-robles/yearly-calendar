/** @type {import('next').NextConfig} */

// Deployed to GitHub Pages as a project site at
// https://evan-robles.github.io/yearly-calendar/
// so the app is served from the "/yearly-calendar" subpath. basePath and
// assetPrefix make all internal links and static assets resolve under it.
// `output: "export"` produces a fully static site in `out/` (no Node server),
// which is what GitHub Pages serves. `images.unoptimized` is required because
// the default Next image optimizer needs a server.
const repo = "yearly-calendar";
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "export",
  basePath: isProd ? `/${repo}` : "",
  assetPrefix: isProd ? `/${repo}/` : "",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
