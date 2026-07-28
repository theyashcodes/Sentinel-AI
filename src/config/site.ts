/**
 * Site Configuration
 *
 * Central metadata for the Sentinel AI platform.
 * Used in layouts, metadata, Open Graph tags, etc.
 */

export const siteConfig = {
  name: 'Sentinel AI',
  description: 'AI-Powered Cyber Threat Intelligence for India',
  tagline: 'Detect. Analyze. Protect.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ogImage: '/og-image.png',
  creator: 'Sentinel AI Team',
  keywords: [
    'cybersecurity',
    'threat intelligence',
    'AI',
    'scam detection',
    'phishing',
    'India',
    'cyber threat',
    'URL scanner',
    'message scanner',
  ],
  links: {
    github: 'https://github.com/sentinel-ai',
    twitter: 'https://twitter.com/sentinel_ai',
  },
} as const;

export type SiteConfig = typeof siteConfig;
