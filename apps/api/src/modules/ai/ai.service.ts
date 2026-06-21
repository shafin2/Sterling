import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { DrizzleDb } from '../../database/drizzle.types';
import { invoices, employees, clients } from '../../database/schema';
import { and, eq, count, sql, isNull } from 'drizzle-orm';

type AssistAction = 'beautify' | 'grammar' | 'formal' | 'casual' | 'expand' | 'shorten';

const ACTION_PROMPTS: Record<AssistAction, string> = {
  beautify: 'Improve the writing quality, clarity and flow of this text. Keep the same meaning. Return only the improved text, no explanation.',
  grammar: 'Fix all grammar, spelling, and punctuation errors. Keep the same meaning and style. Return only the corrected text, no explanation.',
  formal: 'Rewrite this text in a professional, formal business tone. Return only the rewritten text, no explanation.',
  casual: 'Rewrite this text in a friendly, conversational tone. Return only the rewritten text, no explanation.',
  expand: 'Expand this text with more detail and context. Maintain the same topic. Return only the expanded text, no explanation.',
  shorten: 'Shorten this text to its essential points. Keep the key message. Return only the shortened text, no explanation.',
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly groq: Groq | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectDrizzle() private readonly db: DrizzleDb,
  ) {
    const key = config.get<string>('GROQ_API_KEY');
    if (key) {
      this.groq = new Groq({ apiKey: key });
    }
  }

  async assistText(params: {
    text: string;
    action: AssistAction;
    tenantId: string;
  }): Promise<{ result: string }> {
    if (!this.groq) {
      return { result: params.text };
    }

    const systemPrompt = ACTION_PROMPTS[params.action] ?? ACTION_PROMPTS.beautify;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: params.text },
        ],
        max_tokens: 1000,
        temperature: 0.4,
      });

      const result = completion.choices[0]?.message?.content?.trim() ?? params.text;
      return { result };
    } catch (err) {
      this.logger.warn('Groq assist failed', err);
      return { result: params.text };
    }
  }

  async chat(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    tenantId: string;
  }): Promise<{ reply: string; suggestedFollowUps: string[] }> {
    const fallbackReply = this.groq
      ? 'I encountered an error processing your request. Please try again.'
      : 'AI chat is not configured. Please add GROQ_API_KEY to enable this feature.';

    // Fetch financial context
    const context = await this.getFinancialContext(params.tenantId);

    if (!this.groq) {
      return { reply: fallbackReply, suggestedFollowUps: [] };
    }

    const systemPrompt = `You are Sterling AI, an expert financial advisor assistant embedded in a business invoicing and payroll platform.

Current business financial snapshot:
${context}

Answer questions about finances, invoice management, payroll, cash flow, and business insights.
Be concise, data-driven, and actionable. Format currency numbers clearly with the currency code.
Do not make up data beyond what is provided above.

At the end of every response, append exactly this line (replace with 3 relevant short questions):
FOLLOWUPS:["question 1","question 2","question 3"]`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...params.messages,
        ],
        max_tokens: 800,
        temperature: 0.5,
      });

      const fullText = completion.choices[0]?.message?.content?.trim() ?? '';

      // Parse FOLLOWUPS line
      const followupsMatch = fullText.match(/FOLLOWUPS:(\[.*?\])/s);
      let suggestedFollowUps: string[] = [];
      let reply = fullText;

      if (followupsMatch) {
        try {
          suggestedFollowUps = JSON.parse(followupsMatch[1]) as string[];
        } catch {
          suggestedFollowUps = [];
        }
        reply = fullText.replace(/FOLLOWUPS:\[.*?\]/s, '').trim();
      }

      return { reply, suggestedFollowUps };
    } catch (err) {
      this.logger.warn('Groq chat failed', err);
      return { reply: fallbackReply, suggestedFollowUps: [] };
    }
  }

  private async getFinancialContext(tenantId: string): Promise<string> {
    try {
      const [invoiceStats, employeeCount, clientCount] = await Promise.all([
        this.db
          .select({
            status: invoices.status,
            count: count(),
            total: sql<string>`coalesce(sum(total), 0)`,
          })
          .from(invoices)
          .where(eq(invoices.tenantId, tenantId))
          .groupBy(invoices.status)
          .catch(() => []),

        this.db
          .select({ count: count() })
          .from(employees)
          .where(and(eq(employees.tenantId, tenantId), eq(employees.status, 'active')))
          .then((r) => r[0]?.count ?? 0)
          .catch(() => 0),

        this.db
          .select({ count: count() })
          .from(clients)
          .where(and(eq(clients.tenantId, tenantId), eq(clients.status, 'active'), isNull(clients.deletedAt)))
          .then((r) => r[0]?.count ?? 0)
          .catch(() => 0),
      ]);

      const paid = invoiceStats.find((s) => s.status === 'paid');
      const sent = invoiceStats.find((s) => s.status === 'sent');
      const overdue = invoiceStats.find((s) => s.status === 'overdue');
      const draft = invoiceStats.find((s) => s.status === 'draft');

      const totalRevenue = paid ? Math.round(Number(paid.total) / 100) : 0;

      return [
        `- Total invoices: ${invoiceStats.reduce((s, r) => s + Number(r.count), 0)}`,
        `  - Paid: ${paid?.count ?? 0} (Total revenue collected: PKR ${totalRevenue.toLocaleString()})`,
        `  - Pending/Sent: ${sent?.count ?? 0}`,
        `  - Overdue: ${overdue?.count ?? 0}`,
        `  - Draft: ${draft?.count ?? 0}`,
        `- Active employees: ${employeeCount}`,
        `- Active clients: ${clientCount}`,
      ].join('\n');
    } catch (err) {
      this.logger.warn('Failed to fetch financial context', err);
      return '- Financial data unavailable at this time.';
    }
  }
}
