import axiosClient from '../../../shared/utils/axiosConfig';
import type { Dossier } from '../../cnepc/types/auto-ecole';

export interface MesDossiersQuery {
  page?: number;
  per_page?: number;
  numero?: string;
  type_demande_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface MesDossiersResponse {
  data: Dossier[];
  meta?: Record<string, unknown>;
  links?: Record<string, unknown>;
}

async function getMesDossiers(query: MesDossiersQuery = {}): Promise<MesDossiersResponse> {
  const params: MesDossiersQuery & { sort_by: string; sort_order: string } = {
    page: query.page ?? 1,
    per_page: Math.min(100, Math.max(1, query.per_page ?? 15)),
    numero: query.numero?.trim() || undefined,
    type_demande_id: query.type_demande_id?.trim() || undefined,
    date_from: query.date_from || undefined,
    date_to: query.date_to || undefined,
    sort_by: 'created_at',
    sort_order: 'desc',
  };
  const res = await axiosClient.get('/dossiers/historique', { params });
  const payload = (res.data?.data ?? res.data) as unknown;
  if (Array.isArray(payload)) return { data: payload as Dossier[] };
  return {
    data: Array.isArray((payload as { data?: unknown[] })?.data) ? ((payload as { data: Dossier[] }).data) : [],
    meta: (payload as { meta?: Record<string, unknown> })?.meta,
    links: (payload as { links?: Record<string, unknown> })?.links,
  };
}

export const mesDossiersService = {
  getMesDossiers,
};
