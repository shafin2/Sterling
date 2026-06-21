import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { InvoiceStatus, PayrollStatus } from '@sterling/shared';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        draft: 'bg-muted/20 text-muted-foreground border border-muted/30',
        sent: 'bg-warning/15 text-warning border border-warning/30',
        paid: 'bg-success/15 text-success border border-success/30',
        overdue: 'bg-danger/15 text-danger border border-danger/30',
        pending: 'bg-warning/15 text-warning border border-warning/30',
        processing: 'bg-accent/15 text-accent border border-accent/30',
        processed: 'bg-accent/15 text-accent border border-accent/30',
        completed: 'bg-success/15 text-success border border-success/30',
        active: 'bg-success/15 text-success border border-success/30',
        inactive: 'bg-muted/20 text-muted-foreground border border-muted/30',
        terminated: 'bg-danger/15 text-danger border border-danger/30',
      },
    },
    defaultVariants: { variant: 'draft' },
  },
);

const DOT_COLORS: Record<string, string> = {
  draft: 'bg-muted-foreground',
  sent: 'bg-warning',
  paid: 'bg-success',
  overdue: 'bg-danger',
  pending: 'bg-warning',
  processing: 'bg-accent',
  processed: 'bg-accent',
  completed: 'bg-success',
  active: 'bg-success',
  inactive: 'bg-muted-foreground',
  terminated: 'bg-danger',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
  return (
    <span className={cn(badgeVariants({ variant: status as any }), className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT_COLORS[status] ?? 'bg-muted-foreground')} />
      {label}
    </span>
  );
}
