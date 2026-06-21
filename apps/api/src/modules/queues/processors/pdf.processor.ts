import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QUEUE_PDF } from '../queues.module';
import { StorageService } from '../../storage/storage.service';
import { InjectDrizzle } from '../../../database/drizzle.decorator';
import type { DrizzleDb } from '../../../database/drizzle.types';
import { invoices, invoiceItems, clients, tenants, invoiceTemplates, payslips, employees, departments, payrollRuns } from '../../../database/schema';
import { eq, and } from 'drizzle-orm';
import { renderInvoiceToHtml, renderPayslipToHtml, type InvoiceRenderData, type TemplateLayout, type PayslipRenderData } from '@sterling/shared';

export interface PdfJob {
  type: 'invoice' | 'payslip';
  resourceId: string;
  tenantId: string;
}

const CLASSIC_LAYOUT: TemplateLayout = {
  version: 1,
  theme: {
    primaryColor: '#3D52A0',
    accentColor: '#7091E6',
    textColor: '#1a1a2e',
    mutedColor: '#8697C4',
    borderColor: '#ADBBDA',
    fontFamily: 'system',
    paperSize: 'A4',
  },
  blocks: [
    { id: 'header', type: 'header', visible: true, settings: { title: 'INVOICE', showCompanyName: true, showInvoiceNumber: true, showStatus: true, layout: 'split' } },
    { id: 'spacer1', type: 'spacer', visible: true, settings: { height: 8 } },
    { id: 'client-info', type: 'client-info', visible: true, settings: { label: 'Bill To', showEmail: true, showPhone: false, showAddress: true } },
    { id: 'invoice-meta', type: 'invoice-meta', visible: true, settings: { label: 'Invoice Details', showIssueDate: true, showDueDate: true, showCurrency: false } },
    { id: 'divider1', type: 'divider', visible: true, settings: { thickness: 1, color: '', style: 'solid' } },
    { id: 'items-table', type: 'items-table', visible: true, settings: { showQty: true, showUnitPrice: true, alternateRows: true, headerBgColor: '#3D52A0' } },
    { id: 'spacer2', type: 'spacer', visible: true, settings: { height: 8 } },
    { id: 'totals', type: 'totals', visible: true, settings: { showSubtotal: true, showTax: true, showDiscount: true, showAmountPaid: true } },
    { id: 'spacer3', type: 'spacer', visible: true, settings: { height: 16 } },
    { id: 'notes', type: 'notes', visible: true, settings: { label: 'Notes', customText: '' } },
    { id: 'terms', type: 'terms', visible: true, settings: { label: 'Terms & Conditions', customText: '' } },
    { id: 'spacer4', type: 'spacer', visible: true, settings: { height: 24 } },
    { id: 'footer', type: 'footer', visible: true, settings: { text: 'Thank you for your business!', showBranding: true } },
  ],
};

