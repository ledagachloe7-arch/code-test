import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Box,
  Stepper,
  Step,
  StepLabel,
  Collapse,
} from '@mui/material';
import {
  PersonAdd,
  ArrowBack,
  ArrowForward,
  CheckCircle,
  Add,
  Close,
} from '@mui/icons-material';
import {
  AutoEcole,
  autoEcoleService,
  TypeDemande,
  gestionDossierService,
} from '../services';
import { authService } from '../../auth/services/authService';
import { 
  NumeroPermisParts, 
  PermisData, 
  PersonneData, 
  CandidatData, 
  FormationData,
  LieuExamenData,
  CreateDossierFormProps 
} from './types';
import { 
  checkIsNouveauPermis,
  checkIsFicheEnregistre,
  getFieldLabel,
  extractCategorieFromNumeroPermis,
  buildNumeroPermis,
  buildNumeroOriginePermis,
  findPermisByNumero,
  parseNumeroOriginePermisToParts,
} from './utils';
import {
  validateStep0,
  validateStepNumeroPermis,
  validatePermisOrigine,
  validateStepAutoEcole,
  validatePersonne,
  validateCandidat
} from './validation';
import { validateDossierCreationReadiness } from './dossierCreationReadiness';
import {
  useAutoEcoles,
  useFormations,
  useTypeDemandes,
  useReferentiels,
  useAgentLieuExamen,
} from './hooks';
import {
  TypeDemandeStep,
  AutoEcoleFormationStep,
  NumeroPermisStep,
  PermisInfoStep,
  PermisOrigineStep,
  PermisBOrigineStep,
  SearchCandidatStep,
  CandidatRecapStep,
  PersonneFormStep,
  CandidatFormStep,
  FinalisationStep,
  type PermisFromApi,
  type DataCategorieItem,
  permisToDataCategorieItem,
} from './steps';

