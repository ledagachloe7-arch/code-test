import axiosClient from '../../../shared/utils/axiosConfig';
import { authService } from '../../auth/services/authService';
import { autoEcoleService } from '../../cnepc/services/auto-ecole.service';
import { gestionDossierService } from '../../cnepc/services/gestion-dossier.service';
import { typeDemandeService } from '../../cnepc/services/type-demande.service';
import { dgdiService, isDgdiServiceUnavailableMessage, referentielService } from '../../cnepc/services';
import type { DemandeFormState } from '../types';
import { buildDossierTransfertEligibilitySnapshot } from '../../reception/services/sendToCNEDDT.service';

const EDITION_PUT_PRESERVE_KEYS = [
  'statut',
  'code_paiement',
  'expired',
  'expiration_date',
  'suspended',
  'suspended_date',
  'date_creation',
] as const;

function mergePreserveIntoUpdatePayload(payload: Record<string, unknown>, preserve?: Record<string, unknown>) {
  if (!preserve) return;
  for (const k of EDITION_PUT_PRESERVE_KEYS) {
    if (preserve[k] !== undefined && preserve[k] !== null) payload[k] = preserve[k];
  }
}

/** Réinjecte après GET lors du PUT pour ne pas effacer paiement / statut / création à l’enregistrement. */
export function pickEditionPutPreserveFields(flat: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of EDITION_PUT_PRESERVE_KEYS) {
    const v = flat[k];
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Extrait formation_id / referenciel_id / libellés si l’API ne les met que sous objets imbriqués. */
function enrichDossierEditionFlatFromNested(flat: Record<string, unknown>): void {
  const idOf = (x: unknown): string => {
    if (!x || typeof x !== 'object') return '';
    return String((x as Record<string, unknown>).id ?? '').trim();
  };

  const formation = flat.formation;
  if ((!flat.formation_id || String(flat.formation_id).trim() === '') && formation && typeof formation === 'object') {
    const fid = idOf(formation);
    if (fid) flat.formation_id = fid;
    const fo = formation as Record<string, unknown>;
    const tp = fo.type_permis;
    if (tp && typeof tp === 'object') {
      const t = tp as Record<string, unknown>;
      if (t.code != null) flat._edition_type_permis_code = String(t.code);
      if (t.libelle != null) flat._edition_type_permis_libelle = String(t.libelle);
    }
    const desc = fo.description;
    const resume = [flat._edition_type_permis_libelle, typeof desc === 'string' ? desc : '']
      .filter((s) => String(s).trim() !== '')
      .join(' · ');
    flat._edition_formation_resume =
      resume || (flat._edition_type_permis_code != null ? String(flat._edition_type_permis_code) : '');
  }

  const ref = flat.referentiel ?? flat.referenciel;
  const refIdExisting = String(flat.referenciel_id ?? flat.referentiel_id ?? '').trim();
  if (!refIdExisting && ref && typeof ref === 'object') {
    const rid = idOf(ref);
    if (rid) {
      flat.referenciel_id = rid;
      flat.referentiel_id = rid;
    }
  }
  if (ref && typeof ref === 'object') {
    const ro = ref as Record<string, unknown>;
    if (ro.libelle != null) flat._edition_referentiel_libelle = String(ro.libelle);
    if (ro.code != null) flat._edition_referentiel_code = String(ro.code);
  }

  const ae = flat.auto_ecole;
  if ((!flat.auto_ecole_id || String(flat.auto_ecole_id).trim() === '') && ae && typeof ae === 'object') {
    flat.auto_ecole_id = idOf(ae);
  }
  if (ae && typeof ae === 'object' && (ae as Record<string, unknown>).nom_auto_ecole != null) {
    flat._edition_auto_ecole_nom = String((ae as Record<string, unknown>).nom_auto_ecole);
  }

  const prov = flat.province;
  if (prov && typeof prov === 'object') {
    flat._edition_province_libelle = String((prov as Record<string, unknown>).libelle ?? (prov as Record<string, unknown>).nom ?? '');
  }
  const centre = flat.centre;
  if (centre && typeof centre === 'object') {
    flat._edition_centre_libelle = String((centre as Record<string, unknown>).libelle ?? '');
  }

  const refIdFlat = flat.referentiel_id;
  if (refIdFlat && !flat.referenciel_id) flat.referenciel_id = String(refIdFlat);

  /** Catégorie depuis une entrée data_categorie objet. */
  const dc = flat.data_categorie;
  if (Array.isArray(dc) && dc.length > 0) {
    const first = dc[0];
    let cat = '';
    if (first && typeof first === 'object') {
      const o = first as Record<string, unknown>;
      cat = String(o.categorie ?? o.classe ?? o.code ?? '').trim();
    } else if (typeof first === 'string' && first.trim().startsWith('{')) {
      try {
        const o = JSON.parse(first) as Record<string, unknown>;
        cat = String(o.categorie ?? o.classe ?? '').trim();
      } catch {
        /* ignore */
      }
    }
    if (cat) flat._edition_data_categorie_categorie = cat;
  }
}

/** corps GET unique : data objet ou tableau (Tolérance spec). */
function normalizeGetDossierBodyForSnapshot(resData: unknown): unknown {
  const d = (resData as { data?: unknown })?.data ?? resData;
  if (Array.isArray(d) && d[0] && typeof d[0] === 'object') return d[0];
  return d;
}

/** Dossier complet pour hydrater la page nouvelle demande en mode modification (réponse GET aplatie + relations). */
export async function fetchDossierForEdition(id: string): Promise<Record<string, unknown>> {
  const enc = encodeURIComponent(id);
  const res = await axiosClient.get(`/dossiers/${enc}`, {
    params: {
      include:
        'candidat.personne,type_demande,auto_ecole,formation,formation.type_permis,referentiel,province,centre',
    },
  });
  const single = normalizeGetDossierBodyForSnapshot(res.data);
  const wrapped = typeof single === 'object' && single !== null ? { data: single } : { data: {} };
  const flat = buildDossierTransfertEligibilitySnapshot(wrapped) as Record<string, unknown>;
  enrichDossierEditionFlatFromNested(flat);

  const rootBlock = ((single ?? {}) as Record<string, unknown>) || {};
  const nestedTd =
    rootBlock?.type_demande !== undefined && typeof rootBlock.type_demande === 'object' && rootBlock.type_demande !== null
      ? (rootBlock.type_demande as Record<string, unknown>)
      : flat.type_demande !== undefined && typeof flat.type_demande === 'object' && flat.type_demande !== null
        ? (flat.type_demande as Record<string, unknown>)
        : undefined;
  if ((!flat.type_demande_name || String(flat.type_demande_name).trim() === '') && nestedTd) {
    const n = nestedTd.name ?? nestedTd.libelle ?? nestedTd.libelle_demande;
    if (n != null && String(n).trim() !== '') flat.type_demande_name = String(n);
  }

  return flat;
}

export interface DgdiResult {
  status: 'ok' | 'bypass' | 'error';
  message: string;
  /** Numéro de pièce utilisé / confirmé par la vérification DGDI. */
  numero_piece?: string;
  /** Document trouvé et valide côté DGDI (exists: true). */
  pieceValide?: boolean;
  /** Indisponibilité ou timeout réseau — le parcours peut continuer en bypass. */
  isTimeoutBypass?: boolean;
}

function isDgdiTimeoutBypassMessage(message: string): boolean {
  return /timeout|timed\s*out|econnaborted|network\s*error|failed\s*to\s*fetch/i.test(message);
}

export interface PermisApiData {
  numero_permis: string;
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  nationalite?: string;
  numero_identite?: string;
  lieu_obtention?: string;
  date_obtention?: string;
  date_validite?: string;
  categorie?: string;
  [key: string]: unknown;
}

function fmtDateOnly(value?: string): string {
  if (!value) return '';
  const s = value.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    return new Date(value).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

const PRIMARY_PERMIS_CATEGORY_ORDER = ['B', 'C', 'D', 'E', 'F'] as const;

function normalizedPermisCatCode(cat?: string): string {
  return String(cat ?? '').toUpperCase().trim();
}

function primaryCategoryScore(cat?: string): number {
  const letter = normalizedPermisCatCode(cat).replace(/\s+/g, '').charAt(0);
  const idx = PRIMARY_PERMIS_ORDER_INDEX(letter);
  return idx >= 0 ? idx : 999;
}

function PRIMARY_PERMIS_ORDER_INDEX(letter: string): number {
  return PRIMARY_PERMIS_CATEGORY_ORDER.indexOf(letter as (typeof PRIMARY_PERMIS_CATEGORY_ORDER)[number]);
}

function normalizeDemandeKey(value?: string): string {
  return String(value ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9_-]/g, '')
    .trim();
}

function isFicheOrDuplicataFicheDemande(typeDemandeName?: string): boolean {
  const k = normalizeDemandeKey(typeDemandeName);
  return k === 'FICHEENREGISTREMENT' || k === 'DUPLICATAFICHEENREGISTREMENT';
}

function isPermisNumeroOriginePattern(numero?: string): boolean {
  return /^\d{5}X\d{5}$/i.test(String(numero ?? '').replace(/-/g, '').trim());
}

/** Permet d’envoyer référentiel B quand plusieurs catégories (B doit primer sur C/D/E/F). */
function pickPrincipalPermisPayload(permis: PermisApiData[]): PermisApiData | null {
  if (!permis.length) return null;
  return permis.reduce((best, cur) => (
    primaryCategoryScore(cur.categorie) <= primaryCategoryScore(best.categorie) ? cur : best
  ), permis[0]);
}

function pickPrincipalPermisPayloadForType(permis: PermisApiData[], typeDemandeName?: string): PermisApiData | null {
  if (!permis.length) return null;
  if (isFicheOrDuplicataFicheDemande(typeDemandeName)) {
    const byOriginePattern = permis.find((p) => isPermisNumeroOriginePattern(p.numero_permis));
    if (byOriginePattern) return byOriginePattern;
  }
  return pickPrincipalPermisPayload(permis);
}

function sortPermisByCategoryPriority(permis: PermisApiData[]): PermisApiData[] {
  return [...permis].sort((a, b) => {
    const da = primaryCategoryScore(a.categorie);
    const db = primaryCategoryScore(b.categorie);
    if (da !== db) return da - db;
    return normalizedPermisCatCode(a.categorie).localeCompare(normalizedPermisCatCode(b.categorie));
  });
}

/**
 * Format attendu par l’API : une entrée par permis, chaque élément est une chaîne JSON
 * { classe, ville, codification_code, valable_du, jusqu_au } (comme les dossiers existants).
 */
function buildDataCategoriePayloadStrings(permis: PermisApiData[]): string[] {
  return sortPermisByCategoryPriority(permis).map((p) =>
    JSON.stringify({
      classe: normalizedPermisCatCode(p.categorie),
      ville: String(p.lieu_obtention ?? '').trim(),
      codification_code: String(p.numero_permis ?? '').replace(/-/g, '').trim(),
      valable_du: fmtDateOnly(typeof p.date_obtention === 'string' ? p.date_obtention : undefined),
      jusqu_au: fmtDateOnly(typeof p.date_validite === 'string' ? p.date_validite : undefined),
    }),
  );
}

/** Normalise la réponse API permis (objet ou tableau) → premier permis correspondant. */
function extractFirstPermis(data: unknown, numRecherche?: string): PermisApiData | null {
  if (!data) return null;
  const normalize = (s: string) => (s ?? '').replace(/-/g, '').toUpperCase().trim();
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    if (numRecherche) {
      const n = normalize(numRecherche);
      const found = data.find((p: PermisApiData) => normalize(p.numero_permis ?? '') === n);
      return (found ?? data[0]) as PermisApiData;
    }
    return data[0] as PermisApiData;
  }
  const obj = data as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object') {
    return extractFirstPermis(obj.data, numRecherche);
  }
  if (typeof (obj as PermisApiData).numero_permis === 'string') return obj as PermisApiData;
  return null;
}

