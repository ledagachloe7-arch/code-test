/**
 * Service du dashboard : statistiques auto-école et admin.
 */
import axiosClient from '../../../shared/utils/axiosConfig';
import { API_CONFIG } from '../../../shared/constants/api';
import { getAutoEcoleId } from '../../../shared/utils/autoEcoleUtils';
import { autoEcoleService } from '../../cnepc/services/auto-ecole.service';

/** Timeout plus long pour les agrégations multi auto-écoles (évite "10000ms exceeded"). */
const DASHBOARD_REQUEST_CONFIG = { timeout: API_CONFIG.DASHBOARD_TIMEOUT };
import type {
  AutoEcoleStats,
  AdminStats,
  AutoEcoleApiItem,
  DossierApiItem,
  DossierStatutListEntry,
  DossiersParAutoEcoleItem,
  DossiersParStatutItem,
  DossiersParTypeDemandeItem,
  DossiersParTypeDemandeWithWeeklyItem,
  DossiersParTypeDemandeWithWeeklyResponse,
} from '../types';

function isAutoEcoleActive(ae: AutoEcoleApiItem): boolean {
  if (typeof ae.statut === 'boolean') return ae.statut === true;
  if (typeof ae.statut === 'number') return ae.statut === 1;
  const statut = typeof ae.statut === 'string' ? ae.statut.toLowerCase() : '';
  const statutLibelle = typeof ae.statut_libelle === 'string' ? ae.statut_libelle.toLowerCase() : '';
  return (
    statut === 'actif' ||
    statut === 'active' ||
    statut === 'activé' ||
    statutLibelle === 'actif' ||
    statutLibelle === 'active' ||
    statutLibelle === 'activé'
  );
}

function parseDossiersResponse(response: { dossiers?: DossierApiItem[] }): DossierApiItem[] {
  return response?.dossiers ?? [];
}

/** Statut cible : VALIDATION DE DOSSIER (comparaison insensible à la casse et aux espaces/underscores). */
function isStatutValidationDeDossier(statut: string | undefined): boolean {
  const s = (statut ?? '').toString().toUpperCase().replace(/\s+/g, ' ').replace(/_/g, ' ').trim();
  return s === 'VALIDATION DE DOSSIER' || s.includes('VALIDATION DE DOSSIER');
}

/**
 * Récupère les statistiques dashboard pour un responsable auto-école.
 */
export async function getAutoEcoleStats(): Promise<AutoEcoleStats> {
  const autoEcoleId = getAutoEcoleId();
  if (!autoEcoleId) {
    return { totalEleves: 0, dossiersValides: 0, transmisCNEPC: 0, dossiersValidationDossier: 0 };
  }
  const response = await autoEcoleService.getDossiersByAutoEcoleId(autoEcoleId);
  const dossiers = parseDossiersResponse(response);

  const totalEleves = dossiers.length;
  const dossiersValides = dossiers.filter((d) => {
    const statut = (d.statut ?? '').toString().toLowerCase();
    return statut === 'valide' || statut === 'validated' || statut === 'validee';
  }).length;
  const transmisCNEPC = dossiers.filter((d) => {
    const statut = (d.statut ?? '').toString().toLowerCase();
    return statut === 'transmis' || statut === 'transmitted';
  }).length;
  const dossiersValidationDossier = dossiers.filter((d) =>
    isStatutValidationDeDossier((d.statut ?? '').toString())
  ).length;

  return { totalEleves, dossiersValides, transmisCNEPC, dossiersValidationDossier };
}

/**
 * Récupère les statistiques dashboard pour un admin (auto-écoles).
 */