const CreateDossierForm: React.FC<CreateDossierFormProps> = ({ onSuccess }) => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingPermis, setVerifyingPermis] = useState(false);
  const [permisVerified, setPermisVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [candidatTrouveFromPermis, setCandidatTrouveFromPermis] = useState<any | null>(null);
  const [candidatNonTrouve, setCandidatNonTrouve] = useState(false);
  
  // États pour la vérification du permis principal (Duplicata/Fiche d'enregistrement)
  const [verifyingPermisPrincipal, setVerifyingPermisPrincipal] = useState(false);
  const [permisPrincipalVerified, setPermisPrincipalVerified] = useState(false);
  const [verificationErrorPrincipal, setVerificationErrorPrincipal] = useState<string | null>(null);
  const [candidatTrouveFromPermisPrincipal, setCandidatTrouveFromPermisPrincipal] = useState<any | null>(null);
  const [candidatNonTrouvePrincipal, setCandidatNonTrouvePrincipal] = useState(false);
  /** Liste des permis retournés par l’API (plusieurs) → ouvre le modal de sélection dans NumeroPermisStep */
  const [permisListForModal, setPermisListForModal] = useState<PermisFromApi[] | null>(null);
  /** Données data_categorie pour le dossier (permis sélectionnés) */
  const [dataCategorie, setDataCategorie] = useState<DataCategorieItem[]>([]);
  const [lieuExamenData, setLieuExamenData] = useState<LieuExamenData>({ province_id: '', centre_id: '' });
  const {
    lieu: agentLieu,
    labels: agentLieuLabels,
    loading: agentLieuLoading,
    error: agentLieuError,
  } = useAgentLieuExamen();
  
  // États pour la vérification du permis d'origine (catégorie C/D/E)
  const [verifyingPermisOrigine, setVerifyingPermisOrigine] = useState(false);
  const [permisOrigineVerified, setPermisOrigineVerified] = useState(false);
  const [verificationErrorOrigine, setVerificationErrorOrigine] = useState<string | null>(null);
  const [candidatTrouveFromPermisOrigine, setCandidatTrouveFromPermisOrigine] = useState<any | null>(null);
  const [candidatNonTrouveOrigine, setCandidatNonTrouveOrigine] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  
  // États pour les données
  const [selectedAutoEcole, setSelectedAutoEcole] = useState<AutoEcole | null>(null);
  const [candidatId, setCandidatId] = useState<string | null>(null);
  const [personneId, setPersonneId] = useState<string | null>(null);
  
  // État pour le type de demande sélectionné
  const [selectedTypeDemande, setSelectedTypeDemande] = useState<TypeDemande | null>(null);
  const [typeDemandeId, setTypeDemandeId] = useState<string>('');
  const [isNouveauPermis, setIsNouveauPermis] = useState(false);
  const [isFicheEnregistre, setIsFicheEnregistre] = useState(false);
  
  // État pour le numéro de permis (pour les types autres que nouveau permis)
  const [numeroPermis, setNumeroPermis] = useState<string>('');

  // État pour le format de numéro de permis
  const [permisFormat, setPermisFormat] = useState<'standard' | 'op'>('standard');
  const [permisOrigineFormat, setPermisOrigineFormat] = useState<'standard' | 'op'>('standard');

  // États pour la construction du numéro de permis
  const [numeroPermisParts, setNumeroPermisParts] = useState<NumeroPermisParts>({
    annee: '',
    province: '',
    categorie: '',
    numero: '',
  });

  // États pour la construction du numéro de permis d'origine
  const [numeroOriginePermisParts, setNumeroOriginePermisParts] = useState<NumeroPermisParts>({
    annee: '',
    province: '',
    categorie: '',
    numero: '',
  });

  // États pour les informations du permis (pour les types autres que nouveau permis)
  const [permisData, setPermisData] = useState<PermisData>({
    numero_permis: '',
    numero_origine_permis: '',
    lieu_de_dobtention_du_permis: '',
    date_de_dobtention_du_permis: '',
    date_de_delivrance_du_permis: '',
  });

  // États pour les informations du permis B d'origine (pour nouveau permis de type C)
  const [numeroBOriginePermisParts, setNumeroBOriginePermisParts] = useState<NumeroPermisParts>({
    annee: '',
    province: '',
    categorie: '',
    numero: '',
  });
  const [permisBOrigineFormat, setPermisBOrigineFormat] = useState<'standard' | 'op'>('standard');
  const [permisBOrigineData, setPermisBOrigineData] = useState<PermisData>({
    numero_permis: '',
    numero_origine_permis: '',
    lieu_de_dobtention_du_permis: '',
    date_de_dobtention_du_permis: '',
    date_de_delivrance_du_permis: '',
  });

  // États du formulaire - Auto-école et formation (si nouveau permis)
  const [autoEcoleId, setAutoEcoleId] = useState<string>('');

  // États du formulaire - Informations personnelles
  const [personneData, setPersonneData] = useState<PersonneData>({
    nom: '',
    prenom: '',
    email: '',
    contact: '',
    telephone: '',
    adresse: '',
    password: '',
    password_confirmation: '',
  });

  // États pour le captcha
  const [captchaId, setCaptchaId] = useState<string>('');
  const [captchaCode, setCaptchaCode] = useState<string>('');

  // État pour le candidat sélectionné (recherche)
  const [selectedCandidat, setSelectedCandidat] = useState<any | null>(null);
  const [candidatMode, setCandidatMode] = useState<'new' | 'existing' | null>(null);

  // États du formulaire - Informations du candidat
  const [candidatData, setCandidatData] = useState<CandidatData>({
    date_naissance: '',
    lieu_naissance: '',
    nip: '',
    type_piece: 'CNI',
    numero_piece: '',
    nationalite: 'Sénégalaise',
    genre: 'M',
  });

  // États du formulaire - Formation et référentiel
  const [formationData, setFormationData] = useState<FormationData>({
    formation_id: '',
    referenciel_id: '',
    commentaires: '',
  });

  // Fonction pour déterminer la catégorie du permis à partir du numéro saisi
  const getPermisCategorie = (): string => {
    if (isNouveauPermis) return '';
    
    const numPermisComplet = permisData.numero_permis || numeroPermis || buildNumeroPermis(numeroPermisParts, permisFormat);
    if (!numPermisComplet) return '';
    
    // Si format OP, on ne peut pas extraire la catégorie
    if (numPermisComplet.toUpperCase().startsWith('PERM')) return '';
    
    // Extraire la catégorie du numéro de permis
    const categorie = numeroPermisParts.categorie?.toUpperCase() || extractCategorieFromNumeroPermis(numPermisComplet);
    return categorie || '';
  };

  // Fonction pour déterminer si on doit afficher l'étape "Permis d'origine"
  const needsPermisOrigine = (): boolean => {
    if (isNouveauPermis) return false;
    if (isFicheEnregistre) return false; // Pour fiche enregistre, le permis d'origine est déjà saisi à l'étape 2
    
    const categorie = getPermisCategorie();
    return Boolean(categorie && ['C', 'D', 'E'].includes(categorie));
  };

  // Utiliser les hooks personnalisés pour charger les données (déclarer avant getSteps)
  const { autoEcoles, loading: loadingAutoEcoles, loadAutoEcoles } = useAutoEcoles();
  const { formations, loading: loadingFormations, loadFormations } = useFormations();
  const { typeDemandes, loading: loadingTypeDemandes, loadTypeDemandes } = useTypeDemandes();
  const { referentiels, loading: loadingReferentiels, loadReferentiels } = useReferentiels();

  // Fonction pour déterminer si la formation sélectionnée est de type permis C
  const isFormationTypeC = (): boolean => {
    if (!isNouveauPermis || !formationData.formation_id) return false;
    if (!formations || formations.length === 0) return false; // Vérification de sécurité
    
    const selectedFormation = formations.find(f => f.id === formationData.formation_id);
    if (!selectedFormation) return false;
    
    // Vérifier type_permis (snake_case)
    if (selectedFormation.type_permis) {
      const typePermis = selectedFormation.type_permis as any;
      if (typePermis.libelle) {
        const libelle = typePermis.libelle.toUpperCase();
        return libelle.includes('PERMIS C') || libelle === 'C' || libelle.includes('PERMIS C');
      }
      if (typePermis.code) {
        const code = typePermis.code.toUpperCase();
        return code.includes('PERMIS_C') || code === 'PERMIS_C' || code === 'C';
      }
      if (typePermis.nom) {
        const nom = typePermis.nom.toUpperCase();
        return nom.includes('PERMIS C') || nom === 'C' || nom.includes('PERMIS C');
      }
    }
    
    // Vérifier typePermis (camelCase)
    if (selectedFormation.typePermis) {
      const typePermis = selectedFormation.typePermis as any;
      if (typePermis.libelle) {
        const libelle = typePermis.libelle.toUpperCase();
        return libelle.includes('PERMIS C') || libelle === 'C' || libelle.includes('PERMIS C');
      }
      if (typePermis.code) {
        const code = typePermis.code.toUpperCase();
        return code.includes('PERMIS_C') || code === 'PERMIS_C' || code === 'C';
      }
      if (typePermis.nom) {
        const nom = typePermis.nom.toUpperCase();
        return nom.includes('PERMIS C') || nom === 'C' || nom.includes('PERMIS C');
      }
    }
    
    return false;
  };

  // Déterminer les étapes dynamiquement selon le type de demande
  const getSteps = () => {
    const baseSteps = ['Type de demande'];
    
    if (isNouveauPermis) {
      baseSteps.push('Auto-école et Formation');
      // Si la formation est de type C, ajouter l'étape permis B d'origine
      if (isFormationTypeC()) {
        baseSteps.push('Permis B d\'origine');
      }
    } else {
      // Pour les autres types de permis
      baseSteps.push('Numéro de permis');
      baseSteps.push('Informations du permis');
      
      // Si catégorie C/D/E, ajouter l'étape permis d'origine
      if (needsPermisOrigine()) {
        baseSteps.push('Permis d\'origine');
      }
    }
    
    // Si un candidat existant est sélectionné, on ne montre pas les étapes de création
    const hasExistingCandidat = candidatMode === 'existing' && selectedCandidat && candidatId;
    if (!hasExistingCandidat) {
      baseSteps.push('Informations personnelles', 'Informations du candidat');
    }
    
    baseSteps.push('Finalisation');
    
    return baseSteps;
  };

  const steps = getSteps();

  // Charger les données au montage
  useEffect(() => {
    if (showForm) {
      loadTypeDemandes();
      loadReferentiels();
    }
  }, [showForm]);

  useEffect(() => {
    if (!showForm) return;
    setLieuExamenData({
      province_id: agentLieu.province_id,
      centre_id: agentLieu.centre_id,
    });
  }, [showForm, agentLieu.province_id, agentLieu.centre_id]);

  // Charger les auto-écoles si nouveau permis
  useEffect(() => {
    if (isNouveauPermis && showForm) {
      loadAutoEcoles();
    }
  }, [isNouveauPermis, showForm]);

  // Charger les formations quand une auto-école est sélectionnée
  useEffect(() => {
    if (autoEcoleId && isNouveauPermis && showForm) {
      const autoEcole = autoEcoles.find(ae => ae.id === autoEcoleId);
      if (autoEcole) {
        setSelectedAutoEcole(autoEcole);
        loadFormations(autoEcoleId);
      }
    }
  }, [autoEcoleId, autoEcoles, isNouveauPermis, showForm]);
  
  // Handler pour la sélection du référentiel
  const handleReferencielChange = useCallback((referencielId: string) => {
    console.log('📤 [handleReferencielChange] Sélection du référentiel:', referencielId);
    setFormationData(prev => {
      console.log('📤 [handleReferencielChange] Mise à jour formationData.referenciel_id de', prev.referenciel_id, 'vers', referencielId);
      return { ...prev, referenciel_id: referencielId };
    });
  }, []);

  // Auto-sélectionner le référentiel après chargement des référentiels si une catégorie est déjà définie
  useEffect(() => {
    if (referentiels.length > 0 && numeroPermisParts.categorie) {
      const categorieUpper = numeroPermisParts.categorie.toUpperCase();
      
      // Si la catégorie contient plusieurs valeurs (ex: "B, C"), prendre la première
      const premiereCategorie = categorieUpper.split(',')[0].trim();
      
      console.log('🔍 [useEffect] Recherche du référentiel pour la catégorie:', premiereCategorie);
      console.log('📋 [useEffect] Référentiels disponibles:', referentiels.length, referentiels.map(r => ({ id: r.id, code: r.code, libelle: r.libelle })));
      console.log('📋 [useEffect] Référentiel actuellement sélectionné:', formationData.referenciel_id);
      
      // Rechercher le référentiel qui correspond à la catégorie
      // Exemples : "C" -> "PERMIS_C", "B" -> "PERMIS_B", "A" -> "PERMIS_A", etc.
      const referentielTrouve = referentiels.find((ref) => {
        if (!ref.code) return false;
        const codeUpper = ref.code.toUpperCase();
        // Correspondance exacte (ex: "C" === "C")
        if (codeUpper === premiereCategorie) return true;
        // Correspondance avec préfixe PERMIS_ (ex: "PERMIS_C" pour catégorie "C")
        if (codeUpper === `PERMIS_${premiereCategorie}`) return true;
        // Correspondance avec préfixe PERMIS (ex: "PERMIS_C" contient "C")
        if (codeUpper.includes(`PERMIS_${premiereCategorie}`) || codeUpper.includes(`PERMIS${premiereCategorie}`)) return true;
        // Correspondance inverse : le code contient la catégorie (ex: "PERMIS_C" contient "C")
        if (codeUpper.includes(premiereCategorie)) return true;
        return false;
      });
      
      if (referentielTrouve) {
        // Mettre à jour même si un référentiel est déjà sélectionné, pour s'assurer que c'est le bon
        if (formationData.referenciel_id !== referentielTrouve.id) {
          console.log('✅ [useEffect] Référentiel automatiquement sélectionné après chargement pour la catégorie:', premiereCategorie, referentielTrouve);
          setFormationData(prev => ({
            ...prev,
            referenciel_id: referentielTrouve.id,
          }));
        } else {
          console.log('ℹ️ [useEffect] Le référentiel correct est déjà sélectionné');
        }
      } else {
        console.log('⚠️ [useEffect] Aucun référentiel trouvé pour la catégorie:', premiereCategorie);
        console.log('📋 [useEffect] Codes des référentiels disponibles:', referentiels.map(r => r.code));
      }
    }
  }, [referentiels, numeroPermisParts.categorie]);

  const handleCnepcAutoEcoleChange = useCallback(
    (id: string) => {
      setAutoEcoleId(id);
      setFormationData((prev) => ({ ...prev, formation_id: '' }));
      if (!id) {
        setSelectedAutoEcole(null);
        return;
      }
      setSelectedAutoEcole((prev) =>
        prev?.id === id ? prev : ({ id, nom_auto_ecole: prev?.nom_auto_ecole ?? 'CNEPC' } as AutoEcole)
      );
    },
    [setAutoEcoleId, setSelectedAutoEcole, setFormationData]
  );

  const handleCnepcFormationChange = useCallback(
    (formationId: string) => {
      setFormationData((prev) => ({ ...prev, formation_id: formationId }));
    },
    [setFormationData]
  );

  const finalisationCnepcProps = useMemo(
    () =>
      !isNouveauPermis
        ? {
            showCnepcTraining: true as const,
            autoEcoleId,
            onAutoEcoleChange: handleCnepcAutoEcoleChange,
            onFormationChange: handleCnepcFormationChange,
          }
        : {},
    [isNouveauPermis, autoEcoleId, handleCnepcAutoEcoleChange, handleCnepcFormationChange]
  );

  // Pré-remplir les données quand un candidat est sélectionné (uniquement si mode 'existing')
  useEffect(() => {
    if (selectedCandidat && candidatMode === 'existing') {
      const personne = selectedCandidat.personne;
      
      // Définir les IDs directement (pas besoin de pré-remplir les formulaires si on crée directement le dossier)
      if (personne?.id) {
        setPersonneId(personne.id);
      }
      if (selectedCandidat.id) {
        setCandidatId(selectedCandidat.id);
      }
      
      console.log('✅ Candidat existant sélectionné - IDs définis:', {
        personneId: personne?.id,
        candidatId: selectedCandidat.id,
      });
    } else if (candidatMode === 'new' && selectedCandidat) {
      // Réinitialiser les IDs si on passe en mode nouveau candidat
      setPersonneId(null);
      setCandidatId(null);
    }
  }, [selectedCandidat, candidatMode]);

  // Réinitialiser le formulaire
  const resetForm = () => {
    setActiveStep(0);
    setTypeDemandeId('');
    setSelectedTypeDemande(null);
    setIsNouveauPermis(false);
    setIsFicheEnregistre(false);
    setVerifyingPermis(false);
    setPermisVerified(false);
    setVerificationError(null);
    setCandidatTrouveFromPermis(null);
    setCandidatNonTrouve(false);
    setCandidatTrouveFromPermisPrincipal(null);
    setCandidatNonTrouvePrincipal(false);
    setVerifyingPermisPrincipal(false);
    setPermisPrincipalVerified(false);
    setVerificationErrorPrincipal(null);
    setVerifyingPermisOrigine(false);
    setPermisOrigineVerified(false);
    setVerificationErrorOrigine(null);
    setCandidatTrouveFromPermisOrigine(null);
    setCandidatNonTrouveOrigine(false);
    setNumeroPermis('');
    setPermisFormat('standard');
    setPermisOrigineFormat('standard');
    setNumeroPermisParts({
      annee: '',
      province: '',
      categorie: '',
      numero: '',
    });
    setNumeroOriginePermisParts({
      annee: '',
      province: '',
      categorie: '',
      numero: '',
    });
    setPermisData({
      numero_permis: '',
      numero_origine_permis: '',
      lieu_de_dobtention_du_permis: '',
      date_de_dobtention_du_permis: '',
      date_de_delivrance_du_permis: '',
    });
    setNumeroBOriginePermisParts({
      annee: '',
      province: '',
      categorie: '',
      numero: '',
    });
    setPermisBOrigineFormat('standard');
    setPermisBOrigineData({
      numero_permis: '',
      numero_origine_permis: '',
      lieu_de_dobtention_du_permis: '',
      date_de_dobtention_du_permis: '',
      date_de_delivrance_du_permis: '',
    });
    setAutoEcoleId('');
    setSelectedAutoEcole(null);
    setCandidatId(null);
    setPersonneId(null);
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
      nationalite: 'Sénégalaise',
      genre: 'M',
    });
    setFormationData({
      formation_id: '',
      referenciel_id: '',
      commentaires: '',
    });
    setCaptchaId('');
    setCaptchaCode('');
    setSelectedCandidat(null);
    setCandidatMode(null);
    setError(null);
    setSuccess(null);
  };




  // Fonction helper pour détecter si un message mentionne des champs du candidat
  // Ces champs doivent être validés à l'étape "Informations du candidat", pas à l'étape "Informations personnelles"
  const messageMentionneChampsCandidat = (message: string): boolean => {
    if (!message) return false;
    const messageLower = message.toLowerCase();
    
    // Détecter les mots-clés des champs du candidat
    const champsCandidatKeywords = [
      'date de naissance',
      'lieu de naissance',
      'nip',
      'numéro d\'identification personnel',
      'numero d\'identification personnel',
      'numéro de pièce',
      'numero de piece',
      'date_naissance',
      'lieu_naissance',
      'numero_piece'
    ];
    
    // Vérifier si le message contient un des mots-clés
    const contientKeyword = champsCandidatKeywords.some(keyword => messageLower.includes(keyword));
    
    // Vérifier si le message mentionne "veuillez remplir les champs obligatoires" 
    // ET contient au moins un champ du candidat (signe qu'il s'agit d'une erreur de validation candidat)
    const estMessageValidationAvecChampsCandidat = 
      (messageLower.includes('veuillez remplir') || 
       messageLower.includes('champs obligatoires') ||
       messageLower.includes('champ obligatoire')) &&
      contientKeyword;
    
    // Vérifier si le message contient plusieurs champs du candidat ensemble
    // (signe qu'il s'agit d'une erreur de validation candidat)
    const contientPlusieursChampsCandidat = [
      messageLower.includes('date') && messageLower.includes('naissance'),
      messageLower.includes('lieu') && messageLower.includes('naissance'),
      messageLower.includes('nip') || messageLower.includes('identification personnel'),
      messageLower.includes('pièce') || messageLower.includes('piece')
    ].filter(Boolean).length >= 2;
    
    // Détecter spécifiquement le message exact mentionné par l'utilisateur
    // "Veuillez remplir les champs obligatoires suivants : Date de naissance, Lieu de naissance, NIP (Numéro d'Identification Personnel), Numéro de pièce"
    const estMessageExact = 
      messageLower.includes('veuillez remplir les champs obligatoires suivants') &&
      (messageLower.includes('date de naissance') || messageLower.includes('lieu de naissance') || 
       messageLower.includes('nip') || messageLower.includes('numéro de pièce') || messageLower.includes('numero de piece'));
    
    const result = contientKeyword || estMessageValidationAvecChampsCandidat || contientPlusieursChampsCandidat || estMessageExact;
    
    // Log pour déboguer
    if (result) {
      console.log('🔍 Message détecté comme contenant des champs du candidat:', message);
    }
    
    return result;
  };

  // Calculer l'index réel de l'étape selon la logique :
  // Pour nouveau permis type C : Type demande -> Auto-école/Formation -> Permis B d'origine -> Récapitulatif/PersonneFormStep -> CandidatFormStep -> Finalisation
  // Pour nouveau permis non-C : Type demande -> Auto-école/Formation -> PersonneFormStep -> CandidatFormStep -> Finalisation
  // Pour autres types avec permis d'origine : Type demande -> Numéro permis -> Informations permis -> Permis d'origine -> PersonneFormStep -> CandidatFormStep -> Finalisation
  // Pour autres types sans permis d'origine : Type demande -> Numéro permis -> Informations permis -> PersonneFormStep -> CandidatFormStep -> Finalisation
  const getRealStepIndex = (step: number): number => {
    if (step === 0) return 0; // Étape 1 : Type de demande
    
    const hasExistingCandidat = candidatMode === 'existing' && selectedCandidat && candidatId;
    const hasPermisOrigine = needsPermisOrigine();
    
    if (isNouveauPermis) {
      // Pour nouveau permis : Type demande -> Auto-école/Formation -> [Permis B d'origine si type C] -> [Récapitulatif OU PersonneFormStep] -> CandidatFormStep -> Finalisation
      const hasPermisBOrigine = isFormationTypeC();
      if (step === 1) return 1; // Auto-école/Formation
      if (hasPermisBOrigine) {
        if (step === 2) return 2; // Permis B d'origine
        if (step === 3) return 3; // Récapitulatif
      if (hasExistingCandidat) {
        return 6; // Finalisation (sauter Personne et Candidat)
      } else {
          if (step === 4) return 4; // Informations personnelles
          if (step === 5) return 5; // Informations candidat
          if (step === 6) return 6; // Finalisation
      }
    } else {
        if (hasExistingCandidat) {
          return 6; // Finalisation (sauter Personne et Candidat)
        } else {
          if (step === 2) return 2; // (pas utilisé, on passe directement à 4)
          if (step === 4) return 4; // Informations personnelles
          if (step === 5) return 5; // Informations candidat
          if (step === 6) return 6; // Finalisation
        }
      }
    } else {
      // Pour autres types : Type demande -> Numéro permis -> Informations permis -> [Permis origine] -> Personne -> Candidat -> Finalisation
      if (step === 1) return 1; // Numéro de permis
      if (step === 2) return 2; // Informations du permis
      
      let currentRealStep = 3;
      
      // Si permis d'origine requis, c'est l'étape 3
      if (hasPermisOrigine) {
        if (step === 3) return 3; // Permis d'origine
        currentRealStep = 4;
      }
      
      if (hasExistingCandidat) {
        // Sauter Personne et Candidat, aller directement à Finalisation
        return 6; // Finalisation
      } else {
        // Informations personnelles - étape 4
        if (step === 4) return 4; // Informations personnelles
        // Informations candidat - étape 5
        if (step === 5) return 5; // Informations candidat
        // Finalisation - étape 6
        if (step === 6) return 6; // Finalisation
      }
    }
    
    return step;
  };

  // Fonction pour enregistrer les informations personnelles via auth/register
  const handleRegisterPersonne = async () => {
    setError(null);
    
    // Valider les données de la personne
      if (!validatePersonne({ personneData, setError })) {
        return;
      }

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

        console.log('📤 Données complètes envoyées à auth/register:', JSON.stringify(registerPayload, null, 2));

        const registerResponse = await authService.register(registerPayload);
        
      if (registerResponse.user?.personne?.id) {
          setPersonneId(registerResponse.user.personne.id);
        // Passer à l'étape suivante : Informations du candidat
        // Calculer l'étape suivante selon le contexte
        let nextStep = 5; // Par défaut pour nouveau permis
        if (!isNouveauPermis) {
          // Pour autres types de permis, l'étape suivante dépend de si on a un permis d'origine
          const hasPermisOrigine = needsPermisOrigine();
          nextStep = hasPermisOrigine ? 6 : 5; // Si permis d'origine, PersonneFormStep est à 4, donc CandidatFormStep est à 6
        }
        console.log('✅ [handleRegisterPersonne] Passage à l\'étape suivante:', nextStep, 'isNouveauPermis:', isNouveauPermis, 'needsPermisOrigine:', needsPermisOrigine());
        setActiveStep(nextStep);
        } else {
          setError('Erreur: Impossible de récupérer l\'ID de la personne');
        }
      } catch (err: any) {
        console.error('❌ Erreur complète lors de l\'enregistrement:', err);
        console.error('📋 Réponse d\'erreur:', err.response?.data);
        
      // Gérer les erreurs de validation
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
        
        if (errorMessages.length > 0) {
          setError(errorMessages.join(', '));
          } else {
          setError('Erreur lors de l\'enregistrement. Veuillez vérifier vos informations.');
        }
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
        } else {
        // Vérifier si c'est une erreur de connexion au service externe (Authentik)
        const errorString = err.message?.toLowerCase() || '';
        if (errorString.includes('Could not resolve host') || 
            errorString.includes('iam.transports.gouv.ga') ||
            errorString.includes('Authentik') ||
            errorString.includes('cURL error 6')) {
          setError('Erreur de connexion au service d\'authentification. Veuillez réessayer plus tard ou contacter le support technique si le problème persiste.');
          } else {
          setError('Erreur lors de l\'enregistrement. Veuillez réessayer.');
          }
        }
      } finally {
        setLoading(false);
      }
  };

  // Fonction pour créer le candidat via autoEcoleService.createCandidat
  const handleCreateCandidat = async () => {
      setError(null);
    
    // Valider les données du candidat
      if (!validateCandidat({ candidatData, setError })) {
        return;
      }
      
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
      
      console.log('📤 Création du candidat via /candidats:', JSON.stringify(candidatPayload, null, 2));
        
        const response = await autoEcoleService.createCandidat(candidatPayload as any);
      
      if (response.data?.id) {
        setCandidatId(response.data.id);
        // Passer à la finalisation - calculer l'étape suivante selon le contexte
        let nextStep = 6; // Par défaut pour nouveau permis et autres types sans permis d'origine
        if (!isNouveauPermis) {
          // Pour autres types de permis, l'étape suivante dépend de si on a un permis d'origine
          const hasPermisOrigine = needsPermisOrigine();
          // Si permis d'origine, CandidatFormStep est à l'étape 6, donc FinalisationStep est à l'étape 7
          nextStep = hasPermisOrigine ? 7 : 6;
        }
        console.log('✅ [handleCreateCandidat] Passage à l\'étape suivante:', nextStep, 'isNouveauPermis:', isNouveauPermis, 'needsPermisOrigine:', needsPermisOrigine());
        setActiveStep(nextStep);
      } else {
        setError('Erreur: Impossible de récupérer l\'ID du candidat créé.');
      }
      } catch (err: any) {
      console.error('❌ Erreur lors de la création du candidat:', err);
      console.error('📋 Réponse d\'erreur:', err.response?.data);
      
      // Gérer les erreurs de validation
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
        
        if (errorMessages.length > 0) {
          setError(errorMessages.join(', '));
          } else {
          setError('Erreur lors de la création du candidat. Veuillez vérifier vos informations.');
          }
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
        } else {
        setError('Erreur lors de la création du candidat. Veuillez réessayer.');
        }
      } finally {
        setLoading(false);
      }
  };

  // Applique les données d’un permis principal (après vérification ou après sélection dans le modal)
  const applyPermisPrincipalFromApi = async (permisDataFromApi: any, numPermisComplet: string) => {
    setPermisData(prev => ({
      ...prev,
      numero_permis: numPermisComplet,
      lieu_de_dobtention_du_permis: permisDataFromApi.lieu_obtention || prev.lieu_de_dobtention_du_permis || '',
      date_de_dobtention_du_permis: permisDataFromApi.date_obtention ? permisDataFromApi.date_obtention.split('T')[0] : prev.date_de_dobtention_du_permis || '',
      date_de_delivrance_du_permis: permisDataFromApi.date_validite ? permisDataFromApi.date_validite.split('T')[0] : prev.date_de_delivrance_du_permis || '',
    }));
    setNumeroPermis(numPermisComplet);
    if (permisFormat === 'standard' && permisDataFromApi.numero_permis) {
      const numPermisApi = permisDataFromApi.numero_permis;
      const parts = numPermisApi.split('-');
      if (parts.length === 4) {
        setNumeroPermisParts({ annee: parts[0] || '', province: parts[1] || '', categorie: parts[2] || '', numero: parts[3] || '' });
      } else if (permisDataFromApi.categorie) {
        const categorieUpper = permisDataFromApi.categorie.toUpperCase();
        setNumeroPermisParts(prev => ({ ...prev, categorie: categorieUpper }));
      }
    } else if (permisDataFromApi.categorie) {
      setNumeroPermisParts(prev => ({ ...prev, categorie: (permisDataFromApi.categorie || '').toUpperCase() }));
    }
    if (permisDataFromApi.categorie && referentiels.length > 0) {
      const premiereCategorie = (permisDataFromApi.categorie || '').toUpperCase().split(',')[0].trim();
      const referentielTrouve = referentiels.find((ref: any) => ref.code && ref.code.toUpperCase() === premiereCategorie);
      if (referentielTrouve) setFormationData(prev => ({ ...prev, referenciel_id: referentielTrouve.id }));
    }
    if (permisDataFromApi.categorie) {
      const categories = (permisDataFromApi.categorie || '').toUpperCase().split(',').map((c: string) => c.trim());
      const needsPermisOrigine = categories.some((cat: string) => ['C', 'D', 'E'].includes(cat));
      if (needsPermisOrigine && permisDataFromApi.numero_origine_permis) {
        const numOriginePermis = permisDataFromApi.numero_origine_permis.trim();
        const { format: formatOrigine, parts: partsOrigine } = parseNumeroOriginePermisToParts(numOriginePermis);
        setNumeroOriginePermisParts(partsOrigine);
        setPermisOrigineFormat(formatOrigine);
        setNumeroBOriginePermisParts(partsOrigine);
        setPermisBOrigineFormat(formatOrigine);
        setPermisData(prev => ({ ...prev, numero_origine_permis: numOriginePermis, lieu_de_dobtention_du_permis: permisDataFromApi.lieu_origine || prev.lieu_de_dobtention_du_permis || '' }));
        setPermisBOrigineData(prev => ({
          ...prev,
          numero_origine_permis: numOriginePermis,
          lieu_de_dobtention_du_permis: permisDataFromApi.lieu_origine || prev.lieu_de_dobtention_du_permis || '',
          date_de_dobtention_du_permis: permisDataFromApi.date_obtention ? permisDataFromApi.date_obtention.split('T')[0] : prev.date_de_dobtention_du_permis || '',
          date_de_delivrance_du_permis: permisDataFromApi.date_validite ? permisDataFromApi.date_validite.split('T')[0] : prev.date_de_delivrance_du_permis || '',
        }));
      }
    }
    if (permisDataFromApi.nom && permisDataFromApi.prenom && permisDataFromApi.date_naissance) {
      try {
        const searchResponse = await autoEcoleService.getCandidats(1, 50, { search: `${permisDataFromApi.nom} ${permisDataFromApi.prenom}`.trim() });
        const dateNaissanceFormatee = permisDataFromApi.date_naissance.split('T')[0];
        if (searchResponse.data && searchResponse.data.length > 0) {
          const candidatTrouve = searchResponse.data.find((candidat: any) => {
            const candidatDateNaissance = candidat.date_naissance ? candidat.date_naissance.split('T')[0] : null;
            return candidat.personne?.nom?.toUpperCase().trim() === permisDataFromApi.nom.toUpperCase().trim()
              && candidat.personne?.prenom?.toUpperCase().trim() === permisDataFromApi.prenom.toUpperCase().trim()
              && candidatDateNaissance === dateNaissanceFormatee;
          });
          if (candidatTrouve) {
            setCandidatTrouveFromPermisPrincipal(candidatTrouve);
            setCandidatNonTrouvePrincipal(false);
          } else {
            setCandidatTrouveFromPermisPrincipal(null);
            setCandidatNonTrouvePrincipal(true);
            setPersonneData(prev => ({ ...prev, nom: permisDataFromApi.nom || prev.nom, prenom: permisDataFromApi.prenom || prev.prenom }));
            setCandidatData(prev => ({ ...prev, date_naissance: permisDataFromApi.date_naissance ? permisDataFromApi.date_naissance.split('T')[0] : prev.date_naissance, lieu_naissance: permisDataFromApi.lieu_naissance || prev.lieu_naissance, nationalite: permisDataFromApi.nationalite || prev.nationalite || 'Sénégalaise', genre: permisDataFromApi.sexe === 'M' ? 'M' : permisDataFromApi.sexe === 'F' ? 'F' : prev.genre, numero_piece: permisDataFromApi.numero_identite || prev.numero_piece }));
            setCandidatMode('new');
            setSelectedCandidat(null);
          }
        } else {
          setCandidatTrouveFromPermisPrincipal(null);
          setCandidatNonTrouvePrincipal(true);
          setPersonneData(prev => ({ ...prev, nom: permisDataFromApi.nom || prev.nom, prenom: permisDataFromApi.prenom || prev.prenom }));
          setCandidatData(prev => ({ ...prev, date_naissance: permisDataFromApi.date_naissance ? permisDataFromApi.date_naissance.split('T')[0] : prev.date_naissance, lieu_naissance: permisDataFromApi.lieu_naissance || prev.lieu_naissance, nationalite: permisDataFromApi.nationalite || prev.nationalite || 'Sénégalaise', genre: permisDataFromApi.sexe === 'M' ? 'M' : permisDataFromApi.sexe === 'F' ? 'F' : prev.genre, numero_piece: permisDataFromApi.numero_identite || prev.numero_piece }));
          setCandidatMode('new');
          setSelectedCandidat(null);
        }
      } catch {
        setCandidatTrouveFromPermisPrincipal(null);
        setCandidatNonTrouvePrincipal(true);
        setPersonneData(prev => ({ ...prev, nom: permisDataFromApi.nom || prev.nom, prenom: permisDataFromApi.prenom || prev.prenom }));
        setCandidatData(prev => ({ ...prev, date_naissance: permisDataFromApi.date_naissance ? permisDataFromApi.date_naissance.split('T')[0] : prev.date_naissance, lieu_naissance: permisDataFromApi.lieu_naissance || prev.lieu_naissance, nationalite: permisDataFromApi.nationalite || prev.nationalite || 'Sénégalaise', genre: permisDataFromApi.sexe === 'M' ? 'M' : permisDataFromApi.sexe === 'F' ? 'F' : prev.genre, numero_piece: permisDataFromApi.numero_identite || prev.numero_piece }));
      }
    }
    setPermisPrincipalVerified(true);
    setVerificationErrorPrincipal(null);
    setVerifyingPermisPrincipal(false);
  };

  const handlePermisSelectionConfirm = (principalPermis: PermisFromApi, dataCategorieSelected: DataCategorieItem[]) => {
    setDataCategorie(dataCategorieSelected);
    setPermisListForModal(null);
    applyPermisPrincipalFromApi(principalPermis, principalPermis.numero_permis || '');
  };

  const handlePermisSelectionClose = () => {
    setPermisListForModal(null);
    setVerificationErrorPrincipal(null);
  };

  // Fonction pour vérifier le permis principal (Duplicata/Fiche d'enregistrement)
  const handleVerifyPermisPrincipal = async () => {
    const numPermisComplet = buildNumeroPermis(numeroPermisParts, permisFormat);
    if (!numPermisComplet || numPermisComplet.trim() === '') {
      setVerificationErrorPrincipal('Veuillez remplir le numéro de permis');
      return;
    }
    
    setVerifyingPermisPrincipal(true);
    setVerificationErrorPrincipal(null);
    setPermisPrincipalVerified(false);
    
    try {
      console.log('🔍 Vérification du permis principal:', numPermisComplet);
      const response = await gestionDossierService.getChangePermis(numPermisComplet);
      console.log('✅ Permis principal vérifié avec succès:', response);

      // Si l’API renvoie plusieurs permis → ouvrir le modal de sélection (dans NumeroPermisStep)
      if (Array.isArray(response) && response.length > 1) {
        setPermisListForModal(response);
        setVerifyingPermisPrincipal(false);
        return;
      }

      // Extraire les données de la réponse : si tableau, prendre l'entrée dont numero_permis correspond au numéro recherché
      let permisDataFromApi: any = null;
      if (Array.isArray(response) && response.length > 0) {
        permisDataFromApi = findPermisByNumero(response, numPermisComplet);
        if (!permisDataFromApi && response.length === 1) {
          permisDataFromApi = response[0];
          console.log('✅ Permis principal trouvé dans la réponse (tableau, un seul élément)');
        } else if (permisDataFromApi) {
          console.log('✅ Permis principal trouvé dans la réponse (entrée correspondant au numéro recherché)');
        }
      } else if (response && typeof response === 'object' && !Array.isArray(response)) {
        permisDataFromApi = response;
        console.log('✅ Permis principal trouvé dans la réponse (objet)');
      }

      if (!permisDataFromApi) {
        setVerificationErrorPrincipal('Le permis renseigné n\'existe pas ou n\'est pas authentifié. Veuillez vérifier le numéro de permis.');
        setPermisPrincipalVerified(false);
        setVerifyingPermisPrincipal(false);
        return;
      }

      setDataCategorie([permisToDataCategorieItem(permisDataFromApi)]);

      await applyPermisPrincipalFromApi(permisDataFromApi, numPermisComplet);
    } catch (err: any) {
      console.error('❌ Erreur lors de la vérification du permis principal:', err);
      setVerifyingPermisPrincipal(false);
      setPermisPrincipalVerified(false);
      
      // Gérer les différents types d'erreurs
      if (err.response?.status === 404) {
        setVerificationErrorPrincipal('Le permis renseigné n\'existe pas dans le système. Veuillez vérifier le numéro de permis.');
      } else if (err.response?.status === 400) {
        setVerificationErrorPrincipal('Le format du numéro de permis est invalide. Veuillez vérifier le numéro saisi.');
      } else if (err.response?.data?.message) {
        setVerificationErrorPrincipal(`Erreur lors de la vérification du permis: ${err.response.data.message}`);
      } else if (err.message) {
        setVerificationErrorPrincipal(`Erreur lors de la vérification du permis: ${err.message}`);
      } else {
        setVerificationErrorPrincipal('Le permis renseigné n\'existe pas ou n\'est pas authentifié. Veuillez vérifier le numéro de permis.');
      }
    }
  };

  // Fonction pour vérifier le permis d'origine (catégorie C/D/E)
  const handleVerifyPermisOrigine = async () => {
    const numPermisOrigineComplet = buildNumeroOriginePermis(numeroOriginePermisParts, permisOrigineFormat);
    if (!numPermisOrigineComplet || numPermisOrigineComplet.trim() === '') {
      setVerificationErrorOrigine('Veuillez remplir le numéro du permis d\'origine');
      return;
    }
    
    setVerifyingPermisOrigine(true);
    setVerificationErrorOrigine(null);
    setPermisOrigineVerified(false);
    
    try {
      console.log('🔍 Vérification du permis d\'origine:', numPermisOrigineComplet);
      const response = await gestionDossierService.getChangePermis(numPermisOrigineComplet);
      console.log('✅ Permis d\'origine vérifié avec succès:', response);
      
      // Extraire les données de la réponse : si tableau, prendre l'entrée dont numero_permis correspond au numéro recherché
      let permisDataFromApi: any = null;
      if (Array.isArray(response) && response.length > 0) {
        permisDataFromApi = findPermisByNumero(response, numPermisOrigineComplet);
        if (!permisDataFromApi && response.length === 1) permisDataFromApi = response[0];
        console.log('✅ Permis d\'origine trouvé dans la réponse (tableau, correspondance ou un seul élément)');
      } else if (response && typeof response === 'object' && !Array.isArray(response)) {
        permisDataFromApi = response;
        console.log('✅ Permis d\'origine trouvé dans la réponse (objet)');
      }
      
      if (!permisDataFromApi) {
        setVerificationErrorOrigine('Le permis d\'origine renseigné n\'existe pas ou n\'est pas authentifié. Veuillez vérifier le numéro de permis.');
        setPermisOrigineVerified(false);
        setVerifyingPermisOrigine(false);
        return;
      }
      
      // Auto-compléter le lieu d'origine si disponible
      if (permisDataFromApi.lieu_obtention || permisDataFromApi.lieu_origine) {
        const lieuOrigine = permisDataFromApi.lieu_origine || permisDataFromApi.lieu_obtention;
        setPermisData(prev => ({
          ...prev,
          lieu_de_dobtention_du_permis: lieuOrigine || prev.lieu_de_dobtention_du_permis || '',
        }));
        console.log('✅ Lieu d\'origine auto-complété:', lieuOrigine);
      }
      
      // Rechercher un candidat existant avec nom, prénom et date de naissance
      if (permisDataFromApi.nom && permisDataFromApi.prenom && permisDataFromApi.date_naissance) {
        try {
          console.log('🔍 [handleVerifyPermisOrigine] Recherche d\'un candidat existant:', {
            nom: permisDataFromApi.nom,
            prenom: permisDataFromApi.prenom,
            date_naissance: permisDataFromApi.date_naissance
          });
          
          // Rechercher par nom et prénom
          const searchResponse = await autoEcoleService.getCandidats(1, 50, {
            search: `${permisDataFromApi.nom} ${permisDataFromApi.prenom}`.trim(),
          });
          
          if (searchResponse.data && searchResponse.data.length > 0) {
            // Formater la date de naissance pour comparaison (YYYY-MM-DD)
            const dateNaissanceFormatee = permisDataFromApi.date_naissance.split('T')[0];
            
            // Chercher un candidat avec le même nom, prénom et date de naissance
            const candidatTrouve = searchResponse.data.find((candidat: any) => {
              const candidatDateNaissance = candidat.date_naissance ? candidat.date_naissance.split('T')[0] : null;
              const nomMatch = candidat.personne?.nom?.toUpperCase().trim() === permisDataFromApi.nom.toUpperCase().trim();
              const prenomMatch = candidat.personne?.prenom?.toUpperCase().trim() === permisDataFromApi.prenom.toUpperCase().trim();
              const dateMatch = candidatDateNaissance === dateNaissanceFormatee;
              
              return nomMatch && prenomMatch && dateMatch;
            });
            
            if (candidatTrouve) {
              console.log('✅ [handleVerifyPermisOrigine] Candidat existant trouvé:', candidatTrouve);
              // Stocker le candidat trouvé pour afficher le récapitulatif
              setCandidatTrouveFromPermisOrigine(candidatTrouve);
              setCandidatNonTrouveOrigine(false);
              // Passer automatiquement à l'étape 4 pour afficher CandidatRecapStep
              setActiveStep(4);
            } else {
              console.log('ℹ️ [handleVerifyPermisOrigine] Aucun candidat existant trouvé');
              setCandidatTrouveFromPermisOrigine(null);
              setCandidatNonTrouveOrigine(true);
              // Auto-compléter les informations personnelles
              setPersonneData(prev => ({
                ...prev,
                nom: permisDataFromApi.nom || prev.nom,
                prenom: permisDataFromApi.prenom || prev.prenom,
              }));
              
              // Auto-compléter les informations du candidat
              setCandidatData(prev => ({
                ...prev,
                date_naissance: permisDataFromApi.date_naissance ? permisDataFromApi.date_naissance.split('T')[0] : prev.date_naissance,
                lieu_naissance: permisDataFromApi.lieu_naissance || prev.lieu_naissance,
                nationalite: permisDataFromApi.nationalite || prev.nationalite || 'Sénégalaise',
                genre: permisDataFromApi.sexe === 'M' ? 'M' : permisDataFromApi.sexe === 'F' ? 'F' : prev.genre,
                numero_piece: permisDataFromApi.numero_identite || prev.numero_piece,
              }));
              
              // S'assurer que le mode est "new" pour créer un nouveau candidat
              setCandidatMode('new');
              setSelectedCandidat(null);
            }
          } else {
            console.log('ℹ️ [handleVerifyPermisOrigine] Aucun candidat trouvé dans la recherche');
            setCandidatTrouveFromPermisOrigine(null);
            setCandidatNonTrouveOrigine(true);
            // Auto-compléter les informations personnelles
            setPersonneData(prev => ({
              ...prev,
              nom: permisDataFromApi.nom || prev.nom,
              prenom: permisDataFromApi.prenom || prev.prenom,
            }));
            
            // Auto-compléter les informations du candidat
            setCandidatData(prev => ({
              ...prev,
              date_naissance: permisDataFromApi.date_naissance ? permisDataFromApi.date_naissance.split('T')[0] : prev.date_naissance,
              lieu_naissance: permisDataFromApi.lieu_naissance || prev.lieu_naissance,
              nationalite: permisDataFromApi.nationalite || prev.nationalite || 'Sénégalaise',
              genre: permisDataFromApi.sexe === 'M' ? 'M' : permisDataFromApi.sexe === 'F' ? 'F' : prev.genre,
              numero_piece: permisDataFromApi.numero_identite || prev.numero_piece,
            }));
            
            // S'assurer que le mode est "new" pour créer un nouveau candidat
            setCandidatMode('new');
            setSelectedCandidat(null);
          }
        } catch (searchErr: any) {
          console.error('❌ [handleVerifyPermisOrigine] Erreur lors de la recherche du candidat:', searchErr);
          // En cas d'erreur, considérer qu'aucun candidat n'a été trouvé
          setCandidatTrouveFromPermisOrigine(null);
          setCandidatNonTrouveOrigine(true);
          // Auto-compléter quand même les informations
          setPersonneData(prev => ({
            ...prev,
            nom: permisDataFromApi.nom || prev.nom,
            prenom: permisDataFromApi.prenom || prev.prenom,
          }));
          
          setCandidatData(prev => ({
            ...prev,
            date_naissance: permisDataFromApi.date_naissance ? permisDataFromApi.date_naissance.split('T')[0] : prev.date_naissance,
            lieu_naissance: permisDataFromApi.lieu_naissance || prev.lieu_naissance,
            nationalite: permisDataFromApi.nationalite || prev.nationalite || 'Sénégalaise',
            genre: permisDataFromApi.sexe === 'M' ? 'M' : permisDataFromApi.sexe === 'F' ? 'F' : prev.genre,
            numero_piece: permisDataFromApi.numero_identite || prev.numero_piece,
          }));
        }
      }
      
      setPermisOrigineVerified(true);
      setVerificationErrorOrigine(null);
      setVerifyingPermisOrigine(false);
    } catch (err: any) {
      console.error('❌ Erreur lors de la vérification du permis d\'origine:', err);
      setVerifyingPermisOrigine(false);
      setPermisOrigineVerified(false);
      
      // Gérer les différents types d'erreurs
      if (err.response?.status === 404) {
        setVerificationErrorOrigine('Le permis d\'origine renseigné n\'existe pas dans le système. Veuillez vérifier le numéro de permis.');
      } else if (err.response?.status === 400) {
        setVerificationErrorOrigine('Le format du numéro de permis d\'origine est invalide. Veuillez vérifier le numéro saisi.');
      } else if (err.response?.data?.message) {
        setVerificationErrorOrigine(`Erreur lors de la vérification du permis d'origine: ${err.response.data.message}`);
      } else if (err.message) {
        setVerificationErrorOrigine(`Erreur lors de la vérification du permis d'origine: ${err.message}`);
      } else {
        setVerificationErrorOrigine('Le permis d\'origine renseigné n\'existe pas ou n\'est pas authentifié. Veuillez vérifier le numéro de permis.');
      }
    }
  };

  // Fonction pour vérifier le permis B d'origine
  const handleVerifyPermis = async () => {
    const numPermisBOrigineComplet = buildNumeroOriginePermis(numeroBOriginePermisParts, permisBOrigineFormat);
    if (!numPermisBOrigineComplet || numPermisBOrigineComplet.trim() === '') {
      setVerificationError('Veuillez remplir le numéro du permis B d\'origine');
      return;
    }
    
    setVerifyingPermis(true);
    setVerificationError(null);
    setPermisVerified(false);
    
    try {
      console.log('🔍 Vérification du permis B d\'origine:', numPermisBOrigineComplet);
      const response = await gestionDossierService.getChangePermis(numPermisBOrigineComplet);
      console.log('✅ Permis B vérifié avec succès:', response);
      
      // Extraire les données de la réponse : si tableau, prendre l'entrée dont numero_permis correspond au numéro recherché
      let permisData: any = null;
      if (Array.isArray(response) && response.length > 0) {
        permisData = findPermisByNumero(response, numPermisBOrigineComplet);
        if (!permisData && response.length === 1) permisData = response[0];
        console.log('✅ Permis B trouvé dans la réponse (tableau, correspondance ou un seul élément)');
      } else if (response && typeof response === 'object' && !Array.isArray(response)) {
        permisData = response;
        console.log('✅ Permis B trouvé dans la réponse (objet)');
      }
      
      if (!permisData) {
        setVerificationError('Le permis B renseigné n\'existe pas ou n\'est pas authentifié. Veuillez vérifier le numéro de permis.');
        setPermisVerified(false);
        setVerifyingPermis(false);
        return;
      }
      
      // Auto-compléter les informations du permis B
      const updatedPermisBOrigineData: PermisData = {
        ...permisBOrigineData,
        numero_origine_permis: numPermisBOrigineComplet,
        lieu_de_dobtention_du_permis: permisData.lieu_obtention || permisBOrigineData.lieu_de_dobtention_du_permis || '',
        date_de_dobtention_du_permis: permisData.date_obtention ? permisData.date_obtention.split('T')[0] : permisBOrigineData.date_de_dobtention_du_permis || '',
        date_de_delivrance_du_permis: permisData.date_validite ? permisData.date_validite.split('T')[0] : permisBOrigineData.date_de_delivrance_du_permis || '',
      };
      setPermisBOrigineData(updatedPermisBOrigineData);
      
      // Rechercher un candidat existant avec nom, prénom et date de naissance
      if (permisData.nom && permisData.prenom && permisData.date_naissance) {
        try {
          console.log('🔍 Recherche d\'un candidat existant:', {
            nom: permisData.nom,
            prenom: permisData.prenom,
            date_naissance: permisData.date_naissance
          });
          
          // Rechercher par nom et prénom
          const searchResponse = await autoEcoleService.getCandidats(1, 50, {
            search: `${permisData.nom} ${permisData.prenom}`.trim(),
          });
          
          if (searchResponse.data && searchResponse.data.length > 0) {
            // Formater la date de naissance pour comparaison (YYYY-MM-DD)
            const dateNaissanceFormatee = permisData.date_naissance.split('T')[0];
            
            // Chercher un candidat avec le même nom, prénom et date de naissance
            const candidatTrouve = searchResponse.data.find((candidat: any) => {
              const candidatDateNaissance = candidat.date_naissance ? candidat.date_naissance.split('T')[0] : null;
              const nomMatch = candidat.personne?.nom?.toUpperCase().trim() === permisData.nom.toUpperCase().trim();
              const prenomMatch = candidat.personne?.prenom?.toUpperCase().trim() === permisData.prenom.toUpperCase().trim();
              const dateMatch = candidatDateNaissance === dateNaissanceFormatee;
              
              return nomMatch && prenomMatch && dateMatch;
            });
            
            if (candidatTrouve) {
              console.log('✅ Candidat existant trouvé:', candidatTrouve);
              // Stocker le candidat trouvé pour afficher le récapitulatif
              setCandidatTrouveFromPermis(candidatTrouve);
              setCandidatNonTrouve(false);
            } else {
              console.log('ℹ️ Aucun candidat existant trouvé');
              setCandidatTrouveFromPermis(null);
              setCandidatNonTrouve(true);
              // Auto-compléter les informations personnelles
              setPersonneData(prev => ({
                ...prev,
                nom: permisData.nom || prev.nom,
                prenom: permisData.prenom || prev.prenom,
              }));
              
              // Auto-compléter les informations du candidat
              setCandidatData(prev => ({
                ...prev,
                date_naissance: permisData.date_naissance ? permisData.date_naissance.split('T')[0] : prev.date_naissance,
                lieu_naissance: permisData.lieu_naissance || prev.lieu_naissance,
                nationalite: permisData.nationalite || prev.nationalite || 'Sénégalaise',
                genre: permisData.sexe === 'M' ? 'M' : permisData.sexe === 'F' ? 'F' : prev.genre,
                numero_piece: permisData.numero_identite || prev.numero_piece,
              }));
              
              // S'assurer que le mode est "new" pour créer un nouveau candidat
              setCandidatMode('new');
              setSelectedCandidat(null);
            }
          } else {
            console.log('ℹ️ Aucun candidat trouvé dans la recherche');
            setCandidatTrouveFromPermis(null);
            setCandidatNonTrouve(true);
            // Auto-compléter les informations personnelles
            setPersonneData(prev => ({
              ...prev,
              nom: permisData.nom || prev.nom,
              prenom: permisData.prenom || prev.prenom,
            }));
            
            // Auto-compléter les informations du candidat
            setCandidatData(prev => ({
              ...prev,
              date_naissance: permisData.date_naissance ? permisData.date_naissance.split('T')[0] : prev.date_naissance,
              lieu_naissance: permisData.lieu_naissance || prev.lieu_naissance,
              nationalite: permisData.nationalite || prev.nationalite || 'Sénégalaise',
              genre: permisData.sexe === 'M' ? 'M' : permisData.sexe === 'F' ? 'F' : prev.genre,
              numero_piece: permisData.numero_identite || prev.numero_piece,
            }));
            
            setCandidatMode('new');
            setSelectedCandidat(null);
          }
        } catch (searchErr: any) {
          console.error('⚠️ Erreur lors de la recherche de candidat, auto-complétion quand même:', searchErr);
          setCandidatTrouveFromPermis(null);
          setCandidatNonTrouve(true);
          // En cas d'erreur de recherche, auto-compléter quand même
          setPersonneData(prev => ({
            ...prev,
            nom: permisData.nom || prev.nom,
            prenom: permisData.prenom || prev.prenom,
          }));
          
          setCandidatData(prev => ({
            ...prev,
            date_naissance: permisData.date_naissance ? permisData.date_naissance.split('T')[0] : prev.date_naissance,
            lieu_naissance: permisData.lieu_naissance || prev.lieu_naissance,
            nationalite: permisData.nationalite || prev.nationalite || 'Sénégalaise',
            genre: permisData.sexe === 'M' ? 'M' : permisData.sexe === 'F' ? 'F' : prev.genre,
            numero_piece: permisData.numero_identite || prev.numero_piece,
          }));
          
          setCandidatMode('new');
          setSelectedCandidat(null);
        }
      }
      
      setPermisVerified(true);
      setVerificationError(null);
      setVerifyingPermis(false);
    } catch (err: any) {
      console.error('❌ Erreur lors de la vérification du permis B:', err);
      setVerifyingPermis(false);
      setPermisVerified(false);
      
      // Gérer les différents types d'erreurs
      if (err.response?.status === 404) {
        setVerificationError('Le permis B renseigné n\'existe pas dans le système. Veuillez vérifier le numéro de permis.');
      } else if (err.response?.status === 400) {
        setVerificationError('Le format du numéro de permis B est invalide. Veuillez vérifier le numéro saisi.');
      } else if (err.response?.data?.message) {
        setVerificationError(`Erreur lors de la vérification du permis B: ${err.response.data.message}`);
      } else if (err.message) {
        setVerificationError(`Erreur lors de la vérification du permis B: ${err.message}`);
      } else {
        setVerificationError('Le permis B renseigné n\'existe pas ou n\'est pas authentifié. Veuillez vérifier le numéro de permis.');
      }
    }
  };

  // Réinitialiser la vérification quand le numéro change
  useEffect(() => {
    const numPermisBOrigineComplet = buildNumeroOriginePermis(numeroBOriginePermisParts, permisBOrigineFormat);
    if (numPermisBOrigineComplet && permisBOrigineData.numero_origine_permis !== numPermisBOrigineComplet) {
      setPermisVerified(false);
      setVerificationError(null);
    }
  }, [numeroBOriginePermisParts, permisBOrigineFormat]);

  // Passer à l'étape suivante
  const handleNext = async () => {
    setError(null);
    console.log('🔍 [HANDLE_NEXT] activeStep:', activeStep, 'isNouveauPermis:', isNouveauPermis, 'needsPermisOrigine:', needsPermisOrigine());

    if (activeStep === 0) {
      // Étape 0 : Valider la sélection du type de demande
      if (!validateStep0({ typeDemandeId, setError })) return;
      
      const typeDemande = typeDemandes.find(td => td.id === typeDemandeId);
      if (typeDemande) {
        setSelectedTypeDemande(typeDemande);
        const isNouveau = checkIsNouveauPermis(typeDemande.name);
        const isFiche = checkIsFicheEnregistre(typeDemande.name);
        setIsNouveauPermis(isNouveau);
        setIsFicheEnregistre(isFiche);
        setActiveStep(1);
      }
    } else if (activeStep === 1 && isNouveauPermis) {
      // Étape auto-école/formation (si nouveau permis)
      if (!validateStepAutoEcole({ isNouveauPermis, autoEcoleId, formationId: formationData.formation_id, setError })) return;
      // Si la formation est de type C, passer à l'étape permis B d'origine, sinon passer au choix candidat
      const hasPermisBOrigine = isFormationTypeC();
      setActiveStep(hasPermisBOrigine ? 2 : 3);
    } else if (activeStep === 2 && isNouveauPermis && isFormationTypeC()) {
      // Étape permis B d'origine (si nouveau permis de type C)
      const numPermisBOrigineComplet = buildNumeroOriginePermis(numeroBOriginePermisParts, permisBOrigineFormat);
      if (!numPermisBOrigineComplet || numPermisBOrigineComplet.trim() === '') {
        setError('Veuillez remplir le numéro du permis B d\'origine');
        return;
      }
      if (!permisBOrigineData.lieu_de_dobtention_du_permis || permisBOrigineData.lieu_de_dobtention_du_permis.trim() === '') {
        setError('Veuillez remplir le lieu d\'obtention du permis B');
        return;
      }
      if (!permisBOrigineData.date_de_dobtention_du_permis) {
        setError('Veuillez remplir la date d\'obtention du permis B');
        return;
      }
      if (!permisBOrigineData.date_de_delivrance_du_permis) {
        setError('Veuillez remplir la date de délivrance du permis B');
        return;
      }

      if (isFicheEnregistre) {
        setPermisBOrigineData((prev) => ({
          ...prev,
          numero_origine_permis: numPermisBOrigineComplet.trim(),
          lieu_de_dobtention_du_permis: permisBOrigineData.lieu_de_dobtention_du_permis?.trim() || prev.lieu_de_dobtention_du_permis,
          date_de_dobtention_du_permis: permisBOrigineData.date_de_dobtention_du_permis || prev.date_de_dobtention_du_permis,
          date_de_delivrance_du_permis: permisBOrigineData.date_de_delivrance_du_permis || prev.date_de_delivrance_du_permis,
        }));
        setActiveStep(3);
        return;
      }

      // Vérifier que le permis B a été vérifié avant de continuer
      if (!permisVerified) {
        setError('Veuillez vérifier le permis B d\'origine avant de continuer. Cliquez sur le bouton "Vérifier le permis".');
        return;
      }

      // Passer directement à l'étape suivante (récapitulatif si candidat trouvé, sinon PersonneFormStep)
      setActiveStep(3);
    } else if (activeStep === 1 && !isNouveauPermis) {
      // Étape numéro de permis (si pas nouveau permis)
      if (!validateStepNumeroPermis({ setError, isFicheEnregistre, numeroPermisParts, setNumeroPermis, permisFormat })) return;
      
      // Vérifier que le permis a été vérifié avant de continuer (pour Duplicata et Fiche d'enregistrement uniquement)
      if ((isFicheEnregistre || selectedTypeDemande?.name === 'DUPLICATA') && !permisPrincipalVerified) {
        setError('Veuillez vérifier le permis avant de continuer. Cliquez sur le bouton "Vérifier le permis".');
        return;
      }
      
      // Copier le numéro de permis dans permisData
      setPermisData(prev => ({ ...prev, numero_permis: numeroPermis }));
      setActiveStep(2);
    } else if (activeStep === 2 && !isNouveauPermis) {
      // Étape informations du permis (si pas nouveau permis)
      // Valider seulement les champs du permis (sans permis d'origine car c'est une étape séparée)
      if (!permisData.lieu_de_dobtention_du_permis || permisData.lieu_de_dobtention_du_permis.trim() === '') {
        setError('Veuillez remplir le lieu d\'obtention du permis');
        return;
      }
      if (!permisData.date_de_dobtention_du_permis) {
        setError('Veuillez remplir la date d\'obtention du permis');
        return;
      }
      if (!permisData.date_de_delivrance_du_permis) {
        setError('Veuillez remplir la date de délivrance du permis');
        return;
      }
      
      // Si catégorie C/D/E, passer à l'étape permis d'origine, sinon passer directement à PersonneFormStep
      const hasPermisOrigine = needsPermisOrigine();
      setActiveStep(hasPermisOrigine ? 3 : 3);
    } else if (activeStep === 3 && !isNouveauPermis && needsPermisOrigine()) {
      // Étape permis d'origine (si catégorie C/D/E) — champs en lecture seule, pas de bouton Vérifier
      const numPermisOrigineComplet = buildNumeroOriginePermis(numeroOriginePermisParts, permisOrigineFormat);
      const hasNumero = !!(permisData.numero_origine_permis?.trim() || numPermisOrigineComplet?.trim());
      const hasLieu = !!permisData.lieu_de_dobtention_du_permis?.trim();
      if (!hasNumero || !hasLieu) {
        setError('Les informations du permis d\'origine (numéro et lieu) sont requises.');
        return;
      }
      if (!validatePermisOrigine({ 
        setError, 
        numeroOriginePermisParts, 
        permisOrigineFormat, 
        setPermisData, 
        permisData 
      })) return;
      setActiveStep(4);
    } else if ((activeStep === 2 && isNouveauPermis && !isFormationTypeC()) ||
               (activeStep === 3 && isNouveauPermis && isFormationTypeC() && !candidatTrouveFromPermis) ||
               (activeStep === 3 && !isNouveauPermis && !needsPermisOrigine()) ||
               (activeStep === 4 && !isNouveauPermis && needsPermisOrigine())) {
      // PersonneFormStep - La navigation se fait automatiquement, pas besoin de validation ici
      // Si candidat existant sélectionné (via récapitulatif), passer directement à la finalisation
      if (candidatMode === 'existing' && selectedCandidat && selectedCandidat.id) {
        setCandidatId(selectedCandidat.id);
        setPersonneId(selectedCandidat.personne?.id || null);
        // Calculer l'étape de finalisation
        if (isNouveauPermis) {
          setActiveStep(6);
        } else {
          const finalStep = needsPermisOrigine() ? 6 : 5;
          setActiveStep(finalStep);
        }
        return;
      }
      // Sinon, continuer normalement (la validation se fera dans PersonneFormStep)
      return;
    } else if (activeStep === 4 && isNouveauPermis) {
      // Informations personnelles (pour nouveau permis) - étape 4
      // L'enregistrement se fait via le bouton dans PersonneFormStep
      return;
    } else if (activeStep === 4 && !isNouveauPermis) {
      // Informations personnelles (pour autres types de permis) - étape 4
      // L'enregistrement se fait via le bouton dans PersonneFormStep
      return;
    } else if (activeStep === 5 && isNouveauPermis) {
      // Informations du candidat (pour nouveau permis) - étape 5
      // La création se fait via le bouton dans CandidatFormStep
      return;
    } else if (activeStep === 5 && !isNouveauPermis) {
      // Informations du candidat (pour autres types de permis) - étape 5
      // La création se fait via le bouton dans CandidatFormStep
      return;
    } else if ((activeStep === 5 && !isNouveauPermis && !needsPermisOrigine()) || 
               (activeStep === 6 && !isNouveauPermis && needsPermisOrigine())) {
      // Informations du candidat (pour autres types de permis)
      // activeStep 5 si pas de permis d'origine, activeStep 6 si permis d'origine affiché
      console.log('🔍 [VALIDATION] Étape Informations du candidat - activeStep:', activeStep, 'isNouveauPermis:', isNouveauPermis);
      // Réinitialiser l'erreur avant la validation pour éviter qu'une erreur précédente persiste
      setError(null);
      if (!validateCandidat({ candidatData, setError })) {
        console.log('❌ [VALIDATION] Échec validation informations candidat');
        console.log('📋 Données candidat:', { 
          date_naissance: candidatData.date_naissance, 
          lieu_naissance: candidatData.lieu_naissance, 
          nip: candidatData.nip, 
          numero_piece: candidatData.numero_piece 
        });
        return;
      }
      console.log('✅ [VALIDATION] Validation informations candidat réussie');
      
      setLoading(true);
      try {
        if (!personneId) {
          setError('Erreur: ID de la personne manquant. Veuillez recommencer.');
          setLoading(false);
          return;
        }
        
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
        setCandidatId(response.data.id);
        // Passer à la finalisation
        setActiveStep(6);
      } catch (err: any) {
        if (err.response?.data?.errors) {
          // Filtrer uniquement les erreurs pertinentes pour l'étape "Informations du candidat"
          const champsCandidat = ['date_naissance', 'lieu_naissance', 'nip', 'type_piece', 'numero_piece', 'nationalite', 'genre', 'personne_id'];
          const erreursCandidat: string[] = [];
          
          Object.entries(err.response.data.errors).forEach(([field, messages]: [string, any]) => {
            // Ne garder que les erreurs des champs du candidat
            if (champsCandidat.includes(field.toLowerCase())) {
              const messageList = Array.isArray(messages) ? messages : [messages];
              const fieldLabel = getFieldLabel(field);
              erreursCandidat.push(`${fieldLabel}: ${messageList.join(', ')}`);
            }
          });
          
          if (erreursCandidat.length > 0) {
            setError(`Erreur de validation pour les informations du candidat :\n• ${erreursCandidat.join('\n• ')}`);
          } else {
            // Si aucune erreur de candidat, afficher le message général
            setError(err.response?.data?.message || 'Erreur lors de la création du candidat');
          }
        } else {
          setError(err.response?.data?.message || err.message || 'Erreur lors de la création du candidat');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Revenir à l'étape précédente
  const handleBack = () => {
    setError(null);
    setActiveStep((prevStep) => prevStep - 1);
  };

  const selectedReferentielForReadiness = useMemo(() => {
    const id = formationData.referenciel_id?.trim();
    if (!id) return null;
    const r = referentiels.find((ref) => ref.id === id);
    return r ? { libelle: r.libelle, code: r.code } : null;
  }, [referentiels, formationData.referenciel_id]);

  const finalisationReadinessInput = useMemo(
    () => ({
      candidatId,
      typeDemandeId,
      isNouveauPermis,
      isFicheEnregistre,
      typeDemandeName: selectedTypeDemande?.name ?? '',
      formationData,
      selectedAutoEcole,
      permisData,
      numeroPermis,
      permisFormat,
      numeroPermisParts,
      numeroOriginePermisParts,
      permisOrigineFormat,
      permisBOrigineData,
      numeroBOriginePermisParts,
      permisBOrigineFormat,
      formations,
      lieuExamenData,
      dataCategorie,
      selectedReferentiel: selectedReferentielForReadiness,
    }),
    [
      candidatId,
      typeDemandeId,
      isNouveauPermis,
      isFicheEnregistre,
      selectedTypeDemande?.name,
      formationData,
      selectedAutoEcole,
      permisData,
      numeroPermis,
      permisFormat,
      numeroPermisParts,
      numeroOriginePermisParts,
      permisOrigineFormat,
      permisBOrigineData,
      numeroBOriginePermisParts,
      permisBOrigineFormat,
      formations,
      lieuExamenData,
      dataCategorie,
      selectedReferentielForReadiness,
    ]
  );

  const getFinalisationReadinessErrors = useCallback(
    () => validateDossierCreationReadiness(finalisationReadinessInput),
    [finalisationReadinessInput]
  );

  // Soumettre le formulaire complet
  const handleSubmit = async () => {
    if (!candidatId) {
      setError('Erreur: Candidat non créé');
      return;
    }

    const readiness = validateDossierCreationReadiness(finalisationReadinessInput);
    if (readiness.length > 0) {
      setError(
        `Dossier incomplet (${readiness.length} point${readiness.length > 1 ? 's' : ''}) : ${readiness.join(' ; ')}`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const nowIso = new Date().toISOString();

      const dossierPayload: any = {
        candidat_id: candidatId,
        type_demande_id: typeDemandeId,
        statut: 'en_attente',
        date_creation: today,
        date_modification: nowIso,
        commentaires: formationData.commentaires ?? '',
        province_id: lieuExamenData.province_id,
        data_categorie: dataCategorie,
        expired: permisData.expired ?? false,
        suspended: permisData.suspended ?? false,
      };

      if (permisData.expiration_date) {
        dossierPayload.expiration_date = new Date(permisData.expiration_date).toISOString();
      }
      if (permisData.suspended_date) {
        dossierPayload.suspended_date = new Date(permisData.suspended_date).toISOString();
      }

      // Ajouter les informations du permis si ce n'est pas un nouveau permis
      if (!isNouveauPermis) {
        // Numéro de permis (NumeroPermisPage) : toujours dans numero_permis pour CNEDDT (numero_driving_license)
        // Pour le format standard, on enregistre dans le dossier sans tirets (ex: 20191C00012)
        const rawNumPermis = permisData.numero_permis || numeroPermis || buildNumeroPermis(numeroPermisParts, permisFormat);
        let numPermis = rawNumPermis ? rawNumPermis.trim() : '';

        if (numPermis && permisFormat === 'standard') {
          numPermis = numPermis.replace(/-/g, '');
        }

        if (numPermis) {
          dossierPayload.numero_permis = numPermis;
        }
        // Numéro d'origine du permis (PermisBOriginePage pour permis C) : priorité à permisBOrigineData si formation type C
        if (isFormationTypeC() && permisBOrigineData.numero_origine_permis && permisBOrigineData.numero_origine_permis.trim() !== '') {
          dossierPayload.numero_origine_permis = permisBOrigineData.numero_origine_permis.trim();
        } else if (permisData.numero_origine_permis && permisData.numero_origine_permis.trim() !== '') {
          dossierPayload.numero_origine_permis = permisData.numero_origine_permis.trim();
        }
        
        // Lieu d'obtention du permis
        if (permisData.lieu_de_dobtention_du_permis && permisData.lieu_de_dobtention_du_permis.trim() !== '') {
          dossierPayload.lieu_de_dobtention_du_permis = permisData.lieu_de_dobtention_du_permis;
        }
        
        // Date d'obtention du permis
        if (permisData.date_de_dobtention_du_permis) {
          // Convertir la date au format ISO si nécessaire
          const dateObtention = new Date(permisData.date_de_dobtention_du_permis);
          dossierPayload.date_de_dobtention_du_permis = dateObtention.toISOString();
        }
        
        // Date de délivrance du permis
        if (permisData.date_de_delivrance_du_permis) {
          // Convertir la date au format ISO si nécessaire
          const dateDelivrance = new Date(permisData.date_de_delivrance_du_permis);
          dossierPayload.date_de_delivrance_du_permis = dateDelivrance.toISOString();
        }
      }

      // Ajouter auto_ecole_id et formation_id seulement si nouveau permis
      if (isNouveauPermis) {
        if (!selectedAutoEcole || !formationData.formation_id) {
          setError('Auto-école et formation sont obligatoires pour un nouveau permis');
          setLoading(false);
          return;
        }
        // Pour un nouveau permis, utiliser l'auto-école et la formation choisies par l'utilisateur
        dossierPayload.auto_ecole_id = selectedAutoEcole.id;
        dossierPayload.formation_id = formationData.formation_id;
        
        // Si la formation est de type C, ajouter les informations du permis B d'origine
        if (isFormationTypeC()) {
          if (permisBOrigineData.numero_origine_permis && permisBOrigineData.numero_origine_permis.trim() !== '') {
            dossierPayload.numero_origine_permis = permisBOrigineData.numero_origine_permis;
          }
          if (permisBOrigineData.lieu_de_dobtention_du_permis && permisBOrigineData.lieu_de_dobtention_du_permis.trim() !== '') {
            dossierPayload.lieu_de_dobtention_du_permis = permisBOrigineData.lieu_de_dobtention_du_permis;
          }
          if (permisBOrigineData.date_de_dobtention_du_permis) {
            const dateObtention = new Date(permisBOrigineData.date_de_dobtention_du_permis);
            dossierPayload.date_de_dobtention_du_permis = dateObtention.toISOString();
          }
          if (permisBOrigineData.date_de_delivrance_du_permis) {
            const dateDelivrance = new Date(permisBOrigineData.date_de_delivrance_du_permis);
            dossierPayload.date_de_delivrance_du_permis = dateDelivrance.toISOString();
          }
        }
      }

      // Ajouter referenciel_id si fourni
      if (formationData.referenciel_id) {
        dossierPayload.referenciel_id = formationData.referenciel_id;
        
        if (!isNouveauPermis) {
          const aeId = (autoEcoleId || selectedAutoEcole?.id || '').trim();
          const fId = formationData.formation_id?.trim();
          if (!aeId || !fId) {
            setError('Auto-école et formation sont obligatoires : sélectionnez-les à l’étape de finalisation.');
            setLoading(false);
            return;
          }
          dossierPayload.auto_ecole_id = aeId;
          dossierPayload.formation_id = fId;
        }
      }
      
      console.log('📤 Payload envoyé pour la création du dossier:', JSON.stringify(dossierPayload, null, 2));
      
      const response = await autoEcoleService.createDossier(dossierPayload);

      console.log('✅ Réponse complète de la création du dossier:', JSON.stringify(response, null, 2));
      
      if (response.data) {
        const dossierData = response.data as any;
        console.log('📋 JSON complet du dossier créé:', JSON.stringify(dossierData, null, 2));
        console.log('🔍 Vérification des champs importants:', {
          id: dossierData.id,
          auto_ecole_id: dossierData.auto_ecole_id,
          formation_id: dossierData.formation_id,
          referenciel_id: dossierData.referenciel_id,
          hasAutoEcole: !!dossierData.auto_ecole,
          hasFormation: !!dossierData.formation,
          autoEcoleNom: dossierData.auto_ecole?.nom_auto_ecole,
          formationId: dossierData.formation?.id,
        });
      }

      setSuccess(response.message || 'Dossier créé avec succès !');
      
      setTimeout(() => {
        resetForm();
        setShowForm(false);
        onSuccess();
      }, 1500);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        let errorDetails = '';
        Object.entries(err.response.data.errors).forEach(([field, messages]: [string, any]) => {
          const messageList = Array.isArray(messages) ? messages : [messages];
          errorDetails += `\n• ${field}: ${messageList.join(', ')}`;
        });
        setError(`Erreur de validation: ${errorDetails}`);
      } else {
        setError(err.response?.data?.message || err.message || 'Une erreur est survenue lors de la création du dossier');
      }
    } finally {
      setLoading(false);
    }
  };

  // Obtenir le contenu de l'étape actuelle
  // Fonction pour déterminer si l'étape actuelle affiche CandidatRecapStep
  const isCandidatRecapStep = (step: number): boolean => {
    if (isNouveauPermis) {
      const hasPermisBOrigine = isFormationTypeC();
      if (hasPermisBOrigine) {
        // Étape 3 : CandidatRecapStep si candidat trouvé après permis B d'origine
        if (step === 3) {
          return !!candidatTrouveFromPermis;
        }
        // Étape 4 : CandidatRecapStep si candidat trouvé après permis d'origine (pour nouveau permis, ce cas ne devrait pas arriver)
        if (step === 4) {
          return !!candidatTrouveFromPermisOrigine;
        }
      }
    } else {
      const hasPermisOrigine = needsPermisOrigine();
      if (hasPermisOrigine) {
        // Étape 4 : CandidatRecapStep si candidat trouvé après vérification du permis d'origine
        if (step === 4) {
          return !!candidatTrouveFromPermisOrigine;
        }
      } else {
        // Étape 3 : CandidatRecapStep si candidat trouvé après vérification du permis principal
        if (step === 3) {
          return !!candidatTrouveFromPermisPrincipal;
        }
      }
    }
    return false;
  };

  // Fonction pour déterminer si l'étape actuelle affiche CandidatFormStep
  const isCandidatFormStep = (step: number): boolean => {
    const hasExistingCandidat = candidatMode === 'existing' && selectedCandidat && candidatId;
    const hasPermisOrigine = needsPermisOrigine();
    
    if (isNouveauPermis) {
      // Pour nouveau permis : CandidatFormStep est à l'étape 5 si pas de candidat existant
      return step === 5 && !hasExistingCandidat;
    } else {
      // Pour autres types
      if (hasPermisOrigine) {
        // Avec permis d'origine : CandidatFormStep est à l'étape 6 si pas de candidat existant
        return step === 6 && !hasExistingCandidat;
      } else {
        // Sans permis d'origine : CandidatFormStep est à l'étape 5 si pas de candidat existant
        return step === 5 && !hasExistingCandidat;
      }
    }
  };

  // Fonction pour déterminer si l'étape actuelle affiche PersonneFormStep
  // Cette fonction vérifie le contenu réel de l'étape, pas seulement le numéro
  const isPersonneFormStep = (step: number): boolean => {
    const hasExistingCandidat = candidatMode === 'existing' && selectedCandidat && candidatId;
    const hasPermisOrigine = needsPermisOrigine();
    
    if (isNouveauPermis) {
      const hasPermisBOrigine = isFormationTypeC();
      if (hasPermisBOrigine) {
        // Étape 3 : PersonneFormStep uniquement si candidat non trouvé ET pas de candidat existant (sinon c'est CandidatRecapStep ou FinalisationStep)
        if (step === 3) {
          return !candidatTrouveFromPermis && !hasExistingCandidat;
        }
        // Étape 4 : PersonneFormStep si candidat non trouvé OU si mode est 'new' (après "Créer un nouveau candidat")
        if (step === 4) {
          return (!candidatTrouveFromPermis || candidatMode === 'new') && !hasExistingCandidat;
        }
        return false;
      } else {
        // Pour nouveau permis non-C : PersonneFormStep est à l'étape 4 si pas de candidat existant
        return step === 4 && !hasExistingCandidat;
      }
    } else {
      // Pour autres types
      if (hasPermisOrigine) {
        // Étape 3 : PermisOrigineStep (pas PersonneFormStep)
        if (step === 3) {
          return false;
        }
        // Étape 4 : PersonneFormStep si candidat non trouvé après permis d'origine OU si mode est 'new', ET pas de candidat existant
        if (step === 4) {
          return (!candidatTrouveFromPermisOrigine || candidatMode === 'new') && !hasExistingCandidat;
        }
        return false;
      } else {
        // Sans permis d'origine
        // Étape 3 : PersonneFormStep si candidat non trouvé après permis principal OU si mode est 'new', ET pas de candidat existant
        if (step === 3) {
          return (!candidatTrouveFromPermisPrincipal || candidatMode === 'new') && !hasExistingCandidat;
        }
        // Étape 4 : Ne devrait pas être PersonneFormStep dans ce cas
        return false;
      }
    }
  };

  const getStepContent = (step: number) => {
    const hasExistingCandidat = candidatMode === 'existing' && selectedCandidat && candidatId;
    const hasPermisOrigine = needsPermisOrigine();

    // Étape 0 : Type de demande (toujours)
    if (step === 0) {
      return (
        <TypeDemandeStep
          typeDemandeId={typeDemandeId}
          typeDemandes={typeDemandes}
          loadingTypeDemandes={loadingTypeDemandes}
          loading={loading}
          selectedTypeDemande={selectedTypeDemande}
          isNouveauPermis={isNouveauPermis}
          onTypeDemandeChange={setTypeDemandeId}
        />
      );
    }

    if (isNouveauPermis) {
      // Pour nouveau permis
      // Étape 1 : Auto-école et Formation
      if (step === 1) {
        return (
          <AutoEcoleFormationStep
            autoEcoles={autoEcoles}
            loadingAutoEcoles={loadingAutoEcoles}
            formations={formations}
            loadingFormations={loadingFormations}
            loading={loading}
            autoEcoleId={autoEcoleId}
            formationId={formationData.formation_id}
            onAutoEcoleChange={setAutoEcoleId}
            onFormationChange={(value) => setFormationData({ ...formationData, formation_id: value })}
          />
        );
      }
      // Étape 2 : Permis B d'origine (si type C)
      if (step === 2 && isFormationTypeC()) {
        return (
          <PermisBOrigineStep
            numeroBOriginePermisParts={numeroBOriginePermisParts}
            permisBOrigineFormat={permisBOrigineFormat}
            permisBOrigineData={permisBOrigineData}
            loading={loading}
            skipVerification={isFicheEnregistre}
            verifyingPermis={verifyingPermis}
            permisVerified={permisVerified}
            verificationError={verificationError}
            candidatNonTrouve={candidatNonTrouve}
            onNumeroBOriginePermisPartsChange={setNumeroBOriginePermisParts}
            onPermisBOrigineFormatChange={setPermisBOrigineFormat}
            onPermisBOrigineDataChange={setPermisBOrigineData}
            onVerifyPermis={isFicheEnregistre ? undefined : handleVerifyPermis}
          />
        );
      }
      // Étape 3 : Récapitulatif candidat (si candidat trouvé) OU PersonneFormStep (si candidat non trouvé)
      if (step === 3 && isFormationTypeC()) {
        // Si un candidat a été trouvé lors de la vérification du permis, afficher le récapitulatif
        if (candidatTrouveFromPermis) {
          return (
            <CandidatRecapStep
              candidat={candidatTrouveFromPermis}
              loading={loading}
              onConfirm={() => {
                // Confirmer le candidat trouvé
                setSelectedCandidat(candidatTrouveFromPermis);
                setCandidatMode('existing');
                setCandidatId(candidatTrouveFromPermis.id);
                if (candidatTrouveFromPermis.personne?.id) {
                  setPersonneId(candidatTrouveFromPermis.personne.id);
                }
                setCandidatTrouveFromPermis(null);
                // Passer directement à la finalisation car candidat existant
                setActiveStep(6);
              }}
              onRefineSearch={() => {
                // Permettre d'affiner la recherche - revenir à SearchCandidatStep
                setCandidatTrouveFromPermis(null);
                setCandidatMode(null);
                setSelectedCandidat(null);
                // Rester à l'étape 3 pour afficher SearchCandidatStep
              }}
              onCreateNew={() => {
                // Créer un nouveau candidat - passer aux étapes PersonneFormStep puis CandidatFormStep
                setCandidatTrouveFromPermis(null);
                setCandidatMode('new');
                setSelectedCandidat(null);
                // Passer à l'étape PersonneFormStep (étape 4)
                setActiveStep(4);
              }}
            />
          );
        }
        // Sinon, afficher PersonneFormStep (candidat non trouvé)
        return (
          <PersonneFormStep
            personneData={personneData}
            loading={loading}
            onPersonneDataChange={setPersonneData}
            onRegister={handleRegisterPersonne}
            error={error}
          />
        );
      }
      // Si candidat existant, on saute directement à la finalisation
      if (hasExistingCandidat) {
        return (
          <FinalisationStep
            formationData={formationData}
            referentiels={referentiels}
            loadingReferentiels={loadingReferentiels}
            loading={loading}
            onFormationDataChange={setFormationData}
            onSubmit={handleSubmit}
            error={error}
            getReadinessErrors={getFinalisationReadinessErrors}
            referencielRequired
            dossierLieuFromAgent
            agentLieuLabels={agentLieuLabels}
            agentLieuLoading={agentLieuLoading}
            agentLieuError={agentLieuError}
            {...finalisationCnepcProps}
          />
        );
      }
      // Étape 4 : Récapitulatif candidat (si candidat trouvé) OU Informations personnelles (sinon)
      if (step === 4) {
        // Si candidat trouvé après vérification du permis d'origine, afficher le récapitulatif
        if (candidatTrouveFromPermisOrigine) {
          return (
            <CandidatRecapStep
              candidat={candidatTrouveFromPermisOrigine}
              loading={loading}
              onConfirm={() => {
                // Confirmer le candidat trouvé
                setSelectedCandidat(candidatTrouveFromPermisOrigine);
                setCandidatMode('existing');
                setCandidatId(candidatTrouveFromPermisOrigine.id);
                if (candidatTrouveFromPermisOrigine.personne?.id) {
                  setPersonneId(candidatTrouveFromPermisOrigine.personne.id);
                }
                
                // Passer directement à la finalisation car candidat existant
                setActiveStep(6);
              }}
              onRefineSearch={() => {
                // Réinitialiser et permettre de rechercher à nouveau
                setCandidatTrouveFromPermisOrigine(null);
                setCandidatNonTrouveOrigine(false);
              }}
              onCreateNew={() => {
                // Réinitialiser et passer à la création d'un nouveau candidat
                setCandidatTrouveFromPermisOrigine(null);
                setCandidatNonTrouveOrigine(true);
                setCandidatMode('new');
                setSelectedCandidat(null);
                // Rester à l'étape 4 pour afficher PersonneFormStep
              }}
            />
          );
        }
        
        // Si candidat existant (via autre moyen), passer à la finalisation
        if (hasExistingCandidat) {
          return (
            <FinalisationStep
              formationData={formationData}
              referentiels={referentiels}
              loadingReferentiels={loadingReferentiels}
              loading={loading}
              onFormationDataChange={setFormationData}
              onSubmit={handleSubmit}
              error={error}
              getReadinessErrors={getFinalisationReadinessErrors}
              referencielRequired
              dossierLieuFromAgent
              agentLieuLabels={agentLieuLabels}
              agentLieuLoading={agentLieuLoading}
              agentLieuError={agentLieuError}
              {...finalisationCnepcProps}
            />
          );
        }
        
        // Sinon, afficher le formulaire de création de personne
        return (
          <PersonneFormStep
            personneData={personneData}
            loading={loading}
            onPersonneDataChange={setPersonneData}
            onRegister={handleRegisterPersonne}
            error={error}
          />
        );
      }
      // Étape 5 : Informations candidat
      if (step === 5) {
        return (
          <CandidatFormStep
            candidatData={candidatData}
            loading={loading}
            onCandidatDataChange={setCandidatData}
            onCreateCandidat={handleCreateCandidat}
            error={error}
          />
        );
      }
      // Finalisation (étape 6)
      return (
        <FinalisationStep
          formationData={formationData}
          referentiels={referentiels}
          loadingReferentiels={loadingReferentiels}
          loading={loading}
          onFormationDataChange={setFormationData}
            onSubmit={handleSubmit}
            error={error}
            getReadinessErrors={getFinalisationReadinessErrors}
            referencielRequired
            dossierLieuFromAgent
            agentLieuLabels={agentLieuLabels}
            agentLieuLoading={agentLieuLoading}
            agentLieuError={agentLieuError}
            {...finalisationCnepcProps}
            />
      );
    } else {
      // Pour autres types de permis
      // Étape 1 : Numéro de permis
      if (step === 1) {
        // Afficher la vérification uniquement pour Duplicata et Fiche d'enregistrement
        const shouldShowVerification = isFicheEnregistre || selectedTypeDemande?.name === 'DUPLICATA';
        
        return (
          <NumeroPermisStep
            numeroPermisParts={numeroPermisParts}
            isFicheEnregistre={isFicheEnregistre}
            loading={loading}
            format={permisFormat}
            personneData={personneData}
            candidatData={candidatData}
            referentiels={referentiels}
            loadingReferentiels={loadingReferentiels}
            referencielId={formationData.referenciel_id}
            onNumeroPermisPartsChange={setNumeroPermisParts}
            onFormatChange={setPermisFormat}
            onIdentityDataChange={(identity) => {
              setPersonneData(prev => ({
                ...prev,
                nom: identity.nom || prev.nom,
                prenom: identity.prenom || prev.prenom,
              }));
              setCandidatData(prev => ({
                ...prev,
                date_naissance: identity.dateNaissance || prev.date_naissance,
                lieu_naissance: identity.lieuNaissance || prev.lieu_naissance,
                numero_piece: identity.numeroIdentite || prev.numero_piece,
              }));
            }}
            onReferencielChange={handleReferencielChange}
            verifyingPermis={shouldShowVerification ? verifyingPermisPrincipal : undefined}
            permisVerified={shouldShowVerification ? permisPrincipalVerified : undefined}
            verificationError={shouldShowVerification ? verificationErrorPrincipal : undefined}
            onVerifyPermis={shouldShowVerification ? handleVerifyPermisPrincipal : undefined}
            permisListForSelection={shouldShowVerification ? permisListForModal : null}
            numPermisRecherche={buildNumeroPermis(numeroPermisParts, permisFormat)}
            onPermisSelectionConfirm={shouldShowVerification ? handlePermisSelectionConfirm : undefined}
            onPermisSelectionClose={shouldShowVerification ? handlePermisSelectionClose : undefined}
          />
        );
      }
      // Étape 2 : Informations du permis
      if (step === 2) {
        return (
          <PermisInfoStep
            permisData={permisData}
            numeroPermis={numeroPermis}
            loading={loading}
            onPermisDataChange={setPermisData}
          />
        );
      }
      // Étape 3 : Permis d'origine (si catégorie C/D/E) OU Récapitulatif candidat/PersonneFormStep (sinon)
      if (step === 3) {
        if (hasPermisOrigine) {
          return (
            <PermisOrigineStep
              numeroOriginePermisParts={numeroOriginePermisParts}
              loading={loading}
              permisOrigineFormat={permisOrigineFormat}
              lieuOrigine={permisData.lieu_de_dobtention_du_permis}
              numeroOriginePermis={permisData.numero_origine_permis}
              verifyingPermis={verifyingPermisOrigine}
              permisVerified={permisOrigineVerified}
              verificationError={verificationErrorOrigine}
              candidatNonTrouve={candidatNonTrouveOrigine}
              onNumeroOriginePermisPartsChange={setNumeroOriginePermisParts}
              onPermisOrigineFormatChange={setPermisOrigineFormat}
              onLieuOrigineChange={(lieu) => setPermisData(prev => ({ ...prev, lieu_de_dobtention_du_permis: lieu }))}
              onVerifyPermis={handleVerifyPermisOrigine}
            />
          );
        } else {
          // Si candidat trouvé après vérification du permis, afficher le récapitulatif
          if (candidatTrouveFromPermisPrincipal) {
            return (
              <CandidatRecapStep
                candidat={candidatTrouveFromPermisPrincipal}
                loading={loading}
                onConfirm={() => {
                  // Confirmer le candidat trouvé
                  setSelectedCandidat(candidatTrouveFromPermisPrincipal);
                  setCandidatMode('existing');
                  setCandidatId(candidatTrouveFromPermisPrincipal.id);
                  if (candidatTrouveFromPermisPrincipal.personne?.id) {
                    setPersonneId(candidatTrouveFromPermisPrincipal.personne.id);
                  }
                  
                  // Passer directement à la finalisation car candidat existant
                  setActiveStep(6);
                }}
                onRefineSearch={() => {
                  // Réinitialiser et permettre de rechercher à nouveau
                  setCandidatTrouveFromPermisPrincipal(null);
                  setCandidatNonTrouvePrincipal(false);
                }}
                onCreateNew={() => {
                  // Réinitialiser et passer à la création d'un nouveau candidat
                  setCandidatTrouveFromPermisPrincipal(null);
                  setCandidatNonTrouvePrincipal(true);
                  setCandidatMode('new');
                  setSelectedCandidat(null);
                  // Rester à l'étape 3 pour afficher PersonneFormStep
                }}
              />
            );
          }
          
          // Si candidat existant (via autre moyen), passer à la finalisation
          if (hasExistingCandidat) {
            return (
              <FinalisationStep
                formationData={formationData}
                referentiels={referentiels}
                loadingReferentiels={loadingReferentiels}
                loading={loading}
                onFormationDataChange={setFormationData}
            onSubmit={handleSubmit}
            error={error}
            getReadinessErrors={getFinalisationReadinessErrors}
            referencielRequired
            dossierLieuFromAgent
            agentLieuLabels={agentLieuLabels}
            agentLieuLoading={agentLieuLoading}
            agentLieuError={agentLieuError}
            {...finalisationCnepcProps}
            />
            );
          }
          
          // Sinon, afficher le formulaire de création de personne
          return (
            <PersonneFormStep
              personneData={personneData}
              loading={loading}
              onPersonneDataChange={setPersonneData}
              onRegister={handleRegisterPersonne}
              error={error}
            />
          );
        }
      }
      // Étape 4 : CandidatRecapStep (si candidat trouvé après permis d'origine) OU PersonneFormStep (si candidat non trouvé)
      if (step === 4 && hasPermisOrigine) {
        // Si candidat trouvé après vérification du permis d'origine, afficher le récapitulatif
        if (candidatTrouveFromPermisOrigine) {
          return (
            <CandidatRecapStep
              candidat={candidatTrouveFromPermisOrigine}
              loading={loading}
              onConfirm={() => {
                // Confirmer le candidat trouvé
                setSelectedCandidat(candidatTrouveFromPermisOrigine);
                setCandidatMode('existing');
                setCandidatId(candidatTrouveFromPermisOrigine.id);
                if (candidatTrouveFromPermisOrigine.personne?.id) {
                  setPersonneId(candidatTrouveFromPermisOrigine.personne.id);
                }
                
                // Passer directement à la finalisation car candidat existant
                setActiveStep(6);
              }}
              onRefineSearch={() => {
                // Réinitialiser et permettre de rechercher à nouveau
                setCandidatTrouveFromPermisOrigine(null);
                setCandidatNonTrouveOrigine(false);
              }}
              onCreateNew={() => {
                // Réinitialiser et passer à la création d'un nouveau candidat
                setCandidatTrouveFromPermisOrigine(null);
                setCandidatNonTrouveOrigine(true);
                setCandidatMode('new');
                setSelectedCandidat(null);
                // Rester à l'étape 4 pour afficher PersonneFormStep
              }}
            />
          );
        }
        
        // Si candidat existant (via autre moyen), passer à la finalisation
        if (hasExistingCandidat) {
          return (
            <FinalisationStep
              formationData={formationData}
              referentiels={referentiels}
              loadingReferentiels={loadingReferentiels}
              loading={loading}
              onFormationDataChange={setFormationData}
              onSubmit={handleSubmit}
              error={error}
              getReadinessErrors={getFinalisationReadinessErrors}
              referencielRequired
              dossierLieuFromAgent
              agentLieuLabels={agentLieuLabels}
              agentLieuLoading={agentLieuLoading}
              agentLieuError={agentLieuError}
              {...finalisationCnepcProps}
            />
          );
        }
        
        // Sinon, afficher PersonneFormStep (candidat non trouvé)
        return (
          <PersonneFormStep
            personneData={personneData}
            loading={loading}
            onPersonneDataChange={setPersonneData}
            onRegister={handleRegisterPersonne}
            error={error}
          />
        );
      }
      // Étape 5 : Informations candidat (pour autres types sans permis d'origine)
      if (step === 5) {
        // Si candidat existant, passer à la finalisation
        if (hasExistingCandidat) {
          return (
            <FinalisationStep
              formationData={formationData}
              referentiels={referentiels}
              loadingReferentiels={loadingReferentiels}
              loading={loading}
              onFormationDataChange={setFormationData}
              onSubmit={handleSubmit}
              error={error}
              getReadinessErrors={getFinalisationReadinessErrors}
              referencielRequired
              dossierLieuFromAgent
              agentLieuLabels={agentLieuLabels}
              agentLieuLoading={agentLieuLoading}
              agentLieuError={agentLieuError}
              {...finalisationCnepcProps}
            />
          );
        }
        // Sinon, afficher CandidatFormStep
        return (
          <CandidatFormStep
            candidatData={candidatData}
            loading={loading}
            onCandidatDataChange={setCandidatData}
            onCreateCandidat={handleCreateCandidat}
            error={error}
          />
        );
      }
      // Étape 6 : Informations candidat (si permis d'origine affiché et nouveau candidat) OU Finalisation
      if (step === 6) {
        // Si candidat existant sélectionné, afficher toujours FinalisationStep
        if (hasExistingCandidat) {
          return (
            <FinalisationStep
              formationData={formationData}
              referentiels={referentiels}
              loadingReferentiels={loadingReferentiels}
              loading={loading}
              onFormationDataChange={setFormationData}
              onSubmit={handleSubmit}
              error={error}
              getReadinessErrors={getFinalisationReadinessErrors}
              referencielRequired
              dossierLieuFromAgent
              agentLieuLabels={agentLieuLabels}
              agentLieuLoading={agentLieuLoading}
              agentLieuError={agentLieuError}
              {...finalisationCnepcProps}
            />
          );
        }
        // Sinon, selon si on a un permis d'origine
        if (hasPermisOrigine) {
          return (
            <CandidatFormStep
              candidatData={candidatData}
              loading={loading}
              onCandidatDataChange={setCandidatData}
              onCreateCandidat={handleCreateCandidat}
              error={error}
            />
          );
        } else {
          return (
            <FinalisationStep
              formationData={formationData}
              referentiels={referentiels}
              loadingReferentiels={loadingReferentiels}
              loading={loading}
              onFormationDataChange={setFormationData}
              onSubmit={handleSubmit}
              error={error}
              getReadinessErrors={getFinalisationReadinessErrors}
              referencielRequired
              dossierLieuFromAgent
              agentLieuLabels={agentLieuLabels}
              agentLieuLoading={agentLieuLoading}
              agentLieuError={agentLieuError}
              {...finalisationCnepcProps}
            />
          );
        }
      }
      // Finalisation (étape 7 si permis d'origine affiché)
      return (
        <FinalisationStep
          formationData={formationData}
          referentiels={referentiels}
          loadingReferentiels={loadingReferentiels}
          loading={loading}
          onFormationDataChange={setFormationData}
            onSubmit={handleSubmit}
            error={error}
            getReadinessErrors={getFinalisationReadinessErrors}
            referencielRequired
            dossierLieuFromAgent
            agentLieuLabels={agentLieuLabels}
            agentLieuLoading={agentLieuLoading}
            agentLieuError={agentLieuError}
            {...finalisationCnepcProps}
            />
      );
    }
  };

  const isNumeroPermisIdentityComplete =
    !!(personneData.nom || '').trim() &&
    !!(personneData.prenom || '').trim() &&
    !!(candidatData.date_naissance || '').trim() &&
    !!(candidatData.lieu_naissance || '').trim() &&
    !!((candidatData.numero_piece || candidatData.numero_identite || '').trim());

  const shouldBlockNextOnNumeroPermisIdentity =
    !isNouveauPermis &&
    activeStep === 1 &&
    permisPrincipalVerified &&
    candidatNonTrouvePrincipal &&
    !isNumeroPermisIdentityComplete;


  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={showForm ? <Close /> : <Add />}
          onClick={() => {
            if (showForm) {
              resetForm();
            }
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Annuler' : 'Créer un nouveau dossier'}
        </Button>
      </Box>

      <Collapse in={showForm}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <PersonAdd color="primary" />
            <Typography variant="h6">
              Créer un nouveau dossier
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Messages */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }} 
              onClose={() => setError(null)}
              icon={false}
            >
              <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
                <strong>Erreur de validation :</strong>
                <br />
                {error}
              </Typography>
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
              {success}
            </Alert>
          )}

          {/* Contenu de l'étape */}
          <Box sx={{ mb: 3 }}>
            {getStepContent(activeStep)}
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              {activeStep > 0 && (
                <Button
                  onClick={handleBack}
                  disabled={loading || verifyingPermis}
                  startIcon={<ArrowBack />}
                >
                  Précédent
                </Button>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              {activeStep < steps.length - 1 && !isPersonneFormStep(activeStep) && !isCandidatRecapStep(activeStep) && !isCandidatFormStep(activeStep) && (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  disabled={loading || verifyingPermis || verifyingPermisPrincipal || verifyingPermisOrigine || shouldBlockNextOnNumeroPermisIdentity}
                  endIcon={(loading || verifyingPermis || verifyingPermisPrincipal || verifyingPermisOrigine) ? <CircularProgress size={20} /> : <ArrowForward />}
                >
                  {verifyingPermis ? 'Vérification du permis B...' : verifyingPermisPrincipal ? 'Vérification du permis...' : verifyingPermisOrigine ? 'Vérification du permis d\'origine...' : loading 
                    ? (getRealStepIndex(activeStep) === (isNouveauPermis ? 2 : 1) ? 'Enregistrement...' : getRealStepIndex(activeStep) === (isNouveauPermis ? 3 : 2) ? 'Création du candidat...' : 'Suivant')
                    : (activeStep === 0 ? 'Suivant' : getRealStepIndex(activeStep) === (isNouveauPermis ? 2 : 1) ? 'Créer le compte' : getRealStepIndex(activeStep) === (isNouveauPermis ? 3 : 2) ? 'Créer le candidat' : 'Suivant')
                  }
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default CreateDossierForm;
