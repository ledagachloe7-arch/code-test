import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  alpha,
  Snackbar,
  TextField,
  InputAdornment,
} from '@mui/material';
import { DocumentTextIcon, XMarkIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import {
  getPaiementsList,
  createPaiementFacturePdfObjectUrl,
  getPaiementDossierId,
  fetchCentreLabelsForPaiementsRows,
  fetchCategoriesForPaiementsRows,
  fetchAllPaiementsForDateExport,
} from '../services/paiements.service';
import type { PaiementApiItem, PaiementsPaginationMeta } from '../types/paiements.types';

const ROWS_PER_PAGE_OPTIONS = [5, 10, 15, 25, 50];

const EXCEL_HEADERS = [
  'Date',
  'Montant',
  'Code',
  'Référence',
  'Nom',
  'Prénom',
  'Auto-école',
  'Province',
  'Centre',
  'Type demande',
  'Catégorie',
  'N° permis',
  'Statut',
] as const;

/** Chaque ligne avec id dossier a une entrée dans la map (résolution depuis /paiements + référentiels). */
function rowsCentresResolved(rows: PaiementApiItem[], centreById: Record<string, string>): boolean {
  return rows.every((row) => {
    const id = getPaiementDossierId(row);
    if (!id) return true;
    return Object.prototype.hasOwnProperty.call(centreById, id);
  });
}

/** Compare sans tenir compte des accents / casse */
function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatDateFr(iso: string | null | undefined): string {
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

/** Filtre sur `created_at` (journées locales début / fin inclusives), secours si l’API ignore date_debut / date_fin. */
function rowInCreatedAtDateRange(row: PaiementApiItem, fromYmd: string, toYmd: string): boolean {
  const iso = row.created_at?.trim();
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const start = new Date(`${fromYmd}T00:00:00`).getTime();
  const end = new Date(`${toYmd}T23:59:59.999`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return t >= start && t <= end;
}

/** Valeur vide Excel (les helpers d’affichage utilisent « — ») */
function exportCell(s: string): string {
  return s === '—' ? '' : s;
}

function candidatLabel(row: PaiementApiItem): string {
  const nc = row.nom_complet?.trim();
  if (nc) return nc;
  const parts = [row.prenom?.trim(), row.nom?.trim()].filter(Boolean);
  return parts.length ? parts.join(' ') : '—';
}

function candidatNom(row: PaiementApiItem): string {
  const fromRoot = row.nom?.trim();
  if (fromRoot) return fromRoot;
  if (row.dossier && typeof row.dossier === 'object' && 'candidat' in row.dossier) {
    const cand = (row.dossier as { candidat?: { personne?: { nom?: string | null } } }).candidat;
    const n = cand?.personne?.nom?.trim();
    if (n) return n;
  }
  const nc = row.nom_complet?.trim();
  if (nc) {
    const parts = nc.split(/\s+/);
    return parts[0] ?? nc;
  }
  return '—';
}

function candidatPrenom(row: PaiementApiItem): string {
  const fromRoot = row.prenom?.trim();
  if (fromRoot) return fromRoot;
  if (row.dossier && typeof row.dossier === 'object' && 'candidat' in row.dossier) {
    const cand = (row.dossier as { candidat?: { personne?: { prenom?: string | null } } }).candidat;
    const p = cand?.personne?.prenom?.trim();
    if (p) return p;
  }
  const nc = row.nom_complet?.trim();
  if (nc) {
    const parts = nc.split(/\s+/);
    return parts.slice(1).join(' ') || '—';
  }
  return '—';
}

function asRecord(d: unknown): Record<string, unknown> | null {
  return d && typeof d === 'object' ? (d as Record<string, unknown>) : null;
}

/** Libellé lisible depuis un objet « type » (type_demande, type_permis, référentiel…) */
function pickLabelFromEntity(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    const s = v.trim();
    return s || null;
  }
  if (typeof v === 'number' || typeof v === 'boolean') {
    return String(v);
  }
  if (Array.isArray(v)) {
    for (const el of v) {
      const lab = pickLabelFromEntity(el);
      if (lab) return lab;
    }
    return null;
  }
  const r = asRecord(v);
  if (!r) return null;
  const nested = asRecord(r.data) ?? asRecord(r.attributes);
  const pool = nested ?? r;
  const label =
    pool.name ??
    pool.libelle ??
    pool.label ??
    pool.title ??
    pool.nom ??
    pool.description ??
    pool.code;
  if (label != null && String(label).trim()) return String(label).trim();
  return null;
}

/** JSON:API / Laravel : relationships.type_demande.data */
function pickFromRelationships(o: Record<string, unknown>, relationKey: string): unknown {
  const rel = asRecord(o.relationships);
  if (!rel) return undefined;
  const node = rel[relationKey] ?? rel[relationKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
  if (node == null) return undefined;
  const nr = asRecord(node);
  if (nr && 'data' in nr) return nr.data;
  return node;
}

/** Chaîne depuis plusieurs chemins possibles pour type_demande / équivalents */
function dossierTypeDemande(d: PaiementApiItem['dossier']): string {
  const o = asRecord(d);
  if (!o) return '—';
  const candidates: unknown[] = [
    o.type_demande,
    o.typeDemande,
    o.type_de_demande,
    o.typeDeDemande,
    o.demande_type,
    o.demandeType,
    pickFromRelationships(o, 'type_demande'),
    pickFromRelationships(o, 'typeDemande'),
  ];
  const form = asRecord(o.formation);
  if (form) {
    candidates.push(
      form.type_demande,
      form.typeDemande,
      form.type_de_demande,
      form.typeDeDemande,
      pickFromRelationships(form, 'type_demande'),
      pickFromRelationships(form, 'typeDemande')
    );
  }
  for (const c of candidates) {
    const label = pickLabelFromEntity(c);
    if (label) return label;
  }
  return '—';
}

/** Objet API `type_permis` : libellé + code entre parenthèses quand les deux sont utiles. */
function typePermisDisplayFromUnknown(tp: unknown): string | null {
  if (tp == null) return null;
  const r = asRecord(tp);
  if (!r) return pickLabelFromEntity(tp);
  const lib = r.libelle != null ? String(r.libelle).trim() : '';
  const code = r.code != null ? String(r.code).trim() : '';
  if (lib && code && lib.toLowerCase() !== code.toLowerCase()) return `${lib} (${code})`;
  if (lib) return lib;
  if (code) return code;
  return pickLabelFromEntity(tp);
}

function typePermisFromFormationRecord(form: Record<string, unknown>): string | null {
  return typePermisDisplayFromUnknown(
    form.type_permis ??
      form.typePermis ??
      pickFromRelationships(form, 'type_permis') ??
      pickFromRelationships(form, 'typePermis')
  );
}

/** `formations[]` + `formation_id` / id de formation dossier (auto_ecole racine ou sous `formation`). */
function typePermisFromFormationsArray(raw: unknown, preferredFormationId: string | undefined): string | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const fid = preferredFormationId != null ? String(preferredFormationId).trim() : '';

  const fromOne = (f: unknown): string | null => {
    const fr = asRecord(f);
    if (!fr) return null;
    return typePermisFromFormationRecord(fr);
  };

  if (fid) {
    for (const f of raw) {
      const fr = asRecord(f);
      if (fr && String(fr.id ?? '').trim() === fid) {
        const t = fromOne(f);
        if (t) return t;
      }
    }
  }
  for (const f of raw) {
    const t = fromOne(f);
    if (t) return t;
  }
  return null;
}

/** Fallback : `dossier.auto_ecole.formations[].type_permis` (schéma API paiements / dossier). */
function typePermisFromAutoEcoleFormations(o: Record<string, unknown>): string | null {
  const ae = asRecord(o.auto_ecole ?? o.autoEcole);
  if (!ae) return null;
  const raw = ae.formations ?? ae.Formations;
  const formationIdRaw = o.formation_id ?? o.formationId;
  const formationId = formationIdRaw != null ? String(formationIdRaw).trim() : undefined;
  return typePermisFromFormationsArray(raw, formationId);
}

/** `dossier.formation.auto_ecole.formations[].type_permis` (formation embarquée avec auto-école complète). */
function typePermisFromFormationNestedAutoEcole(form: Record<string, unknown>): string | null {
  const formAe = asRecord(form.auto_ecole ?? form.autoEcole);
  if (!formAe) return null;
  const raw = formAe.formations ?? formAe.Formations;
  const formId = form.id != null ? String(form.id).trim() : undefined;
  return typePermisFromFormationsArray(raw, formId);
}

/**
 * Catégorie permis depuis le payload embarqué (dossier dans /paiements).
 * Priorité 1 : lettre dans numero_permis (ex. "19969B00466" → "B").
 */
function dossierCategoriePermis(d: PaiementApiItem['dossier']): string {
  const o = asRecord(d);
  if (!o) return '—';

  /* ── 1. Lettre extraite du numéro de permis ── */
  const fromPermisNum = categoryFromDossierPermisNumbers(o);
  if (fromPermisNum) return fromPermisNum;

  /* ── 2. formation.type_permis (source directe) ── */
  const form = asRecord(o.formation);
  if (form) {
    const fromFormTp = typePermisFromFormationRecord(form);
    if (fromFormTp) return fromFormTp;
  }

  /* ── 2. auto_ecole.formations[matching formation_id].type_permis ── */
  const fromAeList = typePermisFromAutoEcoleFormations(o);
  if (fromAeList) return fromAeList;

  /* ── 3. formation.auto_ecole.formations[].type_permis ── */
  if (form) {
    const fromFormAeList = typePermisFromFormationNestedAutoEcole(form);
    if (fromFormAeList) return fromFormAeList;
  }

  /* ── 4. type_permis direct sur le dossier (rare) ── */
  const rootTp = o.type_permis ?? o.typePermis ?? pickFromRelationships(o, 'type_permis') ?? pickFromRelationships(o, 'typePermis');
  const fromRoot = typePermisDisplayFromUnknown(rootTp);
  if (fromRoot) return fromRoot;

  /* ── 5. Champs plats ── */
  const flat =
    o.categorie ??
    o.categorie_permis ??
    o.categoriePermis ??
    o.type_categorie ??
    o.typeCategorie ??
    o.libelle_categorie ??
    o.libelleCategorie;
  if (flat != null && String(flat).trim()) return String(flat).trim();

  /* ── 6. referentiel : seulement si ce n'est pas un centre ── */
  const ref = asRecord(o.referentiel);
  if (ref) {
    const typeRef = ref.type_ref != null ? String(ref.type_ref).toLowerCase().trim() : '';
    const isCentre = typeRef === 'centre' || typeRef === 'centers';
    if (!isCentre) {
      const t = typePermisDisplayFromUnknown(ref);
      if (t) return t;
    }
  }

  /* ── 7. data_categorie[] ── */
  const dc = o.data_categorie ?? o.dataCategorie;
  if (Array.isArray(dc)) {
    for (const item of dc) {
      if (item == null) continue;
      if (typeof item === 'string' && item.trim()) return item.trim();
      const lab = pickLabelFromEntity(item);
      if (lab) return lab;
    }
  }

  return '—';
}

/** Nom auto-école : dossier.auto_ecole, sinon formation.auto_ecole (souvent seul peuplé). */
function dossierAutoEcole(d: PaiementApiItem['dossier']): string {
  const o = asRecord(d);
  if (!o) return '—';
  const tryAe = (ae: unknown): string | null => {
    const a = asRecord(ae);
    if (!a) return null;
    const n = a.nom_auto_ecole ?? a.nomAutoEcole ?? a.nom;
    const s = n != null ? String(n).trim() : '';
    return s || null;
  };
  const root = tryAe(o.auto_ecole ?? o.autoEcole);
  if (root) return root;
  const form = asRecord(o.formation);
  if (form) {
    const nested = tryAe(form.auto_ecole ?? form.autoEcole);
    if (nested) return nested;
  }
  return '—';
}

function dossierNumeroPermis(d: PaiementApiItem['dossier']): string {
  const o = asRecord(d);
  if (!o) return '—';
  const n = o.numero_permis ?? o.numeroPermis;
  if (n != null && String(n).trim()) return String(n).trim();
  const orig = o.numero_origine_permis ?? o.numeroOriginePermis;
  if (orig != null && String(orig).trim()) return String(orig).trim();
  return '—';
}

/** Extrait la lettre de catégorie depuis un numéro de permis. Ex : "19969B00466" → "B". */
function categoryLetterFromPermisNumber(num: string | null | undefined): string | null {
  if (!num?.trim()) return null;
  const match = num.trim().match(/[A-Za-z]+/);
  return match ? match[0].toUpperCase() : null;
}

/** Catégorie depuis le numéro de permis du dossier (ou numéro d'origine). */
function categoryFromDossierPermisNumbers(o: Record<string, unknown>): string | null {
  const n = o.numero_permis ?? o.numeroPermis;
  if (n != null) {
    const cat = categoryLetterFromPermisNumber(String(n));
    if (cat) return cat;
  }
  const orig = o.numero_origine_permis ?? o.numeroOriginePermis;
  if (orig != null) {
    const cat = categoryLetterFromPermisNumber(String(orig));
    if (cat) return cat;
  }
  return null;
}

function dossierStatut(d: PaiementApiItem['dossier']): string {
  const o = asRecord(d);
  if (!o) return '—';
  const s = o.statut;
  return (s != null ? String(s) : '').trim() || '—';
}

/** Province : dossier.province, sinon province de l’auto-école (dossier ou formation). */
function dossierProvince(d: PaiementApiItem['dossier']): string {
  const o = asRecord(d);
  if (!o) return '—';
  const root = pickLabelFromEntity(o.province ?? pickFromRelationships(o, 'province'));
  if (root) return root;
  const form = asRecord(o.formation);
  if (form) {
    const ae = asRecord(form.auto_ecole ?? form.autoEcole);
    if (ae) {
      const p = pickLabelFromEntity(ae.province ?? pickFromRelationships(ae, 'province'));
      if (p) return p;
    }
  }
  const aeRoot = asRecord(o.auto_ecole ?? o.autoEcole);
  if (aeRoot) {
    const p = pickLabelFromEntity(aeRoot.province ?? pickFromRelationships(aeRoot, 'province'));
    if (p) return p;
  }
  return '—';
}

/** Centre depuis le dossier embarqué dans /paiements (fallback si GET /dossiers/:id est interdit, ex. 403). */
function dossierCentreEmbedded(d: PaiementApiItem['dossier']): string {
  const o = asRecord(d);
  if (!o) return '—';
  const root = pickLabelFromEntity(o.centre ?? pickFromRelationships(o, 'centre'));
  if (root) return root;
  const form = asRecord(o.formation);
  if (form) {
    const fromForm = pickLabelFromEntity(form.centre ?? pickFromRelationships(form, 'centre'));
    if (fromForm) return fromForm;
    const ae = asRecord(form.auto_ecole ?? form.autoEcole);
    if (ae) {
      const fromAe = pickLabelFromEntity(ae.centre ?? pickFromRelationships(ae, 'centre'));
      if (fromAe) return fromAe;
    }
  }
  const aeRoot = asRecord(o.auto_ecole ?? o.autoEcole);
  if (aeRoot) {
    const fromAeRoot = pickLabelFromEntity(aeRoot.centre ?? pickFromRelationships(aeRoot, 'centre'));
    if (fromAeRoot) return fromAeRoot;
  }
  return '—';
}

/** Préfère le centre issu de GET /dossiers/:id ; sinon celui du payload paiement (souvent seul disponible si 403). */
function resolveCentreForRow(row: PaiementApiItem, centreMap: Record<string, string>): string {
  const id = getPaiementDossierId(row);
  const fromApi = id != null ? centreMap[id] : undefined;
  const embedded = dossierCentreEmbedded(row.dossier);
  const apiUsable = fromApi != null && String(fromApi).trim() !== '' && fromApi !== '—';
  if (apiUsable) return fromApi;
  if (embedded !== '—') return embedded;
  return fromApi ?? '—';
}

/** Texte brut pour recherche usager (paiement + dossier.candidat si présent) */
function usagerSearchRaw(row: PaiementApiItem): string {
  const parts: string[] = [
    row.nom_complet ?? '',
    row.nom ?? '',
    row.prenom ?? '',
    candidatLabel(row),
  ];
  if (row.dossier && typeof row.dossier === 'object' && 'candidat' in row.dossier) {
    const cand = (row.dossier as { candidat?: { personne?: { nom?: string; prenom?: string; nom_complet?: string }; numero_candidat?: string } }).candidat;
    const p = cand?.personne;
    parts.push(p?.nom ?? '', p?.prenom ?? '', p?.nom_complet ?? '', cand?.numero_candidat ?? '');
  }
  return parts.filter(Boolean).join(' ');
}

/** Tous les champs « code » possibles (ligne + dossier) */
function paymentCodeHaystack(row: PaiementApiItem): string {
  const parts: string[] = [row.code_paiement ?? '', row.reference_paiement ?? ''];
  if (row.dossier && typeof row.dossier === 'object') {
    const d = row.dossier as { code_paiement?: string | null; id?: string; data?: { id?: string } };
    if (d.code_paiement) parts.push(String(d.code_paiement));
    if (d.id) parts.push(String(d.id));
    if (d.data?.id) parts.push(String(d.data.id));
  }
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, '');
}

function buildExportSheetRows(
  toExport: PaiementApiItem[],
  centreMap: Record<string, string>,
  categorieMap: Record<string, string>
): string[][] {
  return toExport.map((row) => {
    const centreCell = resolveCentreForRow(row, centreMap);
    const id = getPaiementDossierId(row);
    const fromCatMap = id != null ? categorieMap[id] : undefined;
    const categorieCell = (fromCatMap != null && fromCatMap !== '—') ? fromCatMap : dossierCategoriePermis(row.dossier);
    return [
      exportCell(formatDateFr(row.created_at)),
      row.montant?.trim() ?? '',
      row.code_paiement?.trim() ?? '',
      row.reference_paiement?.trim() ?? '',
      exportCell(candidatNom(row)),
      exportCell(candidatPrenom(row)),
      exportCell(dossierAutoEcole(row.dossier)),
      exportCell(dossierProvince(row.dossier)),
      exportCell(centreCell),
      exportCell(dossierTypeDemande(row.dossier)),
      exportCell(categorieCell),
      exportCell(dossierNumeroPermis(row.dossier)),
      'Payé',
    ];
  });
}

function matchesFilters(row: PaiementApiItem, nomQ: string, codeQ: string): boolean {
  const codeNeedle = codeQ.trim().toLowerCase().replace(/\s+/g, '');
  if (codeNeedle) {
    const hay = paymentCodeHaystack(row);
    if (!hay.includes(codeNeedle)) return false;
  }
  const nomNeedle = nomQ.trim();
  if (nomNeedle) {
    const hay = normalizeForSearch(usagerSearchRaw(row));
    const tokens = normalizeForSearch(nomNeedle)
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length === 0) return true;
    if (!tokens.every((t) => hay.includes(t))) return false;
  }
  return true;
}

