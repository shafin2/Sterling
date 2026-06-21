import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, desc } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { DrizzleDb } from '../../database/drizzle.types';
import { taxRules } from '../../database/schema';
import type { CreateTaxRuleDto, UpdateTaxRuleDto, TaxRuleFiltersDto } from '@sterling/shared';

@Injectable()
export class TaxRulesService {
  constructor(@InjectDrizzle() private readonly db: DrizzleDb) {}

  async findAll(tenantId: string, filters: TaxRuleFiltersDto) {
    const conditions = [eq(taxRules.tenantId, tenantId)];
    if (filters.isActive !== undefined) conditions.push(eq(taxRules.isActive, filters.isActive));
    if (filters.appliesTo) conditions.push(eq(taxRules.appliesTo, filters.appliesTo));

    const rows = await this.db
      .select()
      .from(taxRules)
      .where(and(...conditions))
      .orderBy(desc(taxRules.createdAt));

    return rows;
  }

  async findOne(tenantId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(taxRules)
      .where(and(eq(taxRules.id, id), eq(taxRules.tenantId, tenantId)))
      .limit(1);
    if (!row) throw new NotFoundException('Tax rule not found');
    return row;
  }

  async getActiveForInvoices(tenantId: string) {
    return this.db
      .select()
      .from(taxRules)
      .where(
        and(
          eq(taxRules.tenantId, tenantId),
          eq(taxRules.isActive, true),
        ),
      )
      .orderBy(taxRules.name);
  }

  async create(tenantId: string, dto: CreateTaxRuleDto) {
    const [created] = await this.db
      .insert(taxRules)
      .values({ tenantId, ...dto } as any)
      .returning();
    return created!;
  }

  async update(tenantId: string, id: string, dto: UpdateTaxRuleDto) {
    await this.findOne(tenantId, id);
    const [updated] = await this.db
      .update(taxRules)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(and(eq(taxRules.id, id), eq(taxRules.tenantId, tenantId)))
      .returning();
    return updated!;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.db
      .delete(taxRules)
      .where(and(eq(taxRules.id, id), eq(taxRules.tenantId, tenantId)));
    return { success: true };
  }
}
