'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  BarChart3,
  Settings,
  Building2,
  Palette,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMANDS = [
  { group: 'Navigate', items: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/app' },
    { label: 'Invoices', icon: FileText, href: '/app/invoices' },
    { label: 'Invoice Designer', icon: Palette, href: '/app/designer' },
    { label: 'Clients', icon: Building2, href: '/app/clients' },
    { label: 'Employees', icon: Users, href: '/app/employees' },
    { label: 'Payroll', icon: Briefcase, href: '/app/payroll' },
    { label: 'Reports', icon: BarChart3, href: '/app/reports' },
    { label: 'Settings', icon: Settings, href: '/app/settings' },
  ]},
  { group: 'Create', items: [
    { label: 'New Invoice', icon: Plus, href: '/app/invoices/new' },
    { label: 'New Client', icon: Plus, href: '/app/clients?new=1' },
    { label: 'New Employee', icon: Plus, href: '/app/employees?new=1' },
  ]},
];

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter();

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div className={cn(
        'relative w-full max-w-xl overflow-hidden rounded-2xl',
        'glass border border-white/20 shadow-glass',
        'animate-slide-down',
      )}>
        <Command className="bg-transparent">
          <div className="flex items-center border-b border-border/50 px-4">
            <Command.Input
              placeholder="Search commands…"
              className={cn(
                'h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground',
                'outline-none',
              )}
              autoFocus
            />
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {COMMANDS.map((group) => (
              <Command.Group
                key={group.group}
                heading={group.group}
                className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {group.items.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    onSelect={() => {
                      router.push(item.href);
                      onOpenChange(false);
                    }}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
                      'text-foreground hover:bg-surface aria-selected:bg-surface',
                      'transition-colors',
                    )}
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
