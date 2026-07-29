// Simulated global traffic distribution for an audited domain.
// Real per-country analytics are not accessible for arbitrary URLs,
// so we generate a realistic, deterministic distribution seeded by the domain
// (the same URL always produces the same heatmap).

export interface CountryTraffic {
  country: string;
  code: string;
  lat: number;
  lng: number;
  visitors: number;
  /** 0..1 normalized intensity relative to the top country */
  intensity: number;
}

interface CountrySeed {
  country: string;
  code: string;
  lat: number;
  lng: number;
  /** Relative baseline weight approximating global internet population */
  weight: number;
}

const COUNTRIES: CountrySeed[] = [
  { country: 'United States', code: 'US', lat: 39.8, lng: -98.6, weight: 95 },
  { country: 'India', code: 'IN', lat: 22.9, lng: 78.7, weight: 90 },
  { country: 'China', code: 'CN', lat: 35.0, lng: 103.0, weight: 85 },
  { country: 'Brazil', code: 'BR', lat: -10.8, lng: -52.9, weight: 60 },
  { country: 'Indonesia', code: 'ID', lat: -2.2, lng: 117.4, weight: 55 },
  { country: 'United Kingdom', code: 'GB', lat: 54.0, lng: -2.5, weight: 52 },
  { country: 'Germany', code: 'DE', lat: 51.1, lng: 10.4, weight: 50 },
  { country: 'Japan', code: 'JP', lat: 36.5, lng: 138.0, weight: 50 },
  { country: 'Nigeria', code: 'NG', lat: 9.6, lng: 8.1, weight: 42 },
  { country: 'Russia', code: 'RU', lat: 61.5, lng: 95.0, weight: 45 },
  { country: 'Mexico', code: 'MX', lat: 23.9, lng: -102.5, weight: 40 },
  { country: 'France', code: 'FR', lat: 46.6, lng: 2.5, weight: 45 },
  { country: 'Canada', code: 'CA', lat: 56.1, lng: -106.3, weight: 38 },
  { country: 'South Korea', code: 'KR', lat: 36.4, lng: 127.9, weight: 38 },
  { country: 'Turkey', code: 'TR', lat: 39.0, lng: 35.4, weight: 35 },
  { country: 'Vietnam', code: 'VN', lat: 16.6, lng: 106.3, weight: 34 },
  { country: 'Philippines', code: 'PH', lat: 12.9, lng: 121.8, weight: 33 },
  { country: 'Italy', code: 'IT', lat: 42.8, lng: 12.8, weight: 33 },
  { country: 'Spain', code: 'ES', lat: 40.2, lng: -3.6, weight: 32 },
  { country: 'Egypt', code: 'EG', lat: 26.6, lng: 29.8, weight: 30 },
  { country: 'Pakistan', code: 'PK', lat: 29.9, lng: 69.3, weight: 30 },
  { country: 'Bangladesh', code: 'BD', lat: 23.7, lng: 90.2, weight: 28 },
  { country: 'Argentina', code: 'AR', lat: -35.4, lng: -65.2, weight: 26 },
  { country: 'Australia', code: 'AU', lat: -25.7, lng: 134.5, weight: 26 },
  { country: 'Poland', code: 'PL', lat: 52.1, lng: 19.4, weight: 24 },
  { country: 'Netherlands', code: 'NL', lat: 52.2, lng: 5.3, weight: 22 },
  { country: 'Saudi Arabia', code: 'SA', lat: 24.1, lng: 44.5, weight: 21 },
  { country: 'Thailand', code: 'TH', lat: 15.1, lng: 101.0, weight: 21 },
  { country: 'South Africa', code: 'ZA', lat: -29.0, lng: 25.1, weight: 20 },
  { country: 'Colombia', code: 'CO', lat: 3.9, lng: -73.1, weight: 19 },
  { country: 'Ukraine', code: 'UA', lat: 49.0, lng: 31.4, weight: 18 },
  { country: 'Malaysia', code: 'MY', lat: 3.8, lng: 109.7, weight: 17 },
  { country: 'Kenya', code: 'KE', lat: 0.5, lng: 37.9, weight: 15 },
  { country: 'Sweden', code: 'SE', lat: 62.8, lng: 16.7, weight: 14 },
  { country: 'Chile', code: 'CL', lat: -37.7, lng: -71.4, weight: 13 },
  { country: 'United Arab Emirates', code: 'AE', lat: 23.9, lng: 54.3, weight: 13 },
  { country: 'Singapore', code: 'SG', lat: 1.35, lng: 103.8, weight: 12 },
  { country: 'Israel', code: 'IL', lat: 31.4, lng: 35.0, weight: 11 },
  { country: 'Norway', code: 'NO', lat: 64.6, lng: 12.7, weight: 10 },
  { country: 'New Zealand', code: 'NZ', lat: -41.8, lng: 172.8, weight: 9 },
];

/** Simple deterministic 32-bit hash (FNV-1a) */
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 seeded PRNG */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.toLowerCase().trim();
  }
}

/**
 * Generates a deterministic, realistic-looking per-country visitor
 * distribution for the given URL. The same domain always yields the
 * same distribution.
 */
export function generateTrafficData(url: string): CountryTraffic[] {
  const domain = extractDomain(url);
  const rand = mulberry32(hashString(domain));

  // Overall site popularity scale: ~5k to ~2.5M monthly visitors
  const popularity = Math.pow(rand(), 1.6);
  const scale = 5_000 + popularity * 2_495_000;

  const raw = COUNTRIES.map((c) => {
    // Randomize each country's share so different domains have
    // clearly different geographic footprints.
    const jitter = Math.pow(rand(), 2.2) * 3; // occasionally boosts a country hard
    const share = c.weight * (0.15 + jitter);
    return { ...c, share };
  });

  const totalShare = raw.reduce((sum, c) => sum + c.share, 0);
  const withVisitors = raw.map((c) => ({
    country: c.country,
    code: c.code,
    lat: c.lat,
    lng: c.lng,
    visitors: Math.max(1, Math.round((c.share / totalShare) * scale)),
  }));

  const max = Math.max(...withVisitors.map((c) => c.visitors));
  return withVisitors
    .map((c) => ({ ...c, intensity: c.visitors / max }))
    .sort((a, b) => b.visitors - a.visitors);
}

export function formatVisitors(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
