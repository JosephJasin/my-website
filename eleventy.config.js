export default function (eleventyConfig) {
  // Installers need these non-personal files without a Cloudflare Access session.
  // Keep the app, equipment assets, and progress API under the private /firstrep/ path.
  eleventyConfig.addPassthroughCopy({
    "firstrep/public/manifest.webmanifest": "firstrep-install/manifest.webmanifest",
    "firstrep/public/icon-192.png": "firstrep-install/icon-192.png",
    "firstrep/public/icon-512.png": "firstrep-install/icon-512.png",
  });

  return {
    dir: {
      input: "src",
      output: "_site",
    },
  };
};
