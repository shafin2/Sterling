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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Sterling AI</h1>
          <p className="text-xs text-muted">Your AI financial advisor — ask anything about your business</p>
        </div>
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pb-4"
      >
        {/* Suggested questions — shown when empty */}
        {messages.length === 0 && !chatMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <p className="text-sm text-muted text-center pt-4">
              Ask me anything about your finances, invoices, payroll, or clients.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <motion.button
                  key={q.text}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => sendMessage(q.text)}
                  className={cn(
                    'flex flex-col items-start gap-2 rounded-xl border border-border bg-background p-3 text-left',
                    'transition-all hover:border-accent hover:bg-surface hover:shadow-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  )}
                >
                  <span className="text-lg">{q.icon}</span>
                  <span className="text-xs text-foreground leading-snug">{q.text}</span>
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent mt-0.5">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div className={cn('max-w-[80%] space-y-2', message.role === 'user' ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                    message.role === 'user'
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-surface border border-border text-foreground rounded-tl-sm',
                  )}
                >
                  {message.content}
                </div>
                {/* Follow-up suggestion chips */}
                {message.role === 'assistant' && message.followUps && message.followUps.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {message.followUps.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className={cn(
                          'rounded-full border border-border bg-background px-3 py-1 text-xs text-muted',
                          'transition-colors hover:border-accent hover:text-accent hover:bg-surface',
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-surface border border-border px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="h-1.5 w-1.5 rounded-full bg-muted"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border pt-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances… (Enter to send, Shift+Enter for new line)"
            rows={2}
            className={cn(
              'flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm',
              'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent',
              'transition-shadow',
            )}
          />
          <button
            type="button"
            disabled={!input.trim() || chatMutation.isPending}
            onClick={() => sendMessage(input)}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              'bg-primary text-white transition-all hover:bg-accent',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
          >
            {chatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-muted text-center">
          Sterling AI may make mistakes. Verify important financial decisions independently.
        </p>
      </div>
    </div>
  );
}
