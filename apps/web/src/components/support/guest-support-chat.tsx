'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import type { Channel, Event, MessageResponse } from 'stream-chat';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  createdAt: Date;
}

export function GuestSupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [channel, setChannel] = useState<Channel | null>(null);
  const [myUserId, setMyUserId] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const connect = useCallback(async () => {
    if (connected || connecting) return;
    setConnecting(true);
    try {
      const res = await fetch('/api/v1/stream/guest-token', { credentials: 'include' });
      if (!res.ok) return;
      const { token, apiKey, userId } = (await res.json()) as {
        token: string; apiKey: string; userId: string;
      };
      if (!apiKey || !token) return;

      const { StreamChat } = await import('stream-chat');
      const client = StreamChat.getInstance(apiKey);
      await client.connectUser({ id: userId, name: 'Visitor' }, token);
      setMyUserId(userId);

      const channelId = `support_${userId}`;
      const ch = client.channel('messaging', channelId, {
        name: `Guest — ${userId}`,
        custom_type: 'support',
        members: [userId],
      });
      await ch.create();
      await ch.watch();

      ch.on('message.new', (event: Event) => {
        if (!event.message) return;
        setMessages((prev) => [
          ...prev,
          {
            id: event.message!.id,
            text: event.message!.text ?? '',
            userId: event.message!.user?.id ?? '',
            createdAt: new Date(event.message!.created_at ?? Date.now()),
          },
        ]);
      });

      const existing = (ch.state.messages as MessageResponse[]).map((m) => ({
        id: m.id,
        text: m.text ?? '',
        userId: m.user?.id ?? '',
        createdAt: new Date(m.created_at ?? Date.now()),
      }));
      setMessages(existing);

      setChannel(ch);
      setConnected(true);
    } catch (e) {
      console.error('Guest stream connect failed', e);
    } finally {
      setConnecting(false);
    }
  }, [connected, connecting]);

  useEffect(() => {
    if (open && !connected) {
      void connect();
    }
  }, [open, connected, connect]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!channel || !input.trim()) return;
    const text = input.trim();
    setInput('');
    await channel.sendMessage({ text });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 flex w-80 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between bg-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-white" />
              <span className="text-sm font-semibold text-white">Chat with us</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex h-64 flex-col gap-2 overflow-y-auto p-3">
            {connecting && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting…
              </div>
            )}
            {!connecting && messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground mt-8">
                Hi! Have a question? Chat with us.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                  m.userId === myUserId
                    ? 'ml-auto bg-primary text-white'
                    : 'bg-muted text-foreground',
                )}
              >
                {m.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Type a message…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={!connected}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={!connected || !input.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-white hover:bg-accent transition-colors disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-accent transition-colors"
      >
        <MessageSquare className="h-4 w-4" />
        Chat with us
      </button>
    </div>
  );
}
