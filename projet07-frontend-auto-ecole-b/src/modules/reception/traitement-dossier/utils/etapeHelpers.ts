import { EtapeCircuit, CircuitSuivi } from '../services/circuit-suivi.api';
import { EtapeStatus } from '../types/circuit-etapes.types';

/**
 * Obtient l'étape précédente dans le circuit
 */
export const getPreviousEtape = (
  currentEtape: EtapeCircuit,
  circuit: CircuitSuivi | null
): EtapeCircuit | null => {
  if (!circuit || !circuit.etapes || circuit.etapes.length === 0) {
    return null;
  }

  const currentIndex = circuit.etapes.findIndex(e => e.id === currentEtape.id);
  if (currentIndex === -1 || currentIndex === 0) {
    return null;
  }

  return circuit.etapes[currentIndex - 1];
};

/**
 * Obtient l'étape suivante dans le circuit
 */
export const getNextEtape = (
  currentEtape: EtapeCircuit,
  circuit: CircuitSuivi | null
): EtapeCircuit | null => {
  if (!circuit || !circuit.etapes || circuit.etapes.length === 0) {
    return null;
  }

  const currentIndex = circuit.etapes.findIndex(e => e.id === currentEtape.id);
  if (currentIndex === -1 || currentIndex === circuit.etapes.length - 1) {
    return null;
  }

  return circuit.etapes[currentIndex + 1];
};

/**
 * Vérifie si toutes les pièces d'une étape sont validées
 * Utilise la corrélation par libellé entre PieceJustificative et Referentiel
 */
export const areAllPiecesValidated = (
  etape: EtapeCircuit,
  documentsForCurrentDossier: any[],
  completedEtapes: Set<string>,
  computedCompletedEtapes: Set<string>,
  typeDocuments: any[] = [],
  piecesJustificativesMap: Map<string, any> = new Map()
): boolean => {
  // Les étapes sans pièces ne sont pas automatiquement considérées comme validées
  if (!etape.pieces || etape.pieces.length === 0) {
    return completedEtapes.has(etape.id) || computedCompletedEtapes.has(etape.id);
  }

  // Vérifier que toutes les pièces ont au moins un document validé
  const allValidated = etape.pieces.every(piece => {
    const pieceTypeDocument = piece.type_document; // C'est le type_document_id (référentiel)
    
    // Récupérer le Referentiel correspondant à pieceTypeDocument pour obtenir son libelle
    const referentiel = typeDocuments.find(td => td.id === pieceTypeDocument);
    const referentielLibelle = referentiel?.libelle || referentiel?.name || null;
    
    if (!referentielLibelle) {
      // Si on ne trouve pas le référentiel, fallback sur l'ancienne logique
      const docsForPiece = documentsForCurrentDossier.filter(doc => 
        doc.piece_justification_id === pieceTypeDocument || doc.type_document_id === pieceTypeDocument
      );
      return docsForPiece.length > 0 && docsForPiece.some(doc => doc.valide === true);
    }
    
    // Trouver les documents qui correspondent à cette pièce
    const docsForPiece = documentsForCurrentDossier.filter(doc => {
      // Filtrer par etape_id si disponible (optimisation)
      if (doc.etape_id && doc.etape_id !== etape.id) {
        return false; // Le document appartient à une autre étape
      }
      
      // Utiliser directement piece_justification_id
      const docPieceId = doc.piece_justification_id;
      
      // Pour les documents simulés, vérifier directement par piece_justification_id
      // car ils ont déjà le bon ID depuis le mapping localStorage
      if (doc.is_simulated && docPieceId) {
        // Pour les documents simulés, piece.type_document peut être soit:
        // 1. L'ID de la PieceJustificative (pieceJustificationId)
        // 2. Le type_document_id (référentiel)
        // On vérifie d'abord par piece_justification_id direct
        if (String(docPieceId) === String(pieceTypeDocument)) {
          return true;
        }
      }
      
      // Récupérer les données de la PieceJustificative depuis la map
      const pieceJustificativeData = docPieceId ? piecesJustificativesMap.get(docPieceId) : null;
      const docPieceJustificationLibelle = pieceJustificativeData?.libelle || null;
      
      // Comparaison par libelle : PieceJustificative.libelle === Referentiel.libelle
      if (docPieceJustificationLibelle && referentielLibelle && 
          docPieceJustificationLibelle.toLowerCase().trim() === referentielLibelle.toLowerCase().trim()) {
        return true;
      }
      
      // Fallback: Comparaison directe par piece_justification_id ou type_document_id
      if (docPieceId && (String(docPieceId) === String(pieceTypeDocument) || 
          doc.type_document_id === pieceTypeDocument)) {
        return true;
      }
      
      return false;
    });
    
    return docsForPiece.length > 0 && docsForPiece.some(doc => doc.valide === true);
  });

  return allValidated;
};

