import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppBar,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Divider,
  IconButton,
  Toolbar,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import {
  DossierFormData,
  Dossier,
  AutoEcole,
  Formation,
  autoEcoleService,
  userService,
  typeDemandeService,
  referentielService,
  Referentiel,
  TypeDemande,
} from '../services';
import type { DataCategorieItem } from './steps/NumeroPermisStep';
import type { Candidat } from '../types/auto-ecole';
import { checkIsFicheEnregistre } from './utils';
import type { Statut } from '../../statut/types/statut';
import { statutService } from '../../statut/services/statut.service';
import { circuitSuiviService } from '../../reception/services/circuit-suivi.service';
import { useAppStore } from '../../../store';

/** Seuls archivage et admin peuvent modifier le statut circuit du dossier dans ce formulaire. */
function canEditDossierCircuitStatut(role: string | null | undefined): boolean {
  if (!role) return false;
  const n = role.replace(/^ROLE_/i, '').toLowerCase().trim();
  return n === 'admin' || n === 'archivage';
}

/** Statuts dossier imposés côté traitement réception (TraitementEtapeContenu / envoi CNEDDT), hors libellés d’étapes. */
const CIRCUIT_DOSSIER_STATUTS_EXTRA = ['EN_ATTENTE_PAIEMENT', 'DOSSIER ENVOYER'] as const;

/** Construit la liste des valeurs « statut dossier » alignée sur le circuit (libellés d’étapes + extras métier). */
function buildCircuitDossierStatutOptions(etapeLibelles: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const L of etapeLibelles) {
    const t = L.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  for (const extra of CIRCUIT_DOSSIER_STATUTS_EXTRA) {
    const k = extra.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(extra);
  }
  return out;
}

/** Aligne la valeur dossier (code ou libellé) sur le libellé workflow attendu par l’API (comme en réception / circuit). */
function resolveStatutToWorkflowLibelle(raw: string, statuts: Statut[]): string {
  const t = (raw ?? '').trim();
  if (!t || !statuts.length) return t;
  if (statuts.some((s) => (s.libelle ?? '').trim() === t)) return t;
  const byCode = statuts.find(
    (s) =>
      (s.code ?? '').trim() === t ||
      (s.code ?? '').trim().toUpperCase() === t.toUpperCase(),
  );
  if (byCode?.libelle?.trim()) return byCode.libelle.trim();
  const byLibelleCi = statuts.find(
    (s) => (s.libelle ?? '').trim().toLowerCase() === t.toLowerCase(),
  );
  if (byLibelleCi?.libelle?.trim()) return byLibelleCi.libelle.trim();
  return t;
}

/** Libellé affiché (cohérent avec la gestion des dossiers / réception). */
function formatWorkflowStatutLabel(statut: string): string {
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    en_cours: 'En cours',
    valide: 'Validé',
    rejete: 'Rejeté',
    transmis: 'Transmis',
    Cnepc: 'CNEPC',
    EN_ATTENTE_PAIEMENT: 'En attente de paiement',
    'DOSSIER ENVOYER': 'Dossier envoyé (biométrie)',
  };
  const upper = statut.trim().toUpperCase();
  if (upper === 'EN_ATTENTE_PAIEMENT') return labels.EN_ATTENTE_PAIEMENT;
  if (upper === 'DOSSIER ENVOYER') return labels['DOSSIER ENVOYER'];
  if (/dossier\s*envoy|envoy.*cneddt|impression/i.test(statut)) return 'Envoyé à la biométrie';
  return labels[statut] || statut;
}

type DossierEditFormValues = DossierFormData & {
  candidat_nom: string;
  candidat_prenom: string;
  candidat_genre: string;
  candidat_date_naissance: string;
  candidat_lieu_naissance: string;
  candidat_nationalite: string;
};

interface DossierFormProps {
  dossier?: Dossier;
  onSuccess: (dossier: Dossier) => void;
  onCancel: () => void;
  open: boolean;
  autoEcoleId?: string;
}

