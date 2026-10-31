import React from 'react';
import { ReceptionDossier } from '../../../types';
import { circuitSuiviService, CircuitSuivi } from '../../../services/circuit-suivi.service';
import { typeDemandeService } from '../../../../cnepc/services';
import { DossierSuivi } from '../types';

export function useDossierSuivi(
  dossiers: ReceptionDossier[],
  typeDemandeName: string,
  typeDemandeId?: string,
  circuitProp?: CircuitSuivi | null
) {
  const [suiviMap, setSuiviMap] = React.useState<Map<string, DossierSuivi>>(new Map());
  const [loadingSuivi, setLoadingSuivi] = React.useState(false);

  React.useEffect(() => {
    const loadSuivi = async () => {
      if (dossiers.length === 0) {
        setSuiviMap(new Map());
        return;
      }

      setLoadingSuivi(true);
      const newSuiviMap = new Map<string, DossierSuivi>();

      try {
        // Étape 1: Charger le circuit UNE SEULE FOIS pour tous les dossiers
        let circuit: CircuitSuivi | null = null;
        
        // Si le circuit est déjà passé en prop, l'utiliser directement
        if (circuitProp) {
          circuit = circuitProp;
          if (circuit.id && (!circuit.etapes || circuit.etapes.length === 0)) {
            try {
              const etapes = await circuitSuiviService.getEtapesByCircuitId(circuit.id);
              if (etapes.length > 0) {
                circuit.etapes = etapes;
              }
            } catch (err: any) {
              console.warn(`⚠️ Impossible de charger les étapes pour le circuit ${circuit.id}:`, err.message);
            }
          }
        } else {
          // Sinon, charger le circuit
          if (typeDemandeName) {
            try {
              circuit = await circuitSuiviService.getCircuitByNomEntite(typeDemandeName);
              if (circuit && circuit.id && (!circuit.etapes || circuit.etapes.length === 0)) {
                try {
                  const etapes = await circuitSuiviService.getEtapesByCircuitId(circuit.id);
                  if (etapes.length > 0) {
                    circuit.etapes = etapes;
                  }
                } catch (err) {
                  console.warn(`⚠️ Impossible de charger les étapes pour le circuit ${circuit.id}:`, err);
                }
              }
            } catch (err) {
              console.warn('⚠️ Impossible de charger le circuit avec typeDemandeName:', err);
            }
          }
          
          if (!circuit && typeDemandeId && typeDemandeId !== 'non_specifie' && typeDemandeId !== 'null' && typeDemandeId !== 'undefined') {
            try {
              const typeDemande = await typeDemandeService.getTypeDemandeById(typeDemandeId);
              if (typeDemande?.name) {
                circuit = await circuitSuiviService.getCircuitByNomEntite(typeDemande.name);
                if (circuit && circuit.id && (!circuit.etapes || circuit.etapes.length === 0)) {
                  try {
                    const etapes = await circuitSuiviService.getEtapesByCircuitId(circuit.id);
                    if (etapes.length > 0) {
                      circuit.etapes = etapes;
                    }
                  } catch (err) {
                    console.warn(`⚠️ Impossible de charger les étapes pour le circuit ${circuit.id}:`, err);
                  }
                }
              }
            } catch (err) {
              if (err && typeof err === 'object' && 'response' in err && (err as any).response?.status !== 404) {
                console.warn('⚠️ Impossible de charger le circuit avec typeDemandeId:', err);
              }
            }
          }
        }

        // Étape 2: Charger les documents de manière asynchrone en parallèle pour tous les dossiers
        // Filtrer les dossiers qui ont été envoyés au CNEDDT pour ne pas charger leur suivi
        const dossiersArray = Array.from(dossiers).filter((dossier) => {
          const storageKey = `cneddt_sent_${dossier.id}`;
          return localStorage.getItem(storageKey) !== 'true';
        });
        
        // Charger tous les dossiers en parallèle pour améliorer les performances
        await Promise.all(
          dossiersArray.map(async (dossier) => {
            try {
              const documents = await circuitSuiviService.getDocumentsByDossier(dossier.id);
              
              const documentsForDossier = documents.filter((doc: any) => {
                return !doc.documentable_id || doc.documentable_id === dossier.id;
              });
              
              const documentsValides = documentsForDossier.filter((d: any) => d.valide).length;

              // Calculer la progression en utilisant la même logique que useEtapeCompletion
              let progress = 0;
              let currentEtape = null;
              let status: 'pending' | 'in_progress' | 'completed' | 'blocked' = 'pending';
              let etapesCompletes = 0;

              if (circuit && circuit.etapes && circuit.etapes.length > 0) {
                const totalEtapes = circuit.etapes.length;
                
                // Fonction pour vérifier si toutes les pièces d'une étape sont validées
                const areAllPiecesValidatedForEtape = (etape: any): boolean => {
                  if (!etape.pieces || etape.pieces.length === 0) {
                    return false;
                  }
                  
                  return etape.pieces.every((piece: any) => {
                    const docsForPiece = documentsForDossier.filter((doc: any) => 
                      doc.piece_justification_id === piece.type_document
                    );
                    return docsForPiece.length > 0 && docsForPiece.some((doc: any) => doc.valide === true);
                  });
                };
                
                // Calculer les étapes complétées en respectant l'ordre (même logique que useEtapeCompletion)
                const completedEtapes = new Set<string>();
                
                for (let idx = 0; idx < circuit.etapes.length; idx++) {
                  const etape = circuit.etapes[idx];
                  
                  // Première étape
                  if (idx === 0) {
                    if (!etape.pieces || etape.pieces.length === 0) {
                      // Étape sans pièces : ne pas marquer automatiquement
                    } else {
                      const allPiecesValidated = areAllPiecesValidatedForEtape(etape);
                      if (allPiecesValidated) {
                        completedEtapes.add(etape.id);
                      }
                    }
                    continue;
                  }
                  
                  // Étapes suivantes
                  const previousEtape = circuit.etapes[idx - 1];
                  if (!previousEtape) {
                    continue;
                  }
                  
                  let previousCompleted = completedEtapes.has(previousEtape.id);
                  
                  if (!previousCompleted) {
                    if (!previousEtape.pieces || previousEtape.pieces.length === 0) {
                      // Étape précédente sans pièces : vérifier récursivement
                      let allBeforeCompleted = true;
                      for (let i = 0; i < idx - 1; i++) {
                        const beforeEtape = circuit.etapes[i];
                        if (!beforeEtape) {
                          allBeforeCompleted = false;
                          break;
                        }
                        if (!completedEtapes.has(beforeEtape.id)) {
                          if (!beforeEtape.pieces || beforeEtape.pieces.length === 0) {
                            let canBeCompleted = true;
                            for (let j = 0; j < i; j++) {
                              const beforeBeforeEtape = circuit.etapes[j];
                              if (!beforeBeforeEtape) {
                                canBeCompleted = false;
                                break;
                              }
                              if (!completedEtapes.has(beforeBeforeEtape.id)) {
                                if (beforeBeforeEtape.pieces && beforeBeforeEtape.pieces.length > 0) {
                                  if (!areAllPiecesValidatedForEtape(beforeBeforeEtape)) {
                                    canBeCompleted = false;
                                    break;
                                  }
                                }
                              }
                            }
                            if (canBeCompleted) {
                              completedEtapes.add(beforeEtape.id);
                            } else {
                              allBeforeCompleted = false;
                              break;
                            }
                          } else {
                            if (areAllPiecesValidatedForEtape(beforeEtape)) {
                              completedEtapes.add(beforeEtape.id);
                            } else {
                              allBeforeCompleted = false;
                              break;
                            }
                          }
                        }
                      }
                      if (allBeforeCompleted) {
                        completedEtapes.add(previousEtape.id);
                        previousCompleted = true;
                      }
                    } else {
                      const previousAllPiecesValidated = areAllPiecesValidatedForEtape(previousEtape);
                      if (previousAllPiecesValidated) {
                        completedEtapes.add(previousEtape.id);
                        previousCompleted = true;
                      }
                    }
                  }
                  
                  if (!previousCompleted) {
                    continue;
                  }
                  
                  // Si l'étape précédente est complétée, vérifier si cette étape peut être complétée
                  if (!etape.pieces || etape.pieces.length === 0) {
                    if (previousCompleted) {
                      completedEtapes.add(etape.id);
                    }
                  } else {
                    const allPiecesValidated = areAllPiecesValidatedForEtape(etape);
                    if (allPiecesValidated) {
                      completedEtapes.add(etape.id);
                    }
                  }
                }
                
                etapesCompletes = completedEtapes.size;
                progress = totalEtapes > 0 ? Math.round((etapesCompletes / totalEtapes) * 100) : 0;
                
                // Trouver l'étape actuelle (première étape non complétée)
                const etapeActuelle = circuit.etapes.find((etape: any) => {
                  return !completedEtapes.has(etape.id);
                });

                currentEtape = etapeActuelle?.libelle || null;
                
                if (progress === 100) {
                  status = 'completed';
                } else if (progress > 0) {
                  status = 'in_progress';
                } else {
                  status = 'pending';
                }
              }

              newSuiviMap.set(dossier.id, {
                dossierId: dossier.id,
                circuit,
                currentEtape,
                progress,
                documentsCount: documentsForDossier.length,
                documentsValides,
                status
              });
            } catch (err: any) {
              console.error(`❌ Erreur lors du chargement du suivi pour dossier ${dossier.id}:`, err);
              newSuiviMap.set(dossier.id, {
                dossierId: dossier.id,
                circuit,
                currentEtape: null,
                progress: 0,
                documentsCount: 0,
                documentsValides: 0,
                status: 'pending'
              });
            }
          })
        );
        
        // Mettre à jour le state une seule fois à la fin pour éviter les re-renders multiples
        setSuiviMap(newSuiviMap);
      } catch (err: any) {
        console.error('❌ Erreur lors du chargement du circuit:', err);
      } finally {
        setLoadingSuivi(false);
      }
    };

    loadSuivi();
  }, [dossiers, typeDemandeName, typeDemandeId, circuitProp]);

  return { suiviMap, loadingSuivi };
}

