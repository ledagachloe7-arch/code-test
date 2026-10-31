import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Stack,
  Tooltip,
  IconButton,
  Chip,
  Divider,
  Skeleton,
  Fade
} from '@mui/material';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { CircuitSuivi, EtapeCircuit, PieceEtape } from '../services/circuit-suivi.api';
import { useDocumentPieceMapping } from '../hooks/useDocumentPieceMapping';
import axiosClient from '../../../../shared/utils/axiosConfig';
import { TraitementValidationDialog } from './TraitementValidationDialog';
import type { ValidationDialogState } from '../types/circuit-etapes.types';

export interface DocumentsCardProps {
  documentsFromApi: any[];
  loadingDocuments: boolean;
  uploading: boolean;
  dossierId?: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onUploadClick: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onViewDocument: (document: any) => void;
  onDownloadDocument: (document: any) => void;
  onUpdateDocument?: (documentId: string, data: { valide: boolean; commentaires?: string }) => Promise<void>;
  formatFileSize: (bytes: number) => string;
  circuit?: CircuitSuivi | null;
  typeDocuments?: any[];
  pieceJustificationTypeMap?: Map<string, { libelle: string }>; // Map piece_justification_id -> { libelle }
  /** Map partagée depuis le contexte (évite les appels répétés GET /pieces-justificatives). Si fournie, le composant ne charge pas les pièces en local. */
  piecesJustificativesMap?: Map<string, any>;
  loadingPiecesJustificatives?: boolean;
}

