import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Page Pulse - Technical URL Auditor Tool',
  description:
    'Inspect HTTP status, response latency, meta description, H1 heading structure, missing ALT tags, and word count.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
