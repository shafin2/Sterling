'use client';

import React from 'react';
import { MessageSquare, Users, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

function EmptyInbox({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">No {label} conversations yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Stream Chat integration coming soon. Once configured, all {label.toLowerCase()} support conversations will appear here.
      </p>
      <div className="mt-6 rounded-xl border border-border/60 bg-surface/60 px-5 py-4 text-left max-w-sm">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Once Stream Chat credentials are configured, all customer support conversations will appear here.
          You&apos;ll be able to reply to users in real time from this inbox.
        </p>
      </div>
    </div>
  );
}

export default function AdminSupportPage() {
  const [tab, setTab] = React.useState<'users' | 'guests'>('users');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Support Inbox</h1>
          <p className="mt-0.5 text-muted-foreground">Manage customer support conversations</p>
        </div>
        <div className="ml-auto">
          <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
            Stream Chat — Coming Soon
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border flex">
          {[
            { key: 'users', label: 'App Users', icon: Users },
            { key: 'guests', label: 'Guest Visitors', icon: Globe },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as 'users' | 'guests')}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors',
                tab === key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'users' && <EmptyInbox label="App User" />}
        {tab === 'guests' && <EmptyInbox label="Guest" />}
      </div>
    </div>
  );
}
