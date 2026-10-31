import React from 'react';
import { ReceptionDossier } from '../../../types';
import { referentielService } from '../../../../cnepc/services';
import { Referentiel } from '../../../../cnepc/types/auto-ecole';

export function useReferentiels(dossiers: ReceptionDossier[]) {
  const [referentielsMap, setReferentielsMap] = React.useState<Map<string, Referentiel>>(new Map());
  const [loadingReferentiels, setLoadingReferentiels] = React.useState(false);

  React.useEffect(() => {
    const loadReferentiels = async () => {
      if (dossiers.length === 0) {
        setReferentielsMap(new Map());
        return;
      }

      try {
        setLoadingReferentiels(true);
        
        // Collecter tous les referenciel_id uniques
        const referentielIds = new Set<string>();
        dossiers.forEach((dossier) => {
          const referencielId = (dossier.details?.dossier_complet as any)?.referenciel_id;
          if (referencielId) {
            referentielIds.add(referencielId);
          }
        });

        if (referentielIds.size === 0) {
          setLoadingReferentiels(false);
          return;
        }

        // Charger les référentiels en parallèle
        const referentielPromises = Array.from(referentielIds).map(async (id) => {
          try {
            const referentiel = await referentielService.getReferentielById(id);
            return { id, referentiel };
          } catch (error) {
            console.warn(`⚠️ Impossible de charger le référentiel ${id}:`, error);
            return null;
          }
        });

        const results = await Promise.all(referentielPromises);
        
        setReferentielsMap((prevMap) => {
          const newMap = new Map(prevMap);
          results.forEach((result) => {
            if (result) {
              newMap.set(result.id, result.referentiel);
            }
          });
          return newMap;
        });
      } catch (error) {
        console.error('❌ Erreur lors du chargement des référentiels:', error);
      } finally {
        setLoadingReferentiels(false);
      }
    };

    loadReferentiels();
  }, [dossiers]);

  const getReferentiel = (dossier: ReceptionDossier): Referentiel | null => {
    const referencielId = (dossier.details?.dossier_complet as any)?.referenciel_id;
    if (!referencielId) {
      return null;
    }
    return referentielsMap.get(referencielId) || null;
  };

  const getTypePermisLabel = (dossier: ReceptionDossier): string => {
    const referentiel = getReferentiel(dossier);
    if (referentiel) {
      return referentiel.libelle || referentiel.code || 'N/A';
    }
    
    // Fallback: chercher dans la formation
    const formationDetails = dossier.details?.formation_complete || dossier.details?.dossier?.formation;
    if (formationDetails?.type_permis) {
      if (typeof formationDetails.type_permis === 'object') {
        return formationDetails.type_permis.libelle || formationDetails.type_permis.code || 'N/A';
      }
      return formationDetails.type_permis;
    }
    
    return 'Non spécifié';
  };

  return {
    referentielsMap,
    loadingReferentiels,
    getReferentiel,
    getTypePermisLabel
  };
}

