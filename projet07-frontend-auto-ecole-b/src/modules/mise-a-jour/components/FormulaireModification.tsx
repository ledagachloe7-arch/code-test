import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import toast from 'react-hot-toast';
import { formatDate } from '../../renouvellement/components/RechercheTitulaire';
import {
  modificationService,
  type ChampModifiable,
  type FicheTitulaire,
  type ModificationDemande,
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

const VIDE = { nouvelle_valeur: '', ville: '', province: '', pays: '', motif: '' };

interface Props {
  fiche: FicheTitulaire;
  /** Brouillon en cours de modification (sinon nouvelle demande). */
  brouillon: ModificationDemande | null;
  onTermine: () => void;
  onAnnulerBrouillon: () => void;
}

/**
 * Demande de modification : champ, valeur actuelle (lecture seule), nouvelle valeur, motif, justificatif.
 * Aucune modification directe : la demande part en validation.
 */
const FormulaireModification: React.FC<Props> = ({ fiche, brouillon, onTermine, onAnnulerBrouillon }) => {
  const [champ, setChamp] = useState<ChampModifiable>('nom');
  const [valeurs, setValeurs] = useState(VIDE);
  const [justificatif, setJustificatif] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState<'brouillon' | 'soumettre' | null>(null);

  useEffect(() => {
    if (brouillon) {
      setChamp(brouillon.champ);
      setValeurs({
        nouvelle_valeur: brouillon.champ === 'lieu_naissance' ? '' : brouillon.nouvelle_valeur,
        ville: brouillon.details?.ville ?? '',
        province: brouillon.details?.province ?? '',
        pays: brouillon.details?.pays ?? '',
        motif: brouillon.motif ?? '',
      });
    } else {
      setValeurs(VIDE);
    }
    setJustificatif(null);
  }, [brouillon]);

  const t = fiche.titulaire;
  const valeurActuelle: Record<ChampModifiable, string> = {
    nom: t.nom ?? '',
    prenom: t.prenom ?? '',
    date_naissance: formatDate(t.date_naissance),
    lieu_naissance: t.lieu_naissance ?? '',
    nationalite: t.nationalite ?? '',
  };
  const nouvelAge = champ === 'date_naissance' ? ageA(valeurs.nouvelle_valeur) : null;
  const set = (k: keyof typeof VIDE) => (e: React.ChangeEvent<HTMLInputElement>) => setValeurs({ ...valeurs, [k]: e.target.value });

  const envoyer = async (soumettre: boolean) => {
    setEnvoi(soumettre ? 'soumettre' : 'brouillon');
    try {
      const saisie = { champ, ...valeurs, justificatif, soumettre };
      const res = brouillon
        ? await modificationService.modifierBrouillon(brouillon.id, saisie)
        : await modificationService.creer(fiche.h_permis_id, saisie);
      toast.success(res.message);
      setValeurs(VIDE);
      setJustificatif(null);
      onTermine();
    } catch (err: any) {
      toast.error(err.message);
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

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField select fullWidth size="small" label="Champ à modifier" value={champ}
            onChange={(e) => { setChamp(e.target.value as ChampModifiable); setValeurs({ ...VIDE, motif: valeurs.motif }); }}>
            {(Object.keys(fiche.champs) as ChampModifiable[]).map((c) => (
              <MenuItem key={c} value={c}>{fiche.champs[c]}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={8}>
          <TextField fullWidth size="small" label="Valeur actuelle (lecture seule)" value={valeurActuelle[champ] || '—'}
            InputProps={{ readOnly: true }} disabled
            helperText={champ === 'date_naissance' && t.age != null ? `Âge actuel : ${t.age} ans` : ' '} />
        </Grid>

        {champ === 'lieu_naissance' ? (
          <>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" required label="Ville / localité" value={valeurs.ville} onChange={set('ville')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Province / département" value={valeurs.province} onChange={set('province')} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" required label="Pays" value={valeurs.pays} onChange={set('pays')} />
            </Grid>
          </>
        ) : (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth size="small" required
              type={champ === 'date_naissance' ? 'date' : 'text'}
              InputLabelProps={champ === 'date_naissance' ? { shrink: true } : undefined}
              label={champ === 'date_naissance' ? 'Nouvelle date demandée' : `Nouveau ${fiche.champs[champ].toLowerCase()}`}
              value={valeurs.nouvelle_valeur}
              onChange={set('nouvelle_valeur')}
              helperText={champ === 'date_naissance' ? (nouvelAge != null ? `Nouvel âge calculé : ${nouvelAge} ans` : ' ') : ' '}
            />
          </Grid>
        )}

        <Grid item xs={12}>
          <TextField fullWidth size="small" required multiline minRows={2} label="Motif de la demande"
            value={valeurs.motif} onChange={set('motif')} />
        </Grid>
        <Grid item xs={12}>
          <Button variant="outlined" component="label" size="small">
            {justificatif ? 'Changer le justificatif' : 'Joindre le justificatif officiel'}
            <input hidden type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setJustificatif(e.target.files?.[0] ?? null)} />
          </Button>
          <Typography variant="body2" component="span" sx={{ ml: 1.5 }} color="text.secondary">
            {justificatif?.name ?? (brouillon?.a_justificatif ? `Déjà joint : ${brouillon.justificatif_nom}` : 'PDF, JPG ou PNG — 5 Mo max.')}
          </Typography>
        </Grid>
      </Grid>

      {champ === 'date_naissance' && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Modification sensible : validation renforcée requise. Après approbation, l'âge et les règles de validité C/D seront
          recalculés à partir de la nouvelle date.
        </Alert>
      )}

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={() => envoyer(false)} disabled={!!envoi}>
          {envoi === 'brouillon' ? <CircularProgress size={18} /> : 'Enregistrer en brouillon'}
        </Button>
        <Button variant="contained" onClick={() => envoyer(true)} disabled={!!envoi}>
          {envoi === 'soumettre' ? <CircularProgress size={18} color="inherit" /> : 'Soumettre pour validation'}
        </Button>
      </Box>
    </Paper>
  );
};

export default FormulaireModification;
