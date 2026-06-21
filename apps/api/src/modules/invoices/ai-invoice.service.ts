import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface AiGeneratedInvoice {
  clientHint: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}

const SYSTEM_PROMPT = `You are a billing assistant for Sterling, an invoice & payroll platform.
The user will describe an invoice in natural language. Extract structured data and return ONLY valid JSON matching this schema:
{
  "clientHint": "string — client name or description the user mentioned",
  "issueDate": "YYYY-MM-DD (today if not stated)",
  "dueDate": "YYYY-MM-DD (typically 30 days from issue unless stated)",
  "notes": "optional string",
  "items": [
    { "description": "string", "quantity": number, "unitPrice": number }
  ]
}

CRITICAL: unitPrice must be in MINOR UNITS (smallest currency unit, integer only).
- USD/GBP/EUR: multiply by 100. Example: $50.00 → 5000
- PKR: multiply by 100. Example: PKR 5,000 → 500000
- AED: multiply by 100. Example: AED 200 → 20000
Real examples:
  "40 hours at PKR 5,000/hr"    → quantity: 40, unitPrice: 500000
  "web dev 20 hrs at $75/hr"    → quantity: 20, unitPrice: 7500
  "hosting setup PKR 15,000"    → quantity: 1,  unitPrice: 1500000

Do not include currency symbols. Do not include markdown. Return raw JSON only.`;

@Injectable()
export class AiInvoiceService {
  private readonly client: Anthropic | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  async generateFromPrompt(prompt: string): Promise<AiGeneratedInvoice> {
    if (!this.client) {
      throw new BadRequestException('AI invoice generation is not configured (missing ANTHROPIC_API_KEY)');
    }
    if (!prompt?.trim()) {
      throw new BadRequestException('Prompt is required');
    }

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt.trim() }],
    });

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    try {
      const parsed = JSON.parse(text) as AiGeneratedInvoice;
      if (!parsed.items?.length) throw new Error('No items');
      // Ensure minor units are integers
      parsed.items = parsed.items.map((item) => ({
        description: item.description,
        quantity: Math.max(1, Math.round(item.quantity)),
        unitPrice: Math.max(0, Math.round(item.unitPrice)),
      }));
      return parsed;
    } catch {
      throw new BadRequestException('AI returned an unparseable response. Please rephrase your prompt.');
    }
  }
}
