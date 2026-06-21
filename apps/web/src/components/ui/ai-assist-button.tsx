'use client';

import * as React from 'react';
import { Sparkles, Loader2, CheckCircle, Wand2, AlignLeft, Briefcase, MessageCircle, Expand, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { assistText } from '@/lib/api/ai';
import { cn } from '@/lib/utils';

interface AiAssistButtonProps {
  value: string;
  onResult: (result: string) => void;
  className?: string;
}

const ACTIONS = [
  { key: 'beautify', label: 'Beautify writing', icon: Wand2 },
  { key: 'grammar', label: 'Fix grammar', icon: CheckCircle },
  { key: 'formal', label: 'Make formal', icon: Briefcase },
  { key: 'casual', label: 'Make casual', icon: MessageCircle },
  { key: 'expand', label: 'Expand', icon: Expand },
  { key: 'shorten', label: 'Shorten', icon: Minimize2 },
] as const;

export function AiAssistButton({ value, onResult, className }: AiAssistButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState<string | null>(null);

  const isEmpty = !value || value.trim().length < 10;

  async function handleAction(action: string) {
    if (isEmpty) return;
    setLoading(action);
    try {
      const { result } = await assistText(value, action);
      onResult(result);
      setOpen(false);
      toast.success('Text improved by AI');
    } catch {
      toast.error('AI assist failed. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={isEmpty ? 'Write some text first (min 10 characters)' : 'AI writing assistant'}
          disabled={isEmpty}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
            'text-muted border border-border hover:border-accent hover:text-accent',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            className,
          )}
        >
          <Sparkles className="h-3 w-3" />
          <span>AI</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-48 p-1"
      >
        {ACTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            disabled={!!loading}
            onClick={() => handleAction(key)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              'hover:bg-surface text-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {loading === key ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />
            ) : (
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted" />
            )}
            <span>{label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
