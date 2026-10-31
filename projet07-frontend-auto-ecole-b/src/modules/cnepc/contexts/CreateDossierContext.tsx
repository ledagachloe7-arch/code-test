import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import {
  NumeroPermisParts,
  PermisData,
  PersonneData,
  CandidatData,
  FormationData,
  LieuExamenData,
} from '../forms/types';
import { AutoEcole, TypeDemande } from '../services';
import { buildNumeroPermis, buildNumeroOriginePermis, extractCategorieFromNumeroPermis, checkIsFicheEnregistre, findPermisByNumero, parseNumeroOriginePermisToParts } from '../forms/utils';
import type { PermisFromApi, DataCategorieItem } from '../forms/steps';
import { permisToDataCategorieItem } from '../forms/steps';
import { gestionDossierService, autoEcoleService } from '../services';
import { needsPermisOrigine as needsPermisOrigineUtil, isFormationTypeC as isFormationTypeCUtil } from './CreateDossierUtils';
import {
  loadCreateDossierDraft,
  saveCreateDossierDraft,
  clearCreateDossierDraft,
  getEmptyCreateDossierDraftSnapshot,
  type CreateDossierDraftSnapshot,
} from './createDossierDraftStorage';

interface CreateDossierContextType {
  // États pour le type de demande
  selectedTypeDemande: TypeDemande | null;
  typeDemandeId: string;
  isNouveauPermis: boolean;
  isFicheEnregistre: boolean;
  setSelectedTypeDemande: (type: TypeDemande | null) => void;
  setTypeDemandeId: (id: string) => void;
  setIsNouveauPermis: (value: boolean) => void;
  setIsFicheEnregistre: (value: boolean) => void;

  // États pour le numéro de permis
  numeroPermis: string;
  permisFormat: 'standard' | 'op';
  permisOrigineFormat: 'standard' | 'op';
  numeroPermisParts: NumeroPermisParts;
  numeroOriginePermisParts: NumeroPermisParts;
  availableCategories: string[];
  setNumeroPermis: (value: string) => void;
  setPermisFormat: (value: 'standard' | 'op') => void;
  setPermisOrigineFormat: (value: 'standard' | 'op') => void;
  setNumeroPermisParts: (value: NumeroPermisParts) => void;
  setNumeroOriginePermisParts: (value: NumeroPermisParts) => void;
  setAvailableCategories: (categories: string[]) => void;

  // États pour les informations du permis
  permisData: PermisData;
  setPermisData: (value: PermisData | ((prev: PermisData) => PermisData)) => void;

  // États pour le permis B d'origine
  numeroBOriginePermisParts: NumeroPermisParts;
  permisBOrigineFormat: 'standard' | 'op';
  permisBOrigineData: PermisData;
  setNumeroBOriginePermisParts: (value: NumeroPermisParts) => void;
  setPermisBOrigineFormat: (value: 'standard' | 'op') => void;
  setPermisBOrigineData: (value: PermisData | ((prev: PermisData) => PermisData)) => void;

  // États pour auto-école et formation
  selectedAutoEcole: AutoEcole | null;
  autoEcoleId: string;
  setSelectedAutoEcole: (value: AutoEcole | null) => void;
  setAutoEcoleId: (value: string) => void;

  // États pour les informations personnelles
  personneData: PersonneData;
  personneId: string | null;
  setPersonneData: (value: PersonneData | ((prev: PersonneData) => PersonneData)) => void;
  setPersonneId: (value: string | null) => void;

  // États pour le candidat
  candidatData: CandidatData;
  candidatId: string | null;
  selectedCandidat: any | null;
  candidatMode: 'new' | 'existing' | null;
  setCandidatData: (value: CandidatData | ((prev: CandidatData) => CandidatData)) => void;
  setCandidatId: (value: string | null) => void;
  setSelectedCandidat: (value: any | null) => void;
  setCandidatMode: (value: 'new' | 'existing' | null) => void;

  // États pour la formation et référentiel
  formationData: FormationData;
  setFormationData: (value: FormationData | ((prev: FormationData) => FormationData)) => void;

  // États pour le lieu d'examen (province et centre)
  lieuExamenData: LieuExamenData;
  setLieuExamenData: (value: LieuExamenData | ((prev: LieuExamenData) => LieuExamenData)) => void;

  // États pour le captcha
  captchaId: string;
  captchaCode: string;
  setCaptchaId: (value: string) => void;
  setCaptchaCode: (value: string) => void;

  // États pour la vérification des permis
  verifyingPermis: boolean;
  permisVerified: boolean;
  verificationError: string | null;
  candidatTrouveFromPermis: any | null;
  candidatNonTrouve: boolean;
  setVerifyingPermis: (value: boolean) => void;
  setPermisVerified: (value: boolean) => void;
  setVerificationError: (value: string | null) => void;
  setCandidatTrouveFromPermis: (value: any | null) => void;
  setCandidatNonTrouve: (value: boolean) => void;

  verifyingPermisPrincipal: boolean;
  permisPrincipalVerified: boolean;
  verificationErrorPrincipal: string | null;
  candidatTrouveFromPermisPrincipal: any | null;
  candidatNonTrouvePrincipal: boolean;
  setVerifyingPermisPrincipal: (value: boolean) => void;
  setPermisPrincipalVerified: (value: boolean) => void;
  setVerificationErrorPrincipal: (value: string | null) => void;
  setCandidatTrouveFromPermisPrincipal: (value: any | null) => void;
  setCandidatNonTrouvePrincipal: (value: boolean) => void;

  verifyingPermisOrigine: boolean;
  permisOrigineVerified: boolean;
  verificationErrorOrigine: string | null;
  candidatTrouveFromPermisOrigine: any | null;
  candidatNonTrouveOrigine: boolean;
  setVerifyingPermisOrigine: (value: boolean) => void;
  setPermisOrigineVerified: (value: boolean) => void;
  setVerificationErrorOrigine: (value: string | null) => void;
  setCandidatTrouveFromPermisOrigine: (value: any | null) => void;
  setCandidatNonTrouveOrigine: (value: boolean) => void;

  // États généraux
  loading: boolean;
  error: string | null;
  success: string | null;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  setSuccess: (value: string | null) => void;

  /** Mode prévisualisation : navigation par la timeline sans enregistrement ni requête API */
  isPreviewMode: boolean;
  setPreviewMode: (value: boolean) => void;

  // Fonction pour réinitialiser le formulaire
  resetForm: () => void;

  // Fonctions utilitaires
  needsPermisOrigine: () => boolean;
  isFormationTypeC: (formations: any[]) => boolean;
  
  // Fonctions de vérification des permis
  handleVerifyPermisPrincipal: () => Promise<void>;
  /** Vérification du permis par identité (nom, prénom, date de naissance) */
  handleVerifyPermisByIdentity: (nom: string, prenom: string, dateNaissance: string) => Promise<void>;
  handleVerifyPermisOrigine: () => Promise<void>;
  handleVerifyPermis: () => Promise<void>;

