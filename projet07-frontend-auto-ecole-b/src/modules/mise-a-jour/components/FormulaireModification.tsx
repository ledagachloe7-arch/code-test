import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { formatDate } from '../../renouvellement/components/RechercheTitulaire';
import {
  modificationService,
  type ChampModifiable,
  type FicheTitulaire,
  type ModificationDemande,
  type SaisieLigne,
} from '../services/modification.service';

const ageA = (dateNaissance?: string | null): number | null => {
  if (!dateNaissance) return null;
  const n = new Date(dateNaissance);
  if (Number.isNaN(n.getTime())) return null;
  const a = new Date();
  let age = a.getFullYear() - n.getFullYear();
  if (a.getMonth() < n.getMonth() || (a.getMonth() === n.getMonth() && a.getDate() < n.getDate())) age--;
  return age;
};

type Ligne = Required<SaisieLigne> & { cle: number };

let compteur = 0;
const nouvelleLigne = (champ: ChampModifiable): Ligne => ({
  cle: ++compteur, champ, nouvelle_valeur: '', ville: '', province: '', pays: '',
});

interface Props {
  fiche: FicheTitulaire;
  /** Brouillon en cours de modification (sinon nouvelle demande). */
  brouillon: ModificationDemande | null;
  onTermine: () => void;
  onAnnulerBrouillon: () => void;
}

/**
 * Demande de modification : un ou plusieurs champs (valeur actuelle en lecture seule → nouvelle valeur),
 * un motif et un justificatif communs. Aucune modification directe : la demande part en validation.
 */
