import { formatMoney } from './money.js';

export interface PayslipRenderData {
  employeeCode: string;
  employeeFirstName: string;
  employeeLastName: string;
  jobTitle: string | null;
  department: string | null;
  periodMonth: number;
  periodYear: number;
  companyName: string;
  logoUrl?: string;
  currency: string;
  basicSalary: number;
  allowances: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  bonusAmount: number;
  unpaidLeaveDays: number;
  unpaidLeaveDeduction: number;
  adjustments: { name: string; amount: number; type: 'addition' | 'deduction' }[];
  grossSalary: number;
  totalDeductions: number;
  taxAmount: number;
  netSalary: number;
  primaryColor?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmt(amount: number, currency: string): string {
  return formatMoney(amount, currency);
}

export function renderPayslipToHtml(data: PayslipRenderData): string {
  const primary = data.primaryColor ?? '#3D52A0';
  const period = `${MONTH_NAMES[data.periodMonth - 1]} ${data.periodYear}`;
  const employeeName = `${data.employeeFirstName} ${data.employeeLastName}`;

  const earningsRows: string[] = [
    `<tr><td>Basic Salary</td><td class="amt">${fmt(data.basicSalary, data.currency)}</td></tr>`,
    ...data.allowances.map((a) => `<tr><td>${a.name}</td><td class="amt">${fmt(a.amount, data.currency)}</td></tr>`),
    ...(data.bonusAmount > 0 ? [`<tr><td>Bonus</td><td class="amt">${fmt(data.bonusAmount, data.currency)}</td></tr>`] : []),
    ...data.adjustments.filter((a) => a.type === 'addition').map(
      (a) => `<tr><td>${a.name}</td><td class="amt">${fmt(a.amount, data.currency)}</td></tr>`,
    ),
  ];

  const deductionRows: string[] = [
    ...data.deductions.map((d) => `<tr><td>${d.name}</td><td class="amt">${fmt(d.amount, data.currency)}</td></tr>`),
    ...(data.unpaidLeaveDeduction > 0
      ? [`<tr><td>Unpaid Leave (${data.unpaidLeaveDays} day${data.unpaidLeaveDays !== 1 ? 's' : ''})</td><td class="amt">${fmt(data.unpaidLeaveDeduction, data.currency)}</td></tr>`]
      : []),
    ...data.adjustments.filter((a) => a.type === 'deduction').map(
      (a) => `<tr><td>${a.name}</td><td class="amt">${fmt(a.amount, data.currency)}</td></tr>`,
    ),
    ...(data.taxAmount > 0 ? [`<tr><td>Income Tax</td><td class="amt">${fmt(data.taxAmount, data.currency)}</td></tr>`] : []),
  ];

  const logoHtml = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.companyName}" style="max-height:48px;max-width:180px;object-fit:contain;" />`
    : `<div style="font-size:22px;font-weight:800;color:${primary};">${data.companyName}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Salary Slip — ${employeeName} — ${period}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; }
  .page { width: 794px; min-height: 1123px; margin: 0 auto; padding: 48px; display: flex; flex-direction: column; gap: 24px; }

  /* ── Header ── */
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid ${primary}; padding-bottom: 20px; }
  .header-title { font-size: 26px; font-weight: 800; color: ${primary}; letter-spacing: 2px; }
  .header-period { font-size: 13px; color: #8697C4; margin-top: 2px; }
  .header-right { text-align: right; }

  /* ── Info grid ── */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #F5F7FF; border: 1px solid #ADBBDA; border-radius: 10px; padding: 16px; }
  .info-block label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #8697C4; display: block; margin-bottom: 2px; }
  .info-block p { font-size: 13px; color: #1a1a2e; font-weight: 500; }
  .info-block p.sub { font-size: 11px; color: #8697C4; font-weight: 400; }

  /* ── Earnings / Deductions split table ── */
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .section { border: 1px solid #ADBBDA; border-radius: 10px; overflow: hidden; }
  .section-head { background: ${primary}; color: #fff; padding: 9px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
  .section table { width: 100%; border-collapse: collapse; }
  .section table td { padding: 7px 14px; font-size: 12.5px; color: #1a1a2e; border-bottom: 1px solid #EDE8F5; }
  .section table td.amt { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; white-space: nowrap; }
  .section table tr.total td { background: #F5F7FF; font-weight: 700; border-top: 2px solid #ADBBDA; border-bottom: none; font-size: 13px; }
  .section table tr:last-child td { border-bottom: none; }

  /* ── Net payable bar ── */
  .net-bar { background: ${primary}; color: #fff; border-radius: 12px; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; }
  .net-bar .label { font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.85; }
  .net-bar .amount { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }

  /* ── Footer ── */
  .footer { margin-top: auto; border-top: 1px solid #ADBBDA; padding-top: 16px; display: flex; align-items: center; justify-content: space-between; }
  .footer p { font-size: 11px; color: #8697C4; }
  .footer .branding { font-size: 11px; color: #ADBBDA; }

  /* ── Empty rows ── */
  .empty-row td { color: #8697C4; font-style: italic; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      ${logoHtml}
      <div class="header-title" style="margin-top:10px;">SALARY SLIP</div>
      <div class="header-period">Pay Period: ${period}</div>
    </div>
    <div class="header-right">
      <div style="color:#8697C4;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Generated</div>
      <div style="font-size:13px;font-weight:500;">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
    </div>
  </div>

  <!-- Employee info -->
  <div class="info-grid">
    <div class="info-block">
      <label>Employee Name</label>
      <p>${employeeName}</p>
    </div>
    <div class="info-block">
      <label>Employee Code</label>
      <p>${data.employeeCode}</p>
    </div>
    <div class="info-block">
      <label>Job Title</label>
      <p>${data.jobTitle ?? '—'}</p>
    </div>
    <div class="info-block">
      <label>Department</label>
      <p>${data.department ?? '—'}</p>
    </div>
  </div>

  <!-- Earnings & Deductions -->
  <div class="split">
    <!-- Earnings -->
    <div class="section">
      <div class="section-head">Earnings</div>
      <table>
        ${earningsRows.length > 0 ? earningsRows.join('') : '<tr class="empty-row"><td colspan="2">No earnings</td></tr>'}
        <tr class="total">
          <td>Gross Salary</td>
          <td class="amt">${fmt(data.grossSalary, data.currency)}</td>
        </tr>
      </table>
    </div>
    <!-- Deductions -->
    <div class="section">
      <div class="section-head">Deductions</div>
      <table>
        ${deductionRows.length > 0 ? deductionRows.join('') : '<tr class="empty-row"><td colspan="2">No deductions</td></tr>'}
        <tr class="total">
          <td>Total Deductions</td>
          <td class="amt">${fmt(data.totalDeductions, data.currency)}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Net payable -->
  <div class="net-bar">
    <span class="label">Net Payable — ${period}</span>
    <span class="amount">${fmt(data.netSalary, data.currency)}</span>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>This is a computer-generated salary slip. No signature is required.</p>
    <p class="branding">Powered by Sterling</p>
  </div>

</div>
</body>
</html>`;
}
