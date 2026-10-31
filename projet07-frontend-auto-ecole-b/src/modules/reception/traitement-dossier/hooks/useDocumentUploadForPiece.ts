import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import axiosClient from '../../../../shared/utils/axiosConfig';
import { PieceEtape, EtapeCircuit } from '../services/circuit-suivi.api';
import { ensureStorageSpace, cleanOldSimulatedFiles, clearAllSimulatedFiles, getStorageStats } from '../utils/storageCleaner';
import { pieceJustificativeService } from '../../../pieces-justificatives/services/piece-justificative.service';
import { PieceJustificativeFormData } from '../../../pieces-justificatives/types/piece-justificative';

/** Garantit une valeur scalaire string pour l'API (évite "Array to string conversion" côté backend). */
function toScalarString(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return String(value[0] ?? '');
  return String(value);
}

/**
 * Enregistre un document en localStorage (fallback quand l'API échoue).
 * Retourne l'ID du document simulé.
 */
async function saveDocumentToLocalStorageFallback(
  file: File,
  dossierId: string,
  pieceJustificationId: string,
  piece: PieceEtape,
  etape: EtapeCircuit
): Promise<string> {
  const fileBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64 ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const simulatedDocumentId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const simulatedDocument = {
    id: simulatedDocumentId,
    documentable_id: dossierId,
    documentable_type: 'App\\Models\\Dossier',
    nom_fichier: file.name,
    nom: file.name,
    chemin_fichier: `simulated/${simulatedDocumentId}`,
    type_mime: file.type,
    taille_fichier: file.size,
    taille_fichier_formate: `${(file.size / 1024).toFixed(2)} KB`,
    valide: false,
    valide_libelle: 'En attente',
    commentaires: 'Document enregistré localement (API indisponible)',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    piece_justification_id: pieceJustificationId,
    etape_id: etape.id
  };

  ensureStorageSpace();
  const storedFiles = localStorage.getItem('simulated_document_files');
  const parsedFiles = storedFiles ? JSON.parse(storedFiles) : {};
  parsedFiles[simulatedDocumentId] = { base64: fileBase64, type: file.type, name: file.name };

  try {
    localStorage.setItem('simulated_document_files', JSON.stringify(parsedFiles));
  } catch (quotaError: any) {
    if (quotaError.name === 'QuotaExceededError' || quotaError.message?.includes('quota')) {
      cleanOldSimulatedFiles();
      try {
        localStorage.setItem('simulated_document_files', JSON.stringify(parsedFiles));
      } catch {
        clearAllSimulatedFiles();
        localStorage.setItem('simulated_document_files', JSON.stringify({ [simulatedDocumentId]: parsedFiles[simulatedDocumentId] }));
      }
    } else {
      throw quotaError;
    }
  }

  const storedMapping = localStorage.getItem('document_piece_mapping');
  const parsedMapping = storedMapping ? JSON.parse(storedMapping) : {};
  parsedMapping[simulatedDocumentId] = {
    piece_justification_id: pieceJustificationId,
    etape_id: etape.id || '',
    timestamp: Date.now(),
    piece_libelle: piece.libelle || '',
    etape_libelle: etape.libelle || '',
    is_simulated: true
  };
  localStorage.setItem('document_piece_mapping', JSON.stringify(parsedMapping));

  const storedDocs = localStorage.getItem('simulated_documents');
  const parsedDocs = storedDocs ? JSON.parse(storedDocs) : {};
  parsedDocs[simulatedDocumentId] = simulatedDocument;
  localStorage.setItem('simulated_documents', JSON.stringify(parsedDocs));

  return simulatedDocumentId;
}

