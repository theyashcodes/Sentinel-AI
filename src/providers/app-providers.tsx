'use client';

import type { ReactNode } from 'react';

import { ThemeProvider } from '@/providers/theme-provider';
import { QueryProvider } from '@/providers/query-provider';

/**
 * App Providers
 *
 * Composes all client-side providers into a single wrapper.
 * Added to the root layout to avoid prop drilling.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}
