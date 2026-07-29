'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';

const TrafficGlobe = dynamic(() => import('@/components/traffic-globe'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 animate-pulse">
        Loading 3D Globe...
      </span>
    </div>
  ),
});
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Globe,
  Zap,
  Clock,
  FileText,
  Heading,
  Image as ImageIcon,
  ShieldCheck,
  Code,
  Copy,
  Check,
  ExternalLink,
  Search,
  XCircle,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';
import type { AuditReport } from '@/lib/audit';

function getStatusLabel(status: number | null): string {
  if (!status) return 'No Response';
  const labels: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    301: 'Moved Permanently',
    302: 'Redirect / Found',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Page Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway (Server Down/Unreachable)',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };
  return labels[status] || (status >= 500 ? 'Server Error' : status >= 400 ? 'Client Error' : 'Response Code');
}

export default function Home() {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // MinimalHero Canvas Particle Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    type Particle = {
      x: number;
      y: number;
      speed: number;
      opacity: number;
      fadeDelay: number;
      fadeStart: number;
      fadingOut: boolean;
    };

    let particles: Particle[] = [];
    let raf = 0;

    const count = () => Math.floor((canvas.width * canvas.height) / 8000);

    const make = (): Particle => {
      const fadeDelay = Math.random() * 600 + 100;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: Math.random() / 5 + 0.1,
        opacity: 0.7,
        fadeDelay,
        fadeStart: Date.now() + fadeDelay,
        fadingOut: false,
      };
    };

    const reset = (p: Particle) => {
      p.x = Math.random() * canvas.width;
      p.y = Math.random() * canvas.height;
      p.speed = Math.random() / 5 + 0.1;
      p.opacity = 0.7;
      p.fadeDelay = Math.random() * 600 + 100;
      p.fadeStart = Date.now() + p.fadeDelay;
      p.fadingOut = false;
    };

    const init = () => {
      particles = [];
      for (let i = 0; i < count(); i++) particles.push(make());
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < 0) reset(p);
        if (!p.fadingOut && Date.now() > p.fadeStart) p.fadingOut = true;
        if (p.fadingOut) {
          p.opacity -= 0.008;
          if (p.opacity <= 0) reset(p);
        }
        ctx.fillStyle = `rgba(250, 250, 250, ${p.opacity})`;
        ctx.fillRect(p.x, p.y, 0.6, Math.random() * 2 + 1);
      });
      raf = requestAnimationFrame(draw);
    };

    const onResize = () => {
      setSize();
      init();
    };

    window.addEventListener('resize', onResize);
    init();
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleAudit = async (targetUrl?: string) => {
    const queryUrl = targetUrl || urlInput;
    if (!queryUrl.trim()) {
      setReport({
        success: false,
        url: '',
        status: null,
        responseTimeMs: 0,
        contentType: null,
        metrics: null,
        security: null,
        error: 'Please enter a valid website URL.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    setIsLoading(true);
    setReport(null);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: queryUrl }),
      });

      const data: AuditReport = await res.json();
      setReport(data);
    } catch {
      setReport({
        success: false,
        url: queryUrl,
        status: null,
        responseTimeMs: 0,
        contentType: null,
        metrics: null,
        security: null,
        error: 'Network Error: Failed to complete request. Please try again.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyJson = () => {
    if (report) {
      navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="minimal-root">
      {/* Particle Canvas Background */}
      <canvas ref={canvasRef} className="particleCanvas" />

      {/* Animated Accent Grid Lines */}
      <div className="accent-lines">
        <div className="hline" />
        <div className="hline" />
        <div className="hline" />
        <div className="vline" />
        <div className="vline" />
        <div className="vline" />
      </div>

      {/* Header */}
      <header className="header-minimal">
        <div className="brand-title">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
            <Zap className="w-4 h-4" />
          </div>
          <span>Page Pulse</span>
          <span className="brand-badge hidden sm:inline-block">URL Auditor</span>
        </div>
      </header>

      {/* Main Hero & Tool */}
      <main className="flex-1 relative z-10 max-w-5xl w-full mx-auto px-6 pb-16">
        <div className="hero-minimal-container">
          <div className="kicker">
            <Globe className="w-3.5 h-3.5 text-zinc-400" />
            <span>Introducing Technical URL Auditing</span>
          </div>

          <h1 className="hero-title">
            Audit fast. <br />
            <span className="text-zinc-400 font-normal">Audit clean.</span>
          </h1>

          <p className="hero-subtitle">
            Inspect HTTP response status, latency performance, title tags, meta description, H1 heading structure, missing alt images, and word count.
          </p>

          {/* Audit Search Box */}
          <div className="auditor-card text-left">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAudit();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Input
                type="text"
                placeholder="Enter website URL"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                icon={<Search className="w-4 h-4 text-zinc-400" />}
                className="bg-zinc-950/80 border-zinc-800 text-white placeholder:text-zinc-500 text-base py-3 focus:border-zinc-700"
              />
              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                className="bg-zinc-100 text-zinc-900 hover:bg-white font-medium sm:w-auto shrink-0 border border-zinc-200"
              >
                <Zap className="w-4 h-4 mr-2" />
                Audit Page
              </Button>
            </form>
          </div>
        </div>

        {/* Audit Results Dashboard OR Audit Failed Card */}
        {report && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            {report.success && report.metrics ? (
              <>
                {/* SUCCESSFUL AUDIT HEADER */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Audited Target
                      </span>
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-300 hover:text-white hover:underline text-xs flex items-center gap-1 font-medium"
                      >
                        Open URL <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-white truncate max-w-xl">
                      {report.url}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    <div
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                        report.status === 200
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-current" />
                      HTTP {report.status ? `${report.status} (${getStatusLabel(report.status)})` : 'N/A'}
                    </div>

                    {/* Response Time Badge */}
                    <div className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {report.responseTimeMs} ms
                    </div>
                  </div>
                </div>

                {/* Malware & Security Warning Banner */}
                {report.security?.isMalicious && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3.5 text-rose-300">
                    <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 text-left">
                      <div className="font-bold text-rose-300 text-sm flex items-center gap-2">
                        <span>Security Warning: {report.security.threatType || 'Harmful Webpage Flagged'}</span>
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] uppercase font-extrabold tracking-wider border border-rose-500/30">
                          High Risk
                        </span>
                      </div>
                      <p className="text-xs text-rose-300/80 leading-relaxed font-medium">
                        {report.security.warningMessage}
                      </p>
                    </div>
                  </div>
                )}

                {/* Grid of Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Metric 1: H1 Count */}
                  <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
                      <CardTitle className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">
                        H1 Headings
                      </CardTitle>
                      <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
                        <Heading className="w-4 h-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black text-white">{report.metrics.h1Count}</div>
                      <p className="text-xs text-zinc-400 mt-1">
                        {report.metrics.h1Count === 1
                          ? 'Optimal (Exactly 1 H1)'
                          : report.metrics.h1Count === 0
                          ? 'Warning: Missing H1 tag'
                          : 'Multiple H1 tags found'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Metric 2: Images Missing Alt */}
                  <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
                      <CardTitle className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">
                        Missing Alt Images
                      </CardTitle>
                      <div
                        className={`p-2 rounded-xl ${
                          report.metrics.imagesMissingAlt > 0
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`text-3xl font-black ${
                          report.metrics.imagesMissingAlt > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {report.metrics.imagesMissingAlt}{' '}
                        <span className="text-xs text-zinc-400 font-normal">
                          / {report.metrics.totalImages}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        {report.metrics.imagesMissingAlt === 0
                          ? 'All images have ALT text'
                          : `${report.metrics.imagesMissingAlt} image(s) need ALT tags`}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Metric 3: Word Count */}
                  <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
                      <CardTitle className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">
                        Visible Word Count
                      </CardTitle>
                      <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
                        <FileText className="w-4 h-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black text-white">
                        {report.metrics.wordCount.toLocaleString()}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">Approximate body text words</p>
                    </CardContent>
                  </Card>

                  {/* Metric 4: Content Type */}
                  <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
                      <CardTitle className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">
                        Content Type
                      </CardTitle>
                      <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
                        <Code className="w-4 h-4" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-base font-bold text-zinc-200 truncate">
                        {report.contentType ? report.contentType.split(';')[0] : 'HTML'}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">Valid HTML Document</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Meta Tags Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-sm text-zinc-200">Page Title</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-zinc-200 bg-zinc-950 border border-zinc-800 p-3 rounded-xl font-medium">
                        {report.metrics.title || (
                          <span className="text-zinc-500 italic">No &lt;title&gt; tag found</span>
                        )}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/80 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-sm text-zinc-200">Meta Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-zinc-200 bg-zinc-950 border border-zinc-800 p-3 rounded-xl font-medium leading-relaxed">
                        {report.metrics.metaDescription || (
                          <span className="text-zinc-500 italic">No meta description found</span>
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Global Traffic Heatmap Globe */}
                <Card className="bg-zinc-900/80 border-zinc-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm text-zinc-200">Global Traffic Heatmap</CardTitle>
                        <CardDescription className="text-zinc-400 text-xs">
                          Estimated visitor distribution by country
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <TrafficGlobe url={report.url} />
                  </CardContent>
                </Card>
              </>
            ) : (
              /* DEDICATED AUDIT FAILED CARD */
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                    <XCircle className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold uppercase tracking-wider">
                      Not Found {report.status ? `(HTTP ${report.status} - ${getStatusLabel(report.status)})` : '(No Response)'}
                    </div>
                    <h3 className="text-xl font-bold text-white">Target Webpage Not Found</h3>
                    <p className="text-sm text-rose-300 font-medium">
                      {report.error || 'An unexpected error occurred while attempting to audit this webpage.'}
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                    <HelpCircle className="w-4 h-4 text-zinc-400" />
                    <span>Troubleshooting Tips:</span>
                  </div>
                  <ul className="text-xs text-zinc-400 space-y-1 pl-6 list-disc">
                    <li>Double check the spelling of the domain (e.g. ensure the website is active and registered).</li>
                    <li>Verify the website is publicly accessible and not behind authentication or VPN.</li>
                    <li>Ensure the URL returns a standard HTML webpage rather than a PDF, JSON, or binary file.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* JSON Output Viewer */}
            <Card className="bg-zinc-900/80 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-zinc-800">
                <div>
                  <CardTitle className="text-sm text-zinc-200">JSON Report Output</CardTitle>
                  <CardDescription className="text-zinc-400">Raw API response payload</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={copyJson} className="border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700">
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="pt-2">
                <pre className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-xs text-zinc-300 font-mono overflow-x-auto max-h-60 leading-relaxed">
                  {JSON.stringify(report, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 py-8 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center text-xs text-zinc-500">
          <p>© 2026 Page Pulse. High Performance Web Auditor.</p>
        </div>
      </footer>
    </div>
  );
}