/** Normalise la réponse API permis (objet ou tableau) → liste de permis. */
function extractPermisList(data: unknown): PermisApiData[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter((p) => !!(p as PermisApiData)?.numero_permis) as PermisApiData[];
  }
  const obj = data as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object') {
    return extractPermisList(obj.data);
  }
  if (typeof (obj as PermisApiData).numero_permis === 'string') {
    return [obj as PermisApiData];
  }
  return [];
}

/** Vérification DGDI d'une pièce d'identité. */
export async function verifyDgdi(typePiece: string, numeroPiece: string): Promise<DgdiResult> {
  const numero = (numeroPiece ?? '').trim();
  const result = await dgdiService.verifyPieceIdentite(typePiece, numero);
  const verifiedNumero = String(result.data?.numero_piece ?? numero).trim();
  const message = result.message ?? '';

  if (result.success) {
    return {
      status: 'ok',
      message: message || "Pièce d'identité vérifiée avec succès.",
      numero_piece: verifiedNumero,
      pieceValide: true,
    };
  }
  if (result.serviceUnavailable || isDgdiServiceUnavailableMessage(message)) {
    return {
      status: 'bypass',
      message: message || 'Service DGDI indisponible. Vous pouvez continuer.',
      numero_piece: verifiedNumero,
      pieceValide: false,
      isTimeoutBypass:
        isDgdiTimeoutBypassMessage(message) || isDgdiServiceUnavailableMessage(message),
    };
  }
  return {
    status: 'error',
    message: message || 'Vérification DGDI échouée.',
    numero_piece: verifiedNumero,
    pieceValide: false,
  };
}