export async function getAdminStats(): Promise<AdminStats> {
  const response = await axiosClient.get<{ data?: AutoEcoleApiItem[]; success?: boolean }>(
    '/auto-ecoles',
    DASHBOARD_REQUEST_CONFIG
  );
  const data = response.data;

  let autoEcoles: AutoEcoleApiItem[] = [];
  if (data?.data && Array.isArray(data.data)) {
    autoEcoles = data.data;
  } else if (data?.success && data?.data) {
    autoEcoles = Array.isArray(data.data) ? data.data : [data.data as AutoEcoleApiItem];
  } else if (Array.isArray(data)) {
    autoEcoles = data as unknown as AutoEcoleApiItem[];
  }

  const totalAutoEcoles = autoEcoles.length;
  const autoEcolesActives = autoEcoles.filter(isAutoEcoleActive).length;
  const autoEcolesInactives = totalAutoEcoles - autoEcolesActives;

  return {
    totalAutoEcoles,
    autoEcolesActives,
    autoEcolesInactives,
  };
}

/**
 * Récupère le nombre de dossiers candidats par auto-école (pour la vue admin).
 * Charge les auto-écoles puis le nombre de dossiers pour chacune (en parallèle, limité à maxAutoEcoles).
 */
export async function getDossiersCountByAutoEcole(
  maxAutoEcoles: number = 30
): Promise<DossiersParAutoEcoleItem[]> {
  const listResponse = await autoEcoleService.getAutoEcoles(1, maxAutoEcoles, undefined, DASHBOARD_REQUEST_CONFIG);
  const autoEcoles = listResponse?.data ?? [];
  if (autoEcoles.length === 0) return [];

  const results = await Promise.all(
    autoEcoles.map(async (ae: { id: string; nom_auto_ecole?: string }) => {
      try {
        const res = await autoEcoleService.getDossiersByAutoEcoleId(ae.id, undefined, DASHBOARD_REQUEST_CONFIG);
        const count = res?.dossiers?.length ?? 0;
        return {
          autoEcoleId: ae.id,
          nom: ae.nom_auto_ecole ?? ae.id,
          count,
        };
      } catch {
        return {
          autoEcoleId: ae.id,
          nom: (ae as { nom_auto_ecole?: string }).nom_auto_ecole ?? ae.id,
          count: 0,
        };
      }
    })
  );
  return results;
}

/** Dossier avec type_demande_id, type_demande et date de création (pour regroupement). */
interface DossierWithTypeDemande extends DossierApiItem {
  type_demande_id?: string;
  type_demande?: { id: string; name: string };
  created_at?: string;
  date_creation?: string;
}

/**
 * Récupère le nombre de dossiers par type de demande pour l’auto-école connectée.
 */
export async function getDossiersCountByTypeDemande(): Promise<DossiersParTypeDemandeItem[]> {
  const autoEcoleId = getAutoEcoleId();
  if (!autoEcoleId) return [];
  const response = await autoEcoleService.getDossiersByAutoEcoleId(autoEcoleId);
  const dossiers = parseDossiersResponse(response) as DossierWithTypeDemande[];

  const byId = new Map<string, { count: number; libelle: string }>();
  for (const d of dossiers) {
    const id = d.type_demande_id ?? '';
    const key = id || '__non_renseigne__';
    const name = d.type_demande?.name;
    const cur = byId.get(key);
    if (cur) {
      cur.count += 1;
      if (name) cur.libelle = name;
    } else {
      byId.set(key, {
        count: 1,
        libelle: name ?? (key === '__non_renseigne__' ? 'Non renseigné' : `Type ${id}`),
      });
    }
  }
  return Array.from(byId.entries()).map(([typeDemandeId, { count, libelle }]) => ({
    typeDemandeId: typeDemandeId === '__non_renseigne__' ? '' : typeDemandeId,
    libelle,
    count,
  }));
}

/**
 * Agrège les dossiers par type de demande sur toute la plateforme (vue admin).
 * Limite le nombre d’auto-écoles interrogées pour éviter trop de requêtes.
 */
