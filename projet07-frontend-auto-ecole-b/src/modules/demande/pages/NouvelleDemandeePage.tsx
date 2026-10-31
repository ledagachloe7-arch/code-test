import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha, createTheme, ThemeProvider } from '@mui/material/styles';
import {
  CheckCircleIcon,
  DocumentPlusIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  UserPlusIcon,
  BuildingOffice2Icon,
  FlagIcon,
  CheckIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  FingerPrintIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { ROUTES } from '../../../shared/constants';
import { buildNumeroPermis } from '../../cnepc/forms/utils';
import type { NumeroPermisParts, PermisFormatType } from '../../cnepc/forms/types';
import { demandeReducer, initialDemandeState } from '../types';
import { demandeService, type PermisApiData } from '../services/demande.service';
import axiosClient from '../../../shared/utils/axiosConfig';
import { circuitSuiviService, type EtapeCircuit } from '../../reception/services/circuit-suivi.service';
import { isEtapePaiementCircuit } from '../../reception/utils/etapeHelpers';
import { useAgentLieuExamen } from '../../cnepc/forms/hooks';
import { typeDemandeService } from '../../cnepc/services';
import {
  SendToCNEDDTError,
  buildDossierTransfertEligibilitySnapshot,
  sendDossierToCNEDDT,
} from '../../reception/services/sendToCNEDDT.service';
import {
  telechargerRecepisseTransfertBiometriePdf,
  trouverPieceEtiqueteePhoto,
} from '../utils/recepisseTransfertBiometriePdf.ts';
import { useAppStore } from '../../../store';
import {
  FinalisationSection,
  PiecesJustificativesCard,
  SubmitActionBar,
  SummaryRecapCards,
  type RecapLines,
} from './nouvelle-demande/components';

// ─── types locaux ────────────────────────────────────────────────────────────
/** Accord visuel avec `DemandeSidebar` (extrémité du dégradé). */
const DEMANDE_THEME_NAVY = '#0d4a7a';

interface TypeDemandeItem { id: string; name: string; code?: string }
interface AutoEcoleItem   { id: string; nom_auto_ecole: string }
interface FormationItem {
  id: string;
  /** Présent côté API Laravel sur la ressource formation. */
  type_permis_id?: string;
  type_permis?: { id: string; code: string; libelle?: string };
  montant?: number;
}
interface ReferentielItem { id: string; libelle?: string; code?: string }
interface ProvinceItem    { id: string; libelle?: string; nom?: string }
interface CandidatItem    { id: string; personne?: { nom?: string; prenom?: string }; numero_candidat?: string }
/** Ligne minimale depuis GET /pieces-justificatives (idem Usager DocumentsList). */
interface PieceReferentielleRow {
  id: string;
  code?: string;
  libelle?: string;
}
interface ExpectedPieceItem {
  /** Clé liste / React stable (circuit + entrée pièce). */
  id: string;
  /** ID à envoyer en piece_justification_id (priorité UUID référentiel). */
  pieceJustificationUploadId: string;
  /** Aligné EtapeDetails : pièce.type_document (clé de corrélation côté API). */
  typeDocument?: string;
  libelle: string;
  obligatoire: boolean;
  etape_libelle?: string;
}

type DgdiStatus = 'idle' | 'ok' | 'bypass' | 'error';

const TYPES_PIECE_DGDI = [
  { value: 'CNI', label: "Carte d'identité" },
  { value: 'Passeport', label: 'Passeport' },
  { value: 'Carte_sejour', label: 'Carte de séjour' },
  { value: 'Carte_resident', label: 'Carte de résident' },
];
const REGEX_PASSEPORT = /^[0-9]{2}[A-Z]{2}[0-9]{5}$/;
const EMPTY_PARTS: NumeroPermisParts = { annee: '', province: '', categorie: '', numero: '' };

function dgdiTypeToCandidatType(typePiece: string): string {
  if (typePiece === 'Passeport') return 'Passeport';
  if (typePiece === 'Carte_sejour') return 'Titre de séjour';
  if (typePiece === 'Carte_resident') return 'Autre';
  return 'CNI';
}

function isDgdiPieceFormatValid(typePiece: string, numero: string): boolean {
  const n = numero.trim();
  if (!n) return false;
  if (typePiece === 'Passeport') return REGEX_PASSEPORT.test(n);
  return n.length >= 3;
}
/** Correspond uniquement au compte développeur : même idée que le bypass paiement réception pour les admins. */
const EMAIL_BYPASS_VERIF_PAIEMENT = 'developpeuradmin@rd.com';

/** Champs dossier à afficher quand l’API refuse le transfert (ex. « Aucun dossier éligible »). */
const DOSSIER_TRANSFERT_ELIGIBILITE_KEYS = [
  'candidat_id',
  'auto_ecole_id',
  'formation_id',
  'type_demande_id',
  'statut',
  'commentaires',
  'referenciel_id',
  'numero_permis',
  'numero_origine_permis',
  'date_expiration',
  'lieu_de_dobtention_du_permis',
  'date_de_dobtention_du_permis',
  'date_de_delivrance_du_permis',
  'code_paiement',
  'expired',
  'expiration_date',
  'suspended',
  'suspended_date',
  'province_id',
  'centre_id',
  'data_categorie',
] as const;

const isTransfertNonEligibleMessage = (msg: string): boolean => {
  const n = msg.toLowerCase();
  return n.includes('aucun dossier') && (n.includes('éligible') || n.includes('eligible'));
};

const formatDiagnosticDossierValue = (v: unknown): string => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string' && v.trim() === '') return '—';
  if (Array.isArray(v)) return v.length === 0 ? '— (tableau vide)' : JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const isDiagnosticDossierValueMissing = (v: unknown): boolean => {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
};
const isRecapMissingValue = (v: unknown): boolean => String(v ?? '').trim().length === 0;

// ─── helpers ─────────────────────────────────────────────────────────────────
const genPassword = () => {
  const c = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 10 }, () => c[Math.floor(Math.random() * c.length)]).join('');
};

const isNouveauPermis = (name: string) =>
  name.toLowerCase().includes('nouveau') || name.toLowerCase().includes('new');

const fmtDate = (iso?: string) => (iso ? iso.split('T')[0] : '');
/** Aligné sur stockage dossier — évite les échecs de jointure liste ↔ suggestions (avec/sans tirets). */
function normalizeNumeroPermisKey(num?: string): string {
  return String(num ?? '')
    .replace(/-/g, '')
    .toUpperCase()
    .trim();
}
/** Extrait numéros et méta-dates depuis `data_categorie` (liste / GET dossier). */
function extractNumerosEtMetaDepuisDataCategorie(dataCategorie: unknown[]): {
  numeros: string[];
  meta: Record<string, { date_obtention: string; date_validite: string; lieu_obtention: string }>;
} {
  const meta: Record<string, { date_obtention: string; date_validite: string; lieu_obtention: string }> = {};
  const numerosList: string[] = [];
  const pushCanon = (numeroBrut: string) => {
    const canon = normalizeNumeroPermisKey(numeroBrut);
    if (!canon) return '';
    if (!numerosList.includes(canon)) numerosList.push(canon);
    return canon;
  };

  for (const entry of dataCategorie) {
    if (typeof entry === 'string') {
      const raw = entry.trim();
      if (!raw) continue;
      if (raw.startsWith('{') && raw.endsWith('}')) {
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          const numeroRaw = String(
            parsed.codification_code ?? parsed.numero_permis ?? parsed.numero ?? '',
          ).trim();
          const canon = pushCanon(numeroRaw);
          if (canon) {
            const d0 = parsed.date_obtention ?? parsed.valable_du;
            const dv = parsed.date_validite ?? parsed.jusqu_au;
            meta[canon] = {
              date_obtention: fmtDate(typeof d0 === 'string' ? d0 : ''),
              date_validite: fmtDate(typeof dv === 'string' ? dv : ''),
              lieu_obtention: String(parsed.lieu_obtention ?? parsed.lieu_delivrance ?? '').trim(),
            };
          }
        } catch {
          pushCanon(raw);
        }
      } else {
        pushCanon(raw);
      }
    } else if (entry && typeof entry === 'object') {
      const o = entry as Record<string, unknown>;
      const numeroRaw = String(o.codification_code ?? o.numero_permis ?? o.numero ?? '').trim();
      const canon = pushCanon(numeroRaw);
      if (canon) {
        const d0 = o.date_obtention ?? o.valable_du;
        const dv = o.date_validite ?? o.jusqu_au;
        meta[canon] = {
          date_obtention: fmtDate(typeof d0 === 'string' ? d0 : ''),
          date_validite: fmtDate(typeof dv === 'string' ? dv : ''),
          lieu_obtention: String(o.lieu_obtention ?? o.lieu_delivrance ?? '').trim(),
        };
      }
    }
  }
  return { numeros: numerosList, meta };
}
function findPermisSuggestionParNumero(numeroSelection: string, suggestions: PermisApiData[]): PermisApiData | undefined {
  const n = normalizeNumeroPermisKey(numeroSelection);
  return suggestions.find((p) => normalizeNumeroPermisKey(p.numero_permis) === n);
}
function selectedPermisMetaPourNumero(
  numeroSelection: string,
  meta: Record<string, { date_obtention: string; date_validite: string; lieu_obtention: string }>,
): { date_obtention: string; date_validite: string; lieu_obtention: string } | undefined {
  if (meta[numeroSelection]) return meta[numeroSelection];
  const nk = normalizeNumeroPermisKey(numeroSelection);
  const altKey = Object.keys(meta).find((k) => normalizeNumeroPermisKey(k) === nk);
  return altKey ? meta[altKey] : undefined;
}
const normalizeCategorie = (cat?: string) => (cat ?? '').toUpperCase().trim();
/** Numéros type Gabon/Yaoundé « 20251B09384 » : année + province + lettre catégorie + numéro. */
function extractCategoriePermisDepuisNumeroPrincipal(numero?: string): string {
  const n = String(numero ?? '').replace(/-/g, '').toUpperCase();
  const standard = n.match(/^(\d{4})\d([A-Z])(?=\d)/i);
  if (standard && standard[2]) return normalizeCategorie(standard[2]);
  return '';
}
const requiresPermisB = (categories: string[]) => categories.some((c) => ['C', 'D', 'E', 'F'].some((x) => c.startsWith(x)));
const CATEGORY_PRIORITY_ORDER = ['B', 'C', 'D', 'E', 'F'] as const;
const normalizeText = (value?: string) =>
  (value ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
const normalizeEntityKey = (value?: string) =>
  (value ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9_-]/g, '')
    .trim();

/** Auto-école liée au CNEPC (nom exact « CNEPC » ou contenant « cnepc » après normalisation). */
function findCnepcAutoEcole<T extends { nom_auto_ecole: string }>(autoEcoles: T[]): T | undefined {
  const exact = autoEcoles.find(
    (ae) => String(ae.nom_auto_ecole ?? '').trim().toUpperCase() === 'CNEPC',
  );
  if (exact) return exact;
  return autoEcoles.find((ae) => {
    const n = normalizeText(ae.nom_auto_ecole).replace(/\s+/g, '');
    return n === 'cnepc' || n.includes('cnepc');
  });
}

/** Compare libellé/code formation au référentiel / lettre de catégorie (B ≠ « Permis B » en code). */
function formationTypeAlignsWithCategoryAndRef(
  f: FormationItem,
  category: string,
  ref?: ReferentielItem,
): boolean {
  const pc = normalizeCategorie(category);
  if (!pc) return false;
  const tp = f.type_permis;
  const code = normalizeCategorie(tp?.code ?? '');
  const lib = normalizeText(tp?.libelle ?? '');
  if (code && (code === pc || code.startsWith(pc) || pc.startsWith(code))) return true;
  if (pc.length === 1) {
    if (lib.includes(`permis ${pc.toLowerCase()}`)) return true;
    if (lib.includes(`categorie ${pc.toLowerCase()}`)) return true;
    if (new RegExp(`\\b${pc}\\b`, 'i').test(lib)) return true;
  }
  if (ref?.libelle) {
    const rl = normalizeText(ref.libelle);
    if (rl && (lib === rl || lib.includes(rl) || rl.includes(lib))) return true;
  }
  return false;
}

/** Choisit la formation CNEPC alignée sur le référentiel ou la catégorie du permis principal. */
function pickFormationPourPermisEtReferentiel(
  formations: FormationItem[],
  targetReferencielId: string,
  principalCat: string,
  referentiels: ReferentielItem[],
): FormationItem | undefined {
  const ref = targetReferencielId ? referentiels.find((r) => r.id === targetReferencielId) : undefined;
  const refCode = ref?.code ? normalizeCategorie(ref.code) : '';
  const cat = principalCat || refCode;

  if (targetReferencielId) {
    const byNestedTypePermisId = formations.find((f) => f.type_permis?.id === targetReferencielId);
    if (byNestedTypePermisId) return byNestedTypePermisId;
    const byTypePermisIdCol = formations.find((f) => f.type_permis_id === targetReferencielId);
    if (byTypePermisIdCol) return byTypePermisIdCol;
  }

  if (cat && ref) {
    const byRefLibelle = formations.find((f) => {
      const fl = normalizeText(f.type_permis?.libelle ?? '');
      const rl = normalizeText(ref.libelle ?? '');
      return rl && fl && (fl === rl || fl.includes(rl) || rl.includes(fl));
    });
    if (byRefLibelle) return byRefLibelle;
  }

  if (cat) {
    const byCategorie = formations.find((f) => formationTypeAlignsWithCategoryAndRef(f, cat, ref));
    if (byCategorie) return byCategorie;
  }

  if (refCode) {
    const exact = formations.find((f) => normalizeCategorie(f.type_permis?.code ?? '') === refCode);
    if (exact) return exact;
  }
  return undefined;
}

function getPermisCategoryPriority(cat?: string): number {
  const first = normalizeCategorie(cat).charAt(0);
  const idx = CATEGORY_PRIORITY_ORDER.findIndex((c) => c === first);
  return idx >= 0 ? idx : -1;
}

/** Permis « principal » = priorité minimale parmi B, C, D, E, F (B gagne si présent dans la sélection). */
function pickPrincipalPermisByCategoryOrder(permis: PermisApiData[]): PermisApiData {
  return permis.reduce((best, current) => {
    const pc = getPermisCategoryPriority(current.categorie);
    const pb = getPermisCategoryPriority(best.categorie);
    const sc = pc < 0 ? 999 : pc;
    const sb = pb < 0 ? 999 : pb;
    return sc <= sb ? current : best;
  }, permis[0]);
}

function isPermisNumeroOriginePattern(numero?: string): boolean {
  return /^\d{5}X\d{5}$/i.test(String(numero ?? '').replace(/-/g, '').trim());
}

function formatTypeDemandeDisplayName(name?: string): string {
  const raw = String(name ?? '').trim();
  const normalized = normalizeEntityKey(raw);
  if (normalized === 'DUPLICATAFICHEENREGISTREMENT') return "DUPLICATA FICHE D'ENREGISTREMENT";
  return raw;
}

function getTypeDemandeSubtitle(name?: string, code?: string): string {
  const key = normalizeEntityKey(code || name || '');
  if (key === 'FICHEENREGISTREMENT' || key === 'DUPLICATAFICHEENREGISTREMENT') {
    return "Permis vert: concerne les permis internationaux.";
  }
  if (key.includes('CONVERSION')) {
    return 'Conversion: permis militaire vers permis civil.';
  }
  if (key.includes('DUPLICATA')) {
    return 'Duplicata: concerne les permis roses (permis nationaux).';
  }
  return 'Type de carte de permis';
}

function pickPrincipalPermisForType(
  permis: PermisApiData[],
  opts: { requiresOriginePattern: boolean },
): PermisApiData {
  if (opts.requiresOriginePattern) {
    const byOriginePattern = permis.find((p) => isPermisNumeroOriginePattern(p.numero_permis));
    if (byOriginePattern) return byOriginePattern;
  }
  return pickPrincipalPermisByCategoryOrder(permis);
}

/** Pré-remplissage identité compte candidat : uniquement les lignes retournées par l’API (exclut le permis B saisi manuellement). */
function pickPermisIdentityFromApiSelection(
  selectedApiRows: PermisApiData[],
  apiSuggestions: PermisApiData[],
): PermisApiData | null {
  const apiNumSet = new Set(apiSuggestions.map((s) => normalizeNumeroPermisKey(s.numero_permis)));
  const fromApi = selectedApiRows.filter((p) =>
    apiNumSet.has(normalizeNumeroPermisKey(p.numero_permis)),
  );
  if (fromApi.length === 0) return null;
  const withIdentity = fromApi.find(
    (p) =>
      String(p.nom ?? '').trim().length > 0 ||
      String(p.prenom ?? '').trim().length > 0 ||
      String(p.date_naissance ?? '').trim().length > 0,
  );
  return withIdentity ?? fromApi[0];
}

function resolveReferencielIdFromCategorie(
  referentiels: ReferentielItem[],
  categorie?: string,
): string {
  const cat = normalizeCategorie(categorie);
  if (!cat) return '';
  const byCode = referentiels.find((r) => normalizeCategorie(r.code) === cat);
  if (byCode?.id) return byCode.id;
  const byLibelle = referentiels.find((r) => normalizeText(r.libelle).includes(`permis ${cat.toLowerCase()}`));
  return byLibelle?.id ?? '';
}

function parsePiecesJustificativesResponse(body: unknown): PieceReferentielleRow[] {
  let raw: unknown[] = [];
  if (body == null) raw = [];
  else if (Array.isArray(body)) raw = body;
  else if (typeof body === 'object') {
    const d = (body as { data?: unknown }).data;
    if (Array.isArray(d)) raw = d;
    else if (d && typeof d === 'object' && 'data' in (d as object) && Array.isArray((d as { data: unknown[] }).data)) {
      raw = (d as { data: unknown[] }).data;
    }
  }
  return raw
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
      id: String(
        r.pieces_justificative ?? r.piece_justificative ?? r.id ?? '',
      ).trim(),
      code: r.code != null ? String(r.code) : undefined,
      libelle: r.libelle != null ? String(r.libelle) : undefined,
    };
    })
    .filter((r) => r.id);
}

/** Résoudre un UUID canonique pour POST /documents comme DocumentsList (_selectedPieceId_). */
function resolvePieceUploadIdFromCircuitAndReferentiel(
  circuitPiece: Record<string, unknown>,
  etapeId: string,
  refs: PieceReferentielleRow[],
): { rowKey: string; uploadId: string; typeDoc?: string } {
  const typeDoc = String(circuitPiece.type_document ?? '').trim();
  const rawId = String(circuitPiece.id ?? '').trim();
  const libelle = String(circuitPiece.libelle ?? circuitPiece.type_document ?? '').trim();

  const rowKey = `${etapeId}|${rawId}|${typeDoc}|${normalizeText(libelle)}`;

  const byRawId = rawId ? refs.find((r) => r.id === rawId) : undefined;
  const byTypeDoc = typeDoc
    ? refs.find(
        (r) =>
          r.id === typeDoc || (r.code != null && String(r.code).trim() === typeDoc),
      )
    : undefined;
  const normLibMatch =
    libelle
      ? refs.find(
          (r) =>
            Boolean(r.libelle) && normalizeText(r.libelle ?? '') === normalizeText(libelle),
        ) ?? refs.find((r) => Boolean(r.libelle) && normalizeText(r.libelle ?? '').includes(normalizeText(libelle)))
      : undefined;

  const uuidRow = byRawId ?? byTypeDoc ?? normLibMatch;
  const uploadId = uuidRow?.id ?? rawId ?? typeDoc;
  const finalUpload = uploadId || rowKey;
  return { rowKey, uploadId: finalUpload.trim() || rowKey, typeDoc: typeDoc || undefined };
}

