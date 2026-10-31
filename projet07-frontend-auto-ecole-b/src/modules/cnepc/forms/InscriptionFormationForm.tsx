import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Chip,
  Divider,
  Paper,
} from '@mui/material';
import {
  PersonAdd,
  School,
  ArrowBack,
  ArrowForward,
  CheckCircle,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import {
  AutoEcole,
  Formation,
  autoEcoleService,
  typeDemandeService,
  referentielService,
  dgdiService,
  TypeDemande,
} from '../services';
import type { DgdiVerificationData } from '../services/dgdi.service';
import { authService } from '../../auth/services/authService';
import { PersonneFormStep, CandidatFormStep } from './steps';
import { validatePersonne, validateCandidat } from './validation';
import { getFieldLabel } from './utils';

interface InscriptionFormationFormProps {
  /** En mode dialog : contrôler l'ouverture. En mode page : ignoré. */
  open?: boolean;
  autoEcole: AutoEcole;
  onSuccess: () => void;
  onCancel: () => void;
  /** 'dialog' = dans une modale (défaut), 'page' = page à part entière */
  variant?: 'dialog' | 'page';
}

const InscriptionFormationForm: React.FC<InscriptionFormationFormProps> = ({
  open = true,
  autoEcole,
  onSuccess,
  onCancel,
  variant = 'dialog',
}) => {
  const isPage = variant === 'page';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  
  // États pour les données
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loadingFormations, setLoadingFormations] = useState(false);
  const [typeDemandes, setTypeDemandes] = useState<TypeDemande[]>([]);
  const [loadingTypeDemandes, setLoadingTypeDemandes] = useState(false);
  const [candidatId, setCandidatId] = useState<string | null>(null);
  const [personneId, setPersonneId] = useState<string | null>(null);
  const [captchaId, setCaptchaId] = useState<string>('');
  const [captchaCode, setCaptchaCode] = useState<string>('');
  
  // États vérification DGDI (pièce d'identité) - étape 1
  const [dgdiVerifying, setDgdiVerifying] = useState(false);
  const [dgdiVerified, setDgdiVerified] = useState(false);
  const [dgdiError, setDgdiError] = useState<string | null>(null);
  const [dgdiSuccessMessage, setDgdiSuccessMessage] = useState<string | null>(null);
  const [dgdiData, setDgdiData] = useState<DgdiVerificationData | null>(null);
  
  // États du formulaire - Étape 1 : Informations personnelles
  const [personneData, setPersonneData] = useState({
    nom: '',
    prenom: '',
    email: '',
    contact: '',
    telephone: '',
    adresse: '',
    password: '',
    password_confirmation: '',
  });

  // États du formulaire - Étape 2 : Informations du candidat
  const [candidatData, setCandidatData] = useState({
    date_naissance: '',
    lieu_naissance: '',
    nip: '',
    type_piece: 'CNI',
    numero_piece: '',
    nationalite: '',
    genre: 'M',
  });

  // États du formulaire - Étape 3 : Formation
  const [formationData, setFormationData] = useState({
    formation_id: '',
    type_demande_id: '',
    commentaires: '',
  });

  const steps = [
    "Vérification pièce d'identité (DGDI)",
    'Informations personnelles',
    'Informations du candidat',
    'Choix de la formation',
  ];

  // Types de pièce d'identité pour la vérification DGDI (liés au numéro de pièce)
  const TYPES_PIECE_DGDI: { value: string; label: string }[] = [
    { value: 'Passeport', label: 'Passeport' },
    { value: 'CNI', label: "Carte d'identité" },
    { value: 'Carte_sejour', label: 'Carte de séjour' },
    { value: 'Carte_resident', label: 'Carte de résident' },
  ];

  // Regex pour le numéro de passeport : 2 chiffres + 2 lettres + 5 chiffres (ex: 25PP15842)
  const REGEX_PASSEPORT = /^[0-9]{2}[A-Z]{2}[0-9]{5}$/;
  const PASSEPORT_PLACEHOLDER = 'Ex: 25PP15842';
  const PASSEPORT_HELPER = 'Format : 2 chiffres, 2 lettres majuscules, 5 chiffres (ex: 25PP15842)';

  // Charger les formations de l'auto-école
  const loadFormations = async () => {
    setLoadingFormations(true);
    try {
      const data = await autoEcoleService.getFormationsByAutoEcole(autoEcole.id);
      setFormations(data.filter(f => f.statut));
    } catch (err: any) {
      console.error('Erreur lors du chargement des formations:', err);
      setError('Impossible de charger les formations');
    } finally {
      setLoadingFormations(false);
    }
  };

  // Charger les types de demande
  const loadTypeDemandes = async () => {
    setLoadingTypeDemandes(true);
    try {
      const response = await typeDemandeService.getTypeDemandes(1, 100);
      setTypeDemandes(response.data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des types de demande:', err);
      // Ne pas bloquer le formulaire si les types de demande ne peuvent pas être chargés
    } finally {
      setLoadingTypeDemandes(false);
    }
  };

  // Valeur par défaut du type de demande : NOUVEAU PERMIS
  const getDefaultTypeDemandeId = (): string => {
    const normalized = (s: string) => s.toUpperCase().replace(/\s/g, '');
    const nouveauPermis =
      typeDemandes.find((t) => normalized(t.name) === 'NOUVEAUPERMIS') ||
      typeDemandes.find((t) => t.name.toLowerCase().includes('nouveau') && t.name.toLowerCase().includes('permis'));
    return nouveauPermis?.id ?? '';
  };

  // Affichage : "NOUVEAUPERMIS" → "NOUVEAU PERMIS"
  const getTypeDemandeDisplayName = (name: string): string => {
    if (!name) return name;
    if (name.toUpperCase().replace(/\s/g, '') === 'NOUVEAUPERMIS') return 'NOUVEAU PERMIS';
    return name;
  };

  // Charger les formations au montage / à l'ouverture (dialog) ou au montage (page)
  useEffect(() => {
    if (open || isPage) {
      loadFormations();
      loadTypeDemandes();
      // Réinitialiser le formulaire
      setActiveStep(0);
      setCandidatId(null);
      setPersonneId(null);
      setCaptchaId('');
      setCaptchaCode('');
      setPersonneData({
        nom: '',
        prenom: '',
        email: '',
        contact: '',
        telephone: '',
        adresse: '',
        password: '',
        password_confirmation: '',
      });
      setCandidatData({
        date_naissance: '',
        lieu_naissance: '',
        nip: '',
        type_piece: 'CNI',
        numero_piece: '',
        nationalite: '',
        genre: 'M',
      });
      setFormationData({
        formation_id: '',
        type_demande_id: getDefaultTypeDemandeId(),
        commentaires: '',
      });
      setError(null);
      setSuccess(null);
      setDgdiVerifying(false);
      setDgdiVerified(false);
      setDgdiError(null);
      setDgdiSuccessMessage(null);
      setDgdiData(null);
    }
  }, [open, isPage, autoEcole.id]);

  // Réappliquer le type "NOUVEAU PERMIS" quand les types de demande viennent d'être chargés
  useEffect(() => {
    if (typeDemandes.length === 0) return;
    const defaultId = getDefaultTypeDemandeId();
    if (!defaultId) return;
    setFormationData((prev) => (prev.type_demande_id ? prev : { ...prev, type_demande_id: defaultId }));
  }, [typeDemandes]);

  // Vérification pièce d'identité auprès de la DGDI (étape 1)
  const handleVerifyDgdi = async (typePiece: string, numeroPiece: string) => {
    setDgdiError(null);
    const num = (numeroPiece ?? '').trim();
    if (typePiece === 'Passeport' && num) {
      const normalized = num.replace(/^(\d{2})([a-zA-Z]{2})(\d{5})$/, (_, a, b, c) => a + b.toUpperCase() + c);
      if (!REGEX_PASSEPORT.test(normalized)) {
        setDgdiError('Le numéro de passeport doit respecter le format : 2 chiffres, 2 lettres, 5 chiffres (ex: 25PP15842).');
        return;
      }
      setCandidatData((prev) => ({ ...prev, numero_piece: normalized }));
      numeroPiece = normalized;
    }
    setDgdiVerifying(true);
    try {
      const result = await dgdiService.verifyPieceIdentite(typePiece, numeroPiece);
      if (result.success) {
        setDgdiVerified(true);
        setDgdiSuccessMessage(result.message ?? 'Pièce d\'identité trouvée avec succès.');
        setDgdiData(result.data ?? null);
        setDgdiError(null);
        // Pré-remplir les champs si la DGDI retourne des données
        if (result.data) {
          if (result.data.nom || result.data.prenom) {
            setPersonneData((prev) => ({
              ...prev,
              nom: (result.data!.nom ?? prev.nom).toUpperCase(),
              prenom: (result.data!.prenom ?? prev.prenom).toUpperCase(),
            }));
          }
          if (result.data.date_naissance || result.data.lieu_naissance || result.data.genre) {
            setCandidatData((prev) => ({
              ...prev,
              date_naissance: result.data!.date_naissance ?? prev.date_naissance,
              lieu_naissance: result.data!.lieu_naissance ?? prev.lieu_naissance,
              genre: result.data!.genre === 'F' ? 'F' : result.data!.genre === 'M' ? 'M' : prev.genre,
              type_piece: result.data!.type_piece ?? prev.type_piece,
              numero_piece: result.data!.numero_piece ?? prev.numero_piece,
            }));
          }
        }
      } else {
        setDgdiVerified(false);
        setDgdiSuccessMessage(null);
        setDgdiData(null);
        setDgdiError(result.message ?? 'Vérification DGDI échouée');
      }
    } catch (err: any) {
      setDgdiVerified(false);
      setDgdiSuccessMessage(null);
      setDgdiData(null);
      setDgdiError(err?.message ?? 'Erreur lors de la vérification DGDI');
    } finally {
      setDgdiVerifying(false);
    }
  };

  // Enregistrement personne (étape 1) — aligné sur PersonneFormPage
  const handleRegisterPersonne = async () => {
    setError(null);
    if (!validatePersonne({ personneData, setError })) return;
    setLoading(true);
    try {
      const registerPayload = {
        email: personneData.email,
        password: personneData.password,
        password_confirmation: personneData.password_confirmation,
        nom: personneData.nom,
        prenom: personneData.prenom,
        contact: personneData.telephone || '',
        telephone: personneData.telephone || '',
        adresse: personneData.adresse || '',
        role: 'candidat',
      };
      const registerResponse = await authService.register(registerPayload);
      if (registerResponse.user?.personne?.id) {
        setPersonneId(registerResponse.user.personne.id);
        setActiveStep(2);
      } else {
        setError('Erreur: Impossible de récupérer l\'ID de la personne');
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const errorMessages: string[] = [];
        Object.entries(errors).forEach(([field, messages]: [string, any]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg: string) => errorMessages.push(`${getFieldLabel(field)}: ${msg}`));
          } else {
            errorMessages.push(`${getFieldLabel(field)}: ${messages}`);
          }
        });
        setError(errorMessages.length > 0 ? errorMessages.join(', ') : 'Erreur lors de l\'enregistrement. Veuillez vérifier vos informations.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(err?.message || 'Erreur lors de l\'enregistrement. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Création candidat (étape 2) — aligné sur CandidatFormPage
  const handleCreateCandidat = async () => {
    setError(null);
    if (!validateCandidat({ candidatData, setError })) return;
    if (!personneId) {
      setError('Erreur: ID de la personne manquant. Veuillez recommencer.');
      return;
    }
    setLoading(true);
    try {
      const numero_candidat = `CAN-${Date.now()}`;
      const candidatPayload = {
        personne_id: personneId,
        numero_candidat,
        date_naissance: candidatData.date_naissance,
        lieu_naissance: candidatData.lieu_naissance,
        nip: candidatData.nip,
        type_piece: candidatData.type_piece,
        numero_piece: candidatData.numero_piece,
        nationalite: candidatData.nationalite,
        genre: candidatData.genre,
      };
      const response = await autoEcoleService.createCandidat(candidatPayload as any);
      if (response.data?.id) {
        setCandidatId(response.data.id);
        setActiveStep(3);
      } else {
        setError('Erreur: Impossible de récupérer l\'ID du candidat créé.');
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const errorMessages: string[] = [];
        Object.entries(errors).forEach(([field, messages]: [string, any]) => {
          if (Array.isArray(messages)) {
            messages.forEach((msg: string) => errorMessages.push(`${getFieldLabel(field)}: ${msg}`));
          } else {
            errorMessages.push(`${getFieldLabel(field)}: ${messages}`);
          }
        });
        setError(errorMessages.length > 0 ? errorMessages.join(', ') : 'Erreur lors de la création du candidat. Veuillez vérifier vos informations.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(err?.message || 'Erreur lors de la création du candidat. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Validation de l'étape 3
  const validateStep3 = () => {
    if (!formationData.formation_id) {
      setError('Veuillez sélectionner une formation');
      return false;
    }
    if (!formationData.type_demande_id) {
      setError('Veuillez sélectionner un type de demande');
      return false;
    }
    return true;
  };

  // Revenir à l'étape précédente
  const handleBack = () => {
    setError(null);
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Soumettre le formulaire complet
  const handleSubmit = async () => {
    if (!validateStep3()) return;
    
    if (!candidatId) {
      setError('Erreur: Candidat non créé');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Créer le dossier pour inscrire le candidat à la formation dans l'auto-école
      const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
      
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║  [FORMULAIRE] ÉTAPE 3 - CRÉATION DU DOSSIER                 ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('📋 Candidat ID:', candidatId);
      console.log('📋 Auto-École ID:', autoEcole.id);
      console.log('📋 Formation ID:', formationData.formation_id);
      console.log('📋 Type de demande ID:', formationData.type_demande_id);
      console.log('═══════════════════════════════════════════════════════════════');
      const selectedFormation = formations.find((f) => f.id === formationData.formation_id);
      const referencielId =
        selectedFormation?.type_permis_id ??
        (selectedFormation as any)?.type_permis?.id ??
        undefined;
      if (referencielId) {
        console.log('📋 Referenciel ID (catégorie permis):', referencielId);
      }

      const response = await autoEcoleService.createDossier({
        candidat_id: candidatId,
        auto_ecole_id: autoEcole.id,
        formation_id: formationData.formation_id,
        type_demande_id: formationData.type_demande_id,
        referenciel_id: referencielId,
        statut: 'en_attente',
        date_creation: today,
        commentaires: formationData.commentaires || undefined,
      });

      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ DOSSIER CRÉÉ AVEC SUCCÈS !                              ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('📄 Dossier ID:', response.data.id);
      console.log('📄 Statut:', response.data.statut);
      console.log('📄 Date création:', response.data.date_creation);
      console.log('═══════════════════════════════════════════════════════════════');

      setSuccess(response.message || 'Inscription réussie ! Le dossier a été créé.');
      
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.error('║  ❌ ERREUR LORS DE LA CRÉATION DU DOSSIER                   ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      
      if (err.response?.data) {
        console.error('📋 Réponse de l\'API:', err.response.data);
        
        if (err.response.data.errors) {
          console.log('─────────────────────────────────────────────────────────────');
          console.error('🔍 CHAMPS AVEC ERREURS DE VALIDATION:');
          console.log('─────────────────────────────────────────────────────────────');
          
          let errorDetails = '';
          Object.entries(err.response.data.errors).forEach(([field, messages]: [string, any]) => {
            const messageList = Array.isArray(messages) ? messages : [messages];
            console.error(`❌ "${field}": ${messageList.join(', ')}`);
            errorDetails += `\n• ${field}: ${messageList.join(', ')}`;
          });
          
          setError(`Erreur de validation: ${errorDetails}`);
        } else {
          setError(err.response.data.message || 'Erreur lors de la création du dossier');
        }
      } else {
        console.error('❌ Erreur sans réponse API:', err.message);
        setError(err.message || 'Une erreur est survenue lors de l\'inscription');
      }
      
      console.log('═══════════════════════════════════════════════════════════════');
    } finally {
      setLoading(false);
    }
  };

  // Passer à l'étape suivante après vérification DGDI réussie (au clic sur Suivant)
  const handleDgdiNext = () => {
    setDgdiError(null);
    setActiveStep(1);
  };

  // Réinitialiser le statut DGDI si l'utilisateur modifie le type ou le numéro en étape 0
  const resetDgdiStatusIfNeeded = () => {
    if (dgdiVerified || dgdiError) {
      setDgdiVerified(false);
      setDgdiSuccessMessage(null);
      setDgdiError(null);
      setDgdiData(null);
    }
  };

  const handleDgdiDocumentNumberChange = (value: string) => {
    setCandidatData((prev) => ({ ...prev, numero_piece: value }));
    resetDgdiStatusIfNeeded();
  };

  const handleDgdiTypePieceChange = (value: string) => {
    setCandidatData((prev) => ({ ...prev, type_piece: value }));
    resetDgdiStatusIfNeeded();
  };

  // Obtenir le contenu de l'étape actuelle
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Choisissez le type de pièce et saisissez son numéro pour vérification auprès de la
              Direction générale de la documentation et de l'immigration (DGDI).
            </Typography>
            <FormControl fullWidth required sx={{ mb: 2 }}>
              <InputLabel>Type de pièce</InputLabel>
              <Select
                value={candidatData.type_piece}
                onChange={(e) => handleDgdiTypePieceChange(e.target.value)}
                label="Type de pièce"
                disabled={dgdiVerifying}
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
              value={candidatData.numero_piece}
              onChange={(e) => handleDgdiDocumentNumberChange(e.target.value)}
              fullWidth
              required
              disabled={dgdiVerifying}
              placeholder={candidatData.type_piece === 'Passeport' ? PASSEPORT_PLACEHOLDER : 'Ex: 1234567890123'}
              inputProps={
                candidatData.type_piece === 'Passeport'
                  ? { pattern: REGEX_PASSEPORT.source, maxLength: 9 }
                  : undefined
              }
              helperText={candidatData.type_piece === 'Passeport' ? PASSEPORT_HELPER : undefined}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                onClick={() => handleVerifyDgdi(candidatData.type_piece, candidatData.numero_piece)}
                disabled={dgdiVerifying || !candidatData.numero_piece.trim()}
                startIcon={dgdiVerifying ? <CircularProgress size={20} color="inherit" /> : null}
                endIcon={!dgdiVerifying && dgdiVerified ? null : undefined}
                sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
              >
                {dgdiVerifying ? 'Vérification...' : 'Vérifier'}
              </Button>
              {dgdiVerified && (
                <Button
                  variant="contained"
                  onClick={handleDgdiNext}
                  endIcon={<ArrowForward />}
                  sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
                >
                  Enregistrer & Suivant
                </Button>
              )}
            </Box>
            {dgdiError && (
              <Alert
                severity="error"
                sx={{
                  mt: 2,
                  bgcolor: '#ffebee',
                  color: '#c62828',
                  '& .MuiAlert-message': { color: '#c62828 !important', fontWeight: 500 },
                  '& .MuiAlert-icon': { color: '#c62828 !important' },
                }}
              >
                {dgdiError}
              </Alert>
            )}
            {dgdiVerified && dgdiSuccessMessage && (
              <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircle />}>
                {dgdiSuccessMessage}
              </Alert>
            )}
          </Box>
        );

      case 1:
        return (
          <PersonneFormStep
            personneData={personneData}
            loading={loading}
            onPersonneDataChange={setPersonneData}
            onRegister={handleRegisterPersonne}
            onBack={handleBack}
            error={error}
          />
        );

      case 2:
        return (
          <CandidatFormStep
            candidatData={candidatData}
            loading={loading}
            onCandidatDataChange={setCandidatData}
            onCreateCandidat={handleCreateCandidat}
            onBack={handleBack}
            error={error}
          />
        );

      case 3:
        const selectedFormation = formations.find(f => f.id === formationData.formation_id);
        return (
          <Box>
            <FormControl fullWidth required sx={{ mb: 3 }}>
              <InputLabel>Formation</InputLabel>
              <Select
                value={formationData.formation_id}
                onChange={(e) => setFormationData({ ...formationData, formation_id: e.target.value })}
                label="Formation"
                disabled={loadingFormations || loading}
              >
                {loadingFormations ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Chargement des formations...
                  </MenuItem>
                ) : formations.length === 0 ? (
                  <MenuItem disabled>
                    Aucune formation active disponible
                  </MenuItem>
                ) : (
                  formations.map((formation) => {
                    // Récupérer le libellé du type de permis de manière sûre
                    let typePermisLabel = 'N/A';
                    if (formation.typePermis) {
                      typePermisLabel = ('libelle' in formation.typePermis) 
                        ? formation.typePermis.libelle 
                        : ('nom' in formation.typePermis ? formation.typePermis.nom : 'N/A');
                    } else if (formation.type_permis) {
                      typePermisLabel = ('libelle' in formation.type_permis) 
                        ? formation.type_permis.libelle 
                        : ('nom' in formation.type_permis ? formation.type_permis.nom : 'N/A');
                    }
                    
                    return (
                      <MenuItem key={formation.id} value={formation.id}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <School fontSize="small" />
                            <Typography variant="body1" fontWeight="medium">
                              {formation.nom || `Formation ${typePermisLabel}`}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                            <Chip 
                              label={typePermisLabel} 
                              size="small" 
                              variant="outlined"
                            />
                            <Chip 
                              label={formation.montant_formate || `${formation.montant} FCFA`} 
                              size="small" 
                              color="primary"
                              variant="outlined"
                            />
                            {formation.session && (
                              <Chip 
                                label={formation.session.libelle} 
                                size="small" 
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                      </MenuItem>
                    );
                  })
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth required sx={{ mb: 3 }}>
              <InputLabel>Type de demande</InputLabel>
              <Select
                value={formationData.type_demande_id}
                label="Type de demande"
                disabled
                displayEmpty
              >
                {loadingTypeDemandes ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Chargement des types de demande...
                  </MenuItem>
                ) : typeDemandes.length === 0 ? (
                  <MenuItem disabled>
                    Aucun type de demande disponible
                  </MenuItem>
                ) : (
                  typeDemandes.map((typeDemande) => (
                    <MenuItem key={typeDemande.id} value={typeDemande.id}>
                      {getTypeDemandeDisplayName(typeDemande.name)}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            {selectedFormation && (() => {
              // Récupérer le libellé du type de permis de manière sûre
              let typePermisLabel = 'N/A';
              if (selectedFormation.typePermis) {
                typePermisLabel = ('libelle' in selectedFormation.typePermis) 
                  ? selectedFormation.typePermis.libelle 
                  : ('nom' in selectedFormation.typePermis ? selectedFormation.typePermis.nom : 'N/A');
              } else if (selectedFormation.type_permis) {
                typePermisLabel = ('libelle' in selectedFormation.type_permis) 
                  ? selectedFormation.type_permis.libelle 
                  : ('nom' in selectedFormation.type_permis ? selectedFormation.type_permis.nom : 'N/A');
              }
              
              return (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: '1px solid', borderColor: 'primary.200' }}>
                  <Typography variant="subtitle2" color="primary.main" gutterBottom fontWeight="bold">
                    Détails de la formation
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {selectedFormation.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {selectedFormation.description}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Type de permis:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {typePermisLabel}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Montant:
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {selectedFormation.montant_formate || `${selectedFormation.montant} FCFA`}
                      </Typography>
                    </Box>
                    {selectedFormation.session && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Session:
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {selectedFormation.session.libelle}
                        </Typography>
                      </Box>
                    )}
                    {selectedFormation.duree_jours && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Durée:
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {selectedFormation.duree_jours} jours
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })()}

            <TextField
              label="Commentaires (optionnel)"
              value={formationData.commentaires}
              onChange={(e) => setFormationData({ ...formationData, commentaires: e.target.value })}
              multiline
              rows={3}
              fullWidth
              placeholder="Ajoutez des notes ou commentaires concernant cette inscription..."
              disabled={loading}
            />
          </Box>
        );

      default:
        return 'Étape inconnue';
    }
  };

  const stepIndicatorColor = {
    completed: '#2e7d32',
    active: '#1976d2',
    inactive: '#9e9e9e',
  };

  const header = (
    <>
      <Typography variant="h5" fontWeight="bold" color="text.primary">
        Inscrire un nouveau candidat
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {autoEcole.nom_auto_ecole}
      </Typography>
    </>
  );

  const customStepper = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 3 }}>
      {steps.map((label, index) => {
        const isCompleted = index < activeStep;
        const isActive = index === activeStep;
        return (
          <Box
            key={label}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              borderBottom: isActive ? 2 : 0,
              borderColor: stepIndicatorColor.active,
              pb: 0.5,
              pr: index < steps.length - 1 ? 2 : 0,
            }}
          >
            {isCompleted ? (
              <CheckCircle sx={{ color: stepIndicatorColor.completed, fontSize: 22 }} />
            ) : (
              <RadioButtonUnchecked
                sx={{
                  color: isActive ? stepIndicatorColor.active : stepIndicatorColor.inactive,
                  fontSize: 22,
                }}
              />
            )}
            <Typography
              variant="body2"
              fontWeight={isActive ? 600 : 400}
              color={isActive ? stepIndicatorColor.active : isCompleted ? 'text.primary' : stepIndicatorColor.inactive}
            >
              {label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );

  const content = (
    <>
      {customStepper}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
          {success}
        </Alert>
      )}
      {getStepContent(activeStep)}
    </>
  );

  const actions = (
    <>
      <Button variant="outlined" onClick={onCancel} disabled={loading} sx={{ borderColor: '#9e9e9e', color: '#616161' }}>
        Annuler
      </Button>
      {activeStep === steps.length - 1 && (
        <Button variant="outlined" onClick={handleBack} disabled={loading} startIcon={<ArrowBack />}>
          Précédent
        </Button>
      )}
      {activeStep === steps.length - 1 && (
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || loadingFormations || loadingTypeDemandes}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
          endIcon={<ArrowForward />}
          sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
        >
          {loading ? 'Inscription en cours...' : "Finaliser l'inscription"}
        </Button>
      )}
    </>
  );

  const cardContent = (
    <Paper
      elevation={3}
      sx={{
        width: '100%',
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <Box sx={{ p: 3, bgcolor: '#fff' }}>
        <Box sx={{ mb: 3 }}>{header}</Box>
        {content}
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          {actions}
        </Box>
      </Box>
    </Paper>
  );

  if (isPage) {
    return (
      <Box sx={{ py: 4, px: 2 }}>
        {cardContent}
      </Box>
    );
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>{header}</DialogTitle>
      <DialogContent sx={{ bgcolor: '#fafafa' }}>{content}</DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', gap: 1.5 }}>
        {actions}
      </DialogActions>
    </Dialog>
  );
};

export default InscriptionFormationForm;
