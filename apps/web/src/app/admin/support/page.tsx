'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Users, Globe, Send, Loader2, RefreshCw, Bot } from 'lucide-react';
import { adminApi } from '@/lib/admin-api';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Channel, Event, MessageResponse } from 'stream-chat';

type ChannelRow = {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageAt: string | null;
  memberCount: number;
};

interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  createdAt: Date;
}

function AdminChat({ channelId, adminUserId }: { channelId: string; adminUserId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setMessages([]);
    setChannel(null);

    const open = async () => {
      try {
        const { StreamChat } = await import('stream-chat');
        // Re-use the singleton that was connected in the parent
        const allClients = (StreamChat as unknown as { _instances: Map<string, typeof StreamChat> })._instances;
        const client = allClients?.values().next().value as InstanceType<typeof StreamChat> | undefined;

        if (!client?.userID) {
          // Fallback: connect now if not already connected
          const res = await fetch('/api/v1/stream/token', { credentials: 'include' });
          if (!res.ok) throw new Error('auth');
          const { token, apiKey, userId } = (await res.json()) as { token: string; apiKey: string; userId: string };
          const freshClient = (await import('stream-chat')).StreamChat.getInstance(apiKey);
          await freshClient.connectUser({ id: userId }, token);
          const ch = freshClient.channel('messaging', channelId);
          await ch.watch();
          if (!mounted) return;
          setMessages(
            (ch.state.messages as unknown as MessageResponse[]).map((m) => ({
              id: m.id, text: m.text ?? '', userId: m.user?.id ?? '',
              createdAt: new Date(m.created_at ?? Date.now()),
            })),
          );
          setChannel(ch);
          ch.on('message.new', (event: Event) => {
            if (!event.message || !mounted) return;
            setMessages((prev) => [...prev, {
              id: event.message!.id, text: event.message!.text ?? '',
              userId: event.message!.user?.id ?? '',
              createdAt: new Date(event.message!.created_at ?? Date.now()),
            }]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          });
          return;
        }

        const ch = client.channel('messaging', channelId);
        await ch.watch();
        if (!mounted) return;
        setMessages(
          (ch.state.messages as unknown as MessageResponse[]).map((m) => ({
            id: m.id, text: m.text ?? '', userId: m.user?.id ?? '',
            createdAt: new Date(m.created_at ?? Date.now()),
          })),
        );
        setChannel(ch);
        ch.on('message.new', (event: Event) => {
          if (!event.message || !mounted) return;
          setMessages((prev) => [...prev, {
            id: event.message!.id, text: event.message!.text ?? '',
            userId: event.message!.user?.id ?? '',
            createdAt: new Date(event.message!.created_at ?? Date.now()),
          }]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        });
      } catch (e) {
        console.error('admin chat open failed', e);
        if (mounted) setError('Could not open this conversation. Make sure you are logged in as admin.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void open();
    return () => { mounted = false; };
  }, [channelId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || !channel || sending) return;
    setSending(true);
    try {
      await channel.sendMessage({ text: input.trim() });
      setInput('');
    } finally {
      setSending(false);
    }
  }, [input, channel, sending]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-5 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className={cn('h-12 rounded-xl', i % 2 === 0 ? 'w-3/5 self-end' : 'w-2/3')} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-6">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        )}
        {messages.map((m) => {
          const isAdmin = m.userId === adminUserId;
          return (
            <div key={m.id} className={cn('flex gap-2', isAdmin ? 'justify-end' : 'justify-start')}>
              {!isAdmin && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent text-xs font-semibold mt-0.5">
                  U
                </div>
              )}
              <div className={cn(
                'max-w-[72%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                isAdmin
                  ? 'bg-gradient-to-br from-primary to-accent text-white rounded-tr-sm'
                  : 'bg-surface border border-border text-foreground rounded-tl-sm',
              )}>
                {m.text}
              </div>
              {isAdmin && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2 items-end shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a reply… (Enter to send)"
          rows={2}
          className={cn(
            'flex-1 resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent',
            'transition-all leading-relaxed',
          )}
        />
        <button
          type="button"
          disabled={!input.trim() || sending || !channel}
          onClick={() => void send()}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            'bg-gradient-to-br from-primary to-accent text-white',
            'transition-all hover:shadow-md hover:scale-105',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100',
          )}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </>
  );
}

export default function AdminSupportPage() {
  const [tab, setTab] = useState<'users' | 'guests'>('users');
  const [selected, setSelected] = useState<ChannelRow | null>(null);
  const [adminUserId, setAdminUserId] = useState('');
  const connectingRef = useRef(false);

  const { data: channels, isLoading, refetch } = useQuery({
    queryKey: ['admin-support-channels'],
    queryFn: () => adminApi.getSupportChannels(),
    refetchInterval: 15_000,
  });

  // Connect Stream Chat as admin once on mount
  useEffect(() => {
    if (connectingRef.current) return;
    connectingRef.current = true;

    const connect = async () => {
      try {
        const res = await fetch('/api/v1/stream/token', { credentials: 'include' });
        if (!res.ok) return;
        const { token, apiKey, userId } = (await res.json()) as {
          token: string; apiKey: string; userId: string;
        };
        setAdminUserId(userId);
        const { StreamChat } = await import('stream-chat');
        const client = StreamChat.getInstance(apiKey);
        if (!client.userID) {
          await client.connectUser({ id: userId }, token);
        }
      } catch (e) {
        console.error('Admin stream connect failed', e);
      }
    };
    void connect();
  }, []);

  const appChannels = (channels ?? []).filter((ch) => !ch.id.startsWith('guest_'));
  const guestChannels = (channels ?? []).filter((ch) => ch.id.startsWith('guest_'));
  const activeList = tab === 'users' ? appChannels : guestChannels;

  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-border bg-card">
      {/* Left: channel list */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Support Inbox</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex border-b border-border shrink-0">
          {[
            { key: 'users' as const, label: 'App Users', icon: Users, count: appChannels.length },
            { key: 'guests' as const, label: 'Guests', icon: Globe, count: guestChannels.length },
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setSelected(null); }}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
                tab === key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {count > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary leading-none">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : activeList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activeList.map((ch: ChannelRow) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSelected(ch)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 text-left transition-colors',
                    selected?.id === ch.id
                      ? 'bg-primary/8 border-l-2 border-primary'
                      : 'hover:bg-surface/70 border-l-2 border-transparent',
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                    {ch.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{ch.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {ch.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                  {ch.lastMessageAt && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(ch.lastMessageAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: chat pane */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        {selected ? (
          <>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {selected.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selected.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.id.startsWith('guest_') ? 'Guest visitor' : 'App user'} · {selected.memberCount} member{selected.memberCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <AdminChat key={selected.id} channelId={selected.id} adminUserId={adminUserId} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface border border-border">
              <MessageSquare className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">Select a conversation</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Choose a conversation from the left to read messages and reply in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
