import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { DrizzleDb } from '../../database/drizzle.types';
import { invoiceTemplates } from '../../database/schema';
import { eq, and } from 'drizzle-orm';
import type { CreateTemplateDto, UpdateTemplateDto, TemplateLayout } from '@sterling/shared';

@Injectable()
export class TemplatesService {
  constructor(@InjectDrizzle() private readonly db: DrizzleDb) {}

  async findAll(tenantId: string) {
    const rows = await this.db
      .select()
      .from(invoiceTemplates)
      .where(and(eq(invoiceTemplates.tenantId, tenantId), eq(invoiceTemplates.isActive, true)))
      .orderBy(invoiceTemplates.createdAt);

    if (rows.length === 0) {
      await this.seedDefaults(tenantId);
      return this.db
        .select()
        .from(invoiceTemplates)
        .where(and(eq(invoiceTemplates.tenantId, tenantId), eq(invoiceTemplates.isActive, true)))
        .orderBy(invoiceTemplates.createdAt);
    }

    return rows;
  }

  async findOne(tenantId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(invoiceTemplates)
      .where(and(eq(invoiceTemplates.id, id), eq(invoiceTemplates.tenantId, tenantId)))
      .limit(1);

    if (!row) throw new NotFoundException('Template not found');
    return row;
  }

  async getDefault(tenantId: string): Promise<(typeof invoiceTemplates.$inferSelect) | null> {
    const [row] = await this.db
      .select()
      .from(invoiceTemplates)
      .where(and(eq(invoiceTemplates.tenantId, tenantId), eq(invoiceTemplates.isDefault, true)))
      .limit(1);

    if (row) return row;

    const [first] = await this.db
      .select()
      .from(invoiceTemplates)
      .where(and(eq(invoiceTemplates.tenantId, tenantId), eq(invoiceTemplates.isActive, true)))
      .limit(1);

    return first ?? null;
  }

  async getLayout(tenantId: string, templateId?: string | null): Promise<TemplateLayout> {
    let template = templateId
      ? await this.findOne(tenantId, templateId).catch(() => null)
      : await this.getDefault(tenantId);

    if (!template) {
      await this.seedDefaults(tenantId);
      template = await this.getDefault(tenantId);
    }

    if (!template) return this.classicLayout();
    return template.layout as TemplateLayout;
  }