/** Recherche un permis par numéro. */
export async function verifyPermisParNumero(numeroComplet: string): Promise<PermisApiData | null> {
  const data = await gestionDossierService.getChangePermis(numeroComplet);
  return extractFirstPermis(data, numeroComplet);
}

/** Recherche un permis par identité. */
export async function verifyPermisParIdentite(nom: string, prenom: string, dateNaissance: string): Promise<PermisApiData | null> {
  const data = await gestionDossierService.getChangePermisByIdentity(nom, prenom, dateNaissance);
  return extractFirstPermis(data);
}

/** Recherche des permis par identité et retourne toutes les correspondances. */
export async function searchPermisParIdentite(nom: string, prenom: string, dateNaissance: string): Promise<PermisApiData[]> {
  const data = await gestionDossierService.getChangePermisByIdentity(nom, prenom, dateNaissance);
  return extractPermisList(data);
}

/** Extrait un message d'erreur lisible depuis une réponse Axios. */
function extractError(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback;
  const e = err as { response?: { data?: unknown }; message?: string };
  const data = e.response?.data as Record<string, unknown> | undefined;
  if (data?.errors && typeof data.errors === 'object') {
    const msgs = Object.values(data.errors as Record<string, string[]>).flat();
    if (msgs.length) return msgs.join(' — ');
  }
  if (typeof data?.message === 'string') return data.message;
  if (e.message) return e.message;
  return fallback;
}

