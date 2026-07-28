import { serve } from 'inngest/next';
import { inngest } from '@/lib/queue';

/**
 * Inngest Webhook Handler
 *
 * This route serves the Inngest SDK and registers all background functions.
 * Add function references to the `functions` array as they are created.
 *
 * @see https://www.inngest.com/docs/frameworks/nextjs
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Register Inngest functions here as they are created
    // Example: scanUrlFunction, aggregateThreatIntel, etc.
  ],
});
