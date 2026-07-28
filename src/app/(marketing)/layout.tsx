import type { ReactNode } from 'react';

/**
 * Marketing Layout
 *
 * Shell for public pages (landing, about, pricing, etc.)
 * No authentication required.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation and footer will be added here */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
