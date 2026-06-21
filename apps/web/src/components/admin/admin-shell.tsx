'use client';

import * as React from 'react';
import { AdminSidebar } from './admin-sidebar';
import { Shield } from 'lucide-react';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/50 px-6">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Admin Panel</span>
          <span className="ml-auto text-xs text-muted-foreground">Sterling Platform</span>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
