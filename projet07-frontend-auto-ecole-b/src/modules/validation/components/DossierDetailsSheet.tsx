import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Card,
  CardContent,
  Button,
  Stack,
  Grid,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  CloudUpload as UploadIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { DossierComplet } from '../services/dossierService';
import DocumentGenerationForm from '../forms/DocumentGenerationForm';

interface DossierDetailsSheetProps {
  open: boolean;
  onClose: () => void;
  dossier: DossierComplet | null;
  onUpdate: () => void;
}

const DossierDetailsSheet: React.FC<DossierDetailsSheetProps> = ({
  open,
  onClose,
  dossier,
  onUpdate
}) => {
  const [documentFormOpen, setDocumentFormOpen] = useState(false);
  const [documentType, setDocumentType] = useState<'theorique' | 'pratique' | 'examen' | 'certificat'>('theorique');

  if (!dossier) return null;

  const handleGenerateDocument = (type: 'theorique' | 'pratique' | 'examen' | 'certificat') => {
    setDocumentType(type);
    setDocumentFormOpen(true);
  };

  const getDefaultDocumentName = (type: 'theorique' | 'pratique' | 'examen' | 'certificat') => {
    const eleveName = `${dossier.eleve.firstName} ${dossier.eleve.lastName}`;
    const date = new Date().toLocaleDateString('fr-FR');
    
    switch (type) {
      case 'theorique':
        return `Cours Théorique - ${eleveName} - ${date}`;
      case 'pratique':
        return `Cours Pratique - ${eleveName} - ${date}`;
      case 'examen':
        return `Examen - ${eleveName} - ${date}`;
      case 'certificat':
        return `Certificat - ${eleveName} - ${date}`;
      default:
        return `Document - ${eleveName} - ${date}`;
    }
  };

  const getDefaultTitle = (type: 'theorique' | 'pratique' | 'examen' | 'certificat') => {
    switch (type) {
      case 'theorique':
        return 'Attestation de Cours Théorique';
      case 'pratique':
        return 'Attestation de Cours Pratique';
      case 'examen':
        return 'Attestation d\'Examen';
      case 'certificat':
        return 'Certificat de Formation';
      default:
        return 'Document de Formation';
    }
  };

  const handleDocumentGenerated = async (documentData: any) => {
    try {
      console.log('DossierDetailsSheet - DocumentData reçu:', documentData);
      console.log('DossierDetailsSheet - Type de document:', documentData.type);
      console.log('DossierDetailsSheet - Heures dans contenu:', documentData.contenu?.heures);
      console.log('DossierDetailsSheet - Nombre d\'heures:', documentData.contenu?.heures?.length);
      
      const { default: DossierService } = await import('../services/dossierService');
      
      // Vérifier s'il existe déjà un document du même type
      const existingDocument = dossier.documentsCours.find(doc => 
        doc.type === documentData.type && doc.isGenerated
      );
      
      if (existingDocument) {
        // Supprimer l'ancien document du même type
        await DossierService.supprimerDocument(dossier.id, existingDocument.id);
        console.log('Ancien document supprimé:', existingDocument.nom);
        
        // Notification à l'utilisateur
        console.log(`Document remplacé: "${existingDocument.nom}" → "${documentData.nom}"`);
      }
      
      // Ajouter le nouveau document
      await DossierService.ajouterDocumentCours(dossier.id, {
        nom: documentData.nom,
        type: documentData.type,
        taille: 'Généré',
        isGenerated: true,
        pdfUrl: documentData.pdfUrl // Stocker l'URL du PDF généré
      });
      
      console.log('Document ajouté avec le type:', documentData.type);
      
      // Synchroniser les heures de cours avec le document généré
      if (documentData.contenu && documentData.contenu.heures && documentData.contenu.heures.length > 0) {
        console.log('DossierDetailsSheet - Début de la synchronisation des heures');
        await synchroniserHeuresCours(documentData);
      } else {
        console.log('DossierDetailsSheet - Aucune heure à synchroniser');
        console.log('DossierDetailsSheet - Contenu:', documentData.contenu);
        console.log('DossierDetailsSheet - Heures:', documentData.contenu?.heures);
      }
      
      onUpdate();
      console.log('Document généré avec succès:', documentData);
    } catch (error) {
      console.error('Erreur lors de la génération du document:', error);
    }
  };

  const synchroniserHeuresCours = async (documentData: any) => {
    try {
      const { default: DossierService } = await import('../services/dossierService');
      
      console.log('Début de la synchronisation pour le type:', documentData.type);
      console.log('Heures à synchroniser:', documentData.contenu.heures);
      
      // Supprimer les anciennes heures du même type
      if (documentData.type === 'theorique') {
        console.log('Suppression des anciennes heures théoriques:', dossier.heuresTheoriques.length);
        for (const heure of dossier.heuresTheoriques) {
          await DossierService.supprimerHeureCours(dossier.id, heure.id);
        }
      } else if (documentData.type === 'pratique') {
        console.log('Suppression des anciennes heures pratiques:', dossier.heuresPratiques.length);
        for (const heure of dossier.heuresPratiques) {
          await DossierService.supprimerHeureCours(dossier.id, heure.id);
        }
      }
      
      // Ajouter les nouvelles heures
      console.log('Ajout des nouvelles heures...');
      for (const heure of documentData.contenu.heures) {
        console.log('Ajout de l\'heure:', heure);
        await DossierService.ajouterHeureCours(dossier.id, {
          type: documentData.type,
          date: heure.date,
          duree: heure.duree,
          instructeur: heure.instructeur,
          vehicule: heure.vehicule,
          observations: heure.observations,
          statut: 'effectue'
        });
      }
      
      console.log(`Heures de cours synchronisées pour le type: ${documentData.type}`);
      
      // Vérifier le résultat
      const dossierMisAJour = await DossierService.getDossierById(dossier.id);
      console.log('Heures théoriques après sync:', dossierMisAJour.heuresTheoriques.length);
      console.log('Heures pratiques après sync:', dossierMisAJour.heuresPratiques.length);
    } catch (error) {
      console.error('Erreur lors de la synchronisation des heures:', error);
    }
  };


  const handleViewDocument = (document: any) => {
    try {
      if (document.file) {
        // Document uploadé - créer une URL temporaire et ouvrir avec interface PDF native
        const url = URL.createObjectURL(document.file);
        window.open(url, '_blank');
        // Nettoyer l'URL après un délai
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else if (document.url && document.url !== 'placeholder') {
        // Document existant avec URL valide - ouvrir directement
        window.open(document.url, '_blank');
      } else if (document.pdfUrl) {
        // Document généré avec URL PDF stockée - ouvrir directement
        window.open(document.pdfUrl, '_blank');
      } else {
        // Document généré sans URL PDF - régénérer le PDF
        regeneratePDF(document);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du document:', error);
      alert('Impossible d\'ouvrir le document. Veuillez réessayer.');
    }
  };

  const regeneratePDF = (document: any) => {
    // Régénérer le PDF pour les documents générés sans URL
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${document.nom}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #2c3e50;
            margin: 0;
          }
          .info-section {
            margin-bottom: 20px;
          }
          .info-section h3 {
            color: #34495e;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            font-weight: bold;
            color: #7f8c8d;
            font-size: 0.9em;
          }
          .info-value {
            color: #2c3e50;
            font-size: 1.1em;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 0.9em;
            color: #7f8c8d;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${document.nom}</h1>
          <p>Type: ${getTypeLabel(document.type)}</p>
        </div>

        <div class="info-section">
          <h3>Informations du document</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Nom du document:</span>
              <span class="info-value">${document.nom}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Type:</span>
              <span class="info-value">${getTypeLabel(document.type)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Taille:</span>
              <span class="info-value">${document.taille}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Statut:</span>
              <span class="info-value">${document.isGenerated ? 'Généré automatiquement' : 'Uploadé'}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
          <p>Ministère des Transports, de la Marine Marchande et de la Logistique</p>
        </div>
      </body>
      </html>
    `;

    // Créer un blob et l'ouvrir avec l'interface PDF native
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    // Nettoyer l'URL après un délai
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDownloadDocument = (document: any) => {
    try {
      if (document.file) {
        // Document uploadé - télécharger directement
        const url = URL.createObjectURL(document.file);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.nom;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Document généré ou existant - simuler le téléchargement
        alert(`Téléchargement du document: ${document.nom}\n\nType: ${getTypeLabel(document.type)}\n\nLe téléchargement sera disponible via le système de gestion des documents.`);
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement du document:', error);
      alert('Impossible de télécharger le document. Veuillez réessayer.');
    }
  };

  const handleDeleteDocument = async (document: any) => {
    try {
      if (window.confirm(`Êtes-vous sûr de vouloir supprimer le document "${document.nom}" ?`)) {
        const { default: DossierService } = await import('../services/dossierService');
        await DossierService.supprimerDocument(dossier.id, document.id);
        onUpdate();
        console.log('Document supprimé:', document.nom);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du document:', error);
      alert('Impossible de supprimer le document. Veuillez réessayer.');
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'en_cours': return 'warning';
      case 'complet': return 'success';
      case 'envoye_cnepc': return 'info';
      default: return 'default';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'en_cours': return 'En cours';
      case 'complet': return 'Complet';
      case 'envoye_cnepc': return 'Envoyé CNEPC';
      default: return statut;
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
              Dossier de {dossier.eleve.firstName} {dossier.eleve.lastName}
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
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold" className="font-display">
                    Informations de l'élève
                  </Typography>
                </Box>
                
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
                      Email
                    </Typography>
                    <Typography variant="body1" className="font-primary">
                      {dossier.eleve.email}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
                      Téléphone
                    </Typography>
                    <Typography variant="body1" className="font-primary">
                      {dossier.eleve.phone}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
                      Auto-École
                    </Typography>
                    <Typography variant="body1" className="font-primary">
                      {dossier.eleve.autoEcole.name}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom className="font-primary">
                      Statut du dossier
                    </Typography>
                    <Chip
                      label={getStatutLabel(dossier.statut)}
                      color={getStatutColor(dossier.statut) as any}
                      size="small"
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Documents de cours */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold" className="font-display">
                      Documents de cours ({dossier.documentsCours.length})
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleGenerateDocument('theorique')}
                    className="font-primary"
                  >
                    Ajouter
                  </Button>
                </Box>

                {dossier.documentsCours.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <DescriptionIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" className="font-primary">
                      Aucun document de cours
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {dossier.documentsCours.map((doc) => (
                      <Box
                        key={doc.id}
                        sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Box>
                          <Typography variant="body1" className="font-primary">
                            {doc.nom}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" className="font-primary">
                            {getTypeLabel(doc.type)} • {doc.taille}
                          </Typography>
                          {/* Debug: Afficher le type brut */}
                          <Typography variant="caption" color="text.secondary" className="font-primary">
                            Debug - Type: {doc.type}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
                          <IconButton
                            size="small"
                            onClick={() => handleViewDocument(doc)}
                            title="Ouvrir le document"
                            sx={{ color: 'primary.main' }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDownloadDocument(doc)}
                            title="Télécharger le document"
                            sx={{ color: 'success.main' }}
                          >
                            <DownloadIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteDocument(doc)}
                            title="Supprimer le document"
                            sx={{ color: 'error.main' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Heures de cours */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" fontWeight="bold" className="font-display">
                      Heures de cours
                    </Typography>
                  </Box>
                   
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" className="font-display">
                          Théorique
                        </Typography>
                        <Typography variant="h4" color="primary.main" className="font-display">
                          {dossier.heuresTheoriques.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" className="font-primary">
                          heures
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" className="font-display">
                          Pratique
                        </Typography>
                        <Typography variant="h4" color="success.main" className="font-display">
                          {dossier.heuresPratiques.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" className="font-primary">
                          heures
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
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
                      className="font-primary"
                    >
                      Upload document
                    </Button>
                  </Grid>
                   
                </Grid>
              </CardContent>
            </Card>
          </Box>

          {/* Actions */}
          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={onClose} className="font-primary">
                Fermer
              </Button>
              <Button variant="contained" color="primary" className="font-primary">
                Sauvegarder
              </Button>
            </Stack>
          </Box>
        </Box>
      </Drawer>

      {/* Formulaire de génération de document */}
      <DocumentGenerationForm
        open={documentFormOpen}
        onClose={() => setDocumentFormOpen(false)}
        onGenerate={handleDocumentGenerated}
        type={documentType}
        eleve={dossier.eleve}
        defaultNom={getDefaultDocumentName(documentType)}
        defaultTitre={getDefaultTitle(documentType)}
      />
    </>
  );
};

export default DossierDetailsSheet;
