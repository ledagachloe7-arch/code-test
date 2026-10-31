import { useState, useEffect } from 'react';
import axiosClient from '../../../../shared/utils/axiosConfig';
import { CircuitSuivi, circuitSuiviService } from '../services/circuit-suivi.api';

/** Indique si le statut du dossier signifie "envoyé à la biométrie" (dossier finalisé). Ne pas confondre avec l'étape "ENVOI DE DOSSIER POUR IMPRESSION" qui est avant envoi. */
export const isDossierStatutSentToCNEDDT = (statut: string | null | undefined): boolean => {
  if (!statut || typeof statut !== 'string') return false;
  const upper = statut.toUpperCase();
  return upper.includes('CNEDDT') || upper.includes('DOSSIER ENVOYER');
};

export const useCNEDDTTransfer = (
  dossierId?: string,
  circuit?: CircuitSuivi | null,
  onSendToCNEDDT?: () => void,
  /** Statut du dossier (dernier statut validé). Si il indique "envoyé CNEDDT/impression", le message reste visible. Prioritaire sur localStorage. */
  dossierStatut?: string | null
) => {
  const [sendingToCNEDDT, setSendingToCNEDDT] = useState(false);
  const [localSentToCNEDDT, setLocalSentToCNEDDT] = useState(false);

  // Initialiser depuis localStorage au montage (secours si l'API ne renvoie pas encore le bon statut)
  useEffect(() => {
    if (dossierId) {
      const storageKey = `cneddt_sent_${dossierId}`;
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue === 'true') {
        setLocalSentToCNEDDT(true);
      }
    }
  }, [dossierId]);

  // Affichage du message "envoyé pour impression" : priorité au statut dossier (API), sinon état local (session + localStorage)
  const sentToCNEDDT = isDossierStatutSentToCNEDDT(dossierStatut) || localSentToCNEDDT;

  const handleSendToCNEDDT = async () => {
    if (!dossierId) {
      alert('ID du dossier manquant');
      return;
    }

    let typePermis: string | undefined = undefined;
    let typePermisId: string | undefined = undefined;
    // Déclarer emailToUse, dossierData et payload avant le try pour qu'ils soient accessibles dans le catch
    let emailToUse = 'noreply@permis.transports.gouv.ga';
    let dossierData: any = null;
    let payload: any = null;

    try {
      setSendingToCNEDDT(true);
      console.log('🚚 Envoi du dossier à la CNEDDT:', dossierId);
      
      // Récupérer le dossier complet pour vérifier le type_permis
      try {
        const dossierResponse = await axiosClient.get(`/dossiers/${dossierId}`);
        const dossierData = dossierResponse.data?.data || dossierResponse.data;
        
        console.log('📋 Données du dossier récupérées:', dossierData);
        
        // PRIORITÉ 1: referenciel_id à la racine du dossier (source principale)
        if (dossierData?.referenciel_id) {
          typePermisId = dossierData.referenciel_id;
          console.log('✅ referenciel_id trouvé à la racine du dossier:', typePermisId);
          
          // Charger les détails du référentiel pour obtenir le code/libelle
          try {
            const referentielResponse = await axiosClient.get(`/referentiels/${dossierData.referenciel_id}`);
            if (referentielResponse.data?.data) {
              const referentielData = referentielResponse.data.data;
              typePermis = referentielData.code || referentielData.libelle || referentielData.id;
              console.log('✅ Référentiel chargé:', { id: typePermisId, code: referentielData.code, libelle: referentielData.libelle });
            }
          } catch (err) {
            console.warn('⚠️ Impossible de charger le référentiel:', err);
          }
        } 
        // FALLBACK: Vérifier dans formation.type_permis (ancienne logique pour compatibilité)
        else if (dossierData?.formation?.type_permis) {
          if (typeof dossierData.formation.type_permis === 'object') {
            typePermis = dossierData.formation.type_permis.code || 
                        dossierData.formation.type_permis.libelle || 
                        dossierData.formation.type_permis.id;
            typePermisId = dossierData.formation.type_permis.id;
            console.log('⚠️ Utilisation du type_permis depuis formation (fallback):', typePermisId);
          } else {
            typePermis = dossierData.formation.type_permis;
            console.log('⚠️ Utilisation du type_permis string depuis formation (fallback):', typePermis);
          }
        } else if (dossierData?.formation?.type_permis_id) {
          typePermisId = dossierData.formation.type_permis_id;
          console.log('⚠️ Utilisation du type_permis_id depuis formation (fallback):', typePermisId);
          try {
            const typePermisResponse = await axiosClient.get(`/referentiels/${dossierData.formation.type_permis_id}`);
            if (typePermisResponse.data?.data) {
              const typePermisData = typePermisResponse.data.data;
              typePermis = typePermisData.code || typePermisData.libelle || typePermisData.id;
            }
          } catch (err) {
            console.warn('⚠️ Impossible de charger le type de permis:', err);
          }
        }
      } catch (err) {
        console.warn('⚠️ Impossible de récupérer le dossier complet:', err);
      }
      
      // Si le type_permis n'est pas dans le dossier, utiliser celui du circuit
      if (!typePermis && circuit?.type_permis) {
        typePermis = circuit.type_permis;
        
        if (!typePermisId && typePermis) {
          try {
            const referentielsResponse = await axiosClient.get('/referentiels', {
              params: { 
                type_ref: 'type_permis',
                statut: 'true',
                per_page: 100
              }
            });
            
            let referentiels: any[] = [];
            if (Array.isArray(referentielsResponse.data)) {
              referentiels = referentielsResponse.data;
            } else if (referentielsResponse.data?.data && Array.isArray(referentielsResponse.data.data)) {
              referentiels = referentielsResponse.data.data;
            } else if (referentielsResponse.data?.data?.data && Array.isArray(referentielsResponse.data.data.data)) {
              referentiels = referentielsResponse.data.data.data;
            }
            
            const found = referentiels.find((r: any) => {
              if (!typePermis) return false;
              if (r.libelle && r.libelle.trim().toUpperCase() === typePermis.trim().toUpperCase()) {
                return true;
              }
              if (r.code && r.code.trim().toUpperCase() === typePermis.trim().toUpperCase()) {
                return true;
              }
              if (r.id && r.id.toString() === typePermis.trim()) {
                return true;
              }
              return false;
            });
            
            if (found) {
              typePermisId = found.id?.toString() || found.id;
              console.log('✅ ID du type de permis trouvé:', typePermisId);
            }
          } catch (err) {
            console.warn('⚠️ Impossible de récupérer l\'ID du type de permis:', err);
          }
        }
      }
      
      // Le backend cherche formation.typePermis mais formation est null
      // Il faut mettre à jour le dossier pour ajouter formation.type_permis_id avant l'envoi
      if (!typePermisId) {
        const errorMsg = typePermis 
          ? `Impossible de trouver l'ID du type de permis "${typePermis}" dans les référentiels.`
          : 'Aucun type de permis trouvé dans le dossier ni dans le circuit.';
        
        console.error('❌', errorMsg);
        alert(`Erreur: ${errorMsg}`);
        setSendingToCNEDDT(false);
        return;
      }
      
      // Récupérer le dossier pour vérifier s'il a une formation
      // Essayer d'inclure les relations avec un paramètre de requête
      try {
        // Essayer d'abord avec les relations incluses
        const dossierResponse = await axiosClient.get(`/dossiers/${dossierId}`, {
          params: {
            include: 'auto_ecole,formation,formation.auto_ecole,candidat.personne'
          }
        });
        dossierData = dossierResponse.data?.data || dossierResponse.data;
        console.log('📋 Dossier récupéré avant mise à jour:', dossierData);
        console.log('📋 JSON complet du dossier récupéré:', JSON.stringify(dossierData, null, 2));
        console.log('🔍 Vérification des relations dans le dossier récupéré:', {
          hasAutoEcole: !!dossierData?.auto_ecole,
          hasFormation: !!dossierData?.formation,
          hasFormationAutoEcole: !!dossierData?.formation?.auto_ecole,
          autoEcoleId: dossierData?.auto_ecole_id,
          formationId: dossierData?.formation_id,
          formationAutoEcoleId: dossierData?.formation?.auto_ecole_id,
        });
      } catch (err) {
        // Si ça échoue, essayer sans paramètres
        try {
          const dossierResponse = await axiosClient.get(`/dossiers/${dossierId}`);
          dossierData = dossierResponse.data?.data || dossierResponse.data;
          console.log('📋 Dossier récupéré (sans paramètres include):', dossierData);
        } catch (err2) {
          console.warn('⚠️ Impossible de récupérer le dossier:', err2);
        }
      }
      
      // Mettre à jour le dossier pour s'assurer que formation.type_permis_id est renseigné
      // Le backend lit le dossier depuis la base de données, donc il faut mettre à jour la base
      if (dossierData && typePermisId) {
        try {
          // Si le dossier a une formation_id mais que la formation n'a pas de type_permis_id
          // OU si le dossier a un referenciel_id mais pas de formation_id
          const needsUpdate = 
            (dossierData.formation_id && (!dossierData.formation?.type_permis_id || dossierData.formation?.type_permis_id !== typePermisId)) ||
            (dossierData.referenciel_id && !dossierData.formation_id);
          
          if (needsUpdate) {
            console.log('🔄 Mise à jour du dossier pour ajouter type_permis_id à la formation...');
            
            // Si le dossier n'a pas de formation_id, chercher une formation existante correspondante
            if (!dossierData.formation_id) {
              try {
                console.log('🔍 Recherche d\'une formation correspondante...');
                
                // Récupérer toutes les formations
                const formationsResponse = await axiosClient.get('/formations', {
                  params: {
                    per_page: 1000, // Récupérer un grand nombre de formations
                    statut: 'true', // Seulement les formations actives
                  }
                });
                
                // Extraire la liste des formations depuis la réponse
                let formations: any[] = [];
                if (Array.isArray(formationsResponse.data)) {
                  formations = formationsResponse.data;
                } else if (formationsResponse.data?.data && Array.isArray(formationsResponse.data.data)) {
                  formations = formationsResponse.data.data;
                } else if (formationsResponse.data?.data?.data && Array.isArray(formationsResponse.data.data.data)) {
                  formations = formationsResponse.data.data.data;
                }
                
                console.log(`📋 ${formations.length} formation(s) récupérée(s)`);
                
                // Filtrer les formations dont le type_permis_id correspond au referenciel_id
                const matchingFormations = formations.filter((formation: any) => {
                  const formationTypePermisId = formation.type_permis_id || formation.type_permis?.id;
                  return formationTypePermisId === typePermisId;
                });
                
                console.log(`✅ ${matchingFormations.length} formation(s) correspondante(s) trouvée(s) pour le type de permis ${typePermisId}`);
                
                if (matchingFormations.length > 0) {
                  // Choisir une formation au hasard parmi celles qui correspondent
                  const randomIndex = Math.floor(Math.random() * matchingFormations.length);
                  const selectedFormation = matchingFormations[randomIndex];
                  
                  const selectedFormationId = selectedFormation.id;
                  const selectedAutoEcoleId = selectedFormation.auto_ecole_id || selectedFormation.auto_ecole?.id;
                  
                  console.log('🎲 Formation sélectionnée aléatoirement:', {
                    id: selectedFormationId,
                    auto_ecole_id: selectedAutoEcoleId,
                    type_permis_id: selectedFormation.type_permis_id || selectedFormation.type_permis?.id,
                  });
                  
                  // Mettre à jour le dossier avec la formation_id et l'auto_ecole_id
                  const updatePayload: any = {
                    formation_id: selectedFormationId,
                    referenciel_id: typePermisId,
                  };
                  
                  // Ajouter auto_ecole_id si le dossier n'en a pas
                  if (!dossierData.auto_ecole_id && selectedAutoEcoleId) {
                    updatePayload.auto_ecole_id = selectedAutoEcoleId;
                    console.log('✅ Auto-école associée à la formation:', selectedAutoEcoleId);
                  }
                  
                  await axiosClient.put(`/dossiers/${dossierId}`, updatePayload);
                  console.log('✅ Dossier mis à jour avec formation_id:', selectedFormationId);
                  
                  // Recharger le dossier pour avoir les données à jour
                  const updatedResponse = await axiosClient.get(`/dossiers/${dossierId}`);
                  dossierData = updatedResponse.data?.data || updatedResponse.data;
                } else {
                  console.warn('⚠️ Aucune formation trouvée correspondant au type de permis:', typePermisId);
                }
              } catch (formationsError: any) {
                console.warn('⚠️ Erreur lors de la recherche de formations:', formationsError);
                // Continuer quand même, on essaiera de mettre à jour le dossier
              }
            } else {
              // Si le dossier a une formation_id, mettre à jour la formation
              try {
                // Récupérer la formation pour vérifier qu'elle a un auto_ecole_id
                const formationResponse = await axiosClient.get(`/formations/${dossierData.formation_id}`);
                const formationData = formationResponse.data?.data || formationResponse.data;
                
                // Mettre à jour la formation avec type_permis_id
                await axiosClient.put(`/formations/${dossierData.formation_id}`, {
                  type_permis_id: typePermisId,
                });
                console.log('✅ Formation mise à jour avec type_permis_id:', typePermisId);
                
                // Si le dossier n'a pas d'auto_ecole_id mais que la formation en a un, l'ajouter au dossier
                if (!dossierData.auto_ecole_id && formationData?.auto_ecole_id) {
                  try {
                    await axiosClient.put(`/dossiers/${dossierId}`, {
                      auto_ecole_id: formationData.auto_ecole_id,
                      referenciel_id: typePermisId,
                    });
                    console.log('✅ Dossier mis à jour avec auto_ecole_id de la formation:', formationData.auto_ecole_id);
                  } catch (err) {
                    console.warn('⚠️ Impossible de mettre à jour le dossier avec auto_ecole_id:', err);
                  }
                }
              } catch (formationError: any) {
                console.warn('⚠️ Impossible de mettre à jour la formation:', formationError);
              }
            }
            
            // Mettre à jour le dossier pour s'assurer que referenciel_id est présent
            try {
              const updateData: any = {
                referenciel_id: typePermisId,
              };
              
              // Si le dossier n'a toujours pas d'auto_ecole_id, essayer de le récupérer depuis la formation
              if (!dossierData.auto_ecole_id && dossierData.formation_id) {
                try {
                  const formationResponse = await axiosClient.get(`/formations/${dossierData.formation_id}`);
                  const formationData = formationResponse.data?.data || formationResponse.data;
                  if (formationData?.auto_ecole_id) {
                    updateData.auto_ecole_id = formationData.auto_ecole_id;
                    console.log('✅ Auto-école récupérée depuis la formation:', formationData.auto_ecole_id);
                  }
                } catch (err) {
                  console.warn('⚠️ Impossible de récupérer l\'auto-école depuis la formation:', err);
                }
              }
              
              await axiosClient.put(`/dossiers/${dossierId}`, updateData);
              console.log('✅ Dossier mis à jour avec referenciel_id:', typePermisId);
              
              // Recharger le dossier pour avoir les données à jour
              const updatedResponse = await axiosClient.get(`/dossiers/${dossierId}`);
              dossierData = updatedResponse.data?.data || updatedResponse.data;
              console.log('📋 Dossier rechargé après mise à jour:', {
                hasAutoEcole: !!dossierData?.auto_ecole,
                hasFormation: !!dossierData?.formation,
                hasFormationAutoEcole: !!dossierData?.formation?.auto_ecole,
                autoEcoleId: dossierData?.auto_ecole_id,
                formationId: dossierData?.formation_id,
                formationAutoEcoleId: dossierData?.formation?.auto_ecole_id,
              });
            } catch (dossierError: any) {
              console.warn('⚠️ Impossible de mettre à jour le dossier:', dossierError);
              // Continuer quand même, on enverra le payload avec les bonnes données
            }
          }
        } catch (updateError: any) {
          console.warn('⚠️ Erreur lors de la mise à jour du dossier:', updateError);
          // Continuer quand même, on enverra le payload avec les bonnes données
        }
      }
      
      // Vérifier que le dossier a bien auto_ecole et formation chargés
      // Le backend a besoin de ces relations pour accéder à l'email
      if (dossierData) {
        // Si auto_ecole n'est pas chargé mais auto_ecole_id existe, le charger
        if (!dossierData.auto_ecole && dossierData.auto_ecole_id) {
          try {
            console.log('🔍 Chargement de l\'auto-école manquante...');
            const autoEcoleResponse = await axiosClient.get(`/auto-ecoles/${dossierData.auto_ecole_id}`);
            dossierData.auto_ecole = autoEcoleResponse.data?.data || autoEcoleResponse.data;
            console.log('✅ Auto-école chargée:', dossierData.auto_ecole?.nom_auto_ecole);
          } catch (err) {
            console.warn('⚠️ Impossible de charger l\'auto-école:', err);
          }
        }
        
        // Si formation n'est pas chargée mais formation_id existe, la charger depuis /formations/{id}
        // Cet endpoint retourne formation.auto_ecole avec l'email (selon la documentation API)
        if (!dossierData.formation && dossierData.formation_id) {
          try {
            console.log('🔍 Chargement de la formation manquante depuis /formations/{id}...');
            const formationResponse = await axiosClient.get(`/formations/${dossierData.formation_id}`);
            dossierData.formation = formationResponse.data?.data || formationResponse.data;
            console.log('✅ Formation chargée:', dossierData.formation?.id);
            console.log('✅ Formation.auto_ecole chargé:', !!dossierData.formation?.auto_ecole);
            console.log('✅ Formation.auto_ecole.email:', dossierData.formation?.auto_ecole?.email);
          } catch (err) {
            console.warn('⚠️ Impossible de charger la formation:', err);
          }
        }
        
        // Toujours vérifier et charger formation.auto_ecole si nécessaire
        // L'endpoint /formations/{id} devrait retourner formation.auto_ecole avec email
        // Mais si ce n'est pas le cas, charger depuis /auto-ecoles/{id}
        if (dossierData.formation) {
          console.log('🔍 Vérification formation.auto_ecole:', {
            hasFormation: !!dossierData.formation,
            hasFormationAutoEcole: !!dossierData.formation.auto_ecole,
            hasFormationAutoEcoleEmail: !!dossierData.formation.auto_ecole?.email,
            formationAutoEcoleId: dossierData.formation.auto_ecole_id,
            dossierAutoEcoleId: dossierData.auto_ecole_id,
          });
          
          // Si formation.auto_ecole n'est pas chargé, le charger depuis /formations/{id}
          // ou depuis /auto-ecoles/{id} si nécessaire
          if (!dossierData.formation.auto_ecole || !dossierData.formation.auto_ecole.email) {
            // Essayer de recharger la formation complète depuis /formations/{id}
            // qui devrait retourner formation.auto_ecole avec email
            if (dossierData.formation_id) {
              try {
                console.log('🔍 Rechargement de la formation complète depuis /formations/{id} pour obtenir auto_ecole...');
                const formationResponse = await axiosClient.get(`/formations/${dossierData.formation_id}`);
                const fullFormation = formationResponse.data?.data || formationResponse.data;
                if (fullFormation?.auto_ecole) {
                  dossierData.formation.auto_ecole = fullFormation.auto_ecole;
                  console.log('✅ Formation.auto_ecole chargé depuis /formations/{id}:', {
                    id: dossierData.formation.auto_ecole?.id,
                    nom: dossierData.formation.auto_ecole?.nom_auto_ecole,
                    email: dossierData.formation.auto_ecole?.email,
                  });
                }
              } catch (err: any) {
                console.warn('⚠️ Impossible de recharger la formation complète:', err);
              }
            }
            
            // Si toujours pas d'auto_ecole, charger depuis /auto-ecoles/{id}
            if (!dossierData.formation.auto_ecole || !dossierData.formation.auto_ecole.email) {
              const formationAutoEcoleId = dossierData.formation.auto_ecole_id || 
                                          dossierData.formation.auto_ecole?.id ||
                                          dossierData.auto_ecole_id;
              
              console.log('🔍 Tentative de chargement de l\'auto-école de la formation avec ID:', formationAutoEcoleId);
              
              if (formationAutoEcoleId) {
                try {
                  const formationAutoEcoleResponse = await axiosClient.get(`/auto-ecoles/${formationAutoEcoleId}`);
                  dossierData.formation.auto_ecole = formationAutoEcoleResponse.data?.data || formationAutoEcoleResponse.data;
                  console.log('✅ Auto-école de la formation chargée depuis /auto-ecoles/{id}:', {
                    id: dossierData.formation.auto_ecole?.id,
                    nom: dossierData.formation.auto_ecole?.nom_auto_ecole,
                    email: dossierData.formation.auto_ecole?.email,
                  });
                } catch (err: any) {
                  console.warn('⚠️ Impossible de charger l\'auto-école de la formation:', err);
                  console.warn('⚠️ Détails de l\'erreur:', err.response?.data || err.message);
                }
              } else {
                console.warn('⚠️ Aucun auto_ecole_id trouvé pour la formation');
              }
            }
          } else {
            console.log('✅ formation.auto_ecole déjà chargé avec email:', dossierData.formation.auto_ecole?.email);
          }
        }
        
        // Vérifier que candidat.personne est chargé (pour l'email)
        if (dossierData.candidat && !dossierData.candidat.personne && dossierData.candidat.personne_id) {
          try {
            console.log('🔍 Chargement de la personne du candidat...');
            const personneResponse = await axiosClient.get(`/personnes/${dossierData.candidat.personne_id}`);
            dossierData.candidat.personne = personneResponse.data?.data || personneResponse.data;
            console.log('✅ Personne chargée:', dossierData.candidat.personne?.email);
          } catch (err) {
            console.warn('⚠️ Impossible de charger la personne:', err);
          }
        }
      }
      
      // Déterminer l'email à utiliser (priorité: auto_ecole > formation.auto_ecole > email par défaut)
      // L'email se trouve dans les données de l'auto-école directement, pas dans formation->auto_ecole
      // emailToUse est déjà déclaré avant le try
      let autoEcoleForEmail: any = null;
      
      // PRIORITÉ 1: auto_ecole directement (l'email est ici)
      if (dossierData?.auto_ecole?.email) {
        emailToUse = dossierData.auto_ecole.email;
        autoEcoleForEmail = dossierData.auto_ecole;
        console.log('✅ Email trouvé dans auto_ecole:', emailToUse);
      } 
      // PRIORITÉ 2: formation.auto_ecole (fallback)
      else if (dossierData?.formation?.auto_ecole?.email) {
        emailToUse = dossierData.formation.auto_ecole.email;
        autoEcoleForEmail = dossierData.formation.auto_ecole;
        console.log('✅ Email trouvé dans formation.auto_ecole:', emailToUse);
      } 
      // PRIORITÉ 3: Charger l'auto-école depuis l'ID
      else if (dossierData?.auto_ecole_id) {
        try {
          const autoEcoleResponse = await axiosClient.get(`/auto-ecoles/${dossierData.auto_ecole_id}`);
          autoEcoleForEmail = autoEcoleResponse.data?.data || autoEcoleResponse.data;
          if (autoEcoleForEmail?.email) {
            emailToUse = autoEcoleForEmail.email;
            console.log('✅ Email chargé depuis auto_ecole_id:', emailToUse);
          }
        } catch (err) {
          console.warn('⚠️ Impossible de charger l\'auto-école pour obtenir l\'email, utilisation de l\'email par défaut:', err);
        }
      }
      
      console.log('📧 Email à utiliser (pour référence):', emailToUse);
      
      // Email et personne : l'email est optionnel pour le transfert (l'envoi de mail n'est pas obligatoire)
      // Si un email est renseigné, on le valide au format ; personne_id reste obligatoire
      const utilisateurId = dossierData?.candidat?.personne?.utilisateur_id; // C'est en fait personne_id
      const personneId = dossierData?.candidat?.personne?.id;
      const candidatEmail = dossierData?.candidat?.personne?.email || null;
      
      console.log('🔍 Vérification de la personne avant envoi:', {
        personneId: personneId,
        utilisateurId: utilisateurId, // utilisateur_id = personne_id
        personneEmail: candidatEmail,
        hasPersonneId: !!personneId,
        hasUtilisateurId: !!utilisateurId,
        hasPersonneEmail: !!candidatEmail,
      });
      
      // Email de la personne : optionnel pour le transfert (l'envoi de mail n'est pas obligatoire)
      // Si un email est renseigné, on vérifie son format
      if (candidatEmail && candidatEmail.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(candidatEmail)) {
          const errorMsg = `Erreur: L'email "${candidatEmail}" n'est pas au format valide.`;
          console.error('❌', errorMsg);
          alert(errorMsg);
          setSendingToCNEDDT(false);
          return;
        }
      }
      
      // VALIDATION: Vérifier que la personne existe (personne_id doit être présent)
      if (!personneId) {
        const errorMsg = 'Erreur: Aucun ID de personne trouvé. Impossible d\'envoyer le dossier à la CNEDDT.';
        console.error('❌', errorMsg);
        alert(errorMsg);
        setSendingToCNEDDT(false);
        return;
      }
      
      // IMPORTANT: L'endpoint /dossiers/transfert est un pont vers la base CNEDDT
      // Documentation: docs/transfert_dossier.md
      // Le backend crée l'utilisateur dans la base CNEDDT à partir des données de la personne
      const personne = dossierData?.candidat?.personne;
      const finalCandidatEmail = personne?.email || candidatEmail;
      
      // Construire le payload selon la documentation API
      // Paramètres obligatoires: dossier_id, type_demande_id
      // Paramètres optionnels: numero_driving_license (selon type), personne_email, candidat_email, email
      // Voir docs/transfert_dossier.md pour plus de détails
      payload = {
        dossier_id: dossierId,
        type_demande_id: dossierData?.type_demande_id, // OBLIGATOIRE selon la documentation
      };
      
      // Ajouter les emails selon l'ordre de priorité de la documentation:
      // 1. personne_email (priorité 1)
      // 2. candidat_email (priorité 2)
      // 3. email (priorité 3)
      // Le backend utilisera ces emails dans cet ordre pour l'envoi de notification
      if (finalCandidatEmail) {
        payload.personne_email = finalCandidatEmail; // Priorité 1
        payload.candidat_email = finalCandidatEmail; // Priorité 2
        payload.email = finalCandidatEmail; // Priorité 3
      }
      
      // Vérifier le type de demande pour déterminer si numero_driving_license est requis
      // Selon la documentation: numero_driving_license est OBLIGATOIRE pour:
      // - DUPLICATA
      // - CONVERSION
      // - RENOUVELLEMENT
      // - DUPLICATAFICHEENREGISTREMENT
      // - FICHEENREGISTREMENT
      // Voir docs/transfert_dossier.md
      let typeDemandeName: string | null = null;
      let requiresNumeroDrivingLicense = false;
      
      if (dossierData?.type_demande_id) {
        try {
          const typeDemandeResponse = await axiosClient.get(`/type-demandes/${dossierData.type_demande_id}`);
          const typeDemande = typeDemandeResponse.data?.data || typeDemandeResponse.data;
          if (typeDemande?.name) {
            typeDemandeName = typeDemande.name.toUpperCase();
            const typesRequiringLicense = [
              'DUPLICATA',
              'CONVERSION',
              'RENOUVELLEMENT',
              'DUPLICATAFICHEENREGISTREMENT',
              'FICHEENREGISTREMENT'
            ];
            requiresNumeroDrivingLicense = typeDemandeName ? typesRequiringLicense.includes(typeDemandeName) : false;
            
            console.log('🔍 Type de demande détecté:', {
              id: typeDemande.id,
              name: typeDemande.name,
              requiresNumeroDrivingLicense: requiresNumeroDrivingLicense
            });
          }
        } catch (err) {
          console.warn('⚠️ Impossible de charger le type de demande:', err);
        }
      }
      
      // Ajouter numero_driving_license si requis selon le type de demande
      // Priorité: numero_permis (NumeroPermisPage), puis numero_origine_permis (PermisBOriginePage / anciens dossiers)
      // Accepter snake_case et camelCase (réponse API peut varier)
      const rawNumeroPermis = (dossierData?.numero_permis ?? (dossierData as any)?.numeroPermis ?? '').toString().trim();
      const rawNumeroOrigine = (dossierData?.numero_origine_permis ?? (dossierData as any)?.numeroOriginePermis ?? '').toString().trim();
      const numeroPermisValue = rawNumeroPermis;
      const numeroOrigineValue = rawNumeroOrigine;
      const numeroToUse = numeroPermisValue || numeroOrigineValue;

      console.log('🔍 Numéro de permis dans le dossier (pour CNEDDT):', {
        numero_permis: dossierData?.numero_permis,
        numeroPermis: (dossierData as any)?.numeroPermis,
        numero_origine_permis: dossierData?.numero_origine_permis,
        numeroOriginePermis: (dossierData as any)?.numeroOriginePermis,
        numeroToUse: numeroToUse || '(vide)',
      });

      if (numeroToUse) {
        payload.numero_driving_license = numeroToUse;
        console.log('✅ numero_driving_license ajouté au payload:', numeroToUse, numeroPermisValue ? '(numero_permis)' : '(numero_origine_permis)');
      } else if (requiresNumeroDrivingLicense) {
        console.error('❌ ERREUR CRITIQUE: Le type de demande exige numero_driving_license mais il est manquant!');
        console.error('❌ Type de demande:', typeDemandeName);
        console.error('❌ Champs dossier (numero_permis / numero_origine_permis):', {
          numero_permis: dossierData?.numero_permis,
          numero_origine_permis: dossierData?.numero_origine_permis,
        });
        alert(`Erreur: Le type de demande "${typeDemandeName}" exige un numéro de permis (numero_driving_license) mais il est manquant dans le dossier.\n\n` +
              'Veuillez modifier le dossier pour ajouter le numéro de permis (étape "Numéro de permis" lors de la création), puis réessayer l\'envoi à la CNEDDT.');
        setSendingToCNEDDT(false);
        return;
      } else {
        console.log('ℹ️ numero_driving_license non requis pour ce type de demande:', typeDemandeName || 'non déterminé');
      }
      
      // Vérification finale : s'assurer que numero_driving_license est présent et non vide si requis
      if (requiresNumeroDrivingLicense && (!payload.numero_driving_license || payload.numero_driving_license.trim() === '')) {
        console.error('❌ ERREUR CRITIQUE: Le type de demande exige numero_driving_license mais il est vide!');
        alert(`Erreur: Le type de demande "${typeDemandeName}" exige un numéro de permis (numero_driving_license) et il ne peut pas être vide.`);
        setSendingToCNEDDT(false);
        return;
      }
      
      // Note: Selon la documentation (docs/transfert_dossier.md), le payload ne doit contenir que:
      // - dossier_id (obligatoire)
      // - type_demande_id (obligatoire)
      // - numero_driving_license (obligatoire pour certains types)
      // - personne_email, candidat_email, email (optionnels, pour l'email de notification)
      // Les autres champs (personne_id, utilisateur_id, referenciel_id, etc.) ne sont pas documentés
      // mais peuvent être nécessaires pour le backend. On les garde pour compatibilité mais ils ne sont pas
      // dans la documentation officielle de l'API.
      
      console.log('✅ Toutes les validations passées, payload construit selon la documentation:', {
        dossier_id: payload.dossier_id,
        type_demande_id: payload.type_demande_id,
        numero_driving_license: payload.numero_driving_license,
        personne_email: payload.personne_email,
        candidat_email: payload.candidat_email,
        email: payload.email,
      });
      
      // Vérifier que le dossier a toutes les relations nécessaires dans la base de données
      // Le backend charge le dossier avec : 
      // Dossier::with(['candidat.personne', 'autoEcole.province', 'formation.typePermis'])
      console.log('📋 Vérification des relations du dossier avant envoi:', {
        hasAutoEcole: !!dossierData?.auto_ecole,
        hasFormation: !!dossierData?.formation,
        hasFormationTypePermis: !!dossierData?.formation?.type_permis_id,
        hasCandidatPersonne: !!dossierData?.candidat?.personne,
        autoEcoleId: dossierData?.auto_ecole_id,
        formationId: dossierData?.formation_id,
        referencielId: dossierData?.referenciel_id,
        typeDemandeId: dossierData?.type_demande_id,
        hasTypeDemandeId: !!dossierData?.type_demande_id,
      });
      
      // Vérification finale : s'assurer que les champs obligatoires sont présents
      // Documentation: docs/transfert_dossier.md - Paramètres obligatoires
      if (!payload.dossier_id) {
        console.error('❌ ERREUR CRITIQUE: Le dossier_id n\'est pas présent dans le payload!');
        alert('Erreur: L\'ID du dossier est manquant. Impossible d\'envoyer le dossier à la CNEDDT.');
        setSendingToCNEDDT(false);
        return;
      }
      
      if (!payload.type_demande_id) {
        console.error('❌ ERREUR CRITIQUE: Le type_demande_id n\'est pas présent dans le payload!');
        console.error('❌ Payload actuel:', JSON.stringify(payload, null, 2));
        console.error('❌ Dossier data:', JSON.stringify(dossierData, null, 2));
        alert('Erreur: Le type de demande est manquant. Impossible d\'envoyer le dossier à la CNEDDT.');
        setSendingToCNEDDT(false);
        return;
      }
      
      // Note: Les emails (personne_email, candidat_email, email) sont optionnels selon la documentation
      // Le backend utilisera l'ordre de priorité: personne_email > candidat_email > email > personne.email > utilisateur.email
      // Voir docs/transfert_dossier.md - Priorité des emails pour la notification
      // Si aucun email n'est fourni, le backend utilisera l'email de la personne depuis la base de données
      
      // Vérification CRITIQUE : S'assurer que la formation est chargée avec typePermis avant l'envoi
      // Le backend accède à $dossier->formation->typePermis, donc formation ne doit pas être null
      // et formation->typePermis doit exister
      if (dossierData?.formation_id) {
        try {
          console.log('🔍 Vérification finale de la formation avant envoi...');
          
          // Recharger le dossier avec toutes les relations nécessaires
          const finalDossierResponse = await axiosClient.get(`/dossiers/${dossierId}`, {
            params: {
              include: 'auto_ecole,formation,formation.typePermis,formation.auto_ecole,candidat.personne'
            }
          });
          const finalDossierData = finalDossierResponse.data?.data || finalDossierResponse.data;
          
          // Vérifier que la formation est bien chargée
          if (!finalDossierData?.formation) {
            console.error('❌ ERREUR: La formation n\'est pas chargée dans le dossier après mise à jour!');
            console.error('❌ formation_id:', dossierData.formation_id);
            
            // Essayer de charger la formation directement
            try {
              const formationResponse = await axiosClient.get(`/formations/${dossierData.formation_id}`);
              const formationData = formationResponse.data?.data || formationResponse.data;
              
              if (!formationData) {
                throw new Error('La formation n\'existe pas');
              }
              
              if (!formationData.type_permis_id && !formationData.typePermis) {
                throw new Error('La formation n\'a pas de type_permis_id');
              }
              
              console.log('✅ Formation chargée directement:', {
                id: formationData.id,
                type_permis_id: formationData.type_permis_id,
                hasTypePermis: !!formationData.typePermis
              });
            } catch (formationError: any) {
              console.error('❌ Impossible de charger la formation:', formationError);
              alert('Erreur: La formation associée au dossier n\'existe pas ou n\'a pas de type de permis. ' +
                    'Veuillez vous assurer que le dossier a une formation valide avec un type de permis.');
              setSendingToCNEDDT(false);
              return;
            }
          } else {
            // Vérifier que la formation a bien un typePermis ou type_permis_id
            if (!finalDossierData.formation.typePermis && !finalDossierData.formation.type_permis_id) {
              console.error('❌ ERREUR: La formation n\'a pas de typePermis ou type_permis_id!');
              console.error('❌ Formation:', JSON.stringify(finalDossierData.formation, null, 2));
              
              // Essayer de mettre à jour la formation avec type_permis_id si on l'a
              if (typePermisId) {
                try {
                  await axiosClient.put(`/formations/${dossierData.formation_id}`, {
                    type_permis_id: typePermisId,
                  });
                  console.log('✅ Formation mise à jour avec type_permis_id:', typePermisId);
                  
                  // Recharger le dossier une dernière fois
                  const updatedDossierResponse = await axiosClient.get(`/dossiers/${dossierId}`, {
                    params: {
                      include: 'auto_ecole,formation,formation.typePermis,formation.auto_ecole,candidat.personne'
                    }
                  });
                  dossierData = updatedDossierResponse.data?.data || updatedDossierResponse.data;
                } catch (updateError: any) {
                  console.error('❌ Impossible de mettre à jour la formation:', updateError);
                }
              }
            } else {
              console.log('✅ Formation vérifiée avec typePermis:', {
                hasTypePermis: !!finalDossierData.formation.typePermis,
                typePermisId: finalDossierData.formation.type_permis_id,
              });
            }
          }
        } catch (finalCheckError: any) {
          console.warn('⚠️ Erreur lors de la vérification finale de la formation:', finalCheckError);
          // Continuer quand même, le backend devrait gérer
        }
      } else {
        console.log('⚠️ Le dossier n\'a pas de formation_id, le backend utilisera referenciel_id');
      }
      
      console.log('📋 Payload final pour transfert:', JSON.stringify(payload, null, 2));
      console.log('✅ Vérification finale - Champs documentés présents dans le payload:', {
        // Champs obligatoires selon la documentation
        hasDossierId: !!payload.dossier_id,
        dossierIdValue: payload.dossier_id,
        hasTypeDemandeId: !!payload.type_demande_id,
        typeDemandeIdValue: payload.type_demande_id,
        // Champs optionnels selon le type de demande
        hasNumeroDrivingLicense: !!payload.numero_driving_license,
        numeroDrivingLicenseValue: payload.numero_driving_license,
        // Champs optionnels pour l'email (ordre de priorité: personne_email > candidat_email > email)
        hasPersonneEmail: !!payload.personne_email,
        personneEmailValue: payload.personne_email,
        hasCandidatEmail: !!payload.candidat_email,
        candidatEmailValue: payload.candidat_email,
        hasEmail: !!payload.email,
        emailValue: payload.email,
        // Informations de débogage
        payloadKeys: Object.keys(payload),
        payloadSize: JSON.stringify(payload).length,
      });
      
      // Log de la requête qui sera envoyée (pour débogage)
      console.log('📤 Envoi de la requête POST /dossiers/transfert avec payload:', {
        url: '/dossiers/transfert',
        method: 'POST',
        data: payload,
        dataStringified: JSON.stringify(payload),
      });
      
      const response = await axiosClient.post('/dossiers/transfert', payload, {
        timeout: 60000, // 60s — le transfert CNEDDT peut être long (appel externe)
      });
      console.log('✅ Réponse CNEDDT:', response.data);
      
      // Marquer comme envoyé (état local + localStorage en secours jusqu'à ce que l'API renvoie le bon statut)
      setLocalSentToCNEDDT(true);
      if (dossierId) {
        const storageKey = `cneddt_sent_${dossierId}`;
        localStorage.setItem(storageKey, 'true');
      }
      
      // Mettre le statut du dossier à "DOSSIER ENVOYER" après envoi réussi à la CNEDDT
      if (dossierId) {
        try {
          await circuitSuiviService.updateDossierStatut(dossierId, 'DOSSIER ENVOYER', { asStatutId: false });
        } catch (err) {
          console.warn('⚠️ Mise à jour du statut dossier après envoi CNEDDT:', err);
        }
      }
      
      if (onSendToCNEDDT) {
        onSendToCNEDDT();
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'envoi à la CNEDDT:', error);
      console.error('❌ Détails de l\'erreur:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
      });
      
      // Afficher TOUTES les erreurs de validation du backend (CRITIQUE pour le débogage)
      if (error?.response?.data?.errors) {
        console.error('❌ ERREURS DE VALIDATION DU BACKEND:', JSON.stringify(error.response.data.errors, null, 2));
        console.error('❌ Tous les champs en erreur:', Object.keys(error.response.data.errors));
        Object.entries(error.response.data.errors).forEach(([field, messages]: [string, any]) => {
          const messageList = Array.isArray(messages) ? messages.join(', ') : messages;
          console.error(`❌ Erreur pour le champ "${field}":`, messageList);
        });
      }
      
      // Afficher le payload envoyé pour comparaison
      if (payload) {
        console.error('❌ Payload envoyé au backend:', JSON.stringify(payload, null, 2));
        console.error('❌ Champs présents dans le payload:', Object.keys(payload));
      }
      
      let errorMessage = 'Erreur lors de l\'envoi à la CNEDDT';
      const isTimeout = error?.code === 'ECONNABORTED' || (error?.message && String(error.message).toLowerCase().includes('timeout'));
      if (isTimeout) {
        errorMessage = 'Délai dépassé : le serveur ou l\'API CNEDDT met trop de temps à répondre. Réessayez ou contactez l\'administrateur.';
      } else if (error?.response?.status === 500) {
        errorMessage = 'Erreur serveur (500). Veuillez contacter l\'administrateur.';
        if (error?.response?.data?.message) {
          const backendMessage = error.response.data.message;
          errorMessage = `Erreur serveur: ${backendMessage}`;
          
          // Détection spécifique pour l'erreur "Configuration CNEDDT API manquante"
          if (backendMessage.includes('Configuration CNEDDT API manquante') || 
              backendMessage.includes('Configuration CNEDDT') ||
              backendMessage.includes('CNEDDT API')) {
            errorMessage = 'Erreur de configuration serveur: La configuration de l\'API CNEDDT est manquante. ' +
                          'Le backend n\'a pas les paramètres nécessaires pour se connecter à l\'API CNEDDT (URL, credentials, etc.). ' +
                          'Veuillez contacter l\'administrateur système pour configurer les variables d\'environnement CNEDDT dans le fichier .env du backend. ' +
                          'Variables probablement requises: CNEDDT_API_URL, CNEDDT_API_KEY, etc.';
            console.error('❌ ERREUR DE CONFIGURATION BACKEND: Configuration CNEDDT API manquante');
            console.error('❌ Le backend Laravel n\'a pas les variables d\'environnement nécessaires pour se connecter à l\'API CNEDDT');
            console.error('❌ Fichier backend: DossierService.php ligne 16');
            console.error('❌ Solution: Configurer les variables d\'environnement CNEDDT dans le fichier .env du backend');
          }
          // Détection spécifique pour l'erreur formation->typePermis
          else if (backendMessage.includes('typePermis') && backendMessage.includes('null')) {
            const formationId = dossierData?.formation_id || 'non disponible';
            const referencielId = dossierData?.referenciel_id || typePermisId || 'non disponible';
            errorMessage = `Erreur serveur: Le backend essaie d'accéder à formation->typePermis mais formation est null. ` +
                          `Le dossier a un formation_id (${formationId}) et un referenciel_id (${referencielId}) a été envoyé dans le payload. ` +
                          `Le backend devrait utiliser $request->referenciel_id ou $request->type_permis_id au lieu d'accéder à $dossier->formation->typePermis. ` +
                          `Veuillez contacter l'administrateur pour corriger le backend (DossierController.php ligne 692). ` +
                          `Solution: Utiliser $request->referenciel_id ?? $request->type_permis_id ?? ($dossier->formation?->typePermis?->id ?? $dossier->formation?->type_permis_id ?? $dossier->referenciel_id);`;
            console.error('❌ PROBLÈME BACKEND: Le backend essaie d\'accéder à formation->typePermis mais formation est null.');
            console.error('❌ formation_id dans le dossier:', formationId);
            console.error('❌ referenciel_id envoyé dans le payload:', referencielId);
            console.error('❌ Le backend devrait utiliser: $request->referenciel_id ou $request->type_permis_id');
            console.error('❌ Au lieu de: $dossier->formation->typePermis (où formation est null)');
            console.error('❌ Solution backend: Utiliser $request->referenciel_id ?? $request->type_permis_id ?? ($dossier->formation?->typePermis?->id ?? $dossier->formation?->type_permis_id ?? $dossier->referenciel_id);');
          }
          // Si l'erreur concerne l'email sur null, donner un message plus explicite
          else if (backendMessage.includes('email') && backendMessage.includes('null')) {
            const candidatEmail = dossierData?.candidat?.personne?.email || 'non disponible';
            const utilisateurId = dossierData?.candidat?.personne?.utilisateur_id || 'non disponible';
            const payloadEmail = payload?.email || 'non disponible';
            const payloadCandidatEmail = payload?.candidat_email || 'non disponible';
            const payloadPersonneEmail = payload?.personne_email || 'non disponible';
            const payloadUtilisateurId = payload?.utilisateur_id || 'non disponible';
            
            errorMessage = `Erreur serveur: Le backend essaie d'accéder à $utilisateur->email où $utilisateur est null (ligne 797). ` +
                          `L'utilisateur (ID: ${utilisateurId}) n'existe pas en base de données, mais la personne a un email (${candidatEmail}). ` +
                          `Le frontend a envoyé l'email dans le payload: email="${payloadEmail}", candidat_email="${payloadCandidatEmail}", personne_email="${payloadPersonneEmail}". ` +
                          `Le backend devrait utiliser $request->email ou $request->candidat_email ou $request->personne_email ` +
                          `au lieu d'accéder à $utilisateur->email (où $utilisateur est null). ` +
                          `Veuillez contacter l'administrateur pour corriger le backend (DossierController.php ligne 797). ` +
                          `Solution backend: $emailToUse = $request->email ?? ($utilisateur ? $utilisateur->email : null) ?? $dossier->candidat->personne->email;`;
            console.error('❌ PROBLÈME BACKEND: L\'utilisateur (ID: ' + utilisateurId + ') n\'existe pas en base, mais la personne a un email.');
            console.error('❌ Le backend essaie d\'accéder à $utilisateur->email où $utilisateur est null.');
            console.error('❌ Chaîne de relations: Dossier → candidat → personne (utilisateur_id: ' + utilisateurId + ' ) → utilisateur (null - n\'existe pas)');
            console.error('❌ Email de la personne envoyé dans le payload: ' + candidatEmail);
            console.error('❌ Payload envoyé:', {
              email: payloadEmail,
              candidat_email: payloadCandidatEmail,
              personne_email: payloadPersonneEmail,
              utilisateur_id: payloadUtilisateurId,
              personne_id: payload?.personne_id,
            });
            console.error('❌ Le backend devrait utiliser: $request->email ou $request->candidat_email ou $request->personne_email');
            console.error('❌ Au lieu de: $utilisateur->email (où $utilisateur est null)');
            console.error('❌ Solution backend: $emailToUse = $request->email ?? ($utilisateur ? $utilisateur->email : null) ?? $dossier->candidat->personne->email;');
          }
        }
        // Afficher plus de détails dans la console pour le débogage
        if (error?.response?.data) {
          console.error('❌ Détails de l\'erreur serveur:', JSON.stringify(error.response.data, null, 2));
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
        
        // Gestion spécifique pour l'erreur "Saisissez un numéro de permis pour un duplicata"
        if (error.response.data.error.includes('numéro de permis') && error.response.data.error.includes('duplicata')) {
          console.error('❌ ERREUR DUPLICATA: Le backend exige numero_driving_license pour un duplicata');
          console.error('❌ numero_permis dans le dossier:', dossierData?.numero_permis);
          console.error('❌ numero_driving_license dans le payload:', payload?.numero_driving_license);
          console.error('❌ numero_permis dans le payload:', payload?.numero_permis);
          console.error('❌ type_demande_id:', dossierData?.type_demande_id);
          
          if (!dossierData?.numero_permis) {
            errorMessage = 'Erreur: Le type de demande est un duplicata. Le numéro de permis est obligatoire mais est manquant dans le dossier. ' +
                          'Veuillez renseigner le numéro de permis avant de l\'envoyer à la CNEDDT.';
          } else if (!payload?.numero_driving_license) {
            errorMessage = 'Erreur: Le numéro de permis n\'a pas été inclus dans le payload avec le nom de champ attendu (numero_driving_license). ' +
                          'Veuillez contacter l\'administrateur.';
          } else {
            errorMessage = 'Erreur: Le backend n\'a pas accepté le numéro de permis pour ce duplicata. ' +
                          `Numéro de permis envoyé: "${payload.numero_driving_license}". ` +
                          'Le backend cherche ce numéro dans la table HPermis. ' +
                          'Veuillez vérifier que le numéro de permis existe dans la base de données HPermis.';
          }
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      if (error?.response?.data?.errors) {
        const validationErrors = Object.entries(error.response.data.errors)
          .map(([key, value]: [string, any]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('; ');
        errorMessage = `Erreur de validation: ${validationErrors}`;
        
        // Message spécifique pour dossier_id manquant ou invalide
        // Documentation: docs/transfert_dossier.md - Paramètres obligatoires
        if (error.response.data.errors.dossier_id) {
          const dossierIdError = Array.isArray(error.response.data.errors.dossier_id) 
            ? error.response.data.errors.dossier_id.join(', ')
            : error.response.data.errors.dossier_id;
          console.error('❌ Erreur dossier_id:', dossierIdError);
          console.error('❌ dossier_id dans le payload:', payload?.dossier_id);
          
          // Documentation: docs/transfert_dossier.md - Codes d'erreur courants
          // "Le dossier est invalide ou n'est pas répertoriée dans les dossiers"
          errorMessage = 'Erreur: Le dossier est invalide ou n\'existe pas dans la base de données. ' +
                        'Veuillez vérifier que le dossier_id est correct et que le dossier existe. ' +
                        'Voir docs/transfert_dossier.md pour plus de détails.';
        }
        
        // Message spécifique pour type_demande_id manquant
        // Documentation: docs/transfert_dossier.md - Paramètres obligatoires
        if (error.response.data.errors.type_demande_id) {
          const typeDemandeIdError = Array.isArray(error.response.data.errors.type_demande_id) 
            ? error.response.data.errors.type_demande_id.join(', ')
            : error.response.data.errors.type_demande_id;
          console.error('❌ Erreur type_demande_id:', typeDemandeIdError);
          console.error('❌ type_demande_id dans le dossier:', dossierData?.type_demande_id);
          
          if (!dossierData?.type_demande_id) {
            errorMessage = 'Erreur: Le type de demande est manquant dans le dossier. ' +
                          'Veuillez vous assurer que le dossier a un type de demande défini avant de l\'envoyer à la CNEDDT. ' +
                          'Voir docs/transfert_dossier.md pour plus de détails.';
          } else {
            // Documentation: docs/transfert_dossier.md - Codes d'erreur courants
            // "Le type de demande est invalide ou n'est pas répertoriée"
            errorMessage = 'Erreur: Le type de demande n\'a pas été accepté par le serveur. ' +
                          'Veuillez vérifier que le type de demande est valide et existe dans la base de données. ' +
                          'Voir docs/transfert_dossier.md pour la liste des types de demandes supportés.';
          }
        }
        
        // Message spécifique pour numero_driving_license manquant ou invalide
        // Documentation: docs/transfert_dossier.md - Paramètres optionnels selon le type de demande
        // numero_driving_license est OBLIGATOIRE pour: DUPLICATA, CONVERSION, RENOUVELLEMENT, etc.
        if (error.response.data.errors.numero_driving_license) {
          const numeroDrivingLicenseError = Array.isArray(error.response.data.errors.numero_driving_license) 
            ? error.response.data.errors.numero_driving_license.join(', ')
            : error.response.data.errors.numero_driving_license;
          console.error('❌ Erreur numero_driving_license:', numeroDrivingLicenseError);
          console.error('❌ numero_permis dans le dossier:', dossierData?.numero_permis);
          console.error('❌ numero_driving_license dans le payload:', payload?.numero_driving_license);
          
          if (numeroDrivingLicenseError.includes('invalide') || numeroDrivingLicenseError.includes('répertoriée')) {
            // Documentation: docs/transfert_dossier.md - Codes d'erreur courants
            // "Le numero de permis est invalide ou n'est pas répertoriée"
            errorMessage = `Erreur: Le numéro de permis "${payload?.numero_driving_license || dossierData?.numero_permis}" n'existe pas dans la base de données HPermis. ` +
                          `Le backend cherche ce numéro dans la table HPermis pour valider le type de demande. ` +
                          `Veuillez vérifier que le numéro de permis est correct et qu'il existe dans la base de données HPermis. ` +
                          `Voir docs/transfert_dossier.md pour plus de détails.`;
          } else if (numeroDrivingLicenseError.includes('Saisissez un numéro de permis')) {
            // Documentation: docs/transfert_dossier.md - Codes d'erreur courants
            // "Saisissez un numéro de permis pour un duplicata"
            errorMessage = `Erreur: Le type de demande exige un numéro de permis (numero_driving_license) mais il est manquant. ` +
                          `Veuillez renseigner le numéro de permis dans le dossier avant de l'envoyer à la CNEDDT. ` +
                          `Voir docs/transfert_dossier.md pour la liste des types de demandes nécessitant numero_driving_license.`;
          } else {
            errorMessage = `Erreur: ${numeroDrivingLicenseError}. ` +
                          `Numéro de permis envoyé: "${payload?.numero_driving_license || dossierData?.numero_permis}".`;
          }
        }
        
        // Afficher toutes les autres erreurs de validation non gérées spécifiquement
        // Documentation: docs/transfert_dossier.md - Erreur de validation (422)
        const unhandledErrors = Object.keys(error.response.data.errors).filter(
          key => key !== 'type_demande_id' && key !== 'numero_driving_license' && key !== 'dossier_id'
        );
        if (unhandledErrors.length > 0) {
          console.error('❌ Autres erreurs de validation non gérées:', unhandledErrors);
          unhandledErrors.forEach(field => {
            const fieldErrors = error.response.data.errors[field];
            const errorText = Array.isArray(fieldErrors) ? fieldErrors.join(', ') : fieldErrors;
            console.error(`❌ Erreur pour "${field}":`, errorText);
            console.error(`❌ Valeur de "${field}" dans le dossier:`, dossierData?.[field]);
            console.error(`❌ Valeur de "${field}" dans le payload:`, payload?.[field]);
          });
        }
      }
      
      alert(`Erreur: ${errorMessage}`);
    } finally {
      setSendingToCNEDDT(false);
    }
  };

  return {
    sendingToCNEDDT,
    sentToCNEDDT,
    handleSendToCNEDDT
  };
};

