'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Users, Globe } from 'lucide-react';
import { adminApi } from '@/lib/admin-api';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ChannelRow = {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageAt: string | null;
  memberCount: number;
};

export default function AdminSupportPage() {
  const [tab, setTab] = React.useState<'users' | 'guests'>('users');

  const { data: channels, isLoading } = useQuery({
    queryKey: ['admin-support-channels'],
    queryFn: () => adminApi.getSupportChannels(),
  });

  const appChannels = (channels ?? []).filter((ch) => !ch.id.startsWith('guest_'));
  const guestChannels = (channels ?? []).filter((ch) => ch.id.startsWith('guest_'));
  const activeList = tab === 'users' ? appChannels : guestChannels;

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
        {channels && channels.length > 0 && (
          <div className="ml-auto">
            <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
              {channels.length} conversation{channels.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border flex">
          {[
            { key: 'users' as const, label: 'App Users', icon: Users, count: appChannels.length },
            { key: 'guests' as const, label: 'Guest Visitors', icon: Globe, count: guestChannels.length },
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors',
                tab === key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {count > 0 && (
                <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : activeList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              No {tab === 'users' ? 'app user' : 'guest'} conversations yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {tab === 'users'
                ? 'When app users open the support chat, their conversations will appear here.'
                : 'When visitors on the marketing page start a chat, their conversations will appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activeList.map((ch: ChannelRow) => (
              <div
                key={ch.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                  {ch.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{ch.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {ch.lastMessage || 'No messages yet'}
                  </p>
                </div>
                {ch.lastMessageAt && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(ch.lastMessageAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
