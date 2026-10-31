import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  Card,
  CardContent,
  Button,
  Stack,
  Tooltip,
  LinearProgress
} from '@mui/material';
// Heroicons imports
import { 
  XMarkIcon, 
  UserIcon, 
  AcademicCapIcon, 
  DocumentTextIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  MapPinIcon, 
  EyeIcon,
  CloudArrowUpIcon, 
  TrashIcon, 
  ArrowDownTrayIcon 
} from '@heroicons/react/24/outline';
import { EleveValide } from '../services/validationService';
import DossierCompletionSheet from './DossierCompletionSheet';
import ValidationService from '../services/validationService';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from '@mui/material';
import axiosClient from '../../../shared/utils/axiosConfig';
import { autoEcoleService } from '../../cnepc/services/auto-ecole.service';

interface EleveDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  eleve: EleveValide | null;
}

const EleveDetailsSheet: React.FC<EleveDetailsSheetProps> = ({
  open,
  onClose,
  eleve
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
  const [replacingDocumentId, setReplacingDocumentId] = useState<string | null>(null);
  const [completionSheetOpen, setCompletionSheetOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendDate, setSendDate] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendResp, setSendResp] = useState<any>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentsFromApi, setDocumentsFromApi] = useState<any[]>([]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Charger les documents depuis l'API quand le sheet s'ouvre
  useEffect(() => {
    if (open && eleve && eleve.demandeId) {
      chargerDocuments();
    }
  }, [open, eleve]);

  // Fonction pour charger les documents depuis l'API
  const chargerDocuments = async () => {
    if (!eleve?.demandeId) return;

    try {
      setLoadingDocuments(true);
      // Utiliser l'endpoint GET /documents?dossier_id={dossierId}
      const response = await axiosClient.get('/documents', {
        params: {
          dossier_id: eleve.demandeId
        }
      });

      if (response.data.success && response.data.data) {
        const documents = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
        
        // Mapper les documents pour correspondre au format attendu
        const mappedDocuments = documents.map((doc: any) => ({
          id: doc.id,
          nom: doc.nom_fichier || doc.nom,
          nom_fichier: doc.nom_fichier || doc.nom,
          chemin_fichier: doc.chemin_fichier,
          url: doc.chemin_fichier,
          taille: doc.taille_fichier_formate || formatFileSize(doc.taille_fichier || 0),
          taille_fichier: doc.taille_fichier,
          type_mime: doc.type_mime,
          type: doc.type_mime,
          valide: doc.valide,
          valide_libelle: doc.valide_libelle || (doc.valide ? 'Validé' : 'Non validé'),
          dateUpload: doc.created_at || doc.date_upload,
          created_at: doc.created_at,
          commentaires: doc.commentaires
        }));

        setDocumentsFromApi(mappedDocuments);
        console.log('✅ Documents chargés depuis l\'API:', mappedDocuments.length);
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du chargement des documents:', error);
      // Ne pas bloquer l'affichage si le chargement échoue
      setDocumentsFromApi([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  if (!eleve) return null;

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'validated': return 'success';
      default: return 'default';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'validated': return 'Validé';
      default: return 'Inconnu';
    }
  };


  const handleViewDocument = async (document: any) => {
    try {
      // Si le document a un fichier (document uploadé localement), créer une URL temporaire
      if (document.file) {
        const url = URL.createObjectURL(document.file);
        window.open(url, '_blank');
        // Nettoyer l'URL après un délai pour libérer la mémoire
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      // Pour ouvrir un document depuis le serveur
      if (!document.id) {
        alert(`Impossible d'ouvrir le document: ${document.nom || document.nom_fichier}\n\nLe document n'a pas d'ID valide.`);
        return;
      }

      console.log('📄 Ouverture du document PDF:', {
        nom: document.nom || document.nom_fichier,
        id: document.id,
        chemin_fichier: document.chemin_fichier,
        type_mime: document.type_mime
      });

      // Essayer différentes méthodes pour récupérer le fichier PDF
      const endpoints = [
        // Méthode 1: Endpoint direct avec Accept header pour forcer le binaire
        { url: `/documents/${document.id}`, headers: { 'Accept': 'application/pdf,application/octet-stream,*/*' } },
        // Méthode 2: Endpoint de téléchargement
        { url: `/documents/${document.id}/download`, headers: {} },
        // Méthode 3: Endpoint file
        { url: `/documents/${document.id}/file`, headers: {} },
        // Méthode 4: Via chemin_fichier
        ...(document.chemin_fichier ? [{ url: `/storage/${document.chemin_fichier}`, headers: {} }] : []),
        // Méthode 5: Via files endpoint
        ...(document.chemin_fichier ? [{ url: `/files/${document.chemin_fichier}`, headers: {} }] : [])
      ];

      let lastError: any = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Tentative avec: ${endpoint.url}`);
          
          // Télécharger le document avec axios pour inclure le token d'authentification
          const response = await axiosClient.get(endpoint.url, {
            responseType: 'blob', // Important : récupérer le fichier en tant que blob
            headers: endpoint.headers
          });

          // Vérifier que la réponse est bien un blob (pas du JSON)
          // Si le Content-Type est application/json, c'est que c'est les métadonnées, pas le fichier
          const contentType = response.headers['content-type'] || '';
          if (contentType.includes('application/json')) {
            console.log('⚠️ Réponse JSON reçue au lieu du fichier, essai de la méthode suivante');
            continue; // Essayer la méthode suivante
          }

          if (response.data instanceof Blob && response.data.size > 0) {
            // Créer une URL blob à partir de la réponse
            const blob = new Blob([response.data], {
              type: response.headers['content-type'] || document.type_mime || 'application/pdf'
            });
            const url = URL.createObjectURL(blob);
            
            // Ouvrir le document dans un nouvel onglet (le navigateur ouvrira le PDF avec son viewer intégré)
            window.open(url, '_blank');
            
            // Nettoyer l'URL après un délai plus long pour permettre l'ouverture
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            
            console.log('✅ Document ouvert avec succès');
            return; // Succès, sortir de la fonction
          }
        } catch (error: any) {
          console.log(`❌ Erreur avec ${endpoint.url}:`, error?.response?.status || error?.message);
          lastError = error;
          continue; // Essayer la méthode suivante
        }
      }

      // Si toutes les méthodes ont échoué
      throw lastError || new Error('Toutes les méthodes de récupération du fichier ont échoué');
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'ouverture du document:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Erreur lors de l\'ouverture du document';
      alert(`Erreur lors de l'ouverture du document: ${document.nom || document.nom_fichier}\n\n${errorMessage}`);
    }
  };

  // Fonction pour obtenir tous les documents (depuis API + origine + uploadés)
  const getAllDocuments = () => {
    // Priorité : documents depuis l'API > documents originaux > documents uploadés localement
    const apiDocs = documentsFromApi || [];
    const originalDocs = eleve.originalDocuments || [];
    const uploadedDocs = uploadedDocuments || [];
    
    // Fusionner tous les documents en évitant les doublons (par ID)
    const allDocsMap = new Map();
    
    // D'abord les documents depuis l'API (les plus à jour)
    apiDocs.forEach((doc: any) => {
      if (doc.id) {
        allDocsMap.set(doc.id, doc);
      }
    });
    
    // Ensuite les documents originaux (si pas déjà présents)
    originalDocs.forEach((doc: any) => {
      if (doc.id && !allDocsMap.has(doc.id)) {
        allDocsMap.set(doc.id, doc);
      }
    });
    
    // Enfin les documents uploadés localement
    uploadedDocs.forEach((doc: any) => {
      if (doc.id && !allDocsMap.has(doc.id)) {
        allDocsMap.set(doc.id, doc);
      }
    });
    
    return Array.from(allDocsMap.values());
  };

  const handleDownloadDocument = async (document: any) => {
    try {
      // Si le document a un fichier (document uploadé localement), télécharger directement
      if (document.file) {
        const url = URL.createObjectURL(document.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.nom || document.nom_fichier;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // Pour télécharger un document depuis le serveur, utiliser le chemin_fichier ou l'endpoint de téléchargement
      if (document.id) {
        console.log('📥 Téléchargement du document via API avec authentification:', {
          nom: document.nom || document.nom_fichier,
          id: document.id,
          chemin_fichier: document.chemin_fichier
        });

        // Essayer d'abord avec le chemin_fichier via /storage/{chemin_fichier}
        // Sinon utiliser l'endpoint /documents/{id}/download
        let documentUrl = '';
        
        if (document.chemin_fichier) {
          documentUrl = `/storage/${document.chemin_fichier}`;
        } else {
          documentUrl = `/documents/${document.id}/download`;
        }

        try {
          // Télécharger le document avec axios pour inclure le token d'authentification
          const response = await axiosClient.get(documentUrl, {
            responseType: 'blob', // Important : récupérer le fichier en tant que blob
          });

          // Créer une URL blob à partir de la réponse
          const blob = new Blob([response.data], {
            type: response.headers['content-type'] || document.type_mime || 'application/pdf'
          });
          const url = URL.createObjectURL(blob);
          
          // Créer un lien de téléchargement
          const a = document.createElement('a');
          a.href = url;
          a.download = document.nom || document.nom_fichier || 'document';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Nettoyer l'URL après un délai
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error: any) {
          // Si l'erreur est 404, essayer l'autre méthode
          if (error?.response?.status === 404 && document.chemin_fichier) {
            const altUrl = `/documents/${document.id}/download`;
            const altResponse = await axiosClient.get(altUrl, {
              responseType: 'blob',
            });
            const blob = new Blob([altResponse.data], {
              type: altResponse.headers['content-type'] || document.type_mime || 'application/pdf'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = document.nom || document.nom_fichier || 'document';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } else {
            throw error;
          }
        }
      } else {
        alert(`Impossible de télécharger le document: ${document.nom || document.nom_fichier}\n\nLe document n'a pas d'ID valide.`);
      }
    } catch (error: any) {
      console.error('❌ Erreur lors du téléchargement du document:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Erreur lors du téléchargement du document';
      alert(`Erreur lors du téléchargement du document: ${document.nom || document.nom_fichier}\n\n${errorMessage}`);
    }
  };

  const handleReplaceDocument = (document: any) => {
    setReplacingDocumentId(document.id);
    if (fileInputRef) {
      fileInputRef.click();
    }
  };

  const handleDeleteDocument = (document: any) => {
    console.log('Suppression du document:', document.nom);
  };

  const handleUploadNewDocument = () => {
    if (fileInputRef) {
      fileInputRef.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !eleve) return;

    const file = files[0];
    setUploading(true);

    try {
      // Validation du fichier avant upload
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

      // Import dynamique d'axiosClient
      const { default: axiosClient } = await import('../../../shared/utils/axiosConfig');
      
      // Format attendu par le backend : fichier doit être un File object dans FormData
      const cleanFileName = file.name.trim();
      const dossierId = eleve.demandeId;
      
      // Utiliser FormData pour envoyer le fichier réel
      const formData = new FormData();
      formData.append('documentable_id', dossierId);
      formData.append('documentable_type', 'App\\Models\\Dossier');
      // Laravel attend un booléen, utiliser '0' pour false et '1' pour true
      formData.append('valide', '0');
      formData.append('commentaires', '');
      formData.append('fichier', file, cleanFileName);

      console.log('📤 Upload document (FormData):', {
        documentable_id: dossierId,
        documentable_type: 'App\\Models\\Dossier',
        valide: false,
        commentaires: '',
        fichier: `[File: ${cleanFileName}, ${file.size} bytes, ${file.type}]`
      });

      // Envoi avec FormData (Content-Type sera automatiquement multipart/form-data)
      const response = await axiosClient.post('/documents', formData, {
        timeout: 300000, // 5 minutes selon la documentation
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success && response.data.data) {
        const newDocument = {
          id: response.data.data.id,
          nom: response.data.data.nom_fichier || file.name,
          nom_fichier: response.data.data.nom_fichier || file.name,
          chemin_fichier: response.data.data.chemin_fichier,
          url: response.data.data.chemin_fichier,
          taille: response.data.data.taille_fichier_formate || formatFileSize(file.size),
          taille_fichier: response.data.data.taille_fichier || file.size,
          type_mime: response.data.data.type_mime || file.type,
          type: response.data.data.type_mime || file.type,
          valide: response.data.data.valide || false,
          valide_libelle: response.data.data.valide_libelle || (response.data.data.valide ? 'Validé' : 'Non validé'),
          dateUpload: response.data.data.created_at || new Date().toISOString(),
          created_at: response.data.data.created_at || new Date().toISOString(),
          commentaires: response.data.data.commentaires || '',
          isReplacement: !!replacingDocumentId
        };
        
        if (replacingDocumentId) {
          setUploadedDocuments(prev => 
            prev.map(doc => doc.id === replacingDocumentId ? newDocument : doc)
          );
          setReplacingDocumentId(null);
        } else {
          setUploadedDocuments(prev => [...prev, newDocument]);
        }
        
        // Recharger les documents depuis l'API pour avoir les données complètes
        await chargerDocuments();
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'upload du document:', error);
      
      // Log détaillé de la réponse du serveur
      if (error.response) {
        console.error('📋 Réponse du serveur:', {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data,
        });
        
        // Afficher tout le contenu de data
        console.error('📄 Données de l\'erreur (error.response.data):', JSON.stringify(error.response.data, null, 2));
        
        // Si c'est un objet, afficher ses propriétés
        if (error.response.data && typeof error.response.data === 'object') {
          console.error('📋 Propriétés de error.response.data:', Object.keys(error.response.data));
          if (error.response.data.errors) {
            console.error('🔍 Erreurs de validation:', error.response.data.errors);
          }
          if (error.response.data.message) {
            console.error('💬 Message:', error.response.data.message);
          }
        }
      } else {
        console.error('⚠️ Pas de réponse du serveur (erreur réseau?)');
      }
      
      // Afficher le message d'erreur détaillé du serveur
      let errorMessage = 'Erreur lors de l\'upload du document';
      
      if (error.response?.status === 422) {
        // Erreur de validation - afficher les détails
        console.error('🚫 Erreur 422 - Validation échouée');
        
        if (error.response.data?.errors) {
          // Si c'est un objet d'erreurs de validation Laravel
          const errors = Object.entries(error.response.data.errors)
            .map(([field, messages]: [string, any]) => {
              const fieldName = field.replace(/_/g, ' ');
              const messagesList = Array.isArray(messages) ? messages : [messages];
              return `${fieldName}: ${messagesList.join(', ')}`;
            })
            .join('\n');
          errorMessage = `Erreurs de validation:\n${errors}`;
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = 'Erreur de validation. Veuillez vérifier les données du document.';
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // (supprimé) Ouverture du sheet de complétion désormais non utilisée

  // Fonction pour fermer le sheet de complétion
  const handleCloseCompletionSheet = () => {
    setCompletionSheetOpen(false);
  };

  // Fonction appelée quand la complétion réussit
  const handleCompletionSuccess = () => {
    console.log('Dossier complété avec succès - l\'élève a été transféré vers le module de validation');
    setCompletionSheetOpen(false);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 400, md: 500 },
          maxWidth: '100vw',
          boxShadow: 'none',
          borderLeft: '1px solid',
          borderColor: 'divider',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        },
      }}
    >
      <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" component="h2" fontWeight="bold" className="font-display">
            Détails de l'élève
          </Typography>
          <IconButton onClick={onClose} size="small">
            <XMarkIcon className="w-5 h-5" />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Contenu principal */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {/* Informations de base */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
                <Typography variant="h6" fontWeight="bold" className="font-display">
                  {eleve.firstName} {eleve.lastName}
                </Typography>
              </Box>
              
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EnvelopeIcon className="w-5 h-5 mr-2 text-gray-500" />
                  <Typography variant="body2" className="font-primary">{eleve.email}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon className="w-5 h-5 mr-2 text-gray-500" />
                  <Typography variant="body2" className="font-primary">{eleve.phone}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <MapPinIcon className="w-5 h-5 mr-2 text-gray-500 mt-0.5" />
                  <Typography variant="body2" className="font-primary">{eleve.address}</Typography>
                </Box>
                
                {(eleve as any).birthDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <UserIcon className="w-5 h-5 mr-2 text-gray-500" />
                    <Typography variant="body2" className="font-primary">
                      Né(e) le {new Date((eleve as any).birthDate).toLocaleDateString('fr-FR')}
                    </Typography>
                  </Box>
                )}
                
                {(eleve as any).lieuNaissance && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MapPinIcon className="w-5 h-5 mr-2 text-gray-500" />
                    <Typography variant="body2" className="font-primary">
                      Lieu de naissance: {(eleve as any).lieuNaissance}
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AcademicCapIcon className="w-5 h-5 mr-2 text-gray-500" />
                  <Typography variant="body2" className="font-primary">
                    Nationalité: {(eleve as any).nationality || 'Non spécifiée'}
                    {(eleve as any).nationaliteEtrangere && (eleve as any).nationality === 'Étrangère' && 
                      ` (${(eleve as any).nationaliteEtrangere})`
                    }
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Informations de l'auto-école */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AcademicCapIcon className="w-5 h-5 mr-2 text-blue-600" />
                <Typography variant="h6" fontWeight="bold" className="font-display">
                  Auto-École
                </Typography>
              </Box>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
                    Nom de l'auto-école
                  </Typography>
                  <Typography variant="body1" className="font-primary">
                    {eleve.autoEcole.name}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
                    Date de validation
                  </Typography>
                  <Typography variant="body1" className="font-primary">
                    {new Date(eleve.validatedAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
                    Statut
                  </Typography>
                  <Chip
                    label={getStatutLabel(eleve.status)}
                    color={getStatutColor(eleve.status) as any}
                    size="small"
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
                    ID de la demande
                  </Typography>
                  <Typography variant="body1" className="font-primary">
                    {eleve.demandeId}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DocumentTextIcon className="w-5 h-5 mr-2 text-blue-600" />
                  <Typography variant="h6" fontWeight="bold" className="font-display">
                    Documents ({getAllDocuments().length})
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CloudArrowUpIcon className="w-4 h-4" />}
                  onClick={handleUploadNewDocument}
                  disabled={uploading}
                  sx={{ 
                    backgroundColor: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.dark'
                    }
                  }}
                >
                  Ajouter un document
                </Button>
              </Box>

              {(uploading || loadingDocuments) && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress />
                  <Typography variant="caption" color="text.secondary" className="font-primary">
                    {loadingDocuments ? 'Chargement des documents...' : 'Upload en cours...'}
                  </Typography>
                </Box>
              )}

              {/* Input file caché */}
              <input
                type="file"
                ref={setFileInputRef}
                onChange={handleFileSelect}
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
                style={{ display: 'none' }}
              />

              {/* Documents existants + uploadés */}
              {getAllDocuments().length > 0 ? (
                <Stack spacing={2}>
                  {/* Documents existants (non remplacés) */}
                  {(eleve.originalDocuments || [])
                    .filter((doc: any) => !uploadedDocuments.some(uploaded => uploaded.id === doc.id))
                    .map((doc: any) => (
                    <Box
                      key={doc.id}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        backgroundColor: 'background.paper'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="medium" gutterBottom className="font-primary">
                            {doc.nom}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" className="font-primary">
                            Taille: {doc.taille}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" className="font-primary">
                            Uploadé le {new Date(doc.dateUpload).toLocaleDateString('fr-FR')}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                          <Tooltip title="Voir le document">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDocument(doc)}
                              color="primary"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Télécharger">
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadDocument(doc)}
                              color="secondary"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remplacer">
                            <IconButton
                              size="small"
                              onClick={() => handleReplaceDocument(doc)}
                              color="warning"
                            >
                              <CloudArrowUpIcon className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteDocument(doc)}
                              color="error"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  ))}

                  {/* Documents uploadés/remplacés */}
                  {uploadedDocuments.map((doc) => (
                    <Box
                      key={doc.id}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        backgroundColor: 'background.paper'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" fontWeight="medium" gutterBottom className="font-primary">
                            {doc.nom}
                            {doc.isReplacement && (
                              <Chip 
                                label="Remplacé" 
                                size="small" 
                                color="warning" 
                                sx={{ ml: 1, fontSize: '0.7rem' }}
                              />
                            )}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" className="font-primary">
                            Taille: {doc.taille}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" className="font-primary">
                            {doc.isReplacement ? 'Remplacé' : 'Uploadé'} le {new Date(doc.dateUpload).toLocaleDateString('fr-FR')}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                          <Tooltip title="Voir le document">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDocument(doc)}
                              color="primary"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Télécharger">
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadDocument(doc)}
                              color="secondary"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Remplacer">
                            <IconButton
                              size="small"
                              onClick={() => handleReplaceDocument(doc)}
                              color="warning"
                            >
                              <CloudArrowUpIcon className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setUploadedDocuments(prev => prev.filter(d => d.id !== doc.id));
                                handleDeleteDocument(doc);
                              }}
                              color="error"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <Typography variant="h6" color="text.secondary" gutterBottom className="font-display">
                    Aucun document uploadé
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }} className="font-primary">
                    Cliquez sur le bouton ci-dessous pour ajouter des documents
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<CloudArrowUpIcon className="w-5 h-5" />}
                    onClick={handleUploadNewDocument}
                    disabled={uploading}
                    sx={{ 
                      backgroundColor: 'primary.main',
                      px: 4,
                      py: 1.5,
                      '&:hover': {
                        backgroundColor: 'primary.dark'
                      }
                    }}
                  >
                    Ajouter le premier document
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Actions */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => setSendDialogOpen(true)}
              className="font-primary"
            >
              Envoyer à la CNEPC
            </Button>
            <Button variant="outlined" onClick={onClose} className="font-primary">
              Fermer
            </Button>
          </Stack>
        </Box>
      </Box>


      {/* Sheet de complétion du dossier */}
      <DossierCompletionSheet
        open={completionSheetOpen}
        onClose={handleCloseCompletionSheet}
        eleve={eleve}
        onCompletionSuccess={handleCompletionSuccess}
      />

  {/* Modal d'envoi à la CNEPC */}
  <Dialog open={sendDialogOpen} onClose={() => setSendDialogOpen(false)} maxWidth="xs" fullWidth>
    <DialogTitle>Envoyer à la CNEPC</DialogTitle>
    <DialogContent>
      {sendError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSendError(null)}>
          {sendError}
        </Alert>
      )}
      {sendSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSendSuccess(null)}>
          {sendSuccess}
        </Alert>
      )}
      {sendResp && (
        <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Réponse CNEPC (résumé)</Typography>
          <Typography variant="body2">ID programme: {sendResp?.programme_session?.id || '-'}</Typography>
          <Typography variant="body2">Dossier: {sendResp?.programme_session?.dossier_id || '-'}</Typography>
          <Typography variant="body2">Date examen: {sendResp?.programme_session?.date_examen || '-'}</Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">JSON complet:</Typography>
            <Box component="pre" sx={{ maxHeight: 200, overflow: 'auto', p: 1, backgroundColor: '#f7f7f7', borderRadius: 1 }}>
{`${JSON.stringify(sendResp, null, 2)}`}
            </Box>
          </Box>
        </Box>
      )}
      <TextField
        label="Date d'examen"
        type="datetime-local"
        value={sendDate}
        onChange={(e) => setSendDate(e.target.value)}
        InputLabelProps={{ shrink: true }}
        fullWidth
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setSendDialogOpen(false)}>Annuler</Button>
      <Button
        variant="contained"
        onClick={async () => {
          try {
            setSending(true);
            setSendError(null);
            if (!sendDate) {
              setSendError('Veuillez sélectionner la date d\'examen.');
              setSending(false);
              return;
            }
            const payload = {
              dossier_id: eleve.demandeId,
              date_examen: new Date(sendDate).toISOString(),
            };
            console.log('🚚 Envoi à la CNEPC - payload:', payload);
            const resp = await ValidationService.envoyerAuCNEPC(payload);
            console.log('✅ Réponse CNEPC (raw):', resp);
            
            // Mettre à jour le statut du dossier à "valide" via PUT /dossiers/{id}
            try {
              console.log('🔄 Mise à jour du statut du dossier à "transmis"...');
              await autoEcoleService.updateDossier(eleve.demandeId, {
                statut: 'transmis'
              } as any);
              console.log('✅ Statut du dossier mis à jour à "transmis"');
              
              // Émettre un événement pour rafraîchir les statistiques du dashboard
              window.dispatchEvent(new CustomEvent('dossierTransmis', { 
                detail: { dossierId: eleve.demandeId } 
              }));
            } catch (updateError: any) {
              console.error('⚠️ Erreur lors de la mise à jour du statut du dossier:', updateError);
              // Ne pas bloquer l'envoi si la mise à jour du statut échoue
            }
            
            try {
              const ps = resp?.programme_session;
              console.log('🧾 Programme session résumé:', {
                id: ps?.id,
                dossier_id: ps?.dossier_id,
                date_examen: ps?.date_examen,
                created_at: ps?.created_at,
              });
              const dossier = ps?.dossier;
              if (dossier) {
                console.log('👤 Candidat.personne:', dossier?.candidat?.personne);
                console.log('🏫 Auto-école:', dossier?.auto_ecole || dossier?.formation?.auto_ecole);
                console.log('📚 Formation:', dossier?.formation);
                console.log('📄 Documents (count):', Array.isArray(dossier?.documents) ? dossier.documents.length : 0);
              }
            } catch {}
            setSendResp(resp);
            // Les données sont maintenant stockées directement dans la base de données
            // Plus besoin de localStorage
            setSendSuccess('Dossier envoyé avec succès.');
            setTimeout(() => setSendDialogOpen(false), 1000);
          } catch (e: any) {
            setSendError(e?.message || 'Erreur lors de l\'envoi');
          } finally {
            setSending(false);
          }
        }}
        disabled={sending}
      >
        {sending ? 'Envoi...' : 'Envoyer'}
      </Button>
    </DialogActions>
  </Dialog>
    </Drawer>
  );
};

export default EleveDetailsSheet;
