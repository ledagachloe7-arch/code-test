import axiosClient from '../../../shared/utils/axiosConfig';
import { referentielService } from '../../cnepc/services/referentiel.service';

const DOSSIERS_SUPPORT_PAGE_SIZE = 300;

const DOSSIERS_SUPPORT_FLAGS: Record<string, string> = {
  all_statuts: 'true',
  all_centres: 'true',
  all_centers: 'true',
};

function getUserRoleFromStorage(): string {
  try {
    const raw = localStorage.getItem('user_data') ?? localStorage.getItem('user');
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { role?: unknown };
    return String(parsed.role ?? '').trim().toUpperCase();
  } catch {
    return '';
  }
}

function canTryGlobalAggregation(role: string): boolean {
  if (!role) return false;
  return (
    role === 'ROLE_ADMIN' ||
    role === 'ADMIN' ||
    role === 'ROLE_CNEPC' ||
    role === 'ROLE_SUPPORT' ||
    role === 'SUPPORT' ||
    role.includes('SUPERADMIN')
  );
}

function parseRowsAndHasMore(
  data: unknown,
  page: number,
  perPage: number,
): { rows: Record<string, unknown>[]; hasMore: boolean } {
  if (Array.isArray(data)) {
    return { rows: data as Record<string, unknown>[], hasMore: false };
  }

  if (!data || typeof data !== 'object') {
    return { rows: [], hasMore: false };
  }

  const obj = data as Record<string, unknown>;
  let inner = obj.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const nested = inner as Record<string, unknown>;
    if (Array.isArray(nested.data)) inner = nested.data;
  }

  const rows = (Array.isArray(inner) ? inner : []) as Record<string, unknown>[];
  const meta = (obj.meta ?? {}) as Record<string, unknown>;

  const lastPage = Number(meta.last_page);
  if (Number.isFinite(lastPage) && lastPage > 0) {
    return { rows, hasMore: page < lastPage };
  }

  const total = Number(meta.total);
  const metaPerPage = Number(meta.per_page);
  const effectivePerPage = Number.isFinite(metaPerPage) && metaPerPage > 0 ? metaPerPage : perPage;
  if (Number.isFinite(total) && total >= 0 && effectivePerPage > 0) {
    const computedLastPage = Math.max(1, Math.ceil(total / effectivePerPage));
    return { rows, hasMore: page < computedLastPage };
  }

  const links = (obj.links ?? {}) as Record<string, unknown>;
  const next = links.next;
  if (next != null && String(next).trim() && String(next).toLowerCase() !== 'null') {
    return { rows, hasMore: true };
  }

  return { rows, hasMore: rows.length >= perPage };
}

/**
 * Récupère tous les dossiers du backend, sans filtre de date, toutes pages confondues.
 */
export async function getAllCreatedDossiers(): Promise<Record<string, unknown>[]> {
  const fetchAllDossiersWithParams = async (
    extraParams: Record<string, string | number> = {},
  ): Promise<Record<string, unknown>[]> => {
    const perPage = DOSSIERS_SUPPORT_PAGE_SIZE;
    const rowsAcc: Record<string, unknown>[] = [];
    let page = 1;
    for (;;) {
      const res = await axiosClient.get('/dossiers', {
        params: {
          page,
          per_page: perPage,
          ...DOSSIERS_SUPPORT_FLAGS,
          ...extraParams,
        },
      });
      const { rows, hasMore } = parseRowsAndHasMore(res.data, page, perPage);
      rowsAcc.push(...rows);
      if (!hasMore || rows.length === 0) break;
      page += 1;
      if (page > 500) break;
    }
    return rowsAcc;
  };

  const allRows = await fetchAllDossiersWithParams();

  const byId = new Map<string, Record<string, unknown>>();
  allRows.forEach((row) => {
    const id = String(row.id ?? '').trim();
    if (id) byId.set(id, row);
  });

  // Fallback anti-filtrage par centre: pour les rôles globaux, agréger explicitement
  // par centre_id quand /dossiers reste restreint malgré all_centres/all_centers.
  const role = getUserRoleFromStorage();
  if (canTryGlobalAggregation(role)) {
    try {
      const centres = await referentielService.getAllReferentielsByType('centre');
      const dossiersParCentre = await Promise.all(
        centres
          .map((centre: any) => String(centre?.id ?? '').trim())
          .filter(Boolean)
          .map(async (centreId) => {
            try {
              return await fetchAllDossiersWithParams({ centre_id: centreId });
            } catch {
              return [] as Record<string, unknown>[];
            }
          }),
      );

      dossiersParCentre.flat().forEach((row) => {
        if (!row || typeof row !== 'object') return;
        const rowObj = row as Record<string, unknown>;
        const id = String(rowObj.id ?? '').trim();
        if (id && !byId.has(id)) byId.set(id, rowObj);
      });
    } catch {
      // Ignorer l'échec du fallback : on retourne au minimum le résultat /dossiers.
    }
  }

  return Array.from(byId.values());
}

export const dossierSupportService = {
  getAllCreatedDossiers,
};
