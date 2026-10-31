import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { NouvelleDemande } from '../types/inscription';

const NouvelleDemandeForm: React.FC = () => {
  const [formData, setFormData] = useState<NouvelleDemande>({
    eleve: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      birthDate: '',
      nationality: 'Gabonaise',
      lieuNaissance: '',
      nationaliteEtrangere: ''
    },
    documents: [],
    commentaires: '',
    pieceIdentite: {
      type: '',
      numero: ''
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [autoCompletedFields, setAutoCompletedFields] = useState<Set<string>>(new Set());

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent modification of auto-completed fields
    if (autoCompletedFields.has(field)) {
      return;
    }
    
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      eleve: {
        ...prev.eleve,
        [field]: value
      }
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCommentairesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      commentaires: event.target.value
    }));
  };

  const handlePieceIdentiteTypeChange = (event: any) => {
    const type = event.target.value;
    setFormData(prev => ({
      ...prev,
      pieceIdentite: {
        ...prev.pieceIdentite,
        type,
        numero: '' // Reset numero when type changes
      }
    }));
    
    // Clear related errors
    if (errors.pieceIdentiteType) {
      setErrors(prev => ({ ...prev, pieceIdentiteType: '' }));
    }
  };

  const handlePieceIdentiteNumeroChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const numero = event.target.value;
    setFormData(prev => ({
      ...prev,
      pieceIdentite: {
        ...prev.pieceIdentite,
        numero
      }
    }));
    
    // Clear related errors
    if (errors.pieceIdentiteNumero) {
      setErrors(prev => ({ ...prev, pieceIdentiteNumero: '' }));
    }
  };

  // Mock function to simulate auto-completion based on ID number
  const autoCompleteFromId = async (type: string, numero: string) => {
    if (!numero || numero.length < 3) return;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock data based on ID type and number
    const mockData: Record<string, any> = {
      'NIP': {
        '123456789': {
          firstName: 'Jean',
          lastName: 'Dupont',
          birthDate: '1990-05-15',
          lieuNaissance: 'Paris'
        },
        '987654321': {
          firstName: 'Marie',
          lastName: 'Martin',
          birthDate: '1985-12-03',
          lieuNaissance: 'Lyon'
        }
      },
      'CNI': {
        '123456789012': {
          firstName: 'Pierre',
          lastName: 'Durand',
          birthDate: '1992-08-20',
          lieuNaissance: 'Marseille'
        }
      },
      'PASSPORT': {
        'AB1234567': {
          firstName: 'Sophie',
          lastName: 'Bernard',
          birthDate: '1988-03-10',
          lieuNaissance: 'Toulouse'
        }
      }
    };
    
    const data = mockData[type]?.[numero];
    if (data) {
      setFormData(prev => ({
        ...prev,
        eleve: {
          ...prev.eleve,
          firstName: data.firstName,
          lastName: data.lastName,
          birthDate: data.birthDate,
          lieuNaissance: data.lieuNaissance
        }
      }));
      
      // Mark fields as auto-completed
      setAutoCompletedFields(new Set(['firstName', 'lastName', 'birthDate', 'lieuNaissance']));
      
      setMessage({ 
        type: 'success', 
        text: 'Informations auto-complétées avec succès ! Ces champs ne peuvent plus être modifiés.' 
      });
    } else {
      setMessage({ 
        type: 'error', 
        text: 'Aucune information trouvée pour ce numéro. Veuillez saisir manuellement.' 
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...newFiles]
      }));
    }
  };

  const handleRemoveDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validate piece d'identité
    if (!formData.pieceIdentite.type) {
      newErrors.pieceIdentiteType = 'Le type de pièce d\'identité est requis';
    }
    
    if (!formData.pieceIdentite.numero.trim()) {
      newErrors.pieceIdentiteNumero = 'Le numéro de pièce d\'identité est requis';
    }
    
    if (!formData.eleve.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    }
    
    if (!formData.eleve.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    }
    
    if (!formData.eleve.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.eleve.email)) {
      newErrors.email = 'Email invalide';
    }
    
    if (!formData.eleve.phone.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    }
    
    if (!formData.eleve.address.trim()) {
      newErrors.address = 'L\'adresse est requise';
    }
    
    if (!formData.eleve.birthDate) {
      newErrors.birthDate = 'La date de naissance est requise';
    }
    
    if (!formData.eleve.lieuNaissance.trim()) {
      newErrors.lieuNaissance = 'Le lieu de naissance est requis';
    }
    
    // Validate foreign nationality if Étrangère is selected
    if (formData.eleve.nationality === 'Étrangère' && (!formData.eleve.nationaliteEtrangere || !formData.eleve.nationaliteEtrangere?.trim())) {
      newErrors.nationaliteEtrangere = 'Veuillez spécifier votre nationalité';
    }
    
    if (formData.documents.length === 0) {
      newErrors.documents = 'Au moins un document est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      
      // TODO: Implémenter la création de candidat via l'API
      // Pour l'instant, le formulaire utilise l'API réelle via candidatService
      // Voir la documentation dans CORRECT_FLUX_INSCRIPTION.md
      
      setMessage({ 
        type: 'success', 
        text: 'Formulaire validé ! Veuillez utiliser le formulaire de création de candidat avec l\'API.' 
      });
      
      // Reset form après succès
      setFormData({
        eleve: {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          birthDate: '',
          nationality: 'Gabonaise',
          lieuNaissance: '',
          nationaliteEtrangere: ''
        },
        documents: [],
        commentaires: '',
        pieceIdentite: {
          type: '',
          numero: ''
        }
      });
      
      // Reset auto-completed fields
      setAutoCompletedFields(new Set());
      
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erreur lors de la création de la demande' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Nouvelle demande d'inscription
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Créer une nouvelle demande d'inscription pour un élève
      </Typography>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Pièce d'identité */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Pièce d'identité
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Sélectionnez votre type de pièce d'identité et saisissez le numéro pour auto-compléter vos informations
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type de pièce d'identité</InputLabel>
                  <Select
                    value={formData.pieceIdentite.type}
                    onChange={handlePieceIdentiteTypeChange}
                    label="Type de pièce d'identité"
                    error={!!errors.pieceIdentiteType}
                  >
                    <MenuItem value="NIP">NIP (Numéro d'Identification Personnel)</MenuItem>
                    <MenuItem value="CNI">CNI (Carte Nationale d'Identité)</MenuItem>
                    <MenuItem value="PASSPORT">Passeport</MenuItem>
                  </Select>
                  {errors.pieceIdentiteType && (
                    <Typography variant="caption" color="error" display="block">
                      {errors.pieceIdentiteType}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label={`Numéro ${formData.pieceIdentite.type || 'de pièce d\'identité'}`}
                  fullWidth
                  value={formData.pieceIdentite.numero}
                  onChange={handlePieceIdentiteNumeroChange}
                  error={!!errors.pieceIdentiteNumero}
                  helperText={errors.pieceIdentiteNumero}
                  placeholder={
                    formData.pieceIdentite.type === 'NIP' ? '123456789' :
                    formData.pieceIdentite.type === 'CNI' ? '123456789012' :
                    formData.pieceIdentite.type === 'PASSPORT' ? 'AB1234567' :
                    'Saisissez votre numéro'
                  }
                  onBlur={() => {
                    if (formData.pieceIdentite.type && formData.pieceIdentite.numero) {
                      autoCompleteFromId(formData.pieceIdentite.type, formData.pieceIdentite.numero);
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Informations de l'élève
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Ces informations peuvent être auto-complétées à partir de votre pièce d'identité
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Prénom"
                  fullWidth
                  value={formData.eleve.firstName}
                  onChange={handleInputChange('firstName')}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                  required
                  disabled={autoCompletedFields.has('firstName')}
                  InputProps={{
                    readOnly: autoCompletedFields.has('firstName')
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nom"
                  fullWidth
                  value={formData.eleve.lastName}
                  onChange={handleInputChange('lastName')}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                  required
                  disabled={autoCompletedFields.has('lastName')}
                  InputProps={{
                    readOnly: autoCompletedFields.has('lastName')
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={formData.eleve.email}
                  onChange={handleInputChange('email')}
                  error={!!errors.email}
                  helperText={errors.email}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Téléphone"
                  fullWidth
                  value={formData.eleve.phone}
                  onChange={handleInputChange('phone')}
                  error={!!errors.phone}
                  helperText={errors.phone}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Adresse"
                  fullWidth
                  multiline
                  rows={2}
                  value={formData.eleve.address}
                  onChange={handleInputChange('address')}
                  error={!!errors.address}
                  helperText={errors.address}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date de naissance"
                  type="date"
                  fullWidth
                  value={formData.eleve.birthDate}
                  onChange={handleInputChange('birthDate')}
                  error={!!errors.birthDate}
                  helperText={errors.birthDate}
                  InputLabelProps={{ shrink: true }}
                  required
                  disabled={autoCompletedFields.has('birthDate')}
                  InputProps={{
                    readOnly: autoCompletedFields.has('birthDate')
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Lieu de naissance"
                  fullWidth
                  value={formData.eleve.lieuNaissance}
                  onChange={handleInputChange('lieuNaissance')}
                  error={!!errors.lieuNaissance}
                  helperText={errors.lieuNaissance}
                  required
                  disabled={autoCompletedFields.has('lieuNaissance')}
                  InputProps={{
                    readOnly: autoCompletedFields.has('lieuNaissance')
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Nationalité</InputLabel>
                  <Select
                    value={formData.eleve.nationality}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      eleve: { 
                        ...prev.eleve, 
                        nationality: e.target.value,
                        nationaliteEtrangere: e.target.value === 'Gabonaise' ? '' : prev.eleve.nationaliteEtrangere
                      }
                    }))}
                    label="Nationalité"
                  >
                    <MenuItem value="Gabonaise">Gabonaise</MenuItem>
                    <MenuItem value="Étrangère">Étrangère</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {formData.eleve.nationality === 'Étrangère' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Précisez votre nationalité"
                    fullWidth
                    value={formData.eleve.nationaliteEtrangere}
                    onChange={handleInputChange('nationaliteEtrangere')}
                    error={!!errors.nationaliteEtrangere}
                    helperText={errors.nationaliteEtrangere}
                    placeholder="Ex: Française, Camerounaise, Congolaise..."
                    required
                  />
                </Grid>
              )}

              {/* Documents */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Documents obligatoires
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Veuillez joindre les documents suivants : carte d'identité, photo d'identité, certificat médical, attestation d'aptitude
                </Typography>
                
                <input
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                />
                <label htmlFor="file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    sx={{ mb: 2 }}
                  >
                    Ajouter des documents
                  </Button>
                </label>
                
                {errors.documents && (
                  <Typography variant="caption" color="error" display="block">
                    {errors.documents}
                  </Typography>
                )}
                
                {formData.documents.length > 0 && (
                  <Paper sx={{ mt: 2 }}>
                    <List>
                      {formData.documents.map((file, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={file.name}
                            secondary={`${(file.size / 1024 / 1024).toFixed(1)} MB`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => handleRemoveDocument(index)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Grid>

              {/* Commentaires */}
              <Grid item xs={12}>
                <TextField
                  label="Commentaires (optionnel)"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.commentaires}
                  onChange={handleCommentairesChange}
                  placeholder="Informations supplémentaires sur la demande..."
                />
              </Grid>

              {/* Actions */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => window.history.back()}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    sx={{ backgroundColor: '#50C786' }}
                  >
                    {loading ? 'Création...' : 'Créer la demande'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default NouvelleDemandeForm;
