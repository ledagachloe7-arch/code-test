import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Paper,
  Button,
  Grid,
  Divider,
  StepIconProps,
  styled,
} from '@mui/material';
import {
  ArrowBack,
  Info,
  CheckCircle,
  RadioButtonUnchecked,
  Circle,
} from '@mui/icons-material';
import { CreateDossierProvider, useCreateDossier } from '../contexts/CreateDossierContext';
import { useFormations } from '../forms/hooks';
import { checkIsDuplicata, checkIsFicheEnregistre } from '../forms/utils';

// Pages pour chaque étape - Direct imports to avoid Vite module resolution issues
// Updated: 2024-01-XX - Using direct imports instead of React.lazy
import TypeDemandePage from './steps/TypeDemandePage';
import AutoEcoleFormationPage from './steps/AutoEcoleFormationPage';
import NumeroPermisPage from './steps/NumeroPermisPage';
import PermisInfoPage from './steps/PermisInfoPage';
import PermisOriginePage from './steps/PermisOriginePage';
import PermisBOriginePage from './steps/PermisBOriginePage';
import PersonneFormPage from './steps/PersonneFormPage';
import CandidatFormPage from './steps/CandidatFormPage';
import CandidatRecapPage from './steps/CandidatRecapPage';
import FinalisationPage from './steps/FinalisationPage';

// Composant StepIcon personnalisé - style compact et épuré
const CustomStepIcon = styled('div')<StepIconProps & { active?: boolean; completed?: boolean }>(
  ({ theme, active, completed }) => ({
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: completed || active ? 'white' : theme.palette.text.secondary,
    background: completed
      ? '#4caf50'
      : active
      ? '#1976d2'
      : theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#e0e0e0',
    boxShadow: 'none',
    transition: 'all 0.25s ease',
    position: 'relative',
    zIndex: 1,
  })
);

const StepIconComponent: React.FC<StepIconProps> = ({ active, completed, icon }) => {
  return (
    <CustomStepIcon active={active} completed={completed} icon={icon}>
      {completed ? (
        <CheckCircle sx={{ fontSize: 16, color: 'white' }} />
      ) : active ? (
        <Circle sx={{ fontSize: 14, color: 'white' }} />
      ) : (
        <RadioButtonUnchecked sx={{ fontSize: 14 }} />
      )}
    </CustomStepIcon>
  );
};

