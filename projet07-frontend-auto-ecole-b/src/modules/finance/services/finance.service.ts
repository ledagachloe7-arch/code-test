/**
 * Service finance : dossiers avec code_paiement + dossiers à l'étape paiement (à mettre en attente).
 * Logique d'étape paiement alignée sur EtapeAccordion (libelle/statut_libelle/code contient "PAIEMENT").
 */
import axiosClient from '../../../shared/utils/axiosConfig';
import { circuitSuiviService } from '../../reception/services/circuit-suivi.service';
import type { DossierFinance, TypeDossierFinance, HistoricPaiementEntry, DossierRapport, StatutCircuit } from '../types';

/**
 * Relations à charger sur GET /dossiers pour peupler centre, candidat, formation, etc.
 * (même convention `include` que ailleurs, ex. useCNEDDTTransfer.)
 */
const DOSSIERS_LIST_INCLUDE =
  'centre,province,type_demande,candidat.personne,auto_ecole,formation,formation.type_permis,formation.auto_ecole,referentiel';

function dossiersListParams(extra: Record<string, string | number> = {}): Record<string, string | number> {
  return { ...extra, include: DOSSIERS_LIST_INCLUDE };
}

const DOSSIERS_RAPPORT_PAGE_SIZE = 300;

/**
 * Désactive côté API le filtre implicite « dossiers du centre de l’utilisateur » + élargit les statuts.
 * `all_centers` = variante orthographe anglaise si le backend ne lit que celle-ci.
 */
const DOSSIERS_QUERY_FLAGS_LISTE_OUVERTE: Record<string, string> = {
  all_statuts: 'true',
  all_centres: 'true',
  all_centers: 'true',
};

/** Paramètres GET /dossiers pour le rapport finance (pagination). */
function dossiersRapportListParams(page: number, perPage: number): Record<string, string | number> {
  return dossiersListParams({
    per_page: perPage,
    page,
    ...DOSSIERS_QUERY_FLAGS_LISTE_OUVERTE,
  });
}

/** Paramètres GET /dossiers pour les listes du dashboard finance (mêmes flags que le rapport). */
function dossiersFinanceListeOuverteParams(
  extra: Record<string, string | number> = {},
): Record<string, string | number> {
  return dossiersListParams({ ...DOSSIERS_QUERY_FLAGS_LISTE_OUVERTE, ...extra });
}

function lastPageFromMeta(meta: Record<string, unknown>, perPage: number): number | null {
  const lp = Number(meta.last_page);
  if (Number.isFinite(lp) && lp >= 1) return lp;
  const total = Number(meta.total);
  const ppm = Number(meta.per_page);
  const effectivePerPage = Number.isFinite(ppm) && ppm > 0 ? ppm : perPage;
  if (Number.isFinite(total) && total >= 0 && effectivePerPage > 0) {
    return Math.max(1, Math.ceil(total / effectivePerPage));
  }
  return null;
}

/**
 * Extrait les lignes et indique s'il existe une page suivante (GET /dossiers paginé Laravel, ou liste brute).
 */
function extractDossiersListPage(
  resData: unknown,
  page: number,
  perPage: number,
): { rows: unknown[]; hasMore: boolean } {
  if (Array.isArray(resData)) {
    return { rows: resData, hasMore: false };
  }
  if (!resData || typeof resData !== 'object') {
    return { rows: [], hasMore: false };
  }
  const o = resData as Record<string, unknown>;
  let inner: unknown = o.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const mid = inner as Record<string, unknown>;
    if (Array.isArray(mid.data)) inner = mid.data;
  }
  const rows = Array.isArray(inner) ? inner : [];
  const meta = (o.meta as Record<string, unknown> | undefined) ?? {};
  const computedLast = lastPageFromMeta(meta, perPage);
  if (computedLast != null) {
    return { rows, hasMore: page < computedLast };
  }
  const links = (o.links as Record<string, unknown> | undefined) ?? {};
  const next = links.next;
  if (next != null && String(next).trim() && String(next).toLowerCase() !== 'null') {
    return { rows, hasMore: true };
  }
  const hasMore = rows.length >= perPage;
  return { rows, hasMore };
}

function asLooseRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

