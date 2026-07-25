import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export const LEAD_STATUSES = [
  { value: 'NEW', label: 'New', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { value: 'QUALIFIED', label: 'Qualified', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  { value: 'CONVERTED', label: 'Converted', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { value: 'ARCHIVED', label: 'Archived', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]['value'];
