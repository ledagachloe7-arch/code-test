// Composant pour les filtres
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Stack,
} from '@mui/material';
import {
  FilterList,
  Clear,
  Search,
} from '@mui/icons-material';
import { CandidatExamenFilters, SessionExamenFilters, CreneauFilters } from '../types';

interface FiltresPanelProps {
  type: 'candidats' | 'sessions' | 'creneaux';
  filters: CandidatExamenFilters | SessionExamenFilters | CreneauFilters;
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  sessions?: Array<{ id: string; nom: string }>;
  autoEcoles?: Array<{ id: string; nom_auto_ecole: string }>;
  epreuves?: Array<{ id: string; nom: string }>;
  typePermis?: Array<{ id: string; libelle: string }>;
}

const FiltresPanel: React.FC<FiltresPanelProps> = ({
  type,
  filters,
  onFiltersChange,
  onClearFilters,
  sessions = [],
  autoEcoles = [],
  epreuves = [],
  typePermis = [],
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({} as any);
    onClearFilters();
  };

  const getActiveFiltersCount = () => {
    return Object.values(localFilters).filter(value => 
      value !== undefined && value !== null && value !== ''
    ).length;
  };

  const renderCandidatFilters = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Session d'examen</InputLabel>
          <Select
            value={localFilters.session_examen_id || ''}
            onChange={(e) => handleFilterChange('session_examen_id', e.target.value)}
            label="Session d'examen"
          >
            <MenuItem value="">Toutes les sessions</MenuItem>
            {sessions.map((session) => (
              <MenuItem key={session.id} value={session.id}>
                {session.nom}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Auto-école</InputLabel>
          <Select
            value={localFilters.auto_ecole_id || ''}
            onChange={(e) => handleFilterChange('auto_ecole_id', e.target.value)}
            label="Auto-école"
          >
            <MenuItem value="">Toutes les auto-écoles</MenuItem>
            {autoEcoles.map((autoEcole) => (
              <MenuItem key={autoEcole.id} value={autoEcole.id}>
                {autoEcole.nom_auto_ecole}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Statut</InputLabel>
          <Select
            value={localFilters.statut || ''}
            onChange={(e) => handleFilterChange('statut', e.target.value)}
            label="Statut"
          >
            <MenuItem value="">Tous les statuts</MenuItem>
            <MenuItem value="inscrit">Inscrit</MenuItem>
            <MenuItem value="en_attente">En attente</MenuItem>
            <MenuItem value="programme">Programmé</MenuItem>
            <MenuItem value="present">Présent</MenuItem>
            <MenuItem value="absent">Absent</MenuItem>
            <MenuItem value="reussi">Réussi</MenuItem>
            <MenuItem value="echoue">Échoué</MenuItem>
            <MenuItem value="annule">Annulé</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          fullWidth
          size="small"
          label="Rechercher"
          value={localFilters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          placeholder="Nom, prénom, numéro candidat..."
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Date de début"
          value={localFilters.date_debut || ''}
          onChange={(e) => handleFilterChange('date_debut', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Date de fin"
          value={localFilters.date_fin || ''}
          onChange={(e) => handleFilterChange('date_fin', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
    </Grid>
  );

  const renderSessionFilters = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Type de permis</InputLabel>
          <Select
            value={localFilters.type_permis_id || ''}
            onChange={(e) => handleFilterChange('type_permis_id', e.target.value)}
            label="Type de permis"
          >
            <MenuItem value="">Tous les types</MenuItem>
            {typePermis.map((type) => (
              <MenuItem key={type.id} value={type.id}>
                {type.libelle}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Statut</InputLabel>
          <Select
            value={localFilters.statut || ''}
            onChange={(e) => handleFilterChange('statut', e.target.value)}
            label="Statut"
          >
            <MenuItem value="">Tous les statuts</MenuItem>
            <MenuItem value="planifiee">Planifiée</MenuItem>
            <MenuItem value="ouverte">Ouverte</MenuItem>
            <MenuItem value="fermee">Fermée</MenuItem>
            <MenuItem value="en_cours">En cours</MenuItem>
            <MenuItem value="terminee">Terminée</MenuItem>
            <MenuItem value="annulee">Annulée</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          fullWidth
          size="small"
          label="Rechercher"
          value={localFilters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          placeholder="Nom de la session..."
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Date de début"
          value={localFilters.date_debut || ''}
          onChange={(e) => handleFilterChange('date_debut', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Date de fin"
          value={localFilters.date_fin || ''}
          onChange={(e) => handleFilterChange('date_fin', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
    </Grid>
  );

  const renderCreneauFilters = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Épreuve</InputLabel>
          <Select
            value={localFilters.epreuve_session_id || ''}
            onChange={(e) => handleFilterChange('epreuve_session_id', e.target.value)}
            label="Épreuve"
          >
            <MenuItem value="">Toutes les épreuves</MenuItem>
            {epreuves.map((epreuve) => (
              <MenuItem key={epreuve.id} value={epreuve.id}>
                {epreuve.nom}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <FormControl fullWidth size="small">
          <InputLabel>Statut</InputLabel>
          <Select
            value={localFilters.statut || ''}
            onChange={(e) => handleFilterChange('statut', e.target.value)}
            label="Statut"
          >
            <MenuItem value="">Tous les statuts</MenuItem>
            <MenuItem value="disponible">Disponible</MenuItem>
            <MenuItem value="complet">Complet</MenuItem>
            <MenuItem value="en_cours">En cours</MenuItem>
            <MenuItem value="termine">Terminé</MenuItem>
            <MenuItem value="annule">Annulé</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Date"
          value={localFilters.date || ''}
          onChange={(e) => handleFilterChange('date', e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          fullWidth
          size="small"
          label="Rechercher"
          value={localFilters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          placeholder="Rechercher..."
        />
      </Grid>
    </Grid>
  );

  return (
    <Card elevation={1}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterList sx={{ mr: 1 }} />
            <Typography variant="h6">
              Filtres
            </Typography>
            {getActiveFiltersCount() > 0 && (
              <Chip
                label={getActiveFiltersCount()}
                color="primary"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<Clear />}
              onClick={handleClearFilters}
              disabled={getActiveFiltersCount() === 0}
            >
              Effacer
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Search />}
              onClick={handleApplyFilters}
            >
              Appliquer
            </Button>
          </Stack>
        </Box>

        {type === 'candidats' && renderCandidatFilters()}
        {type === 'sessions' && renderSessionFilters()}
        {type === 'creneaux' && renderCreneauFilters()}
      </CardContent>
    </Card>
  );
};

export default FiltresPanel;
