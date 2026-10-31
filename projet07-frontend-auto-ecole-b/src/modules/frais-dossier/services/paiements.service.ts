import axiosClient from '../../../shared/utils/axiosConfig';
import type {
  PaiementApiItem,
  PaiementsApiResponse,
  PaiementsPaginationMeta,
} from '../types/paiements.types';

function rec(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

const LABEL_KEYS = ['libelle', 'nom', 'name', 'label', 'title', 'code', 'nom_centre', 'nomCentre'] as const;

function labelFromCentreLike(c: unknown): string | null {
  const r = rec(c);
  if (!r) return null;
  const attrs = rec(r.attributes);
  const pool = attrs ? { ...r, ...attrs } : r;
  for (const k of LABEL_KEYS) {
    const v = pool[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function relData(rel: unknown): unknown {
  const n = rec(rel);
  if (!n) return undefined;
  return 'data' in n ? n.data : n;
}

function pickIncluded(included: unknown[] | undefined, ref: unknown): unknown {
  if (!included?.length) return undefined;
  const r = rec(ref);
  if (!r?.id) return undefined;
  const id = String(r.id);
  const typ = r.type != null ? String(r.type) : '';
  return included.find((item) => {
    const ir = rec(item);
    if (!ir || String(ir.id) !== id) return false;
    if (!typ) return true;
    return ir.type === typ;
  });
}

/** Dossier API : fusion attributes + racine (JSON:API ou objet plat). */
function flattenDossierNode(dossier: unknown): Record<string, unknown> | null {
  const flat = rec(dossier);
  if (!flat) return null;
  const attrs = rec(flat.attributes);
  if (attrs && flat.relationships != null) {
    return { ...attrs, id: flat.id ?? attrs.id, relationships: flat.relationships };
  }
  if (attrs) return { ...attrs, id: flat.id ?? attrs.id };
  return flat;
}

function centreIdFromFlat(o: Record<string, unknown>): string | null {
  const cid = o.centre_id ?? o.centreId;
  if (cid == null) return null;
  const s = String(cid).trim();
  if (!s || s.toLowerCase() === 'string') return null;
  return s;
}

/** `centre_id` sur l’objet dossier embarqué dans GET /paiements. */
export function getCentreIdFromEmbeddedDossier(dossier: unknown): string | null {
  const flat = flattenDossierNode(dossier);
  return flat ? centreIdFromFlat(flat) : null;
}

/** `centre_id` à la racine du paiement ou sur le dossier embarqué. */
export function getCentreIdFromPaiementRow(row: PaiementApiItem): string | null {
  const r = row as Record<string, unknown>;
  const top = r.centre_id ?? r.centreId;
  if (top != null && String(top).trim()) {
    const s = String(top).trim();
    if (s.toLowerCase() !== 'string') return s;
  }
  return getCentreIdFromEmbeddedDossier(row.dossier);
}

/** Libellé + code depuis un objet `type_permis` ou `referentiel` de l'API. */
function typePermisLabel(tp: unknown): string | null {
  const r = rec(tp);
  if (!r) return null;
  const lib = r.libelle != null ? String(r.libelle).trim() : '';
  const code = r.code != null ? String(r.code).trim() : '';
  if (lib && code && lib.toLowerCase() !== code.toLowerCase()) return `${lib} (${code})`;
  if (lib) return lib;
  if (code) return code;
  return null;
}

/** Extrait la lettre de catégorie depuis un numéro de permis. Ex : "19969B00466" → "B". */
function categoryLetterFromPermis(num: unknown): string | null {
  if (num == null) return null;
  const s = String(num).trim();
  const match = s.match(/[A-Za-z]+/);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Extrait la catégorie de permis depuis un nœud dossier complet (réponse GET /dossiers/{id}).
 *
 * Priorité 1 : lettre dans numero_permis (ex. "19969B00466" → "B").
 * Puis : formation.type_permis → auto_ecole.formations[].type_permis
 *        → referentiel uniquement si type_ref ≠ "centre".
 */
export function categoryFromDossierNode(dossier: unknown): string | null {
  const o = flattenDossierNode(dossier);
  if (!o) return null;

  /* ── 1. Lettre extraite du numéro de permis ── */
  const fromPermis =
    categoryLetterFromPermis(o.numero_permis ?? o.numeroPermis) ??
    categoryLetterFromPermis(o.numero_origine_permis ?? o.numeroOriginePermis);
  if (fromPermis) return fromPermis;

  /* ── 2. formation.type_permis (source directe) ── */
  const form = rec(o.formation);
  if (form) {
    const t = typePermisLabel(form.type_permis ?? form.typePermis);
    if (t) return t;
  }

  /* ── 2. auto_ecole.formations[matching formation_id].type_permis ── */
  const ae = rec(o.auto_ecole ?? o.autoEcole);
  if (ae) {
    const forms = Array.isArray(ae.formations) ? ae.formations : [];
    const formationId = o.formation_id != null ? String(o.formation_id).trim() : '';
    const matched = formationId
      ? (forms.find((f) => {
          const fr = rec(f);
          return fr && String(fr.id ?? '').trim() === formationId;
        }) ?? forms[0])
      : forms[0];
    if (matched) {
      const fr = rec(matched);
      if (fr) {
        const t = typePermisLabel(fr.type_permis ?? fr.typePermis);
        if (t) return t;
      }
    }
  }

  /* ── 3. formation.auto_ecole.formations[].type_permis ── */
  if (form) {
    const formAe = rec(form.auto_ecole ?? form.autoEcole);
    if (formAe) {
      const forms = Array.isArray(formAe.formations) ? formAe.formations : [];
      const formId = form.id != null ? String(form.id).trim() : '';
      const matched = formId
        ? (forms.find((f) => {
            const fr = rec(f);
            return fr && String(fr.id ?? '').trim() === formId;
          }) ?? forms[0])
        : forms[0];
      if (matched) {
        const fr = rec(matched);
        if (fr) {
          const t = typePermisLabel(fr.type_permis ?? fr.typePermis);
          if (t) return t;
        }
      }
    }
  }

  /* ── 4. referentiel : seulement si ce n'est pas un centre ── */
  const refNode = rec(o.referentiel);
  if (refNode) {
    const typeRef = refNode.type_ref != null ? String(refNode.type_ref).toLowerCase().trim() : '';
    const isCentre = typeRef === 'centre' || typeRef === 'centers';
    if (!isCentre) {
      const t = typePermisLabel(refNode);
      if (t) return t;
    }
  }

  return null;
}

/** GET /referentiels/{id} — centres = référentiels type centre. */
async function fetchReferentielLibelle(referentielId: string): Promise<string | null> {
  try {
    const res = await axiosClient.get(`/referentiels/${referentielId}`);
    const body = res.data as { data?: unknown };
    const node = body?.data !== undefined ? body.data : res.data;
    return labelFromCentreLike(node);
  } catch {
    return null;
  }
}

/** Libellé depuis relations / objets imbriqués du dossier embarqué (sans appel HTTP). */
function labelFromDossierNested(dossier: unknown, included: unknown[] | undefined = undefined): string | null {
  const o = flattenDossierNode(dossier);
  if (!o) return null;

  const tryCentre = (x: unknown): string | null => {
    if (x == null) return null;
    const direct = labelFromCentreLike(x);
    if (direct) return direct;
    const inc = pickIncluded(included, x);
    return labelFromCentreLike(inc);
  };

  let s = tryCentre(o.centre);
  if (s) return s;

  const rels = rec(o.relationships);
  if (rels) {
    const raw = relData(rels.centre ?? rels.Centre);
    const list = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
    for (const ref of list) {
      s = tryCentre(ref);
      if (s) return s;
    }
  }

  const form = rec(o.formation);
  if (form) {
    s = labelFromCentreLike(form.centre ?? form.Centre);
    if (s) return s;
    const ae = rec(form.auto_ecole ?? form.autoEcole);
    if (ae) {
      s = labelFromCentreLike(ae.centre ?? ae.Centre);
      if (s) return s;
    }
  }

  const aeRoot = rec(o.auto_ecole ?? o.autoEcole);
  if (aeRoot) {
    s = labelFromCentreLike(aeRoot.centre ?? aeRoot.Centre);
    if (s) return s;
  }

  return null;
}

/** Extraction synchrone (sans GET /referentiels). */
export function extractCentreLabelFromDossierPayload(
  dossier: unknown,
  included?: unknown[] | undefined
): string {
  return labelFromDossierNested(dossier, included) ?? '—';
}

export function getPaiementDossierId(row: PaiementApiItem): string | null {
  const top = row.dossier_id;
  if (top != null && String(top).trim()) return String(top).trim();
  const d = row.dossier;
  if (d && typeof d === 'object') {
    const o = d as Record<string, unknown>;
    if (o.id != null && String(o.id).trim()) return String(o.id).trim();
    const data = rec(o.data);
    if (data?.id != null && String(data.id).trim()) return String(data.id).trim();
  }
  return null;
}

/**
 * Résout le libellé du centre pour chaque id de dossier présent dans les lignes,
 * **sans** appeler GET /dossiers/{id} (souvent 403) : uniquement le payload /paiements
 * (`centre_id` + GET /referentiels/{centre_id}) et les relations déjà embarquées.
 */
export async function fetchCentreLabelsForPaiementsRows(
  rows: PaiementApiItem[],
  options?: { concurrency?: number }
): Promise<Record<string, string>> {
  const byDossier = new Map<string, PaiementApiItem>();
  for (const row of rows) {
    const did = getPaiementDossierId(row);
    if (did && !byDossier.has(did)) byDossier.set(did, row);
  }

  const concurrency = Math.max(1, Math.min(12, options?.concurrency ?? 6));
  const referentielCache = new Map<string, string>();
  const out: Record<string, string> = {};

  async function resolveOne(dossierId: string, row: PaiementApiItem): Promise<void> {
    const nested = labelFromDossierNested(row.dossier, undefined);
    const centreId = getCentreIdFromPaiementRow(row);

    if (centreId) {
      if (referentielCache.has(centreId)) {
        out[dossierId] = referentielCache.get(centreId)!;
        return;
      }
      const lib = await fetchReferentielLibelle(centreId);
      const resolved = (lib ?? nested) ?? '—';
      referentielCache.set(centreId, resolved);
      out[dossierId] = resolved;
      return;
    }

    out[dossierId] = nested ?? '—';
  }

  const entries = [...byDossier.entries()];
  for (let i = 0; i < entries.length; i += concurrency) {
    const chunk = entries.slice(i, i + concurrency);
    await Promise.all(chunk.map(([dossierId, row]) => resolveOne(dossierId, row)));
  }

  return out;
}

function normalizeMeta(m: Partial<PaiementsPaginationMeta> | undefined): PaiementsPaginationMeta {
  return {
    current_page: Math.max(1, Number(m?.current_page) || 1),
    last_page: Math.max(1, Number(m?.last_page) || 1),
    per_page: Math.max(1, Number(m?.per_page) || 15),
    total: Math.max(0, Number(m?.total) || 0),
  };
}

export async function getPaiementsList(params: {
  page?: number;
  per_page?: number;
  nom?: string;
  code_paiement?: string;
  /** YYYY-MM-DD — filtre côté API si le backend les expose sur GET /paiements */
  date_debut?: string;
  /** YYYY-MM-DD */
  date_fin?: string;
}): Promise<{ data: PaiementApiItem[]; meta: PaiementsPaginationMeta }> {
  const page = params.page ?? 1;
  const per_page = params.per_page ?? 15;
  const nom = params.nom?.trim();
  const code_paiement = params.code_paiement?.trim();
  const date_debut = params.date_debut?.trim();
  const date_fin = params.date_fin?.trim();
  const res = await axiosClient.get<PaiementsApiResponse>('/paiements', {
    params: {
      page,
      per_page,
      ...(nom ? { nom } : {}),
      ...(code_paiement ? { code_paiement } : {}),
      ...(date_debut ? { date_debut } : {}),
      ...(date_fin ? { date_fin } : {}),
    },
  });
  const body = res.data;
  const rawData = Array.isArray(body?.data) ? body.data : [];
  const meta = normalizeMeta(body?.meta);
  return { data: rawData, meta };
}

const EXPORT_PAGE_SIZE = 500;
const EXPORT_PARALLEL_PAGES = 6;

/**
 * Charge toutes les pages /paiements sur une période (paramètres date_* transmis à l’API).
 */
export async function fetchAllPaiementsForDateExport(params: {
  date_debut: string;
  date_fin: string;
}): Promise<PaiementApiItem[]> {
  const date_debut = params.date_debut.trim();
  const date_fin = params.date_fin.trim();
  const first = await getPaiementsList({
    page: 1,
    per_page: EXPORT_PAGE_SIZE,
    date_debut,
    date_fin,
  });
  const all: PaiementApiItem[] = [...first.data];
  const lastPage = first.meta.last_page;
  for (let start = 2; start <= lastPage; start += EXPORT_PARALLEL_PAGES) {
    const end = Math.min(start + EXPORT_PARALLEL_PAGES - 1, lastPage);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    const batch = await Promise.all(
      pages.map((page) =>
        getPaiementsList({
          page,
          per_page: EXPORT_PAGE_SIZE,
          date_debut,
          date_fin,
        })
      )
    );
    for (const r of batch) {
      all.push(...r.data);
    }
  }
  return all;
}

/**
 * Résout le libellé de catégorie (referentiel.libelle) pour chaque dossier via GET /dossiers/{id}.
 * Tente d'abord le payload embarqué ; si absent, appelle l'endpoint.
 */
export async function fetchCategoriesForPaiementsRows(
  rows: PaiementApiItem[],
  options?: { concurrency?: number }
): Promise<Record<string, string>> {
  const byDossier = new Map<string, PaiementApiItem>();
  for (const row of rows) {
    const did = getPaiementDossierId(row);
    if (did && !byDossier.has(did)) byDossier.set(did, row);
  }

  const concurrency = Math.max(1, Math.min(8, options?.concurrency ?? 4));
  const out: Record<string, string> = {};

  async function resolveOne(dossierId: string, row: PaiementApiItem): Promise<void> {
    const embedded = categoryFromDossierNode(row.dossier);
    if (embedded) {
      out[dossierId] = embedded;
      return;
    }
    try {
      const res = await axiosClient.get(`/dossiers/${dossierId}`);
      const body = res.data as { data?: unknown };
      const node = body?.data !== undefined ? body.data : res.data;
      const label = Array.isArray(node) ? categoryFromDossierNode(node[0]) : categoryFromDossierNode(node);
      out[dossierId] = label ?? '—';
    } catch {
      out[dossierId] = '—';
    }
  }

  const entries = [...byDossier.entries()];
  for (let i = 0; i < entries.length; i += concurrency) {
    const chunk = entries.slice(i, i + concurrency);
    await Promise.all(chunk.map(([dossierId, row]) => resolveOne(dossierId, row)));
  }

  return out;
}

export async function createPaiementFacturePdfObjectUrl(paiementId: string): Promise<string> {
  const res = await axiosClient.get(`/paiements/${paiementId}/pdf/view`, {
    responseType: 'blob',
    headers: { Accept: 'application/pdf,application/octet-stream,*/*' },
  });
  const rawType = (res.headers['content-type'] || '').toString().toLowerCase();
  const isPdf = rawType.includes('pdf') || rawType.includes('octet-stream');
  const blob = new Blob([res.data], {
    type: isPdf ? 'application/pdf' : rawType || 'application/pdf',
  });
  return URL.createObjectURL(blob);
}
