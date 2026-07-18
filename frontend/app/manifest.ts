import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: "Auctus Heritage",
    description: siteConfig.description,
    start_url: "/en",
    scope: "/",
    display: "standalone",
    background_color: "#fffdf8",
    theme_color: "#171717",
    icons: [
      {
        src: siteConfig.faviconPath,
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: siteConfig.appleTouchIconPath,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