/** Extrait un tableau paginé Laravel `{ data: T[] }` ou tableau direct. */
function extractPaginatedList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const root = payload as { data?: unknown };
    if (Array.isArray(root.data)) return root.data as T[];
    if (root.data && typeof root.data === 'object') {
      const nested = (root.data as { data?: unknown }).data;
      if (Array.isArray(nested)) return nested as T[];
    }
  }
  return [];
}

/** Charge les types de demande. */
export async function loadTypeDemandes() {
  const resp = await typeDemandeService.getTypeDemandes(1, 100);
  return extractPaginatedList<{ id: string; name: string; code?: string }>(resp);
}

function normalizeAutoEcoleRow(row: unknown): { id: string; nom_auto_ecole: string } | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const attrs = r.attributes as Record<string, unknown> | undefined;
  const id = String(r.id ?? attrs?.id ?? '').trim();
  const nom = String(
    r.nom_auto_ecole ?? r.nom ?? attrs?.nom_auto_ecole ?? attrs?.nom ?? r.name ?? '',
  ).trim();
  if (!id || !nom) return null;
  return { id, nom_auto_ecole: nom };
}

/** Charge les auto-écoles (id + nom) via GET /auto-ecoles paginé, sans dossiers imbriqués. */
export async function loadAutoEcoles() {
  return autoEcoleService.listAutoEcolesForSelect(200, { timeout: 45000 });
}

/** Auto-école CNEPC et formations — GET /auto-ecoles/cnepc */
export async function loadCnepcAutoEcoleWithFormations() {
  return autoEcoleService.getCnepcAutoEcole({ timeout: 30000 });
}

/** Recherche l'auto-école CNEPC (GET /auto-ecoles/cnepc, puis recherche paginée en secours). */
export async function findCnepcAutoEcole() {
  return autoEcoleService.findCnepcAutoEcoleForSelect({ timeout: 30000 });
}

/** Charge les formations d'une auto-école (endpoint /formations, sans dossiers). */
export async function loadFormations(autoEcoleId: string) {
  return autoEcoleService.listFormationsForSelect(autoEcoleId, { timeout: 30000 });
}

