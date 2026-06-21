import { formatMoney } from '@sterling/shared';
import { cn } from '@/lib/utils';

interface MoneyTextProps {
  amount: number;
  currency?: string;
  locale?: string;
  className?: string;
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
}

export function MoneyText({
  amount,
  currency = 'PKR',
  locale = 'en-PK',
  className,
  size = 'base',
}: MoneyTextProps) {
  const sizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  }[size];

  return (
    <span
      className={cn('tabular-nums font-mono', sizeClass, className)}
      data-money
      aria-label={`${formatMoney(amount, currency, locale)}`}
    >
      {formatMoney(amount, currency, locale)}
    </span>
  );
}
