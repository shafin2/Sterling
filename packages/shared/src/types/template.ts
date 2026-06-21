export type BlockType =
  | 'header'
  | 'logo'
  | 'divider'
  | 'client-info'
  | 'invoice-meta'
  | 'items-table'
  | 'totals'
  | 'notes'
  | 'terms'
  | 'footer'
  | 'spacer';

export interface HeaderBlockSettings {
  title: string;
  showCompanyName: boolean;
  showInvoiceNumber: boolean;
  showStatus: boolean;
  layout: 'split' | 'centered';
}

export interface LogoBlockSettings {
  alignment: 'left' | 'center' | 'right';
  height: number;
}

export interface DividerBlockSettings {
  thickness: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface ClientInfoBlockSettings {
  label: string;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
}

export interface InvoiceMetaBlockSettings {
  showIssueDate: boolean;
  showDueDate: boolean;
  showCurrency: boolean;
  label: string;
}

export interface ItemsTableBlockSettings {
  showQty: boolean;
  showUnitPrice: boolean;
  alternateRows: boolean;
  headerBgColor: string;
}

export interface TotalsBlockSettings {
  showSubtotal: boolean;
  showTax: boolean;
  showDiscount: boolean;
  showAmountPaid: boolean;
}

export interface NotesBlockSettings {
  label: string;
  customText: string;
}

export interface TermsBlockSettings {
  label: string;
  customText: string;
}

export interface FooterBlockSettings {
  text: string;
  showBranding: boolean;
}

export interface SpacerBlockSettings {
  height: number;
}

export type BlockSettings =
  | HeaderBlockSettings
  | LogoBlockSettings
  | DividerBlockSettings
  | ClientInfoBlockSettings
  | InvoiceMetaBlockSettings
  | ItemsTableBlockSettings
  | TotalsBlockSettings
  | NotesBlockSettings
  | TermsBlockSettings
  | FooterBlockSettings
  | SpacerBlockSettings;

export interface TemplateBlock {
  id: string;
  type: BlockType;
  visible: boolean;
  settings: Record<string, unknown>;
}

export interface TemplateTheme {
  primaryColor: string;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  fontFamily: string;
  paperSize: 'A4' | 'Letter' | 'A5';
}

export interface TemplateLayout {
  version: 1;
  blocks: TemplateBlock[];
  theme: TemplateTheme;
}

export interface InvoiceRenderData {
  number: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  status: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  notes?: string | null;
  terms?: string | null;
  client?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    billingAddress?: string | null;
    billingCity?: string | null;
    billingCountry?: string | null;
  } | null;
  companyName?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  logoUrl?: string | null;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  'header': 'Invoice Header',
  'logo': 'Company Logo',
  'divider': 'Divider',
  'client-info': 'Client Info (Bill To)',
  'invoice-meta': 'Invoice Details',
  'items-table': 'Line Items Table',
  'totals': 'Totals',
  'notes': 'Notes',
  'terms': 'Terms & Conditions',
  'footer': 'Footer',
  'spacer': 'Spacer',
};

export const FONT_OPTIONS: Array<{ label: string; value: string; stack: string }> = [
  { label: 'System Sans', value: 'system', stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" },
  { label: 'Arial', value: 'arial', stack: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'georgia', stack: "Georgia, 'Times New Roman', serif" },
  { label: 'Courier', value: 'courier', stack: "'Courier New', Courier, monospace" },
];

export function getFontStack(fontFamily: string): string {
  return FONT_OPTIONS.find((f) => f.value === fontFamily)?.stack ?? FONT_OPTIONS[0]?.stack ?? 'Inter, sans-serif';
}
