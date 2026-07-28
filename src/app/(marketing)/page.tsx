import type { Metadata } from 'next';
import Link from 'next/link';

import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.description}`,
  description:
    'Sentinel AI is an advanced AI-powered cybersecurity platform that detects phishing, scams, and cyber threats targeting Indian users. Scan messages, URLs, QR codes, and screenshots instantly.',
};

/**
 * Landing Page
 *
 * Visually striking hero with animated gradient orbs,
 * gradient wordmark, and tagline. No navigation or business logic.
 */
export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* ──── Animated Background Orbs ──────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Primary blue orb */}
        <div
          className="animate-pulse-glow absolute rounded-full blur-3xl"
          style={{
            width: '600px',
            height: '600px',
            top: '10%',
            left: '15%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          }}
        />

        {/* Secondary purple orb */}
        <div
          className="animate-pulse-glow absolute rounded-full blur-3xl"
          style={{
            width: '500px',
            height: '500px',
            bottom: '10%',
            right: '10%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
            animationDelay: '1.5s',
          }}
        />

        {/* Tertiary accent orb */}
        <div
          className="animate-float absolute rounded-full blur-2xl"
          style={{
            width: '300px',
            height: '300px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(99, 111, 246, 0.08) 0%, transparent 70%)',
          }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ──── Main Content ─────────────────────────────── */}
      <div className="animate-fade-in-up relative z-10 text-center">
        {/* Status badge */}
        <div
          className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
          style={{
            borderColor: 'var(--border)',
            background: 'rgba(255, 255, 255, 0.03)',
          }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: 'var(--success)' }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: 'var(--success)' }}
            />
          </span>
          <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
            Building something extraordinary
          </span>
        </div>

        {/* Wordmark */}
        <h1
          className="text-gradient mb-6 font-black tracking-tighter"
          style={{
            fontSize: 'clamp(3rem, 10vw, 7rem)',
            lineHeight: 0.95,
          }}
        >
          SENTINEL
          <br />
          <span style={{ letterSpacing: '0.05em' }}>AI</span>
        </h1>

        {/* Tagline */}
        <p
          className="mx-auto mb-4 max-w-xl text-lg font-medium md:text-xl"
          style={{ color: 'var(--foreground-secondary)' }}
        >
          AI-Powered Cyber Threat Intelligence for India
        </p>

        {/* Subtext */}
        <p className="mx-auto mb-10 max-w-lg text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Detect phishing, analyze scams, and protect against cyber threats with advanced AI —
          before they reach you.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="group relative overflow-hidden rounded-lg px-8 py-3 text-sm font-semibold text-white transition-all duration-300 hover:shadow-lg"
            style={{
              background: 'var(--accent-gradient)',
            }}
          >
            <span className="relative z-10">Get Early Access</span>
            <div
              className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background: 'var(--accent-gradient-hover)',
              }}
            />
          </Link>

          <button
            className="rounded-lg border px-8 py-3 text-sm font-semibold transition-all duration-300"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--foreground-secondary)',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            Learn More
          </button>
        </div>

        {/* Feature pills */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
          {[
            'Message Scanner',
            'URL Analyzer',
            'QR Code Detection',
            'Screenshot OCR',
            'Threat Intelligence',
            'Community Reports',
          ].map((feature) => (
            <span
              key={feature}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-200"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--muted-foreground)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* ──── Bottom Gradient Fade ──────────────────────── */}
      <div
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-32"
        style={{
          background: 'linear-gradient(to top, var(--background) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
