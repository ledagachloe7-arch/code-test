import React from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, CircularProgress, Chip, Typography } from '@mui/material';
import { School } from '@mui/icons-material';
import { AutoEcole, Formation } from '../../services';

interface AutoEcoleFormationStepProps {
  autoEcoles: AutoEcole[];
  loadingAutoEcoles: boolean;
  formations: Formation[];
  loadingFormations: boolean;
  loading: boolean;
  autoEcoleId: string;
  formationId: string;
  onAutoEcoleChange: (value: string) => void;
  onFormationChange: (value: string) => void;
}

export const AutoEcoleFormationStep: React.FC<AutoEcoleFormationStepProps> = ({
  autoEcoles,
  loadingAutoEcoles,
  formations,
  loadingFormations,
  loading,
  autoEcoleId,
  formationId,
  onAutoEcoleChange,
  onFormationChange,
}) => {
  return (
    <Box>
      <FormControl fullWidth required sx={{ mb: 3 }}>
        <InputLabel>Auto-École</InputLabel>
        <Select
          value={autoEcoleId}
          onChange={(e) => onAutoEcoleChange(e.target.value)}
          label="Auto-École"
          disabled={loadingAutoEcoles || loading}
        >
          {loadingAutoEcoles ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Chargement des auto-écoles...
            </MenuItem>
          ) : autoEcoles.length === 0 ? (
            <MenuItem disabled>
              Aucune auto-école disponible
            </MenuItem>
          ) : (
            autoEcoles.map((autoEcole) => (
              <MenuItem key={autoEcole.id} value={autoEcole.id}>
                {autoEcole.nom_auto_ecole}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      <FormControl fullWidth required sx={{ mb: 3 }}>
        <InputLabel>Formation</InputLabel>
        <Select
          value={formationId}
          onChange={(e) => onFormationChange(e.target.value)}
          label="Formation"
          disabled={loadingFormations || loading || !autoEcoleId}
        >
          {loadingFormations ? (
            <MenuItem disabled>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Chargement des formations...
            </MenuItem>
          ) : !autoEcoleId ? (
            <MenuItem disabled>
              Veuillez d'abord sélectionner une auto-école
            </MenuItem>
          ) : formations.length === 0 ? (
            <MenuItem disabled>
              Aucune formation active disponible
            </MenuItem>
          ) : (
            formations.map((formation) => {
              let typePermisLabel = 'N/A';
              if (formation.typePermis) {
                typePermisLabel = ('libelle' in formation.typePermis) 
                  ? formation.typePermis.libelle 
                  : ('nom' in formation.typePermis ? formation.typePermis.nom : 'N/A');
              } else if (formation.type_permis) {
                typePermisLabel = ('libelle' in formation.type_permis) 
                  ? formation.type_permis.libelle 
                  : ('nom' in formation.type_permis ? formation.type_permis.nom : 'N/A');
              }
              
              return (
                <MenuItem key={formation.id} value={formation.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <School fontSize="small" />
                      <Typography variant="body1" fontWeight="medium">
                        {formation.nom || `Formation ${typePermisLabel}`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip 
                        label={typePermisLabel} 
                        size="small" 
                        variant="outlined"
                      />
                      <Chip 
                        label={formation.montant_formate || `${formation.montant} FCFA`} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </MenuItem>
              );
            })
          )}
        </Select>
      </FormControl>
    </Box>
  );
};

