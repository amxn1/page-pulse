if (typeof globalThis.File === 'undefined') {
  (globalThis as any).File = class File {};
}

import assert from 'node:assert';
import { parseHtmlMetrics, normalizeUrl, auditUrl } from './audit';
import { isInternalOrPrivateUrl } from './rate-limiter';

console.log('Running test suite...\n');

let passed = 0;
let failed = 0;

async function runAsyncTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}`);
    console.error(`  ${err.message}`);
    failed++;
  }
}

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}`);
    console.error(`  ${err.message}`);
    failed++;
  }
}

async function main() {
  runTest('normalizeUrl - adds https:// protocol if missing', () => {
    assert.strictEqual(normalizeUrl('example.com'), 'https://example.com/');
  });

  runTest('normalizeUrl - preserves existing http:// protocol', () => {
    assert.strictEqual(normalizeUrl('http://example.com/test'), 'http://example.com/test');
  });

  runTest('parseHtmlMetrics - Happy Path title, meta, h1, missing alt, word count', () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page Title</title>
          <meta name="description" content="Meta description text." />
        </head>
        <body>
          <h1>Main Heading</h1>
          <p>This is a paragraph of visible content.</p>
          <img src="/a.jpg" alt="Photo" />
          <img src="/b.jpg" />
          <img src="/c.jpg" alt="" />
        </body>
      </html>
    `;
    const metrics = parseHtmlMetrics(sampleHtml);
    assert.strictEqual(metrics.title, 'Test Page Title');
    assert.strictEqual(metrics.metaDescription, 'Meta description text.');
    assert.strictEqual(metrics.h1Count, 1);
    assert.strictEqual(metrics.totalImages, 3);
    assert.strictEqual(metrics.imagesMissingAlt, 2);
    assert.ok(metrics.wordCount > 5);
  });

  runTest('parseHtmlMetrics - Missing tags fallback to null/0', () => {
    const emptyHtml = '<html><body><p>Short text</p></body></html>';
    const metrics = parseHtmlMetrics(emptyHtml);
    assert.strictEqual(metrics.title, null);
    assert.strictEqual(metrics.metaDescription, null);
    assert.strictEqual(metrics.h1Count, 0);
    assert.strictEqual(metrics.imagesMissingAlt, 0);
    assert.strictEqual(metrics.wordCount, 2);
  });

  runTest('isInternalOrPrivateUrl - blocks localhost and loopback IPv4', () => {
    assert.strictEqual(isInternalOrPrivateUrl('http://localhost:3000'), true);
    assert.strictEqual(isInternalOrPrivateUrl('http://127.0.0.1/admin'), true);
    assert.strictEqual(isInternalOrPrivateUrl('http://0.0.0.0'), true);
  });

  runTest('isInternalOrPrivateUrl - blocks AWS/GCP metadata IP (169.254.169.254)', () => {
    assert.strictEqual(isInternalOrPrivateUrl('http://169.254.169.254/meta-data'), true);
  });

  runTest('isInternalOrPrivateUrl - allows public HTTPS URLs', () => {
    assert.strictEqual(isInternalOrPrivateUrl('https://example.com'), false);
    assert.strictEqual(isInternalOrPrivateUrl('https://google.com'), false);
  });

  await runAsyncTest('auditUrl - handles invalid/non-existent domain input gracefully without crashing', async () => {
    const report = await auditUrl('http://invalid-domain-name-that-definitely-does-not-exist-987654.org');
    assert.strictEqual(report.success, false);
    assert.ok(report.error !== null);
    assert.ok(report.error.includes('Domain Name Not Found') || report.error.includes('Failed to fetch'));
  });

  await runAsyncTest('auditUrl - handles SSRF attempt gracefully returning 403', async () => {
    const report = await auditUrl('http://127.0.0.1/secret');
    assert.strictEqual(report.success, false);
    assert.strictEqual(report.status, 403);
    assert.ok(report.error?.includes('Security Notice'));
  });

  await runAsyncTest('auditUrl - detects malware test page threat warning', async () => {
    const report = await auditUrl('http://testsafebrowsing.appspot.com/s/malware.html');
    assert.strictEqual(report.security?.isMalicious, true);
    assert.strictEqual(report.security?.threatType, 'Malware & Harmful Software');
  });

  console.log(`\nSummary: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

main();
