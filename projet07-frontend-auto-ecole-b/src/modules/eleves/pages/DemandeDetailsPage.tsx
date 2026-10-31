import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Card,
  CardContent,
  Button,
  Stack,
  Tooltip,
  LinearProgress,
  Alert,
  Snackbar,
  Avatar,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { 
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  EyeIcon,
  ArrowLeftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { ROUTES } from '../../../shared/constants';
import ValidationService from '../services/validationService';
import axiosClient from '../../../shared/utils/axiosConfig';
import { typeDemandeService } from '../../cnepc/services';
import { TypeDemande } from '../../cnepc/types/type-demande';

const DemandeDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidat, setCandidat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [documentsFromApi, setDocumentsFromApi] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validatingDocumentId, setValidatingDocumentId] = useState<number | null>(null);
  const [validationDialog, setValidationDialog] = useState<{
    open: boolean;
    document: any | null;
    commentaires: string;
  }>({
    open: false,
    document: null,
    commentaires: ''
  });
  const [typeDemandeCache, setTypeDemandeCache] = useState<Map<string, TypeDemande>>(new Map());

  // Charger les données du dossier depuis l'API
  useEffect(() => {
    const loadDossier = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Appeler l'endpoint dossiers/{id}
        const response = await axiosClient.get(`/dossiers/${id}`);
        
        if (response.data.success && response.data.data) {
          const dossier = response.data.data;
          
          // Mapper les données du dossier vers le format attendu par la page
          const candidatMapped = {
            id: dossier.id,
            numero: dossier.id,
            dateDemande: dossier.date_creation || dossier.created_at,
            statut: dossier.statut || 'pending',
            commentaires: Array.isArray(dossier.commentaires) 
              ? dossier.commentaires.filter((c: any) => c !== null).join(', ') 
              : dossier.commentaires || '',
            eleve: {
              firstName: dossier.candidat?.personne?.prenom || '',
              lastName: dossier.candidat?.personne?.nom || '',
              email: dossier.candidat?.personne?.email || '',
              phone: dossier.candidat?.personne?.contact || '',
              address: dossier.candidat?.personne?.adresse || '',
              birthDate: dossier.candidat?.date_naissance,
              lieuNaissance: dossier.candidat?.lieu_naissance || '',
              nationality: dossier.candidat?.nationalite || '',
              nationaliteEtrangere: undefined,
              gender: dossier.candidat?.genre || '',
              numeroCandidat: dossier.candidat?.numero_candidat || '',
              nip: dossier.candidat?.nip || '',
              typePiece: dossier.candidat?.type_piece || '',
              numeroPiece: dossier.candidat?.numero_piece || '',
            },
            autoEcole: {
              id: dossier.auto_ecole?.id || '',
              name: dossier.auto_ecole?.nom_auto_ecole || '',
              adresse: dossier.auto_ecole?.adresse || '',
              email: dossier.auto_ecole?.email || '',
              contact: dossier.auto_ecole?.contact || '',
            },
            formation: dossier.formation || null,
            documents: dossier.documents || [],
            dossierData: dossier // Garder les données complètes du dossier
          };
          
          // Enrichir les données de formation si nécessaire (charger type_permis et session si seulement les IDs sont présents)
          if (dossier.formation && !dossier.formation.type_permis && dossier.formation.type_permis_id) {
            try {
              // Charger le type de permis via l'endpoint référentiels
              const typePermisResponse = await axiosClient.get(`/referentiels/${dossier.formation.type_permis_id}`);
              if (typePermisResponse.data.success && typePermisResponse.data.data) {
                dossier.formation.type_permis = typePermisResponse.data.data;
              }
            } catch (error) {
              console.warn('⚠️ Impossible de charger le type de permis:', error);
            }
          }

          if (dossier.formation && !dossier.formation.session && dossier.formation.session_id) {
            try {
              // Charger la session via l'endpoint référentiels
              const sessionResponse = await axiosClient.get(`/referentiels/${dossier.formation.session_id}`);
              if (sessionResponse.data.success && sessionResponse.data.data) {
                dossier.formation.session = sessionResponse.data.data;
              }
            } catch (error) {
              console.warn('⚠️ Impossible de charger la session:', error);
            }
          }

          // Enrichir le type de demande si nécessaire
          if (dossier.type_demande_id && !dossier.type_demande) {
            try {
              // Vérifier d'abord le cache
              if (typeDemandeCache.has(dossier.type_demande_id)) {
                dossier.type_demande = typeDemandeCache.get(dossier.type_demande_id);
              } else {
                const typeDemande = await typeDemandeService.getTypeDemandeById(dossier.type_demande_id);
                dossier.type_demande = typeDemande;
                // Mettre à jour le cache
                setTypeDemandeCache(prev => new Map(prev).set(typeDemande.id, typeDemande));
              }
            } catch (error) {
              console.warn('⚠️ Impossible de charger le type de demande:', error);
            }
          }

          // Mettre à jour la formation dans candidatMapped avec les données enrichies
          candidatMapped.formation = dossier.formation || null;
          
          setCandidat(candidatMapped);
          
          // Debug: Log des données de formation pour vérifier la structure
          console.log('📋 Dossier formation:', dossier.formation);
          console.log('📋 Type permis:', dossier.formation?.type_permis);
          console.log('📋 Session:', dossier.formation?.session);
          
          // Les documents sont déjà dans la réponse, pas besoin de les charger séparément
          if (dossier.documents && Array.isArray(dossier.documents)) {
            const enrichedDocs = await fetchDocumentDetails(dossier.documents);
            setDocumentsFromApi(enrichedDocs);
          }
        } else {
          setSnackbar({
            open: true,
            message: 'Demande non trouvée',
            severity: 'error'
          });
          setTimeout(() => navigate(ROUTES.ELEVES + '/demandes'), 2000);
        }
      } catch (error: any) {
        console.error('Erreur lors du chargement:', error);
        const errorMessage = error?.response?.data?.message || error?.message || 'Erreur lors du chargement des données';
        setSnackbar({
          open: true,
          message: errorMessage,
          severity: 'error'
        });
        if (error?.response?.status === 404) {
          setTimeout(() => navigate(ROUTES.ELEVES + '/demandes'), 2000);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadDossier();
  }, [id, navigate]);

  // Les documents sont chargés directement depuis l'endpoint dossiers/{id}
  // Plus besoin de charger séparément

  const fetchDocumentDetails = async (documents: any[]) => {
    if (!Array.isArray(documents) || documents.length === 0) return [];

    const enrichedDocs = await Promise.all(
      documents.map(async (doc: any) => {
        if (!doc?.id) return doc;
        try {
          const response = await axiosClient.get(`/documents/${doc.id}`);
          if (response.data?.success && response.data?.data) {
            const apiDoc = response.data.data;
            return {
              ...doc,
              ...apiDoc,
              valide: apiDoc.valide,
              valide_libelle: apiDoc.valide_libelle || (apiDoc.valide ? 'Validé' : 'Non validé'),
            };
          }
        } catch (err) {
          console.warn(`⚠️ Impossible de récupérer les détails du document ${doc.id}`, err);
        }
        return doc;
      })
    );

    return enrichedDocs;
  };

  // Fonction pour obtenir tous les documents
  const getAllDocuments = () => {
    // Les documents viennent directement de l'API dossiers/{id}
    // Priorité aux documents de l'API
    const apiDocs = documentsFromApi || [];
    const dossierDocs = candidat?.documents || [];
    
    const allDocsMap = new Map();
    
    // D'abord les documents depuis l'API (les plus à jour)
    apiDocs.forEach((doc: any) => {
      if (doc.id) {
        allDocsMap.set(doc.id, doc);
      }
    });
    
    // Ensuite les documents du dossier (si pas déjà présents)
    dossierDocs.forEach((doc: any) => {
      if (doc.id && !allDocsMap.has(doc.id)) {
        allDocsMap.set(doc.id, doc);
      }
    });
    
    return Array.from(allDocsMap.values());
  };

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, string> = {
      'pending': 'En attente',
      'validated': 'Validé',
      'rejected': 'Rejeté',
      'incomplete': 'Incomplet',
      'complete': 'Complet'
    };
    return labels[statut] || statut;
  };

  const getStatutColor = (statut: string) => {
    const colors: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
      'pending': 'warning',
      'validated': 'success',
      'rejected': 'error',
      'incomplete': 'warning',
      'complete': 'success'
    };
    return colors[statut] || 'default';
  };

  const handleViewDocument = async (document: any) => {
    try {
      if (!document.id) {
        alert(`Impossible d'ouvrir le document: ${document.nom || document.nom_fichier}\n\nLe document n'a pas d'ID valide.`);
        return;
      }

      console.log('📄 Ouverture du document:', {
        nom: document.nom || document.nom_fichier,
        id: document.id,
        chemin_fichier: document.chemin_fichier,
        type_mime: document.type_mime
      });

      // Essayer différentes méthodes pour récupérer le fichier
      const endpoints = [
        // Méthode 1: Endpoint direct avec Accept header pour forcer le binaire
        { url: `/documents/${document.id}`, headers: { 'Accept': 'application/pdf,application/octet-stream,image/*,*/*' } },
        // Méthode 2: Endpoint de téléchargement
        { url: `/documents/${document.id}/download`, headers: {} },
        // Méthode 3: Endpoint file
        { url: `/documents/${document.id}/file`, headers: {} },
        // Méthode 4: Endpoint view
        { url: `/documents/${document.id}/view`, headers: {} },
        // Méthode 5: Via chemin_fichier avec storage
        ...(document.chemin_fichier ? [{ url: `/storage/${document.chemin_fichier}`, headers: {} }] : []),
        // Méthode 6: Via files endpoint
        ...(document.chemin_fichier ? [{ url: `/files/${document.chemin_fichier}`, headers: {} }] : [])
      ];

      let lastError: any = null;

      for (const endpoint of endpoints) {
        try {
          const response = await axiosClient.get(endpoint.url, {
            responseType: 'blob',
            headers: endpoint.headers,
            validateStatus: (status) => status < 500 // Accepter les erreurs 4xx mais pas 5xx
          });

          // Si c'est une erreur 404, continuer avec le prochain endpoint
          if (response.status === 404) {
            console.log(`⚠️ Endpoint ${endpoint.url} retourne 404, essai suivant...`);
            continue;
          }

          const contentType = response.headers['content-type'] || '';
          
          // Si la réponse est JSON (erreur), continuer
          if (contentType.includes('application/json')) {
            console.log(`⚠️ Endpoint ${endpoint.url} retourne JSON, essai suivant...`);
            continue;
          }

          // Vérifier que c'est bien un Blob avec des données
          if (response.data instanceof Blob && response.data.size > 0) {
            const blob = new Blob([response.data], {
              type: contentType || document.type_mime || 'application/pdf'
            });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 10000); // Augmenter le délai de nettoyage
            console.log(`✅ Document ouvert avec succès via ${endpoint.url}`);
            return;
          }
        } catch (error: any) {
          // Ne pas considérer les 404 comme des erreurs critiques
          if (error.response?.status === 404) {
            console.log(`⚠️ Endpoint ${endpoint.url} retourne 404, essai suivant...`);
            continue;
          }
          lastError = error;
          console.warn(`⚠️ Erreur avec ${endpoint.url}:`, error.message);
        }
      }

      // Si aucun endpoint n'a fonctionné
      throw lastError || new Error('Tous les endpoints ont échoué. Le document n\'est peut-être pas disponible sur le serveur.');
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'ouverture du document:', error);
      const errorMessage = error?.response?.status === 404 
        ? 'Le document n\'a pas été trouvé sur le serveur.'
        : error?.message || 'Une erreur est survenue lors de l\'ouverture du document.';
      
      alert(`Erreur lors de l'ouverture du document: ${document.nom || document.nom_fichier}\n\n${errorMessage}`);
    }
  };

  const handleDownloadDocument = async (document: any) => {
    try {
      if (document.id) {
        let documentUrl = '';
        
        if (document.chemin_fichier) {
          documentUrl = `/storage/${document.chemin_fichier}`;
        } else {
          documentUrl = `/documents/${document.id}/download`;
        }

        try {
          const response = await axiosClient.get(documentUrl, {
            responseType: 'blob',
          });

          const blob = new Blob([response.data], {
            type: response.headers['content-type'] || document.type_mime || 'application/pdf'
          });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = document.nom || document.nom_fichier || 'document';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error: any) {
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
      }
    } catch (error: any) {
      console.error('Erreur lors du téléchargement:', error);
      alert(`Erreur lors du téléchargement: ${document.nom || document.nom_fichier}`);
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
      // Vérifier que nous avons un ID de dossier valide
      const dossierId = candidat.dossierData?.id || candidat.id;
      if (!dossierId) {
        setSnackbar({
          open: true,
          message: 'Erreur: ID du dossier introuvable',
          severity: 'error'
        });
        setUploading(false);
        return;
      }

      // Vérifier que le dossier existe et a les relations nécessaires
      try {
        const dossierCheck = await axiosClient.get(`/dossiers/${dossierId}`);
        if (!dossierCheck.data.success || !dossierCheck.data.data) {
          throw new Error('Dossier non trouvé');
        }
        const dossier = dossierCheck.data.data;
        
        // Vérifier que les relations essentielles existent
        if (!dossier.candidat || !dossier.formation) {
          console.warn('⚠️ Dossier chargé mais relations manquantes:', {
            has_candidat: !!dossier.candidat,
            has_formation: !!dossier.formation
          });
        }
      } catch (checkError: any) {
        console.error('❌ Erreur lors de la vérification du dossier:', checkError);
        setSnackbar({
          open: true,
          message: 'Erreur: Impossible de vérifier le dossier. Veuillez réessayer.',
          severity: 'error'
        });
        setUploading(false);
        return;
      }

      const maxSize = 5 * 1024 * 1024;
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

      const formData = new FormData();
      formData.append('documentable_id', dossierId);
      formData.append('documentable_type', 'App\\Models\\Dossier');
      formData.append('valide', '0');
      formData.append('commentaires', '');
      formData.append('fichier', file, file.name.trim());

      console.log('📤 Upload document pour dossier:', {
        documentable_id: dossierId,
        documentable_type: 'App\\Models\\Dossier',
        candidat_id: candidat.id,
        dossier_data_id: candidat.dossierData?.id,
        fichier: `[File: ${file.name.trim()}, ${file.size} bytes, ${file.type}]`
      });

      const response = await axiosClient.post('/documents', formData, {
        timeout: 300000,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success && response.data.data) {
        const newDocument = {
          id: response.data.data.id,
          documentable_id: response.data.data.documentable_id,
          documentable_type: response.data.data.documentable_type,
          nom: response.data.data.nom_fichier,
          nom_fichier: response.data.data.nom_fichier,
          chemin_fichier: response.data.data.chemin_fichier,
          type_mime: response.data.data.type_mime,
          taille_fichier: response.data.data.taille_fichier,
          taille_fichier_formate: response.data.data.taille_fichier_formate,
          valide: response.data.data.valide,
          valide_libelle: response.data.data.valide_libelle || (response.data.data.valide ? 'Validé' : 'Non validé'),
          commentaires: response.data.data.commentaires,
          created_at: response.data.data.created_at,
          updated_at: response.data.data.updated_at,
          dateUpload: response.data.data.created_at,
        };

        setDocumentsFromApi(prev => [...prev, newDocument]);
        
        setSnackbar({
          open: true,
          message: response.data.message || 'Document uploadé avec succès',
          severity: 'success'
        });
        
        // Recharger le dossier pour avoir les données à jour
        const dossierId = candidat.dossierData?.id || candidat.id;
        if (dossierId) {
          const dossierResponse = await axiosClient.get(`/dossiers/${dossierId}`);
          if (dossierResponse.data.success && dossierResponse.data.data) {
            const dossier = dossierResponse.data.data;
            if (dossier.documents && Array.isArray(dossier.documents)) {
              const enrichedDocs = await fetchDocumentDetails(dossier.documents);
              setDocumentsFromApi(enrichedDocs);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'upload:', error);
      console.error('Détails de l\'erreur:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        error: error.response?.data?.error,
        fullResponse: error.response?.data
      });
      
      let errorMessage = 'Erreur lors de l\'upload du document';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = `Erreur: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Message plus détaillé pour les erreurs 500
      if (error.response?.status === 500) {
        errorMessage = 'Erreur serveur lors de l\'upload. Le dossier pourrait être incomplet. Veuillez vérifier que toutes les informations du dossier sont correctement renseignées.';
      }
      
      setSnackbar({
        open: true,
        message: errorMessage.length > 200 ? errorMessage.substring(0, 200) + '...' : errorMessage,
        severity: 'error'
      });
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleValidation = async () => {
    if (!candidat) return;

    try {
      setValidating(true);
      
      const eleveValide = await ValidationService.validerDemande(candidat);
      
      setSnackbar({
        open: true,
        message: 'Demande validée avec succès. L\'élève a été transféré vers la liste des élèves validés.',
        severity: 'success'
      });
      
      window.dispatchEvent(new CustomEvent('dossierValidated', { 
        detail: { eleveValide } 
      }));
      
      setTimeout(() => {
        navigate(ROUTES.ELEVES + '/demandes');
      }, 1500);
      
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Erreur lors de la validation de la demande',
        severity: 'error'
      });
    } finally {
      setValidating(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleOpenValidationDialog = (document: any) => {
    setValidationDialog({
      open: true,
      document,
      commentaires: document.commentaires || ''
    });
  };

  const handleCloseValidationDialog = () => {
    setValidationDialog({
      open: false,
      document: null,
      commentaires: ''
    });
  };

  const handleValidateDocument = async () => {
    const { document, commentaires } = validationDialog;
    if (!document || !document.id) return;

    try {
      setValidatingDocumentId(document.id);
      
      const response = await axiosClient.put(`/documents/${document.id}`, {
        valide: true,
        commentaires: commentaires || ''
      });

      if (response.data.success) {
        // Mettre à jour le document dans la liste
        setDocumentsFromApi(prev => 
          prev.map(doc => 
            doc.id === document.id 
              ? {
                  ...doc,
                  valide: true,
                  valide_libelle: 'Validé',
                  commentaires: commentaires || doc.commentaires
                }
              : doc
          )
        );

        setSnackbar({
          open: true,
          message: 'Document validé avec succès',
          severity: 'success'
        });

        handleCloseValidationDialog();

        // Recharger le dossier pour avoir les données à jour
        if (candidat?.id) {
          const dossierResponse = await axiosClient.get(`/dossiers/${candidat.id}`);
          if (dossierResponse.data.success && dossierResponse.data.data) {
            const dossier = dossierResponse.data.data;
            if (dossier.documents && Array.isArray(dossier.documents)) {
              const enrichedDocs = await fetchDocumentDetails(dossier.documents);
              setDocumentsFromApi(enrichedDocs);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de la validation du document:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Erreur lors de la validation du document';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setValidatingDocumentId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Typography>Chargement...</Typography>
      </Box>
    );
  }

  if (!candidat) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Demande non trouvée</Alert>
      </Box>
    );
  }


  return (
    <Box sx={{ flexGrow: 1, backgroundColor: '#f5f5f5', minHeight: '100vh', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton
            onClick={() => navigate(ROUTES.ELEVES + '/demandes')}
            sx={{ 
              color: '#6b7280',
              '&:hover': { 
                backgroundColor: '#f3f4f6',
                color: '#3A75C4'
              }
            }}
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Details candidat
          </Typography>
        </Box>
      </Box>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column - Main Content */}
        <Grid item xs={12} md={8}>
          {/* Profile Card - Large */}
          <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                Informations Personnelles
              </Typography>
              <Grid container spacing={3}>
                {/* Left Side - Profile */}
                <Grid item xs={12} sm={4}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Avatar
                      sx={{
                        width: 100,
                        height: 100,
                        bgcolor: '#3A75C4',
                        fontSize: '2.5rem',
                        mb: 2
                      }}
                    >
                      {candidat.eleve.firstName?.charAt(0)}{candidat.eleve.lastName?.charAt(0)}
                    </Avatar>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {candidat.eleve.firstName} {candidat.eleve.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {candidat.eleve.email}
                    </Typography>
                  </Box>
                </Grid>

                {/* Right Side - Details Grid */}
                <Grid item xs={12} sm={8}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Genre
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {candidat.eleve.gender || 'Non spécifié'}
                      </Typography>
                    </Grid>

                    {candidat.eleve.birthDate && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Date de naissance
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {new Date(candidat.eleve.birthDate).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Typography>
                      </Grid>
                    )}

                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Téléphone
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {candidat.eleve.phone || 'Non renseigné'}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Adresse
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {candidat.eleve.address || 'Non renseignée'}
                      </Typography>
                    </Grid>

                    {(candidat.eleve as any).lieuNaissance && (
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Lieu de naissance
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {(candidat.eleve as any).lieuNaissance}
                        </Typography>
                      </Grid>
                    )}

                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Nationalité
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {candidat.eleve.nationality}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Statut
                      </Typography>
                      <Chip
                        label={getStatutLabel(candidat.statut)}
                        color={getStatutColor(candidat.statut) as any}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Date d'inscription
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {new Date(candidat.dateDemande).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card sx={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Documents
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CloudArrowUpIcon className="w-5 h-5" />}
                  onClick={handleUploadClick}
                  disabled={uploading || !candidat}
                  sx={{ 
                    backgroundColor: '#3A75C4',
                    textTransform: 'none',
                    '&:hover': { backgroundColor: '#2A5A9A' }
                  }}
                >
                  {uploading ? 'Upload...' : 'Ajouter un document'}
                </Button>
              </Box>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt"
                style={{ display: 'none' }}
              />

              {uploading && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Upload en cours...
                  </Typography>
                </Box>
              )}

              {getAllDocuments().length > 0 ? (
                <Stack spacing={2}>
                  {getAllDocuments().map((doc) => (
                    <Box
                      key={doc.id || doc.nom}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: '#e5e7eb',
                        borderRadius: 1,
                        backgroundColor: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        '&:hover': {
                          backgroundColor: '#f9fafb',
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <DocumentTextIcon className="w-6 h-6 text-gray-500" />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body1" fontWeight={500}>
                              {doc.nom_fichier || doc.nom || 'Document sans nom'}
                            </Typography>
                            {doc.valide && (
                              <Chip
                                label={doc.valide_libelle || 'Validé'}
                                color="success"
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {doc.taille_fichier_formate || doc.taille || 'Taille inconnue'}
                          </Typography>
                          {doc.commentaires && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {doc.commentaires}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, ml: 2 }}>
                        <Tooltip title="Voir le document">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDocument(doc)}
                            sx={{ color: '#6b7280', '&:hover': { color: '#3A75C4' } }}
                          >
                            <EyeIcon className="w-5 h-5" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Télécharger">
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadDocument(doc)}
                            sx={{ color: '#6b7280', '&:hover': { color: '#3A75C4' } }}
                          >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                          </IconButton>
                        </Tooltip>
                        {!doc.valide && (
                          <Tooltip title="Valider le document">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleOpenValidationDialog(doc)}
                                disabled={validatingDocumentId === doc.id}
                                sx={{ 
                                  color: '#6b7280', 
                                  '&:hover': { color: 'success.main' },
                                  '&:disabled': { opacity: 0.5 }
                                }}
                              >
                                <CheckCircleIcon className="w-5 h-5" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <DocumentTextIcon className="w-16 h-16 text-gray-300 mb-2" />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Aucun document disponible
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Cliquez sur le bouton ci-dessus pour ajouter un document
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => navigate(ROUTES.ELEVES + '/demandes')}
              disabled={validating}
              sx={{ 
                textTransform: 'none',
                borderColor: '#e5e7eb',
                color: '#374151',
                '&:hover': {
                  borderColor: '#d1d5db',
                  backgroundColor: '#f9fafb'
                }
              }}
            >
              Retour
            </Button>
            <Button 
              variant="contained" 
              onClick={handleValidation}
              disabled={validating}
              sx={{ 
                minWidth: 140,
                backgroundColor: '#3A75C4',
                textTransform: 'none',
                '&:hover': { backgroundColor: '#2A5A9A' },
                '&:disabled': {
                  backgroundColor: '#e5e7eb',
                  color: '#9ca3af'
                }
              }}
            >
              {validating ? 'Validation...' : 'Valider la demande'}
            </Button>
          </Box>
        </Grid>

        {/* Right Column - Formation & Files */}
        <Grid item xs={12} md={4}>
          {/* Formation Card */}
          <Card sx={{ mb: 3, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                Informations de formation
              </Typography>
              
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 0.5 }}>
                    Type de formation
                  </Typography>
                  <Typography variant="body1" fontWeight={500} sx={{ color: '#374151' }}>
                    {(() => {
                      const formation = candidat.dossierData?.formation || candidat.formation;
                      return formation?.session?.libelle || 
                             formation?.session?.code || 
                             'Non spécifié';
                    })()}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 0.5 }}>
                    Type de permis
                  </Typography>
                  <Typography variant="body1" fontWeight={500} sx={{ color: '#374151' }}>
                    {(() => {
                      const formation = candidat.dossierData?.formation || candidat.formation;
                      return formation?.type_permis?.libelle || 
                             formation?.type_permis?.nom || 
                             'Non spécifié';
                    })()}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 0.5 }}>
                    Montant
                  </Typography>
                  <Typography variant="body1" fontWeight={500} sx={{ color: '#374151', fontSize: '1.1rem' }}>
                    {(() => {
                      const formation = candidat.dossierData?.formation || candidat.formation;
                      const montant = formation?.montant_formate || formation?.montant;
                      return montant ? `${montant}${formation?.montant_formate ? '' : ' FCFA'}` : 'Non spécifié';
                    })()}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 0.5 }}>
                    Type de demande
                  </Typography>
                  {(() => {
                    const dossier = candidat.dossierData;
                    if (dossier?.type_demande) {
                      return (
                        <Chip
                          label={dossier.type_demande.name}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      );
                    }
                    if (dossier?.type_demande_id) {
                      const cachedTypeDemande = typeDemandeCache.get(dossier.type_demande_id);
                      if (cachedTypeDemande) {
                        return (
                          <Chip
                            label={cachedTypeDemande.name}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        );
                      }
                    }
                    return (
                      <Typography variant="body2" color="text.secondary">
                        Non spécifié
                      </Typography>
                    );
                  })()}
                </Box>

                {(() => {
                  const formation = candidat.dossierData?.formation || candidat.formation;
                  return formation?.description ? (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 0.5 }}>
                        Description
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280', lineHeight: 1.6 }}>
                        {formation.description}
                      </Typography>
                    </Box>
                  ) : null;
                })()}
              </Stack>
            </CardContent>
          </Card>

        </Grid>
      </Grid>

      {/* Dialog de validation de document */}
      <Dialog
        open={validationDialog.open}
        onClose={handleCloseValidationDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Valider le document
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Document: <strong>{validationDialog.document?.nom_fichier || validationDialog.document?.nom || 'Document'}</strong>
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Commentaires (optionnel)"
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={validationDialog.commentaires}
              onChange={(e) => setValidationDialog(prev => ({ ...prev, commentaires: e.target.value }))}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseValidationDialog}
            disabled={validatingDocumentId !== null}
            sx={{ textTransform: 'none' }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleValidateDocument}
            variant="contained"
            disabled={validatingDocumentId !== null}
            sx={{ 
              backgroundColor: '#3A75C4',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#2A5A9A' }
            }}
          >
            {validatingDocumentId !== null ? 'Validation...' : 'Valider'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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
    </Box>
  );
};

export default DemandeDetailsPage;