/** Recherche des candidats par terme. */
export async function searchCandidats(term: string) {
  const resp = await autoEcoleService.getCandidats(1, 30, { search: term });
  const items = Array.isArray(resp) ? resp : (resp as { data?: unknown[] }).data ?? [];
  return items as {
    id: string;
    personne?: { nom?: string; prenom?: string; email?: string };
    numero_candidat?: string;
  }[];
}

/** Charge les référentiels permis (catégories B, C, …) — même source que DossierForm / réception. */
export async function loadReferentiels() {
  try {
    const rows = await referentielService.getReferentielsByType('type_permis');
    return rows.map((r) => ({
      id: r.id,
      libelle: r.libelle,
      code: r.code,
      type_ref: r.type_ref,
    }));
  } catch {
    return [];
  }
}

/** Provinces via référentiels (pas GET /provinces — endpoint absent → 404). */
export async function loadProvinces() {
  try {
    const rows = await referentielService.getReferentielsByType('province');
    return rows.map((r) => ({
      id: r.id,
      libelle: r.libelle,
      nom: r.libelle ?? r.code,
    }));
  } catch {
    return [];
  }
}

type DemandeStateWithPermisData = DemandeFormState & { selected_permis_data?: PermisApiData[] };

/** Payload commun POST /dossiers et PUT /dossiers/{id} (sans création de compte candidat). */
function buildDossierPayloadFromDemandeState(
  candidatId: string,
  state: DemandeStateWithPermisData,
  mode: 'create' | 'update',
): Record<string, unknown> {
  const today = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  const payload: Record<string, unknown> = {
    candidat_id: candidatId,
    type_demande_id: state.type_demande_id,
    date_modification: nowIso,
    commentaires: state.commentaires || '',
  };

  if (mode === 'create') {
    payload.statut = 'en_attente';
    payload.date_creation = today;
    payload.expired = false;
    payload.suspended = false;
  }

  if (state.province_id) payload.province_id = state.province_id;
  if ((state as DemandeFormState & { centre_id?: string }).centre_id) {
    payload.centre_id = (state as DemandeFormState & { centre_id?: string }).centre_id;
  }
  const referencielId = (state.referenciel_id ?? '').trim();
  if (referencielId) {
    payload.referenciel_id = referencielId;
    payload.referentiel_id = referencielId;
  }

  if (state.is_nouveau_permis) {
    payload.auto_ecole_id = state.auto_ecole_id;
    payload.formation_id = state.formation_id;
  } else {
    if (state.auto_ecole_id) payload.auto_ecole_id = state.auto_ecole_id;
    if (state.formation_id) payload.formation_id = state.formation_id;
    const selectedPermis = state.selected_permis_data ?? [];
    const principalPermis = pickPrincipalPermisPayloadForType(selectedPermis, state.type_demande_name);
    if (selectedPermis.length > 0) {
      payload.data_categorie = buildDataCategoriePayloadStrings(selectedPermis);
    }
    const numeroPermis = (state.permis.numero_permis || principalPermis?.numero_permis || '').replace(/-/g, '');
    if (numeroPermis) payload.numero_permis = numeroPermis;
    const numeroOriginePermis = (state.permis.numero_origine_permis || '').replace(/-/g, '').trim();
    if (numeroOriginePermis) payload.numero_origine_permis = numeroOriginePermis;
    const lieuObtention = state.permis.lieu_de_dobtention_du_permis || String(principalPermis?.lieu_obtention ?? '');
    if (lieuObtention) payload.lieu_de_dobtention_du_permis = lieuObtention;
    const dateObtention =
      state.permis.date_de_dobtention_du_permis ||
      (typeof principalPermis?.date_obtention === 'string' ? principalPermis.date_obtention : '');
    if (dateObtention) payload.date_de_dobtention_du_permis = new Date(dateObtention).toISOString();
    const dateValidite =
      state.permis.date_de_delivrance_du_permis ||
      (typeof principalPermis?.date_validite === 'string' ? principalPermis.date_validite : '');
    if (dateValidite) payload.date_de_delivrance_du_permis = new Date(dateValidite).toISOString();
  }

  return payload;
}

/**
 * Met à jour un dossier existant (PUT /dossiers/{id}) avec les mêmes champs métier que la création,
 * sans réinitialiser statut ni date de création.
 */
