import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  FormControlLabel,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  CircularProgress,
  Button,
  Select,
  MenuItem,
  InputLabel,
  Divider,
  Alert,
  Dialog,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Checkbox,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Paper,
  AppBar,
  Toolbar,
} from '@mui/material';
import { Verified, CheckCircle, Info, Fingerprint, ConfirmationNumber, Close } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { NumeroPermisParts, PermisFormatType } from '../types';
import { buildNumeroPermis } from '../utils';
import { dgdiService, isDgdiServiceUnavailableMessage } from '../../services';

/** Permis retourné par l’API getChangePermis */
export interface PermisFromApi {
  id?: string;
  numero_identite?: string;
  nom?: string;
  prenom?: string;
  sexe?: string;
  nationalite?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  numero_permis: string;
  type_permis?: string;
  categorie?: string;
  date_obtention?: string;
  lieu_obtention?: string;
  date_validite?: string;
  numero_origine_permis?: string;
  lieu_origine?: string;
  date_renou1?: string | null;
  date_renou2?: string | null;
  date_renou3?: string | null;
  [key: string]: unknown;
}

/** Élément du champ data_categorie du dossier */
export interface DataCategorieItem {
  classe: string;
  ville: string;
  codification_code: string;
  valable_du: string;
  jusqu_au: string;
}

export function permisToDataCategorieItem(p: PermisFromApi): DataCategorieItem {
  const formatDate = (d: string | undefined): string => {
    if (!d) return '';
    const s = d.split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : (() => { try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; } })();
  };
  const capitalizeVille = (s: string | undefined): string => {
    if (!s || !s.trim()) return '';
    return s.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };
  return {
    classe: (p.categorie || '').trim(),
    ville: capitalizeVille(p.lieu_obtention),
    codification_code: (p.numero_permis || '').trim() || '',
    valable_du: formatDate(p.date_obtention),
    jusqu_au: formatDate(p.date_validite),
  };
}

interface NumeroPermisStepProps {
  numeroPermisParts: NumeroPermisParts;
  isFicheEnregistre: boolean;
  loading: boolean;
  format: PermisFormatType;
  verifyingPermis?: boolean;
  permisVerified?: boolean;
  verificationError?: string | null;
  availableCategories?: string[];
  candidatNonTrouve?: boolean;
  personneData?: { nom?: string; prenom?: string };
  candidatData?: { date_naissance?: string; lieu_naissance?: string; numero_piece?: string; numero_identite?: string };
  onNumeroPermisPartsChange: (parts: NumeroPermisParts) => void;
  onFormatChange: (format: PermisFormatType) => void;
  onVerifyPermis?: () => void;
  onVerifyPermisByIdentity?: (nom: string, prenom: string, dateNaissance: string) => void;
  identitySearchNomForRefinement?: string | null;
  onClearIdentitySearchRefinement?: () => void;
  /** Liste des permis retournés par l’API (plusieurs permis pour l’utilisateur) → ouvre le modal de sélection */
  permisListForSelection?: PermisFromApi[] | null;
  /** Numéro de permis recherché (pour pré-sélectionner le permis correspondant) */
  numPermisRecherche?: string;
  /** Callback après sélection des permis : permis principal (pour remplir le formulaire) + data_categorie pour le dossier */
  onPermisSelectionConfirm?: (principalPermis: PermisFromApi, dataCategorie: DataCategorieItem[]) => void;
  /** Fermeture du modal sans valider */
  onPermisSelectionClose?: () => void;
  /** Remonte l'état global de validation de l'étape */
  onValidationStateChange?: (state: {
    dgdiVerified: boolean;
    /** Contournement DGDI (service indisponible) — équivalent validé pour passer à l’étape permis */
    dgdiBypassDueToService: boolean;
    permisVerified: boolean;
    identityRequired: boolean;
    identityComplete: boolean;
    isStepValid: boolean;
  }) => void;
  /** Synchroniser les données d'identité vers le parent */
  onIdentityDataChange?: (data: {
    nom: string;
    prenom: string;
    dateNaissance: string;
    lieuNaissance: string;
    numeroIdentite: string;
  }) => void;
  /** État DGDI issu du contexte (brouillon) — réhydratation au retour sur l’étape */
  persistedNumeroPermisDgdi?: { verified: boolean; bypass: boolean };
  onPersistNumeroPermisDgdi?: (state: { verified: boolean; bypass: boolean }) => void;
}

const normalizeNumeroForCompare = (num: string): string =>
  (num || '').replace(/-/g, '').toUpperCase().trim();