const CreateDossierFlowContent: React.FC = () => {
  const navigate = useNavigate();
  const { step } = useParams<{ step: string }>();
  const currentStep = parseInt(step || '0', 10);
  
  const {
    isNouveauPermis,
    selectedTypeDemande,
    needsPermisOrigine,
    isFormationTypeC,
    candidatMode,
    selectedCandidat,
    candidatId,
    candidatTrouveFromPermisPrincipal,
    candidatTrouveFromPermisOrigine,
    permisPrincipalVerified,
    numeroPermisParts,
    setPreviewMode,
  } = useCreateDossier();

  const { formations } = useFormations();

  // Déterminer les étapes dynamiquement
  const getSteps = (): string[] => {
    const baseSteps = ['Type de demande'];
    const isDuplicata = selectedTypeDemande ? checkIsDuplicata(selectedTypeDemande.name) : false;
    const isFicheEnregistreType = selectedTypeDemande ? checkIsFicheEnregistre(selectedTypeDemande.name) : false;
    const candidatTrouve = candidatTrouveFromPermisPrincipal || candidatTrouveFromPermisOrigine;
    const hasExistingCandidat = candidatMode === 'existing' && selectedCandidat && candidatId;
    
    if (isNouveauPermis) {
      baseSteps.push('Auto-école et Formation');
      if (isFormationTypeC(formations || [])) {
        baseSteps.push('Permis B d\'origine');
      }
    } else {
      baseSteps.push('Numéro de permis');
      baseSteps.push('Informations du permis');
      // Pour fiche d'enregistrement, l'étape "Permis d'origine" est toujours affichée
      if (isFicheEnregistreType) {
        baseSteps.push('Permis d\'origine');
      } else if (needsPermisOrigine() && !isFicheEnregistreType) {
        baseSteps.push('Permis d\'origine');
      }
    }
    
    // Pour fiche d'enregistrement, déterminer les étapes suivantes selon la catégorie
    if (isFicheEnregistreType) {
      const categorie = numeroPermisParts?.categorie?.toUpperCase().trim() || '';
      const hasCategorieCDE = ['C', 'D', 'E'].includes(categorie);
      
      if (hasCategorieCDE) {
        // Pour catégorie C, D ou E : après PermisBOrigine, afficher CandidatRecap si candidat trouvé, sinon PersonneForm puis CandidatForm
        if (candidatTrouve || hasExistingCandidat) {
          baseSteps.push('Récapitulatif candidat');
        } else {
          baseSteps.push('Informations personnelles', 'Informations du candidat');
        }
      } else {
        // Pour autre catégorie
        if (candidatTrouve || hasExistingCandidat) {
          baseSteps.push('Récapitulatif candidat');
        } else {
          baseSteps.push('Informations personnelles', 'Informations du candidat');
        }
      }
    } else if (isDuplicata) {
      // Pour duplicata
      if (candidatTrouve || hasExistingCandidat) {
        // Si candidat trouvé → Récapitulatif candidat
        baseSteps.push('Récapitulatif candidat');
      } else {
        // Si pas de candidat trouvé → Informations personnelles puis Informations du candidat
        baseSteps.push('Informations personnelles', 'Informations du candidat');
      }
    } else if (!hasExistingCandidat) {
      // Pour les autres cas, si un candidat a été trouvé après vérification du permis, afficher CandidatRecap
      if (candidatTrouve && (needsPermisOrigine() || permisPrincipalVerified)) {
        baseSteps.push('Récapitulatif candidat');
      } else {
        baseSteps.push('Informations personnelles', 'Informations du candidat');
      }
    }
    
    baseSteps.push('Finalisation');
    return baseSteps;
  };

  const steps = getSteps();


  // Navigation
  const handleNext = () => {
    setPreviewMode(false);
    if (currentStep < steps.length - 1) {
      navigate(`/gestion-dossier/create/${currentStep + 1}`);
    }
  };

  const handleBack = () => {
    setPreviewMode(false);
    if (currentStep > 0) {
      navigate(`/gestion-dossier/create/${currentStep - 1}`);
    } else {
      navigate('/gestion-dossier');
    }
  };

  /** Navigation vers une étape en cliquant sur la timeline : simple switch, pas d'enregistrement ni requête API */
  const handleStepClick = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setPreviewMode(true);
      navigate(`/gestion-dossier/create/${stepIndex}`);
    }
  };

  // Obtenir le contenu de l'étape actuelle
  const getStepContent = () => {
    const hasExistingCandidat = candidatMode === 'existing' && selectedCandidat && candidatId;
    const hasPermisOrigine = needsPermisOrigine();
    const isDuplicata = selectedTypeDemande ? checkIsDuplicata(selectedTypeDemande.name) : false;
    const isFicheEnregistreType = selectedTypeDemande ? checkIsFicheEnregistre(selectedTypeDemande.name) : false;
    const candidatTrouve = candidatTrouveFromPermisPrincipal || candidatTrouveFromPermisOrigine;

    // Debug logs
    console.log('🔍 [CreateDossierFlowPage] getStepContent:', {
      currentStep,
      isNouveauPermis,
      isDuplicata,
      isFicheEnregistreType,
      selectedTypeDemandeName: selectedTypeDemande?.name,
      candidatTrouve,
      candidatTrouveFromPermisPrincipal: !!candidatTrouveFromPermisPrincipal,
      candidatTrouveFromPermisOrigine: !!candidatTrouveFromPermisOrigine,
      hasExistingCandidat,
      hasPermisOrigine,
      permisPrincipalVerified,
      numeroPermisParts,
      categorie: numeroPermisParts?.categorie,
    });

    if (currentStep === 0) {
      return <TypeDemandePage onNext={handleNext} onBack={handleBack} />;
    }

    // Affichage par libellé d'étape : garantir Personne → Candidat → Finalisation (duplicata, fiche d'enregistrement, etc.)
    const stepLabel = steps[currentStep];
    if (stepLabel === 'Informations personnelles') {
      return <PersonneFormPage onNext={handleNext} onBack={handleBack} />;
    }
    if (stepLabel === 'Informations du candidat') {
      return <CandidatFormPage onNext={handleNext} onBack={handleBack} />;
    }
    if (stepLabel === 'Récapitulatif candidat') {
      return <CandidatRecapPage onNext={handleNext} onBack={handleBack} />;
    }
    if (stepLabel === 'Finalisation') {
      return <FinalisationPage onBack={handleBack} />;
    }

    if (isNouveauPermis) {
      if (currentStep === 1) {
        return <AutoEcoleFormationPage onNext={handleNext} onBack={handleBack} />;
      }
      if (currentStep === 2 && isFormationTypeC(formations || [])) {
        return <PermisBOriginePage onNext={handleNext} onBack={handleBack} />;
      }
      if (currentStep === 3 && isFormationTypeC(formations || [])) {
        // Récapitulatif ou PersonneFormStep selon si candidat trouvé
        return <PersonneFormPage onNext={handleNext} onBack={handleBack} />;
      }
      if (currentStep === 4 && !hasExistingCandidat) {
        return <PersonneFormPage onNext={handleNext} onBack={handleBack} />;
      }
      if (currentStep === 5 && !hasExistingCandidat) {
        return <CandidatFormPage onNext={handleNext} onBack={handleBack} />;
      }
      return <FinalisationPage onBack={handleBack} />;
    } else {
      if (currentStep === 1) {
        return <NumeroPermisPage onNext={handleNext} onBack={handleBack} />;
      }
      if (currentStep === 2) {
        return <PermisInfoPage onNext={handleNext} onBack={handleBack} />;
      }
      // Après l'identification du permis (étape 2), pour fiche d'enregistrement
      if (currentStep === 3 && isFicheEnregistreType) {
        console.log('✅ [CreateDossierFlowPage] Affichage PermisOriginePage pour fiche d\'enregistrement');
        return <PermisOriginePage onNext={handleNext} onBack={handleBack} />;
      }
      // Après PermisOriginePage pour fiche d'enregistrement avec catégorie C, D ou E
      if (currentStep === 4 && isFicheEnregistreType && permisPrincipalVerified) {
        const categorieRaw = numeroPermisParts?.categorie;
        const categorie = categorieRaw ? String(categorieRaw).toUpperCase().trim() : '';
        const hasCategorieCDE = categorie && ['C', 'D', 'E'].includes(categorie);
        
        if (hasCategorieCDE) {
          // Après PermisOriginePage, si candidat trouvé → CandidatRecapPage
          if (candidatTrouve) {
            console.log('✅ [CreateDossierFlowPage] Affichage CandidatRecapPage pour fiche d\'enregistrement C/D/E après PermisOrigine (candidat trouvé)');
            return <CandidatRecapPage onNext={handleNext} onBack={handleBack} />;
          } else {
            // Pas de candidat → PersonneFormPage d'abord
            console.log('✅ [CreateDossierFlowPage] Affichage PersonneFormPage pour fiche d\'enregistrement C/D/E après PermisOrigine (pas de candidat)');
            return <PersonneFormPage onNext={handleNext} onBack={handleBack} />;
          }
        }
      }
      // Après PersonneFormPage pour fiche d'enregistrement, afficher CandidatFormPage
      if (currentStep === 4 && isFicheEnregistreType && !candidatTrouve && !hasExistingCandidat) {
        const categorieRaw = numeroPermisParts?.categorie;
        const categorie = categorieRaw ? String(categorieRaw).toUpperCase().trim() : '';
        const hasCategorieCDE = categorie && ['C', 'D', 'E'].includes(categorie);
        
        // Si ce n'est pas une catégorie C, D, E, on est après PersonneFormPage (étape 3 → étape 4)
        if (!hasCategorieCDE) {
          console.log('✅ [CreateDossierFlowPage] Affichage CandidatFormPage pour fiche d\'enregistrement après PersonneFormPage (catégorie non C/D/E)');
          return <CandidatFormPage onNext={handleNext} onBack={handleBack} />;
        }
      }
      // Après PersonneFormPage pour fiche d'enregistrement avec catégorie C, D, E (étape 4 → étape 5)
      if (currentStep === 5 && isFicheEnregistreType && !candidatTrouve && !hasExistingCandidat) {
        const categorieRaw = numeroPermisParts?.categorie;
        const categorie = categorieRaw ? String(categorieRaw).toUpperCase().trim() || '' : '';
        const hasCategorieCDE = categorie && ['C', 'D', 'E'].includes(categorie);
        
        if (hasCategorieCDE) {
          console.log('✅ [CreateDossierFlowPage] Affichage CandidatFormPage pour fiche d\'enregistrement après PersonneFormPage (catégorie C/D/E)');
          return <CandidatFormPage onNext={handleNext} onBack={handleBack} />;
        }
      }
      // Après CandidatRecapPage pour fiche d'enregistrement, aller directement à Finalisation
      if (currentStep === 5 && isFicheEnregistreType && hasExistingCandidat) {
        console.log('✅ [CreateDossierFlowPage] Affichage FinalisationPage après CandidatRecapPage (fiche d\'enregistrement)');
        return <FinalisationPage onBack={handleBack} />;
      }
      // Après CandidatFormPage pour fiche d'enregistrement, aller à Finalisation
      if (currentStep === 6 && isFicheEnregistreType && !candidatTrouve && !hasExistingCandidat) {
        console.log('✅ [CreateDossierFlowPage] Affichage FinalisationPage après CandidatFormPage (fiche d\'enregistrement)');
        return <FinalisationPage onBack={handleBack} />;
      }
      // Logique pour duplicata (sans permis d'origine)
      if (currentStep === 3 && !hasPermisOrigine && !isFicheEnregistreType) {
        if (isDuplicata && candidatTrouve) {
          // Duplicata avec candidat trouvé → CandidatRecapPage
          console.log('✅ [CreateDossierFlowPage] Affichage CandidatRecapPage pour duplicata (candidat trouvé)');
          return <CandidatRecapPage onNext={handleNext} onBack={handleBack} />;
        } else if (isDuplicata && !candidatTrouve) {
          // Duplicata sans candidat trouvé → PersonneFormPage
          console.log('✅ [CreateDossierFlowPage] Affichage PersonneFormPage pour duplicata (pas de candidat trouvé)');
          return <PersonneFormPage onNext={handleNext} onBack={handleBack} />;
        } else {
          console.log('⚠️ [CreateDossierFlowPage] Affichage PersonneFormPage (pas duplicata ou pas de candidat trouvé)');
          return <PersonneFormPage onNext={handleNext} onBack={handleBack} />;
        }
      }
      // Après PersonneFormPage pour duplicata (sans permis d'origine), afficher CandidatFormPage
      if (currentStep === 4 && isDuplicata && !hasPermisOrigine && !isFicheEnregistreType && !candidatTrouve && !hasExistingCandidat) {
        console.log('✅ [CreateDossierFlowPage] Affichage CandidatFormPage pour duplicata après PersonneFormPage');
        return <CandidatFormPage onNext={handleNext} onBack={handleBack} />;
      }
      // Logique pour duplicata avec permis d'origine
      if (currentStep === 3 && hasPermisOrigine && !isFicheEnregistreType) {
        return <PermisOriginePage onNext={handleNext} onBack={handleBack} />;
      }
      // Après PermisOriginePage, vérifier si un candidat a été trouvé
      if (currentStep === 4 && hasPermisOrigine && !isFicheEnregistreType) {
        // Si un candidat a été trouvé (duplicata ou autre type), afficher CandidatRecapPage
        if (candidatTrouve && !hasExistingCandidat) {
          console.log('✅ [CreateDossierFlowPage] Affichage CandidatRecapPage après PermisOrigine (candidat trouvé)', {
            isDuplicata,
            candidatTrouveFromPermisOrigine: !!candidatTrouveFromPermisOrigine,
            candidatTrouveFromPermisPrincipal: !!candidatTrouveFromPermisPrincipal,
          });
          return <CandidatRecapPage onNext={handleNext} onBack={handleBack} />;
        } else if (!candidatTrouve && !hasExistingCandidat) {
          // Pas de candidat trouvé → PersonneFormPage
          console.log('⚠️ [CreateDossierFlowPage] Affichage PersonneFormPage après PermisOrigine (pas de candidat trouvé)');
          return <PersonneFormPage onNext={handleNext} onBack={handleBack} />;
        }
      }
      // Après PersonneFormPage pour duplicata avec permis d'origine, afficher CandidatFormPage
      if (currentStep === 5 && isDuplicata && hasPermisOrigine && !isFicheEnregistreType && !candidatTrouve && !hasExistingCandidat) {
        console.log('✅ [CreateDossierFlowPage] Affichage CandidatFormPage pour duplicata après PersonneFormPage (avec permis d\'origine)');
        return <CandidatFormPage onNext={handleNext} onBack={handleBack} />;
      }
      // Après CandidatRecapPage pour duplicata, aller directement à Finalisation
      if (currentStep === 4 && isDuplicata && hasExistingCandidat && !isFicheEnregistreType) {
        console.log('✅ [CreateDossierFlowPage] Affichage FinalisationPage après CandidatRecapPage (duplicata)');
        return <FinalisationPage onBack={handleBack} />;
      }
      // Après CandidatFormPage pour duplicata (sans permis d'origine), aller à Finalisation
      if (currentStep === 5 && isDuplicata && !hasPermisOrigine && !isFicheEnregistreType && !candidatTrouve && !hasExistingCandidat) {
        console.log('✅ [CreateDossierFlowPage] Affichage FinalisationPage après CandidatFormPage (duplicata sans permis d\'origine)');
        return <FinalisationPage onBack={handleBack} />;
      }
      // Après CandidatFormPage pour duplicata (avec permis d'origine), aller à Finalisation
      if (currentStep === 6 && isDuplicata && hasPermisOrigine && !isFicheEnregistreType && !candidatTrouve && !hasExistingCandidat) {
        console.log('✅ [CreateDossierFlowPage] Affichage FinalisationPage après CandidatFormPage (duplicata avec permis d\'origine)');
        return <FinalisationPage onBack={handleBack} />;
      }
      // Cas généraux (non duplicata, non fiche d'enregistrement)
      if (currentStep === 3 && !hasPermisOrigine && !isDuplicata && !isFicheEnregistreType) {
        // Vérifier si un candidat a été trouvé après la vérification du permis principal
        if (candidatTrouve && !hasExistingCandidat) {
          console.log('✅ [CreateDossierFlowPage] Affichage CandidatRecapPage (candidat trouvé après permis principal)');
          return <CandidatRecapPage onNext={handleNext} onBack={handleBack} />;
        }
        return <PersonneFormPage onNext={handleNext} onBack={handleBack} />;
      }
      // Après CandidatRecapPage pour cas généraux, aller directement à Finalisation
      if (currentStep === 4 && !isDuplicata && !isFicheEnregistreType && hasExistingCandidat) {
        console.log('✅ [CreateDossierFlowPage] Affichage FinalisationPage après CandidatRecapPage (cas général)');
        return <FinalisationPage onBack={handleBack} />;
      }
      // Après PersonneFormPage (étape 4 ou 5 selon si permis d'origine) - seulement pour les cas non fiche d'enregistrement
      if (currentStep === 5 && !isFicheEnregistreType && !needsPermisOrigine() && !hasExistingCandidat) {
        return <CandidatFormPage onNext={handleNext} onBack={handleBack} />;
      }
      if (currentStep === 5 && !isFicheEnregistreType && needsPermisOrigine() && !hasExistingCandidat) {
        return <CandidatFormPage onNext={handleNext} onBack={handleBack} />;
      }
      // Après CandidatFormPage pour cas généraux (non fiche d'enregistrement), aller à Finalisation
      if (currentStep === 6 && !isFicheEnregistreType && !hasExistingCandidat) {
        console.log('✅ [CreateDossierFlowPage] Affichage FinalisationPage après CandidatFormPage (cas général)');
        return <FinalisationPage onBack={handleBack} />;
      }
      // Cas par défaut - seulement si ce n'est pas une fiche d'enregistrement
      if (!isFicheEnregistreType) {
        return <FinalisationPage onBack={handleBack} />;
      }
      // Pour fiche d'enregistrement, si on arrive ici sans condition spécifique, retourner Finalisation
      return <FinalisationPage onBack={handleBack} />;
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Grid container sx={{ minHeight: '100vh', alignItems: 'flex-start' }}>
        {/* Sidebar à gauche - hauteur fixe 100vh, reste fixée au scroll */}
        <Grid
          item
          xs={12}
          md={4}
          lg={3}
          sx={{
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
            color: 'white',
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            position: { xs: 'relative', md: 'sticky' },
            top: 0,
            height: { xs: 'auto', md: '100vh' },
            minHeight: { xs: 'auto', md: '100vh' },
            maxHeight: { xs: 'none', md: '100vh' },
            overflow: 'hidden',
            alignSelf: { xs: 'stretch', md: 'flex-start' },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url(/assets/img/drapeau_sceau.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.1,
              zIndex: 0,
            },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            {/* Contenu + footer en pied de page */}
            <Box sx={{ width: '100%', maxWidth: '100%', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* Logo et titre du ministère */}
              <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Box
                  component="img"
                  src="/assets/img/mtt.png"
                  alt="Ministère des Transports"
                  sx={{
                    maxWidth: '120px',
                    height: 'auto',
                    mb: 3,
                    filter: 'brightness(0) invert(1)',
                    mx: 'auto',
                  }}
                />
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    mb: 2,
                    textAlign: 'center',
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    fontSize: '0.9rem',
                  }}
                >
                 Ministère des Transports , de la Marine Marchande et de la Logistique
                </Typography>
                <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', mb: 2 }} />
               
              </Box>
 

  
              {/* Footer de la sidebar - pied de page (bottom: 0) */}
              <Box sx={{ mt: 'auto', pt: 3, textAlign: 'center', alignSelf: 'stretch', position: 'relative', bottom: 0 }}>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                    <Info sx={{ mr: 1.5, mt: 0.5, fontSize: 20 }} />
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, textAlign: 'left', fontSize: '0.75rem' }}>
                        À propos
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9, lineHeight: 1.2, textAlign: 'justify', fontSize: '0.7rem' }}>
                        Cette plateforme est développée et maintenue par la Direction Générale des Transports Terrestres
                        dans le cadre de la modernisation des services administratifs du Ministère des Transports Publics
                        de la Marchandise et de la Logistique.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Divider sx={{ bgcolor: 'rgba(255,255,255,0.3)', mb: 2 }} />
                <Typography variant="caption" sx={{ opacity: 0.8, fontSize: '0.65rem' }}>
                  © {new Date().getFullYear()} - Ministère des Transports , de la Marine Marchande et de la Logistique, tous droits réservés
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* Contenu principal à droite */}
        <Grid item xs={12} md={8} lg={9} sx={{ p: { xs: 2, sm: 4, md: 6 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5" component="h1" gutterBottom sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Création de Dossier
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                Suivez les étapes pour créer un nouveau dossier
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/gestion-dossier')}
              sx={{
                borderRadius: 0,
                px: 3,
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                border: 'None',
                borderColor: 'None',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  background: 'rgba(25, 118, 210, 0.08)',
                  transform: 'translateX(-4px)',
                },
              }}
            >
              Retour à la gestion
            </Button>
          </Box>

          <Paper
            sx={{
              p: 3,
              borderRadius: 0,
              boxShadow: 'None',
              background: 'linear-gradient(135deg,rgba(255, 255, 255, 0) 0%,rgba(250, 250, 250, 0) 100%)',
            }}
          >
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                background: 'linear-gradient(135deg,rgba(245, 247, 250, 0) 0%,rgba(232, 236, 241, 0) 100%)',
                border: 'None',
                borderColor: 'None',
                elevation: 5,
              }}
            >
              <Stepper
                activeStep={currentStep}
                sx={{
                  '& .MuiStep-root': {
                    '&:last-child .MuiStepConnector-root': {
                      display: 'none',
                    },
                  },
                  '& .MuiStepConnector-root': {
                    top: 14,
                    left: 'calc(-50% + 14px)',
                    right: 'calc(50% + 14px)',
                    '& .MuiStepConnector-line': {
                      borderTopWidth: 2,
                      borderColor: (theme) =>
                        theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#e0e0e0',
                      transition: 'border-color 0.25s ease',
                    },
                  },
                  '& .MuiStepConnector-active .MuiStepConnector-line': {
                    borderColor: 'primary.main',
                  },
                  '& .MuiStepConnector-completed .MuiStepConnector-line': {
                    borderColor: '#4caf50',
                  },
                  '& .MuiStepLabel-root': {
                    '& .MuiStepLabel-label': {
                      fontWeight: 500,
                      fontSize: '0.75rem',
                      color: 'text.primary',
                      '&.Mui-active': {
                        color: 'primary.main',
                        fontWeight: 600,
                      },
                      '&.Mui-completed': {
                        color: '#4caf50',
                        fontWeight: 500,
                      },
                    },
                  },
                }}
              >
                {steps.map((label, index) => (
                  <Step key={label} completed={index < currentStep} active={index === currentStep}>
                    <StepButton
                      onClick={() => handleStepClick(index)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <StepLabel StepIconComponent={StepIconComponent}>{label}</StepLabel>
                    </StepButton>
                  </Step>
                ))}
              </Stepper>
            </Box>

            <Box
              sx={{
                minHeight: '400px',
                position: 'relative',
                '& > *': {
                  animation: 'fadeInSlide 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  '@keyframes fadeInSlide': {
                    '0%': {
                      opacity: 0,
                      transform: 'translateY(20px)',
                    },
                    '100%': {
                      opacity: 1,
                      transform: 'translateY(0)',
                    },
                  },
                },
              }}
            >
              {getStepContent()}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

const CreateDossierFlowPage: React.FC = () => {
  return (
    <CreateDossierProvider>
      <CreateDossierFlowContent />
    </CreateDossierProvider>
  );
};

export default CreateDossierFlowPage;

