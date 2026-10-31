/**
 * Rapport des étapes de circuit — tous les types de demande affichés simultanément.
 *
 * Logique calquée sur useEtapeCompletion :
 *   dossier.statut = libellé de l'étape courante du dossier dans son circuit.
 *
 * Association dossier ↔ circuit :
 *   1. circuit.nom_entite ↔ dossier.typeDemandeRawName  (source de vérité)
 *   2. fallback : étape.statut_libelle/libelle/code ↔ dossier.statut
 *
 * Pour chaque étape Ei d'un circuit, un dossier est :
 *   • En attente  (gris)   → etapeIndex < i  OU  non démarré (etapeIndex = -1)
 *   • En cours    (orange) → etapeIndex === i
 *   • Complétée   (vert)   → etapeIndex > i
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import { getPaiementsList } from '../../frais-dossier/services/paiements.service';
import type { PaiementApiItem } from '../../frais-dossier/types/paiements.types';
import { getRapportDossierEtapes } from '../services';
import type { DossierRapport, StatutCircuit } from '../types';
import type {
  CircuitSuivi,
  EtapeCircuit,
} from '../../reception/services/circuit-suivi.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return (s ?? '').toUpperCase().replace(/[\s_\-]+/g, '');
}

function dossierBelongsToCircuit(typeDemandeRawName: string, circuit: CircuitSuivi): boolean {
  if (!typeDemandeRawName || !circuit.nom_entite) return false;
  return norm(typeDemandeRawName) === norm(circuit.nom_entite);
}

function etapeMatchesDossierStatut(etape: EtapeCircuit, statut: string): boolean {
  const s = (statut ?? '').trim().toLowerCase();
  if (!s) return false;
  const sl = (etape.statut_libelle ?? '').trim().toLowerCase();
  const lib = (etape.libelle ?? '').trim().toLowerCase();
  const code = (etape.code ?? '').trim().toLowerCase();
  return sl === s || lib === s || (code !== '' && code === s) || (lib !== '' && s.startsWith(lib));
}

function findEtapeIndex(dossierStatut: string, etapes: EtapeCircuit[]): number {
  const s = (dossierStatut ?? '').trim();
  if (!s) return -1;
  return etapes.findIndex((e) => etapeMatchesDossierStatut(e, s));
}

function findCircuitForDossier(
  dossier: { statut: string; typeDemandeRawName: string },
  circuits: CircuitSuivi[],
): { circuit: CircuitSuivi; etapeIndex: number } | null {
  // 1. Matching par nom_entite (méthode principale)
  const byNomEntite = circuits.find((c) =>
    dossierBelongsToCircuit(dossier.typeDemandeRawName, c),
  );
  if (byNomEntite) {
    return {
      circuit: byNomEntite,
      etapeIndex: findEtapeIndex(dossier.statut, byNomEntite.etapes ?? []),
    };
  }
  // 2. Fallback : matching par statut ↔ libellé étape
  for (const circuit of circuits) {
    const idx = findEtapeIndex(dossier.statut, circuit.etapes ?? []);
    if (idx >= 0) return { circuit, etapeIndex: idx };
  }
  return null;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface EtapeRow {
  etape: EtapeCircuit;
  etapeIndex: number;
  pending: number;
  in_progress: number;
  completed: number;
  total: number;
}

interface CircuitStats {
  circuit: CircuitSuivi;
  etapeRows: EtapeRow[];
  totalDossiers: number;
  nonDemarres: number;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const CHART_HEIGHT = 280;
const CHART_MARGIN = { top: 28, right: 24, bottom: 80, left: 56 };

function toISO(d: Date): string { return d.toISOString().slice(0, 10); }
function formatDateLabel(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}
function getDateStr(d: { created_at?: string | null }): string {
  if (!d.created_at) return '—';
  const dt = new Date(d.created_at);
  return isNaN(dt.getTime()) ? '—' : dt.toISOString().slice(0, 10);
}

const PAIEMENTS_PAGE_SIZE = 200;

interface PaiementDossierJoin {
  montant: string;
  reference: string;
  datePaiementIso: string;
}

type PaiementIndexState = {
  byDossierId: Record<string, PaiementDossierJoin>;
  byCode: Record<string, PaiementDossierJoin>;
};

const EMPTY_PAIEMENT_INDEX: PaiementIndexState = { byDossierId: {}, byCode: {} };

function getDossierIdFromPaiement(p: PaiementApiItem): string | null {
  const raw = p.dossier;
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = o.id;
  if (typeof id === 'string' && id.trim()) return id.trim();
  const data = o.data as Record<string, unknown> | undefined;
  if (data && typeof data.id === 'string' && data.id.trim()) return data.id.trim();
  return null;
}

/** Même format date/heure que `formatDateFr` dans FraisDossierTable — Excel (cellule vide si absent). */
function formatDateFrExcel(iso: string | null | undefined): string {
  if (!iso?.trim()) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Affichage tableau : comme FraisDossierTable (`formatDateFr`). */
function formatDateFrTable(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function paiementRowToJoin(row: PaiementApiItem): PaiementDossierJoin {
  return {
    montant: (row.montant ?? '').toString().trim(),
    reference: (row.reference_paiement ?? '').toString().trim(),
    datePaiementIso: row.created_at?.trim() ?? '',
  };
}

function tsFromIso(iso: string): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

async function fetchPaiementsIndexed(): Promise<PaiementIndexState> {
  const first = await getPaiementsList({ page: 1, per_page: PAIEMENTS_PAGE_SIZE });
  const all: PaiementApiItem[] = [...first.data];
  for (let p = 2; p <= first.meta.last_page; p++) {
    const { data } = await getPaiementsList({ page: p, per_page: PAIEMENTS_PAGE_SIZE });
    all.push(...data);
  }
  const byId = new Map<string, PaiementDossierJoin>();
  const byCode = new Map<string, PaiementDossierJoin>();
  for (const row of all) {
    const join = paiementRowToJoin(row);
    const t = tsFromIso(join.datePaiementIso);
    const dossierId = getDossierIdFromPaiement(row);
    if (dossierId) {
      const prev = byId.get(dossierId);
      if (!prev || tsFromIso(prev.datePaiementIso) < t) byId.set(dossierId, join);
    }
    const code = (row.code_paiement ?? '').trim().toUpperCase();
    if (code) {
      const prev = byCode.get(code);
      if (!prev || tsFromIso(prev.datePaiementIso) < t) byCode.set(code, join);
    }
  }
  const byDossierId: Record<string, PaiementDossierJoin> = {};
  byId.forEach((v, k) => {
    byDossierId[k] = v;
  });
  const byCodeRec: Record<string, PaiementDossierJoin> = {};
  byCode.forEach((v, k) => {
    byCodeRec[k] = v;
  });
  return { byDossierId, byCode: byCodeRec };
}

function getPaiementInfoForDossier(d: DossierRapport, idx: PaiementIndexState): PaiementDossierJoin | undefined {
  const idHit = idx.byDossierId[d.id];
  if (idHit) return idHit;
  const code = (d.code_paiement ?? '').trim().toUpperCase();
  if (!code) return undefined;
  return idx.byCode[code];
}

/** Parse un montant texte API / affichage (espaces, FCFA, virgule décimale). */
function parseMontantNombre(m: string | null | undefined): number {
  if (!m?.trim()) return 0;
  let s = m.replace(/\s/g, '').replace(/fcfa/gi, '').replace(/xaf/gi, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot && lastComma >= 0) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = parseFloat(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatMontantFr(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function libelleCategoriePermisRapport(d: DossierRapport): string {
  const f = (d.formationLabel ?? '').trim();
  if (f) return f;
  const r = (d.referentielLabel ?? '').trim();
  if (r) return r;
  const dc = (d.data_categorie ?? []).filter(Boolean);
  if (dc.length) return dc.join(', ');
  return '—';
}

interface MontantAggregates {
  parType: { cle: string; nbDossiers: number; montant: number }[];
  parCategorie: { cle: string; nbDossiers: number; montant: number }[];
  totalMontant: number;
}

function computeMontantAggregates(list: DossierRapport[], idx: PaiementIndexState): MontantAggregates {
  const typeMap = new Map<string, { nb: number; montant: number }>();
  const catMap = new Map<string, { nb: number; montant: number }>();
  let totalMontant = 0;
  for (const d of list) {
    const pay = getPaiementInfoForDossier(d, idx);
    const m = parseMontantNombre(pay?.montant);
    const typeKey = ((d.typeDemandeName ?? '—').trim() || '—');
    const catKey = libelleCategoriePermisRapport(d);
    const bump = (map: Map<string, { nb: number; montant: number }>, key: string) => {
      const cur = map.get(key) ?? { nb: 0, montant: 0 };
      cur.nb += 1;
      cur.montant += m;
      map.set(key, cur);
    };
    bump(typeMap, typeKey);
    bump(catMap, catKey);
    totalMontant += m;
  }
  const parType = Array.from(typeMap.entries())
    .map(([cle, v]) => ({ cle, nbDossiers: v.nb, montant: v.montant }))
    .sort((a, b) => b.montant - a.montant || a.cle.localeCompare(b.cle, 'fr'));
  const parCategorie = Array.from(catMap.entries())
    .map(([cle, v]) => ({ cle, nbDossiers: v.nb, montant: v.montant }))
    .sort((a, b) => b.montant - a.montant || a.cle.localeCompare(b.cle, 'fr'));
  return { parType, parCategorie, totalMontant };
}

function buildWorksheetSyntheseMontants(
  titre: string,
  lignesContexte: string[],
  ag: MontantAggregates,
  nbDossiers: number,
): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    [titre],
    ...lignesContexte.map((l) => [l]),
    [],
    ['Par type de demande'],
    ['Type de demande', 'Nombre de dossiers', 'Montant total'],
    ...ag.parType.map((r) => [r.cle, r.nbDossiers, r.montant]),
    [],
    ['Par catégorie de permis'],
    ['Catégorie de permis', 'Nombre de dossiers', 'Montant total'],
    ...ag.parCategorie.map((r) => [r.cle, r.nbDossiers, r.montant]),
    [],
    ['TOTAL GLOBAL', nbDossiers, ag.totalMontant],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 42 }, { wch: 22 }, { wch: 18 }];
  return ws;
}

type StatutPaiementDossier = 'paye' | 'en_attente_verif' | 'sans_code';

/** Même règle que le dashboard Finance : payé = code généré et plus en EN_ATTENTE_PAIEMENT. */
function getStatutPaiementDossier(d: DossierRapport): StatutPaiementDossier {
  const code = (d.code_paiement ?? '').toString().trim();
  if (!code) return 'sans_code';
  const enAttente = (d.statut ?? '').toString().toUpperCase().trim() === 'EN_ATTENTE_PAIEMENT';
  return enAttente ? 'en_attente_verif' : 'paye';
}

function statutPaiementExport(d: DossierRapport): string {
  switch (getStatutPaiementDossier(d)) {
    case 'paye':
      return 'Payé';
    case 'en_attente_verif':
      return 'En attente de vérification';
    default:
      return '';
  }
}

/** Libellé export pour `DossierRapport.statutCircuit` (vue finance / étapes). */
function libelleStatutCircuitFinance(s: StatutCircuit): string {
  switch (s) {
    case 'pending':
      return 'Non démarré';
    case 'in_progress':
      return 'En cours';
    case 'completed':
      return 'Terminé (CNEDDT / fin de circuit)';
    default:
      return String(s);
  }
}

/** Colonnes finales communes aux exports « liste complète » (identification + paiement). */
function exportCorrespondanceDossierCols(d: DossierRapport): (string | number)[] {
  return [
    d.id ?? '',
    (d.typeDemandeRawName ?? '').trim(),
    libelleStatutCircuitFinance(d.statutCircuit),
    (d.code_paiement ?? '').trim() ? 'Oui' : 'Non',
  ];
}

function libelleEtapeCourante(
  d: DossierRapport,
  circuitsList: CircuitSuivi[],
  positions: Map<string, { circuitId: string; etapeIndex: number } | null>,
): string {
  const pos = positions.get(d.id);
  if (!pos) return '—';
  const circuit = circuitsList.find((c) => (c.id ?? '') === pos.circuitId);
  const etapes = circuit?.etapes ?? [];
  const idx = pos.etapeIndex;
  if (idx < 0) return 'Aucune étape entamée';
  return (etapes[idx]?.libelle ?? '').trim() || '—';
}

/** Libellé colonne Paiement (table + export liste filtrée), aligné sur l’affichage écran. */
function libellePaiementListe(d: DossierRapport): string {
  switch (getStatutPaiementDossier(d)) {
    case 'paye':
      return 'Payé';
    case 'en_attente_verif':
      return 'En attente de vérification';
    default:
      return '—';
  }
}

/** En-têtes Excel = libellés du tableau « Liste des dossiers » (lignes ~1305–1322). */
const HEADERS_TABLEAU_LISTE_DOSSIERS = [
  'Type de demande',
  'Candidat',
  'Centre',
  'Formation',
  'Date création',
  'Date maj.',
  'Étape actuelle',
  'Date (paiement)',
  'Montant',
  'Code',
  'Référence',
  'Paiement',
] as const;

/** Une ligne strictement comme à l’écran (formatDateFrTable, « — », textes Paiement). */
function rowListeDossiersCommeTableauEcran(
  d: DossierRapport,
  circuitsList: CircuitSuivi[],
  positions: Map<string, { circuitId: string; etapeIndex: number } | null>,
  idx: PaiementIndexState,
): string[] {
  const payInfo = getPaiementInfoForDossier(d, idx);
  return [
    d.typeDemandeName ?? '—',
    d.candidatLabel ?? '—',
    d.centreLabel ?? '—',
    d.formationLabel ?? '—',
    formatDateFrTable(d.created_at),
    formatDateFrTable(d.updated_at),
    libelleEtapeCourante(d, circuitsList, positions),
    formatDateFrTable(payInfo?.datePaiementIso),
    payInfo?.montant?.trim() || '—',
    (d.code_paiement ?? '').trim() || '—',
    payInfo?.reference?.trim() || '—',
    libellePaiementListe(d),
  ];
}

// ─── Composant ───────────────────────────────────────────────────────────────

export const FinanceDossierRapportTab: React.FC = () => {
  const theme = useTheme();

  const [dossiers, setDossiers] = useState<DossierRapport[]>([]);
  const [circuits, setCircuits] = useState<CircuitSuivi[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [datePickStep, setDatePickStep] = useState<'from' | 'to'>('from');
  const [chartsVisible, setChartsVisible] = useState(true);
  const [dossierListPage, setDossierListPage] = useState(0);
  const [dossierListRowsPerPage, setDossierListRowsPerPage] = useState(15);
  const [paiementIndex, setPaiementIndex] = useState<PaiementIndexState>(EMPTY_PAIEMENT_INDEX);

  // ── Chargement ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { dossiers: d, circuits: c } = await getRapportDossierEtapes();
      setDossiers(d);
      setCircuits(c);
      try {
        setPaiementIndex(await fetchPaiementsIndexed());
      } catch {
        setPaiementIndex(EMPTY_PAIEMENT_INDEX);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement');
      setPaiementIndex(EMPTY_PAIEMENT_INDEX);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Calendrier ─────────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    for (let i = 0; i < 6 - last.getDay(); i++) days.push(null);
    return days;
  }, [calendarMonth]);

  const handleCalendarDay = (d: Date) => {
    const iso = toISO(d);
    if (datePickStep === 'from') { setDateFrom(iso); setDateTo(''); setDatePickStep('to'); }
    else {
      if (iso < dateFrom) { setDateTo(dateFrom); setDateFrom(iso); } else { setDateTo(iso); }
      setDatePickStep('from');
    }
  };

  // ── Dataset filtré (période de création uniquement — pas de filtre par centre à l’écran) ──
  const filtered = useMemo(() => {
    let list = dossiers;
    if (dateFrom) list = list.filter((d) => { const s = getDateStr(d); return s !== '—' && s >= dateFrom; });
    if (dateTo) list = list.filter((d) => { const s = getDateStr(d); return s !== '—' && s <= dateTo; });
    return list;
  }, [dossiers, dateFrom, dateTo]);

  // ── Positions des dossiers ─────────────────────────────────────────────────
  const dossierPositions = useMemo(() => {
    const map = new Map<string, { circuitId: string; etapeIndex: number } | null>();
    filtered.forEach((d) => {
      const result = findCircuitForDossier(d, circuits);
      map.set(d.id, result ? { circuitId: result.circuit.id ?? '', etapeIndex: result.etapeIndex } : null);
    });
    return map;
  }, [filtered, circuits]);

  // ── Stats par circuit (TOUS les circuits) ──────────────────────────────────
  const allCircuitStats = useMemo((): CircuitStats[] => {
    return circuits.map((circuit) => {
      const circuitId = circuit.id ?? '';
      const etapes = circuit.etapes ?? [];

      const dossiersInCircuit = filtered.filter((d) => {
        const pos = dossierPositions.get(d.id);
        return pos !== null && pos !== undefined && pos.circuitId === circuitId;
      });

      const nonDemarres = dossiersInCircuit.filter(
        (d) => (dossierPositions.get(d.id)?.etapeIndex ?? -1) < 0,
      ).length;

      const etapeRows: EtapeRow[] = etapes.map((etape, etapeIndex) => {
        let pending = 0, in_progress = 0, completed = 0;
        dossiersInCircuit.forEach((d) => {
          const pos = dossierPositions.get(d.id);
          const idx = pos?.etapeIndex ?? -1;
          if (idx < 0 || idx < etapeIndex) pending++;
          else if (idx === etapeIndex) in_progress++;
          else completed++;
        });
        return { etape, etapeIndex, pending, in_progress, completed, total: in_progress + completed };
      });

      return {
        circuit,
        etapeRows,
        totalDossiers: dossiersInCircuit.length,
        nonDemarres,
      };
    });
  }, [circuits, filtered, dossierPositions]);

  const dossiersNonReconnus = useMemo(
    () => filtered.filter((d) => dossierPositions.get(d.id) === null),
    [filtered, dossierPositions],
  );

  const dossiersTableSorted = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        (a.candidatLabel ?? '').localeCompare(b.candidatLabel ?? '', 'fr', { sensitivity: 'base' }),
      ),
    [filtered],
  );

  const montantsAgregesFiltres = useMemo(
    () => computeMontantAggregates(filtered, paiementIndex),
    [filtered, paiementIndex],
  );

  const montantsAgregesTous = useMemo(
    () => computeMontantAggregates(dossiers, paiementIndex),
    [dossiers, paiementIndex],
  );

  useEffect(() => {
    setDossierListPage(0);
  }, [dateFrom, dateTo, dossiers.length]);

  // ── Graphique global : dossiers par type de demande ────────────────────────
  const globalChartData = useMemo(() => ({
    labels: allCircuitStats.map((s) => s.circuit.libelle ?? s.circuit.nom_entite ?? '?'),
    started: allCircuitStats.map((s) => s.totalDossiers - s.nonDemarres),
    notStarted: allCircuitStats.map((s) => s.nonDemarres),
  }), [allCircuitStats]);

  // ── Export Excel ─────────────────────────────────────────────────────────
  // Utilise TOUS les dossiers (dataset brut, sans aucun filtre date/centre). Dates = même format que FraisDossierTable.
  const handleExportExcel = async () => {
    const wb = XLSX.utils.book_new();

    const COLS = [
      { wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 20 }, { wch: 20 },
      { wch: 34 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 26 }, { wch: 20 }, { wch: 22 }, { wch: 22 },
      // Détails dossier
      { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 26 }, { wch: 16 }, { wch: 16 },
      { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 28 }, { wch: 32 },
      // Correspondance système
      { wch: 38 }, { wch: 26 }, { wch: 34 }, { wch: 22 },
    ];

    const HEADERS = [
      'Type de demande',
      'Candidat',
      'Centre d\'enrollment',
      'Catégorie / Formation',
      'Auto-école',
      'Étape actuelle',
      'Code étape',
      'Statut étape',
      'Code de paiement',
      'Date',
      'Montant',
      'Référence',
      'Paiement',
      'Statut brut (dossier)',
      'Date de création',
      'Date de mise à jour',
      // Détails dossier
      'Province',
      'Référentiel',
      'Numéro de permis',
      "Numéro d'origine du permis",
      "Lieu d'obtention du permis",
      "Date d'obtention du permis",
      'Date de délivrance du permis',
      'Expiré',
      "Date d'expiration",
      'Suspendu',
      'Date de suspension',
      'Catégories',
      'Commentaires',
      // Correspondance système
      'ID dossier',
      'Type de demande (code API)',
      'Statut circuit (vue finance)',
      'Code de paiement renseigné',
    ];

    // Calculer les positions pour TOUS les dossiers (pas de filtre)
    const allPositions = new Map<string, { circuitId: string; etapeIndex: number } | null>();
    dossiers.forEach((d) => {
      const result = findCircuitForDossier(d, circuits);
      allPositions.set(d.id, result ? { circuitId: result.circuit.id ?? '', etapeIndex: result.etapeIndex } : null);
    });

    const fmtBool = (v: boolean | null | undefined): string => {
      if (v === null || v === undefined) return '';
      return v ? 'Oui' : 'Non';
    };

    const buildRow = (
      d: DossierRapport,
      circuitLibelle: string,
      etapes: EtapeCircuit[],
    ): (string | number)[] => {
      const pos = allPositions.get(d.id);
      const etapeIndex = pos?.etapeIndex ?? -1;
      const etapeActuelle = etapeIndex >= 0 ? (etapes[etapeIndex] ?? null) : null;
      const pay = getPaiementInfoForDossier(d, paiementIndex);
      return [
        circuitLibelle,
        d.candidatLabel ?? '',
        d.centreLabel ?? '',
        d.formationLabel ?? '',
        d.autoEcoleNom ?? '',
        etapeActuelle?.libelle ?? (etapeIndex < 0 ? 'Aucune étape entamée' : ''),
        etapeActuelle?.code ?? '',
        etapeIndex >= 0 ? 'En cours' : 'Non démarré',
        (d.code_paiement ?? '').trim(),
        formatDateFrExcel(pay?.datePaiementIso),
        pay?.montant ?? '',
        pay?.reference ?? '',
        statutPaiementExport(d),
        d.statut ?? '',
        formatDateFrExcel(d.created_at),
        formatDateFrExcel(d.updated_at),
        // Détails dossier
        d.provinceLabel ?? '',
        d.referentielLabel ?? '',
        d.numero_permis ?? '',
        d.numero_origine_permis ?? '',
        d.lieu_obtention_permis ?? '',
        formatDateFrExcel(d.date_obtention_permis),
        formatDateFrExcel(d.date_delivrance_permis),
        fmtBool(d.expired),
        formatDateFrExcel(d.expiration_date),
        fmtBool(d.suspended),
        formatDateFrExcel(d.suspended_date),
        (d.data_categorie ?? []).join(', '),
        d.commentaires ?? '',
        ...exportCorrespondanceDossierCols(d),
      ];
    };

    // ── Onglet par circuit ──────────────────────────────────────────────────
    const synthRows: (string | number)[][] = [];

    circuits.forEach((circuit) => {
      const circuitId = circuit.id ?? '';
      const etapes = circuit.etapes ?? [];
      const circuitLibelle = circuit.libelle ?? circuit.nom_entite ?? '';
      const sheetLabel = circuitLibelle.slice(0, 31) || `circuit-${circuitId.slice(0, 8)}`;

      // Tous les dossiers de ce circuit (sans filtre)
      const inCircuit = dossiers.filter((d) => {
        const pos = allPositions.get(d.id);
        return pos !== null && pos !== undefined && pos.circuitId === circuitId;
      });

      const rows = inCircuit
        .map((d) => buildRow(d, circuitLibelle, etapes))
        .sort((a, b) => {
          // Tri : étape → date de création → candidat
          const eA = a[5] as string, eB = b[5] as string;
          if (eA !== eB) return eA.localeCompare(eB, 'fr');
          const dA = a[14] as string, dB = b[14] as string;
          if (dA !== dB) return dA.localeCompare(dB);
          return (a[1] as string).localeCompare(b[1] as string, 'fr');
        });

      synthRows.push(...rows);

      const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
      ws['!cols'] = COLS;
      XLSX.utils.book_append_sheet(wb, ws, sheetLabel);
    });

    // Dossiers hors circuit (aucun circuit reconnu)
    const horsCircuit = dossiers.filter((d) => allPositions.get(d.id) === null);
    horsCircuit.forEach((d) => {
      synthRows.push(buildRow(d, d.typeDemandeName || d.typeDemandeRawName || '—', []));
    });

    // ── Onglet "Tous les dossiers" ──────────────────────────────────────────
    const wsSynth = XLSX.utils.aoa_to_sheet([HEADERS, ...synthRows]);
    wsSynth['!cols'] = COLS;
    XLSX.utils.book_append_sheet(wb, wsSynth, 'Tous les dossiers');

    const wsMontants = buildWorksheetSyntheseMontants(
      'Synthèse des montants (paiements enregistrés)',
      [
        'Source : montants issus de /paiements, rattachés aux dossiers par id ou code de paiement.',
        'Sans filtre période / centre — tous les dossiers du système (toutes pages API), avec ou sans code de paiement.',
      ],
      montantsAgregesTous,
      dossiers.length,
    );
    XLSX.utils.book_append_sheet(wb, wsMontants, 'Synthèse montants');

    // Ordre des feuilles : Tous les dossiers, Synthèse montants, puis par circuit
    const sn = [...wb.SheetNames];
    const rest = sn.filter((n) => n !== 'Tous les dossiers' && n !== 'Synthèse montants');
    wb.SheetNames = ['Tous les dossiers', 'Synthèse montants', ...rest];

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `rapport-dossiers-${today}.xlsx`);
  };

  /** Export Excel : onglet « Synthèse montants » + « Liste dossiers » (mêmes filtres que l’écran). */
  const handleExportListeDossiersFiltreeExcel = useCallback(() => {
    const ctx: string[] = [
      'Montants = somme des paiements /paiements rattachés aux dossiers de la liste (id ou code).',
    ];
    if (dateFrom && dateTo) ctx.push(`Période (création dossier) : ${dateFrom} → ${dateTo}`);
    else if (dateFrom) ctx.push(`Période : à partir du ${dateFrom}`);
    else if (dateTo) ctx.push(`Période : jusqu’au ${dateTo}`);
    else ctx.push('Période : toutes les dates');
    ctx.push('Centres : tous (aucun filtre par centre sur cet écran).');

    const wsMontants = buildWorksheetSyntheseMontants(
      'Synthèse des montants (liste filtrée)',
      ctx,
      montantsAgregesFiltres,
      dossiersTableSorted.length,
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsMontants, 'Synthèse montants');

    if (dossiersTableSorted.length > 0) {
      const HEADERS = [
        'Type de demande',
        'Candidat',
        'Centre d\'enrollment',
        'Formation',
        'Date de création',
        'Date de mise à jour',
        'Étape actuelle',
        'Date',
        'Montant',
        'Code',
        'Référence',
        'Paiement',
        'ID dossier',
        'Type de demande (code API)',
        'Statut circuit (vue finance)',
        'Code de paiement renseigné',
      ];
      const rows = dossiersTableSorted.map((d) => {
        const pay = getPaiementInfoForDossier(d, paiementIndex);
        return [
          d.typeDemandeName ?? '',
          d.candidatLabel ?? '',
          d.centreLabel ?? '',
          d.formationLabel ?? '',
          formatDateFrExcel(d.created_at),
          formatDateFrExcel(d.updated_at),
          libelleEtapeCourante(d, circuits, dossierPositions),
          formatDateFrExcel(pay?.datePaiementIso),
          pay?.montant ?? '',
          (d.code_paiement ?? '').trim(),
          pay?.reference ?? '',
          libellePaiementListe(d),
          ...exportCorrespondanceDossierCols(d),
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
      ws['!cols'] = [
        { wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 26 }, { wch: 22 }, { wch: 22 }, { wch: 34 }, { wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 28 },
        { wch: 38 }, { wch: 26 }, { wch: 34 }, { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Liste dossiers');
    }

    const today = new Date().toISOString().slice(0, 10);
    const datePart =
      dateFrom && dateTo ? `${dateFrom}_au_${dateTo}` : dateFrom ? `depuis_${dateFrom}` : dateTo ? `jusque_${dateTo}` : 'toutes-dates';
    XLSX.writeFile(wb, `liste-dossiers-filtree-${datePart}-${today}.xlsx`);
  }, [
    dossiersTableSorted,
    circuits,
    dossierPositions,
    paiementIndex,
    montantsAgregesFiltres,
    dateFrom,
    dateTo,
  ]);

  /** Fichier Excel = même colonnes et mêmes valeurs que le tableau liste (toute la liste après filtre période, pas seulement la page). */
  const handleExportTableauListeDossiersEcran = useCallback(() => {
    if (dossiersTableSorted.length === 0) return;
    const wb = XLSX.utils.book_new();
    const rows = dossiersTableSorted.map((d) =>
      rowListeDossiersCommeTableauEcran(d, circuits, dossierPositions, paiementIndex),
    );
    const ws = XLSX.utils.aoa_to_sheet([[...HEADERS_TABLEAU_LISTE_DOSSIERS], ...rows]);
    ws['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 26 }, { wch: 22 }, { wch: 22 }, { wch: 34 }, { wch: 22 },
      { wch: 14 }, { wch: 18 }, { wch: 22 }, { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Liste dossiers');
    const today = new Date().toISOString().slice(0, 10);
    const datePart =
      dateFrom && dateTo ? `${dateFrom}_au_${dateTo}` : dateFrom ? `depuis_${dateFrom}` : dateTo ? `jusque_${dateTo}` : 'toutes-dates';
    XLSX.writeFile(wb, `tableau-liste-dossiers-${datePart}-${today}.xlsx`);
  }, [
    dossiersTableSorted,
    circuits,
    dossierPositions,
    paiementIndex,
    dateFrom,
    dateTo,
  ]);

  // ─── Bloc calendrier ───────────────────────────────────────────────────────
  const calendarBlock = (
    <Paper variant="outlined" sx={{ p: 1.5, position: { md: 'sticky' }, top: { md: 24 } }}>
      <Typography variant="caption" color="text.secondary"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <CalendarDaysIcon className="w-4 h-4" />Période (date de création)
      </Typography>
      {datePickStep === 'to' && dateFrom && (
        <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 0.5 }}>
          Sélectionnez la date de fin
        </Typography>
      )}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          {calendarMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </Typography>
        <Stack direction="row">
          <IconButton size="small"
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>‹</IconButton>
          <IconButton size="small"
            onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>›</IconButton>
        </Stack>
      </Stack>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', width: 280 }}>
        {WEEKDAYS.map((w) => (
          <Box key={w} sx={{ width: '14.28%', py: 0.5, textAlign: 'center', boxSizing: 'border-box' }}>
            <Typography variant="caption" color="text.secondary">{w}</Typography>
          </Box>
        ))}
        {calendarDays.map((d, i) => {
          if (!d) return <Box key={`e-${i}`} sx={{ width: '14.28%', aspectRatio: '1', p: 0.25, boxSizing: 'border-box' }} />;
          const iso = toISO(d);
          const isFrom = iso === dateFrom, isTo = iso === dateTo;
          const inRange = dateFrom && dateTo && iso >= dateFrom && iso <= dateTo;
          return (
            <Box key={iso} sx={{ width: '14.28%', aspectRatio: '1', p: 0.25, boxSizing: 'border-box' }}>
              <Box onClick={() => handleCalendarDay(d)} sx={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', borderRadius: 1, cursor: 'pointer', fontSize: '0.8rem',
                ...(isFrom || isTo ? { bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 600 }
                  : inRange ? { bgcolor: 'action.selected' }
                  : { '&:hover': { bgcolor: 'action.hover' } }),
              }}>{d.getDate()}</Box>
            </Box>
          );
        })}
      </Box>
      <Button size="small" onClick={() => { setDateFrom(''); setDateTo(''); setDatePickStep('from'); }} sx={{ mt: 1 }}>
        Effacer les dates
      </Button>
      {(dateFrom || dateTo) && (
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
          {dateFrom ? formatDateLabel(dateFrom) : '…'} → {dateTo ? formatDateLabel(dateTo) : '…'}
        </Typography>
      )}

      {/* Résumé global */}
      {!loading && (
        <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" sx={{ mb: 1 }}>
            Résumé global
          </Typography>
          {allCircuitStats.map(({ circuit, totalDossiers }) => (
            <Box key={circuit.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 160 }}>
                {circuit.libelle ?? circuit.nom_entite}
              </Typography>
              <Chip label={totalDossiers} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
            </Box>
          ))}
          {dossiersNonReconnus.length > 0 && (
            <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
              {dossiersNonReconnus.length} hors circuit
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );

  // ─── Table d'étapes pour un circuit ──────────────────────────────────────
  const renderEtapeTable = (etapeRows: EtapeRow[]) => (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', width: 32, py: 0.75 }}>#</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', py: 0.75 }}>Étape</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.7rem', py: 0.75, whiteSpace: 'nowrap' }}>
              <Chip label="En attente" size="small" color="default" />
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.7rem', py: 0.75, whiteSpace: 'nowrap' }}>
              <Chip label="En cours" size="small" color="warning" />
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.7rem', py: 0.75, whiteSpace: 'nowrap' }}>
              <Chip label="Complétée" size="small" color="success" />
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem', py: 0.75 }}>Traités</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {etapeRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary', fontSize: '0.8rem' }}>
                Aucune étape définie pour ce circuit
              </TableCell>
            </TableRow>
          ) : (
            <>
              {etapeRows.map((row) => {
                const total = row.pending + row.in_progress + row.completed;
                const pct = total > 0 ? Math.round((row.completed / total) * 100) : 0;
                return (
                  <TableRow key={row.etape.id} hover
                    sx={row.in_progress > 0 ? { bgcolor: `${theme.palette.warning.light}11` } : undefined}>
                    <TableCell sx={{ fontSize: '0.7rem', color: 'text.disabled', py: 0.75 }}>
                      {row.etapeIndex + 1}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500, py: 0.75 }}>
                      <Box>
                        {row.etape.libelle}
                        {row.etape.code && (
                          <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                            [{row.etape.code}]
                          </Typography>
                        )}
                        <Box sx={{ mt: 0.5, height: 3, borderRadius: 2, bgcolor: 'action.hover', overflow: 'hidden' }}>
                          <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: 'success.main', borderRadius: 2 }} />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.8rem', color: 'text.disabled', py: 0.75 }}>
                      {row.pending || '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.8rem', py: 0.75,
                      color: row.in_progress ? 'warning.main' : 'text.disabled',
                      fontWeight: row.in_progress ? 700 : 400 }}>
                      {row.in_progress || '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: '0.8rem', py: 0.75,
                      color: row.completed ? 'success.main' : 'text.disabled',
                      fontWeight: row.completed ? 700 : 400 }}>
                      {row.completed || '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700, py: 0.75 }}>
                      {row.total || '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell colSpan={2} sx={{ fontWeight: 700, fontSize: '0.8rem', py: 0.75 }}>Total</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary', py: 0.75 }}>—</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'warning.main', py: 0.75 }}>
                  {etapeRows.reduce((s, r) => s + r.in_progress, 0)}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'success.main', py: 0.75 }}>
                  {etapeRows.reduce((s, r) => s + r.completed, 0)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8rem', py: 0.75 }}>
                  {etapeRows.reduce((s, r) => s + r.total, 0)}
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ py: 2 }}>
      {/* En-tête */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
          <ChartBarIcon className="w-8 h-8" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            Rapport des étapes — tous les types de demande
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dossiers ventilés par étape de circuit et par statut (En attente / En cours / Complétée).
          </Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<ArrowPathIcon className="w-4 h-4" />}
          onClick={loadData} disabled={loading} sx={{ textTransform: 'none', flexShrink: 0 }}>
          Actualiser
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-start' }}>
        {/* ── Colonne principale ─────────────────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Filtres */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Filtres</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
              Période de création (calendrier à droite). Aucun filtre par centre sur cet écran : la liste reflète tous les
              dossiers renvoyés par l&apos;API pour votre compte.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" alignItems="center">
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'stretch', sm: 'flex-start' }, gap: 0.5 }}>
                <Button variant="outlined" size="medium"
                  startIcon={<ArrowDownTrayIcon className="w-5 h-5" />}
                  onClick={() => void handleExportExcel()}
                  disabled={loading || dossiers.length === 0}
                  sx={{ textTransform: 'none' }}>
                  Exporter tous les dossiers — détail (Excel)
                </Button>
                <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 520 }}>
                  Tous les dossiers créés dans le système (toutes pages), quel que soit le statut de paiement ou la
                  présence d&apos;un code de paiement : feuille « Tous les dossiers » avec détails permis, synthèse
                  montants, puis un onglet par circuit.
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* ── Graphique global ─────────────────────────────────────────── */}
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Vue d'ensemble par type de demande
              </Typography>
              <Button variant="outlined" size="small"
                startIcon={chartsVisible ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                onClick={() => setChartsVisible((v) => !v)} sx={{ textTransform: 'none' }}>
                {chartsVisible ? 'Masquer' : 'Afficher'}
              </Button>
            </Stack>
            {chartsVisible && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                {loading ? (
                  <Skeleton variant="rectangular" height={CHART_HEIGHT} sx={{ borderRadius: 1 }} />
                ) : globalChartData.labels.length === 0 ? (
                  <Box sx={{ height: CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">Aucune donnée</Typography>
                  </Box>
                ) : (
                  <BarChart
                    xAxis={[{ scaleType: 'band', data: globalChartData.labels, tickLabelStyle: { fontSize: 11 } }]}
                    series={[
                      { data: globalChartData.notStarted, label: 'Non démarrés', color: theme.palette.grey[300], stack: 'total' },
                      { data: globalChartData.started, label: 'En cours / complétés', color: theme.palette.primary.main, stack: 'total' },
                    ]}
                    height={CHART_HEIGHT}
                    margin={CHART_MARGIN}
                  />
                )}
              </Paper>
            )}
          </Box>

          {/* ── Section par circuit ──────────────────────────────────────── */}
          {loading ? (
            <Stack spacing={2}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
              ))}
            </Stack>
          ) : allCircuitStats.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Aucun circuit actif trouvé.</Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {allCircuitStats.map(({ circuit, etapeRows, totalDossiers, nonDemarres }) => (
                <Paper key={circuit.id} variant="outlined" sx={{ overflow: 'hidden' }}>
                  {/* En-tête du circuit */}
                  <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
                    bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
                      {circuit.libelle ?? circuit.nom_entite}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={`${totalDossiers} dossier${totalDossiers > 1 ? 's' : ''}`}
                        size="small" color="primary" variant="outlined" />
                      {nonDemarres > 0 && (
                        <Chip label={`${nonDemarres} non démarré${nonDemarres > 1 ? 's' : ''}`}
                          size="small" color="default" />
                      )}
                      {etapeRows.reduce((s, r) => s + r.in_progress, 0) > 0 && (
                        <Chip
                          label={`${etapeRows.reduce((s, r) => s + r.in_progress, 0)} en cours`}
                          size="small" color="warning" />
                      )}
                    </Stack>
                  </Box>

                  {/* Tableau des étapes */}
                  {renderEtapeTable(etapeRows)}

                  {/* Légende circuit info */}
                  {circuit.nom_entite && (
                    <Box sx={{ px: 2, py: 0.75, borderTop: 1, borderColor: 'divider',
                      display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.disabled">
                        Type de demande : <strong>{circuit.nom_entite}</strong>
                      </Typography>
                      {circuit.type_permis && (
                        <Typography variant="caption" color="text.disabled">
                          · Permis : {circuit.type_permis}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Paper>
              ))}
            </Stack>
          )}

          {/* Synthèse montants (filtre période) */}
          {!loading && (
            <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Synthèse des montants
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Totaux calculés à partir des montants enregistrés dans l&apos;historique des paiements, pour les dossiers de la
                liste ci-dessous (filtre période du calendrier uniquement). Une ligne dossier sans paiement associé compte pour 0.
              </Typography>
              {filtered.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Aucun dossier dans la sélection — ajustez les filtres.
                </Typography>
              ) : (
                <>
                  <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                        Par type de demande
                      </Typography>
                      <TableContainer sx={{ maxHeight: 220, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Type</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Dossiers</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Montant</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {montantsAgregesFiltres.parType.map((r) => (
                              <TableRow key={r.cle}>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{r.cle}</TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
                                  {r.nbDossiers}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ fontSize: '0.8rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                                >
                                  {formatMontantFr(r.montant)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                        Par catégorie de permis
                      </Typography>
                      <TableContainer sx={{ maxHeight: 220, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                              <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Catégorie</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Dossiers</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Montant</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {montantsAgregesFiltres.parCategorie.map((r) => (
                              <TableRow key={r.cle}>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{r.cle}</TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums' }}>
                                  {r.nbDossiers}
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ fontSize: '0.8rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                                >
                                  {formatMontantFr(r.montant)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Montant global ({filtered.length} dossier{filtered.length > 1 ? 's' : ''})
                    </Typography>
                    <Chip
                      label={formatMontantFr(montantsAgregesFiltres.totalMontant)}
                      color="primary"
                      variant="filled"
                      sx={{ fontWeight: 800, fontSize: '0.95rem', height: 32 }}
                    />
                  </Stack>
                </>
              )}
            </Paper>
          )}

          {/* Tableau détaillé des dossiers (filtre période) */}
          {!loading && (
            <Paper variant="outlined" sx={{ mt: 3, overflow: 'hidden' }}>
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Liste des dossiers
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Même période de création que ci-dessus (calendrier). Colonne Paiement : même règle que le tableau « déjà traités »
                    du dashboard finance. Téléchargements : tableau à l&apos;identique de l&apos;écran, ou export avec synthèse des
                    montants et colonnes techniques.
                  </Typography>
                </Box>
                <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="flex-end" sx={{ flexShrink: 0 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
                    onClick={handleExportTableauListeDossiersEcran}
                    disabled={dossiersTableSorted.length === 0}
                    sx={{ textTransform: 'none' }}
                  >
                    Télécharger le tableau (Excel)
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
                    onClick={handleExportListeDossiersFiltreeExcel}
                    disabled={dossiersTableSorted.length === 0}
                    sx={{ textTransform: 'none' }}
                  >
                    Exporter liste + synthèse (Excel)
                  </Button>
                </Stack>
              </Box>
              {dossiersTableSorted.length === 0 ? (
                <Box sx={{ p: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Aucun dossier ne correspond aux filtres.
                  </Typography>
                </Box>
              ) : (
                <>
                  <TableContainer sx={{ maxHeight: 480 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Type de demande</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Candidat</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Centre</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Formation</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                            Date création
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                            Date maj.
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Étape actuelle</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                            Date (paiement)
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Montant</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Code</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Référence</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Paiement</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dossiersTableSorted
                          .slice(
                            dossierListPage * dossierListRowsPerPage,
                            dossierListPage * dossierListRowsPerPage + dossierListRowsPerPage,
                          )
                          .map((d) => {
                            const pay = getStatutPaiementDossier(d);
                            const payInfo = getPaiementInfoForDossier(d, paiementIndex);
                            return (
                              <TableRow key={d.id} hover>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{d.typeDemandeName ?? '—'}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{d.candidatLabel ?? '—'}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{d.centreLabel ?? '—'}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>{d.formationLabel ?? '—'}</TableCell>
                                <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                  {formatDateFrTable(d.created_at)}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                  {formatDateFrTable(d.updated_at)}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.8rem' }}>
                                  {libelleEtapeCourante(d, circuits, dossierPositions)}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                  {formatDateFrTable(payInfo?.datePaiementIso)}
                                </TableCell>
                                <TableCell
                                  sx={{
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    fontVariantNumeric: 'tabular-nums',
                                    color: payInfo?.montant ? 'success.dark' : 'text.disabled',
                                  }}
                                >
                                  {payInfo?.montant?.trim() || '—'}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                  {(d.code_paiement ?? '').trim() || '—'}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                  {payInfo?.reference?.trim() || '—'}
                                </TableCell>
                                <TableCell sx={{ py: 0.75 }}>
                                  {pay === 'paye' && (
                                    <Chip label="Payé" size="small" color="success" variant="outlined" sx={{ height: 24 }} />
                                  )}
                                  {pay === 'en_attente_verif' && (
                                    <Chip
                                      label="En attente de vérification"
                                      size="small"
                                      color="warning"
                                      variant="outlined"
                                      sx={{ height: 24, maxWidth: 220, '& .MuiChip-label': { px: 0.75 } }}
                                    />
                                  )}
                                  {pay === 'sans_code' && (
                                    <Typography variant="caption" color="text.disabled">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={dossiersTableSorted.length}
                    page={dossierListPage}
                    onPageChange={(_, p) => setDossierListPage(p)}
                    rowsPerPage={dossierListRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setDossierListRowsPerPage(parseInt(e.target.value, 10));
                      setDossierListPage(0);
                    }}
                    rowsPerPageOptions={[10, 15, 25, 50]}
                    labelRowsPerPage="Lignes :"
                    labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
                    sx={{ borderTop: 1, borderColor: 'divider', fontSize: '0.8rem' }}
                  />
                </>
              )}
            </Paper>
          )}

          {/* Légende globale */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="caption" color="text.disabled">Statuts d'étape :</Typography>
            <Chip label="En attente — pas encore atteinte" size="small" color="default" />
            <Chip label="En cours — dossier actuellement à cette étape" size="small" color="warning" />
            <Chip label="Complétée — dossier a dépassé cette étape" size="small" color="success" />
            <Typography variant="caption" color="text.disabled" sx={{ width: '100%', mt: 0.5 }}>
              Paiement (liste des dossiers) :
            </Typography>
            <Chip label="Payé — code généré et vérification effectuée" size="small" color="success" variant="outlined" />
            <Chip label="En attente de vérification — code généré, statut EN_ATTENTE_PAIEMENT" size="small" color="warning" variant="outlined" />
          </Box>
        </Box>

        {/* ── Sidebar calendrier ──────────────────────────────────────────── */}
        <Box sx={{ flexShrink: 0 }}>{calendarBlock}</Box>
      </Box>
    </Box>
  );
};

export default FinanceDossierRapportTab;
