import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { DrizzleDb } from '../../database/drizzle.types';
import { employees, salaryStructures, departments } from '../../database/schema';
import { and, eq, isNull, ilike, or, sql, desc, count } from 'drizzle-orm';
import type {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeFiltersDto,
  CreateSalaryStructureDto,
} from '@sterling/shared';

@Injectable()
export class EmployeesService {
  constructor(@InjectDrizzle() private readonly db: DrizzleDb) {}

  async findAll(tenantId: string, filters: EmployeeFiltersDto) {
    const { search, status, departmentId, page, limit } = filters;
    const offset = (page - 1) * limit;

    const conditions = [
      eq(employees.tenantId, tenantId),
      isNull(employees.deletedAt),
    ];

    if (search) {
      conditions.push(
        or(
          ilike(employees.firstName, `%${search}%`),
          ilike(employees.lastName, `%${search}%`),
          ilike(employees.email, `%${search}%`),
          ilike(employees.code, `%${search}%`),
        )!,
      );
    }
    if (status) conditions.push(eq(employees.status, status));
    if (departmentId) conditions.push(eq(employees.departmentId, departmentId));

    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          employee: employees,
          department: { id: departments.id, name: departments.name },
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(where)
        .orderBy(desc(employees.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ total: count() }).from(employees).where(where),
    ]);

    return {
      data: rows.map(({ employee, department }) => ({ ...employee, department })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(tenantId: string, id: string) {
    const [row] = await this.db
      .select({
        employee: employees,
        department: { id: departments.id, name: departments.name },
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(eq(employees.id, id), eq(employees.tenantId, tenantId), isNull(employees.deletedAt)),
      )
      .limit(1);

    if (!row) throw new NotFoundException('Employee not found');
    return { ...row.employee, department: row.department };
  }

  async create(tenantId: string, dto: CreateEmployeeDto) {
    const existing = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.code, dto.code),
          isNull(employees.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(`Employee code "${dto.code}" already exists`);
    }

    const [employee] = await this.db
      .insert(employees)
      .values({ ...dto, tenantId })
      .returning();
    return employee;
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(tenantId, id);

    if (dto.code) {
      const conflict = await this.db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.code, dto.code),
            isNull(employees.deletedAt),
            sql`${employees.id} != ${id}`,
          ),
        )
        .limit(1);

      if (conflict.length > 0) {
        throw new ConflictException(`Employee code "${dto.code}" already exists`);
      }
    }

    const [updated] = await this.db
      .update(employees)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
      .returning();
    return updated;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.db
      .update(employees)
      .set({ deletedAt: new Date(), updatedAt: new Date() } as any)
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)));
    return { success: true };
  }

  // ─── Salary Structures ────────────────────────────────────────

  async getSalaryHistory(tenantId: string, employeeId: string) {
    await this.findOne(tenantId, employeeId);
    return this.db
      .select()
      .from(salaryStructures)
      .where(
        and(
          eq(salaryStructures.employeeId, employeeId),
          eq(salaryStructures.tenantId, tenantId),
        ),
      )
      .orderBy(desc(salaryStructures.effectiveDate));
  }

  async getCurrentSalary(tenantId: string, employeeId: string) {
    const [structure] = await this.db
      .select()
      .from(salaryStructures)
      .where(
        and(
          eq(salaryStructures.employeeId, employeeId),
          eq(salaryStructures.tenantId, tenantId),
          eq(salaryStructures.isCurrent, true),
        ),
      )
      .limit(1);
    return structure ?? null;
  }

  async upsertSalaryStructure(
    tenantId: string,
    employeeId: string,
    dto: CreateSalaryStructureDto,
  ) {
    await this.findOne(tenantId, employeeId);

    // Unset previous current
    await this.db
      .update(salaryStructures)
      .set({ isCurrent: false } as any)
      .where(
        and(
          eq(salaryStructures.employeeId, employeeId),
          eq(salaryStructures.tenantId, tenantId),
          eq(salaryStructures.isCurrent, true),
        ),
      );

    const allowances = dto.allowances as Array<{ name: string; amount: number }>;
    const deductions = dto.deductions as Array<{ name: string; amount: number }>;

    const [structure] = await this.db
      .insert(salaryStructures)
      .values({
        tenantId,
        employeeId,
        effectiveDate: dto.effectiveDate,
        basicSalary: dto.basicSalary,
        allowances,
        deductions,
        isCurrent: true,
      } as any)
      .returning();

    return structure;
  }
}
