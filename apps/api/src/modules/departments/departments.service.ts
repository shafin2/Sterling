import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { DrizzleDb } from '../../database/drizzle.types';
import { departments, employees } from '../../database/schema';
import { and, eq, ilike, count, isNull } from 'drizzle-orm';
import type { CreateDepartmentDto, UpdateDepartmentDto } from '@sterling/shared';

@Injectable()
export class DepartmentsService {
  constructor(@InjectDrizzle() private readonly db: DrizzleDb) {}

  async findAll(tenantId: string) {
    const rows = await this.db
      .select({
        department: departments,
        employeeCount: count(employees.id),
      })
      .from(departments)
      .leftJoin(
        employees,
        and(
          eq(employees.departmentId, departments.id),
          isNull(employees.deletedAt),
          eq(employees.status, 'active'),
        ),
      )
      .where(eq(departments.tenantId, tenantId))
      .groupBy(departments.id);

    return rows.map(({ department, employeeCount }) => ({
      ...department,
      employeeCount,
    }));
  }

  async findOne(tenantId: string, id: string) {
    const [dept] = await this.db
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), eq(departments.tenantId, tenantId)))
      .limit(1);

    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(tenantId: string, dto: CreateDepartmentDto) {
    const [dept] = await this.db
      .insert(departments)
      .values({ ...dto, tenantId })
      .returning();
    return dept;
  }

  async update(tenantId: string, id: string, dto: UpdateDepartmentDto) {
    await this.findOne(tenantId, id);
    const [updated] = await this.db
      .update(departments)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(and(eq(departments.id, id), eq(departments.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.db
      .delete(departments)
      .where(and(eq(departments.id, id), eq(departments.tenantId, tenantId)));
    return { success: true };
  }
}
