import React, { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import {
  renouvellementService,
  type EtatRenouvellement,
  type Operateur,
  type PermisResultat,
  type Renouvellement,
  type StatutRenouvellement,
} from '../services/renouvellement.service';

const formatDate = (d?: string | null) => {
  if (!d) return '—';
  const [y, m, j] = d.slice(0, 10).split('-');
  return j && m && y ? `${j}/${m}/${y}` : d;
};

const formatDateHeure = (d?: string | null) => (d ? new Date(d).toLocaleString('fr-FR') : '—');

const STATUTS: Record<StatutRenouvellement, { label: string; color: 'warning' | 'success' | 'error' | 'default' }> = {
  EN_ATTENTE_PAIEMENT: { label: 'Paiement en attente', color: 'warning' },
  CONFIRME: { label: 'Confirmé', color: 'success' },
  ECHOUE: { label: 'Échoué', color: 'error' },
  ANNULE: { label: 'Annulé', color: 'default' },
};

interface RenouvellementPageProps {
  /** Titre affiché (ex. « Permis rose — Renouvellement »). */
  titre?: string;
  couleur?: string;
  /** Retour au choix du sous-circuit (Circuits permis). */
  onRetour?: () => void;
}

const RenouvellementPage: React.FC<RenouvellementPageProps> = ({ titre = 'Renouvellement de permis', couleur, onRetour }) => {
  const [criteres, setCriteres] = useState({ numero_permis: '', nom: '', prenom: '', date_naissance: '' });
  const [resultats, setResultats] = useState<PermisResultat[] | null>(null);
  const [recherche, setRecherche] = useState(false);

  const [selection, setSelection] = useState<PermisResultat | null>(null);
  const [etat, setEtat] = useState<EtatRenouvellement | null>(null);
  const [historique, setHistorique] = useState<Renouvellement[]>([]);
  const [chargementEtat, setChargementEtat] = useState(false);

  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [operateur, setOperateur] = useState<Operateur>('AIRTEL');
  const [telephone, setTelephone] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [verification, setVerification] = useState(false);

  const lancerRecherche = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecherche(true);
    try {
      setResultats(await renouvellementService.rechercherPermis(criteres));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRecherche(false);
    }
  };

  const chargerEtat = useCallback(async (permis: PermisResultat) => {
    setSelection(permis);
    setChargementEtat(true);
    try {
      const { etat: e, historique: h } = await renouvellementService.etat(permis.id);
      setEtat(e);
      setHistorique(h);
    } catch (err: any) {
      setEtat(null);
      toast.error(err.message);
    } finally {
      setChargementEtat(false);
    }
  }, []);

  const initier = async () => {
    if (!etat) return;
    setEnvoi(true);
    try {
      const res = await renouvellementService.initier(etat.h_permis_id, operateur, telephone || undefined);
      toast.success(res.paiement?.message || res.message);
      setDialogOuvert(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEnvoi(false);
      if (selection) await chargerEtat(selection);
    }
  };

  const verifierPaiement = async (r: Renouvellement) => {
    setVerification(true);
    try {
      const res = await renouvellementService.statut(r.id);
      if (res.data.statut === 'CONFIRME') toast.success(res.message);
      else if (res.data.statut === 'EN_ATTENTE_PAIEMENT') toast(res.message, { icon: '⏳' });
      else toast.error(res.message);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setVerification(false);
      if (selection) await chargerEtat(selection);
    }
  };

  const enAttente = etat?.renouvellement_en_attente ?? null;
  const dernierConfirme = historique.find((h) => h.statut === 'CONFIRME');

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        {onRetour && (
          <IconButton size="small" onClick={onRetour} aria-label="Retour" sx={{ color: couleur }}>
            <ArrowLeftIcon style={{ width: 20 }} />
          </IconButton>
        )}
        <Typography variant="h5" component="h1" fontWeight={700} sx={{ color: couleur }}>
          {titre}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Le renouvellement n'est possible qu'à partir du lendemain de la date d'expiration. Les dates sont calculées par le
        serveur à la confirmation effective du paiement.
      </Typography>

      {/* Recherche du titulaire */}
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
                <TableCell>N° permis</TableCell>
                <TableCell>Nom et prénom</TableCell>
                <TableCell>Date de naissance</TableCell>
                <TableCell>Catégorie</TableCell>
                <TableCell>Expiration</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {resultats.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">Aucun permis trouvé.</TableCell>
                </TableRow>
              )}
              {resultats.map((p) => (
                <TableRow key={p.id} hover selected={selection?.id === p.id}>
                  <TableCell>{p.numero_permis ?? '—'}</TableCell>
                  <TableCell>{`${p.nom} ${p.prenom ?? ''}`.trim()}</TableCell>
                  <TableCell>{formatDate(p.date_naissance)}</TableCell>
                  <TableCell>{p.categorie ?? '—'}</TableCell>
                  <TableCell>{formatDate(p.date_validite)}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => chargerEtat(p)}>Consulter</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Dossier du titulaire */}
      {chargementEtat && <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>}

      {!chargementEtat && etat && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h6">
                {etat.nom} {etat.prenom} — Catégorie {etat.categorie}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Permis n° {etat.numero_permis ?? '—'} · Né(e) le {formatDate(etat.date_naissance)}
              </Typography>
            </Box>
            <Tooltip title={etat.renouvelable ? '' : etat.message}>
              <span>
                <Button variant="contained" color="primary" disabled={!etat.renouvelable} onClick={() => setDialogOuvert(true)}>
                  Renouvellement
                </Button>
              </span>
            </Tooltip>
          </Stack>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Date d'expiration</Typography>
              <Typography variant="body1" fontWeight={600}>{formatDate(etat.date_expiration)}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Renouvellement possible à partir du</Typography>
              <Typography variant="body1" fontWeight={600}>{formatDate(etat.date_ouverture_renouvellement)}</Typography>
            </Grid>
          </Grid>

          <Alert sx={{ mt: 2 }} severity={enAttente ? 'warning' : etat.renouvelable ? 'success' : 'info'}>
            {etat.message}
          </Alert>

          {enAttente && (
            <Alert
              sx={{ mt: 2 }}
              severity="warning"
              action={
                <Button color="inherit" size="small" disabled={verification} onClick={() => verifierPaiement(enAttente)}>
                  {verification ? <CircularProgress size={16} /> : 'Vérifier le paiement'}
                </Button>
              }
            >
              Demande {enAttente.numero} · {enAttente.operateur} · code de paiement <strong>{enAttente.code_paiement}</strong>{' '}
              · {Number(enAttente.montant).toLocaleString('fr-FR')} {etat.devise}
            </Alert>
          )}

          {dernierConfirme && !enAttente && (
            <Alert sx={{ mt: 2 }} severity="success">
              Dernier renouvellement confirmé le {formatDateHeure(dernierConfirme.date_confirmation_paiement)} : délivré le{' '}
              {formatDate(dernierConfirme.nouvelle_date_delivrance)}, valable jusqu'au{' '}
              {formatDate(dernierConfirme.nouvelle_date_expiration)}.
            </Alert>
          )}

          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>Historique des renouvellements</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Demande</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Ancienne expiration</TableCell>
                  <TableCell>Paiement confirmé</TableCell>
                  <TableCell>Nouvelle délivrance</TableCell>
                  <TableCell>Nouvelle expiration</TableCell>
                  <TableCell>Réf. paiement</TableCell>
                  <TableCell>Agent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historique.length === 0 && (
                  <TableRow><TableCell colSpan={8} align="center">Aucun renouvellement.</TableCell></TableRow>
                )}
                {historique.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.numero}<br /><Typography variant="caption" color="text.secondary">{formatDateHeure(h.created_at)}</Typography></TableCell>
                    <TableCell>
                      <Tooltip title={h.motif_echec ?? ''}>
                        <Chip size="small" label={STATUTS[h.statut]?.label ?? h.statut} color={STATUTS[h.statut]?.color ?? 'default'} />
                      </Tooltip>
                    </TableCell>
                    <TableCell>{formatDate(h.ancienne_date_expiration)}</TableCell>
                    <TableCell>{formatDateHeure(h.date_confirmation_paiement)}</TableCell>
                    <TableCell>{formatDate(h.nouvelle_date_delivrance)}</TableCell>
                    <TableCell>{formatDate(h.nouvelle_date_expiration)}</TableCell>
                    <TableCell>{h.reference_paiement ?? '—'}</TableCell>
                    <TableCell>{h.agent_email ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Initiation du paiement */}
      <Dialog open={dialogOuvert} onClose={() => !envoi && setDialogOuvert(false)} fullWidth maxWidth="xs">
        <DialogTitle>Renouveler la catégorie {etat?.categorie}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Montant : <strong>{etat ? Number(etat.montant).toLocaleString('fr-FR') : '—'} {etat?.devise}</strong>. Le
            renouvellement ne sera finalisé qu'après confirmation effective du paiement.
          </Typography>
          <FormControl>
            <FormLabel>Opérateur</FormLabel>
            <RadioGroup row value={operateur} onChange={(e) => setOperateur(e.target.value as Operateur)}>
              <FormControlLabel value="AIRTEL" control={<Radio />} label="Airtel Money" />
              <FormControlLabel value="MOOV" control={<Radio />} label="Moov Money" />
            </RadioGroup>
          </FormControl>
          <TextField fullWidth size="small" sx={{ mt: 2 }} label="Téléphone du payeur" value={telephone}
            required={operateur === 'MOOV'} helperText={operateur === 'MOOV' ? 'Obligatoire pour Moov' : 'Facultatif'}
            onChange={(e) => setTelephone(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOuvert(false)} disabled={envoi}>Annuler</Button>
          <Button variant="contained" onClick={initier} disabled={envoi || (operateur === 'MOOV' && !telephone.trim())}>
            {envoi ? <CircularProgress size={20} /> : 'Lancer le paiement'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RenouvellementPage;
