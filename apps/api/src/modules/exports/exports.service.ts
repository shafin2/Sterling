import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { DrizzleDb } from '../../database/drizzle.types';
import {
  invoices, clients, employees, departments, payrollRuns, payslips,
} from '../../database/schema';
import { and, eq, desc, isNull } from 'drizzle-orm';
import type { SalaryComponent } from '../../database/schema';

function toCsvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
}

function amountToDecimal(minor: number): string {
  return (minor / 100).toFixed(2);
}

@Injectable()
export class ExportsService {
  constructor(@InjectDrizzle() private readonly db: DrizzleDb) {}

  // ─── Invoices CSV ────────────────────────────────────────────
  async exportInvoicesCsv(tenantId: string): Promise<string> {
    const rows = await this.db
      .select({ invoice: invoices, clientName: clients.name })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(eq(invoices.tenantId, tenantId))
      .orderBy(desc(invoices.createdAt));

    const header = toCsvRow([
      'Invoice Number', 'Client', 'Issue Date', 'Due Date', 'Currency',
      'Status', 'Subtotal', 'Tax', 'Discount', 'Total', 'Amount Paid', 'Balance Due',
    ]);

    const lines = rows.map(({ invoice, clientName }) =>
      toCsvRow([
        invoice.number,
        clientName ?? '',
        invoice.issueDate,
        invoice.dueDate,
        invoice.currency,
        invoice.status,
        amountToDecimal(invoice.subtotal),
        amountToDecimal(invoice.taxAmount),
        amountToDecimal(invoice.discountAmount),
        amountToDecimal(invoice.total),
        amountToDecimal(invoice.amountPaid),
        amountToDecimal(invoice.total - invoice.amountPaid),
      ]),
    );

    return [header, ...lines].join('\n');
  }

  // ─── Clients CSV ─────────────────────────────────────────────
  async exportClientsCsv(tenantId: string): Promise<string> {
    const rows = await this.db
      .select()
      .from(clients)
      .where(and(eq(clients.tenantId, tenantId), isNull(clients.deletedAt)))
      .orderBy(clients.name);

    const header = toCsvRow([
      'Name', 'Type', 'Email', 'Phone', 'Currency', 'Tax ID',
      'Billing City', 'Billing Country', 'Status',
    ]);

    const lines = rows.map((c) =>
      toCsvRow([
        c.name, c.type, c.email, c.phone, c.currency, c.taxId,
        c.billingCity, c.billingCountry, c.status,
      ]),
    );

    return [header, ...lines].join('\n');
  }

  // ─── Employees CSV ───────────────────────────────────────────
  async exportEmployeesCsv(tenantId: string): Promise<string> {
    const rows = await this.db
      .select({ employee: employees, dept: departments })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(and(eq(employees.tenantId, tenantId), isNull(employees.deletedAt)))
      .orderBy(employees.firstName);

    const header = toCsvRow([
      'Code', 'First Name', 'Last Name', 'Email', 'Phone',
      'Department', 'Job Title', 'Join Date', 'Status',
    ]);

    const lines = rows.map(({ employee, dept }) =>
      toCsvRow([
        employee.code,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.phone,
        dept?.name ?? '',
        employee.jobTitle,
        employee.joinDate,
        employee.status,
      ]),
    );

    return [header, ...lines].join('\n');
  }

  // ─── Payroll run CSV ─────────────────────────────────────────
  async exportPayrollRunCsv(tenantId: string, runId: string): Promise<string> {
    const [run] = await this.db
      .select()
      .from(payrollRuns)
      .where(and(eq(payrollRuns.id, runId), eq(payrollRuns.tenantId, tenantId)))
      .limit(1);

    if (!run) throw new NotFoundException('Payroll run not found');

    const slips = await this.db
      .select({ payslip: payslips, employee: employees })
      .from(payslips)
      .leftJoin(employees, eq(payslips.employeeId, employees.id))
      .where(and(eq(payslips.payrollRunId, runId), eq(payslips.tenantId, tenantId)))
      .orderBy(employees.firstName);

    const header = toCsvRow([
      'Employee Code', 'First Name', 'Last Name', 'Basic Salary',
      'Allowances', 'Bonus', 'Gross Salary',
      'Deductions', 'Unpaid Leave Deduction', 'Tax',
      'Net Salary', 'Status',
    ]);

    const lines = slips.map(({ payslip, employee }) => {
      const allowancesTotal = (payslip.allowances as SalaryComponent[]).reduce(
        (s, a) => s + a.amount,
        0,
      );
      return toCsvRow([
        employee?.code ?? '',
        employee?.firstName ?? '',
        employee?.lastName ?? '',
        amountToDecimal(payslip.basicSalary),
        amountToDecimal(allowancesTotal),
        amountToDecimal(payslip.bonusAmount),
        amountToDecimal(payslip.grossSalary),
        amountToDecimal(payslip.totalDeductions - payslip.unpaidLeaveDeduction),
        amountToDecimal(payslip.unpaidLeaveDeduction),
        amountToDecimal(payslip.taxAmount),
        amountToDecimal(payslip.netSalary),
        payslip.status,
      ]);
    });

    return [header, ...lines].join('\n');
  }
}
