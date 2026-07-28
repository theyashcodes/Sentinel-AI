import { Inngest } from 'inngest';

/**
 * Inngest Client
 *
 * Serverless queue for background job processing.
 * Functions are registered in src/app/api/inngest/route.ts
 *
 * @see https://www.inngest.com/docs
 */
export const inngest = new Inngest({
  id: 'sentinel-ai',
  name: 'Sentinel AI',
});
