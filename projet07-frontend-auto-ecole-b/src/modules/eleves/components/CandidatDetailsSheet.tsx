import React, { useState, useRef, useEffect } from 'react';
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
  LinearProgress,
  Alert,
  Snackbar
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
  ArrowDownTrayIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';
import { DemandeInscription } from '../types/inscription';
import ValidationService from '../services/validationService';
import axiosClient from '../../../shared/utils/axiosConfig';

interface CandidatDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  candidat: DemandeInscription | null;
  onValidationSuccess?: (eleveValide: any) => void; // Callback avec l'élève validé
}

const CandidatDetailsSheet: React.FC<CandidatDetailsSheetProps> = ({
  open,
  onClose,
  candidat,
  onValidationSuccess
}) => {
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentsFromApi, setDocumentsFromApi] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les documents depuis l'API quand le sheet s'ouvre
  useEffect(() => {
    if (open && candidat && candidat.id) {
      chargerDocuments();
    }
  }, [open, candidat]);

  // Fonction pour obtenir tous les documents (depuis API + originaux)
  const getAllDocuments = () => {
    // Priorité : documents depuis l'API > documents originaux
    const apiDocs = documentsFromApi || [];
    const originalDocs = candidat?.documents || [];
    
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
    
    return Array.from(allDocsMap.values());
  };

  // Fonction pour charger les documents depuis l'API
  const chargerDocuments = async () => {
    if (!candidat?.id) return;

    try {
      setLoadingDocuments(true);
      // Utiliser l'endpoint GET /documents?dossier_id={dossierId}
      const response = await axiosClient.get('/documents', {
        params: {
          dossier_id: candidat.id
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
          taille_fichier_formate: doc.taille_fichier_formate,
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!candidat) return null;

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'en_attente': return 'warning';
      case 'validee': return 'success';
      case 'rejetee': return 'error';
      default: return 'default';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'en_attente': return 'En attente';
      case 'validee': return 'Validée';
      case 'rejetee': return 'Rejetée';
      default: return statut;
    }
  };


  const handleViewDocument = async (document: any) => {
    try {
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
      alert(`Erreur lors de l'ouverture du document: ${document.nom || document.nom_fichier}\n\n${errorMessage}\n\nVérifiez que le fichier existe sur le serveur.`);
    }
  };

  const handleDownloadDocument = async (document: any) => {
    try {
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

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !candidat) return;

    const file = files[0];
    setUploading(true);

    try {
      // Validation du fichier avant upload
      const maxSize = 5 * 1024 * 1024; // 5 MB
      if (file.size > maxSize) {
        setSnackbar({
          open: true,
          message: 'Le fichier ne doit pas dépasser 5 MB',
          severity: 'error'
        });
        setUploading(false);
        return;
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setSnackbar({
          open: true,
          message: 'Format non autorisé. Utilisez PDF, JPG ou PNG',
          severity: 'error'
        });
        setUploading(false);
        return;
      }

      // Format attendu par le backend : fichier doit être un File object dans FormData
      const cleanFileName = file.name.trim();
      
      // Utiliser FormData pour envoyer le fichier réel
      const formData = new FormData();
      formData.append('documentable_id', candidat.id);
      formData.append('documentable_type', 'App\\Models\\Dossier');
      // Laravel attend un booléen, utiliser '0' pour false et '1' pour true
      formData.append('valide', '0');
      formData.append('commentaires', '');
      formData.append('fichier', file, cleanFileName);

      console.log('📤 Upload document (FormData):', {
        documentable_id: candidat.id,
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
        // Structure de réponse conforme à l'API documentée
        const newDocument = {
          id: response.data.data.id,
          nom: response.data.data.nom_fichier,
          nom_fichier: response.data.data.nom_fichier,
          chemin_fichier: response.data.data.chemin_fichier,
          taille: response.data.data.taille_fichier_formate,
          taille_fichier: response.data.data.taille_fichier,
          type_mime: response.data.data.type_mime,
          valide: response.data.data.valide,
          valide_libelle: response.data.data.valide_libelle || (response.data.data.valide ? 'Validé' : 'Non validé'),
          dateUpload: response.data.data.created_at,
          url: response.data.data.chemin_fichier,
          commentaires: response.data.data.commentaires,
        };

        // Ajouter le nouveau document à la liste des documents depuis l'API
        setDocumentsFromApi(prev => [...prev, newDocument]);
        
        setSnackbar({
          open: true,
          message: response.data.message || 'Document uploadé avec succès',
          severity: 'success'
        });
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
      } else if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          // Vérifier si l'erreur indique un problème de chemin_fichier
          const errorText = error.response.data.error;
          if (errorText.includes('chemin_fichier') && errorText.includes('null value')) {
            errorMessage = 'Le serveur n\'a pas pu traiter le fichier. Le backend ne génère pas le chemin du fichier. Veuillez contacter l\'administrateur.';
          } else {
            errorMessage = errorText;
          }
        } else if (error.response.data.errors) {
          // Si c'est un objet d'erreurs de validation Laravel
          const errors = Object.entries(error.response.data.errors)
            .map(([field, messages]: [string, any]) => 
              `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
            )
            .join('; ');
          errorMessage = `Erreurs de validation: ${errors}`;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else {
          // Afficher le JSON de l'erreur si on ne peut pas extraire un message
          errorMessage = JSON.stringify(error.response.data);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Message spécial pour les erreurs 500 liées aux fichiers
      if (error.response?.status === 500) {
        console.error('❌ Erreur serveur 500: Le backend ne traite probablement pas les métadonnées du document correctement.');
        console.error('💡 Suggestion: Vérifier que le backend reçoit bien les données JSON et génère le chemin_fichier.');
      }
      
      setSnackbar({
        open: true,
        message: errorMessage.length > 200 ? errorMessage.substring(0, 200) + '...' : errorMessage,
        severity: 'error'
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };


  // Fonction pour valider la demande localement (sans appel API)
  const handleValidation = async () => {
    if (!candidat) return;

    try {
      setValidating(true);
      
      // Valider la demande localement et la transférer vers les élèves validés
      const eleveValide = await ValidationService.validerDemande(candidat);
      
      console.log('✅ Demande validée localement avec succès:', eleveValide);
      
      // Notifier le parent de la validation réussie avec l'élève validé
      if (onValidationSuccess) {
        onValidationSuccess(eleveValide);
      }
      
      // Afficher un message de succès
      setSnackbar({
        open: true,
        message: 'Demande validée avec succès. L\'élève a été transféré vers la liste des élèves validés.',
        severity: 'success'
      });
      
      // Déclencher un événement personnalisé pour rafraîchir StudentsTable
      window.dispatchEvent(new CustomEvent('dossierValidated', { 
        detail: { eleveValide } 
      }));
      
      // Fermer le sheet après un court délai pour voir le message
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('❌ Erreur lors de la validation:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Erreur lors de la validation de la demande',
        severity: 'error'
      });
    } finally {
      setValidating(false);
    }
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
          <Typography variant="h5" component="h2" fontWeight="bold">
            Détails du candidat
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
                <Typography variant="h6" fontWeight="bold">
                  {candidat.eleve.firstName} {candidat.eleve.lastName}
                </Typography>
              </Box>
              
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <EnvelopeIcon className="w-5 h-5 mr-2 text-gray-500" />
                  <Typography variant="body2">{candidat.eleve.email}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PhoneIcon className="w-5 h-5 mr-2 text-gray-500" />
                  <Typography variant="body2">{candidat.eleve.phone}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <MapPinIcon className="w-5 h-5 mr-2 text-gray-500 mt-0.5" />
                  <Typography variant="body2">{candidat.eleve.address}</Typography>
                </Box>
                
                {candidat.eleve.birthDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <UserIcon className="w-5 h-5 mr-2 text-gray-500" />
                    <Typography variant="body2">
                      Né(e) le {new Date(candidat.eleve.birthDate).toLocaleDateString('fr-FR')}
                    </Typography>
                  </Box>
                )}
                
                {(candidat.eleve as any).lieuNaissance && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MapPinIcon className="w-5 h-5 mr-2 text-gray-500" />
                    <Typography variant="body2">
                      Lieu de naissance: {(candidat.eleve as any).lieuNaissance}
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AcademicCapIcon className="w-5 h-5 mr-2 text-gray-500" />
                  <Typography variant="body2">
                    Nationalité: {candidat.eleve.nationality}
                    {(candidat.eleve as any).nationaliteEtrangere && candidat.eleve.nationality === 'Étrangère' && 
                      ` (${(candidat.eleve as any).nationaliteEtrangere})`
                    }
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Informations de la demande */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AcademicCapIcon className="w-5 h-5 mr-2 text-blue-600" />
                <Typography variant="h6" fontWeight="bold">
                  Demande d'inscription
                </Typography>
              </Box>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Numéro de demande
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {candidat.numero}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Auto-École
                  </Typography>
                  <Typography variant="body1">
                    {candidat.autoEcole.name}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Date de demande
                  </Typography>
                  <Typography variant="body1">
                    {new Date(candidat.dateDemande).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Statut
                  </Typography>
                  <Chip
                    label={getStatutLabel(candidat.statut)}
                    color={getStatutColor(candidat.statut) as any}
                    size="small"
                  />
                </Box>
                
                {candidat.commentaires && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Commentaires
                    </Typography>
                    <Typography variant="body1">
                      {candidat.commentaires}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DocumentTextIcon className="w-5 h-5 mr-2 text-blue-600" />
                  <Typography variant="h6" fontWeight="bold">
                    Documents ({getAllDocuments().length})
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CloudArrowUpIcon className="w-4 h-4" />}
                  onClick={handleUploadClick}
                  disabled={uploading || !candidat}
                  sx={{ 
                    backgroundColor: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'primary.dark'
                    }
                  }}
                >
                  {uploading ? 'Upload...' : 'Ajouter un document'}
                </Button>
              </Box>

              {(uploading || loadingDocuments) && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {loadingDocuments ? 'Chargement des documents...' : 'Upload en cours...'}
                  </Typography>
                </Box>
              )}

              {/* Input file caché */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
                style={{ display: 'none' }}
              />

              {/* Documents existants */}
              {getAllDocuments().length > 0 ? (
                <Stack spacing={2}>
                  {getAllDocuments().map((doc) => (
                    <Box
                      key={doc.id || doc.nom}
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body1" fontWeight="medium">
                              {doc.nom_fichier || doc.nom || 'Document sans nom'}
                            </Typography>
                            {doc.valide && (
                              <Chip 
                                label={doc.valide_libelle || 'Validé'} 
                                size="small" 
                                color="success"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            )}
                          </Box>
                          {(doc.taille || doc.taille_fichier_formate) && (
                            <Typography variant="body2" color="text.secondary">
                              Taille: {doc.taille_fichier_formate || doc.taille}
                            </Typography>
                          )}
                          {(doc.dateUpload || doc.created_at) && (
                            <Typography variant="caption" color="text.secondary">
                              Uploadé le {new Date(doc.dateUpload || doc.created_at).toLocaleDateString('fr-FR')}
                            </Typography>
                          )}
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
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Aucun document disponible
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Cliquez sur le bouton ci-dessus pour ajouter un document
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<CloudArrowUpIcon className="w-5 h-5" />}
                    onClick={handleUploadClick}
                    disabled={uploading || !candidat}
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
            <Button variant="outlined" onClick={onClose} disabled={validating}>
              Fermer
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleValidation}
              disabled={validating}
              sx={{ 
                minWidth: 120,
                '&:disabled': {
                  opacity: 0.6
                }
              }}
            >
              {validating ? 'Validation...' : 'Valider'}
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Snackbar pour les messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Drawer>
  );
};

export default CandidatDetailsSheet;