export async function submitDemandeUpdate(
  dossierId: string,
  state: DemandeFormState,
  preserveFieldsFromGet?: Record<string, unknown>,
): Promise<void> {
  const id = dossierId.trim();
  if (!id) throw new Error('Identifiant de dossier manquant.');
  const candidatId = (state.candidat_id ?? '').trim();
  if (!candidatId) throw new Error('Aucun candidat associé à ce dossier pour la mise à jour.');

  const payload = buildDossierPayloadFromDemandeState(candidatId, state as DemandeStateWithPermisData, 'update');
  mergePreserveIntoUpdatePayload(payload, preserveFieldsFromGet);

  try {
    await gestionDossierService.updateDossier(
      id,
      payload as Parameters<typeof gestionDossierService.updateDossier>[1],
    );
  } catch (err) {
    throw new Error(extractError(err, 'Erreur lors de la mise à jour du dossier.'));
  }
}

/**
 * Orchestre la création complète d'un dossier :
 * 1. Si nouveau candidat → POST /auth/register + POST /candidats
 * 2. POST /dossiers
 */
export async function submitDemande(state: DemandeFormState): Promise<{ dossierId: string }> {
  let candidatId = state.candidat_id;

  if (state.candidat_mode === 'create') {
    candidatId = await createCandidatFromState(state);
  }

  if (!candidatId) throw new Error('Aucun candidat sélectionné ou créé.');

  // 3. Construire et envoyer le payload dossier
  const payload = buildDossierPayloadFromDemandeState(
    candidatId,
    state as DemandeFormState & { selected_permis_data?: PermisApiData[] },
    'create',
  );

  try {
    const resp = await gestionDossierService.createDossier(payload as Parameters<typeof gestionDossierService.createDossier>[0]);
    const dossierId =
      (resp as { data?: { id?: string }; id?: string })?.data?.id ??
      (resp as { id?: string })?.id ??
      '';
    return { dossierId };
  } catch (err) {
    throw new Error(extractError(err, 'Erreur lors de la création du dossier.'));
  }
}

/** POST /auth/register puis POST /candidats ; retourne l'id du candidat créé. */
async function createCandidatFromState(state: DemandeFormState): Promise<string> {
  let candidatId = '';
  {
    // 1. Créer le compte personne
    let personneId: string;
    try {
      const regResp = await authService.register({
        nom: state.personne.nom,
        prenom: state.personne.prenom,
        email: state.personne.email,
        password: state.personne.password,
        password_confirmation: state.personne.password_confirmation,
        contact: state.personne.telephone,
        telephone: state.personne.telephone,
        adresse: state.personne.adresse,
        role: 'candidat',
      });
      // Backends possibles:
      // - { data: { id } }
      // - { id }
      // - { user: { personne: { id } } }  <-- cas actuel
      // - { user: { id } }
      personneId =
        (regResp as { data?: { id?: string } })?.data?.id ??
        (regResp as { id?: string })?.id ??
        (regResp as { user?: { personne?: { id?: string } } })?.user?.personne?.id ??
        (regResp as { user?: { id?: string } })?.user?.id ??
        '';
      if (!personneId) throw new Error('Réponse de création du compte invalide (id manquant).');
    } catch (err) {
      throw new Error(extractError(err, 'Erreur lors de la création du compte.'));
    }

    // 2. Créer le profil candidat
    try {
      const candResp = await autoEcoleService.createCandidat({
        personne_id: personneId,
        numero_candidat: `CAN-${Date.now()}`,
        date_naissance: state.candidat.date_naissance,
        lieu_naissance: state.candidat.lieu_naissance,
        nip: state.candidat.nip,
        type_piece: state.candidat.type_piece,
        numero_piece: state.candidat.numero_piece,
        nationalite: state.candidat.nationalite,
        genre: state.candidat.genre,
      });
      candidatId =
        (candResp as { data?: { id?: string } })?.data?.id ??
        (candResp as { id?: string })?.id ??
        (candResp as { data?: { candidat?: { id?: string } } })?.data?.candidat?.id ??
        (candResp as { candidat?: { id?: string } })?.candidat?.id ??
        '';
      if (!candidatId) throw new Error('Réponse de création du candidat invalide (id manquant).');
    } catch (err) {
      throw new Error(extractError(err, 'Erreur lors de la création du profil candidat.'));
    }
  }

  return candidatId;
}

// ── Renouvellement simplifié ─────────────────────────────────────────────────

