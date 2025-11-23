import type { MetadataRoute } from "next";

const baseUrl = "https://uxarchive.app";

const routes = [""];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));
}
