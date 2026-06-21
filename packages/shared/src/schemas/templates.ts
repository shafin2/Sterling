import { z } from 'zod';

const ThemeSchema = z.object({
  primaryColor: z.string().min(1),
  accentColor: z.string().min(1),
  textColor: z.string().min(1),
  mutedColor: z.string().min(1),
  borderColor: z.string().min(1),
  fontFamily: z.string().min(1),
  paperSize: z.enum(['A4', 'Letter', 'A5']),
});

const BlockSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'header', 'logo', 'divider', 'client-info', 'invoice-meta',
    'items-table', 'totals', 'notes', 'terms', 'footer', 'spacer',
  ]),
  visible: z.boolean(),
  settings: z.record(z.unknown()),
});

const LayoutSchema = z.object({
  version: z.literal(1),
  blocks: z.array(BlockSchema).min(1),
  theme: ThemeSchema,
});

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  layout: LayoutSchema,
  isDefault: z.boolean().optional().default(false),
});

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  layout: LayoutSchema.optional(),
  isDefault: z.boolean().optional(),
});

export type CreateTemplateDto = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateDto = z.infer<typeof UpdateTemplateSchema>;
