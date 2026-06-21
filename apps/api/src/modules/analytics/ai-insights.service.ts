import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

export interface PayrollInsight {
  summary: string;
  highlights: string[];
  recommendation: string;
  generatedAt: string;
}

@Injectable()
export class AiInsightsService {
  private readonly logger = new Logger(AiInsightsService.name);
  private readonly groq: Groq | null = null;

  constructor(private readonly config: ConfigService) {
    const key = config.get<string>('GROQ_API_KEY');
    if (key) {
      this.groq = new Groq({ apiKey: key });
    }
  }

  async generatePayrollInsights(data: {
    currentMonth: string;
    currentNet: number;
    lastNet: number;
    ytdNet: number;
    processedMonths: number;
    employeeCount: number;
    currency: string;
  }): Promise<PayrollInsight> {
    const fallback: PayrollInsight = {
      summary: 'AI insights are not configured. Add GROQ_API_KEY to enable this feature.',
      highlights: [],
      recommendation: '',
      generatedAt: new Date().toISOString(),
    };

    if (!this.groq) return fallback;

    const trendPct = data.lastNet > 0
      ? ((data.currentNet - data.lastNet) / data.lastNet * 100).toFixed(1)
      : null;

    const fmt = (n: number) =>
      (n / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const prompt = `You are a financial analyst assistant for Sterling, a payroll & invoicing SaaS.

Payroll data for ${data.currentMonth}:
- Current month net payroll: ${data.currency} ${fmt(data.currentNet)}
- Previous month net payroll: ${data.currency} ${fmt(data.lastNet)}
- Month-over-month change: ${trendPct !== null ? `${trendPct}%` : 'N/A (first run)'}
- YTD total net payroll: ${data.currency} ${fmt(data.ytdNet)}
- Months processed this year: ${data.processedMonths}
- Active employees: ${data.employeeCount}

Write a concise payroll insight report. Return ONLY valid JSON matching this schema exactly:
{
  "summary": "2-3 sentence executive summary of the payroll situation",
  "highlights": ["bullet 1", "bullet 2", "bullet 3"],
  "recommendation": "1 actionable recommendation for next month"
}

Be specific with numbers. Keep each highlight under 15 words. Return raw JSON only, no markdown.`;

    try {
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
        temperature: 0.4,
      });

      const text = completion.choices[0]?.message?.content ?? '';
      const parsed = JSON.parse(text) as PayrollInsight;
      return { ...parsed, generatedAt: new Date().toISOString() };
    } catch (err) {
      this.logger.warn('Groq AI insights failed', err);
      return {
        summary: `Payroll for ${data.currentMonth}: ${data.currency} ${fmt(data.currentNet)} net across ${data.employeeCount} employees.${trendPct !== null ? ` ${parseFloat(trendPct) >= 0 ? '+' : ''}${trendPct}% vs last month.` : ''}`,
        highlights: [
          `Net payroll: ${data.currency} ${fmt(data.currentNet)}`,
          `Active employees: ${data.employeeCount}`,
          `YTD total: ${data.currency} ${fmt(data.ytdNet)} over ${data.processedMonths} month${data.processedMonths !== 1 ? 's' : ''}`,
        ],
        recommendation: 'Review salary structures before the next payroll run.',
        generatedAt: new Date().toISOString(),
      };
    }
  }
}
