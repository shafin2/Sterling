'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Loader2, Bot } from 'lucide-react';
import { sendChatMessage } from '@/lib/api/ai';
import { cn } from '@/lib/utils';

const SUGGESTED_QUESTIONS = [
  { icon: '📊', text: 'What is my cash flow situation this month?' },
  { icon: '💰', text: 'Which clients owe me the most money?' },
  { icon: '📈', text: 'How does my revenue compare to last quarter?' },
  { icon: '👥', text: 'Give me a payroll expense summary' },
  { icon: '⚠️', text: 'Which invoices are overdue and need follow-up?' },
  { icon: '💡', text: 'What can I do to improve my cash flow?' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  followUps?: string[];
}

export default function AiPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const chatMutation = useMutation({
    mutationFn: (msgs: Array<{ role: string; content: string }>) =>
      sendChatMessage(msgs),
    onSuccess: (data, variables) => {
      const lastUser = variables[variables.length - 1];
      setMessages((prev) => {
        // Remove the optimistic user message (already added) and add both user + AI reply
        const withoutOptimistic = prev.filter((m) => m.role !== 'user' || m.content !== lastUser.content || prev.indexOf(m) !== prev.length - 1);
        return [
          ...withoutOptimistic,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: data.reply,
            followUps: data.suggestedFollowUps,
          },
        ];
      });
    },
  });

  const scrollToBottom = React.useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, []);

  const sendMessage = React.useCallback(
    (text: string) => {
      if (!text.trim() || chatMutation.isPending) return;

      const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text.trim() };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput('');
      scrollToBottom();

      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      chatMutation.mutate(apiMessages);
      scrollToBottom();
    },
    [messages, chatMutation, scrollToBottom],
  );

  React.useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-full flex-col max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border pb-5 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Sterling AI</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your AI financial advisor — ask anything about your business</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => { setMessages([]); setInput(''); }}
            className="ml-auto rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            New chat
          </button>
        )}
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-5 pb-6 pr-1"
      >
        {/* Suggested questions — shown when empty */}
        {messages.length === 0 && !chatMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pt-2"
          >
            <div className="text-center space-y-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 mx-auto">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-semibold text-foreground">What would you like to know?</p>
              <p className="text-sm text-muted-foreground">Ask about your finances, invoices, payroll, or clients.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <motion.button
                  key={q.text}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -2 }}
                  onClick={() => sendMessage(q.text)}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left',
                    'transition-all hover:border-accent/50 hover:bg-surface hover:shadow-md',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  )}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{q.icon}</span>
                  <span className="text-sm font-medium text-foreground leading-snug">{q.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {message.role === 'assistant' && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent mt-0.5 shadow-sm">
                  <Bot className="h-5 w-5 text-white" />
                </div>
              )}
              <div className={cn('max-w-[78%] space-y-2', message.role === 'user' ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-accent text-white rounded-tr-sm shadow-sm'
                      : 'bg-surface border border-border text-foreground rounded-tl-sm',
                  )}
                >
                  {message.content}
                </div>
                {/* Follow-up suggestion chips */}
                {message.role === 'assistant' && message.followUps && message.followUps.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {message.followUps.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className={cn(
                          'rounded-full border border-accent/30 bg-accent/5 px-3.5 py-1.5 text-xs font-medium text-accent',
                          'transition-all hover:bg-accent hover:text-white hover:border-accent',
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {chatMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-sm">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-surface border border-border px-5 py-3.5">
              <div className="flex gap-1.5 items-center">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                    className="h-2 w-2 rounded-full bg-accent"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border pt-5">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances…"
            rows={2}
            className={cn(
              'flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3.5 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent',
              'transition-all leading-relaxed',
            )}
          />
          <button
            type="button"
            disabled={!input.trim() || chatMutation.isPending}
            onClick={() => sendMessage(input)}
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              'bg-gradient-to-br from-primary to-accent text-white shadow-sm',
              'transition-all hover:shadow-md hover:shadow-primary/30 hover:scale-105',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            {chatMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground text-center">
          Sterling AI may make mistakes. Verify important financial decisions independently.
        </p>
      </div>
    </div>
  );
}