function aggregateByTypeDemande(dossiers: DossierWithTypeDemande[]): DossiersParTypeDemandeItem[] {
  const byId = new Map<string, { count: number; libelle: string }>();
  for (const d of dossiers) {
    const id = d.type_demande_id ?? '';
    const key = id || '__non_renseigne__';
    const name = d.type_demande?.name;
    const cur = byId.get(key);
    if (cur) {
      cur.count += 1;
      if (name) cur.libelle = name;
    } else {
      byId.set(key, {
        count: 1,
        libelle: name ?? (key === '__non_renseigne__' ? 'Non renseigné' : `Type ${id}`),
      });
    }
  }
  return Array.from(byId.entries()).map(([typeDemandeId, { count, libelle }]) => ({
    typeDemandeId: typeDemandeId === '__non_renseigne__' ? '' : typeDemandeId,
    libelle,
    count,
  }));
}

/**
 * Récupère le nombre de dossiers par type de demande pour toute la plateforme (admin).
 */
export async function getDossiersCountByTypeDemandeAdmin(
  maxAutoEcoles: number = 30
): Promise<DossiersParTypeDemandeItem[]> {
  const listResponse = await autoEcoleService.getAutoEcoles(1, maxAutoEcoles, undefined, DASHBOARD_REQUEST_CONFIG);
  const autoEcoles = listResponse?.data ?? [];
  if (autoEcoles.length === 0) return [];

  const allDossiers: DossierWithTypeDemande[] = [];
  await Promise.all(
    autoEcoles.map(async (ae: { id: string }) => {
      try {
        const res = await autoEcoleService.getDossiersByAutoEcoleId(ae.id, undefined, DASHBOARD_REQUEST_CONFIG);
        const list = parseDossiersResponse(res) as DossierWithTypeDemande[];
        allDossiers.push(...list);
      } catch {
        // ignore
      }
    })
  );
  return aggregateByTypeDemande(allDossiers);
}

/** Libellé affichable pour un statut (étapes liées par _ → espacées). */
function formatStatutLibelle(statut: string): string {
  return (statut ?? '').trim().replace(/_/g, ' ');
}

/**
 * Agrège les dossiers par étape de traitement (statut) sur toute la plateforme (vue admin).
 * Chaque statut du dossier correspond à une étape du circuit.
 */
