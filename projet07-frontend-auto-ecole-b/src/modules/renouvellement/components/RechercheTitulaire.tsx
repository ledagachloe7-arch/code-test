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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { renouvellementService, type TitulaireResultat } from '../services/renouvellement.service';
import SaisieNumeroPermis, { PARTS_VIDES } from '../../duplicata/components/SaisieNumeroPermis';
import { buildNumeroPermis } from '../../cnepc/forms/utils';
import type { NumeroPermisParts, PermisFormatType } from '../../cnepc/forms/types';

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

type Mode = 'numero' | 'identite';

/**
 * Recherche du titulaire (commune aux circuits Renouvellement et Mise à jour) :
 * - par numéro de permis (saisie structurée AAAA-P-C-NNNN ou PERM) : le titulaire dont un permis correspond exactement
 *   est sélectionné automatiquement avec toutes ses catégories ; les personnes de même nom restent visibles, non sélectionnées ;
 * - par identité (nom, prénom, date de naissance).
 */
const RechercheTitulaire: React.FC<RechercheTitulaireProps> = ({ onSelect, selectionCle }) => {
  const [mode, setMode] = useState<Mode>('numero');
  const [criteres, setCriteres] = useState({ nom: '', prenom: '', date_naissance: '' });
  const [format, setFormat] = useState<PermisFormatType>('standard');
  const [parts, setParts] = useState<NumeroPermisParts>(PARTS_VIDES);
  const numeroComplet = buildNumeroPermis(parts, format);

  const [resultats, setResultats] = useState<TitulaireResultat[] | null>(null);
  const [cleExacte, setCleExacte] = useState<string | null>(null);
  const [recherche, setRecherche] = useState(false);

  const lancerRecherche = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecherche(true);
    setCleExacte(null);
    try {
      if (mode === 'numero') {
        const { titulaires, exact } = await renouvellementService.rechercherParNumero(numeroComplet);
        setResultats(titulaires);
        if (exact) {
          setCleExacte(exact.cle);
          onSelect(exact);
        } else if (titulaires.length === 1) {
          onSelect(titulaires[0]);
        }
      } else {
        const titulaires = await renouvellementService.rechercherTitulaires(criteres);
        setResultats(titulaires);
        if (titulaires.length === 1) onSelect(titulaires[0]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la recherche.');
    } finally {
      setRecherche(false);
    }
  };

  const effacer = () => {
    setCriteres({ nom: '', prenom: '', date_naissance: '' });
    setParts(PARTS_VIDES);
    setResultats(null);
    setCleExacte(null);
  };

  return (
    <>
      <Paper component="form" onSubmit={lancerRecherche} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recherche du titulaire
        </Typography>
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)} sx={{ mb: 2 }}>
          <ToggleButton value="numero">Par numéro de permis</ToggleButton>
          <ToggleButton value="identite">Par identité</ToggleButton>
        </ToggleButtonGroup>

        {mode === 'numero' ? (
          <SaisieNumeroPermis
            format={format}
            parts={parts}
            onFormatChange={(f) => { setFormat(f); setParts(PARTS_VIDES); }}
            onPartsChange={setParts}
            numeroComplet={numeroComplet}
            disabled={recherche}
          />
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Nom" value={criteres.nom}
                onChange={(e) => setCriteres({ ...criteres, nom: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Prénom" value={criteres.prenom}
                onChange={(e) => setCriteres({ ...criteres, prenom: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" type="date" label="Date de naissance" InputLabelProps={{ shrink: true }}
                value={criteres.date_naissance} onChange={(e) => setCriteres({ ...criteres, date_naissance: e.target.value })} />
            </Grid>
          </Grid>
        )}

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button onClick={effacer} disabled={recherche}>Effacer</Button>
          <Button type="submit" variant="contained" disabled={recherche || (mode === 'numero' && !numeroComplet)}>
            {recherche ? <CircularProgress size={20} color="inherit" /> : 'Rechercher'}
          </Button>
        </Stack>
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
                  <TableCell>
                    {`${t.nom} ${t.prenom ?? ''}`.trim()}
                    {cleExacte === t.cle && <Chip size="small" color="success" label="Numéro exact" sx={{ ml: 1 }} />}
                  </TableCell>
                  <TableCell>{formatDate(t.date_naissance)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {t.categories.map((c) => (
                        <Chip key={c.id} size="small" variant="outlined" label={`${c.categorie ?? '?'} · ${c.numero_permis ?? '—'}`} />
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
          {resultats.length > 1 && (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Plusieurs personnes trouvées : seule la personne sélectionnée est concernée par la demande.
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </>
  );
};

export default RechercheTitulaire;
