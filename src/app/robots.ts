import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chris-fact-radar.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/status", "/lead-magnets/anti-heisshunger", "/lead-magnets/anti-heisshunger/check"],
      disallow: ["/api/", "/studio"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
