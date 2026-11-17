import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { renouvellementService, type TitulaireResultat } from '../services/renouvellement.service';

export const formatDate = (d?: string | null) => {
  if (!d) return '—';
  const [y, m, j] = d.slice(0, 10).split('-');
  return j && m && y ? `${j}/${m}/${y}` : d;
};

export const formatDateHeure = (d?: string | null) => (d ? new Date(d).toLocaleString('fr-FR') : '—');

interface RechercheTitulaireProps {
  /** Titulaire sélectionné (une ligne par personne, toutes ses catégories rattachées). */
  onSelect: (titulaire: TitulaireResultat) => void;
  selectionCle?: string | null;
}

/**
 * Recherche du titulaire par numéro de permis, nom, prénom ou date de naissance.
 * Résultats regroupés par titulaire avec ses catégories détenues.
 */
const RechercheTitulaire: React.FC<RechercheTitulaireProps> = ({ onSelect, selectionCle }) => {
  const [criteres, setCriteres] = useState({ numero_permis: '', nom: '', prenom: '', date_naissance: '' });
  const [resultats, setResultats] = useState<TitulaireResultat[] | null>(null);
  const [recherche, setRecherche] = useState(false);

  const lancerRecherche = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecherche(true);
    try {
      const titulaires = await renouvellementService.rechercherTitulaires(criteres);
      setResultats(titulaires);
      if (titulaires.length === 1) onSelect(titulaires[0]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRecherche(false);
    }
  };

  return (
    <>
      <Paper component="form" onSubmit={lancerRecherche} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recherche du titulaire
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth size="small" label="Numéro du permis" value={criteres.numero_permis}
              onChange={(e) => setCriteres({ ...criteres, numero_permis: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth size="small" label="Nom" value={criteres.nom}
              onChange={(e) => setCriteres({ ...criteres, nom: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth size="small" label="Prénom" value={criteres.prenom}
              onChange={(e) => setCriteres({ ...criteres, prenom: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField fullWidth size="small" type="date" label="Date de naissance" InputLabelProps={{ shrink: true }}
              value={criteres.date_naissance} onChange={(e) => setCriteres({ ...criteres, date_naissance: e.target.value })} />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="contained" disabled={recherche}>
            {recherche ? <CircularProgress size={20} /> : 'Rechercher'}
          </Button>
        </Box>
      </Paper>

      {resultats !== null && (
        <Paper sx={{ mb: 3, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nom et prénom</TableCell>
                <TableCell>Date de naissance</TableCell>
                <TableCell>Catégories détenues</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {resultats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">Aucun titulaire trouvé.</TableCell>
                </TableRow>
              )}
              {resultats.map((t) => (
                <TableRow key={t.cle} hover selected={selectionCle === t.cle}>
                  <TableCell>{`${t.nom} ${t.prenom ?? ''}`.trim()}</TableCell>
                  <TableCell>{formatDate(t.date_naissance)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {t.categories.map((c) => (
                        <Chip key={c.id} size="small" label={c.categorie ?? '?'} variant="outlined" />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => onSelect(t)}>Consulter</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </>
  );
};

export default RechercheTitulaire;
