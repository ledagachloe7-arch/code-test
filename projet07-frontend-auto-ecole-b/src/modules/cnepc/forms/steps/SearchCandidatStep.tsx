import React, { useState, useEffect } from 'react';
import {
  Grid,
  Typography,
  TextField,
  Button,
  Autocomplete,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Search, Person, PersonAdd } from '@mui/icons-material';
import { autoEcoleService } from '../../../cnepc/services';

interface CandidatOption {
  id: string;
  numero_candidat: string;
  personne: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    contact: string;
    adresse: string;
  };
  date_naissance: string;
  lieu_naissance: string;
  nip: string;
  type_piece: string;
  numero_piece: string;
  nationalite: string;
  genre: string;
}

interface SearchCandidatStepProps {
  selectedCandidat: CandidatOption | null;
  mode: 'new' | 'existing' | null;
  loading: boolean;
  onCandidatSelect: (candidat: CandidatOption | null) => void;
  onModeChange: (mode: 'new' | 'existing' | null) => void;
}

export const SearchCandidatStep: React.FC<SearchCandidatStepProps> = ({
  selectedCandidat,
  mode,
  loading,
  onCandidatSelect,
  onModeChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [candidats, setCandidats] = useState<CandidatOption[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCandidats = async () => {
    if (!searchTerm.trim()) {
      setError('Veuillez entrer un terme de recherche');
      return;
    }

    setLoadingSearch(true);
    setError(null);

    try {
      const response = await autoEcoleService.getCandidats(1, 50, {
        search: searchTerm.trim(),
      });

      if (response.data && response.data.length > 0) {
        setCandidats(response.data);
        console.log('✅ Candidats trouvés:', response.data);
      } else {
        setCandidats([]);
        setError('Aucun candidat trouvé avec ce terme de recherche');
      }
    } catch (err: any) {
      console.error('❌ Erreur lors de la recherche de candidats:', err);
      setError(err.response?.data?.message || 'Erreur lors de la recherche de candidats');
      setCandidats([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectCandidat = (candidat: CandidatOption | null) => {
    onCandidatSelect(candidat);
    if (candidat) {
      console.log('✅ Candidat sélectionné:', candidat);
    }
  };

  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: 'new' | 'existing' | null,
  ) => {
    if (newMode !== null) {
      onModeChange(newMode);
      if (newMode === 'new') {
        onCandidatSelect(null);
      }
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Person color="primary" />
          <Typography variant="h6">
            Choix du candidat
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choisissez de créer un nouveau candidat ou de sélectionner un candidat existant dans la base de données.
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeChange}
          aria-label="mode sélection candidat"
          fullWidth
          disabled={loading}
        >
          <ToggleButton value="new" aria-label="nouveau candidat">
            <PersonAdd sx={{ mr: 1 }} />
            Créer un nouveau candidat
          </ToggleButton>
          <ToggleButton value="existing" aria-label="candidat existant">
            <Person sx={{ mr: 1 }} />
            Sélectionner un candidat existant
          </ToggleButton>
        </ToggleButtonGroup>
      </Grid>

      {mode === 'existing' && (
        <>

      <Grid item xs={12}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Rechercher par nom, prénom, email, numéro candidat ou NIP"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            disabled={loading || loadingSearch}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                searchCandidats();
              }
            }}
            placeholder="Ex: Jean Dupont, jean@example.com, CAN-12345, 123456789"
          />
          <Button
            variant="contained"
            startIcon={loadingSearch ? <CircularProgress size={20} /> : <Search />}
            onClick={searchCandidats}
            disabled={loading || loadingSearch || !searchTerm.trim()}
            sx={{ minWidth: 150 }}
          >
            {loadingSearch ? 'Recherche...' : 'Rechercher'}
          </Button>
        </Box>
      </Grid>

      {error && (
        <Grid item xs={12}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Grid>
      )}

      {candidats.length > 0 && (
        <Grid item xs={12}>
          <Autocomplete
            options={candidats}
            getOptionLabel={(option) => {
              const personne = option.personne;
              return `${personne.nom} ${personne.prenom} - ${option.numero_candidat} (${personne.email})`;
            }}
            value={selectedCandidat}
            onChange={(_, newValue) => handleSelectCandidat(newValue)}
            loading={loadingSearch}
            disabled={loading || loadingSearch}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Sélectionner un candidat"
                placeholder="Choisissez un candidat dans la liste"
              />
            )}
            renderOption={(props, option) => {
              const personne = option.personne;
              return (
                <Box component="li" {...props} key={option.id}>
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {personne.nom} {personne.prenom}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.numero_candidat} • {personne.email} • {personne.contact}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      NIP: {option.nip} • {option.lieu_naissance}
                    </Typography>
                  </Box>
                </Box>
              );
            }}
          />
        </Grid>
      )}

          {selectedCandidat && (
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                <Typography variant="subtitle2" gutterBottom>
                  ✅ Candidat sélectionné
                </Typography>
                <Divider sx={{ my: 1, bgcolor: 'rgba(255,255,255,0.3)' }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Nom complet:</strong> {selectedCandidat.personne.nom} {selectedCandidat.personne.prenom}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Numéro candidat:</strong> {selectedCandidat.numero_candidat}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Email:</strong> {selectedCandidat.personne.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Contact:</strong> {selectedCandidat.personne.contact}
                    </Typography>
                  </Grid>
                </Grid>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleSelectCandidat(null)}
                  sx={{ mt: 2, color: 'inherit', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  Annuler la sélection
                </Button>
              </Paper>
            </Grid>
          )}
        </>
      )}

      {mode === 'new' && (
        <Grid item xs={12}>
          <Alert severity="info">
            Vous allez créer un nouveau candidat. Les étapes suivantes vous permettront de saisir ses informations personnelles et de candidat.
          </Alert>
        </Grid>
      )}
    </Grid>
  );
};