/** Comme DocumentsList : rattacher tout document au dossier courant avant corrélation. */
function documentBelongsToDossier(doc: Record<string, unknown>, dossierId: string): boolean {
  if (!dossierId) return false;
  const attrs =
    doc.attributes && typeof doc.attributes === 'object'
      ? (doc.attributes as Record<string, unknown>)
      : {};
  const did =
    doc.documentable_id ??
    attrs.documentable_id ??
    doc.dossier_id ??
    attrs.dossier_id;
  return String(did ?? '') === String(dossierId);
}

/**
 * Corrélation comme EtapeDetails : piece_justification_id, type_document, type_document_id, clés attendues pièce.
 */
function documentMatchesExpectedPiece(
  doc: Record<string, unknown>,
  piece: ExpectedPieceItem,
  dossierId: string,
): boolean {
  if (!documentBelongsToDossier(doc, dossierId)) return false;
  const attrs =
    doc.attributes && typeof doc.attributes === 'object'
      ? (doc.attributes as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  const docPieceCandidates = [
    doc.piece_justification_id,
    attrs.piece_justification_id,
    doc.type_document_id,
    attrs.type_document_id,
  ]
    .filter((c): c is string | number | boolean => c != null)
    .map((c) => String(c).trim());

  const expectedKeys = [
    piece.pieceJustificationUploadId,
    piece.typeDocument,
    piece.id,
  ]
    .filter((x): x is string => Boolean(x?.trim()));

  if (docPieceCandidates.some((c) => expectedKeys.some((ek) => ek && String(ek).trim() === c))) return true;

  /* Fallback léger : EtapeDetails teste aussi le nom fichier vs type_document (si court). */
  const nom = String(doc.nom_fichier ?? doc.nom ?? '').toLowerCase();
  const td = piece.typeDocument?.toLowerCase() ?? '';
  if (piece.typeDocument && td.length <= 48 && td.length >= 4 && nom.includes(td)) return true;

  return false;
}

function resolveDocForPiece(docs: any[], piece: ExpectedPieceItem, dossierId: string): any | null {
  const scoped = docs.filter((d) => documentBelongsToDossier(d as Record<string, unknown>, dossierId));
  const matches = scoped.filter((d) => documentMatchesExpectedPiece(d as Record<string, unknown>, piece, dossierId));
  if (matches.length === 0) return null;
  return matches.reduce((a, b) => {
    const ta = String(a.updated_at ?? a.created_at ?? '');
    const tb = String(b.updated_at ?? b.created_at ?? '');
    return tb.localeCompare(ta) >= 0 ? b : a;
  });
}

function documentsScopedToDossier(docs: any[], dossierId: string): any[] {
  return docs.filter((d) => documentBelongsToDossier(d as Record<string, unknown>, dossierId));
}

// ─── Section title ────────────────────────────────────────────────────────────
interface SectionTitleProps {
  num: number; title: string; subtitle?: string; complete: boolean;
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
}
const SectionTitle: React.FC<SectionTitleProps> = ({ num, title, subtitle, complete, icon: Icon }) => {
  const th = useTheme();
  const navy = th.palette.primary.dark;
  const successDark = th.palette.success.dark;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
      <Avatar
        sx={{
          width: 32,
          height: 32,
          fontSize: '0.8rem',
          fontWeight: 700,
          bgcolor: complete ? 'success.main' : navy,
          color: '#fff',
          transition: 'background-color .2s',
        }}
      >
        {complete ? <CheckIcon style={{ width: 16 }} /> : num}
      </Avatar>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ color: complete ? 'text.primary' : navy }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: alpha(navy, 0.72) }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Icon style={{ width: 20, height: 20, color: complete ? successDark : navy }} />
    </Box>
  );
};

// ─── Permis result card ────────────────────────────────────────────────────────
const PermisResultCard: React.FC<{ data: PermisApiData }> = ({ data }) => (
  <Card variant="outlined" sx={{ mt: 2, borderColor: 'success.main', bgcolor: 'success.50' }}>
    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <ShieldCheckIcon style={{ width: 18, color: '#2e7d32' }} />
        <Typography variant="subtitle2" fontWeight={700} color="success.dark">Permis trouvé</Typography>
      </Stack>
      <Grid container spacing={1}>
        {[
          ['N° permis', data.numero_permis],
          ['Titulaire', [data.prenom, data.nom].filter(Boolean).join(' ')],
          ['Catégorie', data.categorie],
          ['Lieu d\'obtention', data.lieu_obtention],
          ['Date d\'obtention', fmtDate(data.date_obtention)],
          ['Date de validité', fmtDate(data.date_validite)],
        ].filter(([, v]) => v).map(([label, value]) => (
          <Grid item xs={12} sm={6} key={String(label)}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="body2" fontWeight={500}>{String(value)}</Typography>
          </Grid>
        ))}
      </Grid>
    </CardContent>
  </Card>
);

