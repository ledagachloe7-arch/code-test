import { Box, Typography, Button, Chip } from '@mui/material';
import { InsertDriveFile } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { circuitSuiviService } from '../../../../reception/services/circuit-suivi.service';
import { Dossier } from '../../../types/auto-ecole';
import { TypeDemande } from '../../../types/type-demande';
import { PieceJustificative } from '../types';
import { getEtapeStatus, getPreviousEtape, areAllPiecesValidated } from '../../../../reception/utils/etapeHelpers';
import axiosClient from '../../../../../shared/utils/axiosConfig';
import { referentielService } from '../../../services';
import { getTypeDemandeDisplayName } from '../utils';

interface CircuitToastProps {
  dossier: Dossier;
  typeDemandeCache: Map<string, TypeDemande>;
}

export const showCircuitToast = async ({ dossier, typeDemandeCache }: CircuitToastProps) => {
  // Fermer tous les toasts existants avant d'afficher le nouveau
  toast.dismiss();
  
  try {
    const typeDemande = dossier.type_demande || (dossier.type_demande_id ? typeDemandeCache.get(dossier.type_demande_id) : null);
    const nomEntite = typeDemande?.name || dossier.type_demande?.name;
    
    if (!nomEntite) {
      toast.error('Circuit non trouvé pour ce dossier', { position: 'bottom-center' });
      return;
    }

    const circuit = await circuitSuiviService.getCircuitByNomEntite(nomEntite);
    
    // Afficher le circuit complet dans les logs
    console.log('🔍 CircuitToast - Circuit complet chargé:', {
      circuit: circuit ? {
        id: circuit.id,
        libelle: circuit.libelle,
        nom_entite: circuit.nom_entite,
        created_at: circuit.created_at,
        updated_at: circuit.updated_at,
        etapesCount: circuit.etapes?.length || 0,
        etapes: circuit.etapes?.map(etape => ({
          id: etape.id,
          libelle: etape.libelle,
          code: etape.code,
          ordre: etape.ordre,
          statut_libelle: etape.statut_libelle,
          statut_id: etape.statut_id,
          piecesCount: etape.pieces?.length || 0,
          pieces: etape.pieces?.map(piece => ({
            type_document: piece.type_document,
            libelle: piece.libelle,
            obligatoire: piece.obligatoire
          })) || [],
          roles: etape.roles,
          created_at: etape.created_at,
          updated_at: etape.updated_at
        })) || []
      } : null,
      dossierId: dossier.id,
      dossierTypeDemande: typeDemande?.name || dossier.type_demande?.name,
      nomEntite
    });
    
    if (!circuit) {
      toast.error('Circuit non trouvé', { position: 'bottom-center' });
      return;
    }

    if (!circuit.etapes || circuit.etapes.length === 0) {
      toast.error('Aucune étape trouvée pour ce circuit', { position: 'bottom-center' });
      return;
    }

    // Charger les documents du dossier pour vérifier le statut des pièces
    const allDocuments = await circuitSuiviService.getDocumentsByDossier(dossier.id);
    const filteredDocuments = allDocuments.filter((doc: any) => 
      !doc.documentable_id || doc.documentable_id === dossier.id
    );
    
    // Normaliser les documents avec le mapping localStorage (comme dans CircuitEtapesCard.tsx)
    // IMPORTANT: Le mapping localStorage est la source de vérité pour les documents simulés
    const loadMappingFromStorage = (): Map<string, string> => {
      try {
        const stored = localStorage.getItem('document_piece_mapping');
        if (stored) {
          const parsed = JSON.parse(stored);
          const mapping = new Map<string, string>();
          Object.keys(parsed).forEach(docId => {
            const mappingData = parsed[docId];
            if (mappingData && mappingData.piece_justification_id) {
              mapping.set(docId, mappingData.piece_justification_id);
            }
          });
          return mapping;
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors du chargement du mapping depuis localStorage:', error);
      }
      return new Map<string, string>();
    };
    
    const mapping = loadMappingFromStorage();
    console.log('📋 CircuitToast - Mapping localStorage:', {
      mappingSize: mapping.size,
      mappings: Array.from(mapping.entries()).map(([docId, pieceId]) => ({ docId, pieceId }))
    });
    
    const documents = filteredDocuments.map((doc: any) => {
      // 1. PRIORITÉ: Utiliser le mapping localStorage (source de vérité pour documents simulés)
      const mappedPieceId = doc.id ? mapping.get(doc.id) : null;
      
      // 2. Fallback: Utiliser piece_justification_id de l'API si disponible
      const apiPieceId = doc.piece_justification_id || null;
      
      // Utiliser le mapping en priorité
      const finalPieceId = mappedPieceId || apiPieceId;
      
      if (mappedPieceId && mappedPieceId !== apiPieceId) {
        console.log('🔧 CircuitToast - Utilisation du mapping localStorage:', {
          documentId: doc.id,
          nomFichier: doc.nom_fichier,
          mappedPieceId,
          apiPieceId
        });
      }
      
      return {
        ...doc,
        piece_justification_id: finalPieceId,
        // S'assurer que les documents simulés sont marqués comme validés
        valide: doc.is_simulated ? (doc.valide !== undefined ? doc.valide : true) : doc.valide
      };
    });
    
    console.log('📋 CircuitToast - Documents normalisés:', {
      documentsCount: documents.length,
      documents: documents.map((d: any) => ({
        id: d.id,
        nom: d.nom_fichier,
        piece_justification_id: d.piece_justification_id,
        valide: d.valide,
        is_simulated: d.is_simulated,
        documentable_id: d.documentable_id
      }))
    });
    
    // Charger les types de documents (typeDocuments) pour le calcul du statut
    let typeDocuments: any[] = [];
    try {
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await axiosClient.get('/referentiels', {
          params: {
            page,
            per_page: 100,
            type_ref: 'type_piece'
          }
        });
        const data = response.data?.data || response.data || [];
        const types = Array.isArray(data) ? data : [];
        typeDocuments = [...typeDocuments, ...types];
        hasMore = types.length === 100;
        page++;
      }
    } catch (err) {
      console.error('Erreur lors du chargement des types de documents:', err);
    }
    
    // Charger les pièces justificatives correspondant aux documents normalisés
    // (même logique que EtapeAccordion.tsx)
    const pieceJustificationIds = new Set<string>();
    documents.forEach(doc => {
      if (doc.piece_justification_id && doc.piece_justification_id !== 'N/A') {
        pieceJustificationIds.add(doc.piece_justification_id);
      }
    });
    
    let allPieces: PieceJustificative[] = [];
    if (pieceJustificationIds.size > 0) {
      try {
        const piecesResponse = await axiosClient.get('/pieces-justificatives');
        if (piecesResponse.data) {
          if (Array.isArray(piecesResponse.data)) {
            allPieces = piecesResponse.data;
          } else if (piecesResponse.data.data && Array.isArray(piecesResponse.data.data)) {
            allPieces = piecesResponse.data.data;
          } else if (piecesResponse.data.data && !Array.isArray(piecesResponse.data.data)) {
            allPieces = [piecesResponse.data.data];
          } else {
            allPieces = [piecesResponse.data];
          }
        }
        
        // Filtrer pour ne garder que les pièces dont l'ID correspond aux piece_justification_id des documents
        allPieces = allPieces.filter(piece => pieceJustificationIds.has(piece.id));
      } catch (err) {
        console.error('Erreur lors du chargement des pièces justificatives:', err);
      }
    }
    
    const piecesMap = new Map<string, PieceJustificative>();
    allPieces.forEach(piece => {
      piecesMap.set(piece.id, piece);
    });
    
    console.log('📊 CircuitToast - PiecesJustificativesMap chargée:', {
      totalPieces: piecesMap.size,
      pieces: Array.from(piecesMap.entries()).map(([id, data]) => ({
        id,
        libelle: data.libelle,
        type_document_id: data.type_document_id
      }))
    });
    
    // Charger les étapes complétées depuis localStorage (comme dans useEtapeCompletion)
    const loadCompletedEtapesFromStorage = (dossierId: string): Set<string> => {
      try {
        const stored = localStorage.getItem(`completed_etapes_${dossierId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          return new Set<string>(parsed);
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors du chargement des étapes complétées depuis localStorage:', error);
      }
      return new Set<string>();
    };
    
    // 1. Charger depuis localStorage
    const storedCompleted = loadCompletedEtapesFromStorage(dossier.id);
    
    // 2. Charger depuis le circuit (statut_libelle)
    const completedFromStatut = new Set<string>();
    circuit.etapes.forEach(etape => {
      if (etape.statut_libelle && (
        etape.statut_libelle.toLowerCase().includes('complété') ||
        etape.statut_libelle.toLowerCase().includes('complete') ||
        etape.statut_libelle.toLowerCase().includes('terminé') ||
        etape.statut_libelle.toLowerCase().includes('termine')
      )) {
        completedFromStatut.add(etape.id);
      }
    });
    
    // 3. Vérifier les étapes stockées dans localStorage sont toujours valides
    // (basées sur les documents disponibles) - utiliser areAllPiecesValidated
    // IMPORTANT: Construire d'abord completedEtapes et computedCompletedEtapes temporairement
    // pour areAllPiecesValidated (qui en a besoin pour les étapes sans pièces)
    const tempCompletedFromStatut = new Set<string>();
    circuit.etapes.forEach(etape => {
      if (etape.statut_libelle && (
        etape.statut_libelle.toLowerCase().includes('complété') ||
        etape.statut_libelle.toLowerCase().includes('complete') ||
        etape.statut_libelle.toLowerCase().includes('terminé') ||
        etape.statut_libelle.toLowerCase().includes('termine')
      )) {
        tempCompletedFromStatut.add(etape.id);
      }
    });
    
    const tempCompletedEtapes = new Set([...storedCompleted, ...tempCompletedFromStatut]);
    const tempComputedCompletedEtapes = new Set([...tempCompletedFromStatut, ...tempCompletedEtapes]);
    
    // 3. Vérifier les étapes stockées dans localStorage sont toujours valides
    // PRIORITÉ: Si une étape a un statut_libelle indiquant qu'elle est complétée, elle reste toujours complétée
    // (c'est la source de vérité côté serveur)
    const validatedFromDocuments = new Set<string>();
    if (circuit.etapes && circuit.etapes.length > 0) {
      storedCompleted.forEach(etapeId => {
        const etape = circuit.etapes!.find(e => e.id === etapeId);
        if (etape) {
          // PRIORITÉ ABSOLUE: Si l'étape a un statut_libelle indiquant qu'elle est complétée,
          // elle reste toujours complétée (source de vérité côté serveur)
          const isCompletedFromStatut = etape.statut_libelle && (
            etape.statut_libelle.toLowerCase().includes('complété') ||
            etape.statut_libelle.toLowerCase().includes('complete') ||
            etape.statut_libelle.toLowerCase().includes('terminé') ||
            etape.statut_libelle.toLowerCase().includes('termine')
          );
          
          if (isCompletedFromStatut) {
            // Si l'étape est marquée comme complétée côté serveur, la garder toujours
            validatedFromDocuments.add(etapeId);
            console.log(`✅ CircuitToast - Étape ${etape.libelle} toujours complétée (statut_libelle: ${etape.statut_libelle})`);
          } else if (documents.length > 0) {
            // Sinon, vérifier si toutes les pièces de cette étape sont toujours validées
            const allValidated = areAllPiecesValidated(
              etape,
              documents,
              tempCompletedEtapes,
              tempComputedCompletedEtapes,
              typeDocuments,
              piecesMap
            );
            
            if (allValidated) {
              validatedFromDocuments.add(etapeId);
              console.log(`✅ CircuitToast - Étape ${etape.libelle} toujours complétée (documents validés présents)`);
            } else {
              // Si l'étape n'a pas de statut_libelle complété ET que les documents ne sont pas validés,
              // on peut la retirer UNIQUEMENT si elle a des pièces ET que les documents sont chargés
              // (si les documents ne sont pas encore chargés, on garde l'étape pour éviter de perdre le statut)
              if (!etape.pieces || etape.pieces.length === 0) {
                // Les étapes sans pièces restent complétées si elles étaient dans localStorage
                validatedFromDocuments.add(etapeId);
                console.log(`✅ CircuitToast - Étape ${etape.libelle} sans pièces reste complétée`);
              } else {
                // Pour les étapes avec pièces, on garde le statut si l'étape était dans localStorage
                // (pour éviter de perdre le statut si la vérification échoue temporairement)
                // Seul le statut_libelle côté serveur peut vraiment indiquer si l'étape est complétée
                validatedFromDocuments.add(etapeId);
                console.log(`⚠️ CircuitToast - Étape ${etape.libelle} conservée malgré documents non validés (sera vérifiée au prochain chargement)`);
              }
            }
          } else {
            // Si pas encore de documents chargés, garder l'étape si elle était dans localStorage
            // (pour éviter de perdre le statut pendant le chargement)
            validatedFromDocuments.add(etapeId);
            console.log(`⏳ CircuitToast - Étape ${etape.libelle} conservée (documents en cours de chargement)`);
          }
        } else {
          // Si l'étape n'existe plus dans le circuit, la conserver quand même
          validatedFromDocuments.add(etapeId);
        }
      });
    } else {
      // Si pas encore d'étapes, utiliser celles de localStorage
      storedCompleted.forEach(id => validatedFromDocuments.add(id));
    }
    
    // 4. Vérifier TOUTES les étapes du circuit pour voir si leurs pièces sont validées
    // (pas seulement celles dans localStorage)
    // IMPORTANT: Vérifier que l'étape précédente est complétée avant de marquer une étape comme complétée
    // Utiliser la même logique que dans la boucle d'affichage pour garantir la cohérence
    const validatedFromAllEtapes = new Set<string>();
    if (circuit.etapes && circuit.etapes.length > 0 && documents.length > 0) {
      // Trier les étapes par ordre pour vérifier séquentiellement
      const sortedEtapes = [...circuit.etapes].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
      
      sortedEtapes.forEach(etape => {
        // Vérifier si l'étape précédente est complétée
        const previousEtape = getPreviousEtape(etape, circuit);
        let isPreviousEtapeCompleted = true; // Par défaut, pas d'étape précédente
        
        if (previousEtape) {
          // Vérifier si l'étape précédente est dans les Sets temporaires
          if (tempCompletedEtapes.has(previousEtape.id) || tempComputedCompletedEtapes.has(previousEtape.id)) {
            isPreviousEtapeCompleted = true;
          } else {
            // Vérifier aussi le statut_libelle directement
            const isCompletedFromStatut = previousEtape.statut_libelle && (
              previousEtape.statut_libelle.toLowerCase().includes('complété') ||
              previousEtape.statut_libelle.toLowerCase().includes('complete') ||
              previousEtape.statut_libelle.toLowerCase().includes('terminé') ||
              previousEtape.statut_libelle.toLowerCase().includes('termine')
            );
            isPreviousEtapeCompleted = isCompletedFromStatut || false;
          }
        }
        
        // Si l'étape précédente n'est pas complétée, on ne peut pas marquer cette étape comme complétée
        if (!isPreviousEtapeCompleted) {
          console.log(`⏸️ CircuitToast - Étape ${etape.libelle} ne peut pas être complétée car l'étape précédente n'est pas complétée`);
          return;
        }
        
        let allPiecesValidated = false;
        
        if (etape.pieces && etape.pieces.length > 0) {
          // Utiliser la même logique que dans la boucle d'affichage
          const getDocumentsForPiece = (piece: any) => {
            const pieceJustificationId = piece.type_document;
            
            const dossierDocuments = documents.filter(doc => 
              !doc.documentable_id || doc.documentable_id === dossier.id
            );
            
            // Méthode 1 : par piece_justification_id direct
            const docsByPieceId = dossierDocuments.filter(doc =>
              doc.piece_justification_id && String(doc.piece_justification_id) === String(pieceJustificationId)
            );
            
            if (docsByPieceId.length > 0) {
              return docsByPieceId;
            }
            
            // Méthode 2 : par libellé
            const referentiel = typeDocuments.find(td => td.id === pieceJustificationId);
            const referentielLibelle = referentiel?.libelle || referentiel?.name || null;
            
            if (referentielLibelle) {
              const docsByLibelle = dossierDocuments.filter(doc => {
                if (!doc.piece_justification_id) return false;
                
                const pieceJustificativeData = piecesMap.get(doc.piece_justification_id);
                const docPieceJustificationLibelle = pieceJustificativeData?.libelle || null;
                
                if (docPieceJustificationLibelle && referentielLibelle) {
                  return docPieceJustificationLibelle.toLowerCase().trim() === referentielLibelle.toLowerCase().trim();
                }
                return false;
              });
              
              if (docsByLibelle.length > 0) {
                return docsByLibelle;
              }
            }
            
            // Méthode 3 : Fallback par type_document_id du document
            const docsByTypeDocumentId = dossierDocuments.filter(doc => 
              doc.type_document_id === pieceJustificationId
            );
            
            if (docsByTypeDocumentId.length > 0) {
              return docsByTypeDocumentId;
            }
            
            // Méthode 4 : Fallback par type_document_id de la PieceJustificative
            const piecesWithTypeDocument = Array.from(piecesMap.values()).filter(p => 
              p.type_document_id === pieceJustificationId
            );
            
            if (piecesWithTypeDocument.length > 0) {
              const pieceIds = piecesWithTypeDocument.map(p => p.id);
              return dossierDocuments.filter(doc => 
                doc.piece_justification_id && pieceIds.includes(doc.piece_justification_id)
              );
            }
            
            return [];
          };
          
          const isDocumentValidatedForPiece = (piece: any) => {
            const docs = getDocumentsForPiece(piece);
            return docs.some(doc => doc.valide === true);
          };
          
          // IMPORTANT: Utiliser la même logique que areAllPiecesValidated et getEtapeStatus
          // Filtrer uniquement les pièces où obligatoire === true (pas !== false)
          const piecesObligatoires = etape.pieces.filter((p: any) => p.obligatoire === true);
          
          // Si aucune pièce n'est marquée comme obligatoire, vérifier toutes les pièces
          if (piecesObligatoires.length === 0) {
            // Si aucune pièce n'est obligatoire, vérifier toutes les pièces
            allPiecesValidated = etape.pieces.length > 0 && 
              etape.pieces.every((piece: any) => isDocumentValidatedForPiece(piece));
          } else {
            // Sinon, vérifier seulement les pièces obligatoires
            allPiecesValidated = piecesObligatoires.every((piece: any) => isDocumentValidatedForPiece(piece));
          }
        } else {
          // Si pas de pièces, utiliser areAllPiecesValidated
          allPiecesValidated = areAllPiecesValidated(
            etape,
            documents,
            tempCompletedEtapes,
            tempComputedCompletedEtapes,
            typeDocuments,
            piecesMap
          );
        }
        
        // IMPORTANT: Utiliser aussi areAllPiecesValidated pour vérifier la cohérence
        // même si on a déjà calculé allPiecesValidated manuellement
        // Cela garantit que la logique est la même partout
        const allPiecesValidatedByHelper = areAllPiecesValidated(
          etape,
          documents,
          tempCompletedEtapes,
          tempComputedCompletedEtapes,
          typeDocuments,
          piecesMap
        );
        
        // Utiliser le résultat de areAllPiecesValidated si différent (plus fiable)
        if (allPiecesValidated !== allPiecesValidatedByHelper) {
          console.log(`⚠️ CircuitToast - Incohérence détectée dans la détection initiale pour ${etape.libelle}:`, {
            manual: allPiecesValidated,
            helper: allPiecesValidatedByHelper,
            usingHelper: true
          });
          allPiecesValidated = allPiecesValidatedByHelper;
        }
        
        // IMPORTANT: Vérifier que l'étape précédente est complétée ET que toutes les pièces sont validées
        if (allPiecesValidated && isPreviousEtapeCompleted) {
          validatedFromAllEtapes.add(etape.id);
          // Mettre à jour les Sets temporaires pour les prochaines itérations
          tempCompletedEtapes.add(etape.id);
          tempComputedCompletedEtapes.add(etape.id);
          console.log(`✅ CircuitToast - Étape détectée comme complétée (toutes pièces validées et étape précédente complétée): ${etape.libelle} (${etape.id})`);
        } else if (allPiecesValidated && !isPreviousEtapeCompleted) {
          console.log(`⏸️ CircuitToast - Étape ${etape.libelle} a toutes ses pièces validées mais l'étape précédente n'est pas complétée`);
        }
      });
    }
    
    // 5. Fusionner toutes les sources (localStorage validées + circuit statut + toutes étapes validées)
    const completedEtapes = new Set([...validatedFromDocuments, ...completedFromStatut, ...validatedFromAllEtapes]);
    
    // Charger les informations du référentiel et du type de demande pour l'affichage
    let referentielName: string | null = null;
    const referencielId = (dossier as any).referenciel_id;
    if (referencielId) {
      try {
        const referentiel = await referentielService.getReferentielById(referencielId);
        referentielName = referentiel?.libelle || referentiel?.code || null;
      } catch (err) {
        console.warn('⚠️ Erreur lors du chargement du référentiel:', err);
      }
    }
    
    // Obtenir le nom du type de demande depuis le cache
    const typeDemandeName = dossier.type_demande?.name || 
                           (dossier.type_demande_id ? typeDemandeCache.get(dossier.type_demande_id)?.name : null) ||
                           null;
    
    // 6. Calculer computedCompletedEtapes (comme dans useEtapeCompletion)
    // D'abord, calculer depuis statut_libelle uniquement (comme getCompletedEtapesForDossier)
    const computedFromStatut = new Set<string>();
    circuit.etapes.forEach(etape => {
      if (etape.statut_libelle && (
        etape.statut_libelle.toLowerCase().includes('complété') ||
        etape.statut_libelle.toLowerCase().includes('complete') ||
        etape.statut_libelle.toLowerCase().includes('terminé') ||
        etape.statut_libelle.toLowerCase().includes('termine')
      )) {
        computedFromStatut.add(etape.id);
      }
    });
    
    // Fusionner avec completedEtapes (comme dans useEtapeCompletion ligne 177)
    const computedCompletedEtapes = new Set([...computedFromStatut, ...completedEtapes]);
    
    // IMPORTANT: Sauvegarder les étapes complétées dans localStorage (même clé que useEtapeCompletion)
    // Cela permet de persister les étapes détectées automatiquement comme complétées
    if (dossier.id && (validatedFromAllEtapes.size > 0 || completedEtapes.size > 0)) {
      try {
        const array = Array.from(computedCompletedEtapes);
        localStorage.setItem(`completed_etapes_${dossier.id}`, JSON.stringify(array));
        console.log(`💾 CircuitToast - Étapes complétées sauvegardées dans localStorage pour dossier ${dossier.id}:`, array.length, array);
      } catch (error) {
        console.warn('⚠️ CircuitToast - Erreur lors de la sauvegarde des étapes complétées dans localStorage:', error);
      }
    }
    
    // Vérifier si la dernière étape est complétée
    const etapes = circuit.etapes || [];
    const sortedEtapes = [...etapes].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    const lastEtape = sortedEtapes.length > 0 ? sortedEtapes[sortedEtapes.length - 1] : null;
    const isLastEtapeCompleted = lastEtape && (
      computedCompletedEtapes.has(lastEtape.id) || 
      completedEtapes.has(lastEtape.id) ||
      (lastEtape.statut_libelle && (
        lastEtape.statut_libelle.toLowerCase().includes('complété') ||
        lastEtape.statut_libelle.toLowerCase().includes('complete') ||
        lastEtape.statut_libelle.toLowerCase().includes('terminé') ||
        lastEtape.statut_libelle.toLowerCase().includes('termine')
      ))
    );
    
    // Si la dernière étape est complétée, mettre à jour le statut du dossier à "transmis" (Envoyer au CNEDDT)
    if (isLastEtapeCompleted && lastEtape) {
      // Vérifier si toutes les pièces de la dernière étape sont validées
      let allLastEtapePiecesValidated = false;
      if (lastEtape.pieces && lastEtape.pieces.length > 0) {
        const getDocumentsForPiece = (piece: any) => {
          const pieceJustificationId = piece.type_document;
          const docsByPiece = documents.filter(doc => 
            doc.piece_justification_id === pieceJustificationId &&
            (!doc.documentable_id || doc.documentable_id === dossier.id)
          );
          if (docsByPiece.length > 0) {
            return docsByPiece;
          }
          return documents.filter(doc => 
            doc.type_document_id === pieceJustificationId &&
            (!doc.documentable_id || doc.documentable_id === dossier.id)
          );
        };
        
        const isDocumentValidatedForPiece = (piece: any) => {
          const docs = getDocumentsForPiece(piece);
          return docs.some(doc => doc.valide === true);
        };
        
        // IMPORTANT: Utiliser la même logique que areAllPiecesValidated et getEtapeStatus
        // Filtrer uniquement les pièces où obligatoire === true (pas !== false)
        const piecesObligatoires = lastEtape.pieces.filter((p: any) => p.obligatoire === true);
        
        // Si aucune pièce n'est marquée comme obligatoire, vérifier toutes les pièces
        if (piecesObligatoires.length === 0) {
          // Si aucune pièce n'est obligatoire, vérifier toutes les pièces
          allLastEtapePiecesValidated = lastEtape.pieces.length > 0 && 
            lastEtape.pieces.every((piece: any) => isDocumentValidatedForPiece(piece));
        } else {
          // Sinon, vérifier seulement les pièces obligatoires
          allLastEtapePiecesValidated = piecesObligatoires.every((piece: any) => isDocumentValidatedForPiece(piece));
        }
      } else {
        // Si pas de pièces, utiliser areAllPiecesValidated
        allLastEtapePiecesValidated = areAllPiecesValidated(
          lastEtape,
          documents,
          completedEtapes,
          computedCompletedEtapes,
          typeDocuments,
          piecesMap
        );
      }
      
      // Si toutes les pièces de la dernière étape sont validées, mettre à jour le statut via l'API
      // Note: L'API n'accepte que: en_attente, en_cours, valide, rejete
      // On utilise 'valide' pour l'API, mais on met à jour le cache local avec 'transmis' pour afficher "Envoyer au CNEDDT"
      if (allLastEtapePiecesValidated) {
        try {
          console.log('✅ CircuitToast - Dernière étape complétée, mise à jour du statut du dossier à "valide" via l\'API');
          
          // Mettre à jour le statut via l'API avec 'valide' (statut accepté par l'API)
          await circuitSuiviService.updateDossierStatut(dossier.id, 'valide');
          
          // Mettre à jour le cache local avec 'transmis' pour l'affichage "Envoyer au CNEDDT"
          // Utiliser 'transmis' pour le cache qui sera traduit en "Envoyer au CNEDDT" par getStatutLabel
          window.dispatchEvent(new CustomEvent('dossierStatusUpdated', {
            detail: {
              dossierId: dossier.id,
              newStatus: 'transmis' // Utiliser 'transmis' qui sera traduit en "Envoyer au CNEDDT" par getStatutLabel
            }
          }));
          
          console.log('✅ CircuitToast - Statut du dossier mis à jour via l\'API (valide) et dans le cache local (transmis) avec succès');
        } catch (error: any) {
          console.error('❌ CircuitToast - Erreur lors de la mise à jour du statut du dossier:', error);
          // Ne pas bloquer l'affichage du toast en cas d'erreur
        }
      }
    }
    
    // Log pour déboguer les Sets calculés
    console.log('🔍 CircuitToast - Sets d\'étapes complétées calculés:', {
      storedCompletedSize: storedCompleted.size,
      storedCompleted: Array.from(storedCompleted),
      validatedFromDocumentsSize: validatedFromDocuments.size,
      validatedFromDocuments: Array.from(validatedFromDocuments),
      validatedFromAllEtapesSize: validatedFromAllEtapes.size,
      validatedFromAllEtapes: Array.from(validatedFromAllEtapes),
      completedFromStatutSize: completedFromStatut.size,
      completedFromStatut: Array.from(completedFromStatut),
      completedEtapesSize: completedEtapes.size,
      completedEtapes: Array.from(completedEtapes),
      computedFromStatutSize: computedFromStatut.size,
      computedFromStatut: Array.from(computedFromStatut),
      computedCompletedEtapesSize: computedCompletedEtapes.size,
      computedCompletedEtapes: Array.from(computedCompletedEtapes),
      lastEtapeId: lastEtape?.id,
      lastEtapeLibelle: lastEtape?.libelle,
      isLastEtapeCompleted,
      documentsCount: documents.length,
      documentsNormalized: documents.map((d: any) => ({
        id: d.id,
        nom: d.nom_fichier,
        piece_justification_id: d.piece_justification_id,
        valide: d.valide,
        is_simulated: d.is_simulated
      }))
    });
    
    const timelineItems: Array<{
      type: 'etape' | 'piece';
      data: any;
      etapeIndex: number;
      pieceIndex?: number;
    }> = [];
    
    etapes.forEach((etape, etapeIndex) => {
      timelineItems.push({
        type: 'etape',
        data: etape,
        etapeIndex,
      });
      
      if (etape.pieces && etape.pieces.length > 0) {
        etape.pieces.forEach((piece: any, pieceIndex: number) => {
          timelineItems.push({
            type: 'piece',
            data: piece,
            etapeIndex,
            pieceIndex,
          });
        });
      }
    });
    
    const etapesContent = timelineItems.map((item) => {
      if (item.type === 'etape') {
        const etape = item.data;
        
        // Calculer si l'étape précédente est complétée (même logique que CircuitEtapesCard.tsx)
        const previousEtape = getPreviousEtape(etape, circuit);
        let isPreviousEtapeCompleted: boolean = true; // Par défaut, pas d'étape précédente
        
        if (previousEtape) {
          // Vérifier d'abord si l'étape précédente est dans les Sets
          if (computedCompletedEtapes.has(previousEtape.id) || completedEtapes.has(previousEtape.id)) {
            isPreviousEtapeCompleted = true;
          } else {
            // Vérifier aussi le statut_libelle directement
            const isCompletedFromStatut = previousEtape.statut_libelle && (
              previousEtape.statut_libelle.toLowerCase().includes('complété') ||
              previousEtape.statut_libelle.toLowerCase().includes('complete') ||
              previousEtape.statut_libelle.toLowerCase().includes('terminé') ||
              previousEtape.statut_libelle.toLowerCase().includes('termine')
            );
            isPreviousEtapeCompleted = isCompletedFromStatut || false;
          }
        }
        
        // Vérifier si l'étape est complétée (même logique que CircuitEtapesCard.tsx ligne 627)
        // PRIORITÉ: Vérifier d'abord le statut_libelle de l'étape elle-même (source de vérité côté serveur)
        const isCompletedFromStatut = etape.statut_libelle && (
          etape.statut_libelle.toLowerCase().includes('complété') ||
          etape.statut_libelle.toLowerCase().includes('complete') ||
          etape.statut_libelle.toLowerCase().includes('terminé') ||
          etape.statut_libelle.toLowerCase().includes('termine')
        );
        const isEtapeCompleted = isCompletedFromStatut || 
                                  computedCompletedEtapes.has(etape.id) || 
                                  completedEtapes.has(etape.id);
        
        // Vérifier si toutes les pièces justificatives de l'étape sont validées
        // Utiliser la même logique que ReceptionCandidatDetailsPage.tsx (isDocumentValidatedForPiece)
        let allPiecesValidated = false;
        let piecesValidationStatus: any[] = [];
        
        if (etape.pieces && etape.pieces.length > 0) {
          // Fonction pour obtenir les documents d'une pièce (même logique que EtapeAccordion.tsx)
          const getDocumentsForPiece = (piece: any) => {
            const pieceJustificationId = piece.type_document; // C'est le type_document_id (Referentiel.id)
            
            // Filtrer les documents du dossier actuel
            const dossierDocuments = documents.filter(doc => 
              !doc.documentable_id || doc.documentable_id === dossier.id
            );
            
            // Méthode 1 : par piece_justification_id direct
            const docsByPieceId = dossierDocuments.filter(doc => 
              doc.piece_justification_id && String(doc.piece_justification_id) === String(pieceJustificationId)
            );
            
            if (docsByPieceId.length > 0) {
              return docsByPieceId;
            }
            
            // Méthode 2 : par libellé (comme EtapeAccordion.tsx)
            // Récupérer le Referentiel correspondant à pieceJustificationId (qui est le type_document_id)
            const referentiel = typeDocuments.find(td => td.id === pieceJustificationId);
            const referentielLibelle = referentiel?.libelle || referentiel?.name || null;
            
            if (referentielLibelle) {
              // Chercher les documents dont la PieceJustificative a le même libellé que le Referentiel
              const docsByLibelle = dossierDocuments.filter(doc => {
                if (!doc.piece_justification_id) return false;
                
                // Récupérer la PieceJustificative depuis piecesMap
                const pieceJustificativeData = piecesMap.get(doc.piece_justification_id);
                const docPieceJustificationLibelle = pieceJustificativeData?.libelle || null;
                
                // Comparaison par libellé : PieceJustificative.libelle === Referentiel.libelle
                if (docPieceJustificationLibelle && referentielLibelle) {
                  const matches = docPieceJustificationLibelle.toLowerCase().trim() === referentielLibelle.toLowerCase().trim();
                  
                  if (matches) {
                    console.log('✅ CircuitToast - Document trouvé par libellé:', {
                      pieceTypeDocument: pieceJustificationId,
                      pieceLibelle: piece.libelle,
                      docId: doc.id,
                      docNom: doc.nom_fichier,
                      docPieceJustificationLibelle: docPieceJustificationLibelle,
                      referentielLibelle: referentielLibelle,
                      docPieceId: doc.piece_justification_id
                    });
                  }
                  
                  return matches;
                }
                
                return false;
              });
              
              if (docsByLibelle.length > 0) {
                return docsByLibelle;
              }
            }
            
            // Méthode 3 : Fallback par type_document_id du document
            const docsByTypeDocumentId = dossierDocuments.filter(doc => 
              doc.type_document_id === pieceJustificationId
            );
            
            if (docsByTypeDocumentId.length > 0) {
              return docsByTypeDocumentId;
            }
            
            // Méthode 4 : Fallback par type_document_id de la PieceJustificative
            // Chercher toutes les PieceJustificative qui ont ce type_document_id
            const piecesWithTypeDocument = Array.from(piecesMap.values()).filter(p => 
              p.type_document_id === pieceJustificationId
            );
            
            if (piecesWithTypeDocument.length > 0) {
              const pieceIds = piecesWithTypeDocument.map(p => p.id);
              return dossierDocuments.filter(doc => 
                doc.piece_justification_id && pieceIds.includes(doc.piece_justification_id)
              );
            }
            
            return [];
          };
          
          // Fonction pour vérifier si un document est validé pour une pièce (même logique que useReceptionCandidatDetails)
          const isDocumentValidatedForPiece = (piece: any) => {
            const docs = getDocumentsForPiece(piece);
            return docs.some(doc => doc.valide === true);
          };
          
          piecesValidationStatus = etape.pieces.map((piece: any) => {
            const docsForPiece = getDocumentsForPiece(piece);
            const isValidated = isDocumentValidatedForPiece(piece);
            
            // Log détaillé pour déboguer
            if (docsForPiece.length === 0) {
              console.log(`❌ CircuitToast - Aucun document trouvé pour pièce:`, {
                pieceLibelle: piece.libelle,
                pieceTypeDocument: piece.type_document,
                etapeId: etape.id,
                etapeLibelle: etape.libelle,
                totalDocuments: documents.length,
                documentsWithPieceIds: documents.map(d => ({
                  id: d.id,
                  nom: d.nom_fichier,
                  piece_justification_id: d.piece_justification_id,
                  type_document_id: d.type_document_id,
                  documentable_id: d.documentable_id,
                  valide: d.valide
                })),
                referentiel: typeDocuments.find(td => td.id === piece.type_document),
                piecesMapHasPiece: Array.from(piecesMap.entries()).map(([id, data]) => ({
                  id,
                  libelle: data.libelle,
                  type_document_id: data.type_document_id
                }))
              });
            }
            
            return {
              pieceLibelle: piece.libelle,
              pieceTypeDocument: piece.type_document,
              obligatoire: piece.obligatoire,
              docsCount: docsForPiece.length,
              isValidated,
              documents: docsForPiece.map((d: any) => ({
                id: d.id,
                nom: d.nom_fichier,
                piece_justification_id: d.piece_justification_id,
                valide: d.valide,
                is_simulated: d.is_simulated
              }))
            };
          });
          
          // Vérifier si toutes les pièces obligatoires sont validées
          // IMPORTANT: Utiliser la même logique que areAllPiecesValidated et getEtapeStatus
          // Filtrer uniquement les pièces où obligatoire === true (pas !== false)
          const piecesObligatoires = piecesValidationStatus.filter(p => p.obligatoire === true);
          
          // Si aucune pièce n'est marquée comme obligatoire, vérifier toutes les pièces
          if (piecesObligatoires.length === 0) {
            // Si aucune pièce n'est obligatoire, vérifier toutes les pièces
            allPiecesValidated = piecesValidationStatus.length > 0 && 
              piecesValidationStatus.every(p => p.isValidated === true);
          } else {
            // Sinon, vérifier seulement les pièces obligatoires
            allPiecesValidated = piecesObligatoires.every(p => p.isValidated === true);
          }
          
          console.log(`🔍 CircuitToast - Validation des pièces pour ${etape.libelle}:`, {
            etapeId: etape.id,
            allPiecesValidated,
            piecesCount: etape.pieces.length,
            piecesObligatoiresCount: piecesObligatoires.length,
            piecesValidationStatus
          });
        } else {
          // Si pas de pièces, utiliser areAllPiecesValidated
          allPiecesValidated = areAllPiecesValidated(
            etape,
            documents,
            completedEtapes,
            computedCompletedEtapes,
            typeDocuments,
            piecesMap
          );
        }
        
        // IMPORTANT: Utiliser aussi areAllPiecesValidated pour vérifier la cohérence
        // même si on a déjà calculé allPiecesValidated manuellement
        // Cela garantit que la logique est la même partout
        const allPiecesValidatedByHelper = areAllPiecesValidated(
          etape,
          documents,
          completedEtapes,
          computedCompletedEtapes,
          typeDocuments,
          piecesMap
        );
        
        // Utiliser le résultat de areAllPiecesValidated si différent (plus fiable)
        if (allPiecesValidated !== allPiecesValidatedByHelper) {
          console.log(`⚠️ CircuitToast - Incohérence détectée pour ${etape.libelle}:`, {
            manual: allPiecesValidated,
            helper: allPiecesValidatedByHelper,
            usingHelper: true
          });
          allPiecesValidated = allPiecesValidatedByHelper;
        }
        
        // IMPORTANT: PRIORITÉ ABSOLUE - Si l'étape est dans completedEtapes ou computedCompletedEtapes,
        // elle est complétée indépendamment de la validation des pièces
        // (c'est la source de vérité - l'étape a été marquée comme complétée via le bouton)
        let etapeStatus;
        if (isEtapeCompleted) {
          // L'étape est déjà marquée comme complétée (dans les Sets ou via statut_libelle)
          etapeStatus = {
            status: 'completed',
            label: 'Complétée',
            color: 'success'
          };
        } else if (allPiecesValidated && isPreviousEtapeCompleted) {
          // Si toutes les pièces sont validées ET l'étape précédente est complétée,
          // l'étape peut être considérée comme complétée
          etapeStatus = {
            status: 'completed',
            label: 'Complétée',
            color: 'success'
          };
        } else {
          // Utiliser getEtapeStatus pour obtenir le statut correct (même logique que CircuitEtapesCard.tsx)
          etapeStatus = getEtapeStatus(
            etape,
            isPreviousEtapeCompleted,
            computedCompletedEtapes,
            completedEtapes,
            documents
          );
        }
        
        // Log pour déboguer le calcul du statut
        console.log(`🔍 CircuitToast - Calcul statut étape ${etape.libelle}:`, {
          etapeId: etape.id,
          etapeLibelle: etape.libelle,
          statut_libelle: etape.statut_libelle,
          isPreviousEtapeCompleted,
          isEtapeCompleted,
          allPiecesValidated,
          isInCompletedEtapes: completedEtapes.has(etape.id),
          isInComputedCompletedEtapes: computedCompletedEtapes.has(etape.id),
          etapeStatusResult: etapeStatus,
          documentsCount: documents.length,
          documentsForEtape: documents.filter((d: any) => d.etape_id === etape.id).length
        });
        
        // Adapter les couleurs et labels selon le statut
        let statusColor: string;
        let statusLabel: string;
        
        switch (etapeStatus.status) {
          case 'completed':
            statusColor = '#4caf50';
            statusLabel = etapeStatus.label || 'Complétée';
            break;
          case 'in_progress':
            statusColor = '#ff9800';
            statusLabel = etapeStatus.label || 'En cours';
            break;
          case 'pending':
          default:
            statusColor = '#9e9e9e';
            statusLabel = etapeStatus.label || 'En attente';
            break;
        }
        
        const isCompleted = etapeStatus.status === 'completed';
        
        return (
          <Box
            key={`etape-${etape.id}`}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              flex: 1,
              minWidth: 0,
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: statusColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                position: 'relative',
                border: '2px solid white',
                boxShadow: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                }}
              >
                {item.etapeIndex + 1}
              </Typography>
            </Box>
            
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                textAlign: 'center',
                mt: 1,
                mb: 0.5,
                fontWeight: isCompleted ? 'bold' : 'normal',
                color: isCompleted ? 'text.primary' : 'text.secondary',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={etape.libelle || etape.code || 'Étape sans nom'}
            >
              {etape.libelle || etape.code || 'Étape sans nom'}
            </Typography>
            
            <Chip
              label={statusLabel}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                backgroundColor: statusColor,
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          </Box>
        );
      } else {
        const piece = item.data;
        let pieceData = piecesMap.get(piece.type_document);
        if (!pieceData) {
          for (const [, pieceItem] of piecesMap.entries()) {
            if (pieceItem.type_document_id === piece.type_document) {
              pieceData = pieceItem;
              break;
            }
          }
        }
        const pieceLibelle = pieceData?.libelle || piece.libelle || 'Pièce justificative';
        
        const pieceJustificationId = piece.type_document;
        
        let pieceDocuments = documents.filter((doc: any) => {
          if (doc.piece_justification_id === pieceJustificationId) {
            return true;
          }
          if (pieceData && doc.piece_justification_id === pieceData.id) {
            return true;
          }
          return false;
        });
        
        if (pieceDocuments.length === 0 && pieceData?.type_document_id) {
          pieceDocuments = documents.filter((doc: any) => {
            return doc.type_document_id === pieceData.type_document_id;
          });
        }
        
        const isPieceValidated = pieceDocuments.some((doc: any) => doc.valide === true);
        const hasPieceDocument = pieceDocuments.length > 0;
        
        const pieceStatusColor = isPieceValidated ? '#4caf50' : (hasPieceDocument ? '#ff9800' : '#9e9e9e');
        const pieceStatusLabel = isPieceValidated ? 'Validée' : (hasPieceDocument ? 'En attente' : 'Manquante');
        
        return (
          <Box
            key={`piece-${piece.type_document}-${item.etapeIndex}-${item.pieceIndex}`}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              flex: 0.5,
              minWidth: 80,
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 0.5,
                zIndex: 2,
                position: 'relative',
              }}
            >
              <InsertDriveFile
                sx={{
                  fontSize: 16,
                  color: pieceStatusColor,
                  opacity: 0.8,
                }}
              />
            </Box>
            
            <Box
              sx={{
                width: 1.5,
                height: 12,
                backgroundColor: pieceStatusColor,
                opacity: 0.6,
                mb: 0.5,
                position: 'relative',
                zIndex: 1,
              }}
            />
            
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: pieceStatusColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                position: 'relative',
                border: '1px solid white',
                boxShadow: 1,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'white',
                }}
              />
            </Box>
            
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.65rem',
                textAlign: 'center',
                mt: 0.5,
                mb: 0.25,
                color: 'text.secondary',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={pieceLibelle}
            >
              {pieceLibelle}
            </Typography>
            
            <Chip
              label={pieceStatusLabel}
              size="small"
              sx={{
                height: 16,
                fontSize: '0.6rem',
                backgroundColor: pieceStatusColor,
                color: 'white',
                fontWeight: 'normal',
              }}
            />
          </Box>
        );
      }
    });

    toast.custom(
      (t) => (
        <Box
          sx={{
            backgroundColor: 'white',
            paddingTop: 2,
            paddingBottom: 2,
            paddingLeft: 5,
            paddingRight: 5,
            borderRadius: 0,
            boxShadow: 6,
            width: 'calc(100vw - 32px)',
            maxWidth: 'none',
            margin: '0 16px',
            marginLeft: 'calc(-50vw + 50% + 16px)',
            marginRight: 'calc(-50vw + 50% + 16px)',
            animation: t.visible
              ? 'slideUp 0.3s ease-out forwards'
              : 'slideDown 0.3s ease-in forwards',
            '@keyframes slideUp': {
              '0%': {
                transform: 'translateY(100%)',
                opacity: 0,
              },
              '100%': {
                transform: 'translateY(0)',
                opacity: 1,
              },
            },
            '@keyframes slideDown': {
              '0%': {
                transform: 'translateY(0)',
                opacity: 1,
              },
              '100%': {
                transform: 'translateY(100%)',
                opacity: 0,
              },
            },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Circuit: {circuit.libelle || circuit.nom_entite || 'N/A'}
            </Typography>
            <Button
              size="small"
              onClick={() => toast.dismiss(t.id)}
              sx={{ minWidth: 'auto', p: 0.5 }}
            >
              ✕
            </Button>
          </Box>
          
          {/* Informations du dossier */}
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1.5, 
            mb: 2, 
            p: 1.5, 
            bgcolor: 'grey.50', 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            {typeDemandeName && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Type de demande:
                </Typography>
                <Chip 
                  label={getTypeDemandeDisplayName(typeDemandeName)} 
                  size="small" 
                  variant="outlined"
                  color="primary"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            )}
            {referentielName && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Référentiel:
                </Typography>
                <Chip 
                  label={referentielName} 
                  size="small" 
                  variant="outlined"
                  color="secondary"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            )}
            {(dossier as any).numero_permis && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Numéro permis:
                </Typography>
                <Chip 
                  label={(dossier as any).numero_permis} 
                  size="small" 
                  variant="outlined"
                  color="primary"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            )}
            {(dossier as any).numero_origine_permis && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Numéro origine permis:
                </Typography>
                <Chip 
                  label={(dossier as any).numero_origine_permis} 
                  size="small" 
                  variant="outlined"
                  color="secondary"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
            )}
          </Box>
          
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Statut des étapes et pièces justificatives ({timelineItems.length} élément(s))
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              position: 'relative',
              pb: 2,
              overflowX: 'auto',
              gap: 0,
              '&::-webkit-scrollbar': {
                height: 6,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: 3,
              },
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: '#e0e0e0',
                zIndex: 0,
              }}
            />
            {etapesContent}
          </Box>
        </Box>
      ),
      {
        position: 'bottom-center',
        duration: Infinity,
      }
    );
  } catch (err: any) {
    console.error('Erreur lors du chargement du circuit pour le toast:', err);
    toast.error('Erreur lors du chargement des informations du circuit', { position: 'bottom-center' });
  }
};