  async create(tenantId: string, dto: CreateTemplateDto) {
    if (dto.isDefault) {
      await this.clearDefault(tenantId);
    }

    const [row] = await this.db
      .insert(invoiceTemplates)
      .values({
        tenantId,
        name: dto.name,
        description: dto.description,
        layout: dto.layout as unknown as Record<string, unknown>,
        isDefault: dto.isDefault ?? false,
      } as any)
      .returning();

    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateTemplateDto) {
    await this.findOne(tenantId, id);

    if (dto.isDefault) {
      await this.clearDefault(tenantId);
    }

    const [row] = await this.db
      .update(invoiceTemplates)
      .set({
        ...( dto.name !== undefined && { name: dto.name }),
        ...( dto.description !== undefined && { description: dto.description }),
        ...( dto.layout !== undefined && { layout: dto.layout as unknown as Record<string, unknown> }),
        ...( dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        updatedAt: new Date(),
      } as any)
      .where(and(eq(invoiceTemplates.id, id), eq(invoiceTemplates.tenantId, tenantId)))
      .returning();

    return row;
  }

  async clone(tenantId: string, id: string) {
    const source = await this.findOne(tenantId, id);

    const [row] = await this.db
      .insert(invoiceTemplates)
      .values({
        tenantId,
        name: `${source.name} (Copy)`,
        description: source.description,
        layout: source.layout,
        isDefault: false,
      } as any)
      .returning();

    return row;
  }

  async setDefault(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.clearDefault(tenantId);

    const [row] = await this.db
      .update(invoiceTemplates)
      .set({ isDefault: true, updatedAt: new Date() } as any)
      .where(and(eq(invoiceTemplates.id, id), eq(invoiceTemplates.tenantId, tenantId)))
      .returning();

    return row;
  }

  async remove(tenantId: string, id: string) {
    const template = await this.findOne(tenantId, id);
    if (template.isDefault) {
      throw new BadRequestException('Cannot delete the default template. Set another template as default first.');
    }

    await this.db
      .update(invoiceTemplates)
      .set({ isActive: false, updatedAt: new Date() } as any)
      .where(and(eq(invoiceTemplates.id, id), eq(invoiceTemplates.tenantId, tenantId)));
  }

  private async clearDefault(tenantId: string) {
    await this.db
      .update(invoiceTemplates)
      .set({ isDefault: false, updatedAt: new Date() } as any)
      .where(and(eq(invoiceTemplates.tenantId, tenantId), eq(invoiceTemplates.isDefault, true)));
  }

  async seedDefaults(tenantId: string) {
    const seeds: Array<{ name: string; description: string; layout: TemplateLayout; isDefault: boolean }> = [
      { name: 'Classic Sterling', description: 'Clean blue header with professional layout', layout: this.classicLayout(), isDefault: true },
      { name: 'Midnight Pro', description: 'Dark navy header for a bold, modern look', layout: this.midnightLayout(), isDefault: false },
      { name: 'Minimal', description: 'Ultra-clean, no colored header, typography-first', layout: this.minimalLayout(), isDefault: false },
      { name: 'Emerald', description: 'Fresh green accent, perfect for eco-friendly brands', layout: this.emeraldLayout(), isDefault: false },
    ];

    for (const seed of seeds) {
      await this.db.insert(invoiceTemplates).values({
        tenantId,
        name: seed.name,
        description: seed.description,
        layout: seed.layout as unknown as Record<string, unknown>,
        isDefault: seed.isDefault,
        isActive: true,
      } as any);
    }
  }

  private baseBlocks(headerBg: string): TemplateLayout['blocks'] {
    return [
      { id: 'header', type: 'header', visible: true, settings: { title: 'INVOICE', showCompanyName: true, showInvoiceNumber: true, showStatus: true, layout: 'split' } },
      { id: 'spacer1', type: 'spacer', visible: true, settings: { height: 8 } },
      { id: 'client-info', type: 'client-info', visible: true, settings: { label: 'Bill To', showEmail: true, showPhone: false, showAddress: true } },
      { id: 'invoice-meta', type: 'invoice-meta', visible: true, settings: { label: 'Invoice Details', showIssueDate: true, showDueDate: true, showCurrency: false } },
      { id: 'divider1', type: 'divider', visible: true, settings: { thickness: 1, color: '', style: 'solid' } },
      { id: 'items-table', type: 'items-table', visible: true, settings: { showQty: true, showUnitPrice: true, alternateRows: true, headerBgColor: headerBg } },
      { id: 'spacer2', type: 'spacer', visible: true, settings: { height: 8 } },
      { id: 'totals', type: 'totals', visible: true, settings: { showSubtotal: true, showTax: true, showDiscount: true, showAmountPaid: true } },
      { id: 'spacer3', type: 'spacer', visible: true, settings: { height: 16 } },
      { id: 'notes', type: 'notes', visible: true, settings: { label: 'Notes', customText: '' } },
      { id: 'terms', type: 'terms', visible: true, settings: { label: 'Terms & Conditions', customText: '' } },
      { id: 'spacer4', type: 'spacer', visible: true, settings: { height: 24 } },
      { id: 'footer', type: 'footer', visible: true, settings: { text: 'Thank you for your business!', showBranding: true } },
    ];
  }

  private classicLayout(): TemplateLayout {
    return {
      version: 1,
      theme: { primaryColor: '#3D52A0', accentColor: '#7091E6', textColor: '#1a1a2e', mutedColor: '#8697C4', borderColor: '#ADBBDA', fontFamily: 'system', paperSize: 'A4' },
      blocks: this.baseBlocks('#3D52A0'),
    };
  }

  private midnightLayout(): TemplateLayout {
    return {
      version: 1,
      theme: { primaryColor: '#1a1a2e', accentColor: '#7091E6', textColor: '#1a1a2e', mutedColor: '#6B7280', borderColor: '#E5E7EB', fontFamily: 'system', paperSize: 'A4' },
      blocks: this.baseBlocks('#1a1a2e'),
    };
  }

  private minimalLayout(): TemplateLayout {
    const blocks = this.baseBlocks('#374151');
    return {
      version: 1,
      theme: { primaryColor: '#374151', accentColor: '#6B7280', textColor: '#111827', mutedColor: '#9CA3AF', borderColor: '#E5E7EB', fontFamily: 'arial', paperSize: 'A4' },
      blocks: [
        {
          id: 'header-minimal',
          type: 'header',
          visible: true,
          settings: { title: 'INVOICE', showCompanyName: true, showInvoiceNumber: true, showStatus: true, layout: 'split' },
        },
        ...blocks.slice(1),
      ],
    };
  }

  private emeraldLayout(): TemplateLayout {
    return {
      version: 1,
      theme: { primaryColor: '#2E9E7B', accentColor: '#34D399', textColor: '#1a1a2e', mutedColor: '#6B7280', borderColor: '#D1FAE5', fontFamily: 'system', paperSize: 'A4' },
      blocks: this.baseBlocks('#2E9E7B'),
    };
  }
}