const TraitementDocumentsCard: React.FC<DocumentsCardProps> = ({
  documentsFromApi,
  loadingDocuments,
  uploading,
  dossierId,
  fileInputRef,
  onUploadClick,
  onFileSelect,
  onViewDocument,
  onDownloadDocument,
  onUpdateDocument,
  formatFileSize,
  circuit,
  typeDocuments = [],
  pieceJustificationTypeMap = new Map(),
  piecesJustificativesMap: piecesJustificativesMapFromContext,
  loadingPiecesJustificatives: loadingPiecesJustificativesFromContext = false
}) => {
  const [validationDialog, setValidationDialog] = React.useState<ValidationDialogState>({
    open: false,
    document: null,
    piece: null,
    valide: false,
    commentaires: ''
  });
  const [updatingDocument, setUpdatingDocument] = React.useState<string | null>(null);
  const [piecesJustificativesMapLocal, setPiecesJustificativesMapLocal] = React.useState<Map<string, any>>(new Map());
  const piecesJustificativesMap = piecesJustificativesMapFromContext !== undefined ? piecesJustificativesMapFromContext : piecesJustificativesMapLocal;
  
  // Le hook est toujours utilisé pour maintenir la compatibilité avec d'autres parties du code
  // mais on utilise directement localStorage dans getDocumentPieceId (comme RequiredDocumentsSection.tsx)
  useDocumentPieceMapping();

  // Filtrer les documents pour ne garder que ceux du dossier actuel
  // Le champ documentable_id correspond à l'ID du dossier
  const documentsForCurrentDossier = React.useMemo(() => {
    if (!dossierId) {
      // Si pas de dossierId, retourner tous les documents (compatibilité)
      return documentsFromApi;
    }
    
    // Filtrer par documentable_id pour s'assurer que seuls les documents du dossier actuel sont affichés
    return documentsFromApi.filter(doc =>
      !doc.documentable_id || doc.documentable_id === dossierId
    );
  }, [documentsFromApi, dossierId]);

  // Clé stable : liste triée des piece_justification_id issus des documents
  const pieceIdsFromDocs = React.useMemo(() => {
    const ids = new Set<string>();
    documentsForCurrentDossier.forEach(doc => {
      if (doc.piece_justification_id && doc.piece_justification_id !== 'N/A') {
        ids.add(String(doc.piece_justification_id));
      }
    });
    return [...ids].sort().join(',');
  }, [documentsForCurrentDossier]);

  // Ids des étapes du circuit (pour charger toutes les pièces attendues du dossier, dont photo d'identité)
  const circuitEtapeIdsKey = React.useMemo(() => {
    if (!circuit?.etapes?.length) return '';
    return circuit.etapes.map(e => e.id).filter(Boolean).sort().join(',');
  }, [circuit]);

  // Charger les pièces justificatives en local uniquement si non fournies par le contexte
  React.useEffect(() => {
    if (piecesJustificativesMapFromContext !== undefined) return;

    const fetchPiecesJustificatives = async () => {
      const pieceIdsFromDocsSet = new Set(pieceIdsFromDocs ? pieceIdsFromDocs.split(',') : []);
      const circuitEtapeIds = circuitEtapeIdsKey ? circuitEtapeIdsKey.split(',').filter(Boolean) : [];

      if (pieceIdsFromDocsSet.size === 0 && circuitEtapeIds.length === 0) {
        setPiecesJustificativesMapLocal(new Map());
        return;
      }

      try {
        const response = await axiosClient.get('/pieces-justificatives');
        let allPieces: any[] = [];
        if (response.data) {
          if (Array.isArray(response.data)) allPieces = response.data;
          else if (response.data.data && Array.isArray(response.data.data)) allPieces = response.data.data;
          else if (response.data.data && !Array.isArray(response.data.data)) allPieces = [response.data.data];
          else allPieces = [response.data];
        }

        const filteredPieces = allPieces.filter((piece: any) => {
          const id = piece.id != null ? String(piece.id) : '';
          const etapeId = piece.etape_id != null ? String(piece.etape_id) : '';
          if (pieceIdsFromDocsSet.has(id)) return true;
          if (circuitEtapeIds.length && etapeId && circuitEtapeIds.includes(etapeId)) return true;
          return false;
        });

        const piecesMap = new Map<string, any>();
        filteredPieces.forEach((piece: any) => {
          const id = piece.id != null ? String(piece.id) : '';
          piecesMap.set(id, {
            id: piece.id || null,
            type_document_id: piece.type_document_id || null,
            code: piece.code || null,
            libelle: piece.libelle || null,
            format_attendu: piece.format_attendu || null,
            obligatoire: piece.obligatoire ?? null,
            delivery_date: piece.delivery_date || null,
            expiration_date: piece.expiration_date || null,
            created_at: piece.created_at || null,
            updated_at: piece.updated_at || null,
            etape_id: piece.etape_id || null
          });
        });
        setPiecesJustificativesMapLocal(piecesMap);
      } catch {
        setPiecesJustificativesMapLocal(new Map());
      }
    };

    fetchPiecesJustificatives();
  }, [pieceIdsFromDocs, circuitEtapeIdsKey, piecesJustificativesMapFromContext]);

  // Fonction pour ouvrir le dialogue de validation (même modal que PieceCard / EtapeAccordion : prévisualisation + validation)
  const handleOpenValidationDialog = (doc: any, piece?: PieceEtape | null) => {
    setValidationDialog({
      open: true,
      document: doc,
      piece: piece ? { libelle: piece.libelle, obligatoire: piece.obligatoire, type_document: piece.type_document } : null,
      valide: doc.valide || false,
      commentaires: doc.commentaires || ''
    });
  };

  // Fonction pour fermer le dialogue
  const handleCloseValidationDialog = () => {
    setValidationDialog({
      open: false,
      document: null,
      piece: null,
      valide: false,
      commentaires: ''
    });
  };

  const handleSaveValidation = async (overrides?: { valide?: boolean }) => {
    if (!validationDialog.document) return;
    const doc = validationDialog.document;
    const valide = overrides?.valide ?? validationDialog.valide;
    const commentaires = validationDialog.commentaires;
    const isRejection = valide === false;

    try {
      setUpdatingDocument(doc.id);

      // --- Document simulé (upload API échoué, stocké en localStorage) ---
      if (doc.is_simulated || (doc.id && String(doc.id).startsWith('sim_'))) {
        if (isRejection) {
          for (const key of ['simulated_documents', 'simulated_document_files', 'document_piece_mapping']) {
            try {
              const stored = localStorage.getItem(key);
              if (stored) {
                const parsed = JSON.parse(stored);
                delete parsed[doc.id];
                localStorage.setItem(key, JSON.stringify(parsed));
              }
            } catch { /* ignorer */ }
          }
          // La PieceJustificative a été créée côté API avant l'échec de l'upload → la supprimer
          if (doc.piece_justification_id) {
            try {
              await axiosClient.delete(`/pieces-justificatives/${doc.piece_justification_id}`);
            } catch { /* ignorer si déjà supprimée ou inexistante */ }
          }
          toast.success('Document rejeté et supprimé.');
        } else {
          try {
            const stored = localStorage.getItem('simulated_documents');
            const parsed = stored ? JSON.parse(stored) : {};
            if (parsed[doc.id]) {
              parsed[doc.id] = {
                ...parsed[doc.id],
                valide,
                commentaires: commentaires || parsed[doc.id].commentaires,
                updated_at: new Date().toISOString()
              };
              localStorage.setItem('simulated_documents', JSON.stringify(parsed));
            }
          } catch { /* ignorer */ }
        }
        window.dispatchEvent(new CustomEvent('documentUploaded', {
          detail: {
            document_id: doc.id,
            documentable_id: doc.documentable_id || dossierId,
            documentable_type: doc.documentable_type || 'App\\Models\\Dossier',
            piece_justification_id_original: doc.piece_justification_id,
            etape_id: doc.etape_id
          }
        }));
        handleCloseValidationDialog();
        return;
      }

      // --- Document réel (API) ---
      if (isRejection) {
        await axiosClient.delete(`/documents/${doc.id}`);
        toast.success('Document rejeté et supprimé. Vous pouvez en téléverser un nouveau.');
        handleCloseValidationDialog();
        // Déclencher le refresh via l'événement écouté par le hook parent
        window.dispatchEvent(new CustomEvent('documentUploaded', {
          detail: {
            document_id: doc.id,
            documentable_id: doc.documentable_id || dossierId,
            documentable_type: doc.documentable_type || 'App\\Models\\Dossier',
          }
        }));
        return;
      }

      // Validation / invalidation sans suppression
      if (!onUpdateDocument) return;
      await onUpdateDocument(doc.id, { valide, commentaires });
      handleCloseValidationDialog();
    } catch (error: any) {
      console.error('❌ Erreur lors du traitement du document (DocumentsCard):', error);
      toast.error(error?.response?.data?.message || 'Erreur lors du traitement du document.');
    } finally {
      setUpdatingDocument(null);
    }
  };

  // Fonction utilitaire pour vérifier si une chaîne est un UUID
  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Fonction pour résoudre l'ID du type de document selon CORRELATION_DOCUMENTS_PIECES.md
  const getTypeDocumentId = React.useCallback((typeDocumentIdentifier: string): string | null => {
    if (!typeDocumentIdentifier) return null;

    // 1. Si c'est déjà un UUID, l'utiliser directement
    if (isUUID(typeDocumentIdentifier)) {
      return typeDocumentIdentifier;
    }

    // 2. Sinon, chercher par libellé, code ou name
    const typeDoc = typeDocuments.find(
      td => 
        td.id === typeDocumentIdentifier ||
        td.libelle?.toLowerCase() === typeDocumentIdentifier.toLowerCase() ||
        td.code?.toLowerCase() === typeDocumentIdentifier.toLowerCase() ||
        td.name?.toLowerCase() === typeDocumentIdentifier.toLowerCase()
    );
    
    return typeDoc?.id || null;
  }, [typeDocuments]);

  // Fonction pour trouver la pièce et l'étape correspondant à un document
  // MÊME LOGIQUE QUE RequiredDocumentsSection.tsx mais SANS localStorage
  // (car frontend-auto-ecole et frontend-candidat sont deux applications séparées)
  // On utilise uniquement les données de l'API : piece_justification_id et etape_id
  const findDocumentCorrelation = React.useCallback((doc: any): { etape: EtapeCircuit | null; piece: PieceEtape | null; typeDoc: any } => {
    if (!circuit) {
      return { etape: null, piece: null, typeDoc: null };
    }

    if (!circuit.etapes || circuit.etapes.length === 0) {
      return { etape: null, piece: null, typeDoc: null };
    }

    // Utiliser directement piece_justification_id de l'API (pas de localStorage car application séparée)
    const docPieceId = doc.piece_justification_id;
    // IMPORTANT: piece.type_document dans le circuit contient le type_document_id (référentiel),
    // pas l'ID de la PieceJustificative. On doit comparer pieceJustificative.type_document_id avec piece.type_document
    // Récupérer les données de la PieceJustificative depuis la map locale (piecesJustificativesMap)
    const pieceJustificativeData = docPieceId ? piecesJustificativesMap.get(docPieceId) : null;
    const docPieceJustificationLibelle = pieceJustificativeData?.libelle || null;

    // Collecter tous les piece.type_document du circuit pour comparaison et logs
    const allPieceTypeDocuments: Array<{etapeId: string; etapeLibelle: string; pieceLibelle: string; pieceTypeDocument: string}> = [];
    for (const etape of circuit.etapes || []) {
      if (etape.pieces) {
        for (const piece of etape.pieces) {
          allPieceTypeDocuments.push({
            etapeId: etape.id,
            etapeLibelle: etape.libelle,
            pieceLibelle: piece.libelle || 'N/A',
            pieceTypeDocument: piece.type_document
          });
        }
      }
    }

    // Parcourir toutes les étapes et leurs pièces
    // IMPORTANT: piece.type_document contient le type_document_id (référentiel),
    // pas l'ID de la PieceJustificative. On compare donc pieceJustificative.type_document_id avec piece.type_document
    for (const etape of circuit.etapes || []) {
      // Filtrer par etape_id si disponible (optimisation)
      if (doc.etape_id && doc.etape_id !== etape.id) {
        continue; // Le document appartient à une autre étape
      }
      
      if (etape.pieces) {
        for (const piece of etape.pieces) {
          const pieceTypeDocument = piece.type_document; // C'est le type_document_id (référentiel)
          
          // Récupérer le Referentiel correspondant à pieceTypeDocument pour obtenir son libelle
          const referentiel = typeDocuments.find(td => td.id === pieceTypeDocument);
          const referentielLibelle = referentiel?.libelle || referentiel?.name || null;
          
          // Comparaison UNIQUEMENT par libelle : PieceJustificative.libelle === Referentiel.libelle
          if (docPieceJustificationLibelle && referentielLibelle && 
              docPieceJustificationLibelle.toLowerCase().trim() === referentielLibelle.toLowerCase().trim()) {
            const docTypeDoc = typeDocuments.find(td => td.id === doc.type_document_id);
            const pieceTypeDoc = typeDocuments.find(td => td.id === pieceTypeDocument);
            
            return { etape, piece, typeDoc: pieceTypeDoc || docTypeDoc };
          }
        }
      }
    }

    // Aucune correspondance trouvée
    return { etape: null, piece: null, typeDoc: null };
  }, [circuit, typeDocuments, piecesJustificativesMap]);

  // Fonction pour obtenir le nom de la pièce à partir du piece_justification_id ou type_document_id
  const getPieceNameFromDocument = React.useCallback((doc: any): string | null => {
    // 1. Priorité : chercher par piece_justification_id dans piecesJustificativesMap
    if (doc.piece_justification_id) {
      const pieceJustificative = piecesJustificativesMap.get(doc.piece_justification_id);
      if (pieceJustificative?.libelle) {
        return pieceJustificative.libelle;
      }
      
      // Fallback : chercher dans les référentiels (typeDocuments)
      const pieceDoc = typeDocuments.find(td => td.id === doc.piece_justification_id);
      if (pieceDoc) {
        return pieceDoc.libelle || pieceDoc.name || pieceDoc.code || null;
      }
      
      // Si pas trouvé dans typeDocuments, chercher dans les pièces du circuit
      if (circuit) {
        for (const etape of circuit.etapes || []) {
          if (etape.pieces) {
            for (const piece of etape.pieces) {
              // piece.type_document devrait correspondre à piece_justification_id
              const pieceTypeDocumentId = getTypeDocumentId(piece.type_document);
              if ((pieceTypeDocumentId && String(pieceTypeDocumentId) === String(doc.piece_justification_id)) || 
                  String(piece.type_document) === String(doc.piece_justification_id)) {
                return piece.libelle || null;
              }
            }
          }
        }
      }
      
    }

    // 2. Fallback : chercher par type_document_id (si ce n'est pas "N/A")
    if (doc.type_document_id && doc.type_document_id !== 'N/A') {
      const typeDoc = typeDocuments.find(td => td.id === doc.type_document_id);
      if (typeDoc) {
        return typeDoc.libelle || typeDoc.name || typeDoc.code || null;
      }

      // Si pas trouvé, chercher dans les pièces du circuit
      if (circuit) {
        for (const etape of circuit.etapes || []) {
          if (etape.pieces) {
            for (const piece of etape.pieces) {
              const pieceTypeDocumentId = getTypeDocumentId(piece.type_document);
              if (pieceTypeDocumentId && String(pieceTypeDocumentId) === String(doc.type_document_id)) {
                return piece.libelle || null;
              }
            }
          }
        }
      }
    }

    return null;
  }, [typeDocuments, circuit, getTypeDocumentId, piecesJustificativesMap]);

  // Grouper les documents par étape (utiliser les documents filtrés)
  // Attendre que les pièces justificatives soient chargées (piecesJustificativesMap) avant de corréler, pour éviter d'afficher "non corrélés" à tort
  const documentsByEtape = React.useMemo(() => {
    const grouped = new Map<string, { etape: EtapeCircuit; documents: any[] }>();
    const uncorrelated: any[] = [];
    const hasDocsWithPieceId = documentsForCurrentDossier.some((d: any) => d.piece_justification_id && d.piece_justification_id !== 'N/A');

    if (!circuit || !circuit.etapes || circuit.etapes.length === 0) {
      documentsForCurrentDossier.forEach(doc => {
        uncorrelated.push({ ...doc, pieceName: getPieceNameFromDocument(doc) });
      });
      return { grouped, uncorrelated, correlationPending: false };
    }

    // Si des documents ont un piece_justification_id mais la map des pièces n'est pas encore chargée, ne pas corréler tout de suite (évite le flash "non corrélés")
    if (hasDocsWithPieceId && piecesJustificativesMap.size === 0) {
      return { grouped, uncorrelated: [], correlationPending: true };
    }

    documentsForCurrentDossier.forEach(doc => {
      const { etape, piece } = findDocumentCorrelation(doc);
      if (etape && piece) {
        const key = etape.id;
        if (!grouped.has(key)) {
          grouped.set(key, { etape, documents: [] });
        }
        grouped.get(key)!.documents.push({ ...doc, piece });
      } else {
        const pieceName = getPieceNameFromDocument(doc);
        uncorrelated.push({ ...doc, pieceName });
      }
    });

    return { grouped, uncorrelated, correlationPending: false };
  }, [documentsForCurrentDossier, circuit, typeDocuments, getPieceNameFromDocument, findDocumentCorrelation, piecesJustificativesMap.size]);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DocumentTextIcon className="w-5 h-5 mr-2 text-blue-600" />
            <Typography variant="h6" fontWeight="bold" className="font-display">
              Documents ({documentsForCurrentDossier.length})
            </Typography>
          </Box>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={onFileSelect}
          />
        </Box>

        {/* Documents existants groupés par étape */}
        {loadingDocuments ? (
          <Fade in={true} timeout={300}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
              ))}
            </Box>
          </Fade>
        ) : documentsByEtape.correlationPending ? (
          <Fade in={true} timeout={300}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, py: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
              ))}
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                Corrélation des documents avec les étapes...
              </Typography>
            </Box>
          </Fade>
        ) : documentsForCurrentDossier.length > 0 ? (
          <Stack spacing={3}>
            {/* Documents corrélés avec les étapes */}
            {Array.from(documentsByEtape.grouped.entries()).map(([etapeId, { etape, documents }]) => (
              <Box key={etapeId}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold" className="font-display" sx={{ mr: 1 }}>
                    {etape.libelle}
                  </Typography>
                  {etape.code && (
                    <Chip label={etape.code} size="small" variant="outlined" sx={{ mr: 1 }} />
                  )}
                  <Chip 
                    label={`${documents.length} document(s)`} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                </Box>
                <Stack spacing={1.5}>
                  {documents.map((doc: any) => {
                    const { piece, typeDoc } = findDocumentCorrelation(doc);
                    // Chercher le nom de la pièce : d'abord dans typeDoc, puis dans piece, puis via getPieceNameFromDocument
                    let pieceName = typeDoc?.libelle || typeDoc?.name || typeDoc?.code;
                    if (!pieceName && piece) {
                      pieceName = piece.libelle;
                    }
                    if (!pieceName) {
                      // Fallback : chercher dans les référentiels par piece_justification_id
                      pieceName = getPieceNameFromDocument(doc);
                    }
                    if (!pieceName) {
                      pieceName = 'Document';
                    }
                    
                    return (
                      <Box
                        key={doc.id}
                        sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: doc.valide ? 'success.main' : 'divider',
                          borderRadius: 1,
                          backgroundColor: doc.valide ? 'success.50' : 'background.paper'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="body1" fontWeight="medium" className="font-primary">
                                {doc.nom || doc.nom_fichier}
                              </Typography>
                              {doc.valide && (
                                <Chip 
                                  label="Validé" 
                                  size="small" 
                                  color="success" 
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                              {piece?.obligatoire && (
                                <Chip 
                                  label="Obligatoire" 
                                  size="small" 
                                  color="warning" 
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Chip 
                                label={pieceName || 'Pièce non identifiée'} 
                                size="small" 
                                color={pieceName ? 'primary' : 'default'}
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                               
                            </Box>
                            <Typography variant="body2" color="text.secondary" className="font-primary">
                              Taille: {doc.taille}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" className="font-primary">
                              Uploadé le {doc.dateUpload ? new Date(doc.dateUpload).toLocaleDateString('fr-FR') : 'N/A'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2, flexWrap: 'wrap' }}>
                            <Tooltip title="Télécharger">
                              <IconButton
                                size="small"
                                onClick={() => onDownloadDocument(doc)}
                                color="secondary"
                              >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                              </IconButton>
                            </Tooltip>
                            {onUpdateDocument && (
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => handleOpenValidationDialog(doc, piece ?? undefined)}
                                disabled={updatingDocument === doc.id}
                                sx={{
                                  textTransform: 'none',
                                  fontSize: '0.75rem',
                                  color: doc.valide ? 'success.main' : 'primary.main',
                                  minWidth: 'auto',
                                  px: 1
                                }}
                              >
                                Vérifier
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            ))}

            {/* Documents non corrélés */}
            {documentsByEtape.uncorrelated.length > 0 && (
              <Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight="bold" className="font-display" sx={{ mr: 1 }}>
                    Documents non corrélés
                  </Typography>
                  <Chip 
                    label={`${documentsByEtape.uncorrelated.length} document(s)`} 
                    size="small" 
                    color="default" 
                    variant="outlined" 
                  />
                </Box>
                <Stack spacing={1.5}>
                  {documentsByEtape.uncorrelated.map((doc: any) => {
                    const pieceName = doc.pieceName || getPieceNameFromDocument(doc);
                    
                    return (
                      <Box
                        key={doc.id}
                        sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          backgroundColor: 'background.paper',
                          opacity: pieceName ? 1 : 0.7
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="body1" fontWeight="medium" className="font-primary">
                                {doc.nom || doc.nom_fichier}
                              </Typography>
                              {doc.valide && (
                                <Chip 
                                  label="Validé" 
                                  size="small" 
                                  color="success" 
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                            {pieceName ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Chip 
                                  label={pieceName} 
                                  size="small" 
                                  color="primary"
                                  variant="outlined"
                                  sx={{ fontWeight: 600 }}
                                />
                                <Typography variant="caption" color="text.secondary" className="font-primary">
                                  Pièce justificative
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="warning.main" className="font-primary" display="block" sx={{ mb: 0.5 }}>
                                ⚠️ Pièce non identifiée
                                {doc.type_document_id && ` (Type ID: ${doc.type_document_id.substring(0, 8)}...)`}
                              </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary" className="font-primary">
                              Taille: {doc.taille}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" className="font-primary">
                              Uploadé le {doc.dateUpload ? new Date(doc.dateUpload).toLocaleDateString('fr-FR') : 'N/A'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                            <Tooltip title="Télécharger">
                              <IconButton
                                size="small"
                                onClick={() => onDownloadDocument(doc)}
                                color="secondary"
                              >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                              </IconButton>
                            </Tooltip>
                            {onUpdateDocument && (
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => handleOpenValidationDialog(doc)}
                                disabled={updatingDocument === doc.id}
                                sx={{
                                  textTransform: 'none',
                                  fontSize: '0.75rem',
                                  color: doc.valide ? 'success.main' : 'primary.main',
                                  minWidth: 'auto',
                                  px: 1
                                }}
                              >
                                Vérifier
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Stack>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <Typography variant="h6" color="text.secondary" gutterBottom className="font-display">
              Aucun document disponible
            </Typography>
          </Box>
        )}

        {/* Indicateur d'upload en cours */}
        {uploading && (
          <Fade in={true} timeout={300}>
            <Box sx={{ mt: 2, p: 2, border: '1px dashed', borderColor: 'primary.main', borderRadius: 1, bgcolor: 'primary.50' }}>
              <Typography variant="body2" color="primary.main" className="font-primary">
                Upload en cours...
              </Typography>
            </Box>
          </Fade>
        )}

        {/* Modal de vérification (même que PieceCard : prévisualisation du document + validation) */}
        <TraitementValidationDialog
          open={validationDialog.open}
          validationDialog={validationDialog}
          updatingDocument={updatingDocument}
          onClose={handleCloseValidationDialog}
          onSave={handleSaveValidation}
          onValideChange={(valide) => setValidationDialog(prev => ({ ...prev, valide }))}
          onCommentairesChange={(commentaires) => setValidationDialog(prev => ({ ...prev, commentaires }))}
        />
      </CardContent>
    </Card>
  );
};

export default TraitementDocumentsCard;

