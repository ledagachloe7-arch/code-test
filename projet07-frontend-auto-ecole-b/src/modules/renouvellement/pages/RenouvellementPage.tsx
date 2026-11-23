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
  type Renouvellement,
  type StatutRenouvellement,
  type SupportPermis,
  type TitulaireResultat,
} from '../services/renouvellement.service';
import RechercheTitulaire, { formatDate, formatDateHeure } from '../components/RechercheTitulaire';

const formatMontant = (n: number | string, devise: string) => `${Number(n).toLocaleString('fr-FR')} ${devise}`;

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
  /** ROSE = permis rose, VERT = fiche d'enregistrement : limite la recherche à ce support. */
  support?: SupportPermis;
}

const RenouvellementPage: React.FC<RenouvellementPageProps> = ({ titre = 'Renouvellement de permis', couleur, onRetour, support }) => {
  const [selection, setSelection] = useState<TitulaireResultat | null>(null);
  const [etat, setEtat] = useState<EtatRenouvellement | null>(null);
  const [historique, setHistorique] = useState<Renouvellement[]>([]);
  const [chargementEtat, setChargementEtat] = useState(false);

  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [operateur, setOperateur] = useState<Operateur>('AIRTEL');
  const [telephone, setTelephone] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [verification, setVerification] = useState(false);

  const chargerEtat = useCallback(async (titulaire: TitulaireResultat) => {
    setSelection(titulaire);
    setChargementEtat(true);
    try {
      const { etat: e, historique: h } = await renouvellementService.etat(titulaire.hPermisId);
      setEtat(e);
      setHistorique(h);
    } catch (err) {
      setEtat(null);
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setChargementEtat(false);
    }
  }, []);

  const initier = async () => {
    if (!selection) return;
    setEnvoi(true);
    try {
      const res = await renouvellementService.initier(selection.hPermisId, operateur, telephone || undefined);
      toast.success(res.paiement?.message || res.message);
      setDialogOuvert(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setEnvoi(false);
      await chargerEtat(selection);
    }
  };

  const verifierPaiement = async (r: Renouvellement) => {
    setVerification(true);
    try {
      const res = await renouvellementService.statut(r.id);
      if (res.data.statut === 'CONFIRME') toast.success(res.message, { duration: 6000 });
      else if (res.data.statut === 'EN_ATTENTE_PAIEMENT') toast(res.message, { icon: '⏳' });
      else toast.error(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setVerification(false);
      if (selection) await chargerEtat(selection);
    }
  };

  const enAttente = etat?.renouvellement_en_attente ?? null;
  const categoriesEnAttente = new Set(enAttente?.categories.map((c) => c.categorie) ?? []);
  const dernierConfirme = historique.find((h) => h.statut === 'CONFIRME');
  const nbARenouveler = etat?.categories_a_renouveler.length ?? 0;

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
        Toutes les catégories du titulaire sont rattachées à sa fiche. Un seul paiement renouvelle toutes les catégories
        expirées (à partir du lendemain de leur expiration). Les dates sont calculées par le serveur à la confirmation du paiement.
      </Typography>

      <RechercheTitulaire onSelect={chargerEtat} selectionCle={selection?.cle} support={support} />

      {chargementEtat && <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress /></Box>}

      {/* Fiche du titulaire avec toutes ses catégories */}
      {!chargementEtat && etat && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h6">
                {etat.titulaire.nom} {etat.titulaire.prenom}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Né(e) le {formatDate(etat.titulaire.date_naissance)}
                {etat.titulaire.lieu_naissance ? ` à ${etat.titulaire.lieu_naissance}` : ''}
                {etat.titulaire.nationalite ? ` · ${etat.titulaire.nationalite}` : ''}
                {etat.titulaire.numero_identite ? ` · Pièce d'identité ${etat.titulaire.numero_identite}` : ''}
              </Typography>
            </Box>
            <Tooltip title={etat.renouvelable ? '' : etat.message}>
              <span>
                <Button variant="contained" disabled={!etat.renouvelable} onClick={() => setDialogOuvert(true)}>
                  {nbARenouveler > 0 ? `Renouvellement (${nbARenouveler} catégorie${nbARenouveler > 1 ? 's' : ''})` : 'Renouvellement'}
                </Button>
              </span>
            </Tooltip>
          </Stack>

          <Box sx={{ overflowX: 'auto', mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Catégorie</TableCell>
                  <TableCell>N° permis</TableCell>
                  <TableCell>Date d'expiration</TableCell>
                  <TableCell>Renouvellement possible à partir du</TableCell>
                  <TableCell>État</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {etat.categories.map((c) => (
                  <TableRow key={c.h_permis_id} sx={!c.renouvelable ? { '& td': { color: 'text.disabled' } } : undefined}>
                    <TableCell><strong>{c.categorie}</strong></TableCell>
                    <TableCell>{c.numero_permis ?? '—'}</TableCell>
                    <TableCell>{formatDate(c.date_expiration)}</TableCell>
                    <TableCell>{formatDate(c.date_ouverture_renouvellement)}</TableCell>
                    <TableCell>
                      {categoriesEnAttente.has(c.categorie) ? (
                        <Chip size="small" color="warning" label="Paiement en attente" />
                      ) : c.renouvelable ? (
                        <Chip size="small" color="error" label="Expirée — à renouveler" />
                      ) : (
                        <Tooltip title={c.message}><Chip size="small" label="Valide" /></Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

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
              Demande {enAttente.numero} · catégories {enAttente.categories.map((c) => c.categorie).join(', ')} · {enAttente.operateur} · code
              de paiement <strong>{enAttente.code_paiement}</strong> · {formatMontant(enAttente.montant, etat.devise)}
            </Alert>
          )}

          {dernierConfirme && !enAttente && (
            <Alert sx={{ mt: 2 }} severity="success">
              Dernier renouvellement confirmé le {formatDateHeure(dernierConfirme.date_confirmation_paiement)} (délivrance le{' '}
              {formatDate(dernierConfirme.nouvelle_date_delivrance)}) :{' '}
              {dernierConfirme.categories.map((c) => `${c.categorie} jusqu'au ${formatDate(c.nouvelle_date_expiration)}`).join(', ')}.
            </Alert>
          )}

          {/* Historique : une ligne par catégorie renouvelée */}
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>Historique des renouvellements</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Demande</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Catégorie</TableCell>
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
                  <TableRow><TableCell colSpan={9} align="center">Aucun renouvellement.</TableCell></TableRow>
                )}
                {historique.flatMap((h) =>
                  h.categories.map((c, i) => (
                    <TableRow key={c.id}>
                      {i === 0 && (
                        <>
                          <TableCell rowSpan={h.categories.length}>
                            {h.numero}
                            <br />
                            <Typography variant="caption" color="text.secondary">{formatDateHeure(h.created_at)}</Typography>
                          </TableCell>
                          <TableCell rowSpan={h.categories.length}>
                            <Tooltip title={h.motif_echec ?? ''}>
                              <Chip size="small" label={STATUTS[h.statut]?.label ?? h.statut} color={STATUTS[h.statut]?.color ?? 'default'} />
                            </Tooltip>
                          </TableCell>
                        </>
                      )}
                      <TableCell><strong>{c.categorie}</strong></TableCell>
                      <TableCell>{formatDate(c.ancienne_date_expiration)}</TableCell>
                      {i === 0 && <TableCell rowSpan={h.categories.length}>{formatDateHeure(h.date_confirmation_paiement)}</TableCell>}
                      <TableCell>{formatDate(c.nouvelle_date_delivrance)}</TableCell>
                      <TableCell>
                        {formatDate(c.nouvelle_date_expiration)}
                        {c.duree_validite_annees ? ` (${c.duree_validite_annees} an${c.duree_validite_annees > 1 ? 's' : ''})` : ''}
                      </TableCell>
                      {i === 0 && (
                        <>
                          <TableCell rowSpan={h.categories.length}>{h.reference_paiement ?? '—'}</TableCell>
                          <TableCell rowSpan={h.categories.length}>{h.agent_email ?? '—'}</TableCell>
                        </>
                      )}
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Initiation du paiement */}
      <Dialog open={dialogOuvert} onClose={() => !envoi && setDialogOuvert(false)} fullWidth maxWidth="xs">
        <DialogTitle>Renouveler les catégories {etat?.categories_a_renouveler.join(', ')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {nbARenouveler} catégorie{nbARenouveler > 1 ? 's' : ''} ×{' '}
            {etat ? formatMontant(etat.montant_par_categorie, etat.devise) : '—'} ={' '}
            <strong>{etat ? formatMontant(etat.montant_total, etat.devise) : '—'}</strong>. Le renouvellement ne sera finalisé
            qu'après confirmation effective du paiement.
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
