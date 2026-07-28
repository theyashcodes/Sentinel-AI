import * as whois from 'whois';
import { IWhoisProvider, WhoisData } from './base';
import { cacheGet, cacheSet } from '@/lib/cache';

export class NativeWhoisProvider implements IWhoisProvider {
  name = 'NATIVE_WHOIS';

  async lookup(domain: string): Promise<WhoisData | null> {
    const cacheKey = `whois:${domain}`;
    
    // Check cache first
    try {
      const cached = await cacheGet(cacheKey);
      if (cached) return cached as WhoisData;
    } catch {
      // Ignore cache error and proceed
    }

    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout;
      
      const timeoutPromise = new Promise<null>((res) => {
        timeoutId = setTimeout(() => {
          console.warn(`WHOIS timeout for domain: ${domain}`);
          res(null);
        }, 5000);
      });

      const whoisPromise = new Promise<WhoisData | null>((res) => {
        whois.lookup(domain, (err: Error | null, data: string) => {
          if (err || !data) {
            console.error(`WHOIS error for domain ${domain}:`, err);
            res(null);
            return;
          }

          const parsed = this.parseRawData(data);
          res(parsed);
        });
      });

      Promise.race([whoisPromise, timeoutPromise]).then(async (result) => {
        clearTimeout(timeoutId);
        
        if (result) {
          try {
            await cacheSet(cacheKey, result, 86400); // Cache for 24 hours
          } catch {
            // Ignore cache set error
          }
        }
        resolve(result);
      });
    });
  }

  private parseRawData(raw: string): WhoisData {
    const creationRegex = /(?:creation date|created|registration time|registered on):\s*([^\r\n]+)/i;
    const registrarRegex = /registrar:\s*([^\r\n]+)/i;
    
    const creationMatch = raw.match(creationRegex);
    const registrarMatch = raw.match(registrarRegex);

    let ageDays: number | undefined;
    let creationDate: string | undefined;

    if (creationMatch && creationMatch[1]) {
      creationDate = creationMatch[1].trim();
      const date = new Date(creationDate);
      if (!isNaN(date.getTime())) {
        const diffTime = Math.abs(new Date().getTime() - date.getTime());
        ageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    return {
      raw: raw.substring(0, 1000), // Prevent massive payloads
      ageDays,
      creationDate,
      registrar: registrarMatch ? registrarMatch[1]?.trim() : undefined,
    };
  }
}