export interface CandidatRenouvellement {
  id: string;
  numero_candidat?: string;
  personne?: { nom?: string; prenom?: string; email?: string; contact?: string };
}

/** Candidat existant dont l'identité (nom, prénom, date de naissance) correspond au permis. */
export async function findCandidatPourPermis(p: PermisApiData): Promise<CandidatRenouvellement | null> {
  const nom = String(p.nom ?? '').trim();
  const dateNaissance = fmtDateOnly(typeof p.date_naissance === 'string' ? p.date_naissance : undefined);
  if (!nom || !dateNaissance) return null;
  const params: Record<string, string> = { nom, date_naissance: dateNaissance, per_page: '5' };
  const prenom = String(p.prenom ?? '').trim();
  if (prenom) params.prenom = prenom;
  const resp = await axiosClient.get('/candidats', { params });
  return extractPaginatedList<CandidatRenouvellement>(resp.data)[0] ?? null;
}

export interface NouveauCandidatRenouvellement {
  telephone: string;
  email?: string;
  genre: string;
  type_piece: string;
  numero_piece: string;
}

/** Crée compte + profil candidat à partir des données du permis (personne absente de la base candidats). */
export async function createCandidatPourRenouvellement(
  p: PermisApiData,
  saisie: NouveauCandidatRenouvellement,
): Promise<string> {
  // Le titulaire ne se connecte pas dans ce parcours : mot de passe aléatoire, réinitialisable par « mot de passe oublié ».
  const password = `Rn-${crypto.randomUUID()}`;
  const state = {
    ...({} as DemandeFormState),
    candidat_mode: 'create',
    personne: {
      nom: String(p.nom ?? '').trim(),
      prenom: String(p.prenom ?? '').trim(),
      email: saisie.email?.trim() || '',
      password,
      password_confirmation: password,
      telephone: saisie.telephone.trim(),
      adresse: '',
    },
    candidat: {
      date_naissance: fmtDateOnly(typeof p.date_naissance === 'string' ? p.date_naissance : undefined),
      lieu_naissance: String(p.lieu_naissance ?? '').trim(),
      nip: '',
      type_piece: saisie.type_piece,
      numero_piece: saisie.numero_piece.trim(),
      nationalite: String(p.nationalite ?? '').trim(),
      genre: saisie.genre,
    },
  } as unknown as DemandeFormState;
  return createCandidatFromState(state);
}

/**
 * Crée (ou reprend) le dossier de renouvellement. Le serveur renvoie `existing: true`
 * s'il existe déjà un renouvellement non transmis pour ce numéro de permis.
 */
export async function createDossierRenouvellement(input: {
  candidatId: string;
  typeDemandeId: string;
  numeroPermis: string;
  categories: PermisApiData[];
}): Promise<{ dossierId: string; numero?: string; existing: boolean }> {
  const principal = pickPrincipalPermisPayload(input.categories);
  const payload: Record<string, unknown> = {
    candidat_id: input.candidatId,
    type_demande_id: input.typeDemandeId,
    statut: 'en_attente',
    date_creation: new Date().toISOString().split('T')[0],
    expired: false,
    suspended: false,
    numero_permis: input.numeroPermis.replace(/-/g, '').trim(),
    data_categorie: buildDataCategoriePayloadStrings(input.categories),
  };
  if (principal?.lieu_obtention) payload.lieu_de_dobtention_du_permis = String(principal.lieu_obtention);
  if (typeof principal?.date_obtention === 'string' && principal.date_obtention) {
    payload.date_de_dobtention_du_permis = fmtDateOnly(principal.date_obtention);
  }
  if (typeof principal?.date_validite === 'string' && principal.date_validite) {
    payload.date_de_delivrance_du_permis = fmtDateOnly(principal.date_validite);
  }
  try {
    const resp = await axiosClient.post('/dossiers', payload);
    const body = resp.data as { existing?: boolean; data?: { id?: string; numero?: string } };
    const dossierId = String(body?.data?.id ?? '');
    if (!dossierId) throw new Error('Réponse de création du dossier invalide (id manquant).');
    return { dossierId, numero: body?.data?.numero, existing: Boolean(body?.existing) };
  } catch (err) {
    throw new Error(extractError(err, 'Erreur lors de la création du dossier de renouvellement.'));
  }
}

