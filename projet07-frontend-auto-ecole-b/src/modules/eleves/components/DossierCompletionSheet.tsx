import React, { useState } from 'react';
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
  Grid,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  LinearProgress,
  TextField
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { EleveValide } from '../services/validationService';
import DocumentGenerationForm from '../../validation/forms/DocumentGenerationForm';

interface DossierCompletionSheetProps {
  open: boolean;
  onClose: () => void;
  eleve: EleveValide | null;
  onCompletionSuccess?: () => void;
}

interface DocumentCours {
  id: string;
  nom: string;
  type: 'theorique' | 'pratique' | 'examen' | 'certificat';
  taille: string;
  dateUpload: string;
  url?: string;
  file?: File;
  isGenerated: boolean;
}

interface HeureCours {
  id: string;
  type: 'theorique' | 'pratique';
  date: string;
  duree: number;
  instructeur: string;
  vehicule?: string;
  observations?: string;
  statut: 'planifie' | 'effectue' | 'annule';
}

const DossierCompletionSheet: React.FC<DossierCompletionSheetProps> = ({
  open,
  onClose,
  eleve,
  onCompletionSuccess
}) => {
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentFormOpen, setDocumentFormOpen] = useState(false);
  const [documentType, setDocumentType] = useState<'theorique' | 'pratique' | 'examen' | 'certificat'>('theorique');
  const [completing, setCompleting] = useState(false);
  const [documentsCours, setDocumentsCours] = useState<DocumentCours[]>([]);
  const [heuresCours, setHeuresCours] = useState<HeureCours[]>([]);
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);

  if (!eleve) return null;

  // Documents existants de l'élève (simulés)
  const documentsExistants = [
    {
      id: 'doc1',
      nom: 'Carte d\'identité',
      taille: '2.1 MB',
      dateUpload: eleve.validatedAt,
      type: 'application/pdf',
      url: null
    },
    {
      id: 'doc2',
      nom: 'Photo d\'identité',
      taille: '1.5 MB',
      dateUpload: eleve.validatedAt,
      type: 'image/jpeg',
      url: null
    },
    {
      id: 'doc3',
      nom: 'Certificat médical',
      taille: '1.8 MB',
      dateUpload: eleve.validatedAt,
      type: 'application/pdf',
      url: null
    },
    {
      id: 'doc4',
      nom: 'Attestation CNEPC',
      taille: '2.3 MB',
      dateUpload: eleve.validatedAt,
      type: 'application/pdf',
      url: null
    }
  ];

  const handleViewDocument = (document: any) => {
    setSelectedDocument(document);
    setViewerOpen(true);
  };

  const handleDownloadDocument = (document: any) => {
    console.log('Téléchargement du document:', document.nom);
  };

  const handleUploadNewDocument = () => {
    if (fileInputRef) {
      fileInputRef.click();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setUploading(true);
      
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newDocument: DocumentCours = {
            id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            nom: file.name,
            type: 'theorique', // Par défaut
            taille: formatFileSize(file.size),
            dateUpload: new Date().toISOString(),
            url: e.target?.result as string,
            file: file,
            isGenerated: false
          };
          
          setDocumentsCours(prev => [...prev, newDocument]);
        };
        reader.readAsDataURL(file);
      });
      
      setTimeout(() => {
        setUploading(false);
      }, 1000);
    }
    
    if (event.target) {
      event.target.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleGenerateDocument = (type: 'theorique' | 'pratique' | 'examen' | 'certificat') => {
    setDocumentType(type);
    setDocumentFormOpen(true);
  };

  const handleDocumentGenerated = async (documentData: any) => {
    try {
      const newDocument: DocumentCours = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nom: documentData.nom,
        type: documentData.type,
        taille: 'Généré',
        dateUpload: new Date().toISOString(),
        isGenerated: true
      };
      
      setDocumentsCours(prev => [...prev, newDocument]);
      console.log('Document généré avec succès:', documentData);
    } catch (error) {
      console.error('Erreur lors de la génération du document:', error);
    }
  };

  const handleCompleteDossier = async () => {
    if (!eleve) return;

    try {
      setCompleting(true);
      
      // Importer le service de dossiers
      const { default: DossierService } = await import('../../validation/services/dossierService');
      
      // Créer un dossier complet pour l'élève
      const dossierComplet = await DossierService.creerDossierComplet(eleve);
      
      // Ajouter les documents de cours
      for (const doc of documentsCours) {
        await DossierService.ajouterDocumentCours(dossierComplet.id, {
          nom: doc.nom,
          type: doc.type,
          taille: doc.taille,
          isGenerated: doc.isGenerated
        });
      }
      
      // Ajouter les heures de cours
      for (const heure of heuresCours) {
        await DossierService.ajouterHeureCours(dossierComplet.id, {
          type: heure.type,
          date: heure.date,
          duree: heure.duree,
          instructeur: heure.instructeur,
          vehicule: heure.vehicule,
          observations: heure.observations,
          statut: heure.statut
        });
      }
      
      console.log('Dossier complété créé avec succès:', dossierComplet);
      console.log('L\'élève a été transféré vers le module de validation');
      
      // Notifier le parent du succès
      if (onCompletionSuccess) {
        onCompletionSuccess();
      }
      
      setTimeout(() => {
        setCompleting(false);
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors de la complétion:', error);
      setCompleting(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'theorique': return 'primary';
      case 'pratique': return 'success';
      case 'examen': return 'warning';
      case 'certificat': return 'info';
      default: return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'theorique': return 'Théorique';
      case 'pratique': return 'Pratique';
      case 'examen': return 'Examen';
      case 'certificat': return 'Certificat';
      default: return type;
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 500, md: 600 },
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
              Complétion du dossier
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
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
            {/* Informations de l'élève */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar sx={{ width: 60, height: 60, mr: 2, bgcolor: 'primary.main' }}>
                    <PersonIcon sx={{ fontSize: 30 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" className="font-display">
                      {eleve.firstName} {eleve.lastName}
                    </Typography>
                    <Chip
                      label="Validé"
                      color="success"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Box>
                
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Email" 
                      secondary={eleve.email}
                      primaryTypographyProps={{ className: 'font-primary' }}
                      secondaryTypographyProps={{ className: 'font-primary' }}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Téléphone" 
                      secondary={eleve.phone}
                      primaryTypographyProps={{ className: 'font-primary' }}
                      secondaryTypographyProps={{ className: 'font-primary' }}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <LocationIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Adresse" 
                      secondary={eleve.address}
                      primaryTypographyProps={{ className: 'font-primary' }}
                      secondaryTypographyProps={{ className: 'font-primary' }}
                    />
                  </ListItem>
                  
                  {(eleve as any).birthDate && (
                    <ListItem>
                      <ListItemIcon>
                        <PersonIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Date de naissance" 
                        secondary={new Date((eleve as any).birthDate).toLocaleDateString('fr-FR')}
                        primaryTypographyProps={{ className: 'font-primary' }}
                        secondaryTypographyProps={{ className: 'font-primary' }}
                      />
                    </ListItem>
                  )}
                  
                  {(eleve as any).lieuNaissance && (
                    <ListItem>
                      <ListItemIcon>
                        <LocationIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Lieu de naissance" 
                        secondary={(eleve as any).lieuNaissance}
                        primaryTypographyProps={{ className: 'font-primary' }}
                        secondaryTypographyProps={{ className: 'font-primary' }}
                      />
                    </ListItem>
                  )}
                  
                  <ListItem>
                    <ListItemIcon>
                      <SchoolIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Nationalité" 
                      secondary={(eleve as any).nationality + ((eleve as any).nationaliteEtrangere && (eleve as any).nationality === 'Étrangère' ? ` (${(eleve as any).nationaliteEtrangere})` : '')}
                      primaryTypographyProps={{ className: 'font-primary' }}
                      secondaryTypographyProps={{ className: 'font-primary' }}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <SchoolIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Auto-École" 
                      secondary={eleve.autoEcole.name}
                      primaryTypographyProps={{ className: 'font-primary' }}
                      secondaryTypographyProps={{ className: 'font-primary' }}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Documents existants */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold" className="font-display">
                    Documents d'inscription ({documentsExistants.length})
                  </Typography>
                </Box>
                
                <List>
                  {documentsExistants.map((doc) => (
                    <ListItem key={doc.id} sx={{ px: 0 }}>
                      <ListItemIcon>
                        <DescriptionIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={doc.nom}
                        secondary={`${doc.taille} • ${new Date(doc.dateUpload).toLocaleDateString('fr-FR')}`}
                        primaryTypographyProps={{ className: 'font-primary' }}
                        secondaryTypographyProps={{ className: 'font-primary' }}
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Voir">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDocument(doc)}
                              color="primary"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Télécharger">
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadDocument(doc)}
                              color="secondary"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* Documents de cours */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold" className="font-display">
                      Documents de cours ({documentsCours.length})
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleGenerateDocument('theorique')}
                    className="font-primary"
                  >
                    Ajouter
                  </Button>
                </Box>

                {uploading && (
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress />
                    <Typography variant="caption" color="text.secondary" className="font-primary">
                      Upload en cours...
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

                {documentsCours.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <DescriptionIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" className="font-primary">
                      Aucun document de cours
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {documentsCours.map((doc) => (
                      <ListItem key={doc.id} sx={{ px: 0 }}>
                        <ListItemIcon>
                          <DescriptionIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={doc.nom}
                          secondary={`${getTypeLabel(doc.type)} • ${doc.taille}`}
                          primaryTypographyProps={{ className: 'font-primary' }}
                          secondaryTypographyProps={{ className: 'font-primary' }}
                        />
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <Chip
                              label={getTypeLabel(doc.type)}
                              color={getTypeColor(doc.type) as any}
                              size="small"
                            />
                            <Chip
                              label={doc.isGenerated ? 'Généré' : 'Uploadé'}
                              color={doc.isGenerated ? 'success' : 'primary'}
                              size="small"
                            />
                            <Tooltip title="Voir">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDocument(doc)}
                                color="primary"
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer">
                              <IconButton
                                size="small"
                                onClick={() => setDocumentsCours(prev => prev.filter(d => d.id !== doc.id))}
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom className="font-display">
                  Actions rapides
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<DescriptionIcon />}
                      onClick={() => handleGenerateDocument('theorique')}
                      className="font-primary"
                    >
                      Cours théorique
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<DescriptionIcon />}
                      onClick={() => handleGenerateDocument('pratique')}
                      className="font-primary"
                    >
                      Cours pratique
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<UploadIcon />}
                      onClick={handleUploadNewDocument}
                      className="font-primary"
                    >
                      Upload document
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<DescriptionIcon />}
                      onClick={() => handleGenerateDocument('certificat')}
                      className="font-primary"
                    >
                      Certificat
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>

          {/* Actions */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={onClose} disabled={completing} className="font-primary">
                Fermer
              </Button>
              <Button 
                variant="contained" 
                color="success"
                onClick={handleCompleteDossier}
                disabled={completing}
                sx={{ 
                  minWidth: 140,
                  '&:disabled': {
                    opacity: 0.6
                  }
                }}
                className="font-primary"
              >
                {completing ? 'Complétion...' : 'Compléter le dossier'}
              </Button>
            </Stack>
          </Box>
        </Box>
      </Drawer>

      {/* Dialog de visualisation des documents */}
      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" className="font-display">
              {selectedDocument?.nom}
            </Typography>
            <IconButton onClick={() => setViewerOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <DescriptionIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom className="font-display">
                {selectedDocument.nom}
              </Typography>
              <Typography variant="body2" color="text.secondary" className="font-primary">
                Taille: {selectedDocument.taille}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewerOpen(false)} className="font-primary">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Formulaire de génération de document */}
      <DocumentGenerationForm
        open={documentFormOpen}
        onClose={() => setDocumentFormOpen(false)}
        onGenerate={handleDocumentGenerated}
        type={documentType}
      />
    </>
  );
};

export default DossierCompletionSheet;
