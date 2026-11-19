import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { formatDate } from '../../renouvellement/components/RechercheTitulaire';
import { informatisationService, type AncienPermis, type Parametres, type StatutAncienPermis } from '../services/informatisation.service';
import ImportRegistreExcel from '../components/ImportRegistreExcel';

const STATUTS: Record<StatutAncienPermis, { label: string; color: 'default' | 'success' | 'error' }> = {
  A_INFORMATISER: { label: 'À informatiser', color: 'default' },
  INFORMATISE: { label: 'Informatisé', color: 'success' },
  ANOMALIE: { label: 'Anomalie', color: 'error' },
};

/** Affiche un numéro normalisé (19831B00001) au format lisible 1983-1-B-00001. */
const formaterNumero = (n: string) => {
  const m = n.match(/^(\d{4})(\d)([A-Z]\d?)(\d+)$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}-${m[4]}` : n;
};

interface Props {
  titre?: string;
  couleur?: string;
  onRetour?: () => void;
}

/**
 * Informatisation d'un ancien permis rose : recherche par ancien numéro (registre Excel importé),
 * génération par le serveur d'un nouveau numéro unique (même année, même province, par catégorie)
 * et création du permis dans le registre.
 */
const InformatisationPage: React.FC<Props> = ({ titre = 'Informatisation du permis de conduire', couleur, onRetour }) => {
  const [onglet, setOnglet] = useState<'informatiser' | 'import'>('informatiser');
  const [params, setParams] = useState<Parametres | null>(null);

  const [saisie, setSaisie] = useState('');
  const [recherche, setRecherche] = useState(false);
  const [resultats, setResultats] = useState<AncienPermis[] | null>(null);
  const [aConfirmer, setAConfirmer] = useState<AncienPermis | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const chargerParametres = useCallback(async () => {
    try {
      setParams(await informatisationService.parametres());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de chargement.');
    }
  }, []);

  useEffect(() => {
    chargerParametres();
  }, [chargerParametres]);

  const lancerRecherche = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!saisie.trim()) return;
    setRecherche(true);
    try {
      setResultats(await informatisationService.rechercher(saisie.trim()));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'La recherche a échoué.');
    } finally {
      setRecherche(false);
    }
  };

  const informatiser = async () => {
    if (!aConfirmer || envoi) return;
    setEnvoi(true);
    try {
      const res = await informatisationService.informatiser(aConfirmer.id);
      toast.success(res.message, { duration: 8000 });
      setAConfirmer(null);
      await lancerRecherche();
      chargerParametres();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'informatisation a échoué.");
    } finally {
      setEnvoi(false);
    }
  };

  const nbPartages = resultats?.filter((r) => r.ancien_numero_partage).length ?? 0;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {onRetour && (
          <IconButton size="small" onClick={onRetour} aria-label="Retour" sx={{ color: couleur }}>
            <ArrowLeftIcon style={{ width: 20 }} />
          </IconButton>
        )}
        <Typography variant="h5" component="h1" fontWeight={700} sx={{ color: couleur }}>{titre}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        L'ancien numéro (ex. « 01/1983 /123455 WSDFGH » : province 1, année 1983) est remplacé par un nouveau numéro au format
        AAAA-P-C-NNNNN, de la même année et de la même province, unique pour chaque catégorie. L'ancien numéro est conservé.
      </Typography>

      {params && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
          {(Object.keys(STATUTS) as StatutAncienPermis[]).map((s) => (
            <Chip key={s} size="small" color={STATUTS[s].color} variant="outlined" label={`${STATUTS[s].label} : ${params.stats[s] ?? 0}`} />
          ))}
        </Stack>
      )}

      <Tabs value={onglet} onChange={(_, v) => setOnglet(v)} sx={{ mb: 3 }}>
        <Tab value="informatiser" label="Informatiser un permis" />
        {params?.peut_importer && <Tab value="import" label="Importer le registre Excel" />}
      </Tabs>

      {onglet === 'import' && params ? (
        <ImportRegistreExcel lignesParEnvoi={params.lignes_par_envoi} onTermine={chargerParametres} />
      ) : (
        <>
          <Paper component="form" onSubmit={lancerRecherche} sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Rechercher par ancien numéro</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth size="small" label="Ancien numéro de permis" placeholder="01/1983 /123455 WSDFGH"
                value={saisie} onChange={(e) => setSaisie(e.target.value)}
                helperText="Espaces et séparateurs tolérés (01/1983/123455, 1-1983-123455…)" />
              <Box>
                <Button type="submit" variant="contained" disabled={recherche || !saisie.trim()} sx={{ minWidth: 130 }}>
                  {recherche ? <CircularProgress size={20} color="inherit" /> : 'Rechercher'}
                </Button>
              </Box>
            </Stack>
          </Paper>

          {resultats !== null && (
            <Paper sx={{ p: 2 }}>
              {resultats.length === 0 ? (
                <Alert severity="warning">
                  Aucun ancien permis trouvé avec ce numéro dans le registre importé. Vérifiez la saisie ou importez le fichier Excel.
                </Alert>
              ) : (
                <>
                  {nbPartages > 1 && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Cet ancien numéro est porté par <strong>{nbPartages} personnes</strong>. Vérifiez l'identité sur le permis papier :
                      chacune recevra un nouveau numéro différent.
                    </Alert>
                  )}
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Usager</TableCell>
                          <TableCell>Naissance</TableCell>
                          <TableCell>Ancien numéro</TableCell>
                          <TableCell>Année / province</TableCell>
                          <TableCell>Catégorie(s)</TableCell>
                          <TableCell>Nouveau numéro</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {resultats.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell><strong>{r.nom}</strong> {r.prenom}</TableCell>
                            <TableCell>
                              {formatDate(r.date_naissance)}
                              {r.lieu_naissance ? <Typography variant="caption" display="block" color="text.secondary">{r.lieu_naissance}</Typography> : null}
                            </TableCell>
                            <TableCell>{r.ancien_numero}</TableCell>
                            <TableCell>{r.annee ?? '—'} / {r.province_code ?? '—'}{r.province_libelle ? ` (${r.province_libelle})` : ''}</TableCell>
                            <TableCell>{r.categories ?? '—'}</TableCell>
                            <TableCell>
                              {r.statut === 'INFORMATISE' && r.nouveaux_numeros ? (
                                <Stack spacing={0.5}>
                                  {r.nouveaux_numeros.map((n) => (
                                    <Chip key={n.numero} size="small" color="success" label={`${n.categorie} · ${formaterNumero(n.numero)}`} />
                                  ))}
                                </Stack>
                              ) : r.statut === 'ANOMALIE' ? (
                                <Tooltip title={r.anomalies ?? ''}><Chip size="small" color="error" label="Anomalie" /></Tooltip>
                              ) : (
                                <Typography variant="caption" color="text.secondary">{(r.apercu_format ?? []).join(', ')}</Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {r.statut === 'A_INFORMATISER' && params?.peut_informatiser && (
                                <Button size="small" variant="contained" onClick={() => setAConfirmer(r)}>Informatiser</Button>
                              )}
                              {r.statut !== 'A_INFORMATISER' && (
                                <Chip size="small" color={STATUTS[r.statut].color} label={STATUTS[r.statut].label} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </>
              )}
            </Paper>
          )}
        </>
      )}

      <Dialog open={!!aConfirmer} onClose={() => !envoi && setAConfirmer(null)} fullWidth maxWidth="sm">
        <DialogTitle>Informatiser le permis de {aConfirmer?.nom} {aConfirmer?.prenom}</DialogTitle>
        <DialogContent>
          {aConfirmer && (
            <Alert severity="info">
              <AlertTitle>Ancien numéro : {aConfirmer.ancien_numero}</AlertTitle>
              Un nouveau numéro sera attribué pour chaque catégorie ({aConfirmer.categories}) au format{' '}
              <strong>{(aConfirmer.apercu_format ?? []).join(', ')}</strong> — année {aConfirmer.annee}, province{' '}
              {aConfirmer.province_code}{aConfirmer.province_libelle ? ` (${aConfirmer.province_libelle})` : ''}. Le numéro d'ordre
              est le premier disponible ; il ne peut pas être déjà attribué à une autre personne. Le permis sera créé dans le
              registre ; l'ancien numéro est conservé comme numéro d'origine.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAConfirmer(null)} disabled={envoi}>Annuler</Button>
          <Button variant="contained" onClick={informatiser} disabled={envoi}>
            {envoi ? <CircularProgress size={18} color="inherit" /> : 'Générer le nouveau numéro'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InformatisationPage;