@Injectable()
@Processor(QUEUE_PDF)
export class PdfProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfProcessor.name);

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDb,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<PdfJob>): Promise<void> {
    const { type, resourceId, tenantId } = job.data;
    this.logger.log(`PDF job ${job.id} — ${type} ${resourceId}`);

    if (type === 'invoice') {
      await this.generateInvoicePdf(resourceId, tenantId);
    } else if (type === 'payslip') {
      await this.generatePayslipPdf(resourceId, tenantId);
    }
  }

  private async generateInvoicePdf(invoiceId: string, tenantId: string): Promise<void> {
    const [row] = await this.db
      .select({ invoice: invoices, client: clients, tenant: tenants })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(tenants, eq(invoices.tenantId, tenants.id))
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      this.logger.error(`Invoice ${invoiceId} not found for PDF generation`);
      return;
    }

    const items = await this.db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId))
      .orderBy(invoiceItems.sortOrder);

    // Resolve template layout
    let layout: TemplateLayout = CLASSIC_LAYOUT;
    if (row.invoice.templateId) {
      const [tmpl] = await this.db
        .select()
        .from(invoiceTemplates)
        .where(and(eq(invoiceTemplates.id, row.invoice.templateId), eq(invoiceTemplates.tenantId, tenantId)))
        .limit(1);
      if (tmpl) layout = tmpl.layout as TemplateLayout;
    } else {
      const [defaultTmpl] = await this.db
        .select()
        .from(invoiceTemplates)
        .where(and(eq(invoiceTemplates.tenantId, tenantId), eq(invoiceTemplates.isDefault, true)))
        .limit(1);
      if (defaultTmpl) layout = defaultTmpl.layout as TemplateLayout;
    }

    // Resolve logo: base64 data URLs are used directly; MinIO object paths get a presigned URL
    let logoUrl: string | undefined;
    try {
      if (row.tenant?.logo) {
        const logo = row.tenant.logo;
        logoUrl = logo.startsWith('data:')
          ? logo
          : await this.storage.getPresignedUrl(logo).catch(() => undefined);
      }
    } catch { /* logo is optional */ }

    const data: InvoiceRenderData = {
      number: row.invoice.number,
      issueDate: row.invoice.issueDate,
      dueDate: row.invoice.dueDate,
      currency: row.invoice.currency,
      status: row.invoice.status,
      subtotal: row.invoice.subtotal,
      taxRate: row.invoice.taxRate,
      taxAmount: row.invoice.taxAmount,
      discountAmount: row.invoice.discountAmount,
      total: row.invoice.total,
      amountPaid: row.invoice.amountPaid,
      notes: row.invoice.notes,
      terms: row.invoice.terms,
      companyName: row.tenant?.name ?? 'Your Company',
      logoUrl,
      client: row.client
        ? {
            name: row.client.name,
            email: row.client.email,
            phone: row.client.phone,
            billingAddress: row.client.billingAddress,
            billingCity: row.client.billingCity,
            billingCountry: row.client.billingCountry,
          }
        : null,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        amount: i.amount,
      })),
    };

    const html = renderInvoiceToHtml(layout, data);

    let puppeteer: import('puppeteer').PuppeteerNode | undefined;
    try {
      const mod = await import('puppeteer');
      puppeteer = mod.default as unknown as import('puppeteer').PuppeteerNode;
    } catch {
      this.logger.warn('Puppeteer not installed — skipping PDF generation');
      return;
    }
    if (!puppeteer) return;

    const execPath = this.config.get<string>('PUPPETEER_EXECUTABLE_PATH');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: execPath || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const format = (layout.theme.paperSize === 'Letter' ? 'Letter' : 'A4') as 'A4' | 'Letter';
      const pdf = await page.pdf({ format, printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });

      const objectPath = `invoices/${tenantId}/${invoiceId}.pdf`;
      await this.storage.uploadBuffer(objectPath, Buffer.from(pdf), 'application/pdf');

      await this.db
        .update(invoices)
        .set({ pdfPath: objectPath, updatedAt: new Date() } as any)
        .where(eq(invoices.id, invoiceId));

      this.logger.log(`PDF stored at ${objectPath}`);
    } finally {
      await browser.close();
    }
  }

  private async generatePayslipPdf(slipId: string, tenantId: string): Promise<void> {
    // Load payslip + employee + department + tenant
    const [row] = await this.db
      .select({
        payslip: payslips,
        employee: employees,
        department: { name: departments.name },
        tenant: { name: tenants.name, logo: tenants.logo },
      })
      .from(payslips)
      .leftJoin(employees, eq(payslips.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(tenants, eq(payslips.tenantId, tenants.id))
      .where(and(eq(payslips.id, slipId), eq(payslips.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      this.logger.error(`Payslip ${slipId} not found for PDF generation`);
      return;
    }

    // Load payroll run for period
    const [run] = await this.db
      .select({ periodMonth: payrollRuns.periodMonth, periodYear: payrollRuns.periodYear })
      .from(payrollRuns)
      .where(eq(payrollRuns.id, row.payslip.payrollRunId))
      .limit(1);

    let logoUrl: string | undefined;
    try {
      if (row.tenant?.logo) {
        const logo = row.tenant.logo;
        logoUrl = logo.startsWith('data:')
          ? logo
          : await this.storage.getPresignedUrl(logo).catch(() => undefined);
      }
    } catch { /* logo is optional */ }

    type SC = { name: string; amount: number };
    type Adj = { name: string; amount: number; type: 'addition' | 'deduction' };

    const data: PayslipRenderData = {
      employeeCode: row.employee?.code ?? '',
      employeeFirstName: row.employee?.firstName ?? '',
      employeeLastName: row.employee?.lastName ?? '',
      jobTitle: row.employee?.jobTitle ?? null,
      department: row.department?.name ?? null,
      periodMonth: run?.periodMonth ?? 1,
      periodYear: run?.periodYear ?? new Date().getFullYear(),
      companyName: row.tenant?.name ?? 'Your Company',
      logoUrl,
      currency: 'PKR',
      basicSalary: row.payslip.basicSalary,
      allowances: (row.payslip.allowances as SC[]) ?? [],
      deductions: (row.payslip.deductions as SC[]) ?? [],
      bonusAmount: row.payslip.bonusAmount,
      unpaidLeaveDays: row.payslip.unpaidLeaveDays,
      unpaidLeaveDeduction: row.payslip.unpaidLeaveDeduction,
      adjustments: (row.payslip.adjustments as Adj[]) ?? [],
      grossSalary: row.payslip.grossSalary,
      totalDeductions: row.payslip.totalDeductions,
      taxAmount: row.payslip.taxAmount,
      netSalary: row.payslip.netSalary,
    };

    const html = renderPayslipToHtml(data);

    let puppeteer: import('puppeteer').PuppeteerNode | undefined;
    try {
      const mod = await import('puppeteer');
      puppeteer = mod.default as unknown as import('puppeteer').PuppeteerNode;
    } catch {
      this.logger.warn('Puppeteer not installed — skipping payslip PDF generation');
      return;
    }
    if (!puppeteer) return;

    const execPath = this.config.get<string>('PUPPETEER_EXECUTABLE_PATH');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: execPath || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });

      const objectPath = `payslips/${tenantId}/${slipId}.pdf`;
      await this.storage.uploadBuffer(objectPath, Buffer.from(pdf), 'application/pdf');

      await this.db
        .update(payslips)
        .set({ pdfPath: objectPath, updatedAt: new Date() } as any)
        .where(eq(payslips.id, slipId));

      this.logger.log(`Payslip PDF stored at ${objectPath}`);
    } finally {
      await browser.close();
    }
  }
}
