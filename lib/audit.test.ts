import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseHtmlMetrics, normalizeUrl, checkSecurityThreat } from './audit';
import { isInternalOrPrivateUrl } from './rate-limiter';

describe('Page Pulse - Audit Engine Tests', () => {
  describe('normalizeUrl()', () => {
    it('should add https:// protocol if missing', () => {
      assert.strictEqual(normalizeUrl('example.com'), 'https://example.com/');
    });

    it('should preserve existing http:// protocol', () => {
      assert.strictEqual(normalizeUrl('http://example.com/test'), 'http://example.com/test');
    });

    it('should throw an error for empty or invalid strings', () => {
      assert.throws(() => normalizeUrl(''), { message: 'URL cannot be empty' });
    });
  });

  describe('parseHtmlMetrics() - Happy Path', () => {
    it('should correctly extract title, meta description, h1 count, missing alt images, and word count', () => {
      const sampleHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>Page Pulse - Test Page</title>
            <meta name="description" content="Technical audit testing." />
          </head>
          <body>
            <header><h1>Welcome to Page Pulse</h1></header>
            <main>
              <p>We build high-performance web auditing tools.</p>
              <img src="/logo.png" alt="Company Logo" />
              <img src="/banner.png" />
              <img src="/team.png" alt="" />
            </main>
          </body>
        </html>
      `;

      const metrics = parseHtmlMetrics(sampleHtml);

      assert.strictEqual(metrics.title, 'Page Pulse - Test Page');
      assert.strictEqual(metrics.metaDescription, 'Technical audit testing.');
      assert.strictEqual(metrics.h1Count, 1);
      assert.strictEqual(metrics.totalImages, 3);
      assert.strictEqual(metrics.imagesMissingAlt, 2);
      assert.ok(metrics.wordCount > 5);
    });
  });

  describe('parseHtmlMetrics() - Edge Cases & Fallbacks', () => {
    it('should return null title and meta description when tags are missing', () => {
      const emptyHtml = '<html><body><p>Hello World</p></body></html>';
      const metrics = parseHtmlMetrics(emptyHtml);

      assert.strictEqual(metrics.title, null);
      assert.strictEqual(metrics.metaDescription, null);
      assert.strictEqual(metrics.h1Count, 0);
      assert.strictEqual(metrics.imagesMissingAlt, 0);
      assert.strictEqual(metrics.wordCount, 2);
    });
  });

  describe('Security & DDoS Prevention - isInternalOrPrivateUrl()', () => {
    it('should block localhost and loopback IPv4 addresses', () => {
      assert.strictEqual(isInternalOrPrivateUrl('http://localhost:3000'), true);
      assert.strictEqual(isInternalOrPrivateUrl('http://127.0.0.1/admin'), true);
      assert.strictEqual(isInternalOrPrivateUrl('http://0.0.0.0:8080'), true);
    });

    it('should block private subnet IPs (10.x, 192.168.x)', () => {
      assert.strictEqual(isInternalOrPrivateUrl('http://10.0.0.1/secret'), true);
      assert.strictEqual(isInternalOrPrivateUrl('http://192.168.1.1/router'), true);
    });

    it('should block AWS / GCP Metadata endpoints (169.254.169.254)', () => {
      assert.strictEqual(isInternalOrPrivateUrl('http://169.254.169.254/latest/meta-data/'), true);
    });

    it('should allow valid public HTTPS domain URLs', () => {
      assert.strictEqual(isInternalOrPrivateUrl('https://example.com'), false);
      assert.strictEqual(isInternalOrPrivateUrl('https://google.com'), false);
    });
  });

  describe('Malware & Threat Detection - checkSecurityThreat()', () => {
    it('should detect known malware test URLs', () => {
      const result = checkSecurityThreat('http://testsafebrowsing.appspot.com/s/malware.html');
      assert.strictEqual(result.isMalicious, true);
      assert.strictEqual(result.threatType, 'Malware & Harmful Software');
    });

    it('should detect phishing test URLs', () => {
      const result = checkSecurityThreat('http://testsafebrowsing.appspot.com/s/phishing.html');
      assert.strictEqual(result.isMalicious, true);
      assert.strictEqual(result.threatType, 'Phishing / Deceptive Site');
    });

    it('should return clean status for benign URLs', () => {
      const result = checkSecurityThreat('https://nextjs.org');
      assert.strictEqual(result.isMalicious, false);
      assert.strictEqual(result.threatType, null);
    });
  });
});