/** Libellé centre depuis un objet référentiel / relation chargée. */
function pickCentreObjectLabel(c: unknown): string | null {
  const r = asLooseRecord(c);
  if (!r) return null;
  const nested = asLooseRecord(r.data) ?? asLooseRecord(r.attributes);
  const pool = nested ?? r;
  for (const key of ['libelle', 'nom', 'name', 'label', 'title', 'code'] as const) {
    const v = pool[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function hasCodePaiement(d: { code_paiement?: string | null }): boolean {
  const cp = (d.code_paiement ?? '').toString().trim();
  return cp.length > 0;
}

function getCandidatLabel(d: {
  candidat?: { personne?: { nom?: string; prenom?: string }; numero_candidat?: string };
}): string {
  const p = d.candidat?.personne;
  if (p?.nom || p?.prenom) {
    return [p.prenom, p.nom].filter(Boolean).join(' ').trim() || '—';
  }
  if (d.candidat?.numero_candidat) return `N° ${d.candidat.numero_candidat}`;
  return '—';
}

function formatTypeDemandeName(name: string | undefined): string {
  if (!name?.trim()) return '—';
  const upper = name.toUpperCase().replace(/\s+/g, '');
  if (upper === 'NOUVEAUPERMIS') return 'Nouveau permis';
  if (upper === 'FICHEENREGISTREMENT') return 'Fiche enregistrement';
  return name.trim();
}

/** Même logique que EtapeAccordion : étape dont libelle / statut_libelle / code contient "PAIEMENT". */
function isEtapePaiement(etape: { libelle?: string; statut_libelle?: string; code?: string }): boolean {
  const u = (s: string | undefined) => (s ?? '').toUpperCase();
  return (
    u(etape.libelle).includes('PAIEMENT') ||
    u(etape.statut_libelle).includes('PAIEMENT') ||
    u(etape.code).includes('PAIEMENT')
  );
}

/** Retourne les libellés de statut des étapes "paiement" (pour matcher le statut du dossier). */
export async function getStatutLabelsEtapePaiement(): Promise<Set<string>> {
  const labels = new Set<string>();
  try {
    const circuits = await circuitSuiviService.getCircuitsActifs();
    for (const circuit of circuits) {
      if (!circuit.id) continue;
      const etapes = await circuitSuiviService.getEtapesByCircuitId(circuit.id);
      for (const etape of etapes) {
        if (!isEtapePaiement(etape)) continue;
        const toAdd = [etape.libelle, etape.statut_libelle, etape.code].filter(Boolean) as string[];
        toAdd.forEach((s) => labels.add((s ?? '').trim()));
      }
    }
  } catch {
    // ignore
  }
  return labels;
}

function dossierStatutMatchesPaiementEtape(dossierStatut: string, paiementLabels: Set<string>): boolean {
  const s = (dossierStatut ?? '').trim();
  if (!s) return false;
  const sUpper = s.toUpperCase();
  for (const label of paiementLabels) {
    const l = (label ?? '').trim();
    if (!l) continue;
    if (l === s || l.toUpperCase() === sUpper) return true;
  }
  return false;
}

function getCentreLabel(d: any): string {
  const root = pickCentreObjectLabel(d?.centre);
  if (root) return root;
  const rel = asLooseRecord(d?.relationships)?.centre;
  const relData = asLooseRecord(rel)?.data;
  const fromRel = pickCentreObjectLabel(relData);
  if (fromRel) return fromRel;

  const form = asLooseRecord(d?.formation);
  if (form) {
    const c1 = pickCentreObjectLabel(form.centre ?? form.Centre);
    if (c1) return c1;
    const ae = asLooseRecord(form.auto_ecole ?? form.autoEcole);
    if (ae) {
      const c2 = pickCentreObjectLabel(ae.centre ?? ae.Centre);
      if (c2) return c2;
    }
  }
  const aeRoot = asLooseRecord(d?.auto_ecole ?? d?.autoEcole);
  if (aeRoot) {
    const c3 = pickCentreObjectLabel(aeRoot.centre ?? aeRoot.Centre);
    if (c3) return c3;
  }
  return '—';
}

function mapRawToDossierFinance(d: any, typeDossier: TypeDossierFinance): DossierFinance {
  const candidatLabel = getCandidatLabel(d);
  const typeName = d.type_demande?.name;
  const autoEcole = d.auto_ecole ?? d.formation?.auto_ecole;
  const formationLabel = d.formation?.type_permis?.libelle ?? d.formation?.libelle ?? d.referentiel?.libelle;
  const centreLabel = getCentreLabel(d);
  return {
    id: d.id ?? '',
    candidat_id: d.candidat_id ?? null,
    auto_ecole_id: d.auto_ecole_id ?? null,
    formation_id: d.formation_id ?? null,
    type_demande_id: d.type_demande_id ?? null,
    statut: (d.statut ?? '').toString().trim(),
    code_paiement: d.code_paiement ?? null,
    commentaires: d.commentaires,
    typeDossier,
    candidatLabel,
    typeDemandeName: formatTypeDemandeName(typeName),
    autoEcoleNom: autoEcole?.nom_auto_ecole ?? autoEcole?.nom ?? '—',
    formationLabel: formationLabel ?? '—',
    created_at: d.created_at ?? null,
    updated_at: d.updated_at ?? null,
    reference: d.reference ?? null,
    centre_id: d.centre_id ?? null,
    centreLabel,
  };
}

/**
 * Récupère tous les dossiers qui ont un code_paiement renseigné (tous statuts).
 */
export async function getDossiersAvecCodePaiement(): Promise<DossierFinance[]> {
  const res = await axiosClient.get<{ data?: unknown[] } | unknown[]>('/dossiers', {
    params: dossiersFinanceListeOuverteParams({ per_page: 1000 }),
  });
  const raw = Array.isArray(res.data) ? res.data : (res.data as { data?: unknown[] })?.data ?? [];
  const withCode = raw.filter((d: any) => hasCodePaiement(d));
  return withCode.map((d: any) => mapRawToDossierFinance(d, 'avec_code_paiement'));
}

/**
 * Récupère les dossiers à l'étape paiement (statut = libellé d'une étape contenant "PAIEMENT")
 * et pas encore EN_ATTENTE_PAIEMENT / sans code_paiement — même logique que le bouton "Mettre en attente de paiement".
 */
export async function getDossiersAEtapePaiement(): Promise<DossierFinance[]> {
  const paiementLabels = await getStatutLabelsEtapePaiement();
  if (paiementLabels.size === 0) return [];
  const res = await axiosClient.get<{ data?: unknown[] } | unknown[]>('/dossiers', {
    params: dossiersFinanceListeOuverteParams({ per_page: 1000 }),
  });
  const raw = Array.isArray(res.data) ? res.data : (res.data as { data?: unknown[] })?.data ?? [];
  const filtered = raw.filter((d: any) => {
    if (hasCodePaiement(d)) return false;
    const statut = (d.statut ?? '').toString().trim().toUpperCase();
    if (statut === 'EN_ATTENTE_PAIEMENT') return false;
    return dossierStatutMatchesPaiementEtape((d.statut ?? '').toString().trim(), paiementLabels);
  });
  return filtered.map((d: any) => mapRawToDossierFinance(d, 'a_mettre_en_attente'));
}

/** Récupère les deux listes : avec code paiement + à l'étape paiement (à mettre en attente). */
export async function getDossiersEnAttentePaiement(): Promise<DossierFinance[]> {
  const [avecCode, aEtapePaiement] = await Promise.all([
    getDossiersAvecCodePaiement(),
    getDossiersAEtapePaiement(),
  ]);
  const idsAvecCode = new Set(avecCode.map((r) => r.id));
  const sansDoublon = aEtapePaiement.filter((r) => !idsAvecCode.has(r.id));
  return [...avecCode, ...sansDoublon];
}

function mapRawToHistoricPaiement(d: any): HistoricPaiementEntry {
  const candidatLabel = getCandidatLabel(d);
  const typeName = d.type_demande?.name;
  const formationLabel = d.formation?.type_permis?.libelle ?? d.formation?.libelle ?? d.referentiel?.libelle;
  const centreLabel = getCentreLabel(d);
  return {
    id: d.id ?? '',
    code_paiement: d.code_paiement ?? null,
    candidatLabel: candidatLabel ?? '—',
    typeDemandeName: formatTypeDemandeName(typeName),
    formationLabel: formationLabel ?? '—',
    centreLabel: centreLabel ?? '—',
    created_at: d.created_at ?? null,
    updated_at: d.updated_at ?? null,
  };
}

/**
 * Récupère l'historique des paiements effectués (endpoint /historic-paiement).
 */
export async function getHistoricPaiement(): Promise<HistoricPaiementEntry[]> {
  const res = await axiosClient.get<{ data?: unknown[] } | unknown[]>('/historic-paiement', {
    params: { per_page: 1000 },
  });
  const raw = Array.isArray(res.data) ? res.data : (res.data as { data?: unknown[] })?.data ?? [];
  return raw.map((d: any) => mapRawToHistoricPaiement(d));
}

/**
 * Classe le statut brut d'un dossier selon les 3 catégories d'EtapeAccordion :
 * - pending      → aucune étape commencée (statut vide)
 * - completed    → dossier envoyé CNEDDT / étapes terminées
 * - in_progress  → en cours de traitement (tout le reste)
 */
function classifyStatutCircuit(statut: string): StatutCircuit {
  const s = (statut ?? '').toUpperCase().trim();
  if (!s) return 'pending';
  if (s.includes('CNEDDT') || s.includes('DOSSIER ENVOYER') || s.includes('DOSSIER ENVOY')) {
    return 'completed';
  }
  return 'in_progress';
}

function mapRawToDossierRapport(d: any): DossierRapport {
  const statut = (d.statut ?? '').toString().trim();
  return {
    id: d.id ?? '',
    centreLabel: getCentreLabel(d),
    centre_id: d.centre_id ?? null,
    statut,
    statutCircuit: classifyStatutCircuit(statut),
    created_at: d.created_at ?? null,
    updated_at: d.updated_at ?? null,
    candidatLabel: getCandidatLabel(d),
    typeDemandeName: formatTypeDemandeName(d.type_demande?.name),
    typeDemandeRawName: (d.type_demande?.name ?? '').toString().trim(),
    formationLabel: d.formation?.type_permis?.libelle ?? d.formation?.libelle ?? d.referentiel?.libelle ?? '—',
    autoEcoleNom: d.auto_ecole?.nom_auto_ecole ?? d.auto_ecole?.nom ?? '—',
    code_paiement: d.code_paiement ? (d.code_paiement as string).trim() || null : null,
    commentaires: d.commentaires ?? null,
    referentielLabel:
      d.referentiel?.libelle ?? d.referentiel?.nom ?? d.referentiel?.name ?? null,
    numero_permis: d.numero_permis ?? null,
    numero_origine_permis: d.numero_origine_permis ?? null,
    lieu_obtention_permis: d.lieu_de_dobtention_du_permis ?? null,
    date_obtention_permis: d.date_de_dobtention_du_permis ?? null,
    date_delivrance_permis: d.date_de_delivrance_du_permis ?? null,
    expired: d.expired ?? null,
    expiration_date: d.expiration_date ?? null,
    suspended: d.suspended ?? null,
    suspended_date: d.suspended_date ?? null,
    provinceLabel:
      d.province?.libelle ?? d.province?.nom ?? d.province?.name ?? null,
    data_categorie: Array.isArray(d.data_categorie)
      ? (d.data_categorie as any[]).map((cat) => {
          if (!cat) return '';
          if (typeof cat === 'string') return cat.trim();
          // objet : tenter libelle, nom, name, code, ou JSON brut
          return (
            cat.libelle?.trim() ||
            cat.nom?.trim() ||
            cat.name?.trim() ||
            cat.code?.trim() ||
            cat.categorie?.trim() ||
            (typeof cat === 'object' ? JSON.stringify(cat) : String(cat))
          );
        }).filter(Boolean)
      : [],
  };
}

/**
 * Récupère tous les dossiers pour le rapport (toutes les pages — tous statuts, avec ou sans code de paiement).
 */
export async function getAllDossiersForRapport(): Promise<DossierRapport[]> {
  const perPage = DOSSIERS_RAPPORT_PAGE_SIZE;
  const acc: unknown[] = [];
  let page = 1;
  for (;;) {
    const res = await axiosClient.get<{ data?: unknown[] } | unknown[]>('/dossiers', {
      params: dossiersRapportListParams(page, perPage),
    });
    const { rows, hasMore } = extractDossiersListPage(res.data, page, perPage);
    acc.push(...rows);
    if (!hasMore || rows.length === 0) break;
    page += 1;
    if (page > 500) break;
  }
  return (acc as any[]).map((d) => mapRawToDossierRapport(d));
}

/**
 * Charge dossiers + tous les circuits actifs avec leurs étapes pour le rapport des étapes.
 * Reproduit exactement la logique useEtapeCompletion : dossier.statut = libellé de l'étape courante.
 */
export async function getRapportDossierEtapes(): Promise<{
  dossiers: DossierRapport[];
  circuits: import('../../../modules/reception/services/circuit-suivi.service').CircuitSuivi[];
}> {
  const [dossiers, circuitsBase] = await Promise.all([
    getAllDossiersForRapport(),
    circuitSuiviService.getCircuitsActifs(),
  ]);

  // Charger les étapes de chaque circuit (avec fallback si déjà présentes)
  const circuits = await Promise.all(
    circuitsBase.map(async (circuit) => {
      if (circuit.etapes && circuit.etapes.length > 0) return circuit;
      if (!circuit.id) return circuit;
      try {
        const etapes = await circuitSuiviService.getEtapesByCircuitId(circuit.id);
        return { ...circuit, etapes };
      } catch {
        return circuit;
      }
    }),
  );

  return {
    dossiers,
    circuits: circuits.filter((c) => (c.etapes?.length ?? 0) > 0),
  };
}
