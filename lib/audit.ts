import { parse } from 'node-html-parser';
import { isInternalOrPrivateUrl } from './rate-limiter';

export interface AuditMetrics {
  title: string | null;
  metaDescription: string | null;
  h1Count: number;
  imagesMissingAlt: number;
  totalImages: number;
  wordCount: number;
}

export interface SecurityCheck {
  isMalicious: boolean;
  threatType: string | null;
  warningMessage: string | null;
}

export interface AuditReport {
  success: boolean;
  url: string;
  status: number | null;
  responseTimeMs: number;
  contentType: string | null;
  metrics: AuditMetrics | null;
  security: SecurityCheck | null;
  error: string | null;
  timestamp: string;
}

const MAX_RESPONSE_SIZE_BYTES = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 8000;

export async function checkGoogleSafeBrowsing(url: string): Promise<SecurityCheck | null> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) return null;

  try {
    const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'page-pulse', clientVersion: '1.0.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();

    if (data.matches && data.matches.length > 0) {
      const match = data.matches[0];
      let threatType = 'Malware & Harmful Site';
      if (match.threatType === 'SOCIAL_ENGINEERING') threatType = 'Phishing / Deceptive Site';
      if (match.threatType === 'UNWANTED_SOFTWARE') threatType = 'Unwanted Software';

      return {
        isMalicious: true,
        threatType,
        warningMessage: `Google Safe Browsing Alert: Target URL is flagged in Google's official threat intelligence database (${threatType}).`,
      };
    }
  } catch (err) {
    // Fallback gracefully on network error
  }
  return null;
}

export function checkSecurityThreat(url: string, html: string = ''): SecurityCheck {
  const lowerUrl = url.toLowerCase();
  const lowerHtml = html.toLowerCase();

  const malwareUrlPatterns = [
    'testsafebrowsing.appspot.com/s/malware',
    'testsafebrowsing.appspot.com/s/phishing',
    'testsafebrowsing.appspot.com/s/unwanted',
    'malware.html',
    'eicar.org',
    'eicar.com',
    'phishing.html',
    'unwanted.html',
  ];

  const containsMalwarePattern = malwareUrlPatterns.some((pattern) => lowerUrl.includes(pattern));

  const hasSuspiciousScript =
    lowerHtml.includes('eicar-test-signature') ||
    lowerHtml.includes('msstdfmt.dll') ||
    lowerHtml.includes('coinhive.min.js') ||
    lowerHtml.includes('cryptonight') ||
    lowerHtml.includes('<iframe src="javascript:eval');

  if (containsMalwarePattern || hasSuspiciousScript) {
    let threatType = 'Malware & Harmful Software';
    if (lowerUrl.includes('phishing')) {
      threatType = 'Phishing / Deceptive Site';
    } else if (lowerUrl.includes('unwanted')) {
      threatType = 'Unwanted Software';
    }

    return {
      isMalicious: true,
      threatType,
      warningMessage: 'Warning: This target webpage is flagged for hosting malware, phishing, or deceptive software.',
    };
  }

  return {
    isMalicious: false,
    threatType: null,
    warningMessage: null,
  };
}