const DossierForm: React.FC<DossierFormProps> = ({
  dossier,
  onSuccess,
  onCancel,
  open,
  autoEcoleId,
}) => {
  const [loading, setLoading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [dataCategorie, setDataCategorie] = useState<DataCategorieItem[]>([]);

  const [typeDemandes, setTypeDemandes] = useState<TypeDemande[]>([]);
  const [loadingTypeDemandes, setLoadingTypeDemandes] = useState(false);
  const [provinces, setProvinces] = useState<Referentiel[]>([]);
  const [centres, setCentres] = useState<Referentiel[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCentres, setLoadingCentres] = useState(false);
  const [referentielsTypePermis, setReferentielsTypePermis] = useState<Referentiel[]>([]);
  const [loadingReferentielsTypePermis, setLoadingReferentielsTypePermis] = useState(false);
  const [workflowStatuts, setWorkflowStatuts] = useState<Statut[]>([]);
  const [loadingWorkflowStatuts, setLoadingWorkflowStatuts] = useState(false);
  const [circuitStatutOptions, setCircuitStatutOptions] = useState<string[]>([]);
  const [loadingCircuitStatuts, setLoadingCircuitStatuts] = useState(false);
  /** True une fois la tentative de chargement des statuts circuit terminée (évite d’écraser le statut avec /workflow/statuts avant le circuit). */
  const [circuitStatutsTried, setCircuitStatutsTried] = useState(false);
  const { user } = useAppStore();
  const canEditStatutField = canEditDossierCircuitStatut(user?.role ?? null);
  const [_candidatDetail, setCandidatDetail] = useState<Candidat | null>(null);
  const [loadingCandidat, setLoadingCandidat] = useState(false);
  const [autoEcoles, setAutoEcoles] = useState<AutoEcole[]>([]);
  const [loadingAutoEcoles, setLoadingAutoEcoles] = useState(false);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loadingFormations, setLoadingFormations] = useState(false);
  const [cnepcBundle, setCnepcBundle] = useState<{
    autoEcole: AutoEcole;
    formations: Formation[];
  } | null>(null);
  const cnepcBundleRef = useRef(cnepcBundle);
  cnepcBundleRef.current = cnepcBundle;

  const [manualReferentielId, setManualReferentielId] = useState(false);

  const toDateInputValue = (value?: string | null): string => {
    if (!value) return '';
    const s = String(value);
    if (!s.trim()) return '';
    // ISO => YYYY-MM-DD
    if (s.includes('T')) return s.split('T')[0] ?? '';
    return s;
  };

  const toIsoStringFromDateInput = (value?: string | null): string | undefined => {
    const s = (value ?? '').trim();
    if (!s) return undefined;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  };

  const getFormationLabel = (f: any): string => {
    if (!f) return 'N/A';
    const nom = f.nom ?? f.name;
    if (typeof nom === 'string' && nom.trim()) return nom;

    const desc = f.description;
    if (typeof desc === 'string' && desc.trim()) return desc;

    // Souvent le libelle est porté par type_permis.typePermis
    const tp = f.type_permis ?? f.typePermis ?? f.typePermis?.type_permis;
    const libelle =
      tp?.libelle ??
      tp?.nom ??
      tp?.code ??
      f.type_permis?.libelle ??
      f.type_permis?.nom ??
      f.type_permis?.code ??
      f.typePermis?.libelle ??
      f.typePermis?.nom ??
      f.typePermis?.code;

    if (typeof libelle === 'string' && libelle.trim()) return libelle;

    const sessionLibelle = f.session?.libelle ?? f.session?.nom;
    if (typeof sessionLibelle === 'string' && sessionLibelle.trim()) return sessionLibelle;

    return f.id ?? 'N/A';
  };

  const getFormationPrice = (f: any): string | null => {
    const raw = f.prix ?? f.montant ?? f.montant_formate;
    if (raw === null || raw === undefined || raw === '') return null;
    // Ne pas doubler si c'est déjà une chaine formatée avec €
    const s = String(raw);
    if (!s.trim()) return null;
    // Si c'est déjà une chaine formatée, on ne modifie pas
    if (s.includes('€') || s.toLowerCase().includes('cfa')) return s;
    const num = Number(raw);
    if (Number.isNaN(num)) return s;
    return String(num);
  };

  const normalizeDataCategorie = (raw: unknown): DataCategorieItem[] => {
    if (!raw || !Array.isArray(raw)) return [];

    return raw.map((item) => {
      // Backend: peut renvoyer des objets ou des strings JSON
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const o = item as Record<string, unknown>;
        return {
          classe: String(o.classe ?? ''),
          ville: String(o.ville ?? ''),
          codification_code: String(o.codification_code ?? ''),
          valable_du: String(o.valable_du ?? ''),
          jusqu_au: String(o.jusqu_au ?? ''),
        };
      }

      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item) as Record<string, unknown>;
          return {
            classe: String(parsed.classe ?? ''),
            ville: String(parsed.ville ?? ''),
            codification_code: String(parsed.codification_code ?? ''),
            valable_du: String(parsed.valable_du ?? ''),
            jusqu_au: String(parsed.jusqu_au ?? ''),
          };
        } catch {
          return {
            classe: '',
            ville: '',
            codification_code: '',
            valable_du: '',
            jusqu_au: item,
          };
        }
      }

      return {
        classe: '',
        ville: '',
        codification_code: '',
        valable_du: '',
        jusqu_au: '',
      };
    });
  };

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    setError: setFormFieldError,
    clearErrors,
    formState: { errors },
  } = useForm<DossierEditFormValues>({
    defaultValues: {
      candidat_id: '',
      auto_ecole_id: autoEcoleId || '',
      formation_id: '',
      numero_dossier: '',
      statut: 'en_attente',
      date_creation: new Date().toISOString().split('T')[0],
      commentaires: '',
      // Champs constitutifs (permis / dossier)
      type_demande_id: '',
      referenciel_id: '',
      numero_permis: '',
      numero_origine_permis: '',
      lieu_de_dobtention_du_permis: '',
      date_de_dobtention_du_permis: '',
      date_de_delivrance_du_permis: '',
      expired: false,
      expiration_date: '',
      suspended: false,
      suspended_date: '',
      province_id: '',
      centre_id: '',
      data_categorie: [],
      // Infos candidat (édition)
      candidat_nom: '',
      candidat_prenom: '',
      candidat_genre: '',
      candidat_date_naissance: '',
      candidat_lieu_naissance: '',
      candidat_nationalite: '',
    },
  });

  // Charger les listes nécessaires à l'édition (type de demande, province, centre)
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const load = async () => {
      setLoadingTypeDemandes(true);
      setLoadingProvinces(true);
      setLoadingCentres(true);
      setLoadingReferentielsTypePermis(true);
      setLoadingWorkflowStatuts(true);
      try {
        const [typeResp, provincesResp, centresResp, referentielsPermisResp, statutsResp] = await Promise.all([
          typeDemandeService.getTypeDemandes(1, 1000),
          referentielService.getReferentielsByType('province'),
          referentielService.getReferentielsByType('centre'),
          referentielService.getReferentielsByType('type_permis'),
          statutService.getAll(),
        ]);

        if (cancelled) return;

        const parsedTypeDemandes = Array.isArray((typeResp as any)?.data)
          ? (typeResp as any).data
          : typeof (typeResp as any)?.data === 'object' && (typeResp as any).data
            ? [(typeResp as any).data]
            : Array.isArray(typeResp)
              ? (typeResp as any)
              : [];

        const statutsList: Statut[] = Array.isArray(statutsResp)
          ? statutsResp
          : Array.isArray((statutsResp as any)?.data)
            ? (statutsResp as any).data
            : [];

        setTypeDemandes(parsedTypeDemandes);
        setProvinces(Array.isArray(provincesResp) ? provincesResp : []);
        setCentres(Array.isArray(centresResp) ? centresResp : []);
        setReferentielsTypePermis(Array.isArray(referentielsPermisResp) ? referentielsPermisResp : []);
        setWorkflowStatuts(statutsList);
      } catch (err: any) {
        if (cancelled) return;
        console.error('Erreur chargement listes (typeDemande/province/centre):', err);
        setBannerError(err?.response?.data?.message || err?.message || 'Erreur lors du chargement des listes.');
      } finally {
        if (cancelled) return;
        setLoadingTypeDemandes(false);
        setLoadingProvinces(false);
        setLoadingCentres(false);
        setLoadingReferentielsTypePermis(false);
        setLoadingWorkflowStatuts(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Garantir l'affichage du libellé sélectionné (si l'ID n'est pas présent dans la liste chargée)
  useEffect(() => {
    if (!open || !dossier) return;

    const typeId = (dossier as any).type_demande_id as string | undefined;
    const provinceId = (dossier as any).province_id as string | undefined;
    const centreId = (dossier as any).centre_id as string | undefined;

    let cancelled = false;
    const run = async () => {
      try {
        if (typeId && !typeDemandes.some((t) => t.id === typeId)) {
          const t = await typeDemandeService.getTypeDemandeById(typeId);
          if (!cancelled) setTypeDemandes((prev) => (prev.some((x) => x.id === t.id) ? prev : [...prev, t]));
        }

        if (provinceId && !provinces.some((p) => p.id === provinceId)) {
          const p = await referentielService.getReferentielById(provinceId);
          if (!cancelled) setProvinces((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]));
        }

        if (centreId && !centres.some((c) => c.id === centreId)) {
          const c = await referentielService.getReferentielById(centreId);
          if (!cancelled) setCentres((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
        }
      } catch (err: any) {
        console.error('Erreur chargement libellés sélectionnés:', err);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, dossier, typeDemandes, provinces, centres]);

  // Réinitialiser le formulaire quand le dossier change
  useEffect(() => {
    if (dossier) {
      const rawDataCategorie =
        (dossier as any).data_categorie ?? (dossier as any).dataCategorie ?? (dossier as any).dataCategorie;

      const candidatFromDossier = (dossier as any).candidat as Candidat | undefined;
      setCandidatDetail(candidatFromDossier ?? null);

      reset({
        candidat_id: dossier.candidat_id,
        auto_ecole_id: dossier.auto_ecole_id ?? autoEcoleId ?? '',
        formation_id: dossier.formation_id ?? '',
        numero_dossier: (dossier as any).numero_dossier ?? '',
        statut: dossier.statut,
        date_creation: toDateInputValue(dossier.date_creation),
        commentaires: dossier.commentaires || '',

        // Champs constitutifs
        type_demande_id: (dossier as any).type_demande_id || '',
        referenciel_id: (dossier as any).referenciel_id || '',
        numero_permis: (dossier as any).numero_permis || '',
        numero_origine_permis: (dossier as any).numero_origine_permis || '',
        lieu_de_dobtention_du_permis: (dossier as any).lieu_de_dobtention_du_permis || '',
        date_de_dobtention_du_permis: toDateInputValue((dossier as any).date_de_dobtention_du_permis),
        date_de_delivrance_du_permis: toDateInputValue((dossier as any).date_de_delivrance_du_permis),
        expired: Boolean((dossier as any).expired),
        expiration_date: toDateInputValue((dossier as any).expiration_date),
        suspended: Boolean((dossier as any).suspended),
        suspended_date: toDateInputValue((dossier as any).suspended_date),
        province_id: (dossier as any).province_id || '',
        centre_id: (dossier as any).centre_id || '',

        // Infos candidat (préremplissage)
        candidat_nom: candidatFromDossier?.personne?.nom ?? '',
        candidat_prenom: candidatFromDossier?.personne?.prenom ?? '',
        candidat_genre: candidatFromDossier?.genre ?? '',
        candidat_date_naissance: toDateInputValue(candidatFromDossier?.date_naissance),
        candidat_lieu_naissance: candidatFromDossier?.lieu_naissance ?? '',
        candidat_nationalite: candidatFromDossier?.nationalite ?? '',
      });

      setDataCategorie(normalizeDataCategorie(rawDataCategorie));
      setManualReferentielId(false);
    } else {
      reset({
        candidat_id: '',
        auto_ecole_id: autoEcoleId || '',
        formation_id: '',
        numero_dossier: '',
        statut: 'en_attente',
        date_creation: new Date().toISOString().split('T')[0],
        commentaires: '',

        type_demande_id: '',
        referenciel_id: '',
        numero_permis: '',
        numero_origine_permis: '',
        lieu_de_dobtention_du_permis: '',
        date_de_dobtention_du_permis: '',
        date_de_delivrance_du_permis: '',
        expired: false,
        expiration_date: '',
        suspended: false,
        suspended_date: '',
        province_id: '',
        centre_id: '',
        data_categorie: [],

        candidat_nom: '',
        candidat_prenom: '',
        candidat_genre: '',
        candidat_date_naissance: '',
        candidat_lieu_naissance: '',
        candidat_nationalite: '',
      });

      setDataCategorie([]);
      setCandidatDetail(null);
      setManualReferentielId(false);
    }
  }, [dossier, autoEcoleId, reset]);

  // Si le dossier ne contient pas toutes les infos candidat, charger le candidat
  useEffect(() => {
    if (!open || !dossier?.candidat_id) return;

    const hasMinimal =
      !!(dossier as any)?.candidat?.personne?.nom ||
      !!(dossier as any)?.candidat?.personne?.prenom ||
      !!(dossier as any)?.candidat?.date_naissance ||
      !!(dossier as any)?.candidat?.lieu_naissance;

    if (hasMinimal) return;

    let cancelled = false;
    const load = async () => {
      setLoadingCandidat(true);
      try {
        const c = await autoEcoleService.getCandidatById(dossier.candidat_id);
        if (cancelled) return;
        setCandidatDetail(c);
        reset((prev) => ({
          ...prev,
          candidat_nom: c.personne?.nom ?? '',
          candidat_prenom: c.personne?.prenom ?? '',
          candidat_genre: c.genre ?? '',
          candidat_date_naissance: toDateInputValue(c.date_naissance),
          candidat_lieu_naissance: c.lieu_naissance ?? '',
          candidat_nationalite: c.nationalite ?? '',
        }));
      } catch (err) {
        console.error('Erreur chargement candidat:', err);
      } finally {
        if (!cancelled) setLoadingCandidat(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, dossier?.candidat_id]);

  const submitPerson = async (data: DossierEditFormValues) => {
    setLoading(true);
    setBannerError(null);

    try {
      // 1) Mise à jour candidat (infos personnelles)
      if (dossier?.candidat_id) {
        // 0) Mise à jour de l'utilisateur associé (endpoint /utilisateurs/{utilisateur})
        // Le backend semble nécessiter la mise à jour des infos "utilisateur/personne" avant le dossier.
        const personneFromDossier: any = (dossier as any)?.candidat?.personne;
        const personneFromState: any = (_candidatDetail as any)?.personne;
        const personne = personneFromDossier ?? personneFromState ?? {};

        const utilisateurId: string | undefined =
          (personne?.utilisateur_id as string | undefined) ?? (personne?.utilisateurId as string | undefined);

        if (utilisateurId) {
          const userPayload: any = {
            nom: (data.candidat_nom ?? '').trim(),
            prenom: (data.candidat_prenom ?? '').trim(),
            email: personne?.email ?? undefined,
            personne_email: personne?.email ?? undefined,
            contact: personne?.contact ?? undefined,
            telephone: personne?.telephone ?? personne?.contact ?? undefined,
            adresse: personne?.adresse ?? undefined,
            centre_id: (dossier as any)?.centre_id ?? undefined,
            // role requis par certains backends : on fixe le rôle "candidat"
            role: 'candidat',
          };

          // Enlever les champs vides ('' => undefined)
          Object.keys(userPayload).forEach((k) => {
            const v = userPayload[k];
            if (typeof v === 'string' && !v.trim()) userPayload[k] = undefined;
          });

          try {
            await userService.updateUser(utilisateurId, userPayload as any);
          } catch (err: any) {
            throw new Error(
              err?.response?.data?.message ||
                err?.message ||
                'Erreur lors de la mise à jour de l\'utilisateur associé.'
            );
          }
        }

        const candidatPayload: any = {
          date_naissance: toIsoStringFromDateInput(data.candidat_date_naissance) ?? data.candidat_date_naissance,
          lieu_naissance: (data.candidat_lieu_naissance ?? '').trim(),
          genre: (data.candidat_genre ?? '').trim(),
          nationalite: (data.candidat_nationalite ?? '').trim(),
          personne: {
            nom: (data.candidat_nom ?? '').trim(),
            prenom: (data.candidat_prenom ?? '').trim(),
          },
        };

        // Ne pas envoyer objet personne vide (si l'utilisateur n'a rien saisi)
        if (!candidatPayload.personne.nom && !candidatPayload.personne.prenom) {
          delete candidatPayload.personne;
        }

        try {
          await autoEcoleService.updateCandidat(dossier.candidat_id, candidatPayload);
        } catch (err: any) {
          // On stoppe ici : l'utilisateur veut être sûr que les infos perso sont bien enregistrées
          throw new Error(
            err?.response?.data?.message || err?.message || 'Erreur lors de la mise à jour du candidat.'
          );
        }
      }

      // Après la mise à jour de la personne, on recharge le dossier
      if (dossier) {
        const refreshed = await autoEcoleService.getDossierById(dossier.id);
        onSuccess(refreshed);
      }
    } catch (err: any) {
      console.error('Erreur lors de la soumission:', err);
      setBannerError(
        err.response?.data?.message || 
        err.message || 
        'Une erreur est survenue lors de la sauvegarde'
      );
    } finally {
      setLoading(false);
    }
  };

  const submitDossier = async (data: DossierEditFormValues) => {
    setLoading(true);
    setBannerError(null);
    clearErrors('numero_origine_permis');

    const typeId = data.type_demande_id;
    let typeName =
      typeDemandes.find((t) => t.id === typeId)?.name?.trim() ?? '';
    if (
      !typeName &&
      dossier?.type_demande_id === typeId &&
      dossier?.type_demande?.name
    ) {
      typeName = dossier.type_demande.name.trim();
    }
    if (checkIsFicheEnregistre(typeName) && !String(data.numero_origine_permis ?? '').trim()) {
      setFormFieldError('numero_origine_permis', {
        type: 'manual',
        message:
          'Le numéro de permis d’origine est manquant : veuillez le compléter (obligatoire pour une fiche d’enregistrement).',
      });
      setLoading(false);
      return;
    }

    try {
      // 2) Mise à jour dossier
      const payload = {
        ...data,
        data_categorie: dataCategorie,
      } as Partial<DossierFormData>;
      // Retirer les champs candidat (non attendus par /dossiers/{id})
      delete (payload as any).candidat_nom;
      delete (payload as any).candidat_prenom;
      delete (payload as any).candidat_genre;
      delete (payload as any).candidat_date_naissance;
      delete (payload as any).candidat_lieu_naissance;
      delete (payload as any).candidat_nationalite;

      // Normaliser les numéros de permis (stockage backend sans tirets)
      if (payload.numero_permis) {
        payload.numero_permis = String(payload.numero_permis).replace(/-/g, '');
      }
      if (payload.numero_origine_permis) {
        payload.numero_origine_permis = String(payload.numero_origine_permis).replace(/-/g, '');
      }

      // Convertir les dates "YYYY-MM-DD" en ISO (comme sur la création)
      payload.date_de_dobtention_du_permis = toIsoStringFromDateInput(
        data.date_de_dobtention_du_permis
      );
      payload.date_de_delivrance_du_permis = toIsoStringFromDateInput(data.date_de_delivrance_du_permis);

      payload.expiration_date = toIsoStringFromDateInput(data.expiration_date);
      payload.suspended_date = toIsoStringFromDateInput(data.suspended_date);

      // Éviter d'envoyer des GUID vides vers le backend
      if (typeof payload.type_demande_id === 'string' && !payload.type_demande_id.trim()) {
        payload.type_demande_id = undefined;
      }
      if (typeof payload.referenciel_id === 'string' && !payload.referenciel_id.trim()) {
        payload.referenciel_id = undefined;
      }
      if (typeof payload.auto_ecole_id === 'string' && !payload.auto_ecole_id.trim()) {
        payload.auto_ecole_id = undefined;
      }
      if (typeof payload.formation_id === 'string' && !payload.formation_id.trim()) {
        payload.formation_id = undefined;
      }
      if (typeof payload.province_id === 'string' && !payload.province_id.trim()) {
        payload.province_id = undefined;
      }
      if (typeof payload.centre_id === 'string' && !payload.centre_id.trim()) {
        payload.centre_id = undefined;
      }

      if (dossier) {
        const response = await autoEcoleService.updateDossier(dossier.id, payload);
        if (response.success) onSuccess(response.data);
        else setBannerError(response.message || 'Une erreur est survenue');
      } else {
        // Création
        const response = await autoEcoleService.createDossier(payload as any);
        if (response.success) onSuccess(response.data);
        else setBannerError(response.message || 'Une erreur est survenue');
      }
    } catch (err: any) {
      console.error('Erreur lors de la soumission:', err);
      setBannerError(err.response?.data?.message || err.message || 'Une erreur est survenue lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setDataCategorie([]);
    setBannerError(null);
    onCancel();
  };

  const selectedProvinceId = watch('province_id');
  const selectedCentreId = watch('centre_id');

  const selectedAutoEcoleId = watch('auto_ecole_id');
  const selectedFormationId = watch('formation_id');
  const selectedReferentielId = watch('referenciel_id');
  const watchedTypeDemandeId = watch('type_demande_id');

  const applyCnepcFromReferenciel = useCallback(
    async (referencielId: string) => {
      const refId = String(referencielId ?? '').trim();
      if (!refId) return;

      const resolved = await autoEcoleService.resolveCnepcForReferenciel(refId);
      if (!resolved) return;

      let bundle = cnepcBundleRef.current;
      if (!bundle || bundle.autoEcole.id !== resolved.autoEcole.id) {
        bundle = await autoEcoleService.getCnepcAutoEcole();
        if (bundle) setCnepcBundle(bundle);
      }

      setAutoEcoles((prev) =>
        prev.some((ae) => ae.id === resolved.autoEcole.id) ? prev : [...prev, resolved.autoEcole]
      );

      const formationList =
        bundle?.formations.length ? bundle.formations : [resolved.formation];
      setFormations(formationList);

      setValue('auto_ecole_id', resolved.autoEcole.id, { shouldValidate: true });
      setValue('formation_id', resolved.formation.id, { shouldValidate: true });
    },
    [setValue]
  );

  // Liste des statuts dossier alignée sur le circuit (mêmes libellés que la réception / TraitementEtapeContenu + EN_ATTENTE_PAIEMENT, DOSSIER ENVOYER).
  useEffect(() => {
    if (!open) {
      setCircuitStatutOptions([]);
      setCircuitStatutsTried(false);
      return;
    }

    const typeName =
      typeDemandes.find((t) => t.id === watchedTypeDemandeId)?.name?.trim() ||
      (dossier as any)?.type_demande?.name?.trim() ||
      '';

    if (!typeName) {
      setCircuitStatutOptions([]);
      setCircuitStatutsTried(true);
      return;
    }

    const dossierId = dossier?.id;
    let cancelled = false;
    setCircuitStatutsTried(false);
    setLoadingCircuitStatuts(true);

    void (async () => {
      try {
        const circuit = await circuitSuiviService.getCircuitByNomEntite(typeName);
        if (cancelled) return;
        if (!circuit?.id) {
          setCircuitStatutOptions([]);
          return;
        }
        const etapes = await circuitSuiviService.getEtapesByCircuitId(circuit.id, dossierId);
        if (cancelled) return;
        const libelles = etapes.map((e) => (e.libelle ?? '').trim()).filter(Boolean);
        setCircuitStatutOptions(buildCircuitDossierStatutOptions(libelles));
      } catch (err) {
        console.error('Erreur chargement étapes circuit pour statuts dossier:', err);
        if (!cancelled) setCircuitStatutOptions([]);
      } finally {
        setLoadingCircuitStatuts(false);
        setCircuitStatutsTried(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    dossier?.id,
    (dossier as any)?.type_demande?.name,
    dossier?.type_demande_id,
    watchedTypeDemandeId,
    typeDemandes,
  ]);

  // Quand le circuit fournit les libellés, rapprocher la valeur du formulaire du libellé d’étape (comme useEtapeCompletion : préfixe « libelle - … »).
  useEffect(() => {
    if (!open || !dossier || circuitStatutOptions.length === 0) return;
    const raw = String(dossier.statut ?? '').trim();
    if (!raw) return;
    const norm = (s: string) => s.trim().toLowerCase();
    const nRaw = norm(raw);
    const exact = circuitStatutOptions.find((o) => norm(o) === nRaw);
    const prefix = circuitStatutOptions.find((o) => {
      const no = norm(o);
      return no && (nRaw === no || nRaw.startsWith(`${no} `) || nRaw.startsWith(`${no}-`) || nRaw.startsWith(`${no}–`));
    });
    const pick = exact ?? prefix;
    if (pick) {
      const current = getValues('statut');
      if (current !== pick) {
        setValue('statut', pick as DossierEditFormValues['statut'], {
          shouldValidate: false,
          shouldDirty: false,
        });
      }
    }
  }, [open, dossier?.id, dossier?.statut, circuitStatutOptions, getValues, setValue]);

  // Repli : aligner sur /workflow/statuts seulement si aucun libellé circuit n’est disponible.
  useEffect(() => {
    if (!open || !dossier || workflowStatuts.length === 0) return;
    if (!circuitStatutsTried) return;
    if (circuitStatutOptions.length > 0) return;
    const raw = String(dossier.statut ?? '').trim();
    if (!raw) return;
    const resolved = resolveStatutToWorkflowLibelle(raw, workflowStatuts);
    if (!resolved) return;
    const current = getValues('statut');
    if (resolved !== current) {
      setValue('statut', resolved as DossierEditFormValues['statut'], {
        shouldValidate: false,
        shouldDirty: false,
      });
    }
  }, [
    open,
    dossier?.id,
    dossier?.statut,
    workflowStatuts,
    circuitStatutOptions.length,
    circuitStatutsTried,
    getValues,
    setValue,
  ]);

  // Auto-école CNEPC (+ auto-école courante du dossier si différente) — GET /auto-ecoles/cnepc
  useEffect(() => {
    if (!open) {
      setCnepcBundle(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingAutoEcoles(true);
      try {
        const bundle = await autoEcoleService.getCnepcAutoEcole();
        if (cancelled) return;

        setCnepcBundle(bundle);
        const list: AutoEcole[] = bundle?.autoEcole ? [bundle.autoEcole] : [];

        const currentId = (dossier?.auto_ecole_id ?? autoEcoleId ?? '').trim();
        if (currentId && !list.some((ae) => ae.id === currentId)) {
          try {
            const currentAe = await autoEcoleService.getAutoEcoleById(currentId);
            if (!cancelled) list.push(currentAe);
          } catch {
            /* MenuItem de repli avec l’id seul */
          }
        }

        if (!list.length) {
          const aeList: unknown = await autoEcoleService.getAllAutoEcoles();
          if (!cancelled) setAutoEcoles(Array.isArray(aeList) ? (aeList as AutoEcole[]) : []);
        } else if (!cancelled) {
          setAutoEcoles(list);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Erreur chargement auto-écoles CNEPC:', err);
          try {
            const aeList: unknown = await autoEcoleService.getAllAutoEcoles();
            if (!cancelled) setAutoEcoles(Array.isArray(aeList) ? (aeList as AutoEcole[]) : []);
          } catch (fallbackErr) {
            console.error('Erreur chargement auto-écoles (secours):', fallbackErr);
          }
        }
      } finally {
        if (!cancelled) setLoadingAutoEcoles(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, dossier?.auto_ecole_id, dossier?.id, autoEcoleId]);

  // Formations : bundle CNEPC si auto-école CNEPC, sinon GET /formations
  useEffect(() => {
    if (!open || !selectedAutoEcoleId) return;

    const cnepcId = cnepcBundle?.autoEcole.id;
    if (cnepcId && selectedAutoEcoleId === cnepcId && cnepcBundle.formations.length > 0) {
      setFormations(cnepcBundle.formations);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingFormations(true);
      try {
        const list = await autoEcoleService.getFormationsByAutoEcole(selectedAutoEcoleId);
        if (cancelled) return;
        setFormations(Array.isArray(list) ? list : []);

        if (selectedFormationId && Array.isArray(list) && !list.some((f: { id: string }) => f.id === selectedFormationId)) {
          setValue('formation_id', '');
        }
      } catch (err) {
        if (!cancelled) console.error('Erreur chargement formations:', err);
      } finally {
        if (!cancelled) setLoadingFormations(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, selectedAutoEcoleId, selectedFormationId, setValue, cnepcBundle]);

  // À l’ouverture : aligner auto-école / formation sur le référentiel via CNEPC si incomplet
  useEffect(() => {
    if (!open || !dossier) return;
    const refId = String((dossier as { referenciel_id?: string }).referenciel_id ?? '').trim();
    if (!refId) return;
    if (dossier.auto_ecole_id?.trim() && dossier.formation_id?.trim()) return;

    let cancelled = false;
    void applyCnepcFromReferenciel(refId).finally(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [open, dossier?.id, dossier?.auto_ecole_id, dossier?.formation_id, applyCnepcFromReferenciel]);

  // Garder referenciel_id cohérent avec la formation sélectionnée
  useEffect(() => {
    if (!open || !selectedFormationId) return;

    if (manualReferentielId) return;

    const f: any = formations.find((x) => x.id === selectedFormationId);
    const nextRef = f?.type_permis_id ?? f?.typePermisId ?? f?.type_permis?.id ?? f?.typePermis?.id;

    if (nextRef && nextRef !== selectedReferentielId) {
      setValue('referenciel_id', nextRef);
    }
  }, [open, selectedFormationId, formations, selectedReferentielId, setValue, manualReferentielId]);

  return (
    <Dialog open={open} onClose={handleClose} fullScreen>
      <AppBar sx={{ position: 'sticky' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="fermer">
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            {dossier ? 'Modifier le dossier' : 'Créer un dossier de candidature'}
          </Typography>
        </Toolbar>
      </AppBar>
      
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit(submitDossier)} sx={{ mt: 2 }}>
          {bannerError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {bannerError}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={700}>
                Informations du candidat
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ces champs mettent à jour le candidat via <code>/candidats/{'{id}'}</code>.
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="candidat_nom"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nom"
                    fullWidth
                    disabled={loading || loadingCandidat}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="candidat_prenom"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Prénom"
                    fullWidth
                    disabled={loading || loadingCandidat}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="candidat_genre"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth disabled={loading || loadingCandidat}>
                    <InputLabel id="candidat-genre-label">Genre</InputLabel>
                    <Select
                      {...field}
                      labelId="candidat-genre-label"
                      label="Genre"
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Non renseigné</em>
                      </MenuItem>
                      <MenuItem value="M">Masculin</MenuItem>
                      <MenuItem value="F">Féminin</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="candidat_date_naissance"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date de naissance"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    disabled={loading || loadingCandidat}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="candidat_lieu_naissance"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Lieu de naissance"
                    fullWidth
                    disabled={loading || loadingCandidat}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="candidat_nationalite"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nationalité"
                    fullWidth
                    disabled={loading || loadingCandidat}
                    placeholder="Ex. Sénégalaise"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            {/* Champs IDs gardés en état mais masqués (pour l'update côté backend). */}
            <Grid item xs={12} sm={6} sx={{ display: 'none' }}>
              <Controller
                name="candidat_id"
                control={control}
                rules={{ required: 'Le candidat est requis' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="hidden"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={700}>
                Auto-école & Formation
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="auto_ecole_id"
                    control={control}
                    rules={{ required: 'L\'auto-école est requise' }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.auto_ecole_id}>
                        <InputLabel id="auto-ecole-select-label">Auto-école</InputLabel>
                        <Select
                          {...field}
                          labelId="auto-ecole-select-label"
                          label="Auto-école"
                          disabled={loadingAutoEcoles}
                        >
                          {loadingAutoEcoles ? (
                            <MenuItem disabled>Chargement...</MenuItem>
                          ) : autoEcoles.length === 0 ? (
                            <MenuItem disabled>Aucune auto-école</MenuItem>
                          ) : (
                            autoEcoles
                              .slice()
                              .sort((a: any, b: any) =>
                                String(a.nom_auto_ecole || a.id).localeCompare(String(b.nom_auto_ecole || b.id))
                              )
                              .map((ae) => (
                                <MenuItem key={ae.id} value={ae.id}>
                                  {ae.nom_auto_ecole}
                                </MenuItem>
                              ))
                          )}
                          {selectedAutoEcoleId &&
                            !autoEcoles.some((ae) => ae.id === selectedAutoEcoleId) && (
                              <MenuItem value={selectedAutoEcoleId}>{selectedAutoEcoleId}</MenuItem>
                            )}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="formation_id"
                    control={control}
                    rules={{ required: 'La formation est requise' }}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.formation_id}>
                        <InputLabel id="formation-select-label">Formation</InputLabel>
                        <Select
                          {...field}
                          labelId="formation-select-label"
                          label="Formation"
                          disabled={loadingFormations}
                        >
                          {loadingFormations ? (
                            <MenuItem disabled>Chargement...</MenuItem>
                          ) : formations.length === 0 ? (
                            <MenuItem disabled>Aucune formation</MenuItem>
                          ) : (
                            formations.map((f) => (
                              <MenuItem key={f.id} value={f.id}>
                                {getFormationLabel(f)}
                                {(() => {
                                  const price = getFormationPrice(f);
                                  return price ? <> - {price} CFA</> : null;
                                })()}
                              </MenuItem>
                            ))
                          )}
                          {selectedFormationId &&
                            !formations.some((f) => f.id === selectedFormationId) && (
                              <MenuItem value={selectedFormationId}>{selectedFormationId}</MenuItem>
                            )}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="numero_dossier"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Numéro de dossier"
                    fullWidth
                    error={!!errors.numero_dossier}
                    helperText={errors.numero_dossier?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="statut"
                control={control}
                rules={{ required: 'Le statut est requis' }}
                render={({ field }) => {
                  const useCircuitList = circuitStatutOptions.length > 0;
                  const sortedWorkflow = [...workflowStatuts]
                    .filter((s) => (s.libelle ?? '').trim() !== '')
                    .sort((a, b) => (a.libelle || '').localeCompare(b.libelle || '', 'fr'));
                  const sortedCircuit = [...circuitStatutOptions];
                  const sorted = useCircuitList ? sortedCircuit : sortedWorkflow.map((s) => s.libelle);
                  const valueInList = useCircuitList
                    ? sorted.some((lib) => lib === field.value)
                    : sortedWorkflow.some((s) => s.libelle === field.value);
                  const selectLoading =
                    useCircuitList
                      ? loadingCircuitStatuts && sorted.length === 0
                      : loadingWorkflowStatuts && sortedWorkflow.length === 0;
                  return (
                    <FormControl fullWidth error={!!errors.statut}>
                      <InputLabel>Statut (circuit dossier)</InputLabel>
                      <Select
                        {...field}
                        label="Statut (circuit dossier)"
                        disabled={selectLoading || !canEditStatutField}
                      >
                        {!valueInList && field.value ? (
                          <MenuItem value={field.value}>
                            {formatWorkflowStatutLabel(field.value)}
                          </MenuItem>
                        ) : null}
                        {useCircuitList
                          ? sorted.map((lib) => (
                              <MenuItem key={lib} value={lib}>
                                {formatWorkflowStatutLabel(lib)}
                              </MenuItem>
                            ))
                          : sortedWorkflow.map((s) => (
                              <MenuItem key={s.id} value={s.libelle}>
                                {formatWorkflowStatutLabel(s.libelle)}
                              </MenuItem>
                            ))}
                      </Select>
                      {!canEditStatutField && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Réservé aux rôles administrateur et archivage.
                        </Typography>
                      )}
                      {errors.statut && (
                        <Typography variant="caption" color="error">
                          {errors.statut.message}
                        </Typography>
                      )}
                    </FormControl>
                  );
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="date_creation"
                control={control}
                rules={{ required: 'La date de création est requise' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date de création"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.date_creation}
                    helperText={errors.date_creation?.message}
                    required
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="commentaires"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Commentaires"
                    fullWidth
                    multiline
                    rows={3}
                    error={!!errors.commentaires}
                    helperText={errors.commentaires?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Éléments constitutifs du dossier
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="type_demande_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel id="type-demande-select-label">Type de demande</InputLabel>
                    <Select
                      {...field}
                      labelId="type-demande-select-label"
                      label="Type de demande"
                      disabled={loadingTypeDemandes}
                    >
                      {loadingTypeDemandes ? (
                        <MenuItem disabled>Chargement...</MenuItem>
                      ) : typeDemandes.length === 0 ? (
                        <MenuItem disabled>Aucun type de demande</MenuItem>
                      ) : (
                        typeDemandes.map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="referenciel_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.referenciel_id}>
                    <InputLabel id="referentiel-select-label">Référentiel (type permis)</InputLabel>
                    <Select
                      {...field}
                      labelId="referentiel-select-label"
                      label="Référentiel (type permis)"
                      disabled={loadingReferentielsTypePermis}
                      onChange={(e) => {
                        setManualReferentielId(true);
                        field.onChange(e);
                        void applyCnepcFromReferenciel(String(e.target.value));
                      }}
                    >
                      {loadingReferentielsTypePermis ? (
                        <MenuItem disabled>Chargement...</MenuItem>
                      ) : referentielsTypePermis.length === 0 ? (
                        <MenuItem disabled>Aucun référentiel</MenuItem>
                      ) : (
                        referentielsTypePermis
                          .slice()
                          .sort((a, b) => String(a.libelle || a.code || a.id).localeCompare(String(b.libelle || b.code || b.id)))
                          .map((r) => (
                            <MenuItem key={r.id} value={r.id}>
                              {r.libelle || r.code || r.id}
                            </MenuItem>
                          ))
                      )}
                      {selectedReferentielId &&
                        !referentielsTypePermis.some((r) => r.id === selectedReferentielId) && (
                          <MenuItem value={selectedReferentielId}>{selectedReferentielId}</MenuItem>
                        )}
                    </Select>
                    {errors.referenciel_id && (
                      <Typography variant="caption" color="error">
                        {errors.referenciel_id.message as any}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="numero_permis"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Numéro de permis"
                    fullWidth
                    helperText={errors.numero_permis?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="numero_origine_permis"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Numéro d'origine du permis"
                    fullWidth
                    error={!!errors.numero_origine_permis}
                    helperText={errors.numero_origine_permis?.message}
                    onChange={(e) => {
                      clearErrors('numero_origine_permis');
                      field.onChange(e);
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="lieu_de_dobtention_du_permis"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Lieu de obtention du permis"
                    fullWidth
                    helperText={errors.lieu_de_dobtention_du_permis?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="province_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel id="province-select-label">Province</InputLabel>
                    <Select
                      {...field}
                      labelId="province-select-label"
                      label="Province"
                      disabled={loadingProvinces}
                    >
                      {loadingProvinces ? (
                        <MenuItem disabled>Chargement...</MenuItem>
                      ) : provinces.length === 0 ? (
                        <MenuItem disabled>Aucune province</MenuItem>
                      ) : (
                        provinces.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.libelle}
                          </MenuItem>
                        ))
                      )}
                      {selectedProvinceId &&
                        !provinces.some((p) => p.id === selectedProvinceId) && (
                          <MenuItem value={selectedProvinceId}>{selectedProvinceId}</MenuItem>
                        )}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="centre_id"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel id="centre-select-label">Centre</InputLabel>
                    <Select
                      {...field}
                      labelId="centre-select-label"
                      label="Centre"
                      disabled={loadingCentres}
                    >
                      {loadingCentres ? (
                        <MenuItem disabled>Chargement...</MenuItem>
                      ) : centres.length === 0 ? (
                        <MenuItem disabled>Aucun centre</MenuItem>
                      ) : (
                        centres.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.libelle}
                          </MenuItem>
                        ))
                      )}
                      {selectedCentreId &&
                        !centres.some((c) => c.id === selectedCentreId) && (
                          <MenuItem value={selectedCentreId}>{selectedCentreId}</MenuItem>
                        )}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="date_de_dobtention_du_permis"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date de obtention du permis"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText={errors.date_de_dobtention_du_permis?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="date_de_delivrance_du_permis"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date de délivrance du permis"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText={errors.date_de_delivrance_du_permis?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="expired"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="expired"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="expiration_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="expiration_date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    disabled={!watch('expired')}
                    helperText={errors.expiration_date?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="suspended"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="suspended"
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="suspended_date"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="suspended_date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    disabled={!watch('suspended')}
                    helperText={errors.suspended_date?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
                Data catégorie (data_categorie)
              </Typography>

              <Table size="small" sx={{ backgroundColor: 'white', borderRadius: 1, overflow: 'hidden' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Classe</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Ville</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Valable du</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Jusqu&apos;au</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dataCategorie.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>
                        Aucune donnée enregistrée
                      </TableCell>
                    </TableRow>
                  ) : (
                    dataCategorie.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.classe}
                            onChange={(e) => {
                              const next = [...dataCategorie];
                              next[idx] = { ...next[idx], classe: e.target.value };
                              setDataCategorie(next);
                            }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.ville}
                            onChange={(e) => {
                              const next = [...dataCategorie];
                              next[idx] = { ...next[idx], ville: e.target.value };
                              setDataCategorie(next);
                            }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.codification_code}
                            onChange={(e) => {
                              const next = [...dataCategorie];
                              next[idx] = { ...next[idx], codification_code: e.target.value };
                              setDataCategorie(next);
                            }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="date"
                            value={toDateInputValue(item.valable_du)}
                            onChange={(e) => {
                              const next = [...dataCategorie];
                              next[idx] = { ...next[idx], valable_du: e.target.value };
                              setDataCategorie(next);
                            }}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="date"
                            value={toDateInputValue(item.jusqu_au)}
                            onChange={(e) => {
                              const next = [...dataCategorie];
                              next[idx] = { ...next[idx], jusqu_au: e.target.value };
                              setDataCategorie(next);
                            }}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            color="error"
                            onClick={() => setDataCategorie((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            Supprimer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <Box sx={{ mt: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() =>
                    setDataCategorie((prev) => [
                      ...prev,
                      { classe: '', ville: '', codification_code: '', valable_du: '', jusqu_au: '' },
                    ])
                  }
                >
                  Ajouter une ligne
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit(submitPerson)}
          variant="outlined"
          disabled={loading || !dossier}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Chargement...' : 'Modifier la personne'}
        </Button>
        <Button
          onClick={handleSubmit(submitDossier)}
          variant="contained"
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? 'Sauvegarde...' : (dossier ? 'Modifier le dossier' : 'Créer')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DossierForm;
