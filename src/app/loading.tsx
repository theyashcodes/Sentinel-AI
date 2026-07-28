/**
 * Global Loading State
 *
 * Shown during page transitions and data loading.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Animated gradient spinner */}
        <div className="relative h-10 w-10">
          <div
            className="absolute inset-0 animate-spin rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent, var(--accent-blue), transparent)',
              maskImage:
                'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
              WebkitMaskImage:
                'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
            }}
          />
        </div>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Loading...
        </p>
      </div>
    </div>
  );
}
