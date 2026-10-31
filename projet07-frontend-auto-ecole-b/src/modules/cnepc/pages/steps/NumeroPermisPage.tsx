import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Alert } from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { useCreateDossier } from '../../contexts/CreateDossierContext';
import { buildNumeroPermis } from '../../forms/utils';
import { NumeroPermisStep } from '../../forms/steps';

interface NumeroPermisPageProps {
  onNext: () => void;
  onBack: () => void;
}

const NumeroPermisPage: React.FC<NumeroPermisPageProps> = ({ onNext, onBack }) => {
  const {
    numeroPermisParts,
    permisFormat,
    isFicheEnregistre,
    availableCategories,
    setNumeroPermisParts,
    setPermisFormat,
    error,
    setError,
    verifyingPermisPrincipal,
    permisPrincipalVerified,
    verificationErrorPrincipal,
    candidatNonTrouvePrincipal,
    personneData,
    candidatData,
    setPersonneData,
    setCandidatData,
    handleVerifyPermisPrincipal,
    handleVerifyPermisByIdentity,
    permisListForModal,
    identitySearchNomForRefinement,
    clearIdentitySearchRefinement,
    handlePermisSelectionConfirm,
    handlePermisSelectionClose,
    numeroPermisDgdiVerified,
    numeroPermisDgdiBypass,
    persistNumeroPermisDgdi,
  } = useCreateDossier();
  const [stepValidation, setStepValidation] = useState(() => ({
    dgdiVerified: numeroPermisDgdiVerified,
    dgdiBypassDueToService: numeroPermisDgdiBypass,
    permisVerified: permisPrincipalVerified,
    identityRequired: false,
    identityComplete: false,
    isStepValid:
      (numeroPermisDgdiVerified || numeroPermisDgdiBypass) && permisPrincipalVerified,
  }));

  // Log pour déboguer les changements de catégorie
  useEffect(() => {
    console.log('[NumeroPermisPage] État actuel:', {
      numeroPermisParts,
      categorie: numeroPermisParts.categorie,
      availableCategories,
      permisPrincipalVerified,
    });
  }, [numeroPermisParts.categorie, availableCategories, permisPrincipalVerified]);

  const mustFillIdentityBeforeNext = stepValidation.identityRequired && !stepValidation.identityComplete;
  const mustCompleteAllChecksBeforeNext = !stepValidation.isStepValid;

  const handleNext = () => {
    // Si plusieurs catégories sont disponibles et que le permis est vérifié, s'assurer qu'une catégorie est sélectionnée
    if (availableCategories.length > 1 && permisPrincipalVerified && !numeroPermisParts.categorie) {
      setError('Veuillez sélectionner une catégorie de permis avant de continuer');
      return;
    }
    
    // Si le permis est vérifié mais qu'aucune catégorie n'est définie, afficher une erreur
    if (permisPrincipalVerified && !numeroPermisParts.categorie) {
      setError('Veuillez sélectionner ou saisir une catégorie de permis avant de continuer');
      return;
    }
    
    console.log('✅ [NumeroPermisPage] Navigation vers l\'étape suivante:', {
      numeroPermisParts: JSON.stringify(numeroPermisParts),
      categorie: numeroPermisParts.categorie,
      categorieType: typeof numeroPermisParts.categorie,
      availableCategories,
      permisPrincipalVerified,
    });
    
    // Vérifier une dernière fois que la catégorie est bien présente
    if (permisPrincipalVerified && !numeroPermisParts.categorie) {
      console.error('❌ [NumeroPermisPage] ERREUR: La catégorie est toujours vide avant la navigation!');
      setError('Erreur: La catégorie de permis n\'a pas été sélectionnée. Veuillez réessayer.');
      return;
    }

    if (!stepValidation.dgdiVerified && !stepValidation.dgdiBypassDueToService) {
      setError('Veuillez d\'abord vérifier et valider la pièce d\'identité.');
      return;
    }

    if (!stepValidation.permisVerified) {
      setError('Veuillez d\'abord vérifier et valider le permis.');
      return;
    }

    if (mustFillIdentityBeforeNext) {
      setError('Veuillez renseigner toutes les informations d\'identité avant de continuer.');
      return;
    }
    
    onNext();
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Étape 2 : Numéro de permis
      </Typography>
     

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <NumeroPermisStep
          numeroPermisParts={numeroPermisParts}
          isFicheEnregistre={isFicheEnregistre}
          loading={false}
          format={permisFormat}
          availableCategories={availableCategories}
          onNumeroPermisPartsChange={setNumeroPermisParts}
          onFormatChange={setPermisFormat}
          verifyingPermis={verifyingPermisPrincipal}
          permisVerified={permisPrincipalVerified}
          verificationError={verificationErrorPrincipal}
          candidatNonTrouve={candidatNonTrouvePrincipal}
          personneData={personneData}
          candidatData={candidatData}
          onValidationStateChange={setStepValidation}
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
          onVerifyPermis={handleVerifyPermisPrincipal}
          onVerifyPermisByIdentity={handleVerifyPermisByIdentity}
          identitySearchNomForRefinement={identitySearchNomForRefinement}
          onClearIdentitySearchRefinement={clearIdentitySearchRefinement}
          permisListForSelection={permisListForModal}
          numPermisRecherche={buildNumeroPermis(numeroPermisParts, permisFormat)}
          onPermisSelectionConfirm={handlePermisSelectionConfirm}
          onPermisSelectionClose={handlePermisSelectionClose}
          persistedNumeroPermisDgdi={{
            verified: numeroPermisDgdiVerified,
            bypass: numeroPermisDgdiBypass,
          }}
          onPersistNumeroPermisDgdi={persistNumeroPermisDgdi}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={onBack}
        >
          Retour
        </Button>
        <Button
          variant="contained"
          endIcon={<ArrowForward />}
          onClick={handleNext}
          disabled={verifyingPermisPrincipal || mustCompleteAllChecksBeforeNext}
        >
          Suivant
        </Button>
      </Box>
    </Box>
  );
};

export default NumeroPermisPage;

