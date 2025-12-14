import type { MetadataRoute } from "next";

const baseUrl = "https://uxarchive.app";

const routes = ["", "/privacy", "/terms", "/refund-policy", "/patterns"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));
}
