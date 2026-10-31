import { useState } from 'react';
import toast from 'react-hot-toast';
import axiosClient from '../../../shared/utils/axiosConfig';
import { EtapeCircuit, CircuitSuivi, circuitSuiviService } from '../services/circuit-suivi.service';
import { getNextEtape } from '../utils/etapeHelpers';
import { ROUTES } from '../../../shared/constants';

// Type pour la fonction callback d'ouverture du modal
export type OpenDateExamenDialogCallback = (onConfirm: (dateExamen: string) => Promise<void>) => void;

/** Infos candidat envoyées au backend pour la création de programme-session (évite "email on null") */
export interface CandidatForProgrammeSession {
  email?: string | null;
  personne_id?: string | null;
  candidat_id?: string | null;
}

export const useEtapeTransmission = (
  circuit: CircuitSuivi | null,
  dossierId?: string,
  onDocumentUploaded?: () => void,
  markEtapeAsCompleted?: (etapeId: string) => void,
  openDateExamenDialog?: OpenDateExamenDialogCallback,
  candidatForProgrammeSession?: CandidatForProgrammeSession | null,
  onDossierStatutUpdated?: () => void | Promise<void>
) => {
  const [transmittingEtape, setTransmittingEtape] = useState<string | null>(null);

  const handleCompleteLastEtape = async (etape: EtapeCircuit) => {
    if (!circuit || !circuit.id || !dossierId) {
      console.error('❌ Données manquantes pour finaliser l\'étape');
      return;
    }

    try {
      setTransmittingEtape(etape.id);
      console.log('📤 Finalisation de la dernière étape...', {
        currentEtape: etape.libelle,
        etapeId: etape.id
      });

      // Marquer l'étape actuelle comme complétée (sans ajouter " - Complété" au libellé)
      const statutLibelle = etape.libelle || '';
      if (etape.statut_id) {
        try {
          const completedPayload = {
            libelle: statutLibelle,
            annulable: false,
            final: true
          };

          try {
            await axiosClient.patch(`/workflow/statuts/${etape.statut_id}`, completedPayload);
            console.log('✅ Statut de la dernière étape mis à jour comme complété');
          } catch (completedError: any) {
            console.warn('⚠️ Impossible de mettre à jour le statut:', completedError);
            try {
              await axiosClient.put(`/workflow/statuts/${etape.statut_id}`, completedPayload);
              console.log('✅ Statut mis à jour (PUT)');
            } catch (putError: any) {
              console.warn('⚠️ Impossible de mettre à jour le statut avec PUT:', putError);
            }
          }
        } catch (err: any) {
          console.warn('⚠️ Erreur lors du marquage:', err);
        }
      }

      // Statut du dossier : on envoie le libellé de l’étape complétée (string). Le backend doit l’accepter dans UpdateDossierRequest (règle statut => string).
      try {
        await circuitSuiviService.updateDossierStatut(dossierId, statutLibelle, { asStatutId: false });
      } catch (dossierErr: any) {
        console.warn('⚠️ Impossible de mettre à jour le statut du dossier:', dossierErr);
        const msg = dossierErr?.response?.data?.message || dossierErr?.message || 'Statut dossier non mis à jour';
        toast.error(`Statut du dossier: ${msg}`, { position: 'bottom-right', duration: 5000 });
      }

      if (markEtapeAsCompleted) {
        markEtapeAsCompleted(etape.id);
        console.log('✅ Dernière étape marquée comme complétée:', etape.id);
      }

      // IMPORTANT: Vider le cache du circuit pour forcer le rechargement avec les nouveaux statuts
      circuitSuiviService.clearCache();
      console.log('🗑️ Cache du circuit vidé pour forcer le rechargement (dernière étape)');

      if (onDocumentUploaded) {
        await onDocumentUploaded();
        // Attendre un peu pour laisser le temps au backend de mettre à jour le statut
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Recharger à nouveau pour récupérer le circuit mis à jour avec le nouveau statut_libelle
        await onDocumentUploaded();
      }

      // Émettre un événement pour déclencher le rechargement du circuit
      window.dispatchEvent(new CustomEvent('circuitReload', {
        detail: { dossierId, circuitId: circuit.id }
      }));

      if (onDossierStatutUpdated) {
        await new Promise(r => setTimeout(r, 400));
        await onDossierStatutUpdated();
      }

      toast.success(`Dernière étape complétée avec succès: ${etape.libelle}`, {
        position: 'bottom-right',
        duration: 4000
      });
    } catch (error: any) {
      console.error('❌ Erreur lors de la finalisation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la finalisation';
      toast.error(`Erreur: ${errorMessage}`, {
        position: 'bottom-right',
        duration: 5000
      });
    } finally {
      setTransmittingEtape(null);
    }
  };

  const handleTransmitToNextEtape = async (etape: EtapeCircuit) => {
    if (!circuit || !circuit.id || !dossierId) {
      console.error('❌ Données manquantes pour transmettre l\'étape');
      return;
    }

    // Même critères que EtapeAccordion : étape "ENVOI (DU/DE) DOSSIER POUR EXAMEN"
    const libelleUpper = etape.libelle?.toUpperCase() ?? '';
    const codeUpper = etape.code?.toUpperCase() ?? '';
    const isEnvoiDossierExamen = libelleUpper.includes('ENVOI DU DOSSIER POUR EXAMEN') ||
                                 libelleUpper.includes('ENVOI DE DOSSIER POUR EXAMEN') ||
                                 libelleUpper.includes('ENVOI DOSSIER POUR EXAMEN') ||
                                 (libelleUpper.includes('ENVOI') && libelleUpper.includes('DOSSIER') && libelleUpper.includes('EXAMEN')) ||
                                 codeUpper.includes('ENVOI_DOSSIER_EXAMEN') ||
                                 codeUpper.includes('ENVOI_DOSSIER') ||
                                 codeUpper.includes('DOSSIER_EXAMEN');

    if (isEnvoiDossierExamen) {
      // Vérifier si un programme session existe déjà pour ce dossier
      try {
        const sessionsResponse = await axiosClient.get('/programme-sessions', {
          params: { dossier_id: dossierId }
        });
        
        const sessions = Array.isArray(sessionsResponse.data?.data) 
          ? sessionsResponse.data.data 
          : (sessionsResponse.data?.data && Array.isArray(sessionsResponse.data.data.data) 
            ? sessionsResponse.data.data.data 
            : []);
        
        // Session existe déjà = l'utilisateur a cliqué "Passer à l'étape suivante" après validation des résultats → compléter l'étape
        if (sessions.length > 0) {
          console.log('✅ Programme session existe déjà, complétion de l\'étape (passage à l\'étape suivante)...');
          // Ne pas return : continuer avec le comportement normal (marquer étape complétée, transition)
        } else {
          // Aucune session = action "Envoyer à l'examen" → uniquement créer la session (ne pas compléter l'étape)
          if (openDateExamenDialog) {
            openDateExamenDialog(async (dateExamen: string) => {
              await createProgrammeSession(etape, dateExamen);
            });
            return;
          }
          await createProgrammeSession(etape, '');
          return;
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification du programme session:', error);
        if (openDateExamenDialog) {
          openDateExamenDialog(async (dateExamen: string) => {
            await createProgrammeSession(etape, dateExamen);
          });
          return;
        }
        await createProgrammeSession(etape, '');
        return;
      }
    }

    // Comportement normal pour les autres étapes
    const nextEtape = getNextEtape(etape, circuit);
    if (!nextEtape) {
      await handleCompleteLastEtape(etape);
      return;
    }

    try {
      setTransmittingEtape(etape.id);
      console.log('📤 Transmission de l\'étape vers l\'étape suivante...', {
        currentEtape: etape.libelle,
        nextEtape: nextEtape.libelle
      });

      // Priorité : API dédiée /workflow/etapes/transmettre (gère l'ordre des étapes, y compris après ajout d'une étape)
      let transmitted = false;
      try {
        await circuitSuiviService.transmettreEtape(etape.id, circuit.id, dossierId);
        transmitted = true;
        console.log('✅ Transmission via API etapes/transmettre');
      } catch (apiErr: any) {
        console.warn('⚠️ API transmettre échouée, repli sur mise à jour des statuts:', apiErr?.response?.status, apiErr?.message);
      }

      if (!transmitted) {
        if (!nextEtape.statut_id) {
          toast.error('Impossible de passer à l\'étape suivante: statut manquant', {
            position: 'bottom-right',
            duration: 4000
          });
          setTransmittingEtape(null);
          return;
        }
        const statutId = nextEtape.statut_id;
        // Ne pas envoyer "code" : contrainte unique statuts_code_unique, un autre statut peut déjà avoir ce code
        const payload = {
          libelle: nextEtape.statut_libelle || nextEtape.libelle || '',
          annulable: true,
          final: false
        };
        try {
          await axiosClient.put(`/workflow/statuts/${statutId}`, payload);
        } catch (putError: any) {
          if (putError.response?.status === 405 || putError.response?.status === 404 || putError.response?.status === 500) {
            await axiosClient.patch(`/workflow/statuts/${statutId}`, payload);
          } else {
            throw putError;
          }
        }
        if (etape.statut_id) {
          const completedPayload = {
            libelle: etape.libelle || '',
            annulable: false,
            final: false
          };
          try {
            await axiosClient.patch(`/workflow/statuts/${etape.statut_id}`, completedPayload);
          } catch {
            try {
              await axiosClient.put(`/workflow/statuts/${etape.statut_id}`, completedPayload);
            } catch {
              // ignoré
            }
          }
        }
      }

      const statutLibelle = nextEtape.libelle || etape.libelle || '';
      // Statut du dossier : on envoie le libellé de l’étape complétée (string). Le backend doit l’accepter dans UpdateDossierRequest (règle statut => string).
      try {
        await circuitSuiviService.updateDossierStatut(dossierId, statutLibelle, { asStatutId: false });
      } catch (dossierErr: any) {
        console.warn('⚠️ Impossible de mettre à jour le statut du dossier:', dossierErr);
        const msg = dossierErr?.response?.data?.message || dossierErr?.message || 'Statut dossier non mis à jour';
        toast.error(`Statut du dossier: ${msg}`, { position: 'bottom-right', duration: 5000 });
      }

      if (markEtapeAsCompleted) {
        markEtapeAsCompleted(etape.id);
        console.log('✅ Étape marquée comme complétée:', etape.id);
      }

      // IMPORTANT: Vider le cache du circuit pour forcer le rechargement avec les nouveaux statuts
      circuitSuiviService.clearCache();
      console.log('🗑️ Cache du circuit vidé pour forcer le rechargement');

      if (onDocumentUploaded) {
        await onDocumentUploaded();
        // Attendre un peu pour laisser le temps au backend de mettre à jour le statut
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Recharger à nouveau pour récupérer le circuit mis à jour avec le nouveau statut_libelle
        await onDocumentUploaded();
      }

      // Émettre un événement pour déclencher le rechargement du circuit
      window.dispatchEvent(new CustomEvent('circuitReload', {
        detail: { dossierId, circuitId: circuit.id }
      }));

      if (onDossierStatutUpdated) {
        await new Promise(r => setTimeout(r, 400));
        await onDossierStatutUpdated();
      }

      toast.success(`Étape transmise avec succès. Passage à l'étape: ${nextEtape.libelle}`, {
        position: 'bottom-right',
        duration: 4000
      });
    } catch (error: any) {
      console.error('❌ Erreur lors de la transmission:', error);
      let errorMessage = 'Erreur lors de la transmission';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.response?.data?.errors) {
        const validationErrors = Object.entries(error.response.data.errors)
          .map(([field, messages]: [string, any]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        errorMessage += ` (${validationErrors})`;
      }
      
      toast.error(`Erreur: ${errorMessage}`, {
        position: 'bottom-right',
        duration: 5000
      });
    } finally {
      setTransmittingEtape(null);
    }
  };

  const createProgrammeSession = async (etape: EtapeCircuit, dateExamen: string) => {
    if (!circuit || !circuit.id || !dossierId) {
      console.error('❌ Données manquantes pour créer le programme session');
      return;
    }

    if (!dateExamen) {
      toast.error('La date d\'examen est obligatoire', {
        position: 'bottom-right',
        duration: 4000
      });
      return;
    }

    try {
      setTransmittingEtape(etape.id);
      console.log('📤 Création du programme session pour l\'étape ENVOI DU DOSSIER POUR EXAMEN...', {
        etapeId: etape.id,
        etapeLibelle: etape.libelle,
        dossierId,
        dateExamen
      });

      // Formater la date au format attendu par l'API
      // Utiliser le format ISO 8601 comme dans les autres parties du code (EleveInscritDetailsPage, EleveDetailsSheet)
      let formattedDateExamen = dateExamen;
      if (dateExamen && dateExamen.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Créer un objet Date et le formater en ISO 8601
        const dateObj = new Date(dateExamen);
        dateObj.setHours(8, 0, 0, 0); // 08:00:00
        formattedDateExamen = dateObj.toISOString();
        
        console.log('📅 Formatage de la date:', {
          original: dateExamen,
          dateObj: dateObj,
          isoString: formattedDateExamen
        });
      }

      // Le backend fait Dossier::find()->candidat_id puis Candidat::find(). Si le dossier n'a pas
      // candidat_id en base, $candidat est null et l'erreur "email on null" survient. On s'assure
      // que le dossier est lié au candidat avant d'appeler l'API (PATCH accepte candidat_id).
      if (candidatForProgrammeSession?.candidat_id) {
        try {
          await axiosClient.patch(`/dossiers/${dossierId}`, {
            candidat_id: candidatForProgrammeSession.candidat_id
          });
        } catch (patchErr: unknown) {
          console.warn('⚠️ PATCH dossier (candidat_id) ignoré:', patchErr);
        }
      }

      // API attend uniquement dossier_id et date_examen (ISO 8601)
      const payload = {
        dossier_id: dossierId,
        date_examen: formattedDateExamen
      };

      console.log('📤 Payload envoyé à l\'API /programme-sessions:', payload);

      const response = await axiosClient.post('/programme-sessions', payload);

      if (response.data?.success || response.data?.programme_session) {
        console.log('✅ Programme session créé avec succès:', response.data);

        // NE PAS marquer l'étape comme complétée automatiquement après la création du programme session
        // L'étape doit rester en "attente des résultats" jusqu'à ce que les résultats soient validés
        // et que l'utilisateur clique sur "Passer à l'étape suivante"
        // Le statut de l'étape sera mis à jour uniquement quand l'utilisateur clique sur "Passer à l'étape suivante"

        if (onDocumentUploaded) {
          await onDocumentUploaded();
        }

        // Émettre un événement pour déclencher le rechargement du circuit
        window.dispatchEvent(new CustomEvent('circuitReload', {
          detail: { dossierId, circuitId: circuit.id }
        }));

        if (onDossierStatutUpdated) {
          await new Promise(r => setTimeout(r, 400));
          await onDossierStatutUpdated();
        }

        // Émettre un événement pour indiquer que le programme session a été créé
        window.dispatchEvent(new CustomEvent('programmeSessionCreated', {
          detail: {
            etapeId: etape.id,
            circuitId: circuit.id,
            dossierId,
            programmeSession: response.data?.programme_session || response.data?.data
          }
        }));

        toast.success('Dossier envoyé à l\'examen avec succès ! Vous pouvez maintenant passer à l\'étape suivante une fois les résultats validés.', {
          position: 'bottom-right',
          duration: 5000
        });
      } else {
        throw new Error('Format de réponse inattendu');
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la création du programme session:', error);
      
      // Afficher tous les détails de l'erreur
      const errorDetails: any = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        request: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
          headers: error.config?.headers
        }
      };
      
      // Afficher le contenu complet de la réponse
      if (error.response?.data) {
        errorDetails.responseData = error.response.data;
        console.error('❌ Contenu complet de la réponse d\'erreur:', JSON.stringify(error.response.data, null, 2));
      }
      
      console.error('❌ Détails de l\'erreur:', errorDetails);
      
      let errorMessage = 'Erreur lors de la création du programme session';
      
      // Gestion des erreurs détaillée
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Message principal
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        // Analyser l'erreur spécifique
        if (errorData.error && typeof errorData.error === 'string') {
          // Si l'erreur mentionne "email" sur null, c'est un bug backend connu
          if (errorData.error.includes('email') && errorData.error.includes('null')) {
            errorMessage = 'Erreur serveur : Problème de chargement des données du dossier.\n\n' +
                          'Le serveur n\'arrive pas à charger les relations du dossier (candidat, personne, email).\n\n' +
                          'Ceci est un problème technique côté serveur. Veuillez :\n' +
                          '1. Vérifier que le dossier a bien un candidat et une personne associés\n' +
                          '2. Recharger la page et réessayer\n' +
                          '3. Si le problème persiste, contacter l\'administrateur système\n\n' +
                          'Note : Le format de la requête est correct, le problème vient du traitement côté serveur.';
          } else {
            errorMessage = errorData.error;
          }
        }
        
        // Erreurs de validation
        if (errorData.errors) {
          const validationErrors = Object.entries(errorData.errors)
            .map(([field, messages]: [string, any]) => {
              const fieldLabel = field === 'date_examen' ? 'Date d\'examen' : field;
              return `${fieldLabel}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
            })
            .join('\n');
          errorMessage += `\n\nErreurs de validation:\n${validationErrors}`;
        }
        
        // Détails supplémentaires pour les erreurs 500
        if (error.response.status === 500) {
          if (!errorMessage.includes('Données du dossier incomplètes')) {
            errorMessage += '\n\nErreur serveur (500). Veuillez vérifier les logs du serveur ou contacter l\'administrateur.';
          }
          if (errorData.exception || errorData.trace) {
            console.error('❌ Détails techniques de l\'erreur serveur:', {
              exception: errorData.exception,
              trace: errorData.trace
            });
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Afficher l'erreur dans un toast avec plus de détails
      toast.error(`Erreur: ${errorMessage}\n\nCode d'erreur: ${error.response?.status || 'N/A'}`, {
        position: 'bottom-right',
        duration: 6000
      });
      
      throw error; // Re-lancer pour que le modal puisse gérer l'erreur
    } finally {
      setTransmittingEtape(null);
    }
  };

  return {
    transmittingEtape,
    handleCompleteLastEtape,
    handleTransmitToNextEtape
  };
};

