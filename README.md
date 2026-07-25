# Page Pulse - Technical URL Auditor

Page Pulse is a lightweight, high-performance web auditing application built to perform rapid technical SEO checks, latency performance monitoring, payload size safeguards, and security scans on public web URLs.

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
git clone https://github.com/amxn1/page-pulse1.git
cd page-pulse1
npm install
```

### Environment Variables (Optional)
Create a `.env.local` file in the root directory to enable live Google Safe Browsing threat detection:
```env
GOOGLE_SAFE_BROWSING_API_KEY=your_google_api_key_here
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests
```bash
npm test
```

### Production Build
```bash
npm run build
npm start
```

---

## 📡 API Contract

### `POST /api/audit`

Performs a real-time audit of the specified target URL.

#### Request Body
```json
{
  "url": "example.com"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "url": "https://example.com/",
  "status": 200,
  "responseTimeMs": 145,
  "contentType": "text/html; charset=utf-8",
  "metrics": {
    "title": "Example Domain",
    "metaDescription": "This domain is for use in illustrative examples in documents.",
    "h1Count": 1,
    "imagesMissingAlt": 0,
    "totalImages": 0,
    "wordCount": 145
  },
  "security": {
    "isMalicious": false,
    "threatType": null,
    "warningMessage": null
  },
  "error": null,
  "timestamp": "2026-07-25T11:20:00.000Z"
}
```

#### Error Response (`403 Forbidden` / `504 Gateway Timeout`)
```json
{
  "success": false,
  "url": "http://127.0.0.1/",
  "status": 403,
  "responseTimeMs": 5,
  "contentType": null,
  "metrics": null,
  "security": {
    "isMalicious": true,
    "threatType": "Restricted Endpoint Access",
    "warningMessage": "Security Notice: Auditing localhost, private IP addresses, or internal cloud endpoints is restricted."
  },
  "error": "Security Notice: Auditing localhost, private IP addresses, or internal cloud endpoints is restricted.",
  "timestamp": "2026-07-25T11:20:00.000Z"
}
```

---

## 💡 3 Key Design Decisions & Reasoning

### 1. SSRF Protection & Private IP Filtering
- **Decision**: Restrict audits from target URLs pointing to localhost (`127.0.0.1`), private subnets (`10.x.x.x`, `192.168.x.x`), or cloud metadata endpoints (`169.254.169.254`).
- **Reasoning**: Server-Side Request Forgery (SSRF) is a critical security vulnerability where an attacker uses a backend URL fetcher to probe internal services or cloud IAM credentials. Enforcing IP validation upfront protects internal server infrastructure.

### 2. Fast AST HTML Parsing via `node-html-parser` instead of Headless Browsers
- **Decision**: Used `node-html-parser` for DOM metric extraction rather than headless browser engines like Puppeteer or Playwright.
- **Reasoning**: Headless browsers introduce high CPU/memory overhead and latency (2–5 seconds per request). `node-html-parser` parses HTML tokens in under 15ms, enabling sub-150ms total audit execution, making serverless/edge deployments on platforms like Netlify lightweight and cost-effective.

### 3. Payload Capping (2MB) & Timeout Abort (8s)
- **Decision**: Stream response body using Node `ReadableStream` reader, cancelling the stream if payload size exceeds 2MB or connection time exceeds 8,000ms.
- **Reasoning**: Without payload streaming caps, auditing a multi-gigabyte file or slow-loris target could crash server memory (OOM) or block serverless worker threads. Aborting early ensures system stability and predictable response times.

---

## 🧪 Test Suite

The project includes an automated test runner (`npm test`) covering key business logic in `lib/audit.test.ts`:

- **Happy Path Testing**:
  - `parseHtmlMetrics`: Verifies accurate extraction of title tags, meta description, H1 heading counts, missing image alt attributes, and body word count.
  - `normalizeUrl`: Validates automatic prefixing of `https://` for protocol-less inputs.
- **Failure Cases Testing**:
  - `isInternalOrPrivateUrl`: Ensures localhost, `127.0.0.1`, and AWS IMDS (`169.254.169.254`) requests are blocked with HTTP 403.
  - `auditUrl`: Verifies graceful error handling for invalid/non-existent domains (`ENOTFOUND`) without crashing the application.
  - `auditUrl`: Validates threat warnings returned for flagged malware test pages.

---

## 🔮 What I Would Change With Another Day

If given additional time to extend the project:
1. **Asynchronous Queue & Caching Layer**: Implement Redis / Upstash caching to store audit reports for popular domains, preventing redundant HTTP requests.
2. **Headless Browser Fallback for Single-Page Applications (SPAs)**: For client-rendered React/Vue sites where initial HTML body is sparse, fallback to a lightweight headless renderer to capture dynamically rendered metadata.
