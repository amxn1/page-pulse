/**
 * In-Memory Sliding Window Rate Limiter & SSRF Security Guard
 * Mitigates DDoS request floods and prevents SSRF / Loopback amplification attacks.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const ipMap = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 5 minutes
setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [ip, record] of ipMap.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      ipMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(ip: string, limit = 10, windowMs = 60 * 1000): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  const record = ipMap.get(ip) || { timestamps: [] };

  // Remove timestamps outside current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const retryAfterSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  record.timestamps.push(now);
  ipMap.set(ip, record);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: limit - record.timestamps.length,
  };
}

/**
 * SSRF & Private Network DDoS Protection Guard
 * Rejects requests to internal IP addresses or loopback endpoints.
 */
export function isInternalOrPrivateUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();

    // Check protocol
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return true;
    }

    // Block localhost and standard loopback hostnames
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return true;
    }

    // Block AWS / GCP / Azure Cloud Metadata IP
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
      return true;
    }

    // Regex for private IPv4 ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x)
    const privateIpRegex = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)/;
    if (privateIpRegex.test(hostname)) {
      return true;
    }

    return false;
  } catch {
    return true; // Treat invalid URLs as prohibited
  }
}
