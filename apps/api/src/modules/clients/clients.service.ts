import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { DrizzleDb } from '../../database/drizzle.types';
import { clients } from '../../database/schema';
import { and, eq, isNull, ilike, or, sql, desc, count } from 'drizzle-orm';
import type {
  CreateClientDto,
  UpdateClientDto,
  ClientFiltersDto,
} from '@sterling/shared';

@Injectable()
export class ClientsService {
  constructor(@InjectDrizzle() private readonly db: DrizzleDb) {}

  async findAll(tenantId: string, filters: ClientFiltersDto) {
    const { search, status, type, page, limit } = filters;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(clients.tenantId, tenantId),
      isNull(clients.deletedAt),
    ];

    if (search) {
      conditions.push(
        or(
          ilike(clients.name, `%${search}%`),
          ilike(clients.email, `%${search}%`),
          ilike(clients.phone, `%${search}%`),
        )!,
      );
    }
    if (status) conditions.push(eq(clients.status, status));
    if (type) conditions.push(eq(clients.type, type));

    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(clients)
        .where(where)
        .orderBy(desc(clients.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(clients).where(where),
    ]);

    return {
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const [client] = await this.db
      .select()
      .from(clients)
      .where(
        and(eq(clients.id, id), eq(clients.tenantId, tenantId), isNull(clients.deletedAt)),
      )
      .limit(1);

    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async create(tenantId: string, dto: CreateClientDto) {
    const [client] = await this.db
      .insert(clients)
      .values({ ...dto, tenantId })
      .returning();
    return client;
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(tenantId, id);
    const [updated] = await this.db
      .update(clients)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.db
      .update(clients)
      .set({ deletedAt: new Date(), updatedAt: new Date() } as any)
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)));
    return { success: true };
  }

  async bulkDelete(tenantId: string, ids: string[]) {
    await this.db
      .update(clients)
      .set({ deletedAt: new Date(), updatedAt: new Date() } as any)
      .where(
        and(
          eq(clients.tenantId, tenantId),
          sql`${clients.id} = ANY(${ids})`,
          isNull(clients.deletedAt),
        ),
      );
    return { success: true, count: ids.length };
  }

  async importCsv(tenantId: string, rows: CreateClientDto[]) {
    const results = { created: 0, errors: [] as { row: number; error: string }[] };

    for (let i = 0; i < rows.length; i++) {
      try {
        await this.create(tenantId, rows[i]!);
        results.created++;
      } catch (err: any) {
        results.errors.push({ row: i + 1, error: err?.message ?? 'Unknown error' });
      }
    }

    return results;
  }
}
