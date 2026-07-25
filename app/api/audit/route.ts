import { NextRequest, NextResponse } from 'next/server';
import { auditUrl } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  // Extract client IP address for rate limiting
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

  // 1. Check Rate Limit (DDoS Protection)
  const rateLimit = checkRateLimit(ip, 10, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Rate limit exceeded. Too many audit requests. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': rateLimit.retryAfterSeconds.toString(),
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // 2. Parse Body Payload
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON payload. Expected { "url": "https://example.com" }' },
      { status: 400 }
    );
  }

  if (!body.url || typeof body.url !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid "url" parameter in request body.' },
      { status: 400 }
    );
  }

  // 3. Execute URL Audit
  const report = await auditUrl(body.url);

  return NextResponse.json(report, {
    status: report.success ? 200 : report.status && report.status >= 400 && report.status < 600 ? report.status : 400,
    headers: {
      'X-RateLimit-Limit': '10',
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    },
  });
}