export async function getDossiersCountByStatutAdmin(
  maxAutoEcoles: number = 30
): Promise<DossiersParStatutItem[]> {
  const listResponse = await autoEcoleService.getAutoEcoles(1, maxAutoEcoles, undefined, DASHBOARD_REQUEST_CONFIG);
  const autoEcoles = listResponse?.data ?? [];
  if (autoEcoles.length === 0) return [];

  const allDossiers: DossierApiItem[] = [];
  await Promise.all(
    autoEcoles.map(async (ae: { id: string }) => {
      try {
        const res = await autoEcoleService.getDossiersByAutoEcoleId(ae.id, undefined, DASHBOARD_REQUEST_CONFIG);
        const list = parseDossiersResponse(res);
        allDossiers.push(...list);
      } catch {
        // ignore
      }
    })
  );

  const byStatut = new Map<string, number>();
  for (const d of allDossiers) {
    const statut = (d.statut ?? '').toString().trim() || '__non_renseigne__';
    byStatut.set(statut, (byStatut.get(statut) ?? 0) + 1);
  }

  return Array.from(byStatut.entries())
    .map(([statut, count]) => ({
      statut: statut === '__non_renseigne__' ? '' : statut,
      libelle: statut === '__non_renseigne__' ? 'Non renseigné' : formatStatutLibelle(statut),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Résultat agrégé : par statut et par type de demande en un seul chargement. */
export interface DossiersAggregationsAdmin {
  byStatut: DossiersParStatutItem[];
  byTypeDemande: DossiersParTypeDemandeItem[];
}

/**
 * Récupère les dossiers une seule fois puis agrège par étape (statut) et par type de demande.
 * Évite de doubler les appels API (un seul passage sur les auto-écoles).
 */
export async function getDossiersAggregationsByStatutAndTypeAdmin(
  maxAutoEcoles: number = 25
): Promise<DossiersAggregationsAdmin> {
  const listResponse = await autoEcoleService.getAutoEcoles(1, maxAutoEcoles, undefined, DASHBOARD_REQUEST_CONFIG);
  const autoEcoles = listResponse?.data ?? [];
  if (autoEcoles.length === 0) {
    return { byStatut: [], byTypeDemande: [] };
  }

  const allDossiers: DossierWithTypeDemande[] = [];
  await Promise.all(
    autoEcoles.map(async (ae: { id: string }) => {
      try {
        const res = await autoEcoleService.getDossiersByAutoEcoleId(ae.id, undefined, DASHBOARD_REQUEST_CONFIG);
        const list = parseDossiersResponse(res) as DossierWithTypeDemande[];
        allDossiers.push(...list);
      } catch {
        // ignore
      }
    })
  );

  const byStatut = new Map<string, number>();
  for (const d of allDossiers) {
    const statut = (d.statut ?? '').toString().trim() || '__non_renseigne__';
    byStatut.set(statut, (byStatut.get(statut) ?? 0) + 1);
  }
  const byStatutList: DossiersParStatutItem[] = Array.from(byStatut.entries())
    .map(([statut, count]) => ({
      statut: statut === '__non_renseigne__' ? '' : statut,
      libelle: statut === '__non_renseigne__' ? 'Non renseigné' : formatStatutLibelle(statut),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    byStatut: byStatutList,
    byTypeDemande: aggregateByTypeDemande(allDossiers),
  };
}

/** Retourne le lundi (début de semaine) pour une date au format ISO ou similaire. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Formate une date de début de semaine en libellé court (ex. "04 nov."). */
function formatWeekLabel(weekStart: Date): string {
  const day = weekStart.getDate();
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const month = months[weekStart.getMonth()];
  return `${String(day).padStart(2, '0')} ${month}`;
}

const NUM_WEEKS = 12;

/**
 * Récupère les dossiers par type de demande avec créations par semaine (admin).
 * Les semaines sont les N dernières (lundi à dimanche), ordre du plus ancien au plus récent.
 */
export async function getDossiersByTypeDemandeWithWeeklyAdmin(
  maxAutoEcoles: number = 30
): Promise<DossiersParTypeDemandeWithWeeklyResponse> {
  const listResponse = await autoEcoleService.getAutoEcoles(1, maxAutoEcoles, undefined, DASHBOARD_REQUEST_CONFIG);
  const autoEcoles = listResponse?.data ?? [];
  if (autoEcoles.length === 0) {
    return { weekLabels: [], items: [] };
  }

  const allDossiers: DossierWithTypeDemande[] = [];
  await Promise.all(
    autoEcoles.map(async (ae: { id: string }) => {
      try {
        const res = await autoEcoleService.getDossiersByAutoEcoleId(ae.id, undefined, DASHBOARD_REQUEST_CONFIG);
        const list = parseDossiersResponse(res) as DossierWithTypeDemande[];
        allDossiers.push(...list);
      } catch {
        // ignore
      }
    })
  );

  const now = new Date();
  const weekStarts: Date[] = [];
  for (let i = NUM_WEEKS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - 7 * i);
    weekStarts.push(getWeekStart(d));
  }
  const weekLabels = weekStarts.map(formatWeekLabel);

  const byType = new Map<string, { libelle: string; count: number; weekly: number[] }>();
  const initWeekly = (): number[] => Array(NUM_WEEKS).fill(0);

  for (const d of allDossiers) {
    const raw = (d.created_at ?? d.date_creation ?? '') as string;
    const typeId = d.type_demande_id ?? '';
    const key = typeId || '__non_renseigne__';
    const name = d.type_demande?.name;

    let weekIndex = NUM_WEEKS - 1;
    if (raw) {
      const created = new Date(raw);
      if (!Number.isNaN(created.getTime())) {
        const ws = getWeekStart(created);
        const t = ws.getTime();
        let found = -1;
        for (let i = 0; i < weekStarts.length; i++) {
          if (weekStarts[i].getTime() === t) {
            found = i;
            break;
          }
        }
        if (found >= 0) weekIndex = found;
        else {
          const nearest = weekStarts.reduce((best, w, i) =>
            Math.abs(w.getTime() - t) < Math.abs(weekStarts[best].getTime() - t) ? i : best
          );
          weekIndex = nearest;
        }
      }
    }

    let cur = byType.get(key);
    if (!cur) {
      cur = {
        libelle: name ?? (key === '__non_renseigne__' ? 'Non renseigné' : `Type ${typeId}`),
        count: 0,
        weekly: initWeekly(),
      };
      byType.set(key, cur);
    }
    cur.count += 1;
    if (weekIndex >= 0 && weekIndex < NUM_WEEKS) cur.weekly[weekIndex] += 1;
  }

  const items: DossiersParTypeDemandeWithWeeklyItem[] = Array.from(byType.entries()).map(
    ([typeDemandeId, { libelle, count, weekly }]) => ({
      typeDemandeId: typeDemandeId === '__non_renseigne__' ? '' : typeDemandeId,
      libelle,
      count,
      weeklyCounts: weekly,
    })
  );

  return { weekLabels, items };
}

/** Statuts cibles pour la liste des dossiers "en attente" (paiement / envoi impression). */
const STATUT_EN_ATTENTE_PAIEMENT = 'EN_ATTENTE_PAIEMENT';
const STATUT_ENVOI_IMPRESSION_LIBELLE = 'ENVOI DE DOSSIER POUR IMPRESSION';

function isDossierEnAttentePaiement(statut: string | undefined): boolean {
  return (statut ?? '').toUpperCase() === STATUT_EN_ATTENTE_PAIEMENT;
}

function isDossierEnvoiImpression(statut: string | undefined): boolean {
  const upper = (statut ?? '').toUpperCase();
  return upper.includes(STATUT_ENVOI_IMPRESSION_LIBELLE) || upper.includes('IMPRESSION');
}

function isDossierEnAttente(statut: string | undefined): boolean {
  const upper = (statut ?? '').toUpperCase();
  return upper.includes('EN_ATTENT');
}

/**
 * Récupère les dossiers dont le statut est "EN_ATTENTE_PAIEMENT", "ENVOI DE DOSSIER POUR IMPRESSION" ou "en_attent(e)" (vue admin).
 */
export async function getDossiersEnAttenteByStatutsAdmin(
  maxAutoEcoles: number = 50
): Promise<DossierStatutListEntry[]> {
  const listResponse = await autoEcoleService.getAutoEcoles(1, maxAutoEcoles, undefined, DASHBOARD_REQUEST_CONFIG);
  const autoEcoles = listResponse?.data ?? [];
  if (autoEcoles.length === 0) return [];

  const results: DossierStatutListEntry[] = [];
  await Promise.all(
    autoEcoles.map(async (ae: { id: string; nom_auto_ecole?: string }) => {
      try {
        const res = await autoEcoleService.getDossiersByAutoEcoleId(ae.id, undefined, DASHBOARD_REQUEST_CONFIG);
        const list = parseDossiersResponse(res);
        const nom = ae.nom_auto_ecole ?? ae.id;
        for (const d of list) {
          const statut = (d.statut ?? '').toString();
          if (
            isDossierEnAttentePaiement(statut) ||
            isDossierEnvoiImpression(statut) ||
            isDossierEnAttente(statut)
          ) {
            results.push({
              id: (d as { id?: string }).id ?? '',
              statut,
              autoEcoleNom: nom,
              candidat: (d as { candidat?: DossierStatutListEntry['candidat'] }).candidat,
              ...d,
            });
          }
        }
      } catch {
        // ignore
      }
    })
  );
  return results;
}
