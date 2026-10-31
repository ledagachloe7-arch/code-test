import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pour gérer le mapping en mémoire entre documents et pièces justificatives.
 * Aucune persistance localStorage — le mapping est uniquement gardé en mémoire le temps
 * de la session (réinitialisé au rechargement de la page).
 */
export const useDocumentPieceMapping = () => {
  const [documentPieceMapping, setDocumentPieceMapping] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const handleDocumentUploaded = (event: CustomEvent) => {
      const { document_id, piece_justification_id_original } = event.detail || {};
      if (document_id && piece_justification_id_original) {
        setDocumentPieceMapping(prev => {
          const newMap = new Map(prev);
          newMap.set(document_id, piece_justification_id_original);
          return newMap;
        });
      }
    };

    window.addEventListener('documentUploaded', handleDocumentUploaded as EventListener);
    return () => {
      window.removeEventListener('documentUploaded', handleDocumentUploaded as EventListener);
    };
  }, []);

  /**
   * Trouve les documents correspondant à une pièce justificative.
   * Priorité : piece_justification_id de l'API → mapping mémoire → type_document_id (fallback).
   */
  const findDocumentsForPiece = useCallback((
    pieceJustificationId: string,
    documents: any[],
    _useMapping: boolean = true,
    _typeDocuments?: any[]
  ): any[] => {
    let docs = documents.filter(doc => {
      if (doc.piece_justification_id && String(doc.piece_justification_id) === String(pieceJustificationId)) {
        return true;
      }
      if (doc.id) {
        const mappedPieceId = documentPieceMapping.get(doc.id);
        if (mappedPieceId && String(mappedPieceId) === String(pieceJustificationId)) {
          return true;
        }
      }
      return false;
    });

    if (docs.length === 0) {
      docs = documents.filter(doc => {
        if (doc.piece_justification_id) return false;
        if (doc.id && documentPieceMapping.has(doc.id)) return false;
        return doc.type_document_id === pieceJustificationId;
      });
    }

    return docs;
  }, [documentPieceMapping]);

  /**
   * Vérifie si un document correspond à une pièce justificative.
   */
  const isDocumentForPiece = useCallback((
    doc: any,
    pieceJustificationId: string,
    _useMapping: boolean = true
  ): boolean => {
    if (doc.piece_justification_id === pieceJustificationId) return true;
    if (doc.id) {
      const mappedPieceId = documentPieceMapping.get(doc.id);
      if (mappedPieceId === pieceJustificationId) return true;
    }
    return false;
  }, [documentPieceMapping]);

  return {
    documentPieceMapping,
    findDocumentsForPiece,
    isDocumentForPiece,
  };
};
