import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/config/constants';

/**
 * Health Check Endpoint
 *
 * GET /api/v1/health
 *
 * Returns application status, version, and uptime.
 * Used by monitoring, load balancers, and CI pipelines.
 */
export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        status: 'healthy',
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV ?? 'development',
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
