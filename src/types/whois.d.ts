declare module 'whois' {
  export function lookup(
    domain: string,
    options: Record<string, unknown> | ((err: Error | null, data: string) => void),
    callback?: (err: Error | null, data: string) => void
  ): void;
}
