'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  MessageSquare,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMe } from '@/hooks/use-me';
import { useLogout } from '@/hooks/use-me';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/admin/support', label: 'Support', icon: MessageSquare },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: me } = useMe();
  const logout = useLogout();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className="glass-sidebar w-64 shrink-0 flex-col lg:relative lg:flex hidden"
      aria-label="Admin navigation"
    >
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-primary">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-white">Sterling Admin</p>
          <p className="truncate text-[10px] text-white/50">Platform Console</p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                'hover:bg-sidebar-hover focus-ring',
                active
                  ? 'bg-sidebar-active/20 text-white'
                  : 'text-sidebar-foreground hover:text-white',
              )}
            >
              {active && (
                <motion.div
                  layoutId="admin-sidebar-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-active/20"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <item.icon
                className={cn(
                  'relative z-10 h-4 w-4 shrink-0 transition-colors',
                  active ? 'text-accent' : 'text-sidebar-foreground group-hover:text-white',
                )}
              />
              <span className="relative z-10 truncate">{item.label}</span>
              {active && (
                <div className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user info + logout */}
      <div className="border-t border-white/10 px-3 py-3 space-y-1">
        {me && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/30 text-xs font-bold text-white">
              {me.firstName?.charAt(0) ?? 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{me.firstName} {me.lastName}</p>
              <p className="truncate text-[10px] text-white/50">{me.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-150 hover:bg-sidebar-hover hover:text-white focus-ring"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