  // Modal de sélection des permis (plusieurs permis retournés par l’API)
  permisListForModal: PermisFromApi[] | null;
  dataCategorie: DataCategorieItem[];
  setDataCategorie: (value: DataCategorieItem[] | ((prev: DataCategorieItem[]) => DataCategorieItem[])) => void;
  identitySearchNomForRefinement: string | null;
  clearIdentitySearchRefinement: () => void;
  handlePermisSelectionConfirm: (principalPermis: PermisFromApi, dataCategorieSelected: DataCategorieItem[]) => void;
  handlePermisSelectionClose: () => void;

  /** DGDI étape « numéro de permis » — persisté avec le brouillon pour ne pas tout refaire après redirection */
  numeroPermisDgdiVerified: boolean;
  numeroPermisDgdiBypass: boolean;
  persistNumeroPermisDgdi: (state: { verified: boolean; bypass: boolean }) => void;
}

const CreateDossierContext = createContext<CreateDossierContextType | undefined>(undefined);

export const useCreateDossier = () => {
  const context = useContext(CreateDossierContext);
  if (!context) {
    throw new Error('useCreateDossier must be used within CreateDossierProvider');
  }
  return context;
};

interface CreateDossierProviderProps {
  children: ReactNode;
}

export const CreateDossierProvider: React.FC<CreateDossierProviderProps> = ({ children }) => {
  const persisted = useMemo(
    () => loadCreateDossierDraft() ?? getEmptyCreateDossierDraftSnapshot(),
    []
  );

  // États pour le type de demande
  const [selectedTypeDemande, setSelectedTypeDemande] = useState<TypeDemande | null>(
    persisted.selectedTypeDemande
  );
  const [typeDemandeId, setTypeDemandeId] = useState<string>(persisted.typeDemandeId);
  const [isNouveauPermis, setIsNouveauPermis] = useState(persisted.isNouveauPermis);
  const [isFicheEnregistre, setIsFicheEnregistre] = useState(persisted.isFicheEnregistre);

  // États pour le numéro de permis
  const [numeroPermis, setNumeroPermis] = useState<string>(persisted.numeroPermis);
  const [permisFormat, setPermisFormat] = useState<'standard' | 'op'>(persisted.permisFormat);
  const [permisOrigineFormat, setPermisOrigineFormat] = useState<'standard' | 'op'>(
    persisted.permisOrigineFormat
  );
  const [numeroPermisParts, setNumeroPermisParts] = useState<NumeroPermisParts>({
    ...persisted.numeroPermisParts,
  });
  const [numeroOriginePermisParts, setNumeroOriginePermisParts] = useState<NumeroPermisParts>({
    ...persisted.numeroOriginePermisParts,
  });

  // États pour les catégories disponibles (lorsque plusieurs catégories sont détectées)
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    ...persisted.availableCategories,
  ]);

  // États pour les informations du permis
  const [permisData, setPermisData] = useState<PermisData>({ ...persisted.permisData });

  // États pour le permis B d'origine
  const [numeroBOriginePermisParts, setNumeroBOriginePermisParts] = useState<NumeroPermisParts>({
    ...persisted.numeroBOriginePermisParts,
  });
  const [permisBOrigineFormat, setPermisBOrigineFormat] = useState<'standard' | 'op'>(
    persisted.permisBOrigineFormat
  );
  const [permisBOrigineData, setPermisBOrigineData] = useState<PermisData>({
    ...persisted.permisBOrigineData,
  });

  // États pour auto-école et formation
  const [selectedAutoEcole, setSelectedAutoEcole] = useState<AutoEcole | null>(
    persisted.selectedAutoEcole
  );
  const [autoEcoleId, setAutoEcoleId] = useState<string>(persisted.autoEcoleId);

  // États pour les informations personnelles
  const [personneData, setPersonneData] = useState<PersonneData>({ ...persisted.personneData });
  const [personneId, setPersonneId] = useState<string | null>(persisted.personneId);

  // États pour le candidat
  const [candidatData, setCandidatData] = useState<CandidatData>({ ...persisted.candidatData });
  const [candidatId, setCandidatId] = useState<string | null>(persisted.candidatId);
  const [selectedCandidat, setSelectedCandidat] = useState<any | null>(persisted.selectedCandidat);
  const [candidatMode, setCandidatMode] = useState<'new' | 'existing' | null>(persisted.candidatMode);

  // États pour la formation et référentiel
  const [formationData, setFormationData] = useState<FormationData>({ ...persisted.formationData });

  // États pour le lieu d'examen (province et centre)
  const [lieuExamenData, setLieuExamenData] = useState<LieuExamenData>({ ...persisted.lieuExamenData });

  // États pour le captcha
  const [captchaId, setCaptchaId] = useState<string>(persisted.captchaId);
  const [captchaCode, setCaptchaCode] = useState<string>(persisted.captchaCode);

  // États pour la vérification des permis
  const [verifyingPermis, setVerifyingPermis] = useState(false);
  const [permisVerified, setPermisVerified] = useState(persisted.permisVerified);
  const [verificationError, setVerificationError] = useState<string | null>(persisted.verificationError);
  const [candidatTrouveFromPermis, setCandidatTrouveFromPermis] = useState<any | null>(
    persisted.candidatTrouveFromPermis
  );
  const [candidatNonTrouve, setCandidatNonTrouve] = useState(persisted.candidatNonTrouve);

  const [verifyingPermisPrincipal, setVerifyingPermisPrincipal] = useState(false);
  const [permisPrincipalVerified, setPermisPrincipalVerified] = useState(persisted.permisPrincipalVerified);
  const [verificationErrorPrincipal, setVerificationErrorPrincipal] = useState<string | null>(
    persisted.verificationErrorPrincipal
  );
  const [candidatTrouveFromPermisPrincipal, setCandidatTrouveFromPermisPrincipal] = useState<any | null>(
    persisted.candidatTrouveFromPermisPrincipal
  );
  const [candidatNonTrouvePrincipal, setCandidatNonTrouvePrincipal] = useState(
    persisted.candidatNonTrouvePrincipal
  );

  const [verifyingPermisOrigine, setVerifyingPermisOrigine] = useState(false);
  const [permisOrigineVerified, setPermisOrigineVerified] = useState(persisted.permisOrigineVerified);
  const [verificationErrorOrigine, setVerificationErrorOrigine] = useState<string | null>(
    persisted.verificationErrorOrigine
  );
  const [candidatTrouveFromPermisOrigine, setCandidatTrouveFromPermisOrigine] = useState<any | null>(
    persisted.candidatTrouveFromPermisOrigine
  );
  const [candidatNonTrouveOrigine, setCandidatNonTrouveOrigine] = useState(
    persisted.candidatNonTrouveOrigine
  );

  const [permisListForModal, setPermisListForModal] = useState<PermisFromApi[] | null>(null);
  const [dataCategorie, setDataCategorie] = useState<DataCategorieItem[]>([...persisted.dataCategorie]);
  const [identitySearchNomForRefinement, setIdentitySearchNomForRefinement] = useState<string | null>(
    persisted.identitySearchNomForRefinement
  );
  const clearIdentitySearchRefinement = useCallback(() => setIdentitySearchNomForRefinement(null), []);

  const [numeroPermisDgdiVerified, setNumeroPermisDgdiVerified] = useState(
    () => Boolean(persisted.numeroPermisDgdiVerified)
  );
  const [numeroPermisDgdiBypass, setNumeroPermisDgdiBypass] = useState(() =>
    Boolean(persisted.numeroPermisDgdiBypass)
  );
  const persistNumeroPermisDgdi = useCallback((next: { verified: boolean; bypass: boolean }) => {
    setNumeroPermisDgdiVerified(next.verified);
    setNumeroPermisDgdiBypass(next.bypass);
  }, []);

  // États généraux
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPreviewMode, setPreviewMode] = useState(false);

  const createDossierDraftSnapshot: CreateDossierDraftSnapshot = useMemo(
    () => ({
      v: 1,
      selectedTypeDemande,
      typeDemandeId,
      isNouveauPermis,
      isFicheEnregistre,
      numeroPermis,
      permisFormat,
      permisOrigineFormat,
      numeroPermisParts,
      numeroOriginePermisParts,
      availableCategories,
      permisData,
      numeroBOriginePermisParts,
      permisBOrigineFormat,
      permisBOrigineData,
      selectedAutoEcole,
      autoEcoleId,
      personneData,
      personneId,
      candidatData,
      candidatId,
      selectedCandidat,
      candidatMode,
      formationData,
      lieuExamenData,
      captchaId,
      captchaCode,
      permisVerified,
      verificationError,
      candidatTrouveFromPermis,
      candidatNonTrouve,
      permisPrincipalVerified,
      verificationErrorPrincipal,
      candidatTrouveFromPermisPrincipal,
      candidatNonTrouvePrincipal,
      permisOrigineVerified,
      verificationErrorOrigine,
      candidatTrouveFromPermisOrigine,
      candidatNonTrouveOrigine,
      dataCategorie,
      identitySearchNomForRefinement,
      numeroPermisDgdiVerified,
      numeroPermisDgdiBypass,
    }),
    [
      selectedTypeDemande,
      typeDemandeId,
      isNouveauPermis,
      isFicheEnregistre,
      numeroPermis,
      permisFormat,
      permisOrigineFormat,
      numeroPermisParts,
      numeroOriginePermisParts,
      availableCategories,
      permisData,
      numeroBOriginePermisParts,
      permisBOrigineFormat,
      permisBOrigineData,
      selectedAutoEcole,
      autoEcoleId,
      personneData,
      personneId,
      candidatData,
      candidatId,
      selectedCandidat,
      candidatMode,
      formationData,
      lieuExamenData,
      captchaId,
      captchaCode,
      permisVerified,
      verificationError,
      candidatTrouveFromPermis,
      candidatNonTrouve,
      permisPrincipalVerified,
      verificationErrorPrincipal,
      candidatTrouveFromPermisPrincipal,
      candidatNonTrouvePrincipal,
      permisOrigineVerified,
      verificationErrorOrigine,
      candidatTrouveFromPermisOrigine,
      candidatNonTrouveOrigine,
      dataCategorie,
      identitySearchNomForRefinement,
      numeroPermisDgdiVerified,
      numeroPermisDgdiBypass,
    ]
  );

  useEffect(() => {
    const t = window.setTimeout(() => saveCreateDossierDraft(createDossierDraftSnapshot), 400);
    return () => window.clearTimeout(t);
  }, [createDossierDraftSnapshot]);

  /** Recalcule la fiche à partir du libellé API (évite un booléen désynchronisé du brouillon ou d’anciens codes). */
  useEffect(() => {
    const name = selectedTypeDemande?.name;
    if (!name || typeof name !== 'string') return;
    const next = checkIsFicheEnregistre(name);
    setIsFicheEnregistre((prev) => (prev === next ? prev : next));
  }, [selectedTypeDemande?.name]);

  // Fonctions utilitaires
  const needsPermisOrigine = useCallback((): boolean => {
    return needsPermisOrigineUtil(
      isNouveauPermis,
      isFicheEnregistre,
      permisData,
      numeroPermis,
      numeroPermisParts,
      permisFormat
    );
  }, [isNouveauPermis, isFicheEnregistre, permisData, numeroPermis, numeroPermisParts, permisFormat]);

  const isFormationTypeC = useCallback((formations: any[]): boolean => {
    return isFormationTypeCUtil(isNouveauPermis, formationData, formations);
  }, [isNouveauPermis, formationData]);

  /** À partir de date_validite (API permis), calcule expired et expiration_date pour le dossier. */
  const getExpiredFieldsFromDateValidite = (dateValidite: string | undefined | null): { expired: boolean; expiration_date?: string } => {
    if (!dateValidite || !dateValidite.trim()) return { expired: false };
    const validiteDate = new Date(dateValidite);
    if (Number.isNaN(validiteDate.getTime())) return { expired: false };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    validiteDate.setHours(0, 0, 0, 0);
    const expired = validiteDate < today;
    const expiration_date = dateValidite.includes('T') ? validiteDate.toISOString() : `${dateValidite.split('T')[0]}T00:00:00.000Z`;
    return { expired, expiration_date };
  };

  // Fonction pour vérifier le permis principal
  const handleVerifyPermisPrincipal = useCallback(async () => {
    const numPermisComplet = buildNumeroPermis(numeroPermisParts, permisFormat);
    if (!numPermisComplet || numPermisComplet.trim() === '') {
      setVerificationErrorPrincipal('Veuillez remplir le numéro de permis');
      return;
    }
    
    setVerifyingPermisPrincipal(true);
    setVerificationErrorPrincipal(null);
    setPermisPrincipalVerified(false);
    
    try {
      const response = await gestionDossierService.getChangePermis(numPermisComplet);

      if (Array.isArray(response) && response.length > 1) {
        setPermisListForModal(response);
        setVerifyingPermisPrincipal(false);
        return;
      }

      let permisDataFromApi: any = null;
      if (Array.isArray(response) && response.length > 0) {
        permisDataFromApi = findPermisByNumero(response, numPermisComplet);
        if (!permisDataFromApi && response.length === 1) permisDataFromApi = response[0];
      } else if (response && typeof response === 'object' && !Array.isArray(response)) {
        permisDataFromApi = response;
      }

      if (!permisDataFromApi) {
        setVerificationErrorPrincipal('Le permis renseigné n\'existe pas ou n\'est pas authentifié.');
        setPermisPrincipalVerified(false);
        setVerifyingPermisPrincipal(false);
        return;
      }

      setDataCategorie([permisToDataCategorieItem(permisDataFromApi)]);

      const { expired, expiration_date } = getExpiredFieldsFromDateValidite(permisDataFromApi.date_validite);
      setPermisData(prev => ({
        ...prev,
        numero_permis: numPermisComplet,
        lieu_de_dobtention_du_permis: permisDataFromApi.lieu_obtention || prev.lieu_de_dobtention_du_permis || '',
        date_de_dobtention_du_permis: permisDataFromApi.date_obtention ? permisDataFromApi.date_obtention.split('T')[0] : prev.date_de_dobtention_du_permis || '',
        date_de_delivrance_du_permis: permisDataFromApi.date_validite ? permisDataFromApi.date_validite.split('T')[0] : prev.date_de_delivrance_du_permis || '',
        expired,
        expiration_date,
        suspended: false,
        suspended_date: undefined,
      }));

      setNumeroPermis(numPermisComplet);
      
      // Extraire et stocker la catégorie depuis l'API ou depuis le numéro de permis
      // PRIORITÉ 1: Catégorie depuis l'API
      if (permisDataFromApi.categorie) {
        // La catégorie vient de l'API (peut être "B,C" ou "C")
        const categorieFromApi = permisDataFromApi.categorie.toUpperCase();
        const categories = categorieFromApi.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
        
        console.log('✅ [handleVerifyPermisPrincipal] Catégories extraites depuis l\'API:', {
          categorieFromApi,
          categories,
          nombreCategories: categories.length,
        });
        
        // Si plusieurs catégories, stocker toutes les catégories disponibles
        if (categories.length > 1) {
          setAvailableCategories(categories);
          // Vérifier si la catégorie actuellement sélectionnée fait partie des catégories disponibles
          const categorieActuelle = numeroPermisParts.categorie?.toUpperCase().trim();
          const categorieValide = categorieActuelle && categories.includes(categorieActuelle);
          
          console.log('🔍 [handleVerifyPermisPrincipal] Plusieurs catégories détectées:', {
            categories,
            categorieActuelle,
            categorieValide,
            numeroPermisPartsAvant: numeroPermisParts,
          });
          
          setNumeroPermisParts(prev => {
            // Si la catégorie actuelle est valide, la conserver
            // Sinon, garder la catégorie existante si elle existe (l'utilisateur peut l'avoir sélectionnée après)
            const nouvelleCategorie = categorieValide ? categorieActuelle : (prev.categorie || '');
            console.log('📝 [handleVerifyPermisPrincipal] Mise à jour numeroPermisParts avec catégorie:', {
              ancienne: prev.categorie,
              categorieActuelle,
              categorieValide,
              nouvelle: nouvelleCategorie,
              categoriesDisponibles: categories,
            });
            return {
              ...prev,
              // Conserver la catégorie si elle est valide, sinon garder celle qui était déjà là
              categorie: nouvelleCategorie,
            };
          });
        } else {
          // Une seule catégorie, la définir directement (PRIORITÉ sur la catégorie du formulaire)
          const categorieUnique = categories[0] || '';
          console.log('✅ [handleVerifyPermisPrincipal] Catégorie unique détectée depuis l\'API et stockée:', {
            categorieUnique,
            categorieAnterieure: numeroPermisParts.categorie,
          });
          setAvailableCategories([]);
          setNumeroPermisParts(prev => ({
            ...prev,
            categorie: categorieUnique, // Toujours utiliser la catégorie de l'API
          }));
        }
      } 
      // PRIORITÉ 2: Catégorie depuis le formulaire (si l'API n'a pas de catégorie)
      else if (numeroPermisParts.categorie) {
        // La catégorie vient du formulaire, on la garde
        const categorieForm = numeroPermisParts.categorie.toUpperCase().trim();
        console.log('ℹ️ [handleVerifyPermisPrincipal] Catégorie déjà présente dans le formulaire (API n\'a pas de catégorie):', {
          categorieOriginale: numeroPermisParts.categorie,
          categorieNormalisee: categorieForm,
        });
        // S'assurer que la catégorie est bien stockée en majuscules
        setNumeroPermisParts(prev => ({
          ...prev,
          categorie: categorieForm,
        }));
        setAvailableCategories([]);
      } 
      // PRIORITÉ 3: Extraire depuis le numéro de permis
      else {
        // Essayer d'extraire depuis le numéro de permis
        const categorieExtracted = extractCategorieFromNumeroPermis(numPermisComplet);
        if (categorieExtracted) {
          console.log('✅ [handleVerifyPermisPrincipal] Catégorie extraite depuis le numéro de permis:', categorieExtracted);
          setAvailableCategories([]);
          setNumeroPermisParts(prev => ({
            ...prev,
            categorie: categorieExtracted,
          }));
        } else {
          console.log('⚠️ [handleVerifyPermisPrincipal] Impossible d\'extraire la catégorie');
          setAvailableCategories([]);
        }
      }
      
      // Log final pour vérifier ce qui a été stocké
      console.log('📝 [handleVerifyPermisPrincipal] Catégorie finale stockée:', {
        numeroPermisPartsCategorie: numeroPermisParts.categorie,
        seraStocke: 'vérification après setState',
      });
      
      setPermisPrincipalVerified(true);
      setVerificationErrorPrincipal(null);
      
      // Log final pour vérifier ce qui a été stocké (avec un petit délai pour que le state soit mis à jour)
      setTimeout(() => {
        console.log('📝 [handleVerifyPermisPrincipal] État final après vérification:', {
          permisPrincipalVerified: true,
          note: 'La catégorie devrait être dans numeroPermisParts.categorie',
        });
      }, 100);

      // Pour fiche d'enregistrement, si la catégorie contient C, D ou E, auto-compléter le permis B d'origine
      if (isFicheEnregistre && permisDataFromApi.categorie && permisDataFromApi.numero_origine_permis) {
        const categorieUpper = permisDataFromApi.categorie.toUpperCase();
        const categories = categorieUpper.split(',').map((c: string) => c.trim());
        const hasCategorieCDE = categories.some((cat: string) => ['C', 'D', 'E'].includes(cat));
        
        if (hasCategorieCDE) {
          console.log('✅ [handleVerifyPermisPrincipal] Auto-complétion du permis B d\'origine pour fiche d\'enregistrement');
          
          const numOriginePermis = (permisDataFromApi.numero_origine_permis || '').trim();
          const { format: formatOrigine, parts: partsOrigine } = parseNumeroOriginePermisToParts(numOriginePermis);
          setNumeroBOriginePermisParts(partsOrigine);
          setPermisBOrigineFormat(formatOrigine);
          
          // Auto-compléter les données du permis B d'origine
          setPermisBOrigineData(prev => ({
            ...prev,
            numero_origine_permis: numOriginePermis,
            lieu_de_dobtention_du_permis: permisDataFromApi.lieu_origine || permisDataFromApi.lieu_obtention || prev.lieu_de_dobtention_du_permis || '',
            date_de_dobtention_du_permis: permisDataFromApi.date_obtention ? permisDataFromApi.date_obtention.split('T')[0] : prev.date_de_dobtention_du_permis || '',
            date_de_delivrance_du_permis: permisDataFromApi.date_validite ? permisDataFromApi.date_validite.split('T')[0] : prev.date_de_delivrance_du_permis || '',
          }));
        }
      }

      // Pour tous les cas (DUPLICATA, etc.), si la catégorie contient C, D ou E et que l'API renvoie numero_origine_permis,
      // auto-compléter aussi le permis d'origine "général" (PermisOrigineStep).
      if (permisDataFromApi.categorie && permisDataFromApi.numero_origine_permis) {
        const categorieUpper = permisDataFromApi.categorie.toUpperCase();
        const categories = categorieUpper.split(',').map((c: string) => c.trim());
        const needsPermisOrigine = categories.some((cat: string) => ['C', 'D', 'E'].includes(cat));

        if (needsPermisOrigine) {
          console.log('✅ [handleVerifyPermisPrincipal] Auto-complétion du permis d\'origine (tous cas) pour catégorie:', categorieUpper);
          console.log('📋 [handleVerifyPermisPrincipal] Numéro permis d\'origine (API):', permisDataFromApi.numero_origine_permis);

          const numOriginePermis = (permisDataFromApi.numero_origine_permis || '').trim();
          const { format: formatOrigine, parts: partsOrigine } = parseNumeroOriginePermisToParts(numOriginePermis);

          setNumeroOriginePermisParts(partsOrigine);
          setPermisOrigineFormat(formatOrigine);

          // Stocker aussi dans permisData pour l'affichage / la finalisation
          setPermisData(prev => ({
            ...prev,
            numero_origine_permis: numOriginePermis,
            lieu_de_dobtention_du_permis: permisDataFromApi.lieu_origine || prev.lieu_de_dobtention_du_permis || '',
          }));
        }
      }

      // Rechercher un candidat existant avec nom, prénom et date de naissance
      // Toujours pré-remplir les infos d'identité disponibles depuis la réponse permis,
      // même si date_naissance / numero_identite sont null.
      if (permisDataFromApi.nom || permisDataFromApi.prenom || permisDataFromApi.date_naissance || permisDataFromApi.lieu_naissance || permisDataFromApi.numero_identite) {
        setPersonneData(prev => ({
          ...prev,
          nom: permisDataFromApi.nom || prev.nom,
          prenom: permisDataFromApi.prenom || prev.prenom,
        }));
        setCandidatData(prev => ({
          ...prev,
          date_naissance: permisDataFromApi.date_naissance ? String(permisDataFromApi.date_naissance).split('T')[0] : '',
          lieu_naissance: permisDataFromApi.lieu_naissance || prev.lieu_naissance,
          nationalite: permisDataFromApi.nationalite || prev.nationalite || 'Sénégalaise',
          genre: permisDataFromApi.sexe === 'M' ? 'M' : permisDataFromApi.sexe === 'F' ? 'F' : prev.genre,
          numero_piece: permisDataFromApi.numero_identite || '',
        }));
      }

      if (permisDataFromApi.nom && permisDataFromApi.prenom && permisDataFromApi.date_naissance) {
        try {
          console.log('🔍 [handleVerifyPermisPrincipal] Recherche d\'un candidat existant:', {
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
              console.log('✅ [handleVerifyPermisPrincipal] Candidat existant trouvé:', candidatTrouve);
              // Stocker le candidat trouvé pour afficher le récapitulatif
              setCandidatTrouveFromPermisPrincipal(candidatTrouve);
              setCandidatNonTrouvePrincipal(false);
            } else {
              console.log('ℹ️ [handleVerifyPermisPrincipal] Aucun candidat existant trouvé');
              setCandidatTrouveFromPermisPrincipal(null);
              setCandidatNonTrouvePrincipal(true);
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
            console.log('ℹ️ [handleVerifyPermisPrincipal] Aucun candidat trouvé dans la recherche');
            setCandidatTrouveFromPermisPrincipal(null);
            setCandidatNonTrouvePrincipal(true);
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
          console.error('❌ [handleVerifyPermisPrincipal] Erreur lors de la recherche du candidat:', searchErr);
          // En cas d'erreur, considérer qu'aucun candidat n'a été trouvé
          setCandidatTrouveFromPermisPrincipal(null);
          setCandidatNonTrouvePrincipal(true);
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
          
          setCandidatMode('new');
          setSelectedCandidat(null);
        }
      } else {
        // Cas fréquent: API permis retourne un titulaire mais sans date_naissance/numero_identite.
        // On force le mode "nouveau candidat" pour afficher le formulaire d'identité complétable.
        setCandidatTrouveFromPermisPrincipal(null);
        setCandidatNonTrouvePrincipal(true);
        setCandidatMode('new');
        setSelectedCandidat(null);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setVerificationErrorPrincipal('Le permis renseigné n\'existe pas dans le système.');
      } else if (err.response?.data?.message) {
        setVerificationErrorPrincipal(`Erreur: ${err.response.data.message}`);
      } else {
        setVerificationErrorPrincipal('Le permis renseigné n\'existe pas ou n\'est pas authentifié.');
      }
    } finally {
      setVerifyingPermisPrincipal(false);
    }
  }, [numeroPermisParts, permisFormat, isFicheEnregistre, setNumeroBOriginePermisParts, setPermisBOrigineFormat, setPermisBOrigineData]);

  const handlePermisSelectionClose = useCallback(() => {
    setPermisListForModal(null);
    setVerificationErrorPrincipal(null);
  }, [setVerificationErrorPrincipal]);

  const handleVerifyPermisByIdentity = useCallback(
    async (nom: string, prenom: string, dateNaissance: string) => {
      const nomTrim = (nom || '').trim();
      const prenomTrim = (prenom || '').trim();
      const dateTrim = (dateNaissance || '').trim();
      if (!nomTrim && !prenomTrim && !dateTrim) {
        setVerificationErrorPrincipal('Veuillez saisir au moins un critère (nom, prénom ou date de naissance)');
        return;
      }
      setVerifyingPermisPrincipal(true);
      setVerificationErrorPrincipal(null);
      setPermisPrincipalVerified(false);
      try {
        const response = await gestionDossierService.getChangePermisByIdentity(nomTrim, prenomTrim, dateTrim);
        const resultsArray = Array.isArray(response) ? response : (response && typeof response === 'object' ? [response] : []);
        const hasResults = resultsArray.length > 0 && resultsArray.some((r: any) => r?.numero_permis);
        if (hasResults) {
          setPermisListForModal(resultsArray);
          if (nomTrim) setIdentitySearchNomForRefinement(nomTrim);
          setVerifyingPermisPrincipal(false);
          return;
        }
        setVerificationErrorPrincipal('Aucun permis trouvé pour cette identité.');
        setPermisPrincipalVerified(false);
        setVerifyingPermisPrincipal(false);
        return;
      } catch (err: any) {
        if (err.response?.status === 404) {
          setVerificationErrorPrincipal('Aucun permis trouvé pour cette identité.');
        } else if (err.response?.data?.message) {
          setVerificationErrorPrincipal(`Erreur: ${err.response.data.message}`);
        } else {
          setVerificationErrorPrincipal('Aucun permis trouvé pour cette identité ou erreur de vérification.');
        }
      } finally {
        setVerifyingPermisPrincipal(false);
      }
    },
    []
  );

  const handlePermisSelectionConfirm = useCallback(
    async (principalPermis: PermisFromApi, dataCategorieSelected: DataCategorieItem[]) => {
      setDataCategorie(dataCategorieSelected);
      setPermisListForModal(null);
      setIdentitySearchNomForRefinement(null);
      const permisDataFromApi = principalPermis as any;
      const numPermisComplet = principalPermis.numero_permis || '';

      const { expired, expiration_date } = getExpiredFieldsFromDateValidite(permisDataFromApi.date_validite);
      setPermisData(prev => ({
        ...prev,
        numero_permis: numPermisComplet,
        lieu_de_dobtention_du_permis: permisDataFromApi.lieu_obtention || prev.lieu_de_dobtention_du_permis || '',
        date_de_dobtention_du_permis: permisDataFromApi.date_obtention ? String(permisDataFromApi.date_obtention).split('T')[0] : prev.date_de_dobtention_du_permis || '',
        date_de_delivrance_du_permis: permisDataFromApi.date_validite ? String(permisDataFromApi.date_validite).split('T')[0] : prev.date_de_delivrance_du_permis || '',
        expired,
        expiration_date,
        suspended: false,
        suspended_date: undefined,
      }));
      setNumeroPermis(numPermisComplet);
      const parts = numPermisComplet.split('-');
      if (parts.length === 4) {
        setNumeroPermisParts({ annee: parts[0] || '', province: parts[1] || '', categorie: parts[2] || '', numero: parts[3] || '' });
      } else {
        const cat = permisDataFromApi.categorie;
        const firstCat = cat ? String(cat).toUpperCase().split(',')[0].trim() : '';
        setNumeroPermisParts(prev => ({ ...prev, categorie: firstCat }));
      }
      if (permisDataFromApi.categorie) {
        const categories = String(permisDataFromApi.categorie).toUpperCase().split(',').map((c: string) => c.trim()).filter(Boolean);
        if (categories.length > 1) setAvailableCategories(categories);
        else setAvailableCategories([]);
      } else setAvailableCategories([]);
      setPermisPrincipalVerified(true);
      setVerificationErrorPrincipal(null);

      if (isFicheEnregistre && permisDataFromApi.categorie && permisDataFromApi.numero_origine_permis) {
        const categorieUpper = String(permisDataFromApi.categorie).toUpperCase();
        const cats = categorieUpper.split(',').map((c: string) => c.trim());
        if (cats.some((cat: string) => ['C', 'D', 'E'].includes(cat))) {
          const numOriginePermis = (permisDataFromApi.numero_origine_permis || '').trim();
          const { format: formatOrigine, parts: partsOrigine } = parseNumeroOriginePermisToParts(numOriginePermis);
          setNumeroBOriginePermisParts(partsOrigine);
          setPermisBOrigineFormat(formatOrigine);
          setPermisBOrigineData(prev => ({
            ...prev,
            numero_origine_permis: numOriginePermis,
            lieu_de_dobtention_du_permis: permisDataFromApi.lieu_origine || permisDataFromApi.lieu_obtention || prev.lieu_de_dobtention_du_permis || '',
            date_de_dobtention_du_permis: permisDataFromApi.date_obtention ? String(permisDataFromApi.date_obtention).split('T')[0] : prev.date_de_dobtention_du_permis || '',
            date_de_delivrance_du_permis: permisDataFromApi.date_validite ? String(permisDataFromApi.date_validite).split('T')[0] : prev.date_de_delivrance_du_permis || '',
          }));
        }
      }
      if (permisDataFromApi.categorie && permisDataFromApi.numero_origine_permis) {
        const categorieUpper = String(permisDataFromApi.categorie).toUpperCase();
        const cats = categorieUpper.split(',').map((c: string) => c.trim());
        if (cats.some((cat: string) => ['C', 'D', 'E'].includes(cat))) {
          const numOriginePermis = (permisDataFromApi.numero_origine_permis || '').trim();
          const { format: formatOrigine, parts: partsOrigine } = parseNumeroOriginePermisToParts(numOriginePermis);
          setNumeroOriginePermisParts(partsOrigine);
          setPermisOrigineFormat(formatOrigine);
          setPermisData(prev => ({
            ...prev,
            numero_origine_permis: numOriginePermis,
            lieu_de_dobtention_du_permis: permisDataFromApi.lieu_origine || prev.lieu_de_dobtention_du_permis || '',
          }));
        }
      }
      if (permisDataFromApi.nom && permisDataFromApi.prenom && permisDataFromApi.date_naissance) {
        try {
          const searchResponse = await autoEcoleService.getCandidats(1, 50, { search: `${permisDataFromApi.nom} ${permisDataFromApi.prenom}`.trim() });
          if (searchResponse.data && searchResponse.data.length > 0) {
            const dateNaissanceFormatee = String(permisDataFromApi.date_naissance).split('T')[0];
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
              setCandidatData(prev => ({
                ...prev,
                date_naissance: permisDataFromApi.date_naissance ? String(permisDataFromApi.date_naissance).split('T')[0] : prev.date_naissance,
                lieu_naissance: permisDataFromApi.lieu_naissance || prev.lieu_naissance,
                nationalite: permisDataFromApi.nationalite || prev.nationalite || 'Sénégalaise',
                genre: permisDataFromApi.sexe === 'M' ? 'M' : permisDataFromApi.sexe === 'F' ? 'F' : prev.genre,
                numero_piece: permisDataFromApi.numero_identite || prev.numero_piece,
              }));
              setCandidatMode('new');
              setSelectedCandidat(null);
            }
          } else {
            setCandidatTrouveFromPermisPrincipal(null);
            setCandidatNonTrouvePrincipal(true);
            setPersonneData(prev => ({ ...prev, nom: permisDataFromApi.nom || prev.nom, prenom: permisDataFromApi.prenom || prev.prenom }));
            setCandidatData(prev => ({
              ...prev,
              date_naissance: permisDataFromApi.date_naissance ? String(permisDataFromApi.date_naissance).split('T')[0] : prev.date_naissance,
              lieu_naissance: permisDataFromApi.lieu_naissance || prev.lieu_naissance,
              nationalite: permisDataFromApi.nationalite || prev.nationalite || 'Sénégalaise',
              genre: permisDataFromApi.sexe === 'M' ? 'M' : permisDataFromApi.sexe === 'F' ? 'F' : prev.genre,
              numero_piece: permisDataFromApi.numero_identite || prev.numero_piece,
            }));
            setCandidatMode('new');
            setSelectedCandidat(null);
          }
        } catch {
          setCandidatTrouveFromPermisPrincipal(null);
          setCandidatNonTrouvePrincipal(true);
          setPersonneData(prev => ({ ...prev, nom: permisDataFromApi.nom || prev.nom, prenom: permisDataFromApi.prenom || prev.prenom }));
          setCandidatData(prev => ({
            ...prev,
            date_naissance: permisDataFromApi.date_naissance ? String(permisDataFromApi.date_naissance).split('T')[0] : prev.date_naissance,
            lieu_naissance: permisDataFromApi.lieu_naissance || prev.lieu_naissance,
            nationalite: permisDataFromApi.nationalite || prev.nationalite || 'Sénégalaise',
            genre: permisDataFromApi.sexe === 'M' ? 'M' : permisDataFromApi.sexe === 'F' ? 'F' : prev.genre,
            numero_piece: permisDataFromApi.numero_identite || prev.numero_piece,
          }));
          setCandidatMode('new');
          setSelectedCandidat(null);
        }
      }
    },
    [
      isFicheEnregistre,
      setPermisData,
      setNumeroPermis,
      setNumeroPermisParts,
      setAvailableCategories,
      setPermisPrincipalVerified,
      setVerificationErrorPrincipal,
      setNumeroBOriginePermisParts,
      setPermisBOrigineFormat,
      setPermisBOrigineData,
      setNumeroOriginePermisParts,
      setPermisOrigineFormat,
      setPermisData,
      setPersonneData,
      setCandidatData,
      setCandidatMode,
      setSelectedCandidat,
      setCandidatTrouveFromPermisPrincipal,
      setCandidatNonTrouvePrincipal,
    ]
  );

  // Fonction pour vérifier le permis d'origine
  const handleVerifyPermisOrigine = useCallback(async () => {
    const numPermisOrigineComplet = buildNumeroOriginePermis(numeroOriginePermisParts, permisOrigineFormat);
    if (!numPermisOrigineComplet || numPermisOrigineComplet.trim() === '') {
      setVerificationErrorOrigine('Veuillez remplir le numéro du permis d\'origine');
      return;
    }
    
    setVerifyingPermisOrigine(true);
    setVerificationErrorOrigine(null);
    setPermisOrigineVerified(false);
    
    try {
      const response = await gestionDossierService.getChangePermis(numPermisOrigineComplet);
      
      let permisDataFromApi: any = null;
      if (Array.isArray(response) && response.length > 0) {
        permisDataFromApi = response[0];
      } else if (response && typeof response === 'object' && !Array.isArray(response)) {
        permisDataFromApi = response;
      }
      
      if (!permisDataFromApi) {
        setVerificationErrorOrigine('Le permis d\'origine renseigné n\'existe pas ou n\'est pas authentifié.');
        setPermisOrigineVerified(false);
        setVerifyingPermisOrigine(false);
        return;
      }
      
      if (permisDataFromApi.lieu_obtention || permisDataFromApi.lieu_origine) {
        const lieuOrigine = permisDataFromApi.lieu_origine || permisDataFromApi.lieu_obtention;
        setPermisData(prev => ({
          ...prev,
          lieu_de_dobtention_du_permis: lieuOrigine || prev.lieu_de_dobtention_du_permis || '',
        }));
      }
      
      setPermisOrigineVerified(true);
      setVerificationErrorOrigine(null);

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
            } else {
              console.log('ℹ️ [handleVerifyPermisOrigine] Aucun candidat existant trouvé');
              setCandidatTrouveFromPermisOrigine(null);
              setCandidatNonTrouveOrigine(true);
              // Auto-compléter les informations personnelles
              setPersonneData(prev => ({
                ...prev,
                nom: permisDataFromApi.nom || prev.nom || '',
                prenom: permisDataFromApi.prenom || prev.prenom || '',
              }));
              setCandidatData(prev => ({
                ...prev,
                date_naissance: permisDataFromApi.date_naissance ? permisDataFromApi.date_naissance.split('T')[0] : prev.date_naissance || '',
                lieu_naissance: permisDataFromApi.lieu_naissance || prev.lieu_naissance || '',
                nationalite: permisDataFromApi.nationalite || prev.nationalite || 'Sénégalaise',
                genre: permisDataFromApi.sexe || prev.genre || 'M',
              }));
            }
          } else {
            console.log('ℹ️ [handleVerifyPermisOrigine] Aucun candidat trouvé dans la recherche');
            setCandidatTrouveFromPermisOrigine(null);
            setCandidatNonTrouveOrigine(true);
            // Auto-compléter les informations personnelles
            setPersonneData(prev => ({
              ...prev,
              nom: permisDataFromApi.nom || prev.nom || '',
              prenom: permisDataFromApi.prenom || prev.prenom || '',
            }));
            setCandidatData(prev => ({
              ...prev,
              date_naissance: permisDataFromApi.date_naissance ? permisDataFromApi.date_naissance.split('T')[0] : prev.date_naissance || '',
              lieu_naissance: permisDataFromApi.lieu_naissance || prev.lieu_naissance || '',
              nationalite: permisDataFromApi.nationalite || prev.nationalite || 'Sénégalaise',
              genre: permisDataFromApi.sexe || prev.genre || 'M',
            }));
          }
        } catch (searchErr: any) {
          console.error('❌ [handleVerifyPermisOrigine] Erreur lors de la recherche de candidat:', searchErr);
          setCandidatTrouveFromPermisOrigine(null);
          setCandidatNonTrouveOrigine(true);
        }
      } else {
        console.log('ℹ️ [handleVerifyPermisOrigine] Pas assez d\'informations pour rechercher un candidat');
        setCandidatTrouveFromPermisOrigine(null);
        setCandidatNonTrouveOrigine(true);
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setVerificationErrorOrigine('Le permis d\'origine renseigné n\'existe pas dans le système.');
      } else if (err.response?.data?.message) {
        setVerificationErrorOrigine(`Erreur: ${err.response.data.message}`);
      } else {
        setVerificationErrorOrigine('Le permis d\'origine renseigné n\'existe pas ou n\'est pas authentifié.');
      }
    } finally {
      setVerifyingPermisOrigine(false);
    }
  }, [numeroOriginePermisParts, permisOrigineFormat]);

  // Fonction pour vérifier le permis B d'origine
  // IMPORTANT: Cette fonction ne modifie PAS numeroPermisParts.categorie (catégorie du permis principal)
  // Elle vérifie uniquement le permis B d'origine et met à jour permisBOrigineData
  const handleVerifyPermis = useCallback(async () => {
    const numPermisBOrigineComplet = buildNumeroOriginePermis(numeroBOriginePermisParts, permisBOrigineFormat);
    if (!numPermisBOrigineComplet || numPermisBOrigineComplet.trim() === '') {
      setVerificationError('Veuillez remplir le numéro du permis B d\'origine');
      return;
    }
    
    // Sauvegarder la catégorie du permis principal avant la vérification (pour fiche d'enregistrement)
    const categoriePermisPrincipalAvant = numeroPermisParts.categorie;
    
    setVerifyingPermis(true);
    setVerificationError(null);
    setPermisVerified(false);
    
    try {
      const response = await gestionDossierService.getChangePermis(numPermisBOrigineComplet);
      
      let permisData: any = null;
      if (Array.isArray(response) && response.length > 0) {
        permisData = response[0];
      } else if (response && typeof response === 'object' && !Array.isArray(response)) {
        permisData = response;
      }
      
      if (!permisData) {
        setVerificationError('Le permis B renseigné n\'existe pas ou n\'est pas authentifié.');
        setPermisVerified(false);
        setVerifyingPermis(false);
        return;
      }
      
      // Vérifier que la catégorie du permis principal n'a pas été modifiée
      if (isFicheEnregistre && numeroPermisParts.categorie !== categoriePermisPrincipalAvant) {
        console.warn('⚠️ [handleVerifyPermis] La catégorie du permis principal a été modifiée, restauration...', {
          avant: categoriePermisPrincipalAvant,
          apres: numeroPermisParts.categorie,
        });
        // Restaurer la catégorie du permis principal
        setNumeroPermisParts(prev => ({
          ...prev,
          categorie: categoriePermisPrincipalAvant || prev.categorie,
        }));
      }
      
      console.log('✅ [handleVerifyPermis] Vérification du permis B d\'origine réussie (catégorie permis principal préservée):', {
        categoriePermisPrincipal: numeroPermisParts.categorie,
        categoriePermisPrincipalAvant,
        permisBOrigineVerifie: true,
      });
      
      setPermisBOrigineData(prev => ({
        ...prev,
        numero_origine_permis: numPermisBOrigineComplet,
        lieu_de_dobtention_du_permis: permisData.lieu_obtention || prev.lieu_de_dobtention_du_permis || '',
        date_de_dobtention_du_permis: permisData.date_obtention ? permisData.date_obtention.split('T')[0] : prev.date_de_dobtention_du_permis || '',
        date_de_delivrance_du_permis: permisData.date_validite ? permisData.date_validite.split('T')[0] : prev.date_de_delivrance_du_permis || '',
      }));
      
      setPermisVerified(true);
      setVerificationError(null);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setVerificationError('Le permis B renseigné n\'existe pas dans le système.');
      } else if (err.response?.data?.message) {
        setVerificationError(`Erreur: ${err.response.data.message}`);
      } else {
        setVerificationError('Le permis B renseigné n\'existe pas ou n\'est pas authentifié.');
      }
    } finally {
      setVerifyingPermis(false);
    }
  }, [numeroBOriginePermisParts, permisBOrigineFormat, isFicheEnregistre, numeroPermisParts.categorie]);

  // Fonction pour réinitialiser le formulaire
  const resetForm = useCallback(() => {
    clearCreateDossierDraft();
    setSelectedTypeDemande(null);
    setTypeDemandeId('');
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
    setAvailableCategories([]);
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
    setLieuExamenData({
      province_id: '',
      centre_id: '',
    });
    setCaptchaId('');
    setCaptchaCode('');
    setSelectedCandidat(null);
    setCandidatMode(null);
    setError(null);
    setSuccess(null);
    setPermisListForModal(null);
    setDataCategorie([]);
    setIdentitySearchNomForRefinement(null);
    setNumeroPermisDgdiVerified(false);
    setNumeroPermisDgdiBypass(false);
    setPreviewMode(false);
  }, []);

  const value: CreateDossierContextType = {
    selectedTypeDemande,
    typeDemandeId,
    isNouveauPermis,
    isFicheEnregistre,
    setSelectedTypeDemande,
    setTypeDemandeId,
    setIsNouveauPermis,
    setIsFicheEnregistre,
    numeroPermis,
    permisFormat,
    permisOrigineFormat,
    numeroPermisParts,
    numeroOriginePermisParts,
    setNumeroPermis,
    setPermisFormat,
    setPermisOrigineFormat,
    setNumeroPermisParts,
    setNumeroOriginePermisParts,
    availableCategories,
    setAvailableCategories,
    permisData,
    setPermisData,
    numeroBOriginePermisParts,
    permisBOrigineFormat,
    permisBOrigineData,
    setNumeroBOriginePermisParts,
    setPermisBOrigineFormat,
    setPermisBOrigineData,
    selectedAutoEcole,
    autoEcoleId,
    setSelectedAutoEcole,
    setAutoEcoleId,
    personneData,
    personneId,
    setPersonneData,
    setPersonneId,
    candidatData,
    candidatId,
    selectedCandidat,
    candidatMode,
    setCandidatData,
    setCandidatId,
    setSelectedCandidat,
    setCandidatMode,
    formationData,
    setFormationData,
    lieuExamenData,
    setLieuExamenData,
    captchaId,
    captchaCode,
    setCaptchaId,
    setCaptchaCode,
    verifyingPermis,
    permisVerified,
    verificationError,
    candidatTrouveFromPermis,
    candidatNonTrouve,
    setVerifyingPermis,
    setPermisVerified,
    setVerificationError,
    setCandidatTrouveFromPermis,
    setCandidatNonTrouve,
    verifyingPermisPrincipal,
    permisPrincipalVerified,
    verificationErrorPrincipal,
    candidatTrouveFromPermisPrincipal,
    candidatNonTrouvePrincipal,
    setVerifyingPermisPrincipal,
    setPermisPrincipalVerified,
    setVerificationErrorPrincipal,
    setCandidatTrouveFromPermisPrincipal,
    setCandidatNonTrouvePrincipal,
    verifyingPermisOrigine,
    permisOrigineVerified,
    verificationErrorOrigine,
    candidatTrouveFromPermisOrigine,
    candidatNonTrouveOrigine,
    setVerifyingPermisOrigine,
    setPermisOrigineVerified,
    setVerificationErrorOrigine,
    setCandidatTrouveFromPermisOrigine,
    setCandidatNonTrouveOrigine,
    loading,
    error,
    success,
    setLoading,
    setError,
    setSuccess,
    isPreviewMode,
    setPreviewMode,
    resetForm,
    needsPermisOrigine,
    isFormationTypeC,
    handleVerifyPermisPrincipal,
    handleVerifyPermisByIdentity,
    handleVerifyPermisOrigine,
    handleVerifyPermis,
    permisListForModal,
    dataCategorie,
    setDataCategorie,
    identitySearchNomForRefinement,
    clearIdentitySearchRefinement,
    handlePermisSelectionConfirm,
    handlePermisSelectionClose,
    numeroPermisDgdiVerified,
    numeroPermisDgdiBypass,
    persistNumeroPermisDgdi,
  };

  return (
    <CreateDossierContext.Provider value={value}>
      {children}
    </CreateDossierContext.Provider>
  );
};

