import React from 'react';
import { cn, LEAD_STATUSES, type LeadStatus } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: LeadStatus | string;
  children?: React.ReactNode;
}

export function Badge({ status, children, className, ...props }: BadgeProps) {
  const statusInfo = LEAD_STATUSES.find((s) => s.value === status);
  const colorStyles = statusInfo
    ? statusInfo.color
    : 'bg-slate-500/10 text-slate-400 border-slate-500/20';

  const label = children || statusInfo?.label || status;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-sm transition-colors',
        colorStyles,
        className
      )}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {label}
    </span>
  );
}