/**
 * Vérifie si toutes les pièces obligatoires d'une étape sont validées.
 * Les pièces non obligatoires (ex. pièce justificative optionnelle) ne bloquent pas.
 * Utilisé pour activer "Passer à l'étape suivante" quand seules les pièces obligatoires sont requises.
 */
export const areAllMandatoryPiecesValidated = (
  etape: EtapeCircuit,
  documentsForCurrentDossier: any[],
  completedEtapes: Set<string>,
  computedCompletedEtapes: Set<string>,
  typeDocuments: any[] = [],
  piecesJustificativesMap: Map<string, any> = new Map()
): boolean => {
  if (!etape.pieces || etape.pieces.length === 0) {
    return completedEtapes.has(etape.id) || computedCompletedEtapes.has(etape.id);
  }

  const mandatoryPieces = etape.pieces.filter(p => p.obligatoire);
  if (mandatoryPieces.length === 0) {
    return true;
  }

  return mandatoryPieces.every(piece => {
    const pieceTypeDocument = piece.type_document;
    const referentiel = typeDocuments.find(td => td.id === pieceTypeDocument);
    const referentielLibelle = referentiel?.libelle || referentiel?.name || null;

    if (!referentielLibelle) {
      const docsForPiece = documentsForCurrentDossier.filter(doc =>
        doc.piece_justification_id === pieceTypeDocument || doc.type_document_id === pieceTypeDocument
      );
      return docsForPiece.length > 0 && docsForPiece.some(doc => doc.valide === true);
    }

    const docsForPiece = documentsForCurrentDossier.filter(doc => {
      if (doc.etape_id && doc.etape_id !== etape.id) return false;
      const docPieceId = doc.piece_justification_id;
      if (doc.is_simulated && docPieceId && String(docPieceId) === String(pieceTypeDocument)) return true;
      const pieceJustificativeData = docPieceId ? piecesJustificativesMap.get(docPieceId) : null;
      const docPieceJustificationLibelle = pieceJustificativeData?.libelle || null;
      if (docPieceJustificationLibelle && referentielLibelle &&
          docPieceJustificationLibelle.toLowerCase().trim() === referentielLibelle.toLowerCase().trim()) return true;
      if (docPieceId && (String(docPieceId) === String(pieceTypeDocument) || doc.type_document_id === pieceTypeDocument)) return true;
      return false;
    });

    return docsForPiece.length > 0 && docsForPiece.some(doc => doc.valide === true);
  });
};

/**
 * Vérifie si toutes les pièces obligatoires d'une étape ont au moins un document uploadé (sans exiger la validation).
 * Utilisé pour débloquer l'étape et afficher le bouton "Passer à l'étape suivante" dès que les pièces sont téléversées.
 */
export const areAllMandatoryPiecesUploaded = (
  etape: EtapeCircuit,
  documentsForCurrentDossier: any[],
  completedEtapes: Set<string>,
  computedCompletedEtapes: Set<string>,
  typeDocuments: any[] = [],
  piecesJustificativesMap: Map<string, any> = new Map()
): boolean => {
  if (!etape.pieces || etape.pieces.length === 0) {
    return completedEtapes.has(etape.id) || computedCompletedEtapes.has(etape.id);
  }

  const mandatoryPieces = etape.pieces.filter(p => p.obligatoire);
  if (mandatoryPieces.length === 0) {
    return true;
  }

  return mandatoryPieces.every(piece => {
    const pieceTypeDocument = piece.type_document;
    const referentiel = typeDocuments.find(td => td.id === pieceTypeDocument);
    const referentielLibelle = referentiel?.libelle || referentiel?.name || null;

    if (!referentielLibelle) {
      const docsForPiece = documentsForCurrentDossier.filter(doc =>
        doc.piece_justification_id === pieceTypeDocument || doc.type_document_id === pieceTypeDocument
      );
      return docsForPiece.length > 0;
    }

    const docsForPiece = documentsForCurrentDossier.filter(doc => {
      if (doc.etape_id && doc.etape_id !== etape.id) return false;
      const docPieceId = doc.piece_justification_id;
      if (doc.is_simulated && docPieceId && String(docPieceId) === String(pieceTypeDocument)) return true;
      const pieceJustificativeData = docPieceId ? piecesJustificativesMap.get(docPieceId) : null;
      const docPieceJustificationLibelle = pieceJustificativeData?.libelle || null;
      if (docPieceJustificationLibelle && referentielLibelle &&
          docPieceJustificationLibelle.toLowerCase().trim() === referentielLibelle.toLowerCase().trim()) return true;
      if (docPieceId && (String(docPieceId) === String(pieceTypeDocument) || doc.type_document_id === pieceTypeDocument)) return true;
      return false;
    });

    return docsForPiece.length > 0;
  });
};

