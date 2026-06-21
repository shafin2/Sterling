import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DATABASE_TOKEN } from '../../database/database.module';
import * as schema from '../../database/schema';
import type * as schemaTypes from '../../database/schema';

@Injectable()
export class TenantsService {
  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly db: NodePgDatabase<typeof schemaTypes>,
  ) {}

  async findById(id: string) {
    const tenant = await this.db.query.tenants.findFirst({
      where: eq(schema.tenants.id, id),
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async getUserTenants(userId: string) {
    const memberships = await this.db.query.memberships.findMany({
      where: eq(schema.memberships.userId, userId),
      with: { tenant: true } as never,
    });
    return memberships;
  }

  async updateTenant(id: string, data: Partial<typeof schema.tenants.$inferInsert>) {
    const [updated] = await this.db
      .update(schema.tenants)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(schema.tenants.id, id))
      .returning();
    if (!updated) throw new NotFoundException('Tenant not found');
    return updated;
  }
}
