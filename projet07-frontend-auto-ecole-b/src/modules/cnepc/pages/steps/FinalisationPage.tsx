import React, { useCallback, useEffect, useMemo } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCreateDossier } from '../../contexts/CreateDossierContext';
import { FinalisationStep } from '../../forms/steps';
import { useReferentiels, useAgentLieuExamen } from '../../forms/hooks';
import { validateDossierCreationReadiness } from '../../forms/dossierCreationReadiness';
import { autoEcoleService, type AutoEcole } from '../../services';

interface FinalisationPageProps {
  onBack: () => void;
}

const FinalisationPage: React.FC<FinalisationPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const {
    candidatId,
    typeDemandeId,
    isNouveauPermis,
    isFicheEnregistre,
    selectedTypeDemande,
    permisData,
    numeroPermis,
    numeroPermisParts,
    permisFormat,
    numeroOriginePermisParts,
    permisOrigineFormat,
    permisBOrigineData,
    numeroBOriginePermisParts,
    permisBOrigineFormat,
    selectedAutoEcole,
    formationData,
    lieuExamenData,
    setLieuExamenData,
    dataCategorie,
    setLoading,
    setError,
    setSuccess,
    setFormationData,
    setSelectedAutoEcole,
    setAutoEcoleId,
    autoEcoleId,
    error,
    success,
    loading,
    resetForm,
    isPreviewMode,
  } = useCreateDossier();

  const { referentiels, loading: loadingReferentiels, loadReferentiels } = useReferentiels();
  const {
    lieu: agentLieu,
    labels: agentLieuLabels,
    loading: agentLieuLoading,
    error: agentLieuError,
  } = useAgentLieuExamen();

  useEffect(() => {
    if (isPreviewMode) return;
    setLieuExamenData({
      province_id: agentLieu.province_id,
      centre_id: agentLieu.centre_id,
    });
  }, [agentLieu.province_id, agentLieu.centre_id, isPreviewMode, setLieuExamenData]);

  const selectedReferentiel = useMemo(() => {
    const id = formationData.referenciel_id?.trim();
    if (!id) return null;
    const r = referentiels.find((ref) => ref.id === id);
    return r ? { libelle: r.libelle, code: r.code } : null;
  }, [referentiels, formationData.referenciel_id]);

  const readinessInput = useMemo(
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
      formations: [],
      lieuExamenData,
      dataCategorie,
      selectedReferentiel,
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
      lieuExamenData,
      dataCategorie,
      selectedReferentiel,
    ]
  );

  const getReadinessErrors = useCallback(
    () => validateDossierCreationReadiness(readinessInput),
    [readinessInput]
  );

  React.useEffect(() => {
    if (!isPreviewMode) loadReferentiels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewMode]);

  const handleCnepcAutoEcoleChange = useCallback(
    (id: string) => {
      setAutoEcoleId(id);
      setFormationData((prev) => ({ ...prev, formation_id: '' }));
      if (!id) {
        setSelectedAutoEcole(null);
        return;
      }
      void autoEcoleService.getCnepcAutoEcole().then((bundle) => {
        if (bundle?.autoEcole.id === id) {
          setSelectedAutoEcole(bundle.autoEcole);
        } else {
          setSelectedAutoEcole({ id, nom_auto_ecole: 'CNEPC' } as AutoEcole);
        }
      });
    },
    [setAutoEcoleId, setSelectedAutoEcole, setFormationData]
  );

  useEffect(() => {
    if (isNouveauPermis || !autoEcoleId?.trim()) return;
    let cancelled = false;
    void autoEcoleService.getCnepcAutoEcole().then((bundle) => {
      if (cancelled || !bundle || bundle.autoEcole.id !== autoEcoleId) return;
      setSelectedAutoEcole(bundle.autoEcole);
    });
    return () => {
      cancelled = true;
    };
  }, [autoEcoleId, isNouveauPermis, setSelectedAutoEcole]);

  const handleCnepcFormationChange = useCallback(
    (formationId: string) => {
      setFormationData((prev) => ({ ...prev, formation_id: formationId }));
    },
    [setFormationData]
  );

  const handleSubmit = async () => {
    if (!candidatId) {
      setError('Erreur: Candidat non créé');
      return;
    }

    const readiness = validateDossierCreationReadiness(readinessInput);
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
        // Numéro de permis principal (stocké sans tirets depuis NumeroPermisPage / PermisInfoPage)
        const numPermis = permisData.numero_permis || numeroPermis;
        if (numPermis && numPermis.trim() !== '') {
          dossierPayload.numero_permis = numPermis.trim();
        }
        // Numéro d'origine (PermisBOriginePage, permis B d'origine pour formation C) : ne pas écraser avec le numéro principal
        if (permisData.numero_origine_permis && permisData.numero_origine_permis.trim() !== '') {
          dossierPayload.numero_origine_permis = permisData.numero_origine_permis.trim();
        }
        
        if (permisData.lieu_de_dobtention_du_permis && permisData.lieu_de_dobtention_du_permis.trim() !== '') {
          dossierPayload.lieu_de_dobtention_du_permis = permisData.lieu_de_dobtention_du_permis;
        }
        
        if (permisData.date_de_dobtention_du_permis) {
          const dateObtention = new Date(permisData.date_de_dobtention_du_permis);
          dossierPayload.date_de_dobtention_du_permis = dateObtention.toISOString();
        }
        
        if (permisData.date_de_delivrance_du_permis) {
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
        dossierPayload.auto_ecole_id = selectedAutoEcole.id;
        dossierPayload.formation_id = formationData.formation_id;
        
        // Si la formation est de type C, ajouter les informations du permis B d'origine
        // Cette logique sera gérée dans le contexte
      }

      if (permisData.date_expiration) {
        dossierPayload.date_expiration = new Date(permisData.date_expiration).toISOString();
      }
      if (permisData.code_paiement != null && permisData.code_paiement !== '') {
        dossierPayload.code_paiement = permisData.code_paiement;
      }

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

      console.log('[Création dossier] JSON complet du dossier envoyé:', JSON.stringify(dossierPayload, null, 2));
      
      const response = await autoEcoleService.createDossier(dossierPayload);

      setSuccess(response.message || 'Dossier créé avec succès !');
      
      setTimeout(() => {
        resetForm();
        navigate('/gestion-dossier');
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

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Finalisation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Vérifiez les informations et finalisez la création du dossier
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
          {success}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <FinalisationStep
          formationData={formationData}
          referentiels={referentiels}
          loadingReferentiels={loadingReferentiels}
          loading={loading}
          onFormationDataChange={setFormationData}
          onSubmit={handleSubmit}
          onBack={onBack}
          error={error}
          getReadinessErrors={getReadinessErrors}
          referencielRequired
          dossierLieuFromAgent
          agentLieuLabels={agentLieuLabels}
          agentLieuLoading={agentLieuLoading}
          agentLieuError={agentLieuError}
          showCnepcTraining={!isNouveauPermis}
          autoEcoleId={autoEcoleId}
          onAutoEcoleChange={handleCnepcAutoEcoleChange}
          onFormationChange={handleCnepcFormationChange}
        />
      </Box>
    </Box>
  );
};

export default FinalisationPage;

