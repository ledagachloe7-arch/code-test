import React from 'react';
import { ReceptionDossier, EpreuveStatut, EpreuveAttempt } from '../../../types';
import axiosClient from '../../../../../shared/utils/axiosConfig';
import { computeOverall, computeGeneral } from '../utils';

export function useEpreuvesStatus(dossiers: ReceptionDossier[]) {
  const [epreuvesMap, setEpreuvesMap] = React.useState<Map<string, EpreuveStatut>>(new Map());

  React.useEffect(() => {
    const loadEpreuvesStatus = async () => {
      if (dossiers.length === 0) {
        setEpreuvesMap(new Map());
        return;
      }

      const newMap = new Map<string, EpreuveStatut>();
      
      // Charger d'abord depuis localStorage pour maintenir le statut après les résultats
      dossiers.forEach(dossier => {
        const storageKey = `epreuve_status_${dossier.id}`;
        const storedStatus = localStorage.getItem(storageKey);
        if (storedStatus && (storedStatus === 'reussi' || storedStatus === 'echoue' || storedStatus === 'absent' || storedStatus === 'non_saisi')) {
          newMap.set(dossier.id, storedStatus as EpreuveStatut);
        }
      });
      
      // Ensuite, utiliser le statut depuis le dossier si disponible et pas déjà dans localStorage
      dossiers.forEach(dossier => {
        if (!newMap.has(dossier.id) && dossier.epreuves?.general) {
          newMap.set(dossier.id, dossier.epreuves.general);
        }
      });

      const dossiersSansStatut = dossiers.filter(d => !newMap.has(d.id));
      
      if (dossiersSansStatut.length > 0) {
        await Promise.all(
          dossiersSansStatut.map(async (dossier) => {
            try {
              const response = await axiosClient.get('/resultats', {
                params: { dossier_id: dossier.id }
              });
              
              const resultats = Array.isArray(response.data?.data) ? response.data.data : [];
              
              if (resultats.length === 0) {
                newMap.set(dossier.id, 'non_saisi');
                return;
              }
              
              const creneauxAttempts: EpreuveAttempt[] = [];
              const codeConduiteAttempts: EpreuveAttempt[] = [];
              const tourVilleAttempts: EpreuveAttempt[] = [];
              
              resultats.forEach((resultat: any) => {
                const attempt: EpreuveAttempt = {
                  result: resultat.statut as EpreuveStatut,
                  date: resultat.date,
                  note: resultat.commentaire || ''
                };
                
                const typeExamen = (resultat.typeExamen || '').toLowerCase().trim();
                
                if (typeExamen.includes('creneau') || typeExamen === 'creneaux') {
                  creneauxAttempts.push(attempt);
                } else if (typeExamen.includes('code') || typeExamen === 'codeconduite' || typeExamen === 'code_conduite') {
                  codeConduiteAttempts.push(attempt);
                } else if (typeExamen.includes('ville') || typeExamen === 'tourville' || typeExamen === 'tour_ville') {
                  tourVilleAttempts.push(attempt);
                }
              });
              
              creneauxAttempts.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateA - dateB;
              });
              codeConduiteAttempts.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateA - dateB;
              });
              tourVilleAttempts.sort((a, b) => {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                return dateA - dateB;
              });
              
              const creneauxStatus = computeOverall(creneauxAttempts);
              const codeStatus = computeOverall(codeConduiteAttempts);
              const villeStatus = computeOverall(tourVilleAttempts);
              const generalStatus = computeGeneral(creneauxStatus, codeStatus, villeStatus);
              
              newMap.set(dossier.id, generalStatus);
              
              // Sauvegarder dans localStorage pour maintenir le statut après les résultats
              const storageKey = `epreuve_status_${dossier.id}`;
              localStorage.setItem(storageKey, generalStatus);
            } catch (err: any) {
              if (err?.response?.status === 404) {
                newMap.set(dossier.id, 'non_saisi');
              } else {
                console.error(`❌ Erreur lors du chargement des résultats pour dossier ${dossier.id}:`, err);
                newMap.set(dossier.id, 'non_saisi');
              }
            }
          })
        );
      }
      
      setEpreuvesMap(newMap);
    };
    
    loadEpreuvesStatus();
  }, [dossiers]);

  const updateEpreuveStatus = React.useCallback((dossierId: string, status: EpreuveStatut) => {
    setEpreuvesMap(prev => {
      const newMap = new Map(prev);
      newMap.set(dossierId, status);
      return newMap;
    });
    
    // Sauvegarder dans localStorage pour maintenir le statut après les résultats
    const storageKey = `epreuve_status_${dossierId}`;
    localStorage.setItem(storageKey, status);
  }, []);

  return { epreuvesMap, updateEpreuveStatus };
}

