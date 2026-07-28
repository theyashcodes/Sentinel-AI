import { isFeatureEnabled } from '@/lib/feature-flags';
import type { FeatureFlagName } from '@/config/features';

/**
 * Feature Flag Evaluation
 *
 * Checks if a feature is enabled based on config definitions.
 * Currently config-based only. Can be extended with Redis-backed
 * per-user/environment overrides in the future.
 *
 * @example
 * if (isFeatureEnabled('ENABLE_SCANNER')) {
 *   // Show scanner UI
 * }
 */
export { isFeatureEnabled };
export type { FeatureFlagName };
