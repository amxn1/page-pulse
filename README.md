# Page Pulse

A lightweight web app for performing quick technical SEO and performance checks on any URL.

## Features

- **Page Metrics**: Extracts `<title>`, meta description, `<h1>` heading count, image `alt` attributes, and word count.
- **Performance & Reliability**: Aborts requests after 8s and caps downloads at 2MB to handle slow or oversized pages gracefully.
- **Security Safeguards**: Includes rate limiting and checks to prevent internal IP or loopback address scanning (SSRF protection).
- **Clean UI**: Responsive dashboard with metric summaries and raw JSON output.

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Styling**: Tailwind CSS & Lucide Icons
- **HTML Parsing**: `node-html-parser`
- **Language**: TypeScript

## Getting Started

### Installation
```bash
npm install
```

### Development
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

## API Reference

### `POST /api/audit`

Request body:
```json
{
  "url": "example.com"
}
```

Response format:
```json
{
  "success": true,
  "url": "https://example.com/",
  "status": 200,
  "responseTimeMs": 145,
  "contentType": "text/html; charset=utf-8",
  "metrics": {
    "title": "Example Domain",
    "metaDescription": null,
    "h1Count": 1,
    "imagesMissingAlt": 0,
    "totalImages": 0,
    "wordCount": 145
  },
  "error": null,
  "timestamp": "2026-07-25T00:00:00.000Z"
}
```
