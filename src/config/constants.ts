/**
 * Application Constants
 *
 * App-wide constant values used across modules.
 */

/** Application version */
export const APP_VERSION = '0.1.0';

/** API version prefix */
export const API_VERSION = 'v1';

/** Default pagination page size */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum pagination page size */
export const MAX_PAGE_SIZE = 100;

/** Maximum file upload size (10MB) */
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

/** Supported image MIME types */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/** Threat risk levels */
export const RISK_LEVELS = ['safe', 'low', 'medium', 'high', 'critical'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Scan types */
export const SCAN_TYPES = ['message', 'url', 'qr', 'screenshot'] as const;
export type ScanType = (typeof SCAN_TYPES)[number];

/** User roles */
export const USER_ROLES = ['user', 'moderator', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];
