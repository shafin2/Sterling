'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Channel, Event, MessageResponse } from 'stream-chat';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  createdAt: Date;
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [channel, setChannel] = useState<Channel | null>(null);
  const [myUserId, setMyUserId] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Use refs to guard connect() so the callback never changes reference
  const connectingRef = useRef(false);
  const connectedRef = useRef(false);

  const connect = useCallback(async () => {
    if (connectedRef.current || connectingRef.current) return;
    connectingRef.current = true;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/stream/token', { credentials: 'include' });
      if (!res.ok) {
        setError(res.status === 401 ? 'Please log in to use support chat.' : 'Could not connect to support.');
        return;
      }
      const { token, apiKey, userId, channelId } = (await res.json()) as {
        token: string; apiKey: string; userId: string; channelId: string;
      };
      if (!apiKey || !token) {
        setError('Support chat is not configured.');
        return;
      }

      const { StreamChat } = await import('stream-chat');
      const client = StreamChat.getInstance(apiKey);
      await client.connectUser({ id: userId }, token);
      setMyUserId(userId);

      const ch = client.channel('messaging', channelId);
      await ch.watch();

      const existing = (ch.state.messages as unknown as MessageResponse[]).map((m) => ({
        id: m.id,
        text: m.text ?? '',
        userId: m.user?.id ?? '',
        createdAt: new Date(m.created_at ?? Date.now()),
      }));
      setMessages(existing);

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

      setChannel(ch);
      connectedRef.current = true;
      setConnected(true);
    } catch (e) {
      console.error('Stream connect failed', e);
      setError('Connection failed. Please try again.');
    } finally {
      connectingRef.current = false;
      setConnecting(false);
    }
  }, []); // stable ref — guards via refs, not state

  useEffect(() => {
    if (open && !connectedRef.current) {
      void connect();
    }
  }, [open, connect]);

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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex w-[360px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl backdrop-blur-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-primary to-accent px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">Support</p>
                  <p className="text-[11px] text-white/70 leading-tight">We're here to help</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                  </span>
                  <span className="text-[11px] text-white/80">Online</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex h-72 flex-col gap-2 overflow-y-auto p-4">
              {connecting && (
                <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting…
                </div>
              )}
              {!connecting && error && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-4">
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <button
                    onClick={() => { setError(null); void connect(); }}
                    className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!connecting && !error && messages.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Hi! How can we help?</p>
                  <p className="text-xs text-muted-foreground">Send a message to get started.</p>
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex flex-col gap-0.5',
                    m.userId === myUserId ? 'items-end' : 'items-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      m.userId === myUserId
                        ? 'rounded-br-sm bg-gradient-to-br from-primary to-accent text-white'
                        : 'rounded-bl-sm bg-muted text-foreground',
                    )}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">
                    {m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 border-t border-border/60 p-3">
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
                className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
                disabled={!connected}
              />
              <button
                onClick={() => void sendMessage()}
                disabled={!connected || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-sm transition-all hover:shadow-md hover:scale-105 disabled:opacity-40 disabled:scale-100"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-primary to-accent px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-primary/30 transition-shadow hover:shadow-primary/50"
        aria-label={open ? 'Close support chat' : 'Open support chat'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="h-4 w-4" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageSquare className="h-4 w-4" />
            </motion.span>
          )}
        </AnimatePresence>
        Support
      </motion.button>
    </div>
  );
}