export const useDocumentUploadForPiece = (
  dossierId?: string,
  onDocumentUploaded?: () => void
) => {
  const [uploadingForPiece, setUploadingForPiece] = useState<string | null>(null);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Nettoyer automatiquement le storage au chargement du hook
  useEffect(() => {
    const stats = getStorageStats();
    if (stats.fileCount > 0) {
      console.log(`📊 Storage actuel: ${stats.fileCount} fichiers, ${stats.totalSizeFormatted}`);
      // Nettoyer si on a plus de 30 fichiers ou si la taille dépasse 3 MB
      if (stats.fileCount > 30 || stats.totalSize > 3 * 1024 * 1024) {
        console.log('🧹 Nettoyage automatique du storage...');
        ensureStorageSpace();
      }
    }
  }, []);

  const handleUploadForPiece = (piece: PieceEtape, etape: EtapeCircuit) => {
    const pieceId = `${etape.id}-${piece.type_document}`;
    const input = fileInputRefs.current.get(pieceId);
    if (input) {
      input.click();
    }
  };

  const handleFileSelectForPiece = async (
    event: React.ChangeEvent<HTMLInputElement>,
    piece: PieceEtape,
    etape: EtapeCircuit
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !dossierId) return;

    const file = files[0];
    const pieceId = `${etape.id}-${piece.type_document}`;
    setUploadingForPiece(pieceId);

    // Stocker le payload envoyé pour l'afficher en cas d'erreur (scope catch)
    let payloadSent: Record<string, string> | null = null;

    try {
      const maxSize = 5 * 1024 * 1024; // 5 MB
      if (file.size > maxSize) {
        toast.error('Le fichier ne doit pas dépasser 5 MB');
        setUploadingForPiece(null);
        return;
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Format non autorisé. Utilisez PDF, JPG ou PNG');
        setUploadingForPiece(null);
        return;
      }

      // Selon LIAISON_PIECE_DOCUMENT.md, piece.type_document = PieceJustificative.id
      // L'API n'accepte que piece_justification_id (pas type_document_id ni etape_id)
      // IMPORTANT: piece.type_document peut être soit:
      // 1. L'ID de la PieceJustificative (cas normal selon la doc)
      // 2. Le type_document_id (référentiel) - dans ce cas, il faut chercher la PieceJustificative correspondante
      // toScalarString évite d'envoyer un tableau à l'API (erreur "Array to string conversion")
      let pieceJustificationId: string | null = toScalarString(piece.type_document) || null;
      if (pieceJustificationId === '') pieceJustificationId = null;

      // Vérifier si piece.type_document est un ID valide (UUID ou nombre)
      // Si ce n'est pas un ID valide, on essaie de le traiter comme type_document_id
      // et on cherchera la PieceJustificative correspondante via l'API
      const pieceJustificationIdStr = pieceJustificationId != null ? String(pieceJustificationId) : '';
      const isValidId = pieceJustificationIdStr.length > 0 && (
        // UUID format (avec ou sans tirets)
        /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(pieceJustificationIdStr) ||
        // ID numérique (string ou number)
        /^\d+$/.test(pieceJustificationIdStr) ||
        // ID alphanumérique (peut être un hash)
        /^[a-z0-9_-]+$/i.test(pieceJustificationIdStr)
      );

      console.log('🔍 Validation de piece.type_document:', {
        pieceTypeDocument: piece.type_document,
        pieceJustificationIdStr,
        isValidId,
        etapeId: etape.id
      });

      // Si piece.type_document n'est pas un ID valide OU si on veut être sûr,
      // essayer de trouver la PieceJustificative via l'API en utilisant type_document_id et etape_id
      // On fait toujours la recherche pour être sûr d'avoir le bon ID
      if (etape.id) {
        try {
          console.log('🔍 Recherche de la PieceJustificative via API:', {
            type_document: piece.type_document,
            etape_id: etape.id
          });
          
          // Récupérer toutes les pièces justificatives et filtrer
          const piecesResponse = await axiosClient.get('/pieces-justificatives');
          let allPieces: any[] = [];
          
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
          
          // Chercher la pièce qui correspond à type_document_id et etape_id
          const typeDocScalar = toScalarString(piece.type_document);
          const etapeIdScalar = toScalarString(etape.id);
          const matchingPiece = allPieces.find(p => 
            (p.type_document_id === piece.type_document || String(p.type_document_id) === typeDocScalar) &&
            (p.etape_id === etape.id || String(toScalarString(p.etape_id)) === etapeIdScalar)
          );
          
          if (matchingPiece && matchingPiece.id) {
            // PieceJustificative trouvée, utiliser son ID (scalaire pour éviter "Array to string conversion")
            pieceJustificationId = toScalarString(matchingPiece.id);
            console.log('✅ PieceJustificative trouvée via recherche:', {
              pieceJustificationId,
              libelle: matchingPiece.libelle,
              type_document_id: matchingPiece.type_document_id,
              etape_id: matchingPiece.etape_id,
              originalPieceTypeDocument: piece.type_document
            });
          } else {
            // Si aucune pièce trouvée, créer automatiquement la PieceJustificative
            console.log('⚠️ Aucune PieceJustificative trouvée, création automatique...', {
              type_document: piece.type_document,
              etape_id: etape.id,
              pieceLibelle: piece.libelle
            });
            
            // Vérifier que les champs requis sont présents
            if (!etape.id) {
              console.error('❌ Impossible de créer la PieceJustificative: etape.id est manquant');
              pieceJustificationId = isValidId ? pieceJustificationId : null;
            } else if (!piece.type_document) {
              console.error('❌ Impossible de créer la PieceJustificative: piece.type_document est manquant');
              pieceJustificationId = null;
            } else {
              try {
                // Préparer les données pour créer la PieceJustificative
                // Générer un code unique basé sur le libellé ou un timestamp
                const codeBase = piece.libelle 
                  ? piece.libelle.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 50)
                  : 'PIECE';
                const uniqueCode = `${codeBase}_${Date.now()}`.substring(0, 50);
                
                const pieceJustificativeData: PieceJustificativeFormData = {
                  etape_id: toScalarString(etape.id),
                  type_document_id: toScalarString(piece.type_document),
                  code: uniqueCode,
                  libelle: piece.libelle || 'Pièce justificative',
                  format_attendu: 'pdf,jpg,jpeg,png', // Format par défaut
                  obligatoire: piece.obligatoire !== undefined ? piece.obligatoire : true,
                  delivery_date: '', // Vide par défaut
                  expiration_date: '' // Vide par défaut
                };

                console.log('🔨 Création de la PieceJustificative avec les données:', pieceJustificativeData);

                // Créer la PieceJustificative via l'API
                const createResponse = await pieceJustificativeService.createPieceJustificative(pieceJustificativeData);
                
                if (createResponse.success && createResponse.data && createResponse.data.id != null) {
                  pieceJustificationId = toScalarString(createResponse.data.id);
                  console.log('✅ PieceJustificative créée avec succès:', {
                    pieceJustificationId,
                    libelle: createResponse.data.libelle,
                    etape_id: createResponse.data.etape_id,
                    type_document_id: createResponse.data.type_document_id
                  });
                } else {
                  throw new Error(createResponse.message || 'Erreur lors de la création de la pièce justificative');
                }
              } catch (createError: any) {
                console.error('❌ Erreur lors de la création automatique de la PieceJustificative:', createError);
                
                // Si la création échoue et que piece.type_document semble être un ID valide, l'utiliser quand même
                if (isValidId) {
                  console.log('⚠️ Création échouée, utilisation de piece.type_document comme ID de secours:', {
                    pieceJustificationId,
                    pieceLibelle: piece.libelle,
                    createError: createError.message
                  });
                } else {
                  console.error('❌ Impossible de créer la PieceJustificative et piece.type_document n\'est pas un ID valide');
                  pieceJustificationId = null;
                }
              }
            }
          }
        } catch (error: any) {
          console.error('❌ Erreur lors de la recherche de la PieceJustificative:', error);
          // Si la recherche échoue et que piece.type_document n'est pas un ID valide, on ne peut pas continuer
          if (!isValidId) {
            console.error('❌ Impossible de trouver la PieceJustificative et piece.type_document n\'est pas un ID valide');
            pieceJustificationId = null;
          }
          // Sinon, continuer avec piece.type_document si c'est un ID valide
        }
      }

      // Valider que piece_justification_id est valide avant de continuer (toujours scalaire pour l'API)
      const finalPieceJustificationId = pieceJustificationId != null ? toScalarString(pieceJustificationId).trim() : '';
      if (!finalPieceJustificationId || finalPieceJustificationId === 'null' || finalPieceJustificationId === 'undefined') {
        const errorMsg = `Impossible de déterminer la pièce justificative pour "${piece.libelle || piece.type_document}". Veuillez contacter l'administrateur.`;
        console.error('❌ piece_justification_id invalide:', {
          pieceJustificationId,
          pieceTypeDocument: piece.type_document,
          pieceLibelle: piece.libelle,
          etapeId: etape.id,
          etapeLibelle: etape.libelle
        });
        toast.error(errorMsg);
        setUploadingForPiece(null);
        return;
      }

      // Valider que etape_id est disponible
      if (!etape.id) {
        const errorMsg = `L'étape n'a pas d'ID valide. Impossible d'uploader le document.`;
        console.error('❌ etape_id manquant:', {
          etapeId: etape.id,
          etapeLibelle: etape.libelle,
          pieceLibelle: piece.libelle
        });
        toast.error(errorMsg);
        setUploadingForPiece(null);
        return;
      }

      // À ce stade, piece_justification_id doit être valide. Valeurs strictement string (une seule fois par clé).
      const docId = toScalarString(dossierId);
      const pieceId = toScalarString(finalPieceJustificationId);
      const cleanFileName = toScalarString(file?.name).trim() || 'document';
      const formData = new FormData();
      formData.append('documentable_id', docId);
      formData.append('documentable_type', 'App\\Models\\Dossier');
      formData.append('piece_justification_id', pieceId);
      formData.append('valide', '0');
      formData.append('commentaires', '');
      formData.append('skip_alfresco', '1'); // Enregistrement en base uniquement, pas d'envoi vers Alfresco
      formData.append('fichier', file, cleanFileName);

      // Représentation JSON des données envoyées (pour debug) + format attendu par l'API
      const dataEnvoyee = {
        documentable_id: docId,
        documentable_type: 'App\\Models\\Dossier',
        piece_justification_id: pieceId,
        valide: '0',
        commentaires: '',
        skip_alfresco: '1',
        fichier: `[File: ${cleanFileName}, size: ${file?.size ?? 0}, type: ${file?.type ?? '?'}]`
      };
      const dataAttendueApi = {
        documentable_id: 'string (UUID)',
        documentable_type: 'string (ex: App\\Models\\Dossier)',
        piece_justification_id: 'string | null (UUID)',
        valide: 'boolean (string "0" ou "1")',
        commentaires: 'string',
        skip_alfresco: '1 = enregistrement en base uniquement, pas d\'envoi Alfresco',
        fichier: 'File (multipart)'
      };
      console.log('📤 Données envoyées vers POST /api/documents (JSON):', JSON.stringify(dataEnvoyee, null, 2));
      console.log('📋 Format attendu par l\'API:', JSON.stringify(dataAttendueApi, null, 2));
      console.log('📤 Types des valeurs envoyées:', {
        documentable_id: typeof docId,
        documentable_type: typeof 'App\\Models\\Dossier',
        piece_justification_id: typeof pieceId,
        valide: typeof '0',
        commentaires: typeof ''
      });

      payloadSent = { ...dataEnvoyee };

      const response = await axiosClient.post('/documents', formData, {
        timeout: 300000
      });

      if (response.data.success && response.data.data) {
        const uploadedDocument = response.data.data;
        const pieceJustificationIdReceived = uploadedDocument.piece_justification_id || null;
        
        console.log('✅ Document uploadé avec succès:', {
          documentId: uploadedDocument.id,
          documentableId: uploadedDocument.documentable_id,
          piece_justification_id_original: finalPieceJustificationId,
          piece_justification_id_received: pieceJustificationIdReceived
        });
        
        if (uploadedDocument.documentable_id !== dossierId) {
          console.error('⚠️ ATTENTION: Le document uploadé n\'est pas associé au bon dossier!');
        }
        
        // Émettre l'événement documentUploaded avec les détails pour le mapping temporaire
        // Selon MAPPING_TEMPORAIRE_DOCUMENTS.md
        window.dispatchEvent(new CustomEvent('documentUploaded', { 
          detail: { 
            documentable_id: dossierId,
            documentable_type: 'App\\Models\\Dossier',
            document_id: uploadedDocument.id,
            ancien_document_id: null,
            // Mapping original pour permettre la correspondance
            piece_justification_id_original: finalPieceJustificationId || null,
            piece_justification_id_received: pieceJustificationIdReceived,
            etape_id: etape.id || null,
          } 
        }));
        
        if (onDocumentUploaded) {
          onDocumentUploaded();
        }
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorText = String(errorData?.error ?? errorData?.message ?? error.message ?? '');
      const status = error.response?.status;

      // Données envoyées (payload stocké avant l'appel ou fallback)
      const dataEnvoyeeErreur = payloadSent ?? {
        documentable_id: toScalarString(dossierId),
        documentable_type: 'App\\Models\\Dossier',
        piece_justification_id: '(non défini)',
        valide: '0',
        commentaires: '',
        fichier: '[File]'
      };
      const dataAttendueApi = {
        documentable_id: 'string (UUID)',
        documentable_type: 'string (ex: App\\Models\\Dossier)',
        piece_justification_id: 'string | null (UUID)',
        valide: 'boolean (string "0" ou "1")',
        commentaires: 'string',
        fichier: 'File (multipart)'
      };

      console.error('❌ Erreur upload document — champs / message renvoyés par l\'API:', {
        status,
        statusText: error.response?.statusText,
        message: errorData?.message,
        error: errorData?.error,
        errors: errorData?.errors,
        fullResponse: error.response?.data
      });
      console.error('❌ Données envoyées vers l\'API (JSON):', JSON.stringify(dataEnvoyeeErreur, null, 2));
      console.error('❌ Format attendu par l\'API:', JSON.stringify(dataAttendueApi, null, 2));

      // Afficher un message d'erreur plus détaillé
      let errorMessage = 'Erreur lors de l\'upload du document';
      
      if (status === 500) {
        if (errorText.includes('SQLSTATE') || errorText.includes('Undefined column') || errorText.includes('column')) {
          if (errorText.includes('piece_justification_id') || errorText.includes('piece_justification')) {
            errorMessage = '❌ Erreur de base de données : colonne manquante\n\n';
            errorMessage += 'La colonne "piece_justification_id" n\'existe pas dans la table "documents".\n\n';
            errorMessage += '🔧 Action requise côté backend :\n';
            errorMessage += 'Une migration de base de données doit être exécutée pour ajouter la colonne "piece_justification_id" à la table "documents".\n\n';
            errorMessage += 'Veuillez contacter l\'administrateur système pour exécuter la migration nécessaire.';
          } else {
            errorMessage = 'Erreur de configuration serveur.\n\n';
            errorMessage += 'Il semble y avoir un problème avec la base de données. ';
            errorMessage += 'Veuillez contacter l\'administrateur système.\n\n';
            errorMessage += 'Cette erreur est généralement liée à une mise à jour incomplète de la base de données.';
          }
        } else if (errorText.includes('cURL error') || errorText.includes('Failed to connect') || errorText.includes('Alfresco') || errorText.includes('documentLibrary')) {
          errorMessage = '❌ Erreur de connexion au serveur de stockage\n\n';
          errorMessage += 'Le serveur ne peut pas se connecter au système de stockage de documents (Alfresco).\n\n';
          errorMessage += '🔧 Causes possibles :\n';
          errorMessage += '- Le serveur Alfresco est inaccessible ou arrêté\n';
          errorMessage += '- Problème de réseau entre le serveur backend et Alfresco\n';
          errorMessage += '- Configuration incorrecte de l\'adresse Alfresco\n\n';
          errorMessage += 'Veuillez contacter l\'administrateur système pour vérifier la connexion au serveur de stockage.';
        } else {
          errorMessage = 'Erreur serveur (500). Vérifiez que:\n';
          errorMessage += '- Le piece_justification_id est valide\n';
          errorMessage += '- Le dossier existe\n';
          errorMessage += '- Le fichier est au bon format\n';
          if (errorData?.message) {
            errorMessage += `\nDétails: ${errorData.message}`;
          }
          if (errorData?.error) {
            errorMessage += `\nErreur technique: ${errorData.error}`;
          }
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Rappel des infos de debug en console
      if (error.response?.data) {
        console.error('📋 Détails complets de l\'erreur API:', error.response.data);
      }

      // Fallback : enregistrer en localStorage pour pouvoir compléter l'étape sans blocage
      if (file && dossierId && payloadSent?.piece_justification_id) {
        try {
          const pieceIdLocal = toScalarString(payloadSent.piece_justification_id);
          const simulatedId = await saveDocumentToLocalStorageFallback(
            file,
            toScalarString(dossierId),
            pieceIdLocal,
            piece,
            etape
          );
          console.log('💾 Document enregistré en localStorage (fallback après échec API):', simulatedId);
          window.dispatchEvent(new CustomEvent('documentUploaded', {
            detail: {
              documentable_id: dossierId,
              documentable_type: 'App\\Models\\Dossier',
              document_id: simulatedId,
              ancien_document_id: null,
              piece_justification_id_original: pieceIdLocal || null,
              piece_justification_id_received: null,
              etape_id: etape.id || null,
          } 
          }));
          if (onDocumentUploaded) {
            onDocumentUploaded();
          }
          toast.success('Document enregistré localement. Vous pouvez compléter l\'étape (vérification et validation disponibles).');
          return;
        } catch (localErr) {
          console.warn('⚠️ Fallback localStorage échoué:', localErr);
        }
      }

      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setUploadingForPiece(null);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  /**
   * Simule l'upload d'un document avec un fichier réel
   * Stocke le fichier dans localStorage et marque la pièce comme fournie
   * Utile en attendant la correction du problème backend (colonne piece_justification_id manquante)
   */
  const handleSimulateUploadForPiece = (piece: PieceEtape, etape: EtapeCircuit) => {
    const pieceId = `${etape.id}-${piece.type_document}`;
    const input = fileInputRefs.current.get(pieceId);
    if (input) {
      // Créer un nouvel input pour la simulation (pour éviter les conflits avec l'upload normal)
      const simulateInput = document.createElement('input');
      simulateInput.type = 'file';
      simulateInput.accept = '.pdf,.jpg,.jpeg,.png';
      simulateInput.style.display = 'none';
      
      simulateInput.onchange = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const files = target.files;
        if (!files || files.length === 0 || !dossierId) {
          return;
        }

        const file = files[0];
        setUploadingForPiece(pieceId);

        try {
          // Validation du fichier
          const maxSize = 5 * 1024 * 1024; // 5 MB
          if (file.size > maxSize) {
            toast.error('Le fichier ne doit pas dépasser 5 MB');
            setUploadingForPiece(null);
            return;
          }

          const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
          if (!allowedTypes.includes(file.type)) {
            toast.error('Format non autorisé. Utilisez PDF, JPG ou PNG');
            setUploadingForPiece(null);
            return;
          }

          // Trouver le piece_justification_id (même logique que handleFileSelectForPiece, toujours scalaire)
          let pieceJustificationId: string = toScalarString(piece.type_document);
          const pieceJustificationIdStr = pieceJustificationId;
          const isValidId = pieceJustificationIdStr.length > 0 && (
            /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(pieceJustificationIdStr) ||
            /^\d+$/.test(pieceJustificationIdStr) ||
            /^[a-z0-9_-]+$/i.test(pieceJustificationIdStr)
          );

          // Chercher la PieceJustificative si nécessaire
          if (etape.id && !isValidId) {
            try {
              const piecesResponse = await axiosClient.get('/pieces-justificatives');
              let allPieces: any[] = [];
              
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
              
              const typeDocScalar = toScalarString(piece.type_document);
              const etapeIdScalar = toScalarString(etape.id);
              const matchingPiece = allPieces.find(p => 
                (p.type_document_id === piece.type_document || String(p.type_document_id) === typeDocScalar) &&
                (p.etape_id === etape.id || String(toScalarString(p.etape_id)) === etapeIdScalar)
              );
              
              if (matchingPiece && matchingPiece.id != null) {
                pieceJustificationId = toScalarString(matchingPiece.id);
              }
            } catch (error: any) {
              console.error('❌ Erreur lors de la recherche de la PieceJustificative:', error);
            }
          }

          // Lire le fichier en base64 pour le stocker dans localStorage
          const fileBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Enlever le préfixe data:type;base64,
              const base64 = result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Générer un ID pour le document simulé
          const simulatedDocumentId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Créer un document avec les vraies métadonnées du fichier
          const simulatedDocument = {
            id: simulatedDocumentId,
            documentable_id: dossierId,
            documentable_type: 'App\\Models\\Dossier',
            nom_fichier: file.name,
            nom: file.name,
            chemin_fichier: `simulated/${simulatedDocumentId}`,
            type_mime: file.type,
            taille_fichier: file.size,
            taille_fichier_formate: `${(file.size / 1024).toFixed(2)} KB`,
            valide: false,
            valide_libelle: 'En attente',
            commentaires: 'Document uploadé via simulation (stockage local)',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            piece_justification_id: pieceJustificationId,
            etape_id: etape.id
          };

          // Sauvegarder le fichier en base64 dans localStorage
          try {
            // Vérifier et nettoyer le storage avant d'ajouter un nouveau fichier
            ensureStorageSpace();
            
            const storedFiles = localStorage.getItem('simulated_document_files');
            const parsedFiles = storedFiles ? JSON.parse(storedFiles) : {};
            parsedFiles[simulatedDocumentId] = {
              base64: fileBase64,
              type: file.type,
              name: file.name
            };
            
            try {
              localStorage.setItem('simulated_document_files', JSON.stringify(parsedFiles));
            } catch (quotaError: any) {
              // Si le quota est dépassé, nettoyer les anciens fichiers et réessayer
              if (quotaError.name === 'QuotaExceededError' || quotaError.message?.includes('quota')) {
                console.warn('⚠️ Quota localStorage dépassé, nettoyage des anciens fichiers...');
                cleanOldSimulatedFiles();
                
                // Réessayer après nettoyage
                try {
                  localStorage.setItem('simulated_document_files', JSON.stringify(parsedFiles));
                  console.log('✅ Fichier sauvegardé après nettoyage');
                } catch (retryError) {
                  // Si ça échoue encore, vider complètement et réessayer une dernière fois
                  console.warn('⚠️ Nettoyage partiel insuffisant, vidage complet du storage...');
                  clearAllSimulatedFiles();
                  localStorage.setItem('simulated_document_files', JSON.stringify({ [simulatedDocumentId]: parsedFiles[simulatedDocumentId] }));
                  console.log('✅ Fichier sauvegardé après vidage complet');
                }
              } else {
                throw quotaError;
              }
            }
          } catch (storageError) {
            console.error('❌ Erreur lors de la sauvegarde du fichier:', storageError);
            throw storageError;
          }

          // Sauvegarder le mapping dans localStorage
          try {
            const stored = localStorage.getItem('document_piece_mapping');
            const parsed = stored ? JSON.parse(stored) : {};
            
            parsed[simulatedDocumentId] = {
              piece_justification_id: pieceJustificationId,
              etape_id: etape.id || '',
              timestamp: Date.now(),
              piece_libelle: piece.libelle || '',
              etape_libelle: etape.libelle || '',
              is_simulated: true
            };
            
            localStorage.setItem('document_piece_mapping', JSON.stringify(parsed));
          } catch (storageError) {
            console.error('❌ Erreur lors de la sauvegarde du mapping:', storageError);
            throw storageError;
          }

          // Sauvegarder le document simulé dans localStorage
          try {
            const storedDocs = localStorage.getItem('simulated_documents');
            const parsedDocs = storedDocs ? JSON.parse(storedDocs) : {};
            parsedDocs[simulatedDocumentId] = simulatedDocument;
            localStorage.setItem('simulated_documents', JSON.stringify(parsedDocs));
          } catch (storageError) {
            console.error('❌ Erreur lors de la sauvegarde du document simulé:', storageError);
            throw storageError;
          }

          // Émettre l'événement documentUploaded pour mettre à jour l'interface
          window.dispatchEvent(new CustomEvent('documentUploaded', { 
            detail: { 
              documentable_id: dossierId,
              documentable_type: 'App\\Models\\Dossier',
              document_id: simulatedDocumentId,
              ancien_document_id: null,
              piece_justification_id_original: pieceJustificationId || null,
              piece_justification_id_received: null,
              etape_id: etape.id || null,
              is_simulated: true
            } 
          }));

          console.log('✅ Document simulé uploadé avec succès:', {
            documentId: simulatedDocumentId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            pieceJustificationId,
            pieceLibelle: piece.libelle,
            etapeId: etape.id,
            valide: false
          });

          if (onDocumentUploaded) {
            onDocumentUploaded();
          }
        } catch (error: any) {
          console.error('❌ Erreur lors de la simulation de l\'upload:', error);
          toast.error(`Erreur lors de la simulation: ${error.message || 'Erreur inconnue'}`);
        } finally {
          setUploadingForPiece(null);
          // Nettoyer l'input temporaire
          document.body.removeChild(simulateInput);
        }
      };
      
      // Ajouter temporairement au DOM et déclencher le clic
      document.body.appendChild(simulateInput);
      simulateInput.click();
    }
  };

  return {
    uploadingForPiece,
    fileInputRefs,
    handleUploadForPiece,
    handleFileSelectForPiece,
    handleSimulateUploadForPiece
  };
};

