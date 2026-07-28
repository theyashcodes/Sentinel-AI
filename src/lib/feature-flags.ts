import { featureFlags, type FeatureFlagName } from '@/config/features';

/**
 * Feature Flag Evaluation
 *
 * Currently evaluates flags from static config + environment variable overrides.
 * Future: Add Redis-backed per-user/environment overrides.
 *
 * @example
 * import { isFeatureEnabled } from '@/lib/feature-flags';
 *
 * if (isFeatureEnabled('ENABLE_SCANNER')) {
 *   // Show scanner UI
 * }
 */
export function isFeatureEnabled(flagName: FeatureFlagName): boolean {
  const flag = featureFlags[flagName];

  if (!flag) {
    console.warn(`[FeatureFlags] Unknown flag: ${flagName}`);
    return false;
  }

  // Check environment variable override first
  if (flag.envKey) {
    const envValue = process.env[flag.envKey];
    if (envValue !== undefined) {
      return envValue === 'true' || envValue === '1';
    }
  }

  // Fall back to default value
  return flag.defaultValue;
}

/**
 * Get all feature flags and their current status.
 */
export function getAllFeatureFlags(): Record<FeatureFlagName, boolean> {
  const result = {} as Record<FeatureFlagName, boolean>;

  for (const key of Object.keys(featureFlags) as FeatureFlagName[]) {
    result[key] = isFeatureEnabled(key);
  }

  return result;
}
