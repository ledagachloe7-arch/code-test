import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
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
import { TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  guichetService,
  type CommandeGuichet,
  type Devis,
  type ElementPanier,
  type OperateurGuichet,
} from '../services/guichet.service';

interface Props {
  hPermisId: string;
  panier: ElementPanier[];
  couleur: string;
  onRetirer: (index: number) => void;
  /** Paiement confirmé : le panier est vidé ; reçoit la commande (lignes payées). */
  onPaye: (commande: CommandeGuichet) => void;
  /** Titre du cadre (par défaut « Paiement groupé »). */
  titre?: string;
  /** Faux : pas de bouton de retrait (panier imposé, ex. duplicata). */
  retirable?: boolean;
  /** Commande déjà lancée à reprendre (ex. après rechargement de la page). */
  commandeInitiale?: CommandeGuichet | null;
}

const fcfa = (n: number | string, devise: string) => `${Number(n).toLocaleString('fr-FR')} ${devise}`;

/**
 * Paiement groupé du guichet usager : liste des actions ajoutées, total calculé par le serveur, un seul paiement.
 */
const PaiementGroupe: React.FC<Props> = ({
  hPermisId, panier, couleur, onRetirer, onPaye, titre = 'Paiement groupé', retirable = true, commandeInitiale = null,
}) => {
  const [devis, setDevis] = useState<Devis | null>(null);
  const [erreurDevis, setErreurDevis] = useState<string | null>(null);
  const [calcul, setCalcul] = useState(false);
  const [operateur, setOperateur] = useState<OperateurGuichet>('AIRTEL');
  const [telephone, setTelephone] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [commande, setCommande] = useState<CommandeGuichet | null>(commandeInitiale);
  const [verification, setVerification] = useState(false);

  // Montants recalculés par le serveur à chaque changement du panier.
  useEffect(() => {
    if (panier.length === 0) {
      setDevis(null);
      setErreurDevis(null);
      return;
    }
    let annule = false;
    setCalcul(true);
    guichetService
      .devis(hPermisId, panier)
      .then((d) => { if (!annule) { setDevis(d); setErreurDevis(null); } })
      .catch((e: unknown) => { if (!annule) { setDevis(null); setErreurDevis(e instanceof Error ? e.message : 'Erreur de calcul.'); } })
      .finally(() => { if (!annule) setCalcul(false); });
    return () => { annule = true; };
  }, [hPermisId, panier]);

  const payer = async () => {
    setEnvoi(true);
    try {
      const res = await guichetService.payer(hPermisId, panier, operateur, telephone);
      setCommande(res.data);
      if (res.success) toast.success(res.message, { duration: 8000 });
      else toast.error(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible de lancer le paiement.');
    } finally {
      setEnvoi(false);
    }
  };

  const verifier = async () => {
    if (!commande) return;
    setVerification(true);
    try {
      const res = await guichetService.statut(commande.id);
      setCommande(res.data);
      if (res.data.statut === 'CONFIRME') {
        toast.success(res.message, { duration: 8000 });
        onPaye(res.data);
      } else if (res.data.statut === 'EN_ATTENTE_PAIEMENT') toast(res.message, { icon: '⏳' });
      else toast.error(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible de vérifier le paiement.');
    } finally {
      setVerification(false);
    }
  };

  const nouvellePaiement = () => setCommande(null);

  // ── Commande lancée : suivi du paiement ─────────────────────────────────
  if (commande) {
    const couleurStatut = commande.statut === 'CONFIRME' ? 'success' : commande.statut === 'ECHOUE' ? 'error' : 'warning';
    return (
      <Paper sx={{ p: 2, mb: 3, borderTop: `4px solid ${couleur}` }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="h6">{titre} {commande.numero}</Typography>
          <Chip size="small" color={couleurStatut} label={
            commande.statut === 'CONFIRME' ? 'Payé' : commande.statut === 'ECHOUE' ? 'Échoué' : 'En attente de paiement'
          } />
        </Stack>
        {commande.statut === 'EN_ATTENTE_PAIEMENT' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {commande.operateur === 'AIRTEL'
              ? <>L’usager paie <b>{fcfa(commande.montant, commande.devise)}</b> via Airtel Money avec le code <b>{commande.code_paiement}</b>.</>
              : <>Une demande de paiement de <b>{fcfa(commande.montant, commande.devise)}</b> a été envoyée sur le téléphone Moov de l’usager.</>}
          </Alert>
        )}
        {commande.statut === 'ECHOUE' && <Alert severity="error" sx={{ mb: 2 }}>{commande.motif_echec}</Alert>}
        <Table size="small" sx={{ mb: 2 }}>
          <TableBody>
            {commande.lignes.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.libelle}</TableCell>
                <TableCell align="right">{fcfa(l.montant, commande.devise)}</TableCell>
                <TableCell align="right">
                  <Chip size="small" variant="outlined" color={l.statut === 'PAYE' ? 'success' : l.statut === 'ECHOUE' ? 'error' : 'default'}
                    label={l.statut === 'PAYE' ? 'Validé' : l.statut === 'ECHOUE' ? 'Échoué' : 'En attente'} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {commande.statut === 'EN_ATTENTE_PAIEMENT' && (
            <Button variant="contained" onClick={verifier} disabled={verification}>
              {verification ? <CircularProgress size={20} color="inherit" /> : 'Vérifier le paiement'}
            </Button>
          )}
          {commande.statut !== 'EN_ATTENTE_PAIEMENT' && (
            <Button onClick={nouvellePaiement}>{commande.statut === 'ECHOUE' ? 'Recommencer le paiement' : 'Nouveau paiement'}</Button>
          )}
        </Stack>
      </Paper>
    );
  }

  // ── Panier ──────────────────────────────────────────────────────────────
  return (
    <Paper sx={{ p: 2, mb: 3, borderTop: `4px solid ${couleur}` }}>
      <Typography variant="h6" gutterBottom>
        {titre}
      </Typography>
      {panier.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucune action à payer pour l’instant. Dans chaque onglet, enregistrez l’action (dossier de digitalisation, demande de
          mise à jour) ou cliquez sur « Ajouter au paiement groupé » (renouvellement) : elle s’ajoute ici. L’usager paie
          ensuite tout en une seule fois.
        </Typography>
      ) : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Action</TableCell>
                <TableCell align="right">Montant</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {panier.map((p, i) => {
                const ligne = devis?.lignes.find((l) => l.type === p.type && (l.objet_id ?? undefined) === p.objet_id);
                return (
                  <TableRow key={`${p.type}:${p.objet_id ?? ''}`}>
                    <TableCell>{ligne?.libelle ?? p.libelle}</TableCell>
                    <TableCell align="right">{ligne && devis ? fcfa(ligne.montant, devis.devise) : '—'}</TableCell>
                    <TableCell align="right" sx={{ width: 48 }}>
                      {retirable && (
                        <IconButton size="small" aria-label="Retirer" onClick={() => onRetirer(i)}>
                          <TrashIcon style={{ width: 18 }} />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {calcul ? <CircularProgress size={16} /> : devis ? fcfa(devis.montant_total, devis.devise) : '—'}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>

          {erreurDevis && <Alert severity="error" sx={{ mt: 2 }}>{erreurDevis}</Alert>}

          <Alert severity="info" sx={{ mt: 2 }}>
            {operateur === 'MOOV'
              ? 'Moov Money : saisissez le numéro de l’usager. Il reçoit une notification sur son téléphone avec le montant et valide avec son code secret.'
              : 'Airtel Money : pas de notification sur le téléphone. Un code de paiement est généré ; l’usager paie avec ce code puis vous cliquez sur « Vérifier le paiement ». Pour une notification sur le téléphone, choisissez Moov Money.'}
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mt: 2 }}>
            <TextField select size="small" label="Opérateur" value={operateur} sx={{ minWidth: 160 }}
              onChange={(e) => setOperateur(e.target.value as OperateurGuichet)}>
              <MenuItem value="AIRTEL">Airtel Money</MenuItem>
              <MenuItem value="MOOV">Moov Money</MenuItem>
            </TextField>
            {operateur === 'MOOV' && (
              <TextField size="small" label="Téléphone Moov de l’usager" placeholder="ex. 062 12 34 56" value={telephone}
                inputProps={{ inputMode: 'tel' }} onChange={(e) => setTelephone(e.target.value)} />
            )}
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              size="large"
              disabled={envoi || calcul || !devis || Boolean(erreurDevis) || (operateur === 'MOOV' && !telephone.trim())}
              onClick={payer}
              sx={{ bgcolor: couleur, '&:hover': { bgcolor: couleur, filter: 'brightness(0.9)' } }}
            >
              {envoi ? <CircularProgress size={22} color="inherit" /> : `Payer tout${devis ? ` (${fcfa(devis.montant_total, devis.devise)})` : ''}`}
            </Button>
          </Stack>
        </>
      )}
    </Paper>
  );
};

export default PaiementGroupe;