// ════════════════════════════════════════════════════════════════════════════
const NouvelleDemandeePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppStore();
  const [state, dispatch] = useReducer(demandeReducer, initialDemandeState);
  const prefillAppliedRef = useRef(false);

  // referential data
  const [typesDemande, setTypesDemande] = useState<TypeDemandeItem[]>([]);
  const [autoEcoles, setAutoEcoles]     = useState<AutoEcoleItem[]>([]);
  const [formations, setFormations]     = useState<FormationItem[]>([]);
  const [referentiels, setReferentiels] = useState<ReferentielItem[]>([]);
  const [provinces, setProvinces]       = useState<ProvinceItem[]>([]);
  const [candidatResults, setCandidatResults] = useState<CandidatItem[]>([]);

  // ── DGDI ──────────────────────────────────────────────────────────────────
  const [typePiece, setTypePiece]       = useState('CNI');
  const [numeroPieceInput, setNumeroPieceInput] = useState('');
  const [dgdiVerifying, setDgdiVerifying] = useState(false);
  const [dgdiStatus, setDgdiStatus]     = useState<DgdiStatus>('idle');
  const [dgdiMessage, setDgdiMessage]   = useState('');

  // ── Permis verification ───────────────────────────────────────────────────
  const [verificationType, setVerificationType] = useState<'numero' | 'identite'>('numero');
  const [permisFormat, setPermisFormat] = useState<PermisFormatType>('standard');
  const [permisParts, setPermisParts]   = useState<NumeroPermisParts>(EMPTY_PARTS);
  const [identityForm, setIdentityForm] = useState({ nom: '', prenom: '', dateNaissance: '' });
  const [verifyingPermis, setVerifyingPermis] = useState(false);
  const [permisVerified, setPermisVerified]   = useState(false);
  const [permisError, setPermisError]         = useState('');
  const [permisApiData, setPermisApiData]     = useState<PermisApiData | null>(null);
  /** Données d’identité (nom, prénom, etc.) issues d’un permis trouvé en base — pas du permis principal saisi manuellement (ex. B). */
  const [permisIdentitySource, setPermisIdentitySource] = useState<PermisApiData | null>(null);
  const [permisSuggestions, setPermisSuggestions] = useState<PermisApiData[]>([]);
  const [selectedPermisNumbers, setSelectedPermisNumbers] = useState<string[]>([]);
  const [selectedPermisMeta, setSelectedPermisMeta] = useState<Record<string, { date_obtention: string; date_validite: string; lieu_obtention: string }>>({});
  const [manualPermisB, setManualPermisB] = useState({
    numero_permis: '',
    date_obtention: '',
    date_validite: '',
    lieu_obtention: '',
  });

  // ── loading / submit ──────────────────────────────────────────────────────
  const [loadingTypes, setLoadingTypes]         = useState(false);
  const [loadingFormations, setLoadingFormations] = useState(false);
  const [loadingAutoEcolesManual, setLoadingAutoEcolesManual] = useState(false);
  const [autoEcolesManualError, setAutoEcolesManualError] = useState<string | null>(null);
  const [searchingCandidats, setSearchingCandidats] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [createdDossierId, setCreatedDossierId] = useState<string>('');
  /** Prérempli depuis Mes dossiers / réclamation : autorise PUT /dossiers/{id} au lieu de verrouiller la soumission. */
  const [isEditingExistingDossier, setIsEditingExistingDossier] = useState(false);
  /** Champs statut/paiement/expiration gardés depuis GET pour les réinjecter au PUT sans les perdre. */
  const editionHydratePreserveRef = useRef<Record<string, unknown>>({});
  const [editionHydrating, setEditionHydrating] = useState(false);
  const [editionHydrateError, setEditionHydrateError] = useState<string | null>(null);
  /** Libellés / catégorie issus du GET dossier lorsque les listes locales ne contiennent pas encore formation/référentiel. */
  const [editionRecapFromGet, setEditionRecapFromGet] = useState<{
    categoriePermis?: string;
    autoEcoleLibelle?: string;
    formationLibelle?: string;
    referencielLibelle?: string;
    provinceLibelle?: string;
    centreLibelle?: string;
  } | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [loadingUploadedDocuments, setLoadingUploadedDocuments] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const [expectedPieces, setExpectedPieces] = useState<ExpectedPieceItem[]>([]);
  const [loadingExpectedPieces, setLoadingExpectedPieces] = useState(false);
  /** Pièce dont le téléversement est en cours (id attendu circuit). */
  const [uploadingPieceId, setUploadingPieceId] = useState<string | null>(null);
  const [paiementEtapeCircuit, setPaiementEtapeCircuit] = useState<EtapeCircuit | null>(null);
  const [dossierPaiementSnap, setDossierPaiementSnap] = useState<{
    statut?: string;
    code_paiement?: string | null;
  }>({});
  const [settingAttentePaiement, setSettingAttentePaiement] = useState(false);
  const [paiementFeedback, setPaiementFeedback] = useState<string | null>(null);
  /** Saisie vérification paiement (même flux que CircuitEtapeStepContent / EtapeAccordion). */
  const [referencePaiement, setReferencePaiement] = useState('');
  const [verifyingPaiement, setVerifyingPaiement] = useState(false);
  const [paiementVerifie, setPaiementVerifie] = useState(false);
  const [sendingToCNEDDT, setSendingToCNEDDT] = useState(false);
  const [sentToCNEDDT, setSentToCNEDDT] = useState(false);
  const [telechargeRecepissePdfLoading, setTelechargeRecepissePdfLoading] = useState(false);
  /** Instantané du dossier (champs API) si le transfert est refusé pour non-éligibilité. */
  const [transfertEligibiliteDiagnostic, setTransfertEligibiliteDiagnostic] = useState<Record<string, unknown> | null>(
    null,
  );
  const { lieu: agentLieu, labels: agentLieuLabels } = useAgentLieuExamen();
  /** Ouvert depuis Mes dossiers en modification : DGDI/vérif permis non bloquantes, hydratation via GET dossier. */
  const editionUxUnlocked = Boolean(createdDossierId && isEditingExistingDossier);

  useEffect(() => {
    if (!isEditingExistingDossier || !createdDossierId) setEditionRecapFromGet(null);
  }, [isEditingExistingDossier, createdDossierId]);

  useEffect(() => {
    setTransfertEligibiliteDiagnostic(null);
  }, [createdDossierId]);

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Évite de recharger le circuit si le type de demande n’a pas changé. */
  const circuitLoadedTypeIdRef = useRef<string | null>(null);
  /** Évite les appels CNEPC concurrents qui réinitialisent formation_id. */
  const applyingCnepcTrainingRef = useRef(false);
  /** Une seule synchro CNEPC par numéro de permis confirmé (évite boucle infinie de requêtes). */
  const cnepcSyncedPermisKeyRef = useRef<string | null>(null);
  const referentielsRef = useRef(referentiels);
  const autoEcolesRef = useRef(autoEcoles);
  const formationsRef = useRef(formations);
  const demandeStateRef = useRef(state);
  referentielsRef.current = referentiels;
  autoEcolesRef.current = autoEcoles;
  formationsRef.current = formations;
  demandeStateRef.current = state;
  const formatFileSize = (bytes: number) => {
    if (!bytes || Number.isNaN(bytes)) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const principalPermisCategorie = useMemo(() => {
    const fromPermis =
      normalizeCategorie(permisApiData?.categorie) ||
      normalizeCategorie(editionRecapFromGet?.categoriePermis) ||
      extractCategoriePermisDepuisNumeroPrincipal(state.permis.numero_permis || permisApiData?.numero_permis || selectedPermisNumbers[0]);
    if (fromPermis) return fromPermis;
    const rid = state.referenciel_id;
    if (rid) {
      const r = referentiels.find((x) => x.id === rid);
      if (r?.code) return normalizeCategorie(r.code);
    }
    return '';
  }, [
    permisApiData?.categorie,
    permisApiData?.numero_permis,
    editionRecapFromGet?.categoriePermis,
    state.permis.numero_permis,
    selectedPermisNumbers,
    state.referenciel_id,
    referentiels,
  ]);
  const inferredReferencielId = referentiels.find((r) => {
    const code = normalizeCategorie(r.code);
    const libelle = normalizeText(r.libelle);
    if (!principalPermisCategorie) return false;
    return (
      code === principalPermisCategorie ||
      code.startsWith(principalPermisCategorie) ||
      libelle.includes(`permis ${principalPermisCategorie.toLowerCase()}`) ||
      libelle.includes(`categorie ${principalPermisCategorie.toLowerCase()}`)
    );
  })?.id ?? '';

  useEffect(() => {
    if (!state.type_demande_id) {
      setExpectedPieces([]);
      setPaiementEtapeCircuit(null);
      circuitLoadedTypeIdRef.current = null;
      return;
    }
    const typeId = state.type_demande_id;
    if (circuitLoadedTypeIdRef.current === typeId) {
      return;
    }
    let mounted = true;
    const loadExpectedPieces = async () => {
      setLoadingExpectedPieces(true);
      try {
        // Même logique que ReceptionDataContext (affiliation dossier → circuit) :
        // 1) GET /type-demandes/:id → name canonique
        // 2) circuits actifs : find c.nom_entite === typeDemande.name
        // 3) sinon getCircuitByNomEntite(typeDemande.name)
        const typeDemande = await typeDemandeService.getTypeDemandeById(state.type_demande_id);
        const typeName = typeDemande?.name?.trim();
        if (!typeName) {
          if (mounted) {
            setExpectedPieces([]);
            setPaiementEtapeCircuit(null);
          }
          return;
        }

        const circuitsData = await circuitSuiviService.getCircuitsActifs();
        let pickedCircuit =
          (circuitsData ?? []).find((c) => c.nom_entite === typeName) ?? null;

        if (!pickedCircuit) {
          const tk = normalizeEntityKey(typeName);
          pickedCircuit =
            (circuitsData ?? []).find((c) => normalizeEntityKey(c.nom_entite) === tk) ?? null;
        }

        if (!pickedCircuit) {
          pickedCircuit = await circuitSuiviService.getCircuitByNomEntite(typeName);
        }

        if (!pickedCircuit?.id) {
          if (mounted) {
            setExpectedPieces([]);
            setPaiementEtapeCircuit(null);
          }
          return;
        }
        const [etapes, pjResp] = await Promise.all([
          circuitSuiviService.getEtapesByCircuitId(String(pickedCircuit.id)),
          axiosClient.get('/pieces-justificatives').catch(() => null),
        ]);
        const referentiellePieces = parsePiecesJustificativesResponse(
          pjResp != null ? (pjResp as { data?: unknown }).data : [],
        );
        const paiementEtape = (etapes ?? []).find((e) => isEtapePaiementCircuit(e)) ?? null;
        if (mounted) setPaiementEtapeCircuit(paiementEtape);
        const map = new Map<string, ExpectedPieceItem>();
        (etapes ?? []).forEach((e: EtapeCircuit) => {
          const ev = e as unknown as Record<string, unknown>;
          const etapeId = String(ev?.id ?? '');
          ((ev?.pieces as unknown[]) ?? []).forEach((raw) => {
            const p = raw as Record<string, unknown>;
            const { rowKey, uploadId, typeDoc } = resolvePieceUploadIdFromCircuitAndReferentiel(
              p,
              etapeId,
              referentiellePieces,
            );
            if (!map.has(rowKey)) {
              map.set(rowKey, {
                id: rowKey,
                pieceJustificationUploadId: uploadId,
                typeDocument: typeDoc,
                libelle: String(p?.libelle ?? p?.type_document ?? 'Pièce'),
                obligatoire: Boolean(p?.obligatoire),
                etape_libelle: ev?.libelle != null ? String(ev.libelle) : undefined,
              });
            }
          });
        });
        const pieces = Array.from(map.values()).filter((p) => p.id);
        if (mounted) {
          setExpectedPieces(pieces);
          circuitLoadedTypeIdRef.current = typeId;
        }
      } catch {
        if (mounted) {
          setExpectedPieces([]);
          setPaiementEtapeCircuit(null);
          circuitLoadedTypeIdRef.current = null;
        }
      } finally {
        if (mounted) setLoadingExpectedPieces(false);
      }
    };
    void loadExpectedPieces();
    return () => {
      mounted = false;
    };
    // NB: même clé métier que la réception (type_demande_id + détail API), pas seulement la liste locale.
  }, [state.type_demande_id]);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const navState = location.state as { prefillFromDossier?: Record<string, unknown> } | null;
    const prefill = navState?.prefillFromDossier;
    if (!prefill) return;
    prefillAppliedRef.current = true;
    dispatch({ type: 'RESET' });

    const typeName = String(prefill.type_demande_name ?? '').trim();
    const isNouveau = isNouveauPermis(typeName);
    if (prefill.type_demande_id) {
      dispatch({
        type: 'SET_TYPE_DEMANDE',
        id: String(prefill.type_demande_id ?? ''),
        name: typeName,
        is_nouveau_permis: isNouveau,
      });
    }
    const candidatId = String(prefill.candidat_id ?? '').trim();
    const candidatDisplay = String(prefill.candidat_display ?? '').trim();
    if (candidatId) {
      dispatch({ type: 'SET_CANDIDAT_EXISTING', id: candidatId, display: candidatDisplay });
    }

    const candidat = (prefill.candidat ?? {}) as Record<string, unknown>;
    const personne = (candidat.personne ?? {}) as Record<string, unknown>;
    const setCandidatField = (field: 'date_naissance' | 'lieu_naissance' | 'nip' | 'type_piece' | 'numero_piece' | 'nationalite' | 'genre', v: unknown) => {
      if (v != null && String(v).trim() !== '') dispatch({ type: 'SET_CANDIDAT_FIELD', field, value: String(v) });
    };
    const setPersonneField = (field: 'nom' | 'prenom' | 'email' | 'telephone' | 'adresse', v: unknown) => {
      if (v != null && String(v).trim() !== '') dispatch({ type: 'SET_PERSONNE', field, value: String(v) });
    };
    setCandidatField('date_naissance', candidat.date_naissance);
    setCandidatField('lieu_naissance', candidat.lieu_naissance);
    setCandidatField('nip', candidat.nip);
    setCandidatField('type_piece', candidat.type_piece);
    setCandidatField('numero_piece', candidat.numero_piece);
    setCandidatField('nationalite', candidat.nationalite);
    setCandidatField('genre', candidat.genre);
    setPersonneField('nom', personne.nom);
    setPersonneField('prenom', personne.prenom);
    setPersonneField('email', personne.email);
    setPersonneField('telephone', personne.contact);
    setPersonneField('adresse', personne.adresse);

    const numeroPermis = String(prefill.numero_permis ?? '').trim();
    const numeroOriginePermis = String(prefill.numero_origine_permis ?? '').trim();
    if (numeroPermis) {
      dispatch({ type: 'SET_PERMIS_FIELD', field: 'numero_permis', value: numeroPermis });
      setPermisVerified(true);
    }
    if (numeroOriginePermis) {
      dispatch({ type: 'SET_PERMIS_FIELD', field: 'numero_origine_permis', value: numeroOriginePermis });
    }

    if (prefill.auto_ecole_id) dispatch({ type: 'SET_AUTO_ECOLE', id: String(prefill.auto_ecole_id) });
    if (prefill.formation_id) dispatch({ type: 'SET_FORMATION', id: String(prefill.formation_id) });
    if (prefill.referenciel_id) dispatch({ type: 'SET_REFERENCIEL', id: String(prefill.referenciel_id) });
    if (prefill.province_id) dispatch({ type: 'SET_PROVINCE', id: String(prefill.province_id) });
    if (prefill.centre_id) dispatch({ type: 'SET_CENTRE', id: String(prefill.centre_id) });
    if (prefill.commentaires) dispatch({ type: 'SET_COMMENTAIRES', value: String(prefill.commentaires) });

    const dataCategorie = Array.isArray(prefill.data_categorie) ? (prefill.data_categorie as unknown[]) : [];
    const numeros = Array.from(
      new Set(
        dataCategorie
          .map((entry) => {
            if (typeof entry === 'string') {
              const raw = entry.trim();
              if (raw.startsWith('{') && raw.endsWith('}')) {
                try {
                  const parsed = JSON.parse(raw) as { codification_code?: string; numero_permis?: string; numero?: string };
                  return String(parsed.codification_code || parsed.numero_permis || parsed.numero || '').trim();
                } catch {
                  return raw;
                }
              }
              return raw;
            }
            if (entry && typeof entry === 'object') {
              const obj = entry as { codification_code?: string; numero_permis?: string; numero?: string };
              return String(obj.codification_code || obj.numero_permis || obj.numero || '').trim();
            }
            return '';
          })
          .filter(Boolean),
      ),
    );
    if (numeros.length > 0) setSelectedPermisNumbers(numeros);

    const dossierId = String(prefill.dossier_id ?? '').trim();
    if (dossierId) {
      setCreatedDossierId(dossierId);
      setIsEditingExistingDossier(true);
    }
    if (Array.isArray(prefill.documents)) setUploadedDocuments(prefill.documents as any[]);

    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  /** Depuis la liste on n’a parfois que l’id : complète le libellé type dès chargement des types. */
  useEffect(() => {
    if (!state.type_demande_id || state.type_demande_name || typesDemande.length === 0) return;
    const t = typesDemande.find((x) => x.id === state.type_demande_id);
    if (!t?.name) return;
    dispatch({
      type: 'SET_TYPE_DEMANDE',
      id: state.type_demande_id,
      name: t.name,
      is_nouveau_permis: isNouveauPermis(t.name),
    });
  }, [typesDemande, state.type_demande_id, state.type_demande_name]);

  /** Hydratation fiable des champs modifiables (GET /dossiers/:id) — aligné sur le corps attendu du PUT. */
  useEffect(() => {
    if (!createdDossierId || !isEditingExistingDossier) {
      editionHydratePreserveRef.current = {};
      setEditionHydrateError(null);
      setEditionHydrating(false);
      return;
    }
    let cancelled = false;
    setEditionHydrating(true);
    setEditionHydrateError(null);
    void demandeService
      .fetchDossierForEdition(createdDossierId)
      .then((flat: Record<string, unknown>) => {
        if (cancelled) return;
        editionHydratePreserveRef.current = demandeService.pickEditionPutPreserveFields(flat);

        const str = (v: unknown) =>
          v !== undefined && v !== null && String(v).trim() !== '' ? String(v).trim() : '';

        const typeId = str(flat.type_demande_id);
        const typeName = str(flat.type_demande_name);
        const tdIsNouveau = typeName ? isNouveauPermis(typeName) : false;
        if (typeId) {
          dispatch({
            type: 'SET_TYPE_DEMANDE',
            id: typeId,
            name: typeName,
            is_nouveau_permis: tdIsNouveau,
          });
        }

        const cid = str(flat.candidat_id);
        const candidat = (flat.candidat ?? {}) as Record<string, unknown>;
        const personne = (candidat.personne ?? {}) as Record<string, unknown>;
        const candDisplay =
          [str(personne.prenom), str(personne.nom)].filter(Boolean).join(' ').trim() || cid;
        if (cid) {
          dispatch({ type: 'SET_CANDIDAT_EXISTING', id: cid, display: candDisplay || cid });
        }

        const setCf = (field: 'date_naissance' | 'lieu_naissance' | 'nip' | 'type_piece' | 'numero_piece' | 'nationalite' | 'genre', v: unknown) => {
          const u = str(v);
          if (u) dispatch({ type: 'SET_CANDIDAT_FIELD', field, value: u });
        };
        const setPf = (field: 'nom' | 'prenom' | 'email' | 'telephone' | 'adresse', v: unknown) => {
          const u = str(v);
          if (u) dispatch({ type: 'SET_PERSONNE', field, value: u });
        };
        setCf('date_naissance', candidat.date_naissance);
        setCf('lieu_naissance', candidat.lieu_naissance);
        setCf('nip', candidat.nip);
        setCf('type_piece', candidat.type_piece);
        setCf('numero_piece', candidat.numero_piece);
        setCf('nationalite', candidat.nationalite);
        setCf('genre', candidat.genre);
        setPf('nom', personne.nom);
        setPf('prenom', personne.prenom);
        setPf('email', personne.email);
        setPf('telephone', personne.contact ?? personne.telephone);
        setPf('adresse', personne.adresse);

        const numeroPermisFlat = str(flat.numero_permis);
        if (numeroPermisFlat) {
          dispatch({
            type: 'SET_PERMIS_FIELD',
            field: 'numero_permis',
            value: numeroPermisFlat.replace(/-/g, '').toUpperCase(),
          });
        }
        const nog = str(flat.numero_origine_permis);
        if (nog) dispatch({ type: 'SET_PERMIS_FIELD', field: 'numero_origine_permis', value: nog });
        const lieuP = str(flat.lieu_de_dobtention_du_permis);
        if (lieuP) dispatch({ type: 'SET_PERMIS_FIELD', field: 'lieu_de_dobtention_du_permis', value: lieuP });
        const dob = flat.date_de_dobtention_du_permis ?? flat.date_dobtention_du_permis;
        if (dob) dispatch({ type: 'SET_PERMIS_FIELD', field: 'date_de_dobtention_du_permis', value: fmtDate(String(dob)) });
        const dval = flat.date_de_delivrance_du_permis ?? flat.date_delivrance_du_permis;
        if (dval) dispatch({ type: 'SET_PERMIS_FIELD', field: 'date_de_delivrance_du_permis', value: fmtDate(String(dval)) });

        const ae = str(flat.auto_ecole_id);
        if (ae) dispatch({ type: 'SET_AUTO_ECOLE', id: ae });
        const formId = str(flat.formation_id);
        if (formId) dispatch({ type: 'SET_FORMATION', id: formId });
        const refId = str(flat.referenciel_id) || str((flat as { referentiel_id?: unknown }).referentiel_id);
        if (refId) dispatch({ type: 'SET_REFERENCIEL', id: refId });

        const provId = str(flat.province_id);
        if (provId) dispatch({ type: 'SET_PROVINCE', id: provId });
        const centreFlat = str(flat.centre_id);
        if (centreFlat) dispatch({ type: 'SET_CENTRE', id: centreFlat });

        if (flat.commentaires != null) {
          dispatch({ type: 'SET_COMMENTAIRES', value: String(flat.commentaires) });
        }

        const dc = Array.isArray(flat.data_categorie) ? flat.data_categorie : [];
        const { numeros, meta } = extractNumerosEtMetaDepuisDataCategorie(dc as unknown[]);
        if (numeros.length > 0) {
          setSelectedPermisNumbers(numeros);
          setSelectedPermisMeta((prev) => ({ ...prev, ...meta }));
        }

        const tpCodeHydr = normalizeCategorie(String(flat._edition_type_permis_code ?? ''));
        const dcCatHydr = normalizeCategorie(String(flat._edition_data_categorie_categorie ?? ''));
        const fromNumHydr = normalizeCategorie(
          extractCategoriePermisDepuisNumeroPrincipal(numeroPermisFlat || numeros[0] || ''),
        );
        const categorieHydrateComposee = tpCodeHydr || dcCatHydr || fromNumHydr;

        setEditionRecapFromGet({
          categoriePermis: categorieHydrateComposee || undefined,
          autoEcoleLibelle: str(flat._edition_auto_ecole_nom) || undefined,
          formationLibelle: str(flat._edition_formation_resume) || undefined,
          referencielLibelle:
            str(flat._edition_referentiel_libelle) || str(flat._edition_referentiel_code) || undefined,
          provinceLibelle: str(flat._edition_province_libelle) || undefined,
          centreLibelle: str(flat._edition_centre_libelle) || undefined,
        });

        setDgdiStatus('bypass');
        setDgdiMessage('Données du dossier chargées depuis le serveur. Modifiez les champs puis enregistrez avec « Mettre à jour ».');

        const hasPermContext = tdIsNouveau || Boolean(numeroPermisFlat) || numeros.length > 0;
        setPermisVerified(hasPermContext);

        if (numeroPermisFlat || lieuP || dob || dval) {
          setPermisApiData({
            numero_permis: numeroPermisFlat,
            lieu_obtention: lieuP || undefined,
            date_obtention: dob ? String(dob) : undefined,
            date_validite: dval ? String(dval) : undefined,
            categorie: categorieHydrateComposee || undefined,
          });
        } else {
          setPermisApiData(null);
        }

        const nipPiece = str(candidat.numero_piece ?? flat.numero_piece);
        const rawTp = str(candidat.type_piece ?? flat.type_piece).toUpperCase();
        const dgdiType =
          rawTp.includes('PASS') ? 'Passeport'
          : rawTp.includes('SEJOUR') || rawTp.includes('SÉJOUR') ? 'Carte_sejour'
          : rawTp.includes('RESID') ? 'Carte_resident'
          : 'CNI';
        if (nipPiece || rawTp) {
          setTypePiece(dgdiType);
          if (nipPiece) setNumeroPieceInput(nipPiece);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setEditionHydrateError(e instanceof Error ? e.message : 'Impossible de charger le dossier.');
      })
      .finally(() => {
        if (!cancelled) setEditionHydrating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [createdDossierId, isEditingExistingDossier]);

  // ── load on mount : types de demande en priorité (indépendant des autres appels) ─
  useEffect(() => {
    let mounted = true;
    setLoadingTypes(true);
    demandeService
      .loadTypeDemandes()
      .then((types) => {
        if (mounted) setTypesDemande(types);
      })
      .catch((err) => {
        console.error('Erreur chargement types de demande:', err);
        if (mounted) setTypesDemande([]);
      })
      .finally(() => {
        if (mounted) setLoadingTypes(false);
      });

    void demandeService.loadReferentiels().then((refs) => {
      if (mounted) setReferentiels(refs);
    }).catch(() => { /* optionnel au montage */ });
    void demandeService.loadProvinces().then((provs) => {
      if (mounted) setProvinces(provs);
    }).catch(() => { /* optionnel au montage */ });
    void demandeService.loadAutoEcoles().then((aes) => {
      if (mounted) setAutoEcoles(aes);
    }).catch(() => { /* optionnel au montage */ });

    return () => {
      mounted = false;
    };
  }, []);

  /** Permis déjà vérifré (nouvelle demande ou renouvellement) : même règle CNEPC + formation + référentiel. Édition dossier GET : autorise aussi le chargement formations. */
  const needsCnepcAutoEcoleBloc =
    state.is_nouveau_permis || (!state.is_nouveau_permis && (permisVerified || editionUxUnlocked));

  useEffect(() => {
    if (!state.auto_ecole_id) { setFormations([]); return; }
    setLoadingFormations(true);
    demandeService.loadFormations(state.auto_ecole_id).then(setFormations).catch(console.error).finally(() => setLoadingFormations(false));
  }, [state.auto_ecole_id]);

  useEffect(() => {
    if (editionUxUnlocked) return;
    if (agentLieu.centre_id && state.centre_id !== agentLieu.centre_id) {
      dispatch({ type: 'SET_CENTRE', id: agentLieu.centre_id });
    }
    if (agentLieu.province_id && !state.province_id) {
      dispatch({ type: 'SET_PROVINCE', id: agentLieu.province_id });
    }
  }, [editionUxUnlocked, agentLieu.centre_id, agentLieu.province_id, state.centre_id, state.province_id]);

  useEffect(() => {
    if (state.referenciel_id || !inferredReferencielId) return;
    if (!needsCnepcAutoEcoleBloc) return;
    dispatch({ type: 'SET_REFERENCIEL', id: inferredReferencielId });
  }, [needsCnepcAutoEcoleBloc, state.referenciel_id, inferredReferencielId]);

  useEffect(() => {
    if (!needsCnepcAutoEcoleBloc || !state.auto_ecole_id || !formations.length || state.formation_id) return;
    const targetReferencielId = state.referenciel_id || inferredReferencielId;
    const selectedFormation = pickFormationPourPermisEtReferentiel(
      formations,
      targetReferencielId,
      principalPermisCategorie,
      referentiels,
    );
    if (selectedFormation?.id) {
      dispatch({ type: 'SET_FORMATION', id: selectedFormation.id });
    }
  }, [
    needsCnepcAutoEcoleBloc,
    state.auto_ecole_id,
    state.formation_id,
    state.referenciel_id,
    formations,
    referentiels,
    inferredReferencielId,
    principalPermisCategorie,
  ]);

  useEffect(() => {
    if (state.candidat_mode === 'create' && !state.personne.password) {
      const pwd = genPassword();
      dispatch({ type: 'SET_PERSONNE', field: 'password', value: pwd });
      dispatch({ type: 'SET_PERSONNE', field: 'password_confirmation', value: pwd });
    }
  }, [state.candidat_mode]); // eslint-disable-line

  // ── reset vérifications quand on change de type ────────────────────────────
  useEffect(() => {
    circuitLoadedTypeIdRef.current = null;
    cnepcSyncedPermisKeyRef.current = null;
    setDgdiStatus('idle'); setDgdiMessage('');
    setPermisVerified(false); setPermisError(''); setPermisApiData(null); setPermisIdentitySource(null);
    setPermisSuggestions([]); setSelectedPermisNumbers([]); setSelectedPermisMeta({});
    setManualPermisB({ numero_permis: '', date_obtention: '', date_validite: '', lieu_obtention: '' });
    setPermisParts(EMPTY_PARTS);
  }, [state.type_demande_id]);

  // ── auto-fill champs permis dossier (permis principal affiché) ────────────
  useEffect(() => {
    if (!permisApiData) return;
    const p = permisApiData;
    if (p.numero_permis) dispatch({ type: 'SET_PERMIS_FIELD', field: 'numero_permis', value: p.numero_permis });
    if (p.lieu_obtention) dispatch({ type: 'SET_PERMIS_FIELD', field: 'lieu_de_dobtention_du_permis', value: p.lieu_obtention });
    if (p.date_obtention) dispatch({ type: 'SET_PERMIS_FIELD', field: 'date_de_dobtention_du_permis', value: fmtDate(p.date_obtention) });
    if (p.date_validite) dispatch({ type: 'SET_PERMIS_FIELD', field: 'date_de_delivrance_du_permis', value: fmtDate(p.date_validite) });
  }, [permisApiData]); // eslint-disable-line

  // ── auto-fill compte candidat depuis un permis trouvé en base (pas le B manuel ni le seul principal) ──
  useEffect(() => {
    if (!permisIdentitySource) return;
    const p = permisIdentitySource;
    if (p.nom) dispatch({ type: 'SET_PERSONNE', field: 'nom', value: p.nom });
    if (p.prenom) dispatch({ type: 'SET_PERSONNE', field: 'prenom', value: p.prenom });
    if (p.date_naissance) dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'date_naissance', value: fmtDate(p.date_naissance) });
    if (p.lieu_naissance) dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'lieu_naissance', value: p.lieu_naissance });
    if (p.nationalite) dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'nationalite', value: p.nationalite });
    if (p.numero_identite) dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'numero_piece', value: p.numero_identite });
  }, [permisIdentitySource]); // eslint-disable-line

  // ── candidat search debounce ──────────────────────────────────────────────
  const handleCandidatSearch = useCallback((term: string) => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!term.trim()) { setCandidatResults([]); return; }
    searchRef.current = setTimeout(async () => {
      setSearchingCandidats(true);
      try { setCandidatResults(await demandeService.searchCandidats(term)); }
      catch { /* ignore */ }
      finally { setSearchingCandidats(false); }
    }, 400);
  }, []);

  // ── DGDI handler ──────────────────────────────────────────────────────────
  const syncDgdiPieceToCandidat = useCallback((tp: string, num: string) => {
    const numero = num.trim();
    if (!numero) return;
    dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'type_piece', value: dgdiTypeToCandidatType(tp) });
    dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'numero_piece', value: numero });
  }, []);

  const handleVerifyDgdi = useCallback(async () => {
    let numero = numeroPieceInput.trim();
    if (!numero) return;
    if (typePiece === 'Passeport') {
      numero = numero.replace(/^(\d{2})([a-zA-Z]{2})(\d{5})$/, (_, a, b, c) => a + b.toUpperCase() + c);
      if (!REGEX_PASSEPORT.test(numero)) {
        setDgdiStatus('error');
        setDgdiMessage('Format passeport invalide (ex: 25PP15842 — 2 chiffres, 2 lettres, 5 chiffres).');
        return;
      }
      setNumeroPieceInput(numero);
    }
    setDgdiVerifying(true); setDgdiStatus('idle'); setDgdiMessage('');
    try {
      const res = await demandeService.verifyDgdi(typePiece, numero);
      setDgdiStatus(res.status);
      setDgdiMessage(res.message);
      const verifiedNumero = (res.numero_piece ?? numero).trim();
      const shouldSyncToCandidat =
        (res.status === 'ok' && Boolean(verifiedNumero)) ||
        (res.status === 'bypass' &&
          Boolean(verifiedNumero) &&
          (res.pieceValide || Boolean(res.isTimeoutBypass)) &&
          isDgdiPieceFormatValid(typePiece, verifiedNumero));
      if (shouldSyncToCandidat && verifiedNumero) {
        syncDgdiPieceToCandidat(typePiece, verifiedNumero);
      }
    } catch (err) {
      setDgdiStatus('error');
      setDgdiMessage(err instanceof Error ? err.message : 'Erreur DGDI.');
    } finally { setDgdiVerifying(false); }
  }, [typePiece, numeroPieceInput, syncDgdiPieceToCandidat]);

  // ── Permis handlers ───────────────────────────────────────────────────────
  const numPermisComplet = buildNumeroPermis(permisParts, permisFormat);

  const handleVerifyPermisNumero = useCallback(async () => {
    if (!numPermisComplet) return;
    setVerifyingPermis(true); setPermisError(''); setPermisVerified(false); setPermisApiData(null); setPermisIdentitySource(null); setPermisSuggestions([]);
    setSelectedPermisNumbers([]); setSelectedPermisMeta({});
    setManualPermisB({ numero_permis: '', date_obtention: '', date_validite: '', lieu_obtention: '' });
    try {
      const data = await demandeService.verifyPermisParNumero(numPermisComplet);
      if (!data) {
        setPermisError('Permis non trouvé dans la base. Vérifiez le numéro ou utilisez la recherche par identité.');
        return;
      }

      const nom = String(data.nom ?? '').trim();
      const prenom = String(data.prenom ?? '').trim();
      const dateNaissance = fmtDate(typeof data.date_naissance === 'string' ? data.date_naissance : '');

      let parIdentite: PermisApiData[] = [];
      if (nom || prenom || dateNaissance) {
        try {
          parIdentite = await demandeService.searchPermisParIdentite(nom, prenom, dateNaissance);
        } catch {
          parIdentite = [];
        }
      }

      const merged = new Map<string, PermisApiData>();
      const pushPermis = (p: PermisApiData) => {
        const k = normalizeNumeroPermisKey(p.numero_permis);
        if (!k) return;
        if (!merged.has(k)) merged.set(k, p);
      };
      for (const p of parIdentite) pushPermis(p);
      pushPermis(data);

      const liste = Array.from(merged.values());
      setPermisSuggestions(liste);
    } catch (err) { setPermisError(err instanceof Error ? err.message : 'Erreur de vérification.'); }
    finally { setVerifyingPermis(false); }
  }, [numPermisComplet]);

  const handleVerifyPermisIdentite = useCallback(async () => {
    if (!identityForm.nom && !identityForm.prenom && !identityForm.dateNaissance) return;
    setVerifyingPermis(true); setPermisError(''); setPermisVerified(false); setPermisApiData(null); setPermisIdentitySource(null); setPermisSuggestions([]);
    setManualPermisB({ numero_permis: '', date_obtention: '', date_validite: '', lieu_obtention: '' });
    try {
      const data = await demandeService.searchPermisParIdentite(identityForm.nom, identityForm.prenom, identityForm.dateNaissance);
      if (data.length > 0) { setPermisSuggestions(data); setSelectedPermisNumbers([]); setSelectedPermisMeta({}); }
      else { setPermisError('Aucun permis trouvé avec ces critères.'); }
    } catch (err) { setPermisError(err instanceof Error ? err.message : 'Erreur de vérification.'); }
    finally { setVerifyingPermis(false); }
  }, [identityForm]);

  const handleSelectPermisSuggestion = useCallback((p: PermisApiData) => {
    setPermisApiData(p);
    setPermisVerified(true);
    setPermisError('');
  }, []);

  /** Renouvellement / duplicata : CNEPC + formation (deps vides + refs pour éviter boucle infinie d’API). */
  const applyCnepcTrainingDefaults = useCallback(async (principal: PermisApiData) => {
    const demandeState = demandeStateRef.current;
    if (demandeState.is_nouveau_permis || applyingCnepcTrainingRef.current) return;

    const permisKey = String(principal.numero_permis ?? '').trim();
    if (!permisKey) return;
    if (cnepcSyncedPermisKeyRef.current === permisKey) return;

    const cat =
      normalizeCategorie(principal.categorie) ||
      extractCategoriePermisDepuisNumeroPrincipal(principal.numero_permis) ||
      extractCategoriePermisDepuisNumeroPrincipal(demandeState.permis.numero_permis);
    if (!cat) return;

    applyingCnepcTrainingRef.current = true;
    try {
      let refs = referentielsRef.current;
      if (!refs.length) {
        try {
          refs = await demandeService.loadReferentiels();
          if (refs.length) {
            referentielsRef.current = refs;
            setReferentiels(refs);
          }
        } catch {
          /* ignore */
        }
      }

      const refId = resolveReferencielIdFromCategorie(refs, cat);
      if (refId && refId !== demandeStateRef.current.referenciel_id) {
        dispatch({ type: 'SET_REFERENCIEL', id: refId });
      }

      let aes = autoEcolesRef.current;
      let cnepc = findCnepcAutoEcole(aes);
      let forms = formationsRef.current;

      try {
        const cnepcBundle = await demandeService.loadCnepcAutoEcoleWithFormations();
        if (cnepcBundle?.autoEcole?.id) {
          cnepc = {
            id: cnepcBundle.autoEcole.id,
            nom_auto_ecole: cnepcBundle.autoEcole.nom_auto_ecole,
          };
          if (!aes.some((a) => a.id === cnepc!.id)) {
            aes = [...aes, cnepc];
            autoEcolesRef.current = aes;
            setAutoEcoles(aes);
          }
          if (cnepcBundle.formations.length) {
            forms = cnepcBundle.formations.map((f) => ({
              id: f.id,
              type_permis_id: f.type_permis_id,
              type_permis: f.type_permis
                ? {
                    id: f.type_permis.id,
                    code: f.type_permis.code,
                    libelle: f.type_permis.libelle,
                  }
                : undefined,
              montant: f.montant,
              statut: f.statut,
            }));
            formationsRef.current = forms;
            setFormations(forms);
          }
        }
      } catch {
        /* fallback ci-dessous */
      }

      if (!cnepc?.id) {
        try {
          const cnepcLite = await demandeService.findCnepcAutoEcole();
          if (cnepcLite) {
            cnepc = cnepcLite;
            if (!aes.some((a) => a.id === cnepcLite.id)) {
              aes = [...aes, cnepcLite];
              autoEcolesRef.current = aes;
              setAutoEcoles(aes);
            }
          }
        } catch {
          /* ignore */
        }
      }

      if (!cnepc?.id && !aes.length) {
        try {
          aes = await demandeService.loadAutoEcoles();
          if (aes.length) {
            autoEcolesRef.current = aes;
            setAutoEcoles(aes);
            cnepc = findCnepcAutoEcole(aes);
          }
        } catch {
          /* ignore */
        }
      }

      if (!cnepc?.id) {
        console.warn('Auto-école CNEPC introuvable.', aes.map((a) => a.nom_auto_ecole));
        return;
      }

      const currentAe = demandeStateRef.current.auto_ecole_id;
      if (currentAe !== cnepc.id) {
        dispatch({ type: 'SET_AUTO_ECOLE', id: cnepc.id });
      }
      if (!forms.length) {
        try {
          forms = await demandeService.loadFormations(cnepc.id);
          formationsRef.current = forms;
          setFormations(forms);
        } catch (err) {
          console.error('Erreur chargement formations CNEPC:', err);
          return;
        }
      }

      const targetRefId = refId || demandeStateRef.current.referenciel_id;
      const formation = pickFormationPourPermisEtReferentiel(forms, targetRefId, cat, refs);
      if (formation?.id && formation.id !== demandeStateRef.current.formation_id) {
        dispatch({ type: 'SET_FORMATION', id: formation.id });
      }

      if (refId && cnepc.id && formation?.id) {
        cnepcSyncedPermisKeyRef.current = permisKey;
      }
    } finally {
      applyingCnepcTrainingRef.current = false;
    }
  }, []);

  const applyCnepcTrainingRef = useRef(applyCnepcTrainingDefaults);
  applyCnepcTrainingRef.current = applyCnepcTrainingDefaults;

  /** Relance unique si les listes arrivent après la confirmation du permis (sans dépendre du callback). */
  const listsLengthsRef = useRef({ refs: 0, aes: 0 });
  useEffect(() => {
    if (state.is_nouveau_permis || !permisVerified || !permisApiData) return;
    const permisKey = String(permisApiData.numero_permis ?? '').trim();
    if (!permisKey || cnepcSyncedPermisKeyRef.current === permisKey) return;

    const refsLen = referentiels.length;
    const aesLen = autoEcoles.length;
    const listsGrew =
      (refsLen > 0 && listsLengthsRef.current.refs === 0) ||
      (aesLen > 0 && listsLengthsRef.current.aes === 0);
    listsLengthsRef.current = { refs: refsLen, aes: aesLen };

    if (!listsGrew && (refsLen === 0 || aesLen === 0)) return;
    void applyCnepcTrainingRef.current(permisApiData);
  }, [state.is_nouveau_permis, permisVerified, permisApiData, referentiels.length, autoEcoles.length]);

  const togglePermisSelection = useCallback((numeroPermis: string) => {
    setSelectedPermisNumbers((prev) => {
      const next = prev.includes(numeroPermis) ? prev.filter((n) => n !== numeroPermis) : [...prev, numeroPermis];
      if (!prev.includes(numeroPermis)) {
        const p = permisSuggestions.find((x) => x.numero_permis === numeroPermis);
        if (p) {
          setSelectedPermisMeta((m) => ({
            ...m,
            [numeroPermis]: {
              date_obtention: m[numeroPermis]?.date_obtention ?? fmtDate(typeof p.date_obtention === 'string' ? p.date_obtention : ''),
              date_validite: fmtDate(typeof p.date_validite === 'string' ? p.date_validite : ''),
              lieu_obtention: String(p.lieu_obtention ?? ''),
            },
          }));
        }
      }
      return next;
    });
  }, []);

  const updatePermisMeta = useCallback((numeroPermis: string, field: 'date_obtention' | 'date_validite' | 'lieu_obtention', value: string) => {
    setSelectedPermisMeta((prev) => ({
      ...prev,
      [numeroPermis]: {
        date_obtention: prev[numeroPermis]?.date_obtention ?? '',
        date_validite: prev[numeroPermis]?.date_validite ?? '',
        lieu_obtention: prev[numeroPermis]?.lieu_obtention ?? '',
        [field]: value,
      },
    }));
  }, []);

  const selectedPermisFromIdentity = useMemo(
    () => permisSuggestions.filter((p) => selectedPermisNumbers.includes(p.numero_permis)),
    [permisSuggestions, selectedPermisNumbers],
  );
  const selectedCategoriesForIdentity = useMemo(
    () => selectedPermisFromIdentity.map((p) => normalizeCategorie(p.categorie)),
    [selectedPermisFromIdentity],
  );
  const selectedNeedB = useMemo(
    () => requiresPermisB(selectedCategoriesForIdentity),
    [selectedCategoriesForIdentity],
  );
  const selectedHasB = useMemo(
    () => selectedPermisFromIdentity.some((p) => normalizeCategorie(p.categorie).startsWith('B')),
    [selectedPermisFromIdentity],
  );
  const manualPermisBComplete = useMemo(
    () =>
      Boolean(
        manualPermisB.numero_permis.trim() &&
        manualPermisB.date_obtention &&
        manualPermisB.date_validite &&
        manualPermisB.lieu_obtention.trim(),
      ),
    [manualPermisB],
  );
  /** Période complète pour chaque permis coché (saisie ou API), alignée sur la validation à l’envoi du dossier. */
  const selectedPermisPeriodComplete = useMemo(() => {
    if (selectedPermisNumbers.length === 0) return false;
    for (const numSel of selectedPermisNumbers) {
      const p = findPermisSuggestionParNumero(numSel, permisSuggestions);
      if (!p) return false;
      const meta = selectedPermisMetaPourNumero(numSel, selectedPermisMeta);
      const debut =
        String(meta?.date_obtention ?? '').trim() ||
        (typeof p.date_obtention === 'string' ? fmtDate(p.date_obtention) : '').trim();
      const fin =
        String(meta?.date_validite ?? '').trim() ||
        (typeof p.date_validite === 'string' ? fmtDate(p.date_validite) : '').trim();
      if (!debut || !fin) return false;
    }
    return true;
  }, [selectedPermisNumbers, permisSuggestions, selectedPermisMeta]);
  const selectedTypeDemande = typesDemande.find((td) => td.id === state.type_demande_id);
  const selectedTypeDemandeKey = normalizeEntityKey(selectedTypeDemande?.code || selectedTypeDemande?.name || state.type_demande_name);
  const requiresNumeroOriginePermis =
    selectedTypeDemandeKey === 'DUPLICATAFICHEENREGISTREMENT' ||
    selectedTypeDemandeKey === 'FICHEENREGISTREMENT';

  const handleConfirmPermisSelection = useCallback(() => {
    if (selectedPermisNumbers.length === 0) return;
    const selectedFromApi = permisSuggestions.filter((p) => selectedPermisNumbers.includes(p.numero_permis));
    if (selectedFromApi.length === 0) return;
    const selected: PermisApiData[] = [...selectedFromApi];
    const categories = selected.map((p) => normalizeCategorie(p.categorie));
    const needB = requiresPermisB(categories);
    const permisB = selected.find((p) => normalizeCategorie(p.categorie).startsWith('B'));

    if (needB && !permisB) {
      if (!manualPermisBComplete) {
        setPermisError('Un permis B est obligatoire: veuillez le renseigner manuellement ci-dessous.');
        setPermisVerified(false);
        return;
      }
      selected.push({
        numero_permis: manualPermisB.numero_permis.trim(),
        categorie: 'B',
        lieu_obtention: manualPermisB.lieu_obtention.trim(),
        date_obtention: manualPermisB.date_obtention,
        date_validite: manualPermisB.date_validite,
      });
    }

    setPermisIdentitySource(pickPermisIdentityFromApiSelection(selectedFromApi, permisSuggestions));
    const principal = pickPrincipalPermisForType(selected, { requiresOriginePattern: requiresNumeroOriginePermis });
    handleSelectPermisSuggestion(principal);
    void applyCnepcTrainingDefaults(principal);
  }, [
    selectedPermisNumbers,
    permisSuggestions,
    handleSelectPermisSuggestion,
    manualPermisB,
    manualPermisBComplete,
    requiresNumeroOriginePermis,
    applyCnepcTrainingDefaults,
  ]);

  const handleNouvelleRecherchePermis = useCallback(() => {
    cnepcSyncedPermisKeyRef.current = null;
    setPermisVerified(false);
    setPermisError('');
    setPermisApiData(null);
    setPermisIdentitySource(null);
    setPermisSuggestions([]);
    setSelectedPermisNumbers([]);
    setSelectedPermisMeta({});
    setManualPermisB({ numero_permis: '', date_obtention: '', date_validite: '', lieu_obtention: '' });
  }, []);

  // ── Section completion ─────────────────────────────────────────────────────
  const dgdiOk = dgdiStatus === 'ok' || dgdiStatus === 'bypass';
  /** En édition dossier (GET) on affiche quand même le bloc permis sans refaire DGDI. */
  const dgdiEffectiveOk = dgdiOk || editionUxUnlocked;
  const c1 = !!state.type_demande_id;
  const hasCreateCandidateData = !!(
    state.personne.nom &&
    state.personne.prenom &&
    state.personne.adresse &&
    state.candidat.date_naissance &&
    state.candidat.genre
  );
  const c2 = !!state.candidat_id || hasCreateCandidateData;
  const hasNumeroOriginePermis = !requiresNumeroOriginePermis || Boolean(state.permis.numero_origine_permis.trim());
  const hasRenewalPermisContext =
    permisVerified ||
    selectedPermisNumbers.length > 0 ||
    Boolean(state.permis.numero_permis.trim());
  const c3 = state.is_nouveau_permis
    ? !!(state.auto_ecole_id && state.formation_id)
    : (hasRenewalPermisContext || editionUxUnlocked) &&
      !!(state.auto_ecole_id && state.formation_id && state.referenciel_id) &&
      hasNumeroOriginePermis;
  const completedCount = [c1, c2, c3].filter(Boolean).length;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitError(null); setSubmitting(true);
    try {
      const shouldCreateCandidate = !state.candidat_id && hasCreateCandidateData;
      /** Parcourt les coches dans l’ordre et retrouve chaque ligne API par numéro (clé normalisée). */
      const mappedSelectedPermisData: Array<PermisApiData | null> = selectedPermisNumbers
        .map((numSel): PermisApiData | null => {
          const p = findPermisSuggestionParNumero(numSel, permisSuggestions);
          if (!p) return null;
          const meta = selectedPermisMetaPourNumero(numSel, selectedPermisMeta);
          return {
            ...p,
            date_obtention:
              meta?.date_obtention ||
              (typeof p.date_obtention === 'string' ? p.date_obtention : '') ||
              state.permis.date_de_dobtention_du_permis,
            date_validite:
              meta?.date_validite ||
              (typeof p.date_validite === 'string' ? p.date_validite : '') ||
              state.permis.date_de_delivrance_du_permis,
            lieu_obtention:
              meta?.lieu_obtention ||
              String(p.lieu_obtention ?? '') ||
              state.permis.lieu_de_dobtention_du_permis,
          };
        });
      let selectedPermisData: PermisApiData[] = mappedSelectedPermisData.filter((row): row is PermisApiData => row != null);
      if (!state.is_nouveau_permis && selectedPermisData.length === 0 && permisApiData?.numero_permis) {
        selectedPermisData = [{
          ...permisApiData,
          numero_permis: permisApiData.numero_permis,
          date_obtention: typeof permisApiData.date_obtention === 'string' ? permisApiData.date_obtention : '',
          date_validite: typeof permisApiData.date_validite === 'string' ? permisApiData.date_validite : '',
          lieu_obtention: String(permisApiData.lieu_obtention ?? ''),
        }];
      }
      if (
        !state.is_nouveau_permis &&
        selectedPermisData.length === 0 &&
        selectedPermisNumbers.length > 0 &&
        isEditingExistingDossier
      ) {
        selectedPermisData = selectedPermisNumbers.map((num) => {
          const meta = selectedPermisMetaPourNumero(num, selectedPermisMeta);
          return {
            numero_permis: num,
            categorie: '',
            lieu_obtention:
              meta?.lieu_obtention || state.permis.lieu_de_dobtention_du_permis,
            date_obtention:
              meta?.date_obtention || state.permis.date_de_dobtention_du_permis,
            date_validite:
              meta?.date_validite || state.permis.date_de_delivrance_du_permis,
          };
        });
      }
      const selectedCategories = selectedPermisData.map((p) => normalizeCategorie(p.categorie));
      const needB = requiresPermisB(selectedCategories);
      const hasB = selectedPermisData.some((p) => normalizeCategorie(p.categorie).startsWith('B'));
      if (needB && !hasB) {
        if (!manualPermisBComplete) {
          throw new Error('Un permis B est obligatoire quand des permis C, D, E ou F sont selectionnes. Veuillez renseigner le permis B.');
        }
        selectedPermisData = [
          ...selectedPermisData,
          {
            numero_permis: manualPermisB.numero_permis.trim(),
            categorie: 'B',
            lieu_obtention: manualPermisB.lieu_obtention.trim(),
            date_obtention: manualPermisB.date_obtention,
            date_validite: manualPermisB.date_validite,
          },
        ];
      }
      selectedPermisData = [...selectedPermisData].sort((a, b) => {
        const pa = getPermisCategoryPriority(a.categorie);
        const pb = getPermisCategoryPriority(b.categorie);
        const sa = pa < 0 ? 999 : pa;
        const sb = pb < 0 ? 999 : pb;
        return sa - sb;
      });
      const missingDates = selectedPermisData
        .filter((p) => {
          const hasDebut = String(p.date_obtention ?? '').trim().length > 0;
          const hasFin = String(p.date_validite ?? '').trim().length > 0;
          return !hasDebut || !hasFin;
        })
        .map((p) => ({
          numero: String(p.numero_permis ?? ''),
          categorie: normalizeCategorie(p.categorie),
          missingDebut: String(p.date_obtention ?? '').trim().length === 0,
          missingFin: String(p.date_validite ?? '').trim().length === 0,
        }));
      if (missingDates.length > 0) {
        const details = missingDates
          .map((m) => {
            const champs = [
              m.missingDebut ? 'date_obtention (valable_du)' : null,
              m.missingFin ? 'date_validite (jusqu_au)' : null,
            ].filter(Boolean).join(' et ');
            return `${m.numero || 'permis sans numéro'}${m.categorie ? ` [${m.categorie}]` : ''}: ${champs}`;
          })
          .join(' ; ');
        throw new Error(
          `Dates obligatoires manquantes pour les permis sélectionnés: ${details}. Veuillez renseigner les champs de période de validité.`,
        );
      }
      const principalSelectedPermis = selectedPermisData.length > 0
        ? pickPrincipalPermisForType(selectedPermisData, { requiresOriginePattern: requiresNumeroOriginePermis })
        : null;
      const finalReferencielId =
        resolveReferencielIdFromCategorie(referentiels, principalSelectedPermis?.categorie) || state.referenciel_id;
      if (!finalReferencielId) {
        throw new Error('Référentiel introuvable: veuillez sélectionner un permis principal valide pour alimenter referenciel_id.');
      }
      if (requiresNumeroOriginePermis && !state.permis.numero_origine_permis.trim()) {
        throw new Error('Le numéro du permis d’origine est obligatoire pour ce type de demande.');
      }
      const payloadState = {
        ...state,
        candidat_mode: shouldCreateCandidate ? 'create' : state.candidat_mode,
        referenciel_id: finalReferencielId,
        selected_permis_data: selectedPermisData,
      } as typeof state & { selected_permis_data: PermisApiData[] };

      if (isEditingExistingDossier && createdDossierId) {
        await demandeService.submitDemandeUpdate(
          createdDossierId,
          payloadState,
          editionHydratePreserveRef.current,
        );
        setSubmitSuccess(`Dossier mis à jour avec succès (ID : ${createdDossierId}).`);
      } else {
        const { dossierId } = await demandeService.submitDemande(payloadState);
        setSubmitSuccess(`Dossier créé avec succès${dossierId ? ` (ID : ${dossierId})` : ''}.`);
        setCreatedDossierId(dossierId || '');
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : isEditingExistingDossier && createdDossierId
            ? 'Erreur lors de la mise à jour du dossier.'
            : 'Erreur lors de la création du dossier.',
      );
    } finally { setSubmitting(false); }
  };

  useEffect(() => {
    if (!createdDossierId) {
      setUploadedDocuments([]);
      return;
    }
    let mounted = true;
    const fetchDocuments = async () => {
      setLoadingUploadedDocuments(true);
      try {
        const resp = await axiosClient.get('/documents', { params: { documentable_id: createdDossierId } });
        const raw = Array.isArray(resp.data?.data) ? resp.data.data : Array.isArray(resp.data) ? resp.data : [];
        const docs = documentsScopedToDossier(raw, createdDossierId);
        if (mounted) setUploadedDocuments(docs);
      } catch {
        if (mounted) setUploadedDocuments([]);
      } finally {
        if (mounted) setLoadingUploadedDocuments(false);
      }
    };
    void fetchDocuments();
    return () => {
      mounted = false;
    };
  }, [createdDossierId]);

  /** Synchronise statut / code_paiement après création ou action paiement (même source que la réception). */
  useEffect(() => {
    if (!createdDossierId) {
      setDossierPaiementSnap({});
      return;
    }
    let mounted = true;
    const loadDossierPaiementFields = async () => {
      try {
        const res = await axiosClient.get(`/dossiers/${createdDossierId}`);
        const d = (res.data?.data ?? res.data) as Record<string, unknown> | null;
        if (!mounted || !d) return;
        const attrs = d.attributes as Record<string, unknown> | undefined;
        const code =
          (d.code_paiement as string | undefined)?.trim() ||
          (attrs?.code_paiement as string | undefined)?.trim() ||
          '';
        setDossierPaiementSnap({
          statut: String(d.statut ?? ''),
          code_paiement: code || null,
        });
      } catch {
        if (mounted) setDossierPaiementSnap({});
      }
    };
    void loadDossierPaiementFields();
    return () => {
      mounted = false;
    };
  }, [createdDossierId]);

  useEffect(() => {
    setPaiementVerifie(false);
    setReferencePaiement('');
    setSentToCNEDDT(false);
    if (!createdDossierId) return;
    try {
      if (localStorage.getItem(`cneddt_sent_${createdDossierId}`) === 'true') {
        setSentToCNEDDT(true);
      }
    } catch {
      /* ignore */
    }
  }, [createdDossierId]);

  /** Pré-remplir le code comme en réception quand le dossier est en phase paiement. */
  useEffect(() => {
    const code = (dossierPaiementSnap.code_paiement ?? '').toString().trim();
    const statut = (dossierPaiementSnap.statut ?? '').toUpperCase();
    const phase = statut === 'EN_ATTENTE_PAIEMENT' || Boolean(code);
    if (phase && code) setReferencePaiement(code);
  }, [dossierPaiementSnap.code_paiement, dossierPaiementSnap.statut]);

  /** Aligné sur update après transfert : `DOSSIER ENVOYER`, etc. */
  useEffect(() => {
    const st = String(dossierPaiementSnap.statut ?? '')
      .toUpperCase()
      .replace(/\s+/g, '');
    if (st.includes('DOSSIERENVOY')) setSentToCNEDDT(true);
  }, [dossierPaiementSnap.statut]);

  const refreshUploadedDocuments = useCallback(async () => {
    if (!createdDossierId) return;
    setLoadingUploadedDocuments(true);
    try {
      const resp = await axiosClient.get('/documents', { params: { documentable_id: createdDossierId } });
      const raw = Array.isArray(resp.data?.data) ? resp.data.data : Array.isArray(resp.data) ? resp.data : [];
      setUploadedDocuments(documentsScopedToDossier(raw, createdDossierId));
    } catch {
      setUploadedDocuments([]);
    } finally {
      setLoadingUploadedDocuments(false);
    }
  }, [createdDossierId]);

  const handleUploadForPiece = useCallback(
    async (pieceRow: ExpectedPieceItem, event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files?.length || !createdDossierId) return;
      const file = files[0];
      const maxSize = 5 * 1024 * 1024;
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (file.size > maxSize) {
        setUploadFeedback('Le fichier ne doit pas dépasser 5 MB.');
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        setUploadFeedback('Format non autorisé. Utilisez PDF, JPG ou PNG.');
        return;
      }
      const label = pieceRow.libelle;
      setUploadingPieceId(pieceRow.id);
      setUploadFeedback(null);
      try {
        const formData = new FormData();
        formData.append('documentable_id', createdDossierId);
        formData.append('documentable_type', 'App\\Models\\Dossier');
        formData.append('piece_justification_id', pieceRow.pieceJustificationUploadId);
        formData.append('valide', '0');
        formData.append('commentaires', '');
        formData.append('fichier', file, file.name.trim());
        await axiosClient.post('/documents', formData, {
          timeout: 300000,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setUploadFeedback(`${label} téléversé avec succès.`);
        await refreshUploadedDocuments();
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Erreur lors du téléversement.';
        setUploadFeedback(msg);
      } finally {
        setUploadingPieceId(null);
        if (event.target) event.target.value = '';
      }
    },
    [createdDossierId, refreshUploadedDocuments],
  );

  const handleMettreEnAttentePaiement = useCallback(async () => {
    if (!createdDossierId || !paiementEtapeCircuit) return;
    setSettingAttentePaiement(true);
    setPaiementFeedback(null);
    try {
      await circuitSuiviService.updateDossierStatut(createdDossierId, 'EN_ATTENTE_PAIEMENT');
      const res = await axiosClient.get(`/dossiers/${createdDossierId}`);
      const d = (res.data?.data ?? res.data) as Record<string, unknown> | null;
      if (d) {
        const attrs = d.attributes as Record<string, unknown> | undefined;
        const code =
          (d.code_paiement as string | undefined)?.trim() ||
          (attrs?.code_paiement as string | undefined)?.trim() ||
          '';
        setDossierPaiementSnap({
          statut: String(d.statut ?? ''),
          code_paiement: code || null,
        });
      }
      setPaiementFeedback('Statut du dossier mis à jour : En attente de paiement.');
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setPaiementFeedback(ax?.response?.data?.message ?? ax?.message ?? 'Erreur lors de la mise à jour du statut.');
    } finally {
      setSettingAttentePaiement(false);
    }
  }, [createdDossierId, paiementEtapeCircuit]);

  const canBypassVerifPaiementDev =
    String(user?.email ?? '')
      .toLowerCase()
      .trim() === EMAIL_BYPASS_VERIF_PAIEMENT;

  const handleBypassVerifPaiementDev = useCallback(() => {
    if (!createdDossierId || !canBypassVerifPaiementDev) return;
    setPaiementVerifie(true);
    setPaiementFeedback('Vérification du paiement contournée (compte technique).');
  }, [createdDossierId, canBypassVerifPaiementDev]);

  const handleVerifierPaiement = useCallback(async () => {
    const ref = referencePaiement.trim();
    if (!createdDossierId) return;
    if (!ref) {
      setPaiementFeedback('Veuillez saisir un code de paiement.');
      return;
    }
    setVerifyingPaiement(true);
    setPaiementFeedback(null);
    try {
      const checkResponse = await axiosClient.get(`/dossiers/${createdDossierId}/check-paiement`, { params: { code: ref } });
      const body = checkResponse.data as { data?: { paid?: boolean; message?: string }; paid?: boolean; message?: string };
      const paid = body?.data?.paid ?? body?.paid ?? false;
      if (paid) {
        setPaiementVerifie(true);
        setPaiementFeedback('Paiement vérifié. Vous pouvez poursuivre le traitement du dossier.');
      } else {
        setPaiementFeedback(body?.data?.message ?? body?.message ?? 'Paiement en attente de validation.');
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setPaiementFeedback(ax?.response?.data?.message ?? ax?.message ?? 'Erreur lors de la vérification du paiement.');
    } finally {
      setVerifyingPaiement(false);
    }
  }, [referencePaiement, createdDossierId]);

  const dossierLockedAfterCreation = Boolean(createdDossierId) && !isEditingExistingDossier;
  const canSubmit = c1 && c2 && c3 && !submitting && !dossierLockedAfterCreation;
  const canEditCandidat = c1;
  const canEditCandidateAccount =
    c1 &&
    (state.is_nouveau_permis ? c3 || editionUxUnlocked : permisVerified || editionUxUnlocked);
  const canEditSection3 = c1;
  const renewalFinalisationUnlocked =
    !state.is_nouveau_permis &&
    (hasRenewalPermisContext || editionUxUnlocked) &&
    hasNumeroOriginePermis;
  const canEditFinalisation =
    c1 &&
    c2 &&
    (state.is_nouveau_permis ? c3 || editionUxUnlocked : renewalFinalisationUnlocked);
  const showManualTrainingInFinalisation =
    canEditFinalisation &&
    !state.is_nouveau_permis &&
    !(state.auto_ecole_id && state.formation_id && state.referenciel_id);

  useEffect(() => {
    if (!showManualTrainingInFinalisation) return;
    let cancelled = false;
    setLoadingAutoEcolesManual(true);
    setAutoEcolesManualError(null);
    void demandeService
      .loadAutoEcoles()
      .then((aes) => {
        if (cancelled) return;
        if (aes.length) {
          autoEcolesRef.current = aes;
          setAutoEcoles(aes);
        } else {
          setAutoEcolesManualError('Aucune auto-école retournée par le serveur.');
        }
      })
      .catch((err) => {
        console.error('Erreur chargement auto-écoles (finalisation):', err);
        if (!cancelled) {
          setAutoEcolesManualError('Impossible de charger la liste des auto-écoles (/auto-ecoles).');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAutoEcolesManual(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showManualTrainingInFinalisation]);

  const manualTrainingBlocForFinalisation = useMemo(
    () =>
      showManualTrainingInFinalisation
        ? {
            autoEcoles,
            formations,
            referentiels,
            autoEcoleId: state.auto_ecole_id,
            formationId: state.formation_id,
            referencielId: state.referenciel_id,
            loadingAutoEcoles: loadingAutoEcolesManual,
            loadingFormations,
            loadError: autoEcolesManualError,
            onAutoEcoleChange: (id: string) => dispatch({ type: 'SET_AUTO_ECOLE', id }),
            onFormationChange: (id: string) => dispatch({ type: 'SET_FORMATION', id }),
            onReferencielChange: (id: string) => dispatch({ type: 'SET_REFERENCIEL', id }),
          }
        : undefined,
    [
      showManualTrainingInFinalisation,
      autoEcoles,
      formations,
      referentiels,
      state.auto_ecole_id,
      state.formation_id,
      state.referenciel_id,
      loadingAutoEcolesManual,
      loadingFormations,
      autoEcolesManualError,
    ],
  );

  const finalisationBlockedHint =
    canEditFinalisation
      ? undefined
      : !c1 || !c2
        ? undefined
        : state.is_nouveau_permis
          ? 'Terminez d\'abord la section « Auto-école et formation ».'
          : !permisVerified && !editionUxUnlocked
            ? 'Terminez d\'abord la section « Vérification du permis de conduire ».'
            : !hasNumeroOriginePermis && requiresNumeroOriginePermis
              ? 'Renseignez le numéro de permis d\'origine.'
              : undefined;
  const candidatLabel = (c: CandidatItem) =>
    [c.personne?.prenom, c.personne?.nom].filter(Boolean).join(' ') || c.numero_candidat || c.id;
  const provinceName = (id: string) =>
    provinces.find((p) => p.id === id)?.libelle ?? provinces.find((p) => p.id === id)?.nom ?? id;
  const selectedAutoEcoleName = autoEcoles.find((ae) => ae.id === state.auto_ecole_id)?.nom_auto_ecole;
  const selectedFormationName = formations.find((f) => f.id === state.formation_id)?.type_permis?.libelle
    ?? formations.find((f) => f.id === state.formation_id)?.type_permis?.code;
  const selectedReferencielName = referentiels.find((r) => r.id === state.referenciel_id)?.libelle
    ?? referentiels.find((r) => r.id === state.referenciel_id)?.code;
  const candidateRecap = state.candidat_id
    ? state.candidat_display
    : [state.personne.prenom, state.personne.nom].filter(Boolean).join(' ');
  const pieceJustificativePourPhoto = useMemo(
    () => trouverPieceEtiqueteePhoto(expectedPieces),
    [expectedPieces],
  );
  const documentPourRecepissePhoto = useMemo(() => {
    if (!createdDossierId || !pieceJustificativePourPhoto) return null;
    return resolveDocForPiece(uploadedDocuments, pieceJustificativePourPhoto, createdDossierId);
  }, [createdDossierId, pieceJustificativePourPhoto, uploadedDocuments]);
  const isDossierEnAttentePaiement = (dossierPaiementSnap.statut ?? '').toUpperCase() === 'EN_ATTENTE_PAIEMENT';
  const hasDossierCodePaiement = Boolean((dossierPaiementSnap.code_paiement ?? '').toString().trim());
  const isDossierPaymentPhase = isDossierEnAttentePaiement || hasDossierCodePaiement;

  const recapLines = useMemo<RecapLines>(
    () => ({
      typeDemande: state.type_demande_name,
      candidat: candidateRecap,
      numeroPermis: state.permis.numero_permis || permisApiData?.numero_permis || selectedPermisNumbers[0] || '',
      categoriePermis: principalPermisCategorie,
      autoEcole: selectedAutoEcoleName ?? editionRecapFromGet?.autoEcoleLibelle ?? '',
      autoEcoleId: state.auto_ecole_id,
      formation: selectedFormationName ?? editionRecapFromGet?.formationLibelle ?? '',
      formationId: state.formation_id,
      referenciel: selectedReferencielName ?? editionRecapFromGet?.referencielLibelle ?? '',
      referencielId: state.referenciel_id,
      province:
        (state.province_id ? provinceName(state.province_id) : '') || editionRecapFromGet?.provinceLibelle || '',
      centre: agentLieuLabels.centre || editionRecapFromGet?.centreLibelle || state.centre_id,
      commentaires: state.commentaires,
    }),
    [
      state.type_demande_name,
      candidateRecap,
      state.permis.numero_permis,
      permisApiData?.numero_permis,
      selectedPermisNumbers,
      principalPermisCategorie,
      selectedAutoEcoleName,
      editionRecapFromGet,
      state.auto_ecole_id,
      selectedFormationName,
      state.formation_id,
      selectedReferencielName,
      state.referenciel_id,
      state.province_id,
      agentLieuLabels.centre,
      state.centre_id,
      state.commentaires,
      provinces,
    ],
  );
  const recapDemandMissingFields = useMemo(() => {
    const missing: string[] = [];
    if (isRecapMissingValue(recapLines.typeDemande)) missing.push('Type de demande');
    if (isRecapMissingValue(recapLines.candidat)) missing.push('Candidat');
    if (!state.is_nouveau_permis) {
      if (isRecapMissingValue(recapLines.numeroPermis)) missing.push('N° permis principal');
      if (isRecapMissingValue(recapLines.categoriePermis)) missing.push('Catégorie permis');
      if (requiresNumeroOriginePermis && isRecapMissingValue(state.permis.numero_origine_permis)) {
        missing.push("N° permis d'origine");
      }
    }
    return missing;
  }, [
    recapLines.typeDemande,
    recapLines.candidat,
    recapLines.numeroPermis,
    recapLines.categoriePermis,
    state.is_nouveau_permis,
    requiresNumeroOriginePermis,
    state.permis.numero_origine_permis,
  ]);
  const recapTrainingMissingFields = useMemo(() => {
    const missing: string[] = [];
    if (isRecapMissingValue(recapLines.autoEcole)) missing.push('Auto-école');
    if (isRecapMissingValue(recapLines.autoEcoleId)) missing.push('auto_ecole_id');
    if (isRecapMissingValue(recapLines.formation)) missing.push('Formation');
    if (isRecapMissingValue(recapLines.formationId)) missing.push('formation_id');
    if (!state.is_nouveau_permis) {
      if (isRecapMissingValue(recapLines.referenciel)) missing.push('Référentiel');
      if (isRecapMissingValue(recapLines.referencielId)) missing.push('referenciel_id');
    }
    return missing;
  }, [
    recapLines.autoEcole,
    recapLines.autoEcoleId,
    recapLines.formation,
    recapLines.formationId,
    recapLines.referenciel,
    recapLines.referencielId,
    state.is_nouveau_permis,
  ]);

  const genererEtTelechargerRecepisseTransfert = useCallback(async (dossierDataForPdf?: Record<string, unknown> | null) => {
    if (!createdDossierId) return;
    const dossierDataCategories = Array.isArray(dossierDataForPdf?.data_categorie)
      ? (dossierDataForPdf?.data_categorie as unknown[])
      : [];

    const allPermisForRecepisse = dossierDataCategories.length > 0
      ? dossierDataCategories
      : (selectedPermisNumbers.length > 0
      ? selectedPermisNumbers.map((num) => {
          const p = permisSuggestions.find((x) => x.numero_permis === num);
          return {
            categorie: normalizeCategorie(p?.categorie),
            numero: num,
            lieu_obtention: selectedPermisMeta[num]?.lieu_obtention || String(p?.lieu_obtention ?? ''),
            date_obtention: selectedPermisMeta[num]?.date_obtention || fmtDate(typeof p?.date_obtention === 'string' ? p.date_obtention : ''),
            date_validite: selectedPermisMeta[num]?.date_validite || fmtDate(typeof p?.date_validite === 'string' ? p.date_validite : ''),
          };
        })
      : (recapLines.numeroPermis
        ? [{
            categorie: recapLines.categoriePermis || '',
            numero: recapLines.numeroPermis || '',
            lieu_obtention:
              state.permis.lieu_de_dobtention_du_permis ||
              (typeof permisApiData?.lieu_obtention === 'string' ? permisApiData.lieu_obtention : ''),
            date_obtention:
              fmtDate(state.permis.date_de_dobtention_du_permis) ||
              (typeof permisApiData?.date_obtention === 'string' ? fmtDate(permisApiData.date_obtention) : ''),
            date_validite:
              fmtDate(state.permis.date_de_delivrance_du_permis) ||
              (typeof permisApiData?.date_validite === 'string' ? fmtDate(permisApiData.date_validite) : ''),
          }]
        : []));

    await telechargerRecepisseTransfertBiometriePdf({
      dossierId: createdDossierId,
      dateTransfert: new Date(),
      typeDemandeNom: state.type_demande_name,
      personne: {
        nom: state.personne.nom,
        prenom: state.personne.prenom,
        nomCompletAffiche:
          [state.personne.prenom, state.personne.nom].filter(Boolean).join(' ') || candidateRecap,
        email: state.personne.email,
        contact: state.personne.telephone,
        adresse: state.personne.adresse,
        date_naissance: state.candidat.date_naissance,
        lieu_naissance: state.candidat.lieu_naissance,
        nationalite: state.candidat.nationalite,
        genre: state.candidat.genre,
        type_piece: state.candidat.type_piece,
        numero_piece: state.candidat.numero_piece,
        nip: state.candidat.nip,
      },
      permis: {
        numero: recapLines.numeroPermis || undefined,
        numero_origine: state.permis.numero_origine_permis || undefined,
        categorie: recapLines.categoriePermis || undefined,
        lieu_obtention:
          state.permis.lieu_de_dobtention_du_permis ||
          (typeof permisApiData?.lieu_obtention === 'string' ? permisApiData.lieu_obtention : ''),
        date_obtention:
          fmtDate(state.permis.date_de_dobtention_du_permis) ||
          (typeof permisApiData?.date_obtention === 'string' ? fmtDate(permisApiData.date_obtention) : ''),
        date_validite:
          fmtDate(state.permis.date_de_delivrance_du_permis) ||
          (typeof permisApiData?.date_validite === 'string' ? fmtDate(permisApiData.date_validite) : ''),
      },
      allPermisDuDossier: allPermisForRecepisse,
      dossierLieux: {
        autoEcoleNom: recapLines.autoEcole,
        formationResume: recapLines.formation,
        referencielLibelle: recapLines.referenciel,
        province: recapLines.province,
        centre: typeof recapLines.centre === 'string' ? recapLines.centre : String(recapLines.centre ?? ''),
        commentaires: recapLines.commentaires,
        isNouveauPermis: state.is_nouveau_permis,
      },
      documentPhotoPourRecepisse: documentPourRecepissePhoto,
    });
  }, [
    createdDossierId,
    state.type_demande_name,
    state.personne,
    state.candidat,
    state.permis,
    state.is_nouveau_permis,
    selectedPermisNumbers,
    selectedPermisMeta,
    permisSuggestions,
    candidateRecap,
    recapLines,
    permisApiData,
    documentPourRecepissePhoto,
  ]);

  const handleTransfertBiometrieCNEDDT = useCallback(async () => {
    if (!createdDossierId || !paiementVerifie) return;
    setSendingToCNEDDT(true);
    setPaiementFeedback(null);
    setTransfertEligibiliteDiagnostic(null);
    try {
      const transfert = await sendDossierToCNEDDT(createdDossierId, null, state.type_demande_id || undefined);
      setTransfertEligibiliteDiagnostic(null);
      setSentToCNEDDT(true);
      const res = await axiosClient.get(`/dossiers/${createdDossierId}`);
      const d = (res.data?.data ?? res.data) as Record<string, unknown> | null;
      if (d) {
        const attrs = d.attributes as Record<string, unknown> | undefined;
        const code =
          (d.code_paiement as string | undefined)?.trim() ||
          (attrs?.code_paiement as string | undefined)?.trim() ||
          '';
        setDossierPaiementSnap({
          statut: String(d.statut ?? ''),
          code_paiement: code || null,
        });
      }
      setPaiementFeedback(
        transfert.alreadyExistsAtBiometrie
          ? 'Le dossier existe déjà à la biométrie (CNEDDT).'
          : 'Dossier transféré à la biométrie (CNEDDT).',
      );
      void genererEtTelechargerRecepisseTransfert(d).catch((e: unknown) => {
        console.warn('[Récépissé transmission CNEDDT]', e);
      });
    } catch (err: unknown) {
      const msg =
        err instanceof SendToCNEDDTError
          ? err.message
          : (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ??
            (err as Error)?.message ??
            'Erreur lors du transfert.';
      setPaiementFeedback(msg);

      if (isTransfertNonEligibleMessage(msg) && createdDossierId) {
        let snap: Record<string, unknown> | null =
          err instanceof SendToCNEDDTError && err.dossierSnapshot && Object.keys(err.dossierSnapshot).length > 0
            ? err.dossierSnapshot
            : null;
        if (!snap) {
          try {
            const res = await axiosClient.get(`/dossiers/${createdDossierId}`, {
              params: {
                include: 'auto_ecole,formation,formation.typePermis,formation.auto_ecole,candidat.personne',
              },
            });
            snap = buildDossierTransfertEligibilitySnapshot(res.data?.data ?? res.data);
          } catch {
            snap = {};
          }
        }
        setTransfertEligibiliteDiagnostic(snap && Object.keys(snap).length > 0 ? snap : {});
      } else {
        setTransfertEligibiliteDiagnostic(null);
      }
    } finally {
      setSendingToCNEDDT(false);
    }
  }, [createdDossierId, paiementVerifie, state.type_demande_id, genererEtTelechargerRecepisseTransfert]);

  const muiTheme = useTheme();
  const demandePrimary = muiTheme.palette.primary.dark;
  const demandePageTheme = useMemo(
    () =>
      createTheme(muiTheme, {
        components: {
          MuiPaper: {
            styleOverrides: {
              root: (p: unknown) => {
                const variant = (p as { ownerState?: { variant?: string } }).ownerState?.variant;
                return {
                  ...(variant === 'outlined'
                    ? {
                        borderColor: alpha(DEMANDE_THEME_NAVY, 0.22),
                        backgroundImage: `linear-gradient(
                          168deg,
                          rgba(255, 255, 255, 0.995) 0%,
                          ${alpha(muiTheme.palette.primary.main, 0.07)} 46%,
                          rgba(255, 255, 255, 0.98) 100%
                        )`,
                      }
                    : {}),
                };
              },
            },
          },
        },
      }),
    [muiTheme],
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider theme={demandePageTheme}>
      <Box
        sx={{
          minHeight: '100%',
          background: `
            radial-gradient(ellipse 120% 80% at 0% 40%, ${alpha(DEMANDE_THEME_NAVY, 0.1)} 0%, transparent 52%),
            linear-gradient(180deg, ${alpha(muiTheme.palette.primary.light, 0.08)} 0%, transparent 42%),
            linear-gradient(to bottom, ${muiTheme.palette.grey[50]}, #fafcff)
          `,
        }}
      >
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Grid container spacing={2.5} alignItems="flex-start">
        <Grid item xs={12} lg={8.5}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: 3,
          p: { xs: 1.75, sm: 2 },
          borderRadius: 2,
          border: `1px solid ${alpha(DEMANDE_THEME_NAVY, 0.14)}`,
          background: `linear-gradient(142deg,
            ${alpha(muiTheme.palette.primary.dark, 0.09)} 0%,
            ${alpha('#fff', 0.92)} 48%,
            ${alpha(DEMANDE_THEME_NAVY, 0.04)} 100%)`,
          boxShadow: `0 4px 20px ${alpha(DEMANDE_THEME_NAVY, 0.08)}`,
        }}
      >
        <IconButton size="small" onClick={() => navigate(ROUTES.GESTION_DOSSIER)} sx={{ color: demandePrimary }}>
          <ArrowLeftIcon style={{ width: 20 }} />
        </IconButton>
        <DocumentPlusIcon style={{ width: 32, height: 32, color: demandePrimary }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700} sx={{ color: demandePrimary, letterSpacing: -0.02 }}>
            Nouvelle demande
          </Typography>
          <Typography variant="body2" sx={{ color: alpha(demandePrimary, 0.78), mt: 0.25 }}>
            Créez un dossier en remplissant les sections ci-dessous
          </Typography>
        </Box>
      </Box>

      {/* Progress */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2.5, bgcolor: alpha(muiTheme.palette.primary.main, 0.04), borderColor: alpha(DEMANDE_THEME_NAVY, 0.18) }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {[
            { label: 'Type', done: c1 },
            { label: 'Candidat', done: c2 },
            { label: state.is_nouveau_permis ? 'Auto-école' : 'Permis', done: c3 },
            { label: 'Finalisation', done: c1 && c2 && c3 },
          ].map(({ label, done }) => (
            <Chip key={label} label={label} size="small"
              icon={done ? <CheckIcon style={{ width: 14 }} /> : undefined}
              color={done ? 'success' : 'primary'} variant={done ? 'filled' : 'outlined'}
              sx={{
                fontWeight: done ? 600 : 500,
                ...(!done && { borderColor: alpha(DEMANDE_THEME_NAVY, 0.28), bgcolor: alpha(muiTheme.palette.primary.main, 0.03) }),
              }}
            />
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {completedCount}/3 sections complètes
          </Typography>
        </Stack>
      </Paper>

      {submitSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSubmitSuccess(null)}>{submitSuccess}</Alert>}
      {submitError  && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>{submitError}</Alert>}
      {editionHydrating && isEditingExistingDossier && createdDossierId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <CircularProgress size={18} />
            <span>Chargement complet du dossier sur le serveur…</span>
          </Stack>
        </Alert>
      )}
      {editionHydrateError && isEditingExistingDossier && createdDossierId && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setEditionHydrateError(null)}>
          {editionHydrateError}
        </Alert>
      )}
      {isEditingExistingDossier && createdDossierId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Vous modifiez un dossier existant. Enregistrez vos changements avec « Mettre à jour ».
        </Alert>
      )}
      {dossierLockedAfterCreation && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Le récapitulatif est conservé après création. Il sera réinitialisé après le traitement définitif du dossier (pièces, paiement, transfert via circuit).
        </Alert>
      )}

      {/* ── SECTION 1 : Type de demande ──────────────────────────────────── */}
      <Paper variant="outlined" sx={{ mb: 2.5, p: 2 }}>
        <Box sx={{ mb: 2 }}>
          <SectionTitle num={1} title="Type de demande"
            subtitle={state.type_demande_name || 'Sélectionnez le type de demande'}
            complete={c1} icon={FlagIcon} />
        </Box>
          {loadingTypes
            ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
            : (
              <Grid container spacing={1.5}>
                {typesDemande.map((td) => {
                  const selected = state.type_demande_id === td.id;
                  const demandeCode = (td.code ?? '').toString().trim().toUpperCase();
                  const displayTypeDemandeName = formatTypeDemandeDisplayName(td.name);
                  const typeDemandeSubtitle = getTypeDemandeSubtitle(td.name, td.code);
                  const typeKey = normalizeEntityKey(td.code || td.name || '');
                  const isFicheEnregistrementType =
                    typeKey === 'FICHEENREGISTREMENT' || typeKey === 'DUPLICATAFICHEENREGISTREMENT';
                  return (
                    <Grid item xs={12} sm={6} md={4} key={td.id}>
                      <Paper
                        variant="outlined"
                        onClick={() => {
                          dispatch({ type: 'SET_TYPE_DEMANDE', id: td.id, name: td.name, is_nouveau_permis: isNouveauPermis(td.name) });
                        }}
                        sx={{
                          p: 1.75,
                          maxWidth: 380,
                          mx: 'auto',
                          cursor: 'pointer',
                          borderRadius: 2,
                          borderWidth: 1.6,
                          borderColor: selected
                            ? (isFicheEnregistrementType ? 'success.main' : 'primary.main')
                            : (isFicheEnregistrementType ? 'success.light' : 'divider'),
                          bgcolor: selected
                            ? (isFicheEnregistrementType ? 'success.50' : '#fff1f7')
                            : (isFicheEnregistrementType ? '#f5fff7' : 'background.paper'),
                          transition: 'all .18s ease',
                          boxShadow: selected
                            ? (isFicheEnregistrementType
                              ? '0 8px 22px rgba(34, 197, 94, 0.16)'
                              : '0 8px 22px rgba(236, 72, 153, 0.18)')
                            : '0 2px 8px rgba(15, 23, 42, 0.04)',
                          '&:hover': {
                            borderColor: isFicheEnregistrementType ? 'success.main' : '#ec4899',
                            bgcolor: isFicheEnregistrementType ? '#ecfdf3' : '#fff1f7',
                            transform: 'translateY(-2px)',
                            boxShadow: isFicheEnregistrementType
                              ? '0 10px 24px rgba(34, 197, 94, 0.2)'
                              : '0 10px 24px rgba(236, 72, 153, 0.24)',
                          },
                        }}
                      >
                        <Stack spacing={1.1}>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                            <Chip
                              size="small"
                              color={selected ? 'primary' : 'default'}
                              label={demandeCode ? `Carte ${demandeCode}` : 'Carte permis'}
                              variant={selected ? 'filled' : 'outlined'}
                            />
                            {selected && (
                              <Chip
                                size="small"
                                color="success"
                                icon={<CheckCircleIcon style={{ width: 14 }} />}
                                label="Sélectionné"
                                sx={{ '& .MuiChip-label': { px: 1 } }}
                              />
                            )}
                          </Stack>
                          <Box>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{ lineHeight: 1.28, textShadow: '0 1px 2px rgba(15, 23, 42, 0.22)' }}
                            >
                              {displayTypeDemandeName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {typeDemandeSubtitle}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            )}
      </Paper>

      {/* ── SECTION 2 : Vérification permis (si permis existant) ─────────── */}
      {!state.is_nouveau_permis && (
      <Paper variant="outlined" sx={{ mb: 2.5, p: 2, opacity: canEditCandidat ? 1 : 0.7 }}>
        <Box sx={{ mb: 2 }}>
          <SectionTitle num={2} title="Vérification du permis"
            subtitle={permisVerified ? 'Permis vérifié' : 'DGDI + vérification permis'}
            complete={permisVerified} icon={ShieldCheckIcon} />
        </Box>
        {!canEditCandidat && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Terminez d'abord la section "Type de demande" pour activer ce formulaire.
          </Alert>
        )}
          {/* ════════════════════════════════════════════════════════════════
              BLOC A — Vérification pièce d'identité DGDI
              Uniquement pour les dossiers avec permis existant
          ════════════════════════════════════════════════════════════════ */}
          {!state.is_nouveau_permis && (
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: dgdiOk ? 'success.main' : 'warning.main' }}>
                  {dgdiOk ? <CheckIcon style={{ width: 12 }} /> : '1'}
                </Avatar>
                <Typography variant="subtitle2" fontWeight={700}>Vérification pièce d'identité (DGDI)</Typography>
                {dgdiStatus === 'bypass' && <Chip label="DGDI indisponible" size="small" color="warning" />}
                {dgdiStatus === 'ok' && <Chip label="Vérifié" size="small" color="success" />}
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Vérification auprès de la Direction Générale de la Documentation et de l'Immigration.
              </Typography>

              <Grid container spacing={2} alignItems="flex-end" sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                <Grid item xs={12} sm={4} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <FormControl
                    fullWidth
                    variant="standard"
                    disabled={dgdiVerifying || (dgdiOk && !editionUxUnlocked)}
                    sx={{ minWidth: 0 }}
                  >
                    <InputLabel id="dgdi-type-piece-label">Type de pièce</InputLabel>
                    <Select
                      labelId="dgdi-type-piece-label"
                      label="Type de pièce"
                      value={typePiece}
                      onChange={(e) => { setTypePiece(e.target.value); setDgdiStatus('idle'); setDgdiMessage(''); }}
                      startAdornment={(
                        <InputAdornment position="start" sx={{ mr: 0.5 }}>
                          <FingerPrintIcon style={{ width: 16, opacity: 0.7 }} />
                        </InputAdornment>
                      )}
                    >
                      {TYPES_PIECE_DGDI.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={5} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <TextField
                    label="Numéro de la pièce"
                    size="small"
                    fullWidth
                    required
                    variant="standard"
                    disabled={dgdiVerifying || (dgdiOk && !editionUxUnlocked)}
                    value={numeroPieceInput}
                    onChange={(e) => { setNumeroPieceInput(e.target.value); setDgdiStatus('idle'); setDgdiMessage(''); }}
                    placeholder={typePiece === 'Passeport' ? '25PP15842' : '1234567890'}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FingerPrintIcon style={{ width: 16, opacity: 0.7 }} />
                        </InputAdornment>
                      ),
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !dgdiOk) void handleVerifyDgdi(); }}
                  />
                </Grid>
                <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'flex-end', flexShrink: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => void handleVerifyDgdi()}
                    disabled={dgdiVerifying || (dgdiOk && !editionUxUnlocked) || !numeroPieceInput.trim()}
                    startIcon={dgdiVerifying ? <CircularProgress size={16} color="inherit" /> : <FingerPrintIcon style={{ width: 18 }} />}
                    sx={{ height: 36.5, whiteSpace: 'nowrap' }}
                  >
                    {dgdiVerifying ? 'Vérification…' : dgdiOk ? 'Vérifié' : 'Vérifier'}
                  </Button>
                </Grid>
              </Grid>
              {typePiece === 'Passeport' && (
                <Grid container spacing={2} sx={{ mt: 0 }}>
                  <Grid item xs={12} sm={4} sx={{ display: { xs: 'none', sm: 'block' } }} aria-hidden />
                  <Grid item xs={12} sm={5}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
                      Format passeport : 2 chiffres, 2 lettres, 5 chiffres (ex.&nbsp;: 25PP15842).
                    </Typography>
                  </Grid>
                </Grid>
              )}

              {dgdiStatus === 'ok' && (
                <Alert severity="success" icon={<ShieldCheckIcon style={{ width: 18 }} />} sx={{ mt: 1.5 }}>
                  {dgdiMessage}
                </Alert>
              )}
              {dgdiStatus === 'bypass' && (
                <Alert severity="warning" icon={<ExclamationTriangleIcon style={{ width: 18 }} />} sx={{ mt: 1.5 }}>
                  {dgdiMessage} — Vous pouvez poursuivre avec la vérification du permis.
                </Alert>
              )}
              {dgdiStatus === 'error' && (
                <Box mt={1.5}>
                  <Alert severity="error" sx={{ mb: 1 }}>{dgdiMessage}</Alert>
                  <Button variant="outlined" color="warning" size="small"
                    onClick={() => {
                      setDgdiStatus('bypass');
                      setDgdiMessage('Vérification DGDI ignorée.');
                      if (numeroPieceInput.trim()) {
                        syncDgdiPieceToCandidat(typePiece, numeroPieceInput.trim());
                      }
                    }}>
                    Continuer sans vérification DGDI
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* ════════════════════════════════════════════════════════════════
              BLOC B — Vérification du permis de conduire
              Affiché après DGDI ok/bypass et si !nouveau_permis
          ════════════════════════════════════════════════════════════════ */}
          {!state.is_nouveau_permis && dgdiEffectiveOk && (
            <Box sx={{ mb: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.7rem', bgcolor: permisVerified ? 'success.main' : 'primary.main' }}>
                  {permisVerified ? <CheckIcon style={{ width: 12 }} /> : '2'}
                </Avatar>
                <Typography variant="subtitle2" fontWeight={700}>Vérification du permis de conduire</Typography>
                {permisVerified && <Chip label="Permis vérifié" size="small" color="success" />}
                {editionUxUnlocked && <Chip label="Chargé depuis le dossier" size="small" color="info" variant="outlined" />}
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Choisissez le mode de vérification.
              </Typography>

              {/* Champs dossier directs (après GET) — évite tout formulaire “figé” sans refaire DGDI / API permis */}
              {editionUxUnlocked && !state.is_nouveau_permis && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: alpha('#0288d1', 0.06), borderColor: 'info.main' }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                    Champs permis du dossier (modifiables pour le PUT)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Prérempli depuis la dernière requête de chargement du dossier sur le serveur. Ces champs alimentent le corps JSON du PUT (numéro, lieu, dates, etc.).
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="N° permis principal"
                        size="small"
                        fullWidth
                        variant="standard"
                        value={state.permis.numero_permis}
                        onChange={(e) =>
                          dispatch({
                            type: 'SET_PERMIS_FIELD',
                            field: 'numero_permis',
                            value: e.target.value.replace(/-/g, '').toUpperCase(),
                          })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="N° permis d'origine"
                        size="small"
                        fullWidth
                        variant="standard"
                        value={state.permis.numero_origine_permis}
                        onChange={(e) =>
                          dispatch({
                            type: 'SET_PERMIS_FIELD',
                            field: 'numero_origine_permis',
                            value: e.target.value.toUpperCase(),
                          })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Lieu d’obtention du permis"
                        size="small"
                        fullWidth
                        variant="standard"
                        value={state.permis.lieu_de_dobtention_du_permis}
                        onChange={(e) =>
                          dispatch({
                            type: 'SET_PERMIS_FIELD',
                            field: 'lieu_de_dobtention_du_permis',
                            value: e.target.value,
                          })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Obtenu le"
                        type="date"
                        size="small"
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ shrink: true }}
                        value={state.permis.date_de_dobtention_du_permis || ''}
                        onChange={(e) =>
                          dispatch({
                            type: 'SET_PERMIS_FIELD',
                            field: 'date_de_dobtention_du_permis',
                            value: e.target.value,
                          })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <TextField
                        label="Valable jusqu’au / délivrance"
                        type="date"
                        size="small"
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ shrink: true }}
                        value={state.permis.date_de_delivrance_du_permis || ''}
                        onChange={(e) =>
                          dispatch({
                            type: 'SET_PERMIS_FIELD',
                            field: 'date_de_delivrance_du_permis',
                            value: e.target.value,
                          })}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              )}

              {/* Type de vérification */}
              <RadioGroup row value={verificationType} onChange={(e) => { setVerificationType(e.target.value as 'numero' | 'identite'); setPermisVerified(false); setPermisError(''); setPermisApiData(null); setPermisIdentitySource(null); setPermisSuggestions([]); setSelectedPermisNumbers([]); setManualPermisB({ numero_permis: '', date_obtention: '', date_validite: '', lieu_obtention: '' }); }} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {[
                    { value: 'numero', label: 'Par numéro de permis', sub: 'Format standard ou PERM' },
                    { value: 'identite', label: 'Par identité', sub: 'Nom, prénom, date de naissance' },
                  ].map(({ value, label, sub }) => (
                    <Card key={value} variant="outlined" onClick={() => { if (!(permisVerified && !editionUxUnlocked)) { setVerificationType(value as 'numero' | 'identite'); setPermisVerified(false); setPermisError(''); setPermisApiData(null); setPermisIdentitySource(null); setPermisSuggestions([]); setSelectedPermisNumbers([]); setManualPermisB({ numero_permis: '', date_obtention: '', date_validite: '', lieu_obtention: '' }); }}}
                      sx={{ cursor: permisVerified && !editionUxUnlocked ? 'default' : 'pointer', flex: 1, minWidth: 180, border: 2, borderColor: verificationType === value ? 'primary.main' : 'divider', bgcolor: verificationType === value ? 'primary.50' : 'background.paper', transition: 'all .15s', '&:hover': permisVerified && !editionUxUnlocked ? {} : { borderColor: 'primary.main' } }}>
                      <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                        <FormControlLabel value={value} control={<Radio size="small" />} label={
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{label}</Typography>
                            <Typography variant="caption" color="text.secondary">{sub}</Typography>
                          </Box>
                        } disabled={permisVerified && !editionUxUnlocked} sx={{ m: 0 }} />
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </RadioGroup>

              {/* Formulaire par numéro */}
              {verificationType === 'numero' && !permisVerified && (
                <Box>
                  <RadioGroup row value={permisFormat} onChange={(e) => { setPermisFormat(e.target.value as PermisFormatType); setPermisParts(EMPTY_PARTS); }} sx={{ mb: 1.5 }}>
                    <FormControlLabel value="standard" control={<Radio size="small" />} label="Format standard (2024-1-B-1234)" />
                    <FormControlLabel value="op" control={<Radio size="small" />} label="Format PERM (PERM-12345678)" />
                  </RadioGroup>

                  <Grid container spacing={1.5}>
                    {permisFormat === 'standard' ? (
                      <>
                        <Grid item xs={6} sm={3}>
                          <TextField label="Année" size="small" fullWidth placeholder="2024" inputProps={{ maxLength: 4 }}
                            variant="standard"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <FingerPrintIcon style={{ width: 15, opacity: 0.65 }} />
                                </InputAdornment>
                              ),
                            }}
                            value={permisParts.annee}
                            onChange={(e) => setPermisParts((p) => ({ ...p, annee: e.target.value.replace(/\D/g, '').slice(0, 4) }))} />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <TextField label="Province" size="small" fullWidth placeholder="1" inputProps={{ maxLength: 1 }}
                            variant="standard"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <FlagIcon style={{ width: 15, opacity: 0.65 }} />
                                </InputAdornment>
                              ),
                            }}
                            value={permisParts.province}
                            onChange={(e) => setPermisParts((p) => ({ ...p, province: e.target.value.replace(/[^1-9]/g, '').slice(0, 1) }))} />
                        </Grid>
                        <Grid item xs={6} sm={2}>
                          <TextField label="Catégorie" size="small" fullWidth placeholder="B" inputProps={{ maxLength: 1 }}
                            variant="standard"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <ShieldCheckIcon style={{ width: 15, opacity: 0.65 }} />
                                </InputAdornment>
                              ),
                            }}
                            value={permisParts.categorie}
                            onChange={(e) => setPermisParts((p) => ({ ...p, categorie: e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 1) }))} />
                        </Grid>
                        <Grid item xs={6} sm={5}>
                          <TextField label="Numéro" size="small" fullWidth placeholder="1234" inputProps={{ maxLength: 10 }}
                            variant="standard"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <FingerPrintIcon style={{ width: 15, opacity: 0.65 }} />
                                </InputAdornment>
                              ),
                            }}
                            value={permisParts.numero}
                            onChange={(e) => setPermisParts((p) => ({ ...p, numero: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
                        </Grid>
                      </>
                    ) : (
                      <Grid item xs={12} sm={6}>
                        <TextField label="Numéro complet" size="small" fullWidth placeholder="PERM-12345678"
                          variant="standard"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <FingerPrintIcon style={{ width: 16, opacity: 0.7 }} />
                              </InputAdornment>
                            ),
                          }}
                          value={permisParts.numero}
                          onChange={(e) => setPermisParts((p) => ({ ...p, numero: e.target.value.toUpperCase() }))} />
                      </Grid>
                    )}
                  </Grid>

                  {numPermisComplet && (
                    <Paper variant="outlined" sx={{ mt: 1.5, px: 2, py: 1, display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">Numéro :</Typography>
                      <Typography variant="body2" fontWeight={700} fontFamily="monospace">{numPermisComplet}</Typography>
                    </Paper>
                  )}

                  <Box mt={1.5}>
                    <Button variant="contained" onClick={() => void handleVerifyPermisNumero()}
                      disabled={verifyingPermis || !numPermisComplet}
                      startIcon={verifyingPermis ? <CircularProgress size={16} color="inherit" /> : <ShieldCheckIcon style={{ width: 18 }} />}>
                      {verifyingPermis ? 'Vérification…' : 'Vérifier le permis'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Formulaire par identité */}
              {verificationType === 'identite' && !permisVerified && (
                <Box>
                  <Grid container spacing={1.5} mb={1.5}>
                    <Grid item xs={12} sm={4}>
                      <TextField label="Nom" size="small" fullWidth value={identityForm.nom}
                        variant="standard"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <UserCircleIcon style={{ width: 16, opacity: 0.7 }} />
                            </InputAdornment>
                          ),
                        }}
                        onChange={(e) => setIdentityForm((f) => ({ ...f, nom: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField label="Prénom" size="small" fullWidth value={identityForm.prenom}
                        variant="standard"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <UserCircleIcon style={{ width: 16, opacity: 0.7 }} />
                            </InputAdornment>
                          ),
                        }}
                        onChange={(e) => setIdentityForm((f) => ({ ...f, prenom: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField label="Date de naissance" type="date" size="small" fullWidth
                        variant="standard"
                        InputLabelProps={{ shrink: true }} value={identityForm.dateNaissance}
                        onChange={(e) => setIdentityForm((f) => ({ ...f, dateNaissance: e.target.value }))} />
                    </Grid>
                  </Grid>
                  <Button variant="contained" onClick={() => void handleVerifyPermisIdentite()}
                    disabled={verifyingPermis || (!identityForm.nom && !identityForm.prenom && !identityForm.dateNaissance)}
                    startIcon={verifyingPermis ? <CircularProgress size={16} color="inherit" /> : <MagnifyingGlassIcon style={{ width: 18 }} />}>
                    {verifyingPermis ? 'Recherche…' : 'Rechercher le permis'}
                  </Button>
                </Box>
              )}

              {permisError && <Alert severity="error" sx={{ mt: 1.5 }}>{permisError}</Alert>}
              {permisSuggestions.length > 0 && !permisVerified && (
                <Box sx={{ mt: 1.5 }}>
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    {permisSuggestions.length} permis trouve(s). Vous pouvez en selectionner plusieurs.
                  </Alert>
                  <Grid container spacing={1.5}>
                    {permisSuggestions.map((p, idx) => {
                      const selected = selectedPermisNumbers.includes(p.numero_permis);
                      const isPrincipal = !!(permisVerified && permisApiData?.numero_permis === p.numero_permis);
                      return (
                        <Grid item xs={12} md={6} key={`${p.numero_permis}-${idx}`}>
                          <Paper variant="outlined" sx={{ p: 1.5, borderColor: selected ? 'primary.main' : 'divider', bgcolor: selected ? 'primary.50' : 'background.paper' }}>
                            <Typography variant="body2" fontWeight={700}>{p.numero_permis}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {[p.prenom, p.nom].filter(Boolean).join(' ') || 'Titulaire non renseigne'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {p.date_naissance ? `Naissance: ${fmtDate(p.date_naissance)}` : ' '}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              <Button size="small" variant={selected ? 'contained' : 'outlined'} onClick={() => togglePermisSelection(p.numero_permis)}>
                                {selected ? 'Selectionne' : 'Ajouter'}
                              </Button>
                              {isPrincipal && <Chip size="small" color="success" label="Principal" />}
                            </Stack>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                  {selectedPermisNumbers.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Alert severity="info" sx={{ mb: 1.5 }}>
                        Renseignez la periode du permis (obtenu le {'->'} expiration) et le lieu de delivrance pour chaque permis selectionne.
                      </Alert>
                      <Grid container spacing={1.5}>
                        {selectedPermisNumbers.map((num) => {
                          const p = permisSuggestions.find((x) => x.numero_permis === num);
                          const cat = normalizeCategorie(p?.categorie);
                          return (
                            <Grid item xs={12} md={6} key={`meta-${num}`}>
                              <Paper variant="outlined" sx={{ p: 1.5 }}>
                                <Typography variant="body2" fontWeight={700}>
                                  {num} {cat ? `(${cat})` : ''}
                                </Typography>
                                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                                  <Grid item xs={12} sm={4}>
                                    <TextField
                                      label="Date d'obtention (debut)"
                                      type="date"
                                      size="small"
                                      variant="standard"
                                      fullWidth
                                      InputLabelProps={{ shrink: true }}
                                      value={selectedPermisMeta[num]?.date_obtention ?? ''}
                                      onChange={(e) => updatePermisMeta(num, 'date_obtention', e.target.value)}
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <TextField
                                      label="Date d'expiration (jusqu'au)"
                                      type="date"
                                      size="small"
                                      variant="standard"
                                      fullWidth
                                      InputLabelProps={{ shrink: true }}
                                      value={selectedPermisMeta[num]?.date_validite ?? ''}
                                      onChange={(e) => updatePermisMeta(num, 'date_validite', e.target.value)}
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <TextField
                                      label="Lieu de delivrance"
                                      size="small"
                                      variant="standard"
                                      fullWidth
                                      InputProps={{
                                        startAdornment: (
                                          <InputAdornment position="start">
                                            <BuildingOffice2Icon style={{ width: 15, opacity: 0.65 }} />
                                          </InputAdornment>
                                        ),
                                      }}
                                      value={selectedPermisMeta[num]?.lieu_obtention ?? ''}
                                      onChange={(e) => updatePermisMeta(num, 'lieu_obtention', e.target.value)}
                                    />
                                  </Grid>
                                </Grid>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  )}
                </Box>
              )}
              {selectedPermisNumbers.length > 0 && !permisVerified && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Le permis principal (référentiel et champs permis du dossier) suit la priorité B puis C, D, E, F. Le compte candidat est pré-rempli uniquement à partir des permis retournés par la recherche (pas le B saisi à la main).
                  </Typography>
                  {selectedNeedB && !selectedHasB && (
                    <Alert severity="warning" sx={{ mt: 1.5 }}>
                      Les categories C, D, E ou F exigent un permis B. Aucun permis B n'a ete retrouve: renseignez-le ci-dessous.
                    </Alert>
                  )}
                  {selectedNeedB && !selectedHasB && (
                    <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5, borderStyle: 'dashed', borderColor: 'warning.main' }}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                        Renseignement manuel du permis B (obligatoire)
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Numero permis B"
                            size="small"
                            variant="standard"
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <FingerPrintIcon style={{ width: 15, opacity: 0.65 }} />
                                </InputAdornment>
                              ),
                            }}
                            value={manualPermisB.numero_permis}
                            onChange={(e) => setManualPermisB((prev) => ({ ...prev, numero_permis: e.target.value.toUpperCase() }))}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Lieu d'obtention"
                            size="small"
                            variant="standard"
                            fullWidth
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <BuildingOffice2Icon style={{ width: 15, opacity: 0.65 }} />
                                </InputAdornment>
                              ),
                            }}
                            value={manualPermisB.lieu_obtention}
                            onChange={(e) => setManualPermisB((prev) => ({ ...prev, lieu_obtention: e.target.value }))}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Date d'obtention"
                            type="date"
                            size="small"
                            variant="standard"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={manualPermisB.date_obtention}
                            onChange={(e) => setManualPermisB((prev) => ({ ...prev, date_obtention: e.target.value }))}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Date de validite"
                            type="date"
                            size="small"
                            variant="standard"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={manualPermisB.date_validite}
                            onChange={(e) => setManualPermisB((prev) => ({ ...prev, date_validite: e.target.value }))}
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  )}
                </Box>
              )}
              {permisVerified && permisApiData && <PermisResultCard data={permisApiData} />}

              {permisVerified && !state.is_nouveau_permis && (
                <Paper variant="outlined" sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    Formation CNEPC (attribuée automatiquement)
                  </Typography>
                  <Stack spacing={0.5}>
                    <Typography variant="body2">
                      <strong>Auto-école :</strong>{' '}
                      {selectedAutoEcoleName || (state.auto_ecole_id ? state.auto_ecole_id : '— en cours…')}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Formation :</strong>{' '}
                      {selectedFormationName || (state.formation_id ? state.formation_id : '— en cours…')}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Référentiel :</strong>{' '}
                      {selectedReferencielName || principalPermisCategorie || (state.referenciel_id ? state.referenciel_id : '—')}
                    </Typography>
                  </Stack>
                  {!state.auto_ecole_id || !state.formation_id || !state.referenciel_id ? (
                    <Alert severity="warning" sx={{ mt: 1 }}>
                      Attribution incomplète : vérifiez que l&apos;auto-école CNEPC et une formation « Permis {principalPermisCategorie || 'B'} » existent dans le référentiel, ou sélectionnez-les manuellement à l&apos;étape « Finalisation ».
                    </Alert>
                  ) : null}
                </Paper>
              )}
              {permisVerified && permisApiData && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Les informations du permis et du titulaire ont été pré-remplies dans les sections suivantes.
                </Alert>
              )}
              {permisVerified && (
                <Box sx={{ mt: 1.5 }}>
                  <Button variant="outlined" size="small" onClick={handleNouvelleRecherchePermis}>
                    Nouvelle recherche
                  </Button>
                </Box>
              )}
              {requiresNumeroOriginePermis && (
                <Paper variant="outlined" sx={{ mt: 2, p: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    Permis d’origine
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="N° permis d'origine"
                        size="small"
                        variant="standard"
                        fullWidth
                        required
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <FingerPrintIcon style={{ width: 16, opacity: 0.7 }} />
                            </InputAdornment>
                          ),
                        }}
                        value={state.permis.numero_origine_permis}
                        onChange={(e) =>
                          dispatch({
                            type: 'SET_PERMIS_FIELD',
                            field: 'numero_origine_permis',
                            value: e.target.value.toUpperCase(),
                          })
                        }
                        helperText="Ce numéro sera envoyé dans le champ numero_origine_permis."
                      />
                    </Grid>
                  </Grid>
                </Paper>
              )}
              {selectedPermisNumbers.length > 0 && !permisVerified && (
                <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={
                      selectedPermisNumbers.length === 0 ||
                      !selectedPermisPeriodComplete ||
                      (selectedNeedB && !selectedHasB && !manualPermisBComplete)
                    }
                    onClick={handleConfirmPermisSelection}
                  >
                    Confirmer la sélection ({selectedPermisNumbers.length})
                  </Button>
                </Box>
              )}
            </Box>
          )}

      </Paper>
      )}

      {/* ── SECTION 3b : Auto-école / Formation (si nouveau permis) ─────── */}
      {state.is_nouveau_permis && (
        <Paper variant="outlined" sx={{ mb: 2.5, p: 2, opacity: canEditSection3 ? 1 : 0.7 }}>
          <Box sx={{ mb: 2 }}>
            <SectionTitle num={3} title="Auto-école et formation"
              subtitle={formations.find((f) => f.id === state.formation_id)?.type_permis?.libelle ?? autoEcoles.find((a) => a.id === state.auto_ecole_id)?.nom_auto_ecole ?? 'Sélectionnez une auto-école et une formation'}
              complete={c3} icon={BuildingOffice2Icon} />
          </Box>
          {!canEditSection3 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Terminez d'abord la section "Type de demande" pour activer ce formulaire.
            </Alert>
          )}
          <Box sx={{ pointerEvents: canEditSection3 ? 'auto' : 'none' }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField select label="Auto-école" required size="small" fullWidth value={state.auto_ecole_id}
                  onChange={(e) => dispatch({ type: 'SET_AUTO_ECOLE', id: e.target.value })}>
                  <MenuItem value="">-- Choisir --</MenuItem>
                  {autoEcoles.map((ae) => <MenuItem key={ae.id} value={ae.id}>{ae.nom_auto_ecole}</MenuItem>)}
                </TextField>
              </Grid>
              {state.auto_ecole_id && (
                <Grid item xs={12}>
                  <TextField select label="Formation" required size="small" fullWidth value={state.formation_id}
                    disabled={loadingFormations} onChange={(e) => dispatch({ type: 'SET_FORMATION', id: e.target.value })}
                    InputProps={loadingFormations ? { endAdornment: <CircularProgress size={16} /> } : undefined}>
                    <MenuItem value="">-- Choisir --</MenuItem>
                    {formations.map((f) => (
                      <MenuItem key={f.id} value={f.id}>
                        {f.type_permis?.libelle ?? f.type_permis?.code ?? f.id}
                        {f.montant != null && ` — ${f.montant} FCFA`}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}
              {referentiels.length > 0 && (
                <Grid item xs={12}>
                  <TextField select label="Référentiel (optionnel)" size="small" fullWidth value={state.referenciel_id}
                    onChange={(e) => dispatch({ type: 'SET_REFERENCIEL', id: e.target.value })}>
                    <MenuItem value="">-- Optionnel --</MenuItem>
                    {referentiels.map((r) => <MenuItem key={r.id} value={r.id}>{r.libelle ?? r.code ?? r.id}</MenuItem>)}
                  </TextField>
                </Grid>
              )}
            </Grid>
          </Box>
        </Paper>
      )}

      {/* ── SECTION 4 : Compte candidat ──────────────────────────────────── */}
      <Paper variant="outlined" sx={{ mb: 2.5, p: 2, opacity: canEditCandidateAccount ? 1 : 0.7 }}>
        <Box sx={{ mb: 2 }}>
          <SectionTitle num={4} title="Compte candidat"
            subtitle={state.candidat_mode === 'search' && state.candidat_display ? state.candidat_display
              : state.candidat_mode === 'create' && state.personne.nom ? `${state.personne.prenom} ${state.personne.nom}`
              : 'Recherche ou création du compte candidat'}
            complete={c2} icon={UserCircleIcon} />
        </Box>
        {!canEditCandidateAccount && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {state.is_nouveau_permis
              ? 'Terminez d\'abord le formulaire "Auto-école et formation".'
              : 'Commencez par vérifier le permis de conduire pour activer ce formulaire candidat.'}
          </Alert>
        )}
        <Box sx={{ pointerEvents: canEditCandidateAccount ? 'auto' : 'none' }}>
          <Stack direction="row" spacing={1} mb={2.5}>
            {(['search', 'create'] as const).map((mode) => (
              <Button key={mode} variant={state.candidat_mode === mode ? 'contained' : 'outlined'} size="small"
                startIcon={mode === 'search' ? <MagnifyingGlassIcon style={{ width: 16 }} /> : <UserPlusIcon style={{ width: 16 }} />}
                onClick={() => dispatch({ type: 'SET_CANDIDAT_MODE', mode })}>
                {mode === 'search' ? 'Candidat existant' : 'Nouveau candidat'}
              </Button>
            ))}
          </Stack>

          {state.candidat_mode === 'search' && (
            <Box>
              <Autocomplete options={candidatResults} getOptionLabel={candidatLabel} loading={searchingCandidats}
                onInputChange={(_, val) => handleCandidatSearch(val)}
                onChange={(_, val) => {
                  if (val) {
                    dispatch({ type: 'SET_CANDIDAT_EXISTING', id: val.id, display: candidatLabel(val) });
                  }
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Rechercher un candidat" placeholder="Nom, prénom, numéro candidat…" size="small"
                    InputProps={{ ...params.InputProps,
                      startAdornment: <InputAdornment position="start"><MagnifyingGlassIcon style={{ width: 16, color: '#888' }} /></InputAdornment>,
                      endAdornment: <>{searchingCandidats && <CircularProgress size={16} />}{params.InputProps.endAdornment}</>,
                    }} />
                )}
                noOptionsText="Aucun candidat trouvé" loadingText="Recherche en cours…"
              />
              {state.candidat_id && (
                <Alert severity="success" sx={{ mt: 1.5 }} icon={<CheckIcon style={{ width: 18 }} />}>
                  <strong>{state.candidat_display}</strong> sélectionné.
                </Alert>
              )}
            </Box>
          )}

          {state.candidat_mode === 'create' && (
            <Box>
              {permisIdentitySource && (
                <Alert severity="info" sx={{ mb: 2 }} icon={<ShieldCheckIcon style={{ width: 18 }} />}>
                  Les champs ont été pré-remplis depuis les données d&apos;un permis trouvé en base (recherche API), et non depuis le permis principal éventuellement saisi manuellement.
                </Alert>
              )}
              <Typography variant="subtitle2" fontWeight={600} mb={1.5} color="text.secondary">Informations personnelles</Typography>
              <Grid container spacing={2} mb={2}>
                {([
                  { field: 'nom' as const, label: 'Nom', required: true },
                  { field: 'prenom' as const, label: 'Prénom', required: true },
                  { field: 'email' as const, label: 'Email', type: 'email' },
                  { field: 'telephone' as const, label: 'Téléphone', required: true },
                  { field: 'adresse' as const, label: 'Adresse', required: true },
                ] as { field: keyof typeof state.personne; label: string; required?: boolean; type?: string }[]).map(({ field, label, required, type }) => (
                  <Grid item xs={12} sm={6} key={field}>
                    <TextField label={label} required={required} size="small" fullWidth type={type}
                      value={state.personne[field]}
                      onChange={(e) => dispatch({ type: 'SET_PERSONNE', field, value: e.target.value })} />
                  </Grid>
                ))}
                <Grid item xs={12} sm={6}>
                  <Tooltip title="Mot de passe auto-généré">
                    <TextField label="Mot de passe (auto-généré)" size="small" fullWidth value={state.personne.password}
                      onChange={(e) => { dispatch({ type: 'SET_PERSONNE', field: 'password', value: e.target.value }); dispatch({ type: 'SET_PERSONNE', field: 'password_confirmation', value: e.target.value }); }}
                      InputProps={{ endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => { const pwd = genPassword(); dispatch({ type: 'SET_PERSONNE', field: 'password', value: pwd }); dispatch({ type: 'SET_PERSONNE', field: 'password_confirmation', value: pwd }); }}>
                            <ArrowLeftIcon style={{ width: 14, transform: 'rotate(180deg)' }} />
                          </IconButton>
                        </InputAdornment>
                      ) }} />
                  </Tooltip>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={600} mb={1.5} color="text.secondary">Profil candidat</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Date de naissance" type="date" required size="small" fullWidth InputLabelProps={{ shrink: true }}
                    value={state.candidat.date_naissance}
                    onChange={(e) => dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'date_naissance', value: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Lieu de naissance" size="small" fullWidth
                    value={state.candidat.lieu_naissance}
                    onChange={(e) => dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'lieu_naissance', value: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField select label="Genre" required size="small" fullWidth value={state.candidat.genre}
                    onChange={(e) => dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'genre', value: e.target.value })}>
                    <MenuItem value="M">Masculin</MenuItem>
                    <MenuItem value="F">Féminin</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Nationalité" size="small" fullWidth value={state.candidat.nationalite}
                    onChange={(e) => dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'nationalite', value: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField select label="Type de pièce" size="small" fullWidth value={state.candidat.type_piece}
                    onChange={(e) => dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'type_piece', value: e.target.value })}>
                    {['CNI', 'Passeport', 'Titre de séjour', 'Autre'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Numéro de pièce" size="small" fullWidth value={state.candidat.numero_piece}
                    onChange={(e) => dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'numero_piece', value: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="NIP" size="small" fullWidth value={state.candidat.nip}
                    onChange={(e) => dispatch({ type: 'SET_CANDIDAT_FIELD', field: 'nip', value: e.target.value })} />
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── SECTION 5 : Finalisation ─────────────────────────────────────── */}
      <FinalisationSection
        canEditFinalisation={canEditFinalisation}
        isNouveauPermis={state.is_nouveau_permis}
        blockedHint={finalisationBlockedHint}
        manualTrainingBloc={manualTrainingBlocForFinalisation}
        titleNode={
          <SectionTitle
            num={5}
            title="Finalisation"
            subtitle={
              [state.province_id ? provinceName(state.province_id) : '', state.commentaires].filter(Boolean).join(' · ')
              || 'Province et commentaires (optionnels)'
            }
            complete={c1 && c2 && c3}
            icon={CheckCircleIcon}
          />
        }
        provinces={provinces}
        provinceId={state.province_id}
        provinceDisabled={Boolean(agentLieu.province_id) && !editionUxUnlocked}
        onProvinceChange={(value) => dispatch({ type: 'SET_PROVINCE', id: value })}
        centreValue={agentLieuLabels.centre || state.centre_id}
        centreHelperText={
          editionUxUnlocked && state.centre_id
            ? 'Centre issu du dossier chargé (modifiable via la province si votre profil impose un lieu).'
            : state.centre_id
              ? 'Prérempli depuis le compte agent connecté.'
              : 'Centre non trouvé pour ce compte.'
        }
        commentaires={state.commentaires}
        onCommentairesChange={(value) => dispatch({ type: 'SET_COMMENTAIRES', value })}
      />

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <SubmitActionBar
        canSubmit={canSubmit}
        isEditingExistingDossier={isEditingExistingDossier}
        dossierLockedAfterCreation={dossierLockedAfterCreation}
        completedCount={completedCount}
        createdDossierId={createdDossierId}
        typeDemandeName={state.type_demande_name}
        isNouveauPermis={state.is_nouveau_permis}
        numeroPermis={state.permis.numero_permis}
        submitting={submitting}
        navyColor={DEMANDE_THEME_NAVY}
        onReset={() => {
          dispatch({ type: 'RESET' });
          setCreatedDossierId('');
          setIsEditingExistingDossier(false);
          editionHydratePreserveRef.current = {};
          setEditionHydrating(false);
          setEditionHydrateError(null);
          setEditionRecapFromGet(null);
          setSubmitSuccess(null);
          setSubmitError(null);
          setDgdiStatus('idle');
          setPermisVerified(false);
          setPermisApiData(null);
          setPermisIdentitySource(null);
          setPermisSuggestions([]);
          setSelectedPermisNumbers([]);
          setSelectedPermisMeta({});
          setManualPermisB({ numero_permis: '', date_obtention: '', date_validite: '', lieu_obtention: '' });
          setPermisParts(EMPTY_PARTS);
        }}
        onSubmit={() => void handleSubmit()}
      />
        </Grid>
        <Grid item xs={12} lg={3.5} sx={{ alignSelf: { xs: 'stretch', lg: 'flex-start' }, minWidth: 0 }}>
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <SummaryRecapCards
              recapLines={recapLines}
              isNouveauPermis={state.is_nouveau_permis}
              requiresNumeroOriginePermis={requiresNumeroOriginePermis}
              numeroOriginePermis={state.permis.numero_origine_permis}
              recapDemandMissingFields={recapDemandMissingFields}
              recapTrainingMissingFields={recapTrainingMissingFields}
              navyColor={DEMANDE_THEME_NAVY}
            />

          <PiecesJustificativesCard
            createdDossierId={createdDossierId}
            expectedPieces={expectedPieces}
            hasTypeDemande={Boolean(state.type_demande_id)}
            loadingExpectedPieces={loadingExpectedPieces}
            loadingUploadedDocuments={loadingUploadedDocuments}
            uploadedDocuments={uploadedDocuments}
            uploadingPieceId={uploadingPieceId}
            uploadFeedback={uploadFeedback}
            onClearUploadFeedback={() => setUploadFeedback(null)}
            onUploadForPiece={(piece, event) => handleUploadForPiece(piece, event)}
            resolveDocForPiece={resolveDocForPiece}
            formatFileSize={formatFileSize}
          />

          <Paper variant="outlined" sx={{ p: 2.25, mt: { xs: 2, lg: 0 } }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <BanknotesIcon style={{ width: 22, color: demandePrimary }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Paiement (circuit)
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Étapes du workflow comme en réception : la ligne « paiement » du circuit (libellé / code / statut d’étape contenant « PAIEMENT »).
            </Typography>
            {!state.type_demande_id ? (
              <Alert severity="info">Sélectionnez un type de demande pour charger le circuit.</Alert>
            ) : loadingExpectedPieces ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={18} />
              </Box>
            ) : !paiementEtapeCircuit ? (
              <Alert severity="info">Aucune étape de paiement dans ce circuit.</Alert>
            ) : (
              <>
                <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, bgcolor: alpha(muiTheme.palette.primary.main, 0.035), borderColor: alpha(DEMANDE_THEME_NAVY, 0.16) }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Étape de paiement
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {paiementEtapeCircuit.libelle ?? '—'}
                  </Typography>
                  {(paiementEtapeCircuit.code || paiementEtapeCircuit.statut_libelle) && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {[paiementEtapeCircuit.code, paiementEtapeCircuit.statut_libelle].filter(Boolean).join(' · ')}
                    </Typography>
                  )}
                </Paper>
                {!createdDossierId && (
                  <Alert severity="info" sx={{ mb: 1 }}>
                    Créez le dossier pour pouvoir passer le statut en « en attente de paiement » et récupérer le code éventuellement généré.
                  </Alert>
                )}
                {createdDossierId && (
                  <>
                    {!!dossierPaiementSnap.statut && (
                      <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                        <strong>Statut dossier :</strong> {dossierPaiementSnap.statut}
                      </Typography>
                    )}
                    {!!dossierPaiementSnap.code_paiement && (
                      <Typography variant="caption" sx={{ display: 'block', mb: 1, fontFamily: 'monospace' }}>
                        <strong>Code de paiement :</strong> {dossierPaiementSnap.code_paiement}
                      </Typography>
                    )}

                    {canBypassVerifPaiementDev && !paiementVerifie && (
                      <Alert
                        severity="warning"
                        sx={{ mb: 1.5 }}
                        icon={<ExclamationTriangleIcon style={{ width: 22 }} />}
                        action={
                          <Button color="warning" size="small" variant="contained" onClick={() => handleBypassVerifPaiementDev()}>
                            Ignorer la vérification du paiement
                          </Button>
                        }
                      >
                        Compte technique : marquer la vérification comme réussie sans appel à check-paiement (équivalent au
                        bypass en réception pour certains rôles).
                      </Alert>
                    )}

                    {paiementVerifie && (
                      <Alert severity="success" sx={{ mb: 1.5 }} icon={<CheckCircleIcon style={{ width: 22 }} />}>
                        Paiement vérifié. Vous pouvez poursuivre le traitement du dossier.
                      </Alert>
                    )}

                    {paiementVerifie && !sentToCNEDDT && (
                      <Box sx={{ mt: 1.5, pt: 2, borderTop: '2px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                          Après paiement confirmé : envoyer le dossier à la CNEDDT pour la biométrie (même logique que le bouton{' '}
                          « Envoyer à la CNEDDT » en réception).
                        </Typography>
                        <Tooltip
                          title={
                            !state.type_demande_id
                              ? 'Le type de demande est requis pour le transfert.'
                              : !paiementVerifie
                                ? 'Vérifiez d’abord le paiement.'
                                : 'Envoyer le dossier à la CNEDDT (biométrie)'
                          }
                        >
                          <span>
                            <Button
                              variant="contained"
                              color="secondary"
                              fullWidth
                              size="large"
                              disabled={!paiementVerifie || sendingToCNEDDT || !state.type_demande_id}
                              startIcon={
                                sendingToCNEDDT ? (
                                  <CircularProgress size={20} color="inherit" />
                                ) : (
                                  <PaperAirplaneIcon className="h-6 w-6" />
                                )
                              }
                              onClick={() => void handleTransfertBiometrieCNEDDT()}
                              sx={{ textTransform: 'none', fontWeight: 600, py: 1.25 }}
                            >
                              {sendingToCNEDDT ? 'Transfert en cours…' : 'Transférer à la biométrie (CNEDDT)'}
                            </Button>
                          </span>
                        </Tooltip>
                      </Box>
                    )}

                    {sentToCNEDDT && (
                      <Alert
                        severity="success"
                        sx={{ mt: paiementVerifie ? 1.5 : 2, '& .MuiAlert-message': { width: '100%' } }}
                        icon={<CheckCircleIcon style={{ width: 22 }} />}
                      >
                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                          Dossier envoyé pour la biométrie (CNEDDT)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Le dossier a été transféré avec succès vers la CNEDDT pour la biométrie.
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                          Un récépissé PDF devrait être enregistré automatiquement (identité, permis et photo d&apos;identité
                          si vous avez téléversé une pièce dont le nom contient « photo » dans les pièces justificatives).
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          disabled={telechargeRecepissePdfLoading || !createdDossierId}
                          startIcon={
                            telechargeRecepissePdfLoading ? (
                              <CircularProgress size={16} />
                            ) : (
                              <ArrowDownTrayIcon style={{ width: 18 }} />
                            )
                          }
                          onClick={() => {
                            void (async () => {
                              setTelechargeRecepissePdfLoading(true);
                              try {
                                await genererEtTelechargerRecepisseTransfert();
                              } catch {
                                /* console dans generer ou PDF */
                              } finally {
                                setTelechargeRecepissePdfLoading(false);
                              }
                            })();
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          {telechargeRecepissePdfLoading ? 'Génération du PDF…' : 'Retélécharger le récépissé PDF'}
                        </Button>
                      </Alert>
                    )}

                    {!paiementVerifie && isDossierPaymentPhase && (
                      <Box sx={{ mt: 1, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Saisissez le code de paiement et vérifiez (même action que dans l’accordéon d’étape réception).
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
                          <TextField
                            label="Code de paiement"
                            value={referencePaiement}
                            onChange={(e) => setReferencePaiement(e.target.value)}
                            placeholder="Ex: AB123456"
                            size="small"
                            disabled={verifyingPaiement}
                            sx={{ minWidth: { sm: 220 }, flex: { sm: 1 } }}
                          />
                          <Button
                            variant="contained"
                            color="primary"
                            disabled={!referencePaiement.trim() || verifyingPaiement}
                            startIcon={verifyingPaiement ? <CircularProgress size={16} color="inherit" /> : null}
                            onClick={() => void handleVerifierPaiement()}
                            sx={{ textTransform: 'none', flexShrink: 0 }}
                          >
                            {verifyingPaiement ? 'Vérification…' : 'Vérifier'}
                          </Button>
                        </Stack>
                      </Box>
                    )}

                    {!paiementVerifie && !isDossierPaymentPhase && (
                      <>
                        <Button
                          variant="contained"
                          color="secondary"
                          fullWidth
                          disabled={settingAttentePaiement}
                          onClick={() => void handleMettreEnAttentePaiement()}
                          startIcon={
                            settingAttentePaiement ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : (
                              <BanknotesIcon style={{ width: 18 }} />
                            )
                          }
                          sx={{ mt: 0.5 }}
                        >
                          {settingAttentePaiement ? 'Mise à jour…' : 'Mettre le dossier en attente de paiement'}
                        </Button>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Comme CircuitEtapeStepContent / EtapeAccordion : envoie{' '}
                          <strong>EN_ATTENTE_PAIEMENT</strong> puis rechargement du dossier pour le code de paiement.
                        </Typography>
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {paiementFeedback && (
              <Alert
                severity={
                  paiementFeedback.toLowerCase().includes('erreur') || paiementFeedback.includes('❌')
                    ? 'error'
                    : 'success'
                }
                sx={{ mt: 1.5 }}
                onClose={() => setPaiementFeedback(null)}
              >
                {paiementFeedback}
              </Alert>
            )}
            {transfertEligibiliteDiagnostic && (
              <Alert
                severity="warning"
                sx={{ mt: 1.5, '& .MuiAlert-message': { width: '100%' } }}
                onClose={() => setTransfertEligibiliteDiagnostic(null)}
              >
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Diagnostic dossier (transfert non éligible)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                  Champs listés selon le schéma attendu. Les lignes surlignées ou « — » indiquent une valeur absente ou
                  vide côté API.
                </Typography>
                <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 2 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Champ</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Valeur</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {DOSSIER_TRANSFERT_ELIGIBILITE_KEYS.map((key) => {
                      const raw = transfertEligibiliteDiagnostic[key];
                      const missing = isDiagnosticDossierValueMissing(raw);
                      return (
                        <TableRow key={key} sx={{ bgcolor: missing ? 'action.hover' : undefined }}>
                          <TableCell sx={{ verticalAlign: 'top', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {key}
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'top', wordBreak: 'break-word' }}>
                            <Typography variant="body2" component="span" fontFamily="monospace" fontSize="0.8rem">
                              {formatDiagnosticDossierValue(raw)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                  Instantané fusionné (GET /dossiers)
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    maxHeight: 320,
                    overflow: 'auto',
                    fontSize: '0.7rem',
                    bgcolor: 'grey.900',
                    color: 'grey.100',
                    borderRadius: 1,
                  }}
                >
                  {JSON.stringify(transfertEligibiliteDiagnostic, null, 2)}
                </Box>
              </Alert>
            )}
          </Paper>
          </Box>
        </Grid>
      </Grid>
    </Container>
      </Box>
    </ThemeProvider>
  );
};

export default NouvelleDemandeePage;
