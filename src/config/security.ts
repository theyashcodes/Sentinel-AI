/**
 * Security Configuration
 *
 * Centralized security constants and CSP directives.
 * Security headers are applied in next.config.ts.
 * This file is for application-level security config.
 */

/** Allowed origins for CORS */
export const ALLOWED_ORIGINS = [process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'];

/** Session configuration */
export const SESSION_CONFIG = {
  /** Session cookie name */
  cookieName: 'sentinel-session',
  /** Session duration in seconds (24 hours) */
  maxAge: 86400,
  /** HttpOnly flag */
  httpOnly: true,
  /** Secure flag (HTTPS only in production) */
  secure: process.env.NODE_ENV === 'production',
  /** SameSite attribute */
  sameSite: 'lax' as const,
} as const;

/** Password requirements */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
} as const;
