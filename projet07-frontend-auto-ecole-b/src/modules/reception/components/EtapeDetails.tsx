import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Upload,
  CheckCircle,
  Cancel,
  Description
} from '@mui/icons-material';
import {
  circuitSuiviService,
  EtapeCircuit,
  Document
} from '../services/circuit-suivi.service';
import axiosClient from '../../../shared/utils/axiosConfig';
import { EpreuveStatut, EpreuveAttempt } from '../types';
import { computeOverall, computeGeneral } from '../tables/ReceptionDossierTypeTable/utils';

interface EtapeDetailsProps {
  etape: EtapeCircuit;
  circuitId: string;
  etapeIndex: number;
  isActive: boolean;
  isCompleted: boolean;
  isBlocked: boolean;
  uploadedDocuments?: Document[];
  dossierId?: string;
  onDocumentUploaded?: () => void;
  onTransitionToNext?: () => void;
}

interface TypeDocument {
  id: string;
  name: string;
  libelle?: string;
}

const EtapeDetails: React.FC<EtapeDetailsProps> = ({
  etape,
  circuitId,
  etapeIndex: _etapeIndex,
  isActive: _isActive,
  isCompleted: _isCompleted,
  isBlocked,
  uploadedDocuments = [],
  dossierId,
  onDocumentUploaded,
  onTransitionToNext
}) => {
  const [typeDocuments, setTypeDocuments] = useState<TypeDocument[]>([]);
  const [, setLoadingTypes] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [commentaires, setCommentaires] = useState('');
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [dateExamenDialogOpen, setDateExamenDialogOpen] = useState(false);
  const [dateExamen, setDateExamen] = useState<string>('');
  const [dateExamenError, setDateExamenError] = useState<string>('');
  const [epreuvesStatus, setEpreuvesStatus] = useState<EpreuveStatut | null>(null);
  const [loadingEpreuves, setLoadingEpreuves] = useState(false);
  const [programmeSessionCreated, setProgrammeSessionCreated] = useState(false);

  // Fonction pour sauvegarder le mapping dans localStorage
  const saveMappingToStorage = React.useCallback((docId: string, pieceJustificationId: string, etapeId: string) => {
    try {
      const stored = localStorage.getItem('document_piece_mapping');
      const parsed = stored ? JSON.parse(stored) : {};
      
      // IMPORTANT: Ne pas écraser les mappings existants, seulement ajouter/mettre à jour celui-ci
      parsed[docId] = {
        piece_justification_id: pieceJustificationId,
        etape_id: etapeId,
        timestamp: Date.now(),
      };
      
      localStorage.setItem('document_piece_mapping', JSON.stringify(parsed));
      
      console.log('💾 Mapping sauvegardé dans localStorage:', {
        documentId: docId,
        pieceJustificationId: pieceJustificationId,
        etapeId: etapeId,
        totalMappings: Object.keys(parsed).length
      });
    } catch (error) {
      console.warn('⚠️ Erreur lors de la sauvegarde du mapping dans localStorage:', error);
    }
  }, []);

  // Fonction helper pour obtenir le piece_justification_id d'un document (priorité au mapping localStorage)
  const getDocumentPieceId = React.useCallback((doc: Document): string | null => {
    // 1. PRIORITÉ: Utiliser le piece_justification_id déjà normalisé dans le document (depuis CircuitEtapesView)
    // Les documents sont déjà normalisés avec le mapping localStorage dans CircuitEtapesView
    if (doc.piece_justification_id) {
      return doc.piece_justification_id;
    }
    
    // 2. Si le document n'a pas de piece_justification_id, essayer de le récupérer depuis localStorage
    if (doc.id) {
      try {
        const stored = localStorage.getItem('document_piece_mapping');
        if (stored) {
          const parsed = JSON.parse(stored);
          const mappingData = parsed[doc.id];
          if (mappingData && mappingData.piece_justification_id) {
            // Utiliser le mapping même si l'etape_id est différent, car le piece_justification_id est la source de vérité
            return mappingData.piece_justification_id;
          }
        }
      } catch (error) {
        // Ignorer les erreurs de parsing
      }
    }
    
    return null;
  }, []);

  // Écouter les événements de document uploadé pour stocker le mapping original
  React.useEffect(() => {
    const handleDocumentUploaded = (event: CustomEvent) => {
      const { document_id, piece_justification_id_original, etape_id } = event.detail || {};
      // Sauvegarder le mapping pour TOUS les documents uploadés, même s'ils ne sont pas pour cette étape
      // car le piece_justification_id est la source de vérité pour associer le document à une pièce
      if (document_id && piece_justification_id_original) {
        // Sauvegarder dans localStorage pour persister après rechargement
        saveMappingToStorage(document_id, piece_justification_id_original, etape_id || etape.id);
        console.log('💾 Mapping sauvegardé pour document:', document_id, '->', piece_justification_id_original, 'pour étape:', etape_id || etape.id);
      }
    };
    window.addEventListener('documentUploaded', handleDocumentUploaded as EventListener);
    return () => {
      window.removeEventListener('documentUploaded', handleDocumentUploaded as EventListener);
    };
  }, [etape.id, saveMappingToStorage]);

  // Charger les types de documents
  useEffect(() => {
    const loadTypeDocuments = async () => {
      try {
        setLoadingTypes(true);
        let page = 1;
        let allTypes: TypeDocument[] = [];
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
          allTypes = [...allTypes, ...types];

          hasMore = types.length === 100;
          page++;
        }

        setTypeDocuments(allTypes);
      } catch (err: any) {
        console.error('Erreur lors du chargement des types de documents:', err);
      } finally {
        setLoadingTypes(false);
      }
    };

    loadTypeDocuments();
  }, []);

  // Récupérer le rôle de l'utilisateur
  useEffect(() => {
    const userData = localStorage.getItem('dgtt_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role || null);
      } catch (e) {
        console.warn('Impossible de parser user_data');
      }
    }
  }, []);

  // Vérifier si l'étape est "ENVOI DU DOSSIER POUR EXAMEN" (accepter "DU" et "DE" pour robustesse)
  const isEnvoiDossierExamen = etape.libelle?.toUpperCase().includes('ENVOI DU DOSSIER POUR EXAMEN') ||
                               etape.libelle?.toUpperCase().includes('ENVOI DE DOSSIER POUR EXAMEN') ||
                               etape.code?.toUpperCase().includes('ENVOI_DOSSIER_EXAMEN') ||
                               etape.code?.toUpperCase().includes('DOSSIER_EXAMEN');

  // Charger le statut des résultats pour l'étape "ENVOI DOSSIER POUR EXAMEN"
  useEffect(() => {
    const loadEpreuvesStatus = async () => {
      if (!isEnvoiDossierExamen || !dossierId) {
        setEpreuvesStatus(null);
        return;
      }

      try {
        setLoadingEpreuves(true);
        console.log('📋 Chargement du statut des épreuves pour le dossier:', dossierId);
        
        const response = await axiosClient.get('/resultats', {
          params: { dossier_id: dossierId }
        });
        
        const resultats = Array.isArray(response.data?.data) ? response.data.data : [];
        
        if (resultats.length === 0) {
          setEpreuvesStatus('non_saisi');
          setLoadingEpreuves(false);
          return;
        }
        
        // Organiser les résultats par type d'examen
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
        
        // Trier par date
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
        
        // Calculer les statuts
        const creneauxStatus = computeOverall(creneauxAttempts);
        const codeStatus = computeOverall(codeConduiteAttempts);
        const villeStatus = computeOverall(tourVilleAttempts);
        const generalStatus = computeGeneral(creneauxStatus, codeStatus, villeStatus);
        
        setEpreuvesStatus(generalStatus);
        console.log('✅ Statut des épreuves chargé:', {
          creneaux: creneauxStatus,
          code: codeStatus,
          ville: villeStatus,
          general: generalStatus
        });
      } catch (error: any) {
        console.error('❌ Erreur lors du chargement du statut des épreuves:', error);
        setEpreuvesStatus('non_saisi');
      } finally {
        setLoadingEpreuves(false);
      }
    };

    loadEpreuvesStatus();
  }, [isEnvoiDossierExamen, dossierId]);

  // Écouter l'événement de création de programme session
  useEffect(() => {
    const handleProgrammeSessionCreated = (event: CustomEvent) => {
      if (event.detail?.dossierId === dossierId) {
        setProgrammeSessionCreated(true);
        // Recharger le statut des épreuves après un délai
        setTimeout(() => {
          if (dossierId) {
            // Recharger le statut
            const loadEpreuvesStatus = async () => {
              try {
                setLoadingEpreuves(true);
                const response = await axiosClient.get('/resultats', {
                  params: { dossier_id: dossierId }
                });
                const resultats = Array.isArray(response.data?.data) ? response.data.data : [];
                
                if (resultats.length === 0) {
                  setEpreuvesStatus('non_saisi');
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
                
                setEpreuvesStatus(generalStatus);
              } catch (error) {
                console.error('Erreur lors du rechargement du statut:', error);
              } finally {
                setLoadingEpreuves(false);
              }
            };
            loadEpreuvesStatus();
          }
        }, 1000);
      }
    };
    
    window.addEventListener('programmeSessionCreated', handleProgrammeSessionCreated as EventListener);
    return () => {
      window.removeEventListener('programmeSessionCreated', handleProgrammeSessionCreated as EventListener);
    };
  }, [dossierId]);

  // Vérifier si l'utilisateur est autorisé (admin = accès total)
  const isUserAuthorized = (etapeRoles?: string[]): boolean => {
    if (!etapeRoles || etapeRoles.length === 0) return true;
    if (!userRole) return false;
    const rawLower = userRole.toLowerCase().replace(/^role_/, '').trim();
    if (rawLower === 'admin' || rawLower === 'superadmin') return true;
    const normalizedUserRole = rawLower;
    return etapeRoles.some(role => {
      const normalizedRole = role.replace(/^ROLE_/i, '').toLowerCase().trim();
      return normalizedRole === normalizedUserRole;
    });
  };

  // Séparer les documents obligatoires et optionnels
  const requiredPieces = etape.pieces?.filter(p => p.obligatoire) || [];
  const optionalPieces = etape.pieces?.filter(p => !p.obligatoire) || [];

  // Log pour déboguer - afficher les informations de l'étape et des documents
  React.useEffect(() => {
    console.log('📊 EtapeDetails - Informations de l\'étape:', {
      etapeId: etape.id,
      etapeLibelle: etape.libelle,
      piecesObligatoires: requiredPieces.map(p => ({
        libelle: p.libelle,
        type_document: p.type_document
      })),
      piecesOptionnelles: optionalPieces.map(p => ({
        libelle: p.libelle,
        type_document: p.type_document
      })),
      documentsReçus: uploadedDocuments.map(d => ({
        id: d.id,
        nom: d.nom_fichier,
        pieceId: getDocumentPieceId(d),
        apiPieceId: d.piece_justification_id,
        typeDocumentId: d.type_document_id
      })),
      nombreDocuments: uploadedDocuments.length
    });
    
    // Vérifier les correspondances entre documents et pièces
    requiredPieces.forEach(piece => {
      const matchingDocs = uploadedDocuments.filter(d => {
        const docPieceId = getDocumentPieceId(d);
        return docPieceId === piece.type_document ||
               d.piece_justification_id === piece.type_document ||
               d.type_document_id === piece.type_document;
      });
      
      if (matchingDocs.length > 0) {
        console.log('✅ Correspondance trouvée pour pièce obligatoire:', {
          pieceLibelle: piece.libelle,
          pieceTypeDocument: piece.type_document,
          documents: matchingDocs.map(d => ({
            id: d.id,
            nom: d.nom_fichier,
            pieceId: getDocumentPieceId(d)
          }))
        });
      } else {
        console.log('❌ Aucune correspondance pour pièce obligatoire:', {
          pieceLibelle: piece.libelle,
          pieceTypeDocument: piece.type_document,
          documentsDisponibles: uploadedDocuments.map(d => ({
            id: d.id,
            nom: d.nom_fichier,
            pieceId: getDocumentPieceId(d),
            apiPieceId: d.piece_justification_id
          }))
        });
      }
    });
  }, [etape.id, etape.libelle, requiredPieces, optionalPieces, uploadedDocuments, getDocumentPieceId]);

  // Vérifier si tous les documents obligatoires sont validés
  const allRequiredDocumentsValidated = requiredPieces.every(piece => {
    const doc = uploadedDocuments.find(d => {
      // Utiliser le mapping localStorage en priorité, puis piece_justification_id de l'API
      const docPieceId = getDocumentPieceId(d);
      const typeMatch = docPieceId === piece.type_document ||
                       d.piece_justification_id === piece.type_document ||
                       d.type_document_id === piece.type_document ||
                       d.nom_fichier?.toLowerCase().includes(piece.type_document.toLowerCase());
      return typeMatch && d.valide;
    });
    return !!doc;
  });

  // Vérifier si tous les documents obligatoires sont uploadés
  const allRequiredDocumentsUploaded = requiredPieces.every(piece => {
    const doc = uploadedDocuments.find(d => {
      // Utiliser le mapping localStorage en priorité, puis piece_justification_id de l'API
      const docPieceId = getDocumentPieceId(d);
      const typeMatch = docPieceId === piece.type_document ||
                       d.piece_justification_id === piece.type_document ||
                       d.type_document_id === piece.type_document ||
                       d.nom_fichier?.toLowerCase().includes(piece.type_document.toLowerCase());
      
      // Log pour déboguer
      if (typeMatch) {
        console.log('✅ Document trouvé pour pièce:', {
          pieceLibelle: piece.libelle,
          pieceTypeDocument: piece.type_document,
          documentId: d.id,
          documentNom: d.nom_fichier,
          docPieceId: docPieceId,
          apiPieceId: d.piece_justification_id,
          typeDocumentId: d.type_document_id
        });
      }
      
      return typeMatch;
    });
    
    if (!doc) {
      console.log('⚠️ Aucun document trouvé pour pièce:', {
        pieceLibelle: piece.libelle,
        pieceTypeDocument: piece.type_document,
        documentsDisponibles: uploadedDocuments.map(d => ({
          id: d.id,
          nom: d.nom_fichier,
          pieceId: getDocumentPieceId(d),
          apiPieceId: d.piece_justification_id,
          typeDocumentId: d.type_document_id
        }))
      });
    }
    
    return !!doc;
  });

  // Transition autorisée uniquement quand tout est uploadé + validé + autorisé (étape débloquée = pièces obligatoires téléversées)
  const canTransition = allRequiredDocumentsUploaded &&
                        allRequiredDocumentsValidated &&
                        isUserAuthorized(etape.roles) &&
                        !isBlocked;

  // Afficher le bouton dès que toutes les pièces obligatoires sont téléversées (il reste désactivé jusqu'à validation)
  const showTransitionButton = allRequiredDocumentsUploaded && isUserAuthorized(etape.roles);

  const handleUploadClick = () => {
    setUploadDialogOpen(true);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !dossierId) return;

    const file = files[0];
    setUploading(true);

    try {
      // Validation du fichier
      const maxSize = 5 * 1024 * 1024; // 5 MB
      if (file.size > maxSize) {
        alert('Le fichier ne doit pas dépasser 5 MB');
        setUploading(false);
        return;
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        alert('Format non autorisé. Utilisez PDF, JPG ou PNG');
        setUploading(false);
        return;
      }

      // selectedDocumentType correspond à piece.type_document qui est le piece_justification_id
      const pieceJustificationId = selectedDocumentType || undefined;

      // Vérifier que le piece_justification_id correspond à une pièce de l'étape
      const allPieces = [...requiredPieces, ...optionalPieces];
      const matchingPiece = allPieces.find(p => p.type_document === pieceJustificationId);
      
      if (pieceJustificationId && !matchingPiece) {
        console.warn('⚠️ Le piece_justification_id sélectionné ne correspond à aucune pièce de l\'étape:', {
          pieceJustificationId,
          etapeId: etape.id,
          etapeLibelle: etape.libelle,
          piecesDisponibles: allPieces.map(p => ({ libelle: p.libelle, type_document: p.type_document }))
        });
      }

      // Upload du document avec piece_justification_id
      const formData = new FormData();
      formData.append('documentable_id', dossierId);
      formData.append('documentable_type', 'App\\Models\\Dossier');
      formData.append('valide', '0');
      formData.append('commentaires', commentaires || '');
      formData.append('fichier', file, file.name.trim());
      
      if (pieceJustificationId) {
        formData.append('piece_justification_id', pieceJustificationId);
      }
      
      // etape_id est obligatoire selon l'API
      if (etape.id) {
        formData.append('etape_id', String(etape.id));
      }

      console.log('📤 Upload document avec piece_justification_id:', {
        dossierId,
        pieceJustificationId: pieceJustificationId,
        fileName: file.name,
        etapeId: etape.id,
        etapeLibelle: etape.libelle,
        pieceLibelle: matchingPiece?.libelle || 'Aucune pièce correspondante'
      });

      const response = await axiosClient.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000 // 5 minutes
      });

      // Gérer les différents formats de réponse
      let document: Document | null = null;
      
      if (response.data && 'id' in response.data) {
        document = response.data as Document;
      } else if (response.data && typeof response.data === 'object' && 'data' in response.data && (response.data as any).data && 'id' in (response.data as any).data) {
        document = (response.data as any).data as Document;
      } else if (response.data && typeof response.data === 'object' && 'success' in response.data && (response.data as any).data && 'id' in (response.data as any).data) {
        document = (response.data as any).data as Document;
      }

      if (!document || !document.id) {
        throw new Error('Format de réponse inattendu lors de l\'upload du document');
      }

      // Recharger les documents
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }

      // Émettre l'événement avec les informations nécessaires pour le mapping
      window.dispatchEvent(new CustomEvent('documentUploaded', {
        detail: { 
          dossierId,
          document_id: document.id,
          piece_justification_id_original: pieceJustificationId || null,
          piece_justification_id_received: document.piece_justification_id || null,
          etape_id: etape.id || null,
        }
      }));

      setUploadDialogOpen(false);
      setSelectedDocumentType('');
      setCommentaires('');
      if (fileInputRef) {
        fileInputRef.value = '';
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'upload:', error);
      alert(`Erreur lors de l'upload: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Fonction pour vérifier si une date est un mercredi (3) ou samedi (6)
  const isMercrediOuSamedi = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
    return dayOfWeek === 3 || dayOfWeek === 6; // 3 = Mercredi, 6 = Samedi
  };

  // Fonction pour obtenir le prochain mercredi ou samedi disponible
  const getNextAvailableDate = (): string => {
    const today = new Date();
    const daysUntilWednesday = (3 - today.getDay() + 7) % 7 || 7;
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
    
    const nextWednesday = new Date(today);
    nextWednesday.setDate(today.getDate() + daysUntilWednesday);
    
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + daysUntilSaturday);
    
    // Retourner le plus proche
    return nextWednesday <= nextSaturday 
      ? nextWednesday.toISOString().split('T')[0]
      : nextSaturday.toISOString().split('T')[0];
  };

  const handleDateExamenChange = (value: string) => {
    setDateExamen(value);
    setDateExamenError('');
    
    if (value && !isMercrediOuSamedi(value)) {
      setDateExamenError('La date doit être un mercredi ou un samedi');
    }
  };

  const handleOpenDateExamenDialog = () => {
    setDateExamen(getNextAvailableDate());
    setDateExamenError('');
    setDateExamenDialogOpen(true);
  };

  const handleConfirmDateExamen = async () => {
    if (!dateExamen) {
      setDateExamenError('Veuillez sélectionner une date');
      return;
    }

    if (!isMercrediOuSamedi(dateExamen)) {
      setDateExamenError('La date doit être un mercredi ou un samedi');
      return;
    }

    setDateExamenDialogOpen(false);
    await createProgrammeSession(dateExamen);
  };

  const createProgrammeSession = async (dateExamenValue: string) => {
    if (!dossierId) return;

    try {
      setTransmitting(true);
      
      console.log('📤 Création du programme session pour l\'étape ENVOI DU DOSSIER POUR EXAMEN...', {
        etapeId: etape.id,
        etapeLibelle: etape.libelle,
        dossierId,
        dateExamen: dateExamenValue
      });

      // Formater la date au format attendu par l'API
      // Formater la date au format attendu par l'API
      // Utiliser le format ISO 8601 comme dans les autres parties du code
      let formattedDateExamen = dateExamenValue;
      if (dateExamenValue && dateExamenValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Créer un objet Date et le formater en ISO 8601
        const dateObj = new Date(dateExamenValue);
        dateObj.setHours(8, 0, 0, 0); // 08:00:00
        formattedDateExamen = dateObj.toISOString();
        
        console.log('📅 Formatage de la date:', {
          original: dateExamenValue,
          dateObj: dateObj,
          isoString: formattedDateExamen
        });
      }

      const payload = {
        dossier_id: dossierId,
        date_examen: formattedDateExamen
      };

      console.log('📤 Payload envoyé à l\'API:', {
        ...payload,
        date_examen_original: dateExamenValue,
        date_examen_formatted: formattedDateExamen
      });

      const response = await axiosClient.post('/programme-sessions', payload);

      if (response.data?.success || response.data?.programme_session) {
        console.log('✅ Programme session créé avec succès:', response.data);
        
        setProgrammeSessionCreated(true);
        
        // Émettre l'événement pour la création de programme session
        window.dispatchEvent(new CustomEvent('programmeSessionCreated', {
          detail: {
            etapeId: etape.id,
            circuitId,
            dossierId,
            programmeSession: response.data?.programme_session
          }
        }));

        // Ne pas passer automatiquement à l'étape suivante
        // L'utilisateur devra cliquer sur "Passer à l'étape suivante" après validation

        if (onDocumentUploaded) {
          onDocumentUploaded();
        }

        alert('Dossier envoyé à l\'examen avec succès ! Vous pouvez maintenant passer à l\'étape suivante une fois les résultats validés.');
      } else {
        throw new Error('Format de réponse inattendu');
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la création du programme session:', error);
      
      // Afficher tous les détails de l'erreur
      const errorDetails: any = {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        request: {
          url: error.config?.url,
          method: error.config?.method,
          data: error.config?.data,
          headers: error.config?.headers
        }
      };
      
      // Afficher le contenu complet de la réponse
      if (error.response?.data) {
        errorDetails.responseData = error.response.data;
        console.error('❌ Contenu complet de la réponse d\'erreur:', JSON.stringify(error.response.data, null, 2));
      }
      
      console.error('❌ Détails de l\'erreur:', errorDetails);
      
      let errorMessage = 'Erreur lors de la création du programme session';
      
      // Gestion des erreurs détaillée
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Message principal
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        // Analyser l'erreur spécifique
        if (errorData.error && typeof errorData.error === 'string') {
          // Si l'erreur mentionne "email" sur null, c'est un bug backend connu
          if (errorData.error.includes('email') && errorData.error.includes('null')) {
            errorMessage = 'Erreur serveur : Problème de chargement des données du dossier.\n\n' +
                          'Le serveur n\'arrive pas à charger les relations du dossier (candidat, personne, email).\n\n' +
                          'Ceci est un problème technique côté serveur. Veuillez :\n' +
                          '1. Vérifier que le dossier a bien un candidat et une personne associés\n' +
                          '2. Recharger la page et réessayer\n' +
                          '3. Si le problème persiste, contacter l\'administrateur système\n\n' +
                          'Note : Le format de la requête est correct, le problème vient du traitement côté serveur.';
          } else {
            errorMessage = errorData.error;
          }
        }
        
        // Erreurs de validation
        if (errorData.errors) {
          const validationErrors = Object.entries(errorData.errors)
            .map(([field, messages]: [string, any]) => {
              const fieldLabel = field === 'date_examen' ? 'Date d\'examen' : field;
              return `${fieldLabel}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
            })
            .join('\n');
          errorMessage += `\n\nErreurs de validation:\n${validationErrors}`;
        }
        
        // Détails supplémentaires pour les erreurs 500
        if (error.response.status === 500) {
          if (!errorMessage.includes('Données du dossier incomplètes')) {
            errorMessage += '\n\nErreur serveur (500). Veuillez vérifier les logs du serveur ou contacter l\'administrateur.';
          }
          if (errorData.exception || errorData.trace) {
            console.error('❌ Détails techniques de l\'erreur serveur:', {
              exception: errorData.exception,
              trace: errorData.trace
            });
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Afficher l'erreur dans une alerte avec plus de détails
      alert(`Erreur: ${errorMessage}\n\nCode d'erreur: ${error.response?.status || 'N/A'}`);
    } finally {
      setTransmitting(false);
    }
  };

  const handleSendToExamen = () => {
    if (!dossierId) return;
    // Ouvrir le modal pour sélectionner la date d'examen
    handleOpenDateExamenDialog();
  };

  const handleTransmitEtape = async () => {
    if (!canTransition || !dossierId) return;

    // Pour l'étape "ENVOI DU DOSSIER POUR EXAMEN", vérifier que le statut est "reussi"
    if (isEnvoiDossierExamen) {
      if (epreuvesStatus !== 'reussi') {
        alert('Vous ne pouvez pas passer à l\'étape suivante tant que le statut global des épreuves n\'est pas "Validé".');
        return;
      }
      
      // Vérifier aussi que le programme session a été créé
      if (!programmeSessionCreated) {
        alert('Veuillez d\'abord envoyer le dossier à l\'examen.');
        return;
      }
    }

    // Comportement normal pour les autres étapes
    try {
      setTransmitting(true);
      const response = await circuitSuiviService.transmettreEtape(
        etape.id,
        circuitId,
        dossierId
      );

      if (response.success) {
        // Émettre l'événement
        window.dispatchEvent(new CustomEvent('etapeTransmise', {
          detail: {
            etapeId: etape.id,
            circuitId,
            dossierId
          }
        }));

        if (onTransitionToNext) {
          onTransitionToNext();
        }

        if (onDocumentUploaded) {
          onDocumentUploaded();
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la transmission:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors de la transmission';
      alert(`Erreur lors de la transmission: ${errorMessage}`);
    } finally {
      setTransmitting(false);
    }
  };

  // Fonction pour obtenir le libellé du statut
  const getStatutLabel = (statut: EpreuveStatut | null): string => {
    if (!statut) return 'Non chargé';
    switch (statut) {
      case 'reussi': return 'Validé';
      case 'echoue': return 'Échoué';
      case 'absent': return 'Absent';
      case 'non_saisi':
      default: return 'Non saisi';
    }
  };

  // Fonction pour obtenir la couleur du statut
  const getStatutColor = (statut: EpreuveStatut | null): 'success' | 'error' | 'warning' | 'default' => {
    if (!statut) return 'default';
    switch (statut) {
      case 'reussi': return 'success';
      case 'echoue': return 'error';
      case 'absent': return 'warning';
      case 'non_saisi':
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* En-tête de l'étape */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {etape.libelle}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Code: {etape.code}
        </Typography>
        {etape.statut_libelle && (
          <Chip
            label={etape.statut_libelle}
            size="small"
            sx={{ mt: 1 }}
          />
        )}
      </Paper>

      {/* Rôles autorisés */}
      {etape.roles && etape.roles.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Rôles autorisés: {etape.roles.join(', ')}
          {!isUserAuthorized(etape.roles) && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              ⚠️ Vous n'avez pas les permissions nécessaires pour cette étape.
            </Typography>
          )}
        </Alert>
      )}

      {/* Documents obligatoires */}
      {requiredPieces.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Documents obligatoires
          </Typography>
          <List>
            {requiredPieces.map((piece, index) => {
              // Log pour déboguer - afficher toutes les informations de la pièce
              console.log('🔍 Recherche document pour pièce obligatoire:', {
                pieceLibelle: piece.libelle,
                pieceTypeDocument: piece.type_document,
                etapeId: etape.id,
                documentsDisponibles: uploadedDocuments.map(d => ({
                  id: d.id,
                  nom: d.nom_fichier,
                  docPieceId: getDocumentPieceId(d),
                  apiPieceId: d.piece_justification_id,
                  typeDocumentId: d.type_document_id
                }))
              });
              
              const doc = uploadedDocuments.find(d => {
                // Utiliser le mapping localStorage en priorité, puis piece_justification_id de l'API
                const docPieceId = getDocumentPieceId(d);
                const typeMatch = docPieceId === piece.type_document ||
                                 d.piece_justification_id === piece.type_document ||
                                 d.type_document_id === piece.type_document ||
                                 d.nom_fichier?.toLowerCase().includes(piece.type_document.toLowerCase());
                
                // Log pour déboguer
                if (typeMatch) {
                  console.log('✅ Document trouvé pour pièce obligatoire:', {
                    pieceLibelle: piece.libelle,
                    pieceTypeDocument: piece.type_document,
                    documentId: d.id,
                    documentNom: d.nom_fichier,
                    docPieceId: docPieceId,
                    apiPieceId: d.piece_justification_id,
                    typeDocumentId: d.type_document_id
                  });
                }
                
                return typeMatch;
              });
              
              if (!doc) {
                console.log('❌ Aucun document trouvé pour pièce obligatoire:', {
                  pieceLibelle: piece.libelle,
                  pieceTypeDocument: piece.type_document
                });
              }

              return (
                <ListItem key={index}>
                  <ListItemText
                    primary={piece.libelle || piece.type_document}
                    secondary={doc ? (
                      <Box>
                        <Chip
                          icon={doc.valide ? <CheckCircle /> : <Cancel />}
                          label={doc.valide ? 'Validé' : 'En attente de validation'}
                          color={doc.valide ? 'success' : 'warning'}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {doc.nom_fichier}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="error">
                        Non uploadé
                      </Typography>
                    )}
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}

      {/* Documents optionnels */}
      {optionalPieces.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Documents optionnels
          </Typography>
          <List>
            {optionalPieces.map((piece, index) => {
              const doc = uploadedDocuments.find(d => {
                // Utiliser le mapping localStorage en priorité, puis piece_justification_id de l'API
                const docPieceId = getDocumentPieceId(d);
                const typeMatch = docPieceId === piece.type_document ||
                                 d.piece_justification_id === piece.type_document ||
                                 d.type_document_id === piece.type_document ||
                                 d.nom_fichier?.toLowerCase().includes(piece.type_document.toLowerCase());
                
                // Log pour déboguer
                if (typeMatch) {
                  console.log('✅ Document trouvé pour pièce optionnelle:', {
                    pieceLibelle: piece.libelle,
                    pieceTypeDocument: piece.type_document,
                    documentId: d.id,
                    documentNom: d.nom_fichier,
                    docPieceId: docPieceId,
                    apiPieceId: d.piece_justification_id,
                    typeDocumentId: d.type_document_id
                  });
                }
                
                return typeMatch;
              });

              return (
                <ListItem key={index}>
                  <ListItemText
                    primary={piece.libelle || piece.type_document}
                    secondary={doc ? (
                      <Box>
                        <Chip
                          icon={doc.valide ? <CheckCircle /> : <Cancel />}
                          label={doc.valide ? 'Validé' : 'En attente de validation'}
                          color={doc.valide ? 'success' : 'warning'}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {doc.nom_fichier}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Non uploadé
                      </Typography>
                    )}
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      )}

      {/* Tous les documents uploadés */}
      {uploadedDocuments.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Tous les documents
          </Typography>
          <List>
            {uploadedDocuments.map((doc) => (
              <ListItem key={doc.id}>
                <Description sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText
                  primary={doc.nom_fichier}
                  secondary={
                    <Box>
                      <Chip
                        icon={doc.valide ? <CheckCircle /> : <Cancel />}
                        label={doc.valide ? 'Validé' : 'En attente de validation'}
                        color={doc.valide ? 'success' : 'warning'}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      {doc.created_at && (
                        <Typography variant="caption" color="text.secondary">
                          Uploadé le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Statut des résultats pour l'étape ENVOI DOSSIER POUR EXAMEN */}
      {isEnvoiDossierExamen && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: 'background.default' }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            Statut des résultats d'examen
          </Typography>
          {loadingEpreuves ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Chargement du statut...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <Chip
                label={getStatutLabel(epreuvesStatus)}
                color={getStatutColor(epreuvesStatus)}
                size="medium"
                variant={epreuvesStatus === 'non_saisi' ? 'outlined' : 'filled'}
              />
              <Typography variant="body2" color="text.secondary">
                {epreuvesStatus === 'reussi' && '✅ Toutes les épreuves sont validées'}
                {epreuvesStatus === 'echoue' && '❌ Au moins une épreuve est échouée'}
                {epreuvesStatus === 'absent' && '⚠️ Au moins un candidat est absent'}
                {epreuvesStatus === 'non_saisi' && '📝 En attente de saisie des résultats'}
              </Typography>
            </Box>
          )}
          {!programmeSessionCreated && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Veuillez envoyer le dossier à l'examen pour commencer le processus.
            </Alert>
          )}
          {programmeSessionCreated && epreuvesStatus !== 'reussi' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Le dossier a été envoyé à l'examen. Vous devez attendre que toutes les épreuves soient validées avant de pouvoir passer à l'étape suivante.
            </Alert>
          )}
        </Paper>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={<Upload />}
          onClick={handleUploadClick}
          disabled={!dossierId || uploading}
        >
          Ajouter un document
        </Button>

        {/* Bouton "Envoyer à l'examen" : désactivé dès que le dossier est envoyé OU que les résultats sont validés */}
        {isEnvoiDossierExamen && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleSendToExamen}
            disabled={!dossierId || transmitting || programmeSessionCreated || epreuvesStatus === 'reussi'}
            sx={{ opacity: programmeSessionCreated || epreuvesStatus === 'reussi' ? 0.6 : 1 }}
          >
            {transmitting ? <CircularProgress size={20} /> : 'Envoyer à l\'examen'}
          </Button>
        )}

        {/* Bouton "Passer à l'étape suivante" : visible dès que toutes les pièces obligatoires sont téléversées, activé quand validées */}
        {showTransitionButton && (
          <Button
            variant="contained"
            onClick={handleTransmitEtape}
            disabled={
              !canTransition ||
              transmitting ||
              (isEnvoiDossierExamen && epreuvesStatus !== 'reussi')
            }
          >
            {transmitting ? <CircularProgress size={20} /> : 'Passer à l\'étape suivante'}
          </Button>
        )}
      </Box>

      {/* Alerte : étape bloquée uniquement tant que les pièces obligatoires ne sont pas téléversées */}
      {requiredPieces.length > 0 && !canTransition && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {!allRequiredDocumentsUploaded && 'Tous les documents obligatoires doivent être uploadés pour débloquer cette étape. '}
          {allRequiredDocumentsUploaded && !allRequiredDocumentsValidated && 'Tous les documents obligatoires doivent être validés pour passer à l\'étape suivante. '}
          {!isUserAuthorized(etape.roles) && 'Vous n\'avez pas les permissions nécessaires. '}
          {isBlocked && 'Cette étape est bloquée.'}
        </Alert>
      )}

      {/* Dialog d'upload */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter un document</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Type de document</InputLabel>
            <Select
              value={selectedDocumentType}
              onChange={(e) => setSelectedDocumentType(e.target.value)}
              label="Type de document"
            >
              {typeDocuments.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name || type.libelle}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Commentaires (optionnel)"
            multiline
            rows={3}
            value={commentaires}
            onChange={(e) => setCommentaires(e.target.value)}
            sx={{ mb: 2 }}
          />
          <input
            type="file"
            ref={(ref) => setFileInputRef(ref)}
            onChange={handleFileSelect}
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
          />
          <Button
            variant="outlined"
            fullWidth
            onClick={() => fileInputRef?.click()}
            disabled={uploading}
            startIcon={<Upload />}
          >
            {uploading ? <CircularProgress size={20} /> : 'Sélectionner un fichier'}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Annuler</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de sélection de date d'examen */}
      <Dialog open={dateExamenDialogOpen} onClose={() => setDateExamenDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Sélectionner la date d'examen</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Veuillez sélectionner une date d'examen. Seuls les mercredis et samedis sont autorisés.
          </Alert>
          <TextField
            fullWidth
            label="Date d'examen"
            type="date"
            value={dateExamen}
            onChange={(e) => handleDateExamenChange(e.target.value)}
            error={!!dateExamenError}
            helperText={dateExamenError || 'Sélectionnez un mercredi ou un samedi'}
            InputLabelProps={{ shrink: true }}
            inputProps={{
              min: new Date().toISOString().split('T')[0],
            }}
            sx={{ mt: 2 }}
          />
          {dateExamen && isMercrediOuSamedi(dateExamen) && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Date valide : {new Date(dateExamen).toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDateExamenDialogOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleConfirmDateExamen}
            disabled={!dateExamen || !!dateExamenError || !isMercrediOuSamedi(dateExamen)}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EtapeDetails;

