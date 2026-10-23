import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sentinel-ai-omega-two.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/auth/sign-in", "/auth/sign-up"],
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
