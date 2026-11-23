import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
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
import { formatDateHeure } from '../../renouvellement/components/RechercheTitulaire';
import type { SupportPermis } from '../../renouvellement/services/renouvellement.service';
import { modificationService, type ModificationDemande } from '../services/modification.service';
import { ListeCorrections, ouvrirJustificatif } from './HistoriqueModifications';

interface Props {
  /** Appelé après une décision (pour rafraîchir le compteur / la fiche). */
  onDecision?: () => void;
  /** ROSE = permis rose, VERT = fiche d'enregistrement ; absent = toutes les demandes. */
  support?: SupportPermis;
}

/** Demandes soumises à examiner par un responsable habilité : approuver ou rejeter (motif obligatoire). */
const DemandesAValider: React.FC<Props> = ({ onDecision, support }) => {
  const [demandes, setDemandes] = useState<ModificationDemande[]>([]);
  const [peutValider, setPeutValider] = useState(false);
  const [chargement, setChargement] = useState(true);

  const [decision, setDecision] = useState<{ demande: ModificationDemande; type: 'approuver' | 'rejeter' } | null>(null);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await modificationService.aValider(support);
      setDemandes(res.data);
      setPeutValider(res.peut_valider);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setChargement(false);
    }
  }, [support]);

  useEffect(() => {
    charger();
  }, [charger]);

  const confirmer = async () => {
    if (!decision) return;
    setEnvoi(true);
    try {
      const res = decision.type === 'approuver'
        ? await modificationService.approuver(decision.demande.id, texte.trim() || undefined)
        : await modificationService.rejeter(decision.demande.id, texte.trim());
      toast.success(res.message);
      setDecision(null);
      setTexte('');
      await charger();
      onDecision?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setEnvoi(false);
    }
  };

  if (chargement) return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>;

  return (
    <Paper sx={{ p: 2 }}>
      {!peutValider && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Consultation seule : votre profil n'est pas habilité à approuver ou rejeter les demandes.
        </Alert>
      )}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Demande</TableCell>
              <TableCell>Titulaire</TableCell>
              <TableCell>Corrections demandées</TableCell>
              <TableCell>Motif</TableCell>
              <TableCell>Demandeur</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {demandes.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">Aucune demande en attente de validation.</TableCell></TableRow>
            )}
            {demandes.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  {d.numero}
                  <br />
                  <Typography variant="caption" color="text.secondary">Soumise le {formatDateHeure(d.date_soumission)}</Typography>
                </TableCell>
                <TableCell>
                  {d.nom_titulaire} {d.prenom_titulaire}
                  <br />
                  <Typography variant="caption" color="text.secondary">Permis {d.numero_permis ?? '—'}</Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 260 }}><ListeCorrections lignes={d.lignes} /></TableCell>
                <TableCell sx={{ maxWidth: 220 }}>{d.motif}</TableCell>
                <TableCell>{d.demandeur_email ?? '—'}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {d.a_justificatif && peutValider && (
                      <Button size="small" onClick={() => ouvrirJustificatif(d.id)}>Justificatif</Button>
                    )}
                    <Tooltip title={d.refus_decision ?? ''}>
                      <span>
                        <Button size="small" color="success" variant="contained" disabled={!!d.refus_decision}
                          onClick={() => { setTexte(''); setDecision({ demande: d, type: 'approuver' }); }}>
                          Approuver
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title={d.refus_decision ?? ''}>
                      <span>
                        <Button size="small" color="error" disabled={!!d.refus_decision}
                          onClick={() => { setTexte(''); setDecision({ demande: d, type: 'rejeter' }); }}>
                          Rejeter
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Dialog open={!!decision} onClose={() => !envoi && setDecision(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {decision?.type === 'approuver' ? 'Approuver' : 'Rejeter'} la demande {decision?.demande.numero}
        </DialogTitle>
        <DialogContent>
          {decision && (
            <Box sx={{ mb: 2 }}>
              <ListeCorrections lignes={decision.demande.lignes} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {decision.type === 'approuver'
                  ? 'Toutes ces corrections seront appliquées sur toutes les catégories du titulaire ; les anciennes valeurs restent dans l’historique.'
                  : 'Le dossier ne sera pas modifié.'}
              </Typography>
            </Box>
          )}
          <TextField fullWidth multiline minRows={3} size="small"
            label={decision?.type === 'rejeter' ? 'Motif du rejet (obligatoire)' : 'Commentaire (facultatif)'}
            required={decision?.type === 'rejeter'} value={texte} onChange={(e) => setTexte(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecision(null)} disabled={envoi}>Annuler</Button>
          <Button variant="contained" color={decision?.type === 'approuver' ? 'success' : 'error'} onClick={confirmer}
            disabled={envoi || (decision?.type === 'rejeter' && !texte.trim())}>
            {envoi ? <CircularProgress size={18} color="inherit" /> : decision?.type === 'approuver' ? 'Approuver' : 'Rejeter'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default DemandesAValider;