/**
 * Détermine le statut d'une étape
 */
export const getEtapeStatus = (
  etape: EtapeCircuit,
  isPreviousEtapeCompleted: boolean,
  computedCompletedEtapes: Set<string>,
  completedEtapes: Set<string>,
  documentsForCurrentDossier: any[]
): EtapeStatus => {
  // Si l'étape précédente n'est pas complétée, l'étape reste en attente
  if (!isPreviousEtapeCompleted) {
    return { status: 'pending', label: 'En attente (étape précédente non complétée)', color: 'default' };
  }

  // Si l'étape est marquée comme complétée
  if (computedCompletedEtapes.has(etape.id) || completedEtapes.has(etape.id)) {
    return { status: 'completed', label: 'Complétée', color: 'success' };
  }

  // Les étapes sans pièces restent en attente jusqu'à transmission manuelle
  if (!etape.pieces || etape.pieces.length === 0) {
    return { status: 'pending', label: 'En attente de transmission', color: 'default' };
  }

  const piecesObligatoires = etape.pieces.filter(p => p.obligatoire);
  if (piecesObligatoires.length === 0) {
    return { status: 'pending', label: 'En attente', color: 'default' };
  }

  // Vérifier si tous les documents obligatoires sont uploadés (au moins un doc par pièce obligatoire)
  const allObligatoryUploaded = piecesObligatoires.every(piece => {
    const pieceTypeDocument = piece.type_document;
    const docsForPiece = documentsForCurrentDossier.filter(doc => {
      if (doc.etape_id && doc.etape_id !== etape.id) return false;
      return doc.piece_justification_id === pieceTypeDocument || doc.type_document_id === pieceTypeDocument;
    });
    return docsForPiece.length > 0;
  });

  // Vérifier si tous les documents obligatoires sont validés
  const allObligatoryValidated = piecesObligatoires.every(piece => {
    const pieceTypeDocument = piece.type_document;
    const docsForPiece = documentsForCurrentDossier.filter(doc => {
      if (doc.etape_id && doc.etape_id !== etape.id) return false;
      return doc.piece_justification_id === pieceTypeDocument || doc.type_document_id === pieceTypeDocument;
    });
    return docsForPiece.some(doc => doc.valide === true);
  });

  if (allObligatoryValidated) {
    return { status: 'completed', label: 'Complétée', color: 'success' };
  }

  // Toutes les pièces obligatoires sont téléversées mais pas encore toutes validées → étape débloquée, en cours
  if (allObligatoryUploaded) {
    return { status: 'in_progress', label: 'En cours', color: 'warning' };
  }

  // Il manque au moins une pièce obligatoire non téléversée → étape bloquée
  return { status: 'pending', label: 'Pièces obligatoires manquantes', color: 'default' };
};

/** Étape « paiement » du circuit (aligné sur TraitementEtapeContenu / CircuitEtapeStepContent). */
export const isEtapePaiementCircuit = (etape: {
  libelle?: string | null;
  statut_libelle?: string | null;
  code?: string | null;
}): boolean => {
  const l = etape.libelle?.toUpperCase() ?? '';
  const s = etape.statut_libelle?.toUpperCase() ?? '';
  const c = etape.code?.toUpperCase() ?? '';
  return l.includes('PAIEMENT') || s.includes('PAIEMENT') || c.includes('PAIEMENT');
};

