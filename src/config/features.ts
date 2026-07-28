/**
 * Feature Flag Definitions
 *
 * Each flag has:
 * - name: Typed string literal (the key)
 * - defaultValue: Default state (typically false for unbuilt features)
 * - description: Human-readable explanation
 * - envKey: Optional environment variable override
 */

export interface FeatureFlag {
  defaultValue: boolean;
  description: string;
  envKey?: string;
}

export const featureFlags = {
  ENABLE_SCANNER: {
    defaultValue: false,
    description: 'Enable the message/URL/QR/screenshot scanner',
    envKey: 'FEATURE_ENABLE_SCANNER',
  },
  ENABLE_COMMUNITY: {
    defaultValue: false,
    description: 'Enable the community reports and voting feature',
    envKey: 'FEATURE_ENABLE_COMMUNITY',
  },
  ENABLE_ACADEMY: {
    defaultValue: false,
    description: 'Enable the Cyber Academy courses and quizzes',
    envKey: 'FEATURE_ENABLE_ACADEMY',
  },
  ENABLE_ADMIN: {
    defaultValue: false,
    description: 'Enable the admin dashboard and moderation tools',
    envKey: 'FEATURE_ENABLE_ADMIN',
  },
  ENABLE_ANALYTICS: {
    defaultValue: false,
    description: 'Enable the analytics dashboard',
    envKey: 'FEATURE_ENABLE_ANALYTICS',
  },
  ENABLE_NOTIFICATIONS: {
    defaultValue: false,
    description: 'Enable the notification system',
    envKey: 'FEATURE_ENABLE_NOTIFICATIONS',
  },
} as const satisfies Record<string, FeatureFlag>;

export type FeatureFlagName = keyof typeof featureFlags;