const FormulaireModification: React.FC<Props> = ({ fiche, brouillon, onTermine, onAnnulerBrouillon }) => {
  const champsDisponibles = Object.keys(fiche.champs) as ChampModifiable[];
  const [lignes, setLignes] = useState<Ligne[]>([nouvelleLigne('nom')]);
  const [motif, setMotif] = useState('');
  const [justificatif, setJustificatif] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState<'brouillon' | 'soumettre' | null>(null);

  const reinitialiser = () => {
    setLignes([nouvelleLigne('nom')]);
    setMotif('');
    setJustificatif(null);
  };

  useEffect(() => {
    if (brouillon) {
      setLignes(brouillon.lignes.map((l) => ({
        cle: ++compteur,
        champ: l.champ,
        nouvelle_valeur: l.champ === 'lieu_naissance' ? '' : l.nouvelle_valeur,
        ville: l.details?.ville ?? '',
        province: l.details?.province ?? '',
        pays: l.details?.pays ?? '',
      })));
      setMotif(brouillon.motif ?? '');
      setJustificatif(null);
    } else {
      reinitialiser();
    }
  }, [brouillon]);

  const t = fiche.titulaire;
  const valeurActuelle: Record<ChampModifiable, string> = {
    nom: t.nom ?? '',
    prenom: t.prenom ?? '',
    date_naissance: formatDate(t.date_naissance),
    lieu_naissance: t.lieu_naissance ?? '',
    nationalite: t.nationalite ?? '',
  };

  const champsUtilises = new Set(lignes.map((l) => l.champ));
  const champsRestants = champsDisponibles.filter((c) => !champsUtilises.has(c));
  const contientDateNaissance = champsUtilises.has('date_naissance');

  const majLigne = (cle: number, patch: Partial<Ligne>) =>
    setLignes((ls) => ls.map((l) => (l.cle === cle ? { ...l, ...patch } : l)));

  const changerChamp = (cle: number, champ: ChampModifiable) =>
    majLigne(cle, { champ, nouvelle_valeur: '', ville: '', province: '', pays: '' });

  const ajouterLigne = () => {
    if (champsRestants.length > 0) setLignes((ls) => [...ls, nouvelleLigne(champsRestants[0])]);
  };

  const supprimerLigne = (cle: number) => setLignes((ls) => (ls.length > 1 ? ls.filter((l) => l.cle !== cle) : ls));

  const envoyer = async (soumettre: boolean) => {
    setEnvoi(soumettre ? 'soumettre' : 'brouillon');
    try {
      const saisie = {
        lignes: lignes.map((l) => ({
          champ: l.champ, nouvelle_valeur: l.nouvelle_valeur, ville: l.ville, province: l.province, pays: l.pays,
        })),
        motif,
        justificatif,
        soumettre,
      };
      const res = brouillon
        ? await modificationService.modifierBrouillon(brouillon.id, saisie)
        : await modificationService.creer(fiche.h_permis_id, saisie);
      toast.success(res.message);
      reinitialiser();
      onTermine();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'enregistrer la demande.");
    } finally {
      setEnvoi(null);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">
          {brouillon ? `Modifier le brouillon ${brouillon.numero}` : 'Nouvelle demande de modification'}
        </Typography>
        {brouillon && <Button size="small" onClick={onAnnulerBrouillon}>Nouvelle demande</Button>}
      </Stack>

      {lignes.map((l, i) => {
        const nouvelAge = l.champ === 'date_naissance' ? ageA(l.nouvelle_valeur) : null;
        const set = (k: keyof SaisieLigne) => (e: React.ChangeEvent<HTMLInputElement>) => majLigne(l.cle, { [k]: e.target.value });
        return (
          <Box key={l.cle}>
            {i > 0 && <Divider sx={{ my: 2 }} />}
            <Grid container spacing={2} alignItems="flex-start">
              <Grid item xs={12} md={4}>
                <TextField select fullWidth size="small" label={`Champ à modifier ${lignes.length > 1 ? i + 1 : ''}`.trim()}
                  value={l.champ} onChange={(e) => changerChamp(l.cle, e.target.value as ChampModifiable)}>
                  {champsDisponibles
                    .filter((c) => c === l.champ || !champsUtilises.has(c))
                    .map((c) => <MenuItem key={c} value={c}>{fiche.champs[c]}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={lignes.length > 1 ? 10 : 12} md={lignes.length > 1 ? 7 : 8}>
                <TextField fullWidth size="small" label="Valeur actuelle (lecture seule)" value={valeurActuelle[l.champ] || '—'}
                  InputProps={{ readOnly: true }} disabled
                  helperText={l.champ === 'date_naissance' && t.age != null ? `Âge actuel : ${t.age} ans` : ' '} />
              </Grid>
              {lignes.length > 1 && (
                <Grid item xs={2} md={1} sx={{ textAlign: 'right' }}>
                  <Tooltip title="Retirer ce champ">
                    <IconButton color="error" onClick={() => supprimerLigne(l.cle)} aria-label="Retirer ce champ">
                      <TrashIcon style={{ width: 18 }} />
                    </IconButton>
                  </Tooltip>
                </Grid>
              )}

              {l.champ === 'lieu_naissance' ? (
                <>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth size="small" required label="Ville / localité" value={l.ville} onChange={set('ville')} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth size="small" label="Province / département" value={l.province} onChange={set('province')} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField fullWidth size="small" required label="Pays" value={l.pays} onChange={set('pays')} />
                  </Grid>
                </>
              ) : (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth size="small" required
                    type={l.champ === 'date_naissance' ? 'date' : 'text'}
                    InputLabelProps={l.champ === 'date_naissance' ? { shrink: true } : undefined}
                    label={l.champ === 'date_naissance' ? 'Nouvelle date demandée' : `Nouveau ${fiche.champs[l.champ].toLowerCase()}`}
                    value={l.nouvelle_valeur}
                    onChange={set('nouvelle_valeur')}
                    helperText={l.champ === 'date_naissance' ? (nouvelAge != null ? `Nouvel âge calculé : ${nouvelAge} ans` : ' ') : ' '}
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        );
      })}

      <Box sx={{ mt: 1 }}>
        <Button size="small" startIcon={<PlusIcon style={{ width: 16 }} />} onClick={ajouterLigne} disabled={champsRestants.length === 0}>
          Ajouter un autre champ à corriger
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField fullWidth size="small" required multiline minRows={2} label="Motif de la demande"
            helperText="Commun à tous les champs de la demande." value={motif} onChange={(e) => setMotif(e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <Button variant="outlined" component="label" size="small">
            {justificatif ? 'Changer le justificatif' : 'Joindre le justificatif officiel'}
            <input hidden type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setJustificatif(e.target.files?.[0] ?? null)} />
          </Button>
          <Typography variant="body2" component="span" sx={{ ml: 1.5 }} color="text.secondary">
            {justificatif?.name ?? (brouillon?.a_justificatif ? `Déjà joint : ${brouillon.justificatif_nom}` : 'PDF, JPG ou PNG — 5 Mo max. Un seul document couvrant toutes les corrections.')}
          </Typography>
        </Grid>
      </Grid>

      {contientDateNaissance && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          La demande modifie la date de naissance : validation renforcée requise pour toute la demande. Après approbation, l'âge et
          les règles de validité C/D seront recalculés à partir de la nouvelle date.
        </Alert>
      )}

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={() => envoyer(false)} disabled={!!envoi}>
          {envoi === 'brouillon' ? <CircularProgress size={18} /> : 'Enregistrer en brouillon'}
        </Button>
        <Button variant="contained" onClick={() => envoyer(true)} disabled={!!envoi}>
          {envoi === 'soumettre' ? <CircularProgress size={18} color="inherit" /> : `Soumettre pour validation${lignes.length > 1 ? ` (${lignes.length} champs)` : ''}`}
        </Button>
      </Box>
    </Paper>
  );
};

export default FormulaireModification;
