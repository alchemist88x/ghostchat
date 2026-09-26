import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GhostChat — Anonymous Temporary Messaging",
    short_name: "GhostChat",
    description: "Talk privately without accounts. Conversations automatically vanish in 3 days.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0c10",
    theme_color: "#0f172a",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