export const NumeroPermisStep: React.FC<NumeroPermisStepProps> = ({
  numeroPermisParts,
  isFicheEnregistre: _isFicheEnregistre,
  loading,
  format,
  verifyingPermis = false,
  permisVerified = false,
  verificationError = null,
  availableCategories = [],
  candidatNonTrouve = false,
  personneData,
  candidatData,
  onNumeroPermisPartsChange,
  onFormatChange,
  onVerifyPermis,
  onVerifyPermisByIdentity,
  identitySearchNomForRefinement = null,
  onClearIdentitySearchRefinement,
  permisListForSelection = null,
  numPermisRecherche = '',
  onPermisSelectionConfirm,
  onPermisSelectionClose,
  onValidationStateChange,
  onIdentityDataChange,
  persistedNumeroPermisDgdi,
  onPersistNumeroPermisDgdi,
}) => {
  const numPermisComplet = buildNumeroPermis(numeroPermisParts, format);

  // Modal de sélection des permis (quand l’API renvoie plusieurs permis)
  const [selectedPermisIds, setSelectedPermisIds] = useState<Set<string>>(new Set());
  const openPermisModal = Boolean(permisListForSelection && permisListForSelection.length > 0);

  useEffect(() => {
    if (!permisListForSelection?.length || !numPermisRecherche) return;
    const searchNorm = normalizeNumeroForCompare(numPermisRecherche);
    const toSelect = new Set<string>();
    permisListForSelection.forEach((p) => {
      const id = (p.id ?? p.numero_permis ?? '').toString();
      if (id && normalizeNumeroForCompare(p.numero_permis || '') === searchNorm) toSelect.add(id);
    });
    if (toSelect.size === 0 && permisListForSelection.length === 1) {
      const p = permisListForSelection[0];
      toSelect.add((p.id ?? p.numero_permis ?? '').toString());
    }
    setSelectedPermisIds(toSelect);
  }, [permisListForSelection, numPermisRecherche]);

  const handleTogglePermis = (id: string) => {
    setSelectedPermisIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmPermisSelection = () => {
    if (!permisListForSelection?.length) return;
    const selected = permisListForSelection.filter((p) =>
      selectedPermisIds.has((p.id ?? p.numero_permis ?? '').toString())
    );
    if (selected.length === 0) return;
    const dataCategorie = selected.map(permisToDataCategorieItem);
    const searchNorm = normalizeNumeroForCompare(numPermisRecherche);
    const principal =
      selected.find((p) => normalizeNumeroForCompare(p.numero_permis || '') === searchNorm) || selected[0];

    // Pré-remplir immédiatement le formulaire d'identité avec les données sélectionnées,
    // sans attendre le retour/propagation du contexte parent.
    const immediateIdentityData = {
      nom: principal.nom || '',
      prenom: principal.prenom || '',
      dateNaissance: principal.date_naissance ? String(principal.date_naissance).split('T')[0] : '',
      lieuNaissance: principal.lieu_naissance || '',
      numeroIdentite: principal.numero_identite || '',
    };
    updateIdentityData(immediateIdentityData);

    const canAutoLock =
      !!immediateIdentityData.nom.trim() &&
      !!immediateIdentityData.prenom.trim() &&
      !!immediateIdentityData.dateNaissance.trim();
    setIsAutocompleted(canAutoLock);

    // Si des champs d'identité sont incomplets, on force l'ouverture du formulaire.
    if (!immediateIdentityData.dateNaissance || !immediateIdentityData.numeroIdentite) {
      setShowIdentityVerification(true);
    }

    onPermisSelectionConfirm?.(principal, dataCategorie);
    setSelectedPermisIds(new Set());
  };

  const handleClosePermisModal = () => {
    setSelectedPermisIds(new Set());
    onPermisSelectionClose?.();
  };

  // Types de pièce d'identité pour la vérification DGDI (comme InscriptionFormationForm)
  const TYPES_PIECE_DGDI: { value: string; label: string }[] = [
    { value: 'Passeport', label: 'Passeport' },
    { value: 'CNI', label: "Carte d'identité" },
    { value: 'Carte_sejour', label: 'Carte de séjour' },
    { value: 'Carte_resident', label: 'Carte de résident' },
  ];
  const REGEX_PASSEPORT = /^[0-9]{2}[A-Z]{2}[0-9]{5}$/;
  const PASSEPORT_PLACEHOLDER = 'Ex: 25PP15842';
  const PASSEPORT_HELPER = 'Format : 2 chiffres, 2 lettres majuscules, 5 chiffres (ex: 25PP15842)';

  // État vérification DGDI (pièce d'identité) - étape 1, avant vérification permis
  const [typePiece, setTypePiece] = useState<string>('CNI');
  const [numeroPiece, setNumeroPiece] = useState<string>('');
  const [dgdiVerifying, setDgdiVerifying] = useState(false);
  const [dgdiVerified, setDgdiVerified] = useState(
    () => Boolean(persistedNumeroPermisDgdi?.verified)
  );
  /** Service DGDI indisponible (503/502/504) : on autorise la suite (vérification permis) */
  const [dgdiBypassDueToService, setDgdiBypassDueToService] = useState(
    () => Boolean(persistedNumeroPermisDgdi?.bypass) && !persistedNumeroPermisDgdi?.verified
  );
  const [dgdiError, setDgdiError] = useState<string | null>(null);
  const [dgdiSuccessMessage, setDgdiSuccessMessage] = useState<string | null>(null);

  const resetDgdiStatusIfNeeded = () => {
    if (dgdiVerified || dgdiError || dgdiBypassDueToService) {
      setDgdiVerified(false);
      setDgdiBypassDueToService(false);
      setDgdiSuccessMessage(null);
      setDgdiError(null);
      onPersistNumeroPermisDgdi?.({ verified: false, bypass: false });
    }
  };

  const handleVerifyDgdi = async (tp: string, num: string) => {
    setDgdiError(null);
    let numero = (num ?? '').trim();
    if (tp === 'Passeport' && numero) {
      const normalized = numero.replace(/^(\d{2})([a-zA-Z]{2})(\d{5})$/, (_, a, b, c) => a + b.toUpperCase() + c);
      if (!REGEX_PASSEPORT.test(normalized)) {
        setDgdiError('Le numéro de passeport doit respecter le format : 2 chiffres, 2 lettres, 5 chiffres (ex: 25PP15842).');
        return;
      }
      setNumeroPiece(normalized);
      numero = normalized;
    }
    setDgdiVerifying(true);
    setDgdiBypassDueToService(false);
    try {
      const result = await dgdiService.verifyPieceIdentite(tp, numero);
      if (result.success) {
        setDgdiVerified(true);
        setDgdiBypassDueToService(false);
        onPersistNumeroPermisDgdi?.({ verified: true, bypass: false });
        setDgdiSuccessMessage(result.message ?? "Pièce d'identité trouvée avec succès.");
        setDgdiError(null);
      } else if (result.serviceUnavailable || isDgdiServiceUnavailableMessage(result.message)) {
        setDgdiVerified(false);
        setDgdiBypassDueToService(true);
        onPersistNumeroPermisDgdi?.({ verified: false, bypass: true });
        setDgdiSuccessMessage(null);
        setDgdiError(
          result.message ??
            'Service DGDI indisponible. Vous pouvez poursuivre avec la vérification du permis.'
        );
      } else {
        setDgdiVerified(false);
        setDgdiBypassDueToService(false);
        onPersistNumeroPermisDgdi?.({ verified: false, bypass: false });
        setDgdiSuccessMessage(null);
        setDgdiError(result.message ?? 'Vérification DGDI échouée');
      }
    } catch (err: any) {
      setDgdiVerified(false);
      setDgdiBypassDueToService(false);
      onPersistNumeroPermisDgdi?.({ verified: false, bypass: false });
      setDgdiSuccessMessage(null);
      setDgdiError(err?.message ?? 'Erreur lors de la vérification DGDI');
    } finally {
      setDgdiVerifying(false);
    }
  };

  const handleDgdiTypePieceChange = (value: string) => {
    setTypePiece(value);
    resetDgdiStatusIfNeeded();
  };

  const handleDgdiNumeroPieceChange = (value: string) => {
    setNumeroPiece(value);
    resetDgdiStatusIfNeeded();
  };
  
  // Refs pour éviter les déclenchements multiples
  const permisVerifiedRef = useRef(false);
  const verificationErrorRef = useRef<string | null>(null);
  
  // Type de vérification : par identité ou par numéro de permis
  const [verificationType, setVerificationType] = useState<'identite' | 'numero'>('numero');

  const identityFieldsMissing =
    !candidatData?.date_naissance ||
    !String(candidatData?.date_naissance ?? '').trim() ||
    !candidatData?.numero_piece ||
    !String(candidatData?.numero_piece ?? '').trim();

  // Formulaire de vérification du permis par identité (nom, prénom, date de naissance)
  const [verificationIdentityForm, setVerificationIdentityForm] = useState({
    nom: '',
    prenom: '',
    dateNaissance: '',
  });

  // État pour la vérification d'identité (après permis si candidat non trouvé)
  const [showIdentityVerification, setShowIdentityVerification] = useState(false);
  const [identityData, setIdentityData] = useState({
    nom: '',
    prenom: '',
    dateNaissance: '',
    lieuNaissance: '',
    numeroIdentite: '',
  });
  const updateIdentityData = (next: {
    nom: string;
    prenom: string;
    dateNaissance: string;
    lieuNaissance: string;
    numeroIdentite: string;
  }) => {
    setIdentityData(next);
    onIdentityDataChange?.(next);
  };
  const [isAutocompleted, setIsAutocompleted] = useState(false);
  const verifyingIdentity = false;
  const identityVerified = false;
  const identityError: string | null = null;

  const identityHydratedFromContextRef = useRef(false);

  useEffect(() => {
    if (!permisVerified) {
      identityHydratedFromContextRef.current = false;
      return;
    }
    if (identityHydratedFromContextRef.current) return;
    const nom = (personneData?.nom ?? '').trim();
    const prenom = (personneData?.prenom ?? '').trim();
    const dateNaissance = String(candidatData?.date_naissance ?? '')
      .trim()
      .split('T')[0];
    const lieuNaissance = (candidatData?.lieu_naissance ?? '').trim();
    const numeroIdentite = (
      candidatData?.numero_piece ||
      candidatData?.numero_identite ||
      ''
    ).trim();
    if (!nom && !prenom && !dateNaissance && !lieuNaissance && !numeroIdentite) return;
    const next = { nom, prenom, dateNaissance, lieuNaissance, numeroIdentite };
    setIdentityData(next);
    onIdentityDataChange?.(next);
    identityHydratedFromContextRef.current = true;
  }, [
    permisVerified,
    personneData?.nom,
    personneData?.prenom,
    candidatData?.date_naissance,
    candidatData?.lieu_naissance,
    candidatData?.numero_piece,
    candidatData?.numero_identite,
    onIdentityDataChange,
  ]);

  const identityRequired = permisVerified && (candidatNonTrouve || identityFieldsMissing);
  const identityComplete =
    !!identityData.nom.trim() &&
    !!identityData.prenom.trim() &&
    !!identityData.dateNaissance.trim() &&
    !!identityData.lieuNaissance.trim() &&
    !!identityData.numeroIdentite.trim();
  const missingIdentityFields: string[] = [];
  if (!identityData.nom.trim()) missingIdentityFields.push('Nom');
  if (!identityData.prenom.trim()) missingIdentityFields.push('Prénom');
  if (!identityData.dateNaissance.trim()) missingIdentityFields.push('Date de naissance');
  if (!identityData.lieuNaissance.trim()) missingIdentityFields.push('Lieu de naissance');
  if (!identityData.numeroIdentite.trim()) missingIdentityFields.push("Numéro d'identité");
  const dgdiStepOk = dgdiVerified || dgdiBypassDueToService;
  const isStepValid = dgdiStepOk && permisVerified && (!identityRequired || identityComplete);

  useEffect(() => {
    onValidationStateChange?.({
      dgdiVerified,
      dgdiBypassDueToService,
      permisVerified,
      identityRequired,
      identityComplete,
      isStepValid,
    });
  }, [
    dgdiVerified,
    dgdiBypassDueToService,
    permisVerified,
    identityRequired,
    identityComplete,
    isStepValid,
    onValidationStateChange,
  ]);
  
  // Afficher l'étape de vérification d'identité si le permis est vérifié et le candidat n'est pas trouvé
  useEffect(() => {
    // On affiche aussi le formulaire si le candidat est "non trouvé" MAIS aussi
    // si l'API renvoie des champs d'identité manquants (date_naissance / numero_piece = null).
    if (
      permisVerified &&
      identityFieldsMissing &&
      !showIdentityVerification &&
      !identityVerified
    ) {
      setShowIdentityVerification(true);
    } else if (
      permisVerified &&
      candidatNonTrouve &&
      !showIdentityVerification &&
      !identityVerified
    ) {
      setShowIdentityVerification(true);
    }
  }, [permisVerified, identityFieldsMissing, candidatNonTrouve, showIdentityVerification, identityVerified]);
  
  // Auto-remplir les champs avec les données de la réponse de vérification
  useEffect(() => {
    if (showIdentityVerification && permisVerified && !isAutocompleted) {
      const autoFilledData = {
        nom: personneData?.nom || '',
        prenom: personneData?.prenom || '',
        dateNaissance: candidatData?.date_naissance || '',
        lieuNaissance: candidatData?.lieu_naissance || '',
        numeroIdentite: candidatData?.numero_piece || candidatData?.numero_identite || '',
      };
      
      // On remplit toujours ce qu'on a, mais on ne "verrouille" (disable) que
      // quand les champs nécessaires à la vérification d'identité sont complets.
      const canAutoLock =
        !!autoFilledData.nom.trim() &&
        !!autoFilledData.prenom.trim() &&
        !!autoFilledData.dateNaissance.trim();

      if (
        autoFilledData.nom ||
        autoFilledData.prenom ||
        autoFilledData.dateNaissance ||
        autoFilledData.lieuNaissance ||
        autoFilledData.numeroIdentite
      ) {
        updateIdentityData(autoFilledData);
        setIsAutocompleted(canAutoLock);
      }
    }
  }, [showIdentityVerification, permisVerified, personneData, candidatData, isAutocompleted]);
  
  // La vérification se fait via les boutons de recherche permis
  // (par identité / par numéro) en amont. Ce formulaire sert à compléter
  // les champs manquants avant les étapes suivantes.
  
  // Afficher des toasts pour les résultats de vérification
  useEffect(() => {
    if (permisVerified && !permisVerifiedRef.current) {
      permisVerifiedRef.current = true;
      toast.custom(
        (t) => (
          <Box
            onClick={() => toast.dismiss(t.id)}
            sx={{
              p: 3,
              borderRadius: 0,
              background: '#ffffff',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              cursor: 'pointer',
              minWidth: '300px',
              maxWidth: '500px',
              animation: t.visible
                ? 'slideInRight 0.3s ease-out forwards'
                : 'slideOutRight 0.3s ease-in forwards',
              '@keyframes slideInRight': {
                '0%': {
                  transform: 'translateX(100%)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
              },
              '@keyframes slideOutRight': {
                '0%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
                '100%': {
                  transform: 'translateX(100%)',
                  opacity: 0,
                },
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: 3,
                height: '100%',
                background: '#4caf50',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <CheckCircle
                sx={{
                  color: '#4caf50',
                  fontSize: 24,
                  mt: 0.5,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 400,
                    lineHeight: 1.6,
                  }}
                >
                  Le permis a été vérifié avec succès et est authentique.
                </Typography>
              </Box>
            </Box>
          </Box>
        ),
        {
          position: 'bottom-right',
          duration: 5000,
        }
      );
    } else if (!permisVerified) {
      permisVerifiedRef.current = false;
    }
  }, [permisVerified]);

  useEffect(() => {
    if (verificationError && verificationError !== verificationErrorRef.current) {
      verificationErrorRef.current = verificationError;
      toast.custom(
        (t) => (
          <Box
            onClick={() => toast.dismiss(t.id)}
            sx={{
              p: 3,
              borderRadius: 0,
              background: '#ffffff',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              cursor: 'pointer',
              minWidth: '300px',
              maxWidth: '500px',
              animation: t.visible
                ? 'slideInRight 0.3s ease-out forwards'
                : 'slideOutRight 0.3s ease-in forwards',
              '@keyframes slideInRight': {
                '0%': {
                  transform: 'translateX(100%)',
                  opacity: 0,
                },
                '100%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
              },
              '@keyframes slideOutRight': {
                '0%': {
                  transform: 'translateX(0)',
                  opacity: 1,
                },
                '100%': {
                  transform: 'translateX(100%)',
                  opacity: 0,
                },
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: 3,
                height: '100%',
                background: '#d32f2f',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Info
                sx={{
                  color: 'text.secondary',
                  fontSize: 24,
                  mt: 0.5,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 400,
                    lineHeight: 1.6,
                  }}
                >
                  {verificationError}
                </Typography>
              </Box>
            </Box>
          </Box>
        ),
        {
          position: 'bottom-right',
          duration: 5000,
        }
      );
    } else if (!verificationError) {
      verificationErrorRef.current = null;
    }
  }, [verificationError]);
  
  // Réinitialiser les champs quand on change de format
  const handleFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFormat = event.target.value as PermisFormatType;
    
    // Ne rien faire si le format est le même
    if (newFormat === format) {
      return;
    }
    
    if (newFormat === 'op') {
      // Pour le format PERM, on garde seulement le numéro et on vide les autres champs
      onNumeroPermisPartsChange({
        annee: '',
        province: '',
        categorie: '',
        numero: numeroPermisParts.numero || '', // Garder le numéro si déjà saisi
      });
    } else {
      // Pour le format standard, on vide tout si on passait de PERM à standard
      if (format === 'op') {
        onNumeroPermisPartsChange({
          annee: '',
          province: '',
          categorie: '',
          numero: '',
        });
      }
    }
    // Changer le format
    onFormatChange(newFormat);
  };

  return (
    <Box>
      {/* Étape 1 : Vérification pièce d'identité (DGDI) - comme InscriptionFormationForm */}
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
        1. Vérification de la pièce d'identité
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choisissez le type de pièce et saisissez son numéro pour vérification auprès de la
        Direction générale de la documentation et de l'immigration (DGDI).
      </Typography>
      <FormControl fullWidth required sx={{ mb: 2 }}>
        <InputLabel>Type de pièce</InputLabel>
        <Select
          value={typePiece}
          onChange={(e) => handleDgdiTypePieceChange(e.target.value)}
          label="Type de pièce"
          disabled={dgdiVerifying || dgdiVerified || dgdiBypassDueToService}
        >
          {TYPES_PIECE_DGDI.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Numéro de la pièce d'identité"
        value={numeroPiece}
        onChange={(e) => handleDgdiNumeroPieceChange(e.target.value)}
        fullWidth
        required
        disabled={dgdiVerifying || dgdiVerified || dgdiBypassDueToService}
        placeholder={typePiece === 'Passeport' ? PASSEPORT_PLACEHOLDER : 'Ex: 1234567890123'}
        inputProps={
          typePiece === 'Passeport'
            ? { pattern: REGEX_PASSEPORT.source, maxLength: 9 }
            : undefined
        }
        helperText={typePiece === 'Passeport' ? PASSEPORT_HELPER : undefined}
        sx={{ mb: 2 }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Button
          variant="contained"
          onClick={() => handleVerifyDgdi(typePiece, numeroPiece)}
          disabled={dgdiVerifying || dgdiVerified || dgdiBypassDueToService || !numeroPiece.trim()}
          startIcon={dgdiVerifying ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
        >
          {dgdiVerifying
            ? 'Vérification...'
            : dgdiVerified
              ? 'Pièce vérifiée ✓'
              : dgdiBypassDueToService
                ? 'DGDI indisponible — passez au permis'
                : 'Vérifier la pièce d\'identité'}
        </Button>
      </Box>
      {dgdiError && (
        <Alert
          severity={dgdiBypassDueToService ? 'warning' : 'error'}
          sx={
            dgdiBypassDueToService
              ? { mb: 2 }
              : { mb: 2, bgcolor: '#ffebee', color: '#c62828' }
          }
        >
          {dgdiError}
        </Alert>
      )}
      {dgdiError && !dgdiBypassDueToService && !dgdiVerified && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            color="warning"
            fullWidth
            onClick={() => {
              setDgdiBypassDueToService(true);
              setDgdiError(
                'Vérification DGDI ignorée. Vous pouvez poursuivre avec la vérification du permis.'
              );
            }}
          >
            Continuer sans vérification DGDI (passer au permis)
          </Button>
        </Box>
      )}
      {dgdiVerified && dgdiSuccessMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {dgdiSuccessMessage}
        </Alert>
      )}

      {/* Étape 2 : Vérification du permis - affichée après pièce validée DGDI ou contournement si service indisponible */}
      {(dgdiVerified || dgdiBypassDueToService) && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            2. Vérification du permis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choisissez le type de vérification souhaité.
          </Typography>

      {/* Sélection du type de vérification - style distinct avec icônes */}
      {onVerifyPermisByIdentity && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 2,
            border: '2px solid',
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: 'primary.main' }}>
            Type de vérification
          </Typography>
          <RadioGroup
            value={verificationType}
            onChange={(e) => setVerificationType(e.target.value as 'identite' | 'numero')}
            sx={{ gap: 1 }}
          >
            <Card
              variant="outlined"
              sx={{
                cursor: loading || verifyingPermis || permisVerified ? 'default' : 'pointer',
                borderWidth: 2,
                borderColor: verificationType === 'identite' ? 'primary.main' : 'divider',
                bgcolor: verificationType === 'identite' ? 'action.selected' : 'background.paper',
                opacity: loading || verifyingPermis || permisVerified ? 0.7 : 1,
                transition: 'all 0.2s ease',
                '&:hover': (loading || verifyingPermis || permisVerified) ? {} : { borderColor: 'primary.light', bgcolor: 'action.hover' },
              }}
              onClick={() => !(loading || verifyingPermis || permisVerified) && setVerificationType('identite')}
            >
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <FormControlLabel
                  value="identite"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Fingerprint sx={{ color: verificationType === 'identite' ? 'primary.main' : 'text.secondary', fontSize: 28 }} />
                      <Box>
                        <Typography fontWeight={600}>Par identité</Typography>
                        <Typography variant="body2" color="text.secondary">Nom, prénom et date de naissance</Typography>
                      </Box>
                    </Box>
                  }
                  disabled={loading || verifyingPermis || permisVerified}
                  sx={{ m: 0, width: '100%' }}
                />
              </CardContent>
            </Card>
            <Card
              variant="outlined"
              sx={{
                cursor: loading || verifyingPermis || permisVerified ? 'default' : 'pointer',
                borderWidth: 2,
                borderColor: verificationType === 'numero' ? 'primary.main' : 'divider',
                bgcolor: verificationType === 'numero' ? 'action.selected' : 'background.paper',
                opacity: loading || verifyingPermis || permisVerified ? 0.7 : 1,
                transition: 'all 0.2s ease',
                '&:hover': (loading || verifyingPermis || permisVerified) ? {} : { borderColor: 'primary.light', bgcolor: 'action.hover' },
              }}
              onClick={() => !(loading || verifyingPermis || permisVerified) && setVerificationType('numero')}
            >
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <FormControlLabel
                  value="numero"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <ConfirmationNumber sx={{ color: verificationType === 'numero' ? 'primary.main' : 'text.secondary', fontSize: 28 }} />
                      <Box>
                        <Typography fontWeight={600}>Par numéro de permis</Typography>
                        <Typography variant="body2" color="text.secondary">Saisir le numéro complet du permis</Typography>
                      </Box>
                    </Box>
                  }
                  disabled={loading || verifyingPermis || permisVerified}
                  sx={{ m: 0, width: '100%' }}
                />
              </CardContent>
            </Card>
          </RadioGroup>
        </Box>
      )}

      {/* Formulaire identité - affiché uniquement si ce type est sélectionné */}
      {verificationType === 'identite' && onVerifyPermisByIdentity && (
        <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
            Vérification par identité
          </Typography>
          {identitySearchNomForRefinement ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Nom recherché : <strong>{identitySearchNomForRefinement}</strong>. Affinez la recherche avec le prénom et/ou la date de naissance.
              </Typography>
              {onClearIdentitySearchRefinement && (
                <Button size="small" onClick={onClearIdentitySearchRefinement} sx={{ mt: 1 }}>
                  Nouvelle recherche
                </Button>
              )}
            </Alert>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Saisissez un ou plusieurs critères pour rechercher (nom, prénom et/ou date de naissance).
            </Typography>
          )}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Nom"
                value={identitySearchNomForRefinement ?? verificationIdentityForm.nom}
                onChange={(e) => setVerificationIdentityForm((prev) => ({ ...prev, nom: e.target.value }))}
                fullWidth
                disabled={!!identitySearchNomForRefinement || loading || verifyingPermis || permisVerified}
                placeholder="Dupont"
                helperText={identitySearchNomForRefinement ? "Stocké pour affiner" : "Recherche partielle"}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Prénom"
                value={verificationIdentityForm.prenom}
                onChange={(e) => setVerificationIdentityForm((prev) => ({ ...prev, prenom: e.target.value }))}
                fullWidth
                disabled={loading || verifyingPermis || permisVerified}
                placeholder="Jean"
                helperText={identitySearchNomForRefinement ? "Affinez la recherche" : "Recherche partielle"}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Date de naissance"
                type="date"
                value={verificationIdentityForm.dateNaissance}
                onChange={(e) => setVerificationIdentityForm((prev) => ({ ...prev, dateNaissance: e.target.value }))}
                fullWidth
                disabled={loading || verifyingPermis || permisVerified}
                InputLabelProps={{ shrink: true }}
                helperText="Recherche exacte"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={verifyingPermis ? <CircularProgress size={20} /> : <Verified />}
                  onClick={() => onVerifyPermisByIdentity(
                    identitySearchNomForRefinement ?? verificationIdentityForm.nom,
                    verificationIdentityForm.prenom,
                    verificationIdentityForm.dateNaissance
                  )}
                  disabled={loading || verifyingPermis || permisVerified || (
                    identitySearchNomForRefinement
                      ? !verificationIdentityForm.prenom.trim() && !verificationIdentityForm.dateNaissance.trim()
                      : !verificationIdentityForm.nom.trim() && !verificationIdentityForm.prenom.trim() && !verificationIdentityForm.dateNaissance.trim()
                  )}
                >
                  {verifyingPermis ? 'Vérification en cours...' : identitySearchNomForRefinement ? 'Affiner la recherche' : 'Vérifier le permis'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Formulaire numéro de permis - affiché si ce type est sélectionné ou si pas d'option identité */}
      {((!onVerifyPermisByIdentity) || verificationType === 'numero') && (
        <>
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">Format du numéro de permis</FormLabel>
        <RadioGroup
          row
          value={format}
          onChange={handleFormatChange}
        >
          <FormControlLabel 
            value="standard" 
            control={<Radio />} 
            label="Format standard (2024-1-A-1234)" 
            disabled={loading}
          />
          <FormControlLabel 
            value="op" 
            control={<Radio />} 
            label="Format PERM (PERM-12345678)" 
            disabled={loading}
          />
        </RadioGroup>
      </FormControl>
      
       
      
      <Grid container spacing={2}>
        {format === 'standard' ? (
          <>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Année d'obtention"
                value={numeroPermisParts.annee}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  onNumeroPermisPartsChange({ ...numeroPermisParts, annee: value });
                }}
                fullWidth
                required
                disabled={loading}
                placeholder="2024"
                helperText="4 chiffres"
                inputProps={{ maxLength: 4 }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                label="Province"
                value={numeroPermisParts.province}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^1-9]/g, '').slice(0, 1);
                  onNumeroPermisPartsChange({ ...numeroPermisParts, province: value });
                }}
                fullWidth
                required
                disabled={loading}
                placeholder="1"
                helperText="1 à 9"
                inputProps={{ maxLength: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              {availableCategories.length > 1 && permisVerified ? (
                <FormControl fullWidth required>
                  <InputLabel>Catégorie</InputLabel>
                  <Select
                    value={numeroPermisParts.categorie || ''}
                    onChange={(e) => {
                      const nouvelleCategorie = String(e.target.value).toUpperCase().trim();
                      console.log('✅ [NumeroPermisStep] Catégorie sélectionnée dans le select:', {
                        nouvelleCategorie,
                        ancienneCategorie: numeroPermisParts.categorie,
                        numeroPermisParts: numeroPermisParts,
                      });
                      const updatedParts = { ...numeroPermisParts, categorie: nouvelleCategorie };
                      console.log('✅ [NumeroPermisStep] Mise à jour numeroPermisParts:', updatedParts);
                      onNumeroPermisPartsChange(updatedParts);
                    }}
                    label="Catégorie"
                    disabled={loading}
                    required
                  >
                    {availableCategories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    Plusieurs catégories détectées, veuillez choisir
                  </Typography>
                </FormControl>
              ) : (
                <TextField
                  label="Catégorie"
                  value={numeroPermisParts.categorie || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 1);
                    console.log('✅ [NumeroPermisStep] Catégorie saisie:', value);
                    onNumeroPermisPartsChange({ ...numeroPermisParts, categorie: value });
                  }}
                  fullWidth
                  required
                  disabled={loading || (availableCategories.length > 1 && permisVerified)}
                  placeholder="A"
                  helperText={permisVerified && numeroPermisParts.categorie ? `Catégorie: ${numeroPermisParts.categorie}` : "1 lettre"}
                  inputProps={{ maxLength: 1 }}
                />
              )}
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField
                label="Numéro"
                value={numeroPermisParts.numero}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  onNumeroPermisPartsChange({ ...numeroPermisParts, numero: value });
                }}
                fullWidth
                required
                disabled={loading}
                placeholder="1234"
                helperText="Minimum 4 chiffres"
                inputProps={{ minLength: 4, maxLength: 10 }}
              />
            </Grid>
          </>
        ) : (
          <Grid item xs={12} sm={6}>
            <TextField
              label="Numéro de permis complet"
              value={numeroPermisParts.numero}
              onChange={(e) => {
                // Accepter lettres, chiffres et tirets - laisser l'utilisateur saisir exactement ce qu'il veut
                const value = e.target.value.toUpperCase();
                onNumeroPermisPartsChange({ ...numeroPermisParts, numero: value });
              }}
              fullWidth
              required
              disabled={loading}
              placeholder="PERM-12345678 ou 12345678"
              helperText="Saisissez le numéro complet exact (ex: PERM-12345678 ou 12345678)"
            />
          </Grid>
        )}
        {numPermisComplet && (
          <Grid item xs={12}>
            <Box sx={{ 
              p: 2,
              borderRadius: 0,
              background: '#ffffff',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              display: 'inline-block',
              maxWidth: 'fit-content',
            }}>
              <Box sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: 3,
                height: '100%',
                background: '#1976d2',
              }} />
              <Typography 
                variant="body1" 
                sx={{
                  color: 'text.primary',
                  fontWeight: 400,
                  lineHeight: 1.6,
                  pl: 1,
                }}
              >
                Numéro de permis: <strong>{numPermisComplet}</strong>
              </Typography>
            </Box>
          </Grid>
        )}
        
        {/* Bouton de vérification et messages */}
        {numPermisComplet && onVerifyPermis && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={verifyingPermis ? <CircularProgress size={20} /> : <Verified />}
                onClick={onVerifyPermis}
                disabled={loading || verifyingPermis || !numPermisComplet}
                sx={{ alignSelf: 'flex-start' }}
              >
                {verifyingPermis ? 'Vérification en cours...' : 'Vérifier le permis'}
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
        </>
      )}

      {/* Étape de vérification d'identité */}
      {/* Modal de sélection des permis (plusieurs permis retournés par l’API) */}
      <Dialog open={openPermisModal} onClose={handleClosePermisModal} fullScreen>
        <AppBar sx={{ position: 'relative', bgcolor: 'primary.main' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={handleClosePermisModal} aria-label="fermer">
              <Close />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Sélection des permis — {permisListForSelection?.length ?? 0} permis trouvé(s)
            </Typography>
            <Button
              color="inherit"
              variant="outlined"
              onClick={handleConfirmPermisSelection}
              disabled={selectedPermisIds.size === 0}
              sx={{ borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: '#fff' } }}
            >
              Valider ({selectedPermisIds.size} sélectionné{selectedPermisIds.size > 1 ? 's' : ''})
            </Button>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ bgcolor: 'grey.50', p: { xs: 2, sm: 3 } }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cochez les permis à enregistrer dans le dossier. Toutes les informations renvoyées par l&apos;API sont affichées ci-dessous.
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }} icon={<Info fontSize="inherit" />}>
            <Typography variant="body2">
              Pour une demande en catégorie <strong>C</strong>, <strong>D</strong> ou <strong>E</strong>, sélectionnez également la ligne du permis <strong>B</strong> si elle est proposée.
              Sans permis B, vous devrez vous rendre au <strong>CNEPC</strong> ou aux services des transports compétents pour l&apos;obtenir avant de poursuivre.
            </Typography>
          </Alert>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {permisListForSelection?.map((p, index) => {
              const id = (p.id ?? p.numero_permis ?? '').toString();
              const checked = selectedPermisIds.has(id);
              const fmt = (d: string | null | undefined) => (d ? d.split('T')[0] : '—');
              const knownKeys = new Set(['id','numero_identite','nom','prenom','sexe','nationalite','date_naissance','lieu_naissance','numero_permis','type_permis','categorie','date_obtention','lieu_obtention','date_validite','numero_origine_permis','lieu_origine','date_renou1','date_renou2','date_renou3']);
              const extraFields = Object.entries(p).filter(([k]) => !knownKeys.has(k)).map(([k, v]) => ({
                label: k,
                value: v !== null && v !== undefined ? String(v) : '—',
              }));
              return (
                <Card
                  key={id}
                  variant="outlined"
                  sx={{
                    transition: 'all 0.2s ease',
                    borderWidth: 2,
                    borderColor: checked ? 'primary.main' : 'divider',
                    bgcolor: checked ? 'primary.50' : 'background.paper',
                    boxShadow: checked ? '0 0 0 2px rgba(25,118,210,0.15)' : 1,
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'primary.light', bgcolor: checked ? 'primary.50' : 'action.hover' },
                  }}
                  onClick={() => handleTogglePermis(id)}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Checkbox
                        checked={checked}
                        onChange={() => handleTogglePermis(id)}
                        onClick={(e) => e.stopPropagation()}
                        color="primary"
                      />
                      <Typography variant="h6" fontWeight={700} color={checked ? 'primary.main' : 'text.primary'}>
                        Permis #{index + 1} — {p.numero_permis || '—'}
                      </Typography>
                      {p.categorie && (
                        <Chip label={`Cat. ${p.categorie}`} color={checked ? 'primary' : 'default'} size="small" />
                      )}
                      {checked && (
                        <Chip label="Sélectionné" color="primary" size="small" variant="filled" />
                      )}
                    </Box>
                    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                      <Table size="small">
                        <TableBody>
                          <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell colSpan={4} sx={{ fontWeight: 700, py: 0.75, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                              Identité du titulaire
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ color: 'text.secondary', width: '20%', fontSize: '0.8rem' }}>N° identité</TableCell>
                            <TableCell sx={{ fontWeight: 500, width: '30%' }}>{p.numero_identite ?? '—'}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', width: '20%', fontSize: '0.8rem' }}>Nom complet</TableCell>
                            <TableCell sx={{ fontWeight: 500, width: '30%' }}>{[p.nom, p.prenom].filter(Boolean).join(' ') || '—'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Sexe</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{p.sexe ?? '—'}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Nationalité</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{p.nationalite ?? '—'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Date de naissance</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{fmt(p.date_naissance as string | null | undefined)}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Lieu de naissance</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{p.lieu_naissance ?? '—'}</TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell colSpan={4} sx={{ fontWeight: 700, py: 0.75, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                              Informations du permis
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>N° Permis</TableCell>
                            <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{p.numero_permis ?? '—'}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Type de permis</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{p.type_permis ?? '—'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Catégorie</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{p.categorie ?? '—'}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Date obtention</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{fmt(p.date_obtention as string | null | undefined)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Lieu obtention</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{p.lieu_obtention ?? '—'}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Date de validité</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{fmt(p.date_validite as string | null | undefined)}</TableCell>
                          </TableRow>
                          <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell colSpan={4} sx={{ fontWeight: 700, py: 0.75, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                              Origine et renouvellements
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>N° origine</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{p.numero_origine_permis ?? '—'}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Lieu origine</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{p.lieu_origine ?? '—'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Renouvellement 1</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{fmt(p.date_renou1 as string | null | undefined)}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Renouvellement 2</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{fmt(p.date_renou2 as string | null | undefined)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>Renouvellement 3</TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{fmt(p.date_renou3 as string | null | undefined)}</TableCell>
                            <TableCell /><TableCell />
                          </TableRow>
                          {extraFields.length > 0 && (
                            <>
                              <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell colSpan={4} sx={{ fontWeight: 700, py: 0.75, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                                  Données supplémentaires
                                </TableCell>
                              </TableRow>
                              {extraFields.reduce<React.ReactNode[]>((rows, field, i) => {
                                if (i % 2 === 0) {
                                  const next = extraFields[i + 1];
                                  rows.push(
                                    <TableRow key={field.label}>
                                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{field.label}</TableCell>
                                      <TableCell sx={{ fontWeight: 500 }}>{field.value as React.ReactNode}</TableCell>
                                      {next ? (
                                        <>
                                          <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{next.label}</TableCell>
                                          <TableCell sx={{ fontWeight: 500 }}>{next.value as React.ReactNode}</TableCell>
                                        </>
                                      ) : (
                                        <><TableCell /><TableCell /></>
                                      )}
                                    </TableRow>
                                  );
                                }
                                return rows;
                              }, [])}
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </Paper>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', gap: 1 }}>
          <Button onClick={handleClosePermisModal} variant="outlined" color="inherit">
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmPermisSelection}
            disabled={selectedPermisIds.size === 0}
            size="large"
          >
            Valider la sélection ({selectedPermisIds.size} permis sélectionné{selectedPermisIds.size > 1 ? 's' : ''})
          </Button>
        </DialogActions>
      </Dialog>

      {showIdentityVerification && permisVerified && !identityVerified && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Fingerprint sx={{ 
              color: identityVerified ? '#4caf50' : 'primary.main', 
              fontSize: 32,
              opacity: identityVerified ? 1 : 0.6,
              transition: 'all 0.3s ease',
            }} />
            <Typography 
              variant="h6" 
              sx={{
                color: identityVerified ? '#4caf50' : 'primary.main',
                opacity: identityVerified ? 1 : 0.6,
                fontWeight: identityVerified ? 600 : 500,
                transition: 'all 0.3s ease',
              }}
            >
              Vérification d'identité {identityVerified && '✓'}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            La personne trouvée n'est pas encore enregistrée dans le système. Veuillez vérifier son identité en saisissant les informations suivantes.
          </Typography>
          
          {identityError && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
              <Typography variant="body2" color="error">
                {identityError}
              </Typography>
            </Box>
          )}

          {missingIdentityFields.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Veuillez renseigner les champs manquants : {missingIdentityFields.join(', ')}.
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nom"
                value={identityData.nom}
                onChange={(e) => updateIdentityData({ ...identityData, nom: e.target.value })}
                fullWidth
                required
                disabled={loading || verifyingIdentity || identityVerified}
                placeholder="OBAME"
                error={!identityData.nom.trim()}
                helperText={!identityData.nom.trim() ? 'Champ obligatoire a renseigner' : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Prénom"
                value={identityData.prenom}
                onChange={(e) => updateIdentityData({ ...identityData, prenom: e.target.value })}
                fullWidth
                required
                disabled={loading || verifyingIdentity || identityVerified}
                placeholder="Gad Erwin"
                error={!identityData.prenom.trim()}
                helperText={!identityData.prenom.trim() ? 'Champ obligatoire a renseigner' : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date de naissance"
                type="date"
                value={identityData.dateNaissance}
                onChange={(e) => updateIdentityData({ ...identityData, dateNaissance: e.target.value })}
                fullWidth
                required
                disabled={loading || verifyingIdentity || identityVerified}
                InputLabelProps={{ shrink: true }}
                error={!identityData.dateNaissance.trim()}
                helperText={!identityData.dateNaissance.trim() ? 'Champ obligatoire a renseigner' : ''}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Lieu de naissance"
                value={identityData.lieuNaissance}
                onChange={(e) => updateIdentityData({ ...identityData, lieuNaissance: e.target.value })}
                fullWidth
                required
                disabled={loading || verifyingIdentity || identityVerified}
                placeholder="Gabon, Libreville"
                error={!identityData.lieuNaissance.trim()}
                helperText={!identityData.lieuNaissance.trim() ? 'Champ obligatoire a renseigner' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Numéro d'identité"
                value={identityData.numeroIdentite}
                onChange={(e) => updateIdentityData({ ...identityData, numeroIdentite: e.target.value.toUpperCase() })}
                fullWidth
                required
                disabled={loading || verifyingIdentity || identityVerified}
                placeholder="1234567890123"
                error={!identityData.numeroIdentite.trim()}
                helperText={!identityData.numeroIdentite.trim() ? 'Champ obligatoire a renseigner' : "Numéro de pièce d'identité"}
              />
            </Grid>
          </Grid>
        </Box>
      )}
        </>
      )}
    </Box>
  );
};

