import { useState, useEffect } from 'react';
import { autoEcoleService, TypeDemande } from '../../services';
import { gestionDossierService } from '../../services/gestion-dossier.service';
import type { NumeroPermisParts, PermisData, PersonneData, CandidatData, FormationData } from '../types';
import {
  initialNumeroPermisParts,
  initialPermisData,
  initialPersonneData,
  initialCandidatData,
  initialFormationData,
  RECUPERATION_STEPS,
} from './types';
import { checkIsFicheEnregistre, buildNumeroPermis } from '../utils';
import { validateStepNumeroPermis, validatePersonne, validateCandidat } from '../validation';
import { authService } from '../../../auth/services/authService';
import { useTypeDemandes, useReferentiels } from '../hooks';

export function useRecuperationExistantForm(onSuccess: () => void) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const [candidatId, setCandidatId] = useState<string | null>(null);
  const [personneId, setPersonneId] = useState<string | null>(null);

  const [typeDemandeId, setTypeDemandeId] = useState<string>('');
  const [selectedTypeDemande, setSelectedTypeDemande] = useState<TypeDemande | null>(null);
  const [isFicheEnregistre, setIsFicheEnregistre] = useState(false);

  const [numeroPermis, setNumeroPermis] = useState<string>('');
  const [permisFormat, setPermisFormat] = useState<'standard' | 'op'>('standard');
  const [permisOrigineFormat, setPermisOrigineFormat] = useState<'standard' | 'op'>('standard');
  const [numeroPermisParts, setNumeroPermisParts] = useState<NumeroPermisParts>(initialNumeroPermisParts);
  const [numeroOriginePermisParts, setNumeroOriginePermisParts] = useState<NumeroPermisParts>(initialNumeroPermisParts);

  const [permisData, setPermisData] = useState<PermisData>(initialPermisData);
  const [personneData, setPersonneData] = useState<PersonneData>(initialPersonneData);
  const [candidatData, setCandidatData] = useState<CandidatData>(initialCandidatData);
  const [formationData, setFormationData] = useState<FormationData>(initialFormationData);

  const [dataRecuperee, setDataRecuperee] = useState<any>(null);
  const [loadingRecuperation, setLoadingRecuperation] = useState(false);
  const [categoriePermisRecuperee, setCategoriePermisRecuperee] = useState<string | null>(null);

  const { typeDemandes, loadTypeDemandes } = useTypeDemandes();
  const { referentiels, loading: loadingReferentiels, loadReferentiels } = useReferentiels();

  useEffect(() => {
    if (showForm) {
      loadTypeDemandes();
      loadReferentiels();
    }
  }, [showForm]);

  useEffect(() => {
    if (typeDemandes.length > 0 && !typeDemandeId) {
      const duplicataType = typeDemandes.find(
        (td) =>
          td.name.toLowerCase().includes('duplicata') ||
          td.name.toLowerCase().includes('duplicate')
      );
      if (duplicataType) {
        setTypeDemandeId(duplicataType.id);
        setSelectedTypeDemande(duplicataType);
        setIsFicheEnregistre(checkIsFicheEnregistre(duplicataType.name));
      }
    }
  }, [typeDemandes, typeDemandeId]);

  useEffect(() => {
    const numPermisActuel = buildNumeroPermis(numeroPermisParts, permisFormat);
    if (numPermisActuel && dataRecuperee) {
      const numPermisDansData = (dataRecuperee.numero_permis || dataRecuperee.numeroPermis || '').replace(/-/g, '').toUpperCase();
      const numPermisActuelSansTirets = numPermisActuel.replace(/-/g, '').toUpperCase();
      if (numPermisDansData && numPermisDansData !== numPermisActuelSansTirets) {
        setDataRecuperee(null);
        setCategoriePermisRecuperee(null);
        setPersonneData(initialPersonneData);
        setCandidatData(initialCandidatData);
        setPermisData(initialPermisData);
        setFormationData((prev) => ({ ...prev, referenciel_id: '' }));
      }
    }
  }, [numeroPermisParts, permisFormat, dataRecuperee]);

  useEffect(() => {
    if (categoriePermisRecuperee && referentiels.length > 0 && !formationData.referenciel_id) {
      const referentielTrouve = referentiels.find(
        (ref) => ref.code && ref.code.toUpperCase() === categoriePermisRecuperee.toUpperCase()
      );
      if (referentielTrouve) {
        setFormationData((prev) => ({ ...prev, referenciel_id: referentielTrouve.id }));
      }
    }
  }, [categoriePermisRecuperee, referentiels, formationData.referenciel_id]);

  const getRealStepIndex = (step: number): number => step;

  const resetForm = () => {
    setActiveStep(0);
    setTypeDemandeId('');
    setSelectedTypeDemande(null);
    setIsFicheEnregistre(false);
    setNumeroPermis('');
    setPermisFormat('standard');
    setPermisOrigineFormat('standard');
    setNumeroPermisParts(initialNumeroPermisParts);
    setNumeroOriginePermisParts(initialNumeroPermisParts);
    setPermisData(initialPermisData);
    setCandidatId(null);
    setPersonneId(null);
    setPersonneData(initialPersonneData);
    setCandidatData(initialCandidatData);
    setFormationData(initialFormationData);
    setDataRecuperee(null);
    setCategoriePermisRecuperee(null);
    setError(null);
    setSuccess(null);
  };

  const recupererDonnees = async (): Promise<boolean> => {
    const numPermisComplet = buildNumeroPermis(numeroPermisParts, permisFormat);
    if (!numPermisComplet) {
      setError('Le numéro de permis est requis. Veuillez remplir tous les champs du numéro de permis.');
      return false;
    }

    setPersonneData(initialPersonneData);
    setCandidatData(initialCandidatData);
    setPermisData(initialPermisData);
    setFormationData((prev) => ({ ...prev, referenciel_id: '' }));
    setCategoriePermisRecuperee(null);
    setDataRecuperee(null);
    setPersonneId(null);
    setCandidatId(null);
    setLoadingRecuperation(true);
    setError(null);

    try {
      const response = await gestionDossierService.getChangePermis(numPermisComplet);
      if (!response) {
        setError("Aucune réponse reçue de l'API pour ce numéro de permis.");
        return false;
      }

      let rawData = response.data || response;
      if (!rawData || (Array.isArray(rawData) && rawData.length === 0)) {
        setError("Aucune donnée trouvée dans la réponse de l'API pour ce numéro de permis.");
        return false;
      }

      const numPermisRecherche = numPermisComplet.replace(/-/g, '').toUpperCase();
      let data: any;

      if (Array.isArray(rawData)) {
        const elementCorrespondant = rawData.find((item: any) => {
          const itemNumPermis = (item.numero_permis || item.numeroPermis || '').replace(/-/g, '').toUpperCase();
          return itemNumPermis === numPermisRecherche;
        });
        if (elementCorrespondant) {
          data = elementCorrespondant;
        } else {
          setError(`Aucune correspondance exacte trouvée pour le numéro de permis "${numPermisComplet}".`);
          return false;
        }
      } else {
        const numPermisDansData = (rawData.numero_permis || rawData.numeroPermis || '').replace(/-/g, '').toUpperCase();
        if (numPermisDansData && numPermisDansData !== numPermisRecherche) {
          setError(`Le numéro de permis dans la réponse ne correspond pas au numéro recherché ("${numPermisComplet}").`);
          return false;
        }
        if (!rawData.numero_permis && !rawData.nom && !rawData.prenom) {
          setError("La réponse de l'API ne contient pas de données valides pour ce numéro de permis.");
          return false;
        }
        data = rawData;
      }

      setDataRecuperee(data);

      const numPermisDansDataFinal = (data.numero_permis || data.numeroPermis || '').replace(/-/g, '').toUpperCase();
      if (numPermisDansDataFinal !== numPermisRecherche) {
        setError(`Erreur de validation : le numéro de permis ne correspond pas.`);
        return false;
      }

      const hasPersonneData = data.nom || data.prenom;
      if (hasPersonneData) {
        setPersonneData({
          nom: data.nom || '',
          prenom: data.prenom || '',
          email: data.email || '',
          contact: data.contact || data.numero_identite || '',
          telephone: data.telephone || data.contact || '',
          adresse: data.adresse || '',
          password: '',
          password_confirmation: '',
        });
      }

      const hasCandidatData = data.date_naissance || data.numero_identite || data.lieu_naissance;
      if (hasCandidatData) {
        const formatDateForInput = (dateStr: string | null | undefined): string => {
          if (!dateStr) return '';
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
          } catch (_) {}
          return '';
        };
        setCandidatData({
          date_naissance: data.date_naissance || '',
          lieu_naissance: data.lieu_naissance || '',
          nip: data.nip || data.numero_identite || '',
          type_piece: data.type_piece || 'CNI',
          numero_piece: data.numero_piece || data.numero_identite || '',
          nationalite: data.nationalite || 'Gabonaise',
          genre: data.sexe || data.genre || 'M',
        });
      }

      if (data.numero_permis) {
        const formatDateForInput = (dateStr: string | null | undefined): string => {
          if (!dateStr) return '';
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
          } catch (_) {}
          return '';
        };
        setPermisData({
          numero_permis: data.numero_permis || '',
          numero_origine_permis: data.numero_origine_permis || '',
          lieu_de_dobtention_du_permis: data.lieu_obtention || data.lieu_origine || '',
          date_de_dobtention_du_permis: formatDateForInput(data.date_obtention),
          date_de_delivrance_du_permis: formatDateForInput(data.date_validite),
        });
        setNumeroPermis(data.numero_permis);
      }

      if (data.categorie) {
        const categories = data.categorie.split(',').map((c: string) => c.trim());
        const premiereCategorie = categories[0];
        setCategoriePermisRecuperee(premiereCategorie);
        const referentielTrouve = referentiels.find(
          (ref) => ref.code && ref.code.toUpperCase() === premiereCategorie.toUpperCase()
        );
        if (referentielTrouve) {
          setFormationData((prev) => ({ ...prev, referenciel_id: referentielTrouve.id }));
        }
      }

      if (!hasPersonneData && !hasCandidatData) {
        setError("Aucune information trouvée dans l'API pour ce numéro de permis.");
        return false;
      }

      const hasValidData =
        (hasPersonneData && (data.nom || data.prenom)) ||
        (hasCandidatData && (data.date_naissance || data.numero_identite));
      if (!hasValidData) {
        setError("Les données reçues de l'API sont vides ou invalides.");
        return false;
      }

      return true;
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("Aucune information trouvée pour ce numéro de permis.");
      } else if (err.response?.status === 400) {
        setError("Le numéro de permis fourni est invalide.");
      } else if (err.response?.data?.message) {
        setError(`Erreur API: ${err.response.data.message}`);
      } else if (err.message) {
        setError(`Erreur: ${err.message}`);
      } else {
        setError("Erreur lors de la récupération. Veuillez réessayer.");
      }
      setPersonneData(initialPersonneData);
      setCandidatData(initialCandidatData);
      setPermisData(initialPermisData);
      setDataRecuperee(null);
      setCategoriePermisRecuperee(null);
      return false;
    } finally {
      setLoadingRecuperation(false);
    }
  };

  const handleNext = async () => {
    setError(null);
    const realStep = getRealStepIndex(activeStep);

    if (realStep === 0) {
      if (!typeDemandeId) {
        setError('Veuillez sélectionner le type de demande DUPLICATA');
        return;
      }
      setActiveStep(1);
    } else if (realStep === 1) {
      if (
        !validateStepNumeroPermis({
          setError,
          isFicheEnregistre,
          numeroPermisParts,
          setNumeroPermis,
          permisFormat,
        })
      ) {
        return;
      }
      setPermisData((prev) => ({ ...prev, numero_permis: numeroPermis }));
      setActiveStep(2);
    } else if (realStep === 2) {
      const successRecup = await recupererDonnees();
      if (successRecup) setActiveStep(3);
    } else if (realStep === 3) {
      setActiveStep(4);
    } else if (realStep === 4) {
      return;
    } else if (realStep === 5) {
      if (!validateCandidat({ candidatData, setError })) return;
      setLoading(true);
      try {
        if (!personneId) {
          setError('Erreur: ID de la personne manquant. Veuillez recommencer.');
          setLoading(false);
          return;
        }
        if (!candidatId) {
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
          const candidatResponse = await autoEcoleService.createCandidat(candidatPayload as any);
          if (candidatResponse.data?.id) {
            setCandidatId(candidatResponse.data.id);
            setActiveStep(6);
          } else {
            setError("Erreur: Impossible de récupérer l'ID du candidat créé.");
          }
        } else {
          setActiveStep(6);
        }
      } catch (err: any) {
        if (err.response?.data?.errors) {
          const erreursCandidat: string[] = [];
          Object.entries(err.response.data.errors).forEach(([field, messages]: [string, any]) => {
            const messageList = Array.isArray(messages) ? messages : [messages];
            erreursCandidat.push(`${field}: ${messageList.join(', ')}`);
          });
          setError(`Erreur de validation candidat :\n• ${erreursCandidat.join('\n• ')}`);
        } else {
          setError(err.response?.data?.message || err.message || "Erreur lors de l'enregistrement du candidat");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRegisterPersonne = async () => {
    setError(null);
    if (!validatePersonne({ personneData, setError })) return;
    setLoading(true);
    try {
      if (!personneId) {
        const registerPayload = {
          email: personneData.email,
          telephone: personneData.telephone || '',
          password: personneData.password,
          password_confirmation: personneData.password_confirmation,
          nom: personneData.nom,
          prenom: personneData.prenom,
          contact: personneData.telephone || '',
          adresse: personneData.adresse || '',
          role: 'candidat',
        };
        const registerResponse = await authService.register(registerPayload);
        let personneIdFromResponse: string | null = null;
        if (registerResponse.user?.personne?.id) personneIdFromResponse = registerResponse.user.personne.id;
        else if (registerResponse.data?.personne_id) personneIdFromResponse = registerResponse.data.personne_id;
        else if (registerResponse.personne_id) personneIdFromResponse = registerResponse.personne_id;
        if (personneIdFromResponse) {
          setPersonneId(personneIdFromResponse);
          setActiveStep(5);
        } else {
          setError("Erreur: Impossible de récupérer l'ID de la personne créée.");
        }
      } else {
        setActiveStep(5);
      }
    } catch (err: any) {
      const errorData = err.response?.data || {};
      const errorMessage = errorData.message || err.message || "Erreur lors de l'enregistrement";
      const errorString = typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage);
      const fullErrorText = JSON.stringify(errorData).toLowerCase();
      const isAuthentikError =
        fullErrorText.includes('could not resolve host') ||
        fullErrorText.includes('authentik') ||
        fullErrorText.includes('iam.transports.gouv.ga');
      if (isAuthentikError) {
        setError("Erreur de connexion avec le service d'authentification. Veuillez réessayer plus tard.");
      } else if (err.response?.data?.errors) {
        const erreursPersonne: string[] = [];
        Object.entries(err.response.data.errors).forEach(([field, messages]: [string, any]) => {
          const messageList = Array.isArray(messages) ? messages : [messages];
          erreursPersonne.push(`${field}: ${messageList.join(', ')}`);
        });
        setError(erreursPersonne.length > 0 ? erreursPersonne.join('\n• ') : errorString);
      } else {
        setError(errorString);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!candidatId && !personneId) {
      setError('Erreur: Les données du candidat ou de la personne sont manquantes');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const dossierPayload: any = {
        candidat_id: candidatId || dataRecuperee?.candidat_id,
        type_demande_id: typeDemandeId,
        statut: 'en_attente',
        date_creation: today,
        commentaires: formationData.commentaires || undefined,
      };
      const numPermis = permisData.numero_permis || numeroPermis;
      if (numPermis) dossierPayload.numero_permis = numPermis;
      if (permisData.numero_origine_permis?.trim()) dossierPayload.numero_origine_permis = permisData.numero_origine_permis;
      if (permisData.lieu_de_dobtention_du_permis?.trim()) dossierPayload.lieu_de_dobtention_du_permis = permisData.lieu_de_dobtention_du_permis;
      if (permisData.date_de_dobtention_du_permis) dossierPayload.date_de_dobtention_du_permis = new Date(permisData.date_de_dobtention_du_permis).toISOString();
      if (permisData.date_de_delivrance_du_permis) dossierPayload.date_de_delivrance_du_permis = new Date(permisData.date_de_delivrance_du_permis).toISOString();
      if (formationData.referenciel_id) {
        dossierPayload.referenciel_id = formationData.referenciel_id;
        try {
          const resolved = await autoEcoleService.resolveCnepcForReferenciel(
            formationData.referenciel_id
          );
          if (resolved) {
            dossierPayload.auto_ecole_id = resolved.autoEcole.id;
            dossierPayload.formation_id = resolved.formation.id;
          }
        } catch (_) {}
      }
      const response = await autoEcoleService.createDossier(dossierPayload);
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

  return {
    steps: RECUPERATION_STEPS,
    showForm,
    setShowForm,
    loading,
    error,
    setError,
    success,
    activeStep,
    typeDemandeId,
    selectedTypeDemande,
    isFicheEnregistre,
    numeroPermis,
    setNumeroPermis,
    permisFormat,
    setPermisFormat,
    permisOrigineFormat,
    setPermisOrigineFormat,
    numeroPermisParts,
    setNumeroPermisParts,
    numeroOriginePermisParts,
    setNumeroOriginePermisParts,
    permisData,
    setPermisData,
    personneData,
    setPersonneData,
    candidatData,
    setCandidatData,
    formationData,
    setFormationData,
    dataRecuperee,
    loadingRecuperation,
    loadingReferentiels,
    referentiels,
    personneId,
    candidatId,
    getRealStepIndex,
    buildNumeroPermis,
    resetForm,
    handleNext,
    handleBack,
    handleSubmit,
    handleRegisterPersonne,
  };
}