/** Types de demande qui digitalisent un permis existant (préalable au renouvellement d'une personne non digitalisée). */
export const TYPES_DIGITALISATION = ['FICHEENREGISTREMENT', 'DUPLICATAFICHEENREGISTREMENT', 'DUPLICATA'] as const;

export interface DonneesDigitalisation {
  dossierId: string;
  statut: string;
  transmis: boolean;
  numeroPermis: string;
  candidat: CandidatRenouvellement;
  principal: PermisApiData;
  categories: PermisApiData[];
}

/** Convertit un dossier de digitalisation (GET /dossiers) en données exploitables par le renouvellement. */
function donneesDepuisDossierDigitalisation(d: Record<string, unknown>): DonneesDigitalisation | null {
  const candidat = d.candidat as
    | { id?: string; numero_candidat?: string; date_naissance?: string; lieu_naissance?: string; nationalite?: string; numero_piece?: string; personne?: { nom?: string; prenom?: string; email?: string; contact?: string } }
    | undefined;
  const candidatId = String(candidat?.id ?? d.candidat_id ?? '');
  if (!candidatId) return null;

  const numeroPermis = String(d.numero_permis ?? d.numero_origine_permis ?? '').trim();
  const identite = {
    nom: candidat?.personne?.nom,
    prenom: candidat?.personne?.prenom,
    date_naissance: candidat?.date_naissance,
    lieu_naissance: candidat?.lieu_naissance,
    nationalite: candidat?.nationalite,
    numero_identite: candidat?.numero_piece,
  };
  const lignes = (Array.isArray(d.data_categorie) ? d.data_categorie : [])
    .map((raw) => {
      if (typeof raw !== 'string') return raw as Record<string, unknown>;
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');
  const categories: PermisApiData[] = lignes.map((c) => ({
    ...identite,
    numero_permis: String(c.codification_code ?? '').trim() || numeroPermis,
    categorie: String(c.classe ?? '').trim(),
    lieu_obtention: String(c.ville ?? '').trim(),
    date_obtention: fmtDateOnly(String(c.valable_du ?? '')),
    date_validite: fmtDateOnly(String(c.jusqu_au ?? '')),
  }));
  const principal: PermisApiData = categories[0]
    ? { ...categories[0], numero_permis: numeroPermis || categories[0].numero_permis }
    : { ...identite, numero_permis: numeroPermis };
  const statut = String(d.statut ?? '');

  return {
    dossierId: String(d.id ?? ''),
    statut,
    transmis: statut.toUpperCase().replace(/\s+/g, '').includes('DOSSIERENVOY'),
    numeroPermis,
    candidat: { id: candidatId, numero_candidat: candidat?.numero_candidat, personne: candidat?.personne },
    principal,
    categories,
  };
}

/** Charge un dossier de digitalisation par son id (enchaînement « digitaliser puis renouveler »). */
export async function chargerDigitalisation(dossierId: string): Promise<DonneesDigitalisation | null> {
  const res = await axiosClient.get(`/dossiers/${dossierId}`, { params: { include: 'candidat.personne' } });
  const d = (res.data?.data ?? res.data) as Record<string, unknown> | null;
  return d ? donneesDepuisDossierDigitalisation(d) : null;
}

/** Dernier dossier de digitalisation (fiche / duplicata) portant ce numéro de permis ou d'origine. */
export async function findDigitalisationParNumero(numero: string): Promise<DonneesDigitalisation | null> {
  const res = await axiosClient.get('/dossiers', { params: { numero_permis: numero.replace(/-/g, '').trim(), per_page: 20 } });
  const dossiers = extractPaginatedList<Record<string, unknown>>(res.data);
  const digitalisation = dossiers.find((d) => {
    const type = d.type_demande as { name?: string } | undefined;
    return (TYPES_DIGITALISATION as readonly string[]).includes(normalizeDemandeKey(type?.name));
  });
  return digitalisation ? donneesDepuisDossierDigitalisation(digitalisation) : null;
}

export const demandeService = {
  loadTypeDemandes,
  loadAutoEcoles,
  loadFormations,
  searchCandidats,
  loadReferentiels,
  loadProvinces,
  submitDemande,
  submitDemandeUpdate,
  fetchDossierForEdition,
  pickEditionPutPreserveFields,
  verifyDgdi,
  verifyPermisParNumero,
  verifyPermisParIdentite,
  searchPermisParIdentite,
};
