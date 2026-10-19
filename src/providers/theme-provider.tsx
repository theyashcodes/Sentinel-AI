'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * Theme Provider
 *
 * Wraps next-themes for dark/light mode support.
 * Default: dark mode (Sentinel AI Void ground).
 * Day mode: Quantum Daylight with responsive particle flux.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="sentinel-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
