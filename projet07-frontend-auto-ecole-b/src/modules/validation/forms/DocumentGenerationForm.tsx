import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';

interface DocumentGenerationFormProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (documentData: DocumentFormData) => void;
  type: 'theorique' | 'pratique' | 'examen' | 'certificat';
  eleve?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    autoEcole: {
      name: string;
    };
  };
  defaultNom?: string;
  defaultTitre?: string;
}

interface DocumentFormData {
  nom: string;
  type: 'theorique' | 'pratique' | 'examen' | 'certificat';
  contenu: {
    titre: string;
    eleve: string;
    instructeur: string;
    date: string;
    duree?: number;
    vehicule?: string;
    observations?: string;
    heures: HeureFormData[];
  };
  pdfUrl?: string; // URL du PDF généré
}

interface HeureFormData {
  id: string;
  date: string;
  duree: number;
  instructeur: string;
  vehicule?: string;
  observations?: string;
}

const DocumentGenerationForm: React.FC<DocumentGenerationFormProps> = ({
  open,
  onClose,
  onGenerate,
  type,
  eleve,
  defaultNom,
  defaultTitre
}) => {
  const [formData, setFormData] = useState<DocumentFormData>({
    nom: defaultNom || '',
    type,
    contenu: {
      titre: defaultTitre || '',
      eleve: eleve ? `${eleve.firstName} ${eleve.lastName}` : '',
      instructeur: '',
      date: new Date().toISOString().split('T')[0],
      duree: 0,
      vehicule: '',
      observations: '',
      heures: []
    }
  });

  const [heures, setHeures] = useState<HeureFormData[]>([]);

  // Mettre à jour les données quand l'élève change
  useEffect(() => {
    if (eleve) {
      setFormData(prev => ({
        ...prev,
        contenu: {
          ...prev.contenu,
          eleve: `${eleve.firstName} ${eleve.lastName}`
        }
      }));
    }
  }, [eleve]);

  // Mettre à jour le type quand il change
  useEffect(() => {
    console.log('DocumentGenerationForm - Type reçu:', type);
    setFormData(prev => ({
      ...prev,
      type
    }));
  }, [type]);

  // Mettre à jour les valeurs par défaut quand elles changent
  useEffect(() => {
    if (defaultNom || defaultTitre) {
      setFormData(prev => ({
        ...prev,
        nom: defaultNom || prev.nom,
        contenu: {
          ...prev.contenu,
          titre: defaultTitre || prev.contenu.titre
        }
      }));
    }
  }, [defaultNom, defaultTitre]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      contenu: {
        ...prev.contenu,
        [field]: value
      }
    }));
  };

  const handleAddHeure = () => {
    const nouvelleHeure: HeureFormData = {
      id: `heure_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      duree: 60,
      instructeur: formData.contenu.instructeur,
      vehicule: formData.contenu.vehicule || '',
      observations: ''
    };
    setHeures(prev => [...prev, nouvelleHeure]);
  };

  const handleHeureChange = (heureId: string, field: string, value: any) => {
    setHeures(prev => prev.map(heure => 
      heure.id === heureId ? { ...heure, [field]: value } : heure
    ));
  };

  const handleRemoveHeure = (heureId: string) => {
    setHeures(prev => prev.filter(heure => heure.id !== heureId));
  };

  const generatePDF = async (documentData: DocumentFormData) => {
    // Créer le contenu HTML du document
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${documentData.nom}</title>
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
          .heures-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .heures-table th,
          .heures-table td {
            border: 1px solid #bdc3c7;
            padding: 8px;
            text-align: left;
          }
          .heures-table th {
            background-color: #ecf0f1;
            font-weight: bold;
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
          <h1>${documentData.contenu.titre}</h1>
          <p>Auto-École: ${eleve?.autoEcole.name || 'Non spécifiée'}</p>
        </div>

        <div class="info-section">
          <h3>Informations de l'élève</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Nom complet:</span>
              <span class="info-value">${documentData.contenu.eleve}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Email:</span>
              <span class="info-value">${eleve?.email || 'Non spécifié'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Téléphone:</span>
              <span class="info-value">${eleve?.phone || 'Non spécifié'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date:</span>
              <span class="info-value">${new Date(documentData.contenu.date).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3>Détails du cours</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Instructeur:</span>
              <span class="info-value">${documentData.contenu.instructeur}</span>
            </div>
            ${documentData.contenu.vehicule ? `
            <div class="info-item">
              <span class="info-label">Véhicule:</span>
              <span class="info-value">${documentData.contenu.vehicule}</span>
            </div>
            ` : ''}
            <div class="info-item">
              <span class="info-label">Durée totale:</span>
              <span class="info-value">${Math.round((documentData.contenu.duree || 0) / 60 * 100) / 100} heures</span>
            </div>
          </div>
        </div>

        ${heures.length > 0 ? `
        <div class="info-section">
          <h3>Détail des heures de cours</h3>
          <table class="heures-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Durée (min)</th>
                <th>Instructeur</th>
                ${documentData.type === 'pratique' ? '<th>Véhicule</th>' : ''}
                <th>Observations</th>
              </tr>
            </thead>
            <tbody>
              ${heures.map(heure => `
                <tr>
                  <td>${new Date(heure.date).toLocaleDateString('fr-FR')}</td>
                  <td>${Math.floor(heure.duree / 60)}h${heure.duree % 60 ? (heure.duree % 60).toString().padStart(2, '0') : '00'}</td>
                  <td>${heure.instructeur}</td>
                  ${documentData.type === 'pratique' ? `<td>${heure.vehicule || '-'}</td>` : ''}
                  <td>${heure.observations || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${documentData.contenu.observations ? `
        <div class="info-section">
          <h3>Observations générales</h3>
          <p>${documentData.contenu.observations}</p>
        </div>
        ` : ''}

        <div class="footer">
          <p>Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
          <p>Ministère des Transports, de la Marine Marchande et de la Logistique</p>
        </div>
      </body>
      </html>
    `;

    // Créer un blob avec le contenu HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Ouvrir dans une nouvelle fenêtre pour impression/PDF
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        // Nettoyer l'URL après impression
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
    }
    
    // Retourner l'URL pour qu'elle soit accessible
    return url;
  };

  const handleGenerate = async () => {
    // Calculer la durée totale à partir des heures ajoutées
    const dureeTotale = heures.reduce((total, heure) => total + heure.duree, 0);
    
    const documentData = {
      ...formData,
      contenu: {
        ...formData.contenu,
        duree: dureeTotale, // Utiliser la durée calculée
        heures
      }
    };
    
    console.log('DocumentGenerationForm - Heures à transmettre:', heures);
    console.log('DocumentGenerationForm - DocumentData complet:', documentData);
    console.log('DocumentGenerationForm - Type de document:', documentData.type);
    console.log('DocumentGenerationForm - FormData type:', formData.type);
    
    // Générer le PDF et récupérer l'URL
    const pdfUrl = await generatePDF(documentData);
    
    // Ajouter l'URL du PDF au documentData
    const documentDataWithPdf = {
      ...documentData,
      pdfUrl
    };
    
    // Appeler la fonction de callback
    onGenerate(documentDataWithPdf);
    onClose();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'theorique': return 'Cours Théorique';
      case 'pratique': return 'Cours Pratique';
      case 'examen': return 'Examen';
      case 'certificat': return 'Certificat';
      default: return type;
    }
  };


  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={false}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" className="font-display">
              Générer un document {getTypeLabel(type)}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Informations générales */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom className="font-display">
                  Informations générales
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nom du document"
                      value={formData.nom}
                      onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                      className="font-primary"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Titre"
                      value={formData.contenu.titre}
                      onChange={(e) => handleInputChange('titre', e.target.value)}
                      className="font-primary"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nom de l'élève"
                      value={formData.contenu.eleve}
                      onChange={(e) => handleInputChange('eleve', e.target.value)}
                      className="font-primary"
                      InputProps={{
                        readOnly: !!eleve
                      }}
                      helperText={eleve ? "Informations automatiquement renseignées" : ""}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Instructeur"
                      value={formData.contenu.instructeur}
                      onChange={(e) => handleInputChange('instructeur', e.target.value)}
                      className="font-primary"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Date"
                      type="date"
                      value={formData.contenu.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      className="font-primary"
                    />
                  </Grid>
                  {type === 'pratique' && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Véhicule"
                        value={formData.contenu.vehicule}
                        onChange={(e) => handleInputChange('vehicule', e.target.value)}
                        className="font-primary"
                      />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Observations"
                      multiline
                      rows={3}
                      value={formData.contenu.observations}
                      onChange={(e) => handleInputChange('observations', e.target.value)}
                      className="font-primary"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Heures de cours */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" className="font-display">
                      Heures de cours
                    </Typography>
                    {heures.length > 0 && (
                      <Typography variant="body2" color="text.secondary" className="font-primary">
                        Durée totale: {Math.floor(heures.reduce((total, heure) => total + heure.duree, 0) / 60)}h{(heures.reduce((total, heure) => total + heure.duree, 0) % 60).toString().padStart(2, '0')}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddHeure}
                    size="small"
                    className="font-primary"
                  >
                    Ajouter une heure
                  </Button>
                </Box>

                {heures.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary" className="font-primary">
                      Aucune heure de cours ajoutée
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {heures.map((heure, index) => (
                      <Card key={heure.id} variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="subtitle1" className="font-display">
                              Heure {index + 1}
                            </Typography>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveHeure(heure.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Date"
                                type="date"
                                value={heure.date}
                                onChange={(e) => handleHeureChange(heure.id, 'date', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                size="small"
                                className="font-primary"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Durée (minutes)"
                                type="number"
                                value={heure.duree}
                                onChange={(e) => handleHeureChange(heure.id, 'duree', parseInt(e.target.value))}
                                size="small"
                                className="font-primary"
                              />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <TextField
                                fullWidth
                                label="Instructeur"
                                value={heure.instructeur}
                                onChange={(e) => handleHeureChange(heure.id, 'instructeur', e.target.value)}
                                size="small"
                                className="font-primary"
                              />
                            </Grid>
                            {type === 'pratique' && (
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  fullWidth
                                  label="Véhicule"
                                  value={heure.vehicule || ''}
                                  onChange={(e) => handleHeureChange(heure.id, 'vehicule', e.target.value)}
                                  size="small"
                                  className="font-primary"
                                />
                              </Grid>
                            )}
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Observations"
                                multiline
                                rows={2}
                                value={heure.observations || ''}
                                onChange={(e) => handleHeureChange(heure.id, 'observations', e.target.value)}
                                size="small"
                                className="font-primary"
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} className="font-primary">
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={!formData.nom || !formData.contenu.titre || !formData.contenu.eleve}
          className="font-primary"
        >
          Générer le PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentGenerationForm;
