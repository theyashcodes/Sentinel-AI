'use client';

import Link from 'next/link';

/**
 * Custom 404 Page
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="animate-fade-in-up text-center">
        {/* Glowing 404 */}
        <h1
          className="text-gradient mb-4 text-8xl font-black tracking-tighter"
          style={{ fontSize: 'clamp(4rem, 15vw, 10rem)' }}
        >
          404
        </h1>

        <h2 className="mb-2 text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
          Page Not Found
        </h2>

        <p className="mx-auto mb-8 max-w-md" style={{ color: 'var(--muted-foreground)' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <Link
          href="/"
          className="bg-gradient-accent inline-flex items-center rounded-lg px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
