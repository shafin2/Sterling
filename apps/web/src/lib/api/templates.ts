import ky from 'ky';
import type { TemplateLayout } from '@sterling/shared';

export interface Template {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  layout: TemplateLayout;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const api = ky.create({ prefixUrl: '/api/v1', credentials: 'include' });

export const templatesApi = {
  list: (): Promise<Template[]> =>
    api.get('templates').json(),

  get: (id: string): Promise<Template> =>
    api.get(`templates/${id}`).json(),

  create: (data: { name: string; description?: string; layout: TemplateLayout; isDefault?: boolean }): Promise<Template> =>
    api.post('templates', { json: data }).json(),

  update: (id: string, data: { name?: string; description?: string; layout?: TemplateLayout; isDefault?: boolean }): Promise<Template> =>
    api.patch(`templates/${id}`, { json: data }).json(),

  clone: (id: string): Promise<Template> =>
    api.post(`templates/${id}/clone`).json(),

  setDefault: (id: string): Promise<Template> =>
    api.post(`templates/${id}/set-default`).json(),

  delete: (id: string) =>
    api.delete(`templates/${id}`),
};
