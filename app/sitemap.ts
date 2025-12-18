import type { MetadataRoute } from "next";

const baseUrl = "https://www.uxarchive.app";

const routes = ["", "/privacy", "/terms", "/refund-policy", "/share/r"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));
}