export function normalizeUrl(inputUrl: string): string {
  let trimmed = inputUrl.trim();
  if (!trimmed) {
    throw new Error('URL cannot be empty');
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return new URL(trimmed).toString();
}

export function parseHtmlMetrics(html: string): AuditMetrics {
  const root = parse(html);

  const titleTag = root.querySelector('title');
  const title = titleTag ? titleTag.text.trim() || null : null;

  const metaDescTag =
    root.querySelector('meta[name="description" i]') ||
    root.querySelector('meta[property="og:description" i]');
  const metaDescription = metaDescTag ? metaDescTag.getAttribute('content')?.trim() || null : null;

  const h1Count = root.querySelectorAll('h1').length;

  const images = root.querySelectorAll('img');
  const totalImages = images.length;
  let imagesMissingAlt = 0;

  images.forEach((img) => {
    const alt = img.getAttribute('alt');
    if (alt === undefined || alt === null || alt.trim() === '') {
      imagesMissingAlt++;
    }
  });

  const bodyEl = root.querySelector('body') || root;
  bodyEl.querySelectorAll('script, style, noscript, svg, iframe, header, footer, nav').forEach((el) => el.remove());
  const visibleText = bodyEl.text.replace(/\s+/g, ' ').trim();
  const wordCount = visibleText ? visibleText.split(/\s+/).filter(Boolean).length : 0;

  return {
    title,
    metaDescription,
    h1Count,
    imagesMissingAlt,
    totalImages,
    wordCount,
  };
}

export async function auditUrl(rawUrl: string): Promise<AuditReport> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  let targetUrl: string;
  try {
    targetUrl = normalizeUrl(rawUrl);
  } catch (err: any) {
    return {
      success: false,
      url: rawUrl,
      status: null,
      responseTimeMs: 0,
      contentType: null,
      metrics: null,
      security: null,
      error: `Invalid URL format: ${err.message || 'Please enter a valid web address'}`,
      timestamp,
    };
  }

  if (isInternalOrPrivateUrl(targetUrl)) {
    return {
      success: false,
      url: targetUrl,
      status: 403,
      responseTimeMs: Date.now() - startTime,
      contentType: null,
      metrics: null,
      security: {
        isMalicious: true,
        threatType: 'Restricted Endpoint Access',
        warningMessage: 'Security Notice: Auditing localhost, private IP addresses, or internal cloud endpoints is restricted.',
      },
      error: 'Security Notice: Auditing localhost, private IP addresses, or internal cloud endpoints is restricted.',
      timestamp,
    };
  }

  // Pre-fetch live threat check via Google Safe Browsing API
  const liveGoogleThreat = await checkGoogleSafeBrowsing(targetUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      const initialSecurity = liveGoogleThreat || checkSecurityThreat(targetUrl, '');
      return {
        success: false,
        url: targetUrl,
        status: response.status,
        responseTimeMs,
        contentType,
        metrics: null,
        security: initialSecurity,
        error: `Non-HTML Response (${contentType || 'Unknown Content-Type'}): Page Pulse only audits web pages (HTML documents).`,
        timestamp,
      };
    }

    const reader = response.body?.getReader();
    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];
    let accumulatedText = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          receivedBytes += value.length;
          if (receivedBytes > MAX_RESPONSE_SIZE_BYTES) {
            reader.cancel();
            return {
              success: false,
              url: targetUrl,
              status: response.status,
              responseTimeMs: Date.now() - startTime,
              contentType,
              metrics: null,
              security: liveGoogleThreat || checkSecurityThreat(targetUrl, accumulatedText),
              error: 'Response Exceeded 2 MB Cap: Payload download was aborted to prevent memory overload.',
              timestamp,
            };
          }
          chunks.push(value);

          accumulatedText += Buffer.from(value).toString('utf-8');
          if (accumulatedText.includes('</html>')) {
            reader.cancel();
            break;
          }
        }
      }
    }

    const htmlBuffer = Buffer.concat(chunks);
    const htmlText = htmlBuffer.toString('utf-8');
    const metrics = parseHtmlMetrics(htmlText);
    const security = liveGoogleThreat || checkSecurityThreat(targetUrl, htmlText);

    return {
      success: true,
      url: targetUrl,
      status: response.status,
      responseTimeMs,
      contentType,
      metrics,
      security,
      error: response.ok ? null : `Target server responded with HTTP status ${response.status}`,
      timestamp,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;
    const security = liveGoogleThreat || checkSecurityThreat(targetUrl, '');

    if (err.name === 'AbortError') {
      return {
        success: false,
        url: targetUrl,
        status: 504,
        responseTimeMs,
        contentType: null,
        metrics: null,
        security,
        error: `Request Timed Out (${DEFAULT_TIMEOUT_MS / 1000}s): Target website took too long to respond.`,
        timestamp,
      };
    }

    const causeString = (err?.cause?.code || err?.code || err?.message || '').toString();
    let userFriendlyError = `Network Error: ${err.message || 'Unable to connect to target server'}`;

    if (causeString.includes('ENOTFOUND') || causeString.includes('getaddrinfo') || err.message?.includes('fetch failed')) {
      userFriendlyError = `Domain Name Not Found: The web address "${targetUrl}" does not exist or has no active DNS record.`;
    } else if (causeString.includes('ECONNREFUSED')) {
      userFriendlyError = `Connection Refused: Target server refused connection on HTTP/HTTPS port.`;
    }

    return {
      success: false,
      url: targetUrl,
      status: null,
      responseTimeMs,
      contentType: null,
      metrics: null,
      security,
      error: userFriendlyError,
      timestamp,
    };
  }
}
