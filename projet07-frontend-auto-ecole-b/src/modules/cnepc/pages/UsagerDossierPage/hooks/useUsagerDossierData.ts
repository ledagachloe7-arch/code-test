import { useState, useEffect } from 'react';
import { Dossier, Referentiel } from '../../../types/auto-ecole';
import { TypeDemande } from '../../../types/type-demande';
import { Document, PieceJustificative } from '../types';
import { gestionDossierService, referentielService, typeDemandeService } from '../../../services';
import { circuitSuiviService } from '../../../../reception/services/circuit-suivi.service';
import { calculateDossierStatusFromCircuit } from '../../../utils/dossierStatus';
import axiosClient from '../../../../../shared/utils/axiosConfig';

export const useUsagerDossierData = (dossier: Dossier | null) => {
  const [candidatDossiers, setCandidatDossiers] = useState<Dossier[]>([]);
  const [allCandidatDocuments, setAllCandidatDocuments] = useState<Document[]>([]);
  const [piecesJustificativesMap, setPiecesJustificativesMap] = useState<Map<string, PieceJustificative>>(new Map());
  const [loadingDossiers, setLoadingDossiers] = useState(false);
  const [referentielsCache, setReferentielsCache] = useState<Map<string, Referentiel>>(new Map());
  const [typeDemandeCache, setTypeDemandeCache] = useState<Map<string, TypeDemande>>(new Map());
  const [dossierStatusCache, setDossierStatusCache] = useState<Map<string, string>>(new Map());

  const loadReferentiel = async (id: string): Promise<Referentiel | null> => {
    if (referentielsCache.has(id)) {
      return referentielsCache.get(id)!;
    }
    try {
      const referentiel = await referentielService.getReferentielById(id);
      setReferentielsCache((prev) => new Map(prev).set(id, referentiel));
      return referentiel;
    } catch (err: any) {
      console.error(`Erreur lors du chargement du référentiel ${id}:`, err);
      return null;
    }
  };

  const loadTypeDemande = async (id: string): Promise<TypeDemande | null> => {
    if (typeDemandeCache.has(id)) {
      return typeDemandeCache.get(id)!;
    }
    try {
      const typeDemande = await typeDemandeService.getTypeDemandeById(id);
      setTypeDemandeCache((prev) => new Map(prev).set(id, typeDemande));
      return typeDemande;
    } catch (err: any) {
      console.error(`Erreur lors du chargement du type de demande ${id}:`, err);
      return null;
    }
  };

  const loadMissingReferentiels = async (dossiers: Dossier[]) => {
    const referentielIds = new Set<string>();
    dossiers.forEach((dossier) => {
      const referencielId = (dossier as any).referenciel_id;
      if (referencielId && !referentielsCache.has(referencielId)) {
        referentielIds.add(referencielId);
      }
    });
    if (referentielIds.size > 0) {
      const promises = Array.from(referentielIds).map((id) => loadReferentiel(id));
      const loadedReferentiels = await Promise.all(promises);
      const newCache = new Map(referentielsCache);
      loadedReferentiels.forEach((referentiel) => {
        if (referentiel) {
          newCache.set(referentiel.id, referentiel);
        }
      });
      setReferentielsCache(newCache);
      setCandidatDossiers((prevDossiers) => {
        return prevDossiers.map((dossier) => {
          const referencielId = (dossier as any).referenciel_id;
          if (referencielId && newCache.has(referencielId) && !dossier.referentiel) {
            return {
              ...dossier,
              referentiel: newCache.get(referencielId)!,
            };
          }
          return dossier;
        });
      });
    }
  };

  const loadMissingTypeDemandes = async (dossiers: Dossier[]) => {
    const typeDemandeIds = new Set<string>();
    dossiers.forEach((dossier) => {
      if (dossier.type_demande_id && !typeDemandeCache.has(dossier.type_demande_id)) {
        typeDemandeIds.add(dossier.type_demande_id);
      }
    });
    if (typeDemandeIds.size > 0) {
      const promises = Array.from(typeDemandeIds).map((id) => loadTypeDemande(id));
      const loadedTypeDemandes = await Promise.all(promises);
      const newCache = new Map(typeDemandeCache);
      loadedTypeDemandes.forEach((typeDemande) => {
        if (typeDemande) {
          newCache.set(typeDemande.id, typeDemande);
        }
      });
      setTypeDemandeCache(newCache);
      setCandidatDossiers((prevDossiers) => {
        return prevDossiers.map((dossier) => {
          if (dossier.type_demande_id && newCache.has(dossier.type_demande_id) && !dossier.type_demande) {
            return {
              ...dossier,
              type_demande: newCache.get(dossier.type_demande_id)!,
            };
          }
          return dossier;
        });
      });
    }
  };

  // Écouter les événements de mise à jour de statut
  useEffect(() => {
    const handleDossierStatusUpdated = (event: CustomEvent) => {
      const { dossierId, newStatus } = event.detail;
      console.log('📢 useUsagerDossierData - Événement de mise à jour de statut reçu:', { dossierId, newStatus });
      
      setDossierStatusCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(dossierId, newStatus);
        console.log('✅ useUsagerDossierData - Cache mis à jour:', { dossierId, newStatus });
        return newCache;
      });
    };

    window.addEventListener('dossierStatusUpdated', handleDossierStatusUpdated as EventListener);

    return () => {
      window.removeEventListener('dossierStatusUpdated', handleDossierStatusUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    const loadCandidatDossiersAndDocuments = async () => {
      if (!dossier?.candidat_id) return;

      try {
        setLoadingDossiers(true);
        const response = await gestionDossierService.getDossiers(1, 1000);
        const filteredDossiers = response.data.filter(
          (d) => d.candidat_id === dossier.candidat_id
        );
        setCandidatDossiers(filteredDossiers);
        
        await loadMissingReferentiels(filteredDossiers);
        await loadMissingTypeDemandes(filteredDossiers);
        
        const statusMap = new Map<string, string>();
        for (const d of filteredDossiers) {
          try {
            const typeDemande = d.type_demande || (d.type_demande_id ? typeDemandeCache.get(d.type_demande_id) : null);
            const calculatedStatus = await calculateDossierStatusFromCircuit(d, typeDemande || undefined);
            statusMap.set(d.id, calculatedStatus);
          } catch (err: any) {
            console.error(`Erreur lors du calcul du statut pour le dossier ${d.id}:`, err);
            statusMap.set(d.id, d.statut || 'en_attente');
          }
        }
        setDossierStatusCache(statusMap);
        
        const allDocuments: Document[] = [];
        const pieceJustificationIds = new Set<string>();
        
        for (const d of filteredDossiers) {
          try {
            const docs = await circuitSuiviService.getDocumentsByDossier(d.id);
            const filteredDocs = docs.filter((doc: any) => 
              !doc.documentable_id || doc.documentable_id === d.id
            );
            
            const docsWithDossierId = filteredDocs.map((doc: any) => ({
              ...doc,
              documentable_id: doc.documentable_id || d.id,
            }));
            
            allDocuments.push(...docsWithDossierId);
            
            docsWithDossierId.forEach((doc: Document) => {
              if (doc.piece_justification_id && doc.piece_justification_id !== 'N/A') {
                pieceJustificationIds.add(doc.piece_justification_id);
              }
            });
          } catch (err: any) {
            console.error(`Erreur lors du chargement des documents du dossier ${d.id}:`, err);
          }
        }
        
        setAllCandidatDocuments(allDocuments);
        
        if (pieceJustificationIds.size > 0) {
          try {
            const response = await axiosClient.get('/pieces-justificatives');
            let allPieces: PieceJustificative[] = [];
            
            if (response.data) {
              if (Array.isArray(response.data)) {
                allPieces = response.data;
              } else if (response.data.data && Array.isArray(response.data.data)) {
                allPieces = response.data.data;
              } else if (response.data.data && !Array.isArray(response.data.data)) {
                allPieces = [response.data.data];
              } else {
                allPieces = [response.data];
              }
            }
            
            const filteredPieces = allPieces.filter(piece => 
              pieceJustificationIds.has(piece.id)
            );
            
            const piecesMap = new Map<string, PieceJustificative>();
            filteredPieces.forEach(piece => {
              piecesMap.set(piece.id, piece);
            });
            
            setPiecesJustificativesMap(piecesMap);
          } catch (err: any) {
            console.error('Erreur lors du chargement des pièces justificatives:', err);
          }
        } else {
          setPiecesJustificativesMap(new Map());
        }
      } catch (err: any) {
        console.error('Erreur lors du chargement des dossiers du candidat:', err);
      } finally {
        setLoadingDossiers(false);
      }
    };

    if (dossier) {
      loadCandidatDossiersAndDocuments();
    }
  }, [dossier]);

  return {
    candidatDossiers,
    allCandidatDocuments,
    piecesJustificativesMap,
    loadingDossiers,
    referentielsCache,
    typeDemandeCache,
    dossierStatusCache,
  };
};

