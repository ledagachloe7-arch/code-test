import React, { useEffect, useState } from 'react';
import { Alert, Autocomplete, Box, CircularProgress, Container, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { InscriptionFormationForm } from '../../cnepc/forms';
import { autoEcoleService } from '../../cnepc/services';
import type { AutoEcole } from '../../cnepc/types/auto-ecole';

interface Props {
  titre?: string;
  couleur?: string;
  onRetour?: () => void;
}

type AutoEcoleOption = { id: string; nom_auto_ecole: string };

/**
 * Nouveau permis rose : parcours de première délivrance existant (NOUVEAUPERMIS).
 * L'agent choisit l'auto-école, puis le formulaire d'inscription à une formation crée le candidat et le dossier
 * (type NOUVEAU PERMIS imposé, auto-école et formation renseignées → examen puis transfert CNEDDT).
 */
const NouveauPermisRosePage: React.FC<Props> = ({ titre = 'Nouveau permis rose', couleur, onRetour }) => {
  const [options, setOptions] = useState<AutoEcoleOption[]>([]);
  const [chargementListe, setChargementListe] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choix, setChoix] = useState<AutoEcoleOption | null>(null);
  const [autoEcole, setAutoEcole] = useState<AutoEcole | null>(null);
  const [chargementAutoEcole, setChargementAutoEcole] = useState(false);

  useEffect(() => {
    let annule = false;
    autoEcoleService
      .listAutoEcolesForSelect(200)
      .then((liste) => {
        if (!annule) setOptions([...liste].sort((a, b) => a.nom_auto_ecole.localeCompare(b.nom_auto_ecole)));
      })
      .catch((e: unknown) => {
        if (!annule) setErreur(e instanceof Error ? e.message : 'Impossible de charger les auto-écoles.');
      })
      .finally(() => {
        if (!annule) setChargementListe(false);
      });
    return () => {
      annule = true;
    };
  }, []);

  const choisirAutoEcole = async (option: AutoEcoleOption | null) => {
    setChoix(option);
    setAutoEcole(null);
    if (!option) return;
    setChargementAutoEcole(true);
    try {
      setAutoEcole(await autoEcoleService.getAutoEcoleById(option.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de charger l'auto-école.");
      setChoix(null);
    } finally {
      setChargementAutoEcole(false);
    }
  };

  const reinitialiser = () => {
    setChoix(null);
    setAutoEcole(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        {onRetour && (
          <IconButton size="small" onClick={onRetour} aria-label="Retour" sx={{ color: couleur }}>
            <ArrowLeftIcon style={{ width: 20 }} />
          </IconButton>
        )}
        <Typography variant="h5" component="h1" fontWeight={700} sx={{ color: couleur }}>
          {titre}
        </Typography>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          1 · Auto-école du candidat
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Le nouveau permis suit le parcours de première délivrance : inscription à une formation d’auto-école, examen,
          puis transfert à la biométrie.
        </Typography>
        {erreur ? (
          <Alert severity="error">{erreur}</Alert>
        ) : (
          <Autocomplete
            options={options}
            value={choix}
            loading={chargementListe}
            onChange={(_, v) => void choisirAutoEcole(v)}
            getOptionLabel={(o) => o.nom_auto_ecole}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText="Aucune auto-école"
            renderInput={(params) => (
              <TextField
                {...params}
                label="Choisir l’auto-école"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {chargementListe ? <CircularProgress size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        )}
      </Paper>

      {chargementAutoEcole && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {autoEcole && (
        <InscriptionFormationForm
          key={autoEcole.id}
          variant="page"
          autoEcole={autoEcole}
          onSuccess={() => {
            toast.success('Inscription enregistrée : dossier NOUVEAU PERMIS créé.');
            reinitialiser();
          }}
          onCancel={reinitialiser}
        />
      )}
    </Container>
  );
};

export default NouveauPermisRosePage;