const defaultMeta: PaiementsPaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
};

type PdfDialogState = {
  open: boolean;
  url: string | null;
  row: PaiementApiItem | null;
};

type FetchQuery = {
  page: number;
  rowsPerPage: number;
};

const FraisDossierTable: React.FC = () => {
  const [rows, setRows] = useState<PaiementApiItem[]>([]);
  const [meta, setMeta] = useState<PaiementsPaginationMeta>(defaultMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchQuery, setFetchQuery] = useState<FetchQuery>({
    page: 0,
    rowsPerPage: 15,
  });
  const [pdfDialog, setPdfDialog] = useState<PdfDialogState>({ open: false, url: null, row: null });
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [factureError, setFactureError] = useState<string | null>(null);
  const pdfBlobRef = useRef<string | null>(null);

  const [filterNom, setFilterNom] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [exportDateDebut, setExportDateDebut] = useState('');
  const [exportDateFin, setExportDateFin] = useState('');
  const [dateExportLoading, setDateExportLoading] = useState(false);
  /** Tant que les libellés centre (référentiels) sont en cours pour la page courante. */
  const [centreLoading, setCentreLoading] = useState(false);
  const [exportNotify, setExportNotify] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  /** Libellé centre par id de dossier (référentiels / dossier embarqué). */
  const [dossierCentreById, setDossierCentreById] = useState<Record<string, string>>({});
  const centreFetchedIdsRef = useRef<Set<string>>(new Set());

  /** Catégorie de permis (referentiel.libelle) par id de dossier — via GET /dossiers/{id}. */
  const [dossierCategorieById, setDossierCategorieById] = useState<Record<string, string>>({});
  const categorieFetchedIdsRef = useRef<Set<string>>(new Set());

  const resolveDossierCentre = useCallback(
    (row: PaiementApiItem): string => resolveCentreForRow(row, dossierCentreById),
    [dossierCentreById]
  );

  const resolveDossierCategorie = useCallback(
    (row: PaiementApiItem): string => {
      const id = getPaiementDossierId(row);
      const fromMap = id != null ? dossierCategorieById[id] : undefined;
      if (fromMap != null && fromMap !== '—') return fromMap;
      return dossierCategoriePermis(row.dossier);
    },
    [dossierCategorieById]
  );

  useEffect(() => {
    const unique = [
      ...new Set(
        rows.map((r) => getPaiementDossierId(r)).filter((id): id is string => Boolean(id))
      ),
    ];
    const missing = unique.filter((id) => !centreFetchedIdsRef.current.has(id));
    if (missing.length === 0) {
      setCentreLoading(false);
      return;
    }

    let cancelled = false;
    setCentreLoading(true);
    void (async () => {
      try {
        const representativeRows = missing
          .map((did) => rows.find((r) => getPaiementDossierId(r) === did))
          .filter((r): r is PaiementApiItem => Boolean(r));
        const fetched = await fetchCentreLabelsForPaiementsRows(representativeRows, { concurrency: 6 });
        if (cancelled) return;
        missing.forEach((id) => centreFetchedIdsRef.current.add(id));
        setDossierCentreById((prev) => ({ ...prev, ...fetched }));
      } finally {
        if (!cancelled) setCentreLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  useEffect(() => {
    const unique = [
      ...new Set(
        rows.map((r) => getPaiementDossierId(r)).filter((id): id is string => Boolean(id))
      ),
    ];
    const missing = unique.filter((id) => !categorieFetchedIdsRef.current.has(id));
    if (missing.length === 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const representativeRows = missing
          .map((did) => rows.find((r) => getPaiementDossierId(r) === did))
          .filter((r): r is PaiementApiItem => Boolean(r));
        const fetched = await fetchCategoriesForPaiementsRows(representativeRows, { concurrency: 4 });
        if (cancelled) return;
        missing.forEach((id) => categorieFetchedIdsRef.current.add(id));
        setDossierCategorieById((prev) => ({ ...prev, ...fetched }));
      } catch {
        // silencieux — le fallback embarqué est utilisé
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, meta: m } = await getPaiementsList({
          page: fetchQuery.page + 1,
          per_page: fetchQuery.rowsPerPage,
        });
        if (!cancelled) {
          setRows(data);
          setMeta(m);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg =
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            (e as Error)?.message ??
            'Impossible de charger l’historique des paiements.';
          setError(String(msg));
          setRows([]);
          setMeta({ ...defaultMeta, per_page: fetchQuery.rowsPerPage });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchQuery]);

  const displayRows = useMemo(() => {
    const n = filterNom;
    const c = filterCode;
    if (!n.trim() && !c.trim()) return rows;
    return rows.filter((r) => matchesFilters(r, n, c));
  }, [rows, filterNom, filterCode]);

  const hasActiveFilters = Boolean(filterNom.trim() || filterCode.trim());
  const filteredOutOnPage = hasActiveFilters && rows.length > 0 && displayRows.length === 0;

  /** Classeur Excel préparé quand les centres de la page sont résolus (référentiels / dossier embarqué). */
  const preparedPageWorkbook = useMemo(() => {
    if (loading || centreLoading || displayRows.length === 0) return null;
    if (!rowsCentresResolved(displayRows, dossierCentreById)) return null;
    const dataRows = buildExportSheetRows(displayRows, dossierCentreById, dossierCategorieById);
    const ws = XLSX.utils.aoa_to_sheet([Array.from(EXCEL_HEADERS), ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rapport paiements');
    return wb;
  }, [loading, centreLoading, displayRows, dossierCentreById, dossierCategorieById]);

  const resetFilters = () => {
    setFilterNom('');
    setFilterCode('');
  };

  const handleExportExcel = () => {
    setExportNotify((n) => ({ ...n, open: false }));
    if (displayRows.length === 0) {
      setExportNotify({
        open: true,
        message: 'Aucune ligne à exporter sur cette page (vérifiez les filtres).',
        severity: 'error',
      });
      return;
    }
    if (!preparedPageWorkbook) {
      setExportNotify({
        open: true,
        message: centreLoading
          ? 'Chargement des libellés centre (référentiels)… Réessayez dans un instant.'
          : 'L’export n’est pas encore prêt.',
        severity: 'error',
      });
      return;
    }
    try {
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(
        preparedPageWorkbook,
        `rapport-paiements-p${meta.current_page}-${today}.xlsx`
      );
      setExportNotify({
        open: true,
        message: `${displayRows.length.toLocaleString('fr-FR')} ligne${displayRows.length !== 1 ? 's' : ''} exportée${displayRows.length !== 1 ? 's' : ''} (page ${meta.current_page}).`,
        severity: 'success',
      });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (e as Error)?.message ??
        'Échec de l’export Excel.';
      setExportNotify({ open: true, message: String(msg), severity: 'error' });
    }
  };

  const handleExportExcelByDate = async () => {
    if (!exportDateDebut.trim() || !exportDateFin.trim()) {
      setExportNotify({
        open: true,
        message: 'Indiquez une date de début et une date de fin.',
        severity: 'error',
      });
      return;
    }
    if (exportDateDebut > exportDateFin) {
      setExportNotify({
        open: true,
        message: 'La date de début doit être antérieure ou égale à la date de fin.',
        severity: 'error',
      });
      return;
    }

    setDateExportLoading(true);
    setExportNotify((n) => ({ ...n, open: false }));
    try {
      const raw = await fetchAllPaiementsForDateExport({
        date_debut: exportDateDebut,
        date_fin: exportDateFin,
      });
      const toExport = raw.filter((r) =>
        rowInCreatedAtDateRange(r, exportDateDebut, exportDateFin)
      );
      if (toExport.length === 0) {
        setExportNotify({
          open: true,
          message: 'Aucun paiement sur cette période.',
          severity: 'error',
        });
        return;
      }
      const [centreMap, categorieMap] = await Promise.all([
        fetchCentreLabelsForPaiementsRows(toExport, { concurrency: 8 }),
        fetchCategoriesForPaiementsRows(toExport, { concurrency: 4 }),
      ]);
      const dataRows = buildExportSheetRows(toExport, centreMap, categorieMap);
      const ws = XLSX.utils.aoa_to_sheet([Array.from(EXCEL_HEADERS), ...dataRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rapport paiements');
      const today = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(
        wb,
        `rapport-paiements-${exportDateDebut}_${exportDateFin}-${today}.xlsx`
      );
      setExportNotify({
        open: true,
        message: `${toExport.length.toLocaleString('fr-FR')} ligne${toExport.length !== 1 ? 's' : ''} exportée${toExport.length !== 1 ? 's' : ''} (du ${exportDateDebut} au ${exportDateFin}).`,
        severity: 'success',
      });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (e as Error)?.message ??
        'Échec de l’export Excel sur la période.';
      setExportNotify({ open: true, message: String(msg), severity: 'error' });
    } finally {
      setDateExportLoading(false);
    }
  };

  const closePdfDialog = useCallback(() => {
    setPdfDialog((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      pdfBlobRef.current = null;
      return { open: false, url: null, row: null };
    });
  }, []);

  const openFacturePdf = useCallback(async (row: PaiementApiItem) => {
    setFactureError(null);
    setPdfLoadingId(row.id);
    setPdfDialog((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      pdfBlobRef.current = null;
      return { open: true, url: null, row };
    });
    try {
      const url = await createPaiementFacturePdfObjectUrl(row.id);
      pdfBlobRef.current = url;
      setPdfDialog((prev) => ({ ...prev, url }));
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (e as Error)?.message ??
        'Impossible de charger la facture PDF.';
      setFactureError(String(msg));
      setPdfDialog((prev) => {
        if (prev.url) URL.revokeObjectURL(prev.url);
        pdfBlobRef.current = null;
        return { open: false, url: null, row: null };
      });
    } finally {
      setPdfLoadingId(null);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pdfBlobRef.current) {
        URL.revokeObjectURL(pdfBlobRef.current);
        pdfBlobRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          overflow: 'hidden',
          boxShadow: (theme) => `0 1px 3px ${alpha(theme.palette.common.black, 0.06)}`,
        }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2.25,
            borderBottom: 1,
            borderColor: 'divider',
            background: (theme) =>
              `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} letterSpacing="-0.02em">
                Historique des paiements
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {!loading && (
                  <>
                    <Typography component="span" fontWeight={700} color="primary.main">
                      {meta.total.toLocaleString('fr-FR')}
                    </Typography>{' '}
                    paiement{meta.total !== 1 ? 's' : ''} en base
                    {meta.last_page > 1 ? ` · page serveur ${meta.current_page} / ${meta.last_page}` : ''}
                  </>
                )}
                {loading && 'Chargement…'}
              </Typography>
              {!loading && rows.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, maxWidth: 620, lineHeight: 1.45 }}>
                  Aucun appel{' '}
                  <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {'GET /dossiers/{id}'}
                  </Typography>{' '}
                  (évite le 403) : le{' '}
                  <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace' }}>
                    centre_id
                  </Typography>{' '}
                  est lu sur le dossier renvoyé avec chaque paiement, puis{' '}
                  <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {'GET /referentiels/{centre_id}'}
                  </Typography>{' '}
                  charge le libellé. Sinon, centre déjà embarqué dans le dossier. Le fichier Excel de la page est préparé
                  ensuite.
                </Typography>
              )}
              {hasActiveFilters && !loading && rows.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  Filtre actif :{' '}
                  <Typography component="span" fontWeight={600} color="text.primary">
                    {displayRows.length}
                  </Typography>{' '}
                  ligne{displayRows.length !== 1 ? 's' : ''} sur{' '}
                  <Typography component="span" fontWeight={600}>
                    {rows.length}
                  </Typography>{' '}
                  chargée{rows.length !== 1 ? 's' : ''} — changez de page pour parcourir d’autres lots.
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'stretch', sm: 'flex-end' }, gap: 1.5 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={
                    centreLoading ? <CircularProgress size={16} color="inherit" /> : <ArrowDownTrayIcon className="w-4 h-4" />
                  }
                  disabled={loading || centreLoading || displayRows.length === 0 || !preparedPageWorkbook}
                  onClick={handleExportExcel}
                  sx={{ fontWeight: 600 }}
                >
                  {centreLoading ? 'Centres…' : 'Télécharger Excel (page)'}
                </Button>
                {hasActiveFilters && (
                  <Chip
                    label="Effacer les filtres"
                    size="small"
                    color="primary"
                    variant="outlined"
                    onDelete={resetFilters}
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: (theme) => alpha(theme.palette.grey[50], 0.6),
                  maxWidth: { xs: '100%', sm: 420 },
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ display: 'block', mb: 1, letterSpacing: 0.4 }}
                >
                  EXPORT PAR PÉRIODE
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  <TextField
                    type="date"
                    label="Du"
                    size="small"
                    value={exportDateDebut}
                    onChange={(e) => setExportDateDebut(e.target.value)}
                    disabled={dateExportLoading}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 158, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                  <TextField
                    type="date"
                    label="Au"
                    size="small"
                    value={exportDateFin}
                    onChange={(e) => setExportDateFin(e.target.value)}
                    disabled={dateExportLoading}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 158, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={
                      dateExportLoading ? <CircularProgress size={16} color="inherit" /> : <ArrowDownTrayIcon className="w-4 h-4" />
                    }
                    disabled={dateExportLoading || !exportDateDebut || !exportDateFin}
                    onClick={() => void handleExportExcelByDate()}
                    sx={{ fontWeight: 600 }}
                  >
                    {dateExportLoading ? 'Export…' : 'Télécharger Excel (période)'}
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, lineHeight: 1.45 }}>
                  Paramètres{' '}
                  <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace' }}>
                    date_debut
                  </Typography>{' '}
                  /{' '}
                  <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace' }}>
                    date_fin
                  </Typography>{' '}
                  sur GET /paiements ; les lignes sont aussi filtrées sur{' '}
                  <Typography component="span" variant="caption" sx={{ fontFamily: 'monospace' }}>
                    created_at
                  </Typography>{' '}
                  côté navigateur.
                </Typography>
              </Box>
            </Box>
          </Box>

          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2,
              borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
              bgcolor: 'background.paper',
              boxShadow: 'none',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1.25, letterSpacing: 0.4 }}>
              FILTRER SUR CETTE PAGE
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                alignItems: 'flex-start',
              }}
            >
              <TextField
                size="small"
                label="Nom ou prénom de l’usager"
                placeholder="Ex. Martin, Jean…"
                value={filterNom}
                onChange={(e) => setFilterNom(e.target.value)}
                sx={{
                  minWidth: { xs: '100%', sm: 260 },
                  flex: { sm: '1 1 240px' },
                  '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: (t) => alpha(t.palette.grey[50], 0.8) },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MagnifyingGlassIcon className="w-4 h-4" style={{ opacity: 0.55 }} />
                    </InputAdornment>
                  ),
                  endAdornment: filterNom ? (
                    <InputAdornment position="end">
                      <IconButton size="small" aria-label="Effacer le nom" onClick={() => setFilterNom('')} edge="end">
                        <XMarkIcon className="w-4 h-4" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
              <TextField
                size="small"
                label="Code ou référence de paiement"
                placeholder="Fragment du code…"
                value={filterCode}
                onChange={(e) => setFilterCode(e.target.value)}
                sx={{
                  minWidth: { xs: '100%', sm: 220 },
                  flex: { sm: '0 1 220px' },
                  '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: (t) => alpha(t.palette.grey[50], 0.8) },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MagnifyingGlassIcon className="w-4 h-4" style={{ opacity: 0.55 }} />
                    </InputAdornment>
                  ),
                  endAdornment: filterCode ? (
                    <InputAdornment position="end">
                      <IconButton size="small" aria-label="Effacer le code" onClick={() => setFilterCode('')} edge="end">
                        <XMarkIcon className="w-4 h-4" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </Box>
          </Paper>
        </Box>

        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer
          sx={{
            maxHeight: { xs: 'none', md: 'min(70vh, 640px)' },
            px: { xs: 0, sm: 0.5 },
            pt: 1,
            pb: 0.5,
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              minWidth: 1220,
              borderCollapse: 'separate',
              borderSpacing: 0,
              '& .MuiTableCell-root': {
                borderBottom: 1,
                borderColor: 'divider',
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                    boxShadow: (theme) => `0 1px 0 ${alpha(theme.palette.common.black, 0.06)}`,
                  }}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                  }}
                >
                  Montant
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                  }}
                >
                  Code
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                  }}
                >
                  Référence
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                  }}
                >
                  Nom
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                  }}
                >
                  Prénom
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                  }}
                >
                  Auto-école
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                  }}
                >
                  Centre
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                  }}
                >
                  Type demande
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                  }}
                >
                  Catégorie
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                  }}
                >
                  N° permis
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                  }}
                >
                  Statut
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'primary.dark',
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    borderBottom: (theme) => `2px solid ${theme.palette.primary.main}`,
                    py: 1.35,
                  }}
                >
                  Facture
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={36} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Aucun paiement enregistré.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredOutOnPage ? (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Aucune ligne ne correspond à ces critères sur cette page. Essayez une autre page ou élargissez la
                      recherche.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayRows.map((row) => {
                  const statut = dossierStatut(row.dossier);
                  return (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{
                        transition: 'background-color 0.15s ease',
                        '&:nth-of-type(even)': {
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03),
                        },
                        '&:hover': {
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.07),
                        },
                        '&:last-child td': { borderBottom: 0 },
                      }}
                    >
                      <TableCell sx={{ fontSize: '0.8125rem', whiteSpace: 'nowrap', verticalAlign: 'middle', py: 1.15 }}>
                        {formatDateFr(row.created_at)}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          verticalAlign: 'middle',
                          py: 1.15,
                          color: 'success.dark',
                        }}
                      >
                        {row.montant?.trim() || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace', verticalAlign: 'middle', py: 1.15 }}>
                        {row.code_paiement?.trim() || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', fontFamily: 'monospace', verticalAlign: 'middle', py: 1.15 }}>
                        {row.reference_paiement?.trim() || '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', maxWidth: 140, verticalAlign: 'middle', py: 1.15 }}>
                        <Typography noWrap title={candidatNom(row)} fontWeight={600}>
                          {candidatNom(row)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', maxWidth: 140, verticalAlign: 'middle', py: 1.15 }}>
                        <Typography noWrap title={candidatPrenom(row)} color="text.secondary">
                          {candidatPrenom(row)}
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{ fontSize: '0.8125rem', color: 'text.secondary', maxWidth: 140, verticalAlign: 'middle', py: 1.15 }}
                      >
                        <Typography noWrap title={dossierAutoEcole(row.dossier)}>
                          {dossierAutoEcole(row.dossier)}
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{ fontSize: '0.8125rem', color: 'text.secondary', maxWidth: 160, verticalAlign: 'middle', py: 1.15 }}
                      >
                        <Typography noWrap title={resolveDossierCentre(row)}>
                          {resolveDossierCentre(row)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', verticalAlign: 'middle', py: 1.15 }}>
                        {dossierTypeDemande(row.dossier)}
                      </TableCell>
                      <TableCell
                        sx={{ fontSize: '0.8125rem', color: 'text.secondary', maxWidth: 120, verticalAlign: 'middle', py: 1.15 }}
                      >
                        <Typography noWrap title={resolveDossierCategorie(row)}>
                          {resolveDossierCategorie(row)}
                        </Typography>
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: '0.8125rem',
                          fontFamily: 'monospace',
                          verticalAlign: 'middle',
                          py: 1.15,
                          maxWidth: 140,
                        }}
                      >
                        <Typography noWrap title={dossierNumeroPermis(row.dossier)}>
                          {dossierNumeroPermis(row.dossier)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'middle', maxWidth: 180, py: 1.15 }}>
                        {statut === '—' ? (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        ) : (
                          <Chip
                            label={statut}
                            size="small"
                            variant="outlined"
                            sx={{
                              maxWidth: '100%',
                              height: 26,
                              fontWeight: 500,
                              fontSize: '0.7rem',
                              '& .MuiChip-label': { px: 1, overflow: 'hidden', textOverflow: 'ellipsis' },
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle', width: 72, py: 1.15 }}>
                        <Tooltip title="Voir la facture PDF">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => void openFacturePdf(row)}
                              disabled={pdfLoadingId === row.id}
                              sx={{
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08) },
                              }}
                            >
                              {pdfLoadingId === row.id ? (
                                <CircularProgress size={20} color="inherit" />
                              ) : (
                                <DocumentTextIcon className="w-5 h-5" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          count={meta.total}
          page={fetchQuery.page}
          onPageChange={(_, newPage) => setFetchQuery((q) => ({ ...q, page: newPage }))}
          rowsPerPage={fetchQuery.rowsPerPage}
          onRowsPerPageChange={(e) => {
            const next = parseInt(e.target.value, 10);
            setFetchQuery((q) => ({ ...q, page: 0, rowsPerPage: next }));
          }}
          labelRowsPerPage="Lignes par page :"
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: (theme) => alpha(theme.palette.grey[50], 0.6),
            '& .MuiTablePagination-toolbar': { minHeight: 56, px: 2 },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: '0.8125rem',
            },
          }}
        />
      </Paper>

      <Dialog
        open={pdfDialog.open}
        onClose={closePdfDialog}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          elevation: 8,
          sx: { borderRadius: 2, maxHeight: '92vh' },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            py: 1.5,
            pr: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Facture PDF
            </Typography>
            {pdfDialog.row && (
              <Typography variant="body2" color="text.secondary" noWrap title={pdfDialog.row.code_paiement ?? ''}>
                {pdfDialog.row.code_paiement?.trim()
                  ? `Code : ${pdfDialog.row.code_paiement.trim()}`
                  : `Paiement ${pdfDialog.row.id.slice(0, 8)}…`}
                {candidatLabel(pdfDialog.row) !== '—' ? ` · ${candidatLabel(pdfDialog.row)}` : ''}
              </Typography>
            )}
          </Box>
          <IconButton aria-label="Fermer" onClick={closePdfDialog} size="small" sx={{ flexShrink: 0 }}>
            <XMarkIcon className="w-5 h-5" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: 'grey.100', minHeight: '60vh' }}>
          {!pdfDialog.url ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '55vh' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              component="iframe"
              title="Facture PDF"
              src={pdfDialog.url}
              sx={{
                display: 'block',
                width: '100%',
                height: { xs: '70vh', sm: '75vh' },
                border: 0,
                bgcolor: 'grey.900',
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={Boolean(factureError)}
        autoHideDuration={6000}
        onClose={() => setFactureError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setFactureError(null)} variant="filled" sx={{ width: '100%' }}>
          {factureError}
        </Alert>
      </Snackbar>

      <Snackbar
        open={exportNotify.open}
        autoHideDuration={6000}
        onClose={() => setExportNotify((n) => ({ ...n, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={exportNotify.severity}
          onClose={() => setExportNotify((n) => ({ ...n, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {exportNotify.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default FraisDossierTable;
