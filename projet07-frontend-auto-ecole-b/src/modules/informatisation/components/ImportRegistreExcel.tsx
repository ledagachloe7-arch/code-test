import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Grid,
  LinearProgress,
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
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { informatisationService, type BilanImport, type LigneImport } from '../services/informatisation.service';

type Champ = Exclude<keyof LigneImport, 'ligne_excel' | 'brut'>;

const CHAMPS: { cle: Champ; libelle: string; obligatoire?: boolean; motsCles: RegExp }[] = [
  { cle: 'ancien_numero', libelle: 'Ancien numéro de permis', obligatoire: true, motsCles: /(num|n°|no\b|numero).*(permis)?|permis/i },
  { cle: 'nom', libelle: 'Nom', obligatoire: true, motsCles: /^nom\b|nom$|^name/i },
  { cle: 'prenom', libelle: 'Prénom(s)', motsCles: /pr[ée]nom/i },
  { cle: 'date_naissance', libelle: 'Date de naissance', motsCles: /naiss|birth|n[ée]e? le/i },
  { cle: 'lieu_naissance', libelle: 'Lieu de naissance', motsCles: /lieu.*naiss/i },
  { cle: 'categories', libelle: 'Catégorie(s)', obligatoire: true, motsCles: /cat[ée]g/i },
  { cle: 'date_obtention', libelle: "Date d'obtention", motsCles: /obten|d[ée]livr/i },
  { cle: 'date_validite', libelle: 'Date de validité', motsCles: /valid|expir/i },
];

type Ligne = Record<string, string>;

/** Devine la colonne Excel correspondant à chaque champ d'après les en-têtes. */
const deviner = (entetes: string[]): Partial<Record<Champ, string>> => {
  const pris = new Set<string>();
  const res: Partial<Record<Champ, string>> = {};
  // Ordre : les plus spécifiques d'abord (lieu de naissance avant date de naissance, prénom avant nom).
  for (const cle of ['lieu_naissance', 'date_naissance', 'prenom', 'categories', 'date_obtention', 'date_validite', 'ancien_numero', 'nom'] as Champ[]) {
    const c = CHAMPS.find((x) => x.cle === cle)!;
    const e = entetes.find((h) => !pris.has(h) && c.motsCles.test(h));
    if (e) {
      res[cle] = e;
      pris.add(e);
    }
  }
  return res;
};

interface Props {
  lignesParEnvoi: number;
  onTermine: () => void;
}

/**
 * Import du registre Excel des anciens permis : le fichier est lu dans le navigateur (aucun envoi du fichier brut),
 * l'agent associe les colonnes, vérifie l'aperçu, puis les lignes sont envoyées par lots au serveur qui les contrôle.
 */
const ImportRegistreExcel: React.FC<Props> = ({ lignesParEnvoi, onTermine }) => {
  const [fichier, setFichier] = useState<string>('');
  const [entetes, setEntetes] = useState<string[]>([]);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [colonnes, setColonnes] = useState<Partial<Record<Champ, string>>>({});
  const [progression, setProgression] = useState<number | null>(null);
  const [bilan, setBilan] = useState<BilanImport | null>(null);

  const lireFichier = async (f: File | null) => {
    setBilan(null);
    if (!f) return;
    try {
      const classeur = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
      const feuille = classeur.Sheets[classeur.SheetNames[0]];
      const donnees = XLSX.utils.sheet_to_json<Ligne>(feuille, { raw: false, defval: '', dateNF: 'yyyy-mm-dd' });
      if (donnees.length === 0) {
        toast.error('Le fichier ne contient aucune ligne.');
        return;
      }
      const ent = Object.keys(donnees[0]);
      setFichier(f.name);
      setEntetes(ent);
      setLignes(donnees);
      setColonnes(deviner(ent));
    } catch {
      toast.error('Fichier illisible. Formats acceptés : .xlsx, .xls, .csv.');
    }
  };

  const manquants = CHAMPS.filter((c) => c.obligatoire && !colonnes[c.cle]).map((c) => c.libelle);

  const versLigne = (l: Ligne, index: number): LigneImport => {
    const r: LigneImport = { ligne_excel: index + 2, brut: l }; // +2 : ligne d'en-tête + numérotation à partir de 1
    for (const c of CHAMPS) {
      const col = colonnes[c.cle];
      if (col) r[c.cle] = String(l[col] ?? '').trim();
    }
    return r;
  };

  const importer = async () => {
    setProgression(0);
    let lot: string | null = null;
    const cumul: BilanImport = {
      lot: '', recues: 0, importees: 0, deja_importees: 0, en_anomalie: 0, anomalies: [], anciens_numeros_partages: [],
    };
    try {
      for (let i = 0; i < lignes.length; i += lignesParEnvoi) {
        const paquet = lignes.slice(i, i + lignesParEnvoi).map((l, j) => versLigne(l, i + j));
        const b = await informatisationService.importer(fichier, lot, paquet);
        lot = b.lot;
        cumul.lot = b.lot;
        cumul.recues += b.recues;
        cumul.importees += b.importees;
        cumul.deja_importees += b.deja_importees;
        cumul.en_anomalie += b.en_anomalie;
        cumul.anomalies.push(...b.anomalies);
        cumul.anciens_numeros_partages = b.anciens_numeros_partages;
        setProgression(Math.round(((i + paquet.length) / lignes.length) * 100));
      }
      setBilan(cumul);
      toast.success(`Import terminé : ${cumul.importees} ligne(s) importée(s).`);
      onTermine();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "L'import a échoué.");
      if (cumul.recues > 0) setBilan(cumul);
    } finally {
      setProgression(null);
    }
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>Importer le registre Excel des anciens permis</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Le fichier est lu sur ce poste. Les lignes déjà importées (même ancien numéro, même personne) sont ignorées : le même
        fichier peut être réimporté sans créer de doublons.
      </Typography>

      <Button variant="outlined" component="label" disabled={progression !== null}>
        {fichier ? 'Choisir un autre fichier' : 'Choisir le fichier Excel'}
        <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { lireFichier(e.target.files?.[0] ?? null); e.target.value = ''; }} />
      </Button>
      {fichier && (
        <Typography component="span" variant="body2" sx={{ ml: 1.5 }}>
          {fichier} — <strong>{lignes.length}</strong> ligne(s)
        </Typography>
      )}

      {entetes.length > 0 && (
        <>
          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>Correspondance des colonnes</Typography>
          <Grid container spacing={2}>
            {CHAMPS.map((c) => (
              <Grid item xs={12} sm={6} md={3} key={c.cle}>
                <TextField select fullWidth size="small" label={c.libelle} required={c.obligatoire}
                  value={colonnes[c.cle] ?? ''} onChange={(e) => setColonnes({ ...colonnes, [c.cle]: e.target.value || undefined })}>
                  <MenuItem value=""><em>— Aucune —</em></MenuItem>
                  {entetes.map((h) => <MenuItem key={h} value={h}>{h}</MenuItem>)}
                </TextField>
              </Grid>
            ))}
          </Grid>

          <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>Aperçu (5 premières lignes)</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Ligne</TableCell>
                  {CHAMPS.filter((c) => colonnes[c.cle]).map((c) => <TableCell key={c.cle}>{c.libelle}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {lignes.slice(0, 5).map((l, i) => {
                  const r = versLigne(l, i);
                  return (
                    <TableRow key={i}>
                      <TableCell>{r.ligne_excel}</TableCell>
                      {CHAMPS.filter((c) => colonnes[c.cle]).map((c) => <TableCell key={c.cle}>{r[c.cle] || '—'}</TableCell>)}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>

          {manquants.length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>Colonnes obligatoires à associer : {manquants.join(', ')}.</Alert>
          )}
          {progression !== null && <LinearProgress variant="determinate" value={progression} sx={{ mt: 2 }} />}
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button variant="contained" onClick={importer} disabled={progression !== null || manquants.length > 0}>
              Importer {lignes.length} ligne(s)
            </Button>
          </Stack>
        </>
      )}

      {bilan && (
        <Box sx={{ mt: 3 }}>
          <Alert severity={bilan.en_anomalie > 0 ? 'warning' : 'success'}>
            <AlertTitle>Bilan de l'import (lot {bilan.lot})</AlertTitle>
            {bilan.recues} ligne(s) lue(s) — <strong>{bilan.importees}</strong> importée(s) — {bilan.deja_importees} déjà
            présente(s), ignorée(s) — <strong>{bilan.en_anomalie}</strong> en anomalie (non informatisables tant qu'elles ne sont pas
            corrigées dans le fichier).
          </Alert>
          {bilan.anciens_numeros_partages.length > 0 && (
            <Alert severity="info" sx={{ mt: 1 }}>
              {bilan.anciens_numeros_partages.length} ancien(s) numéro(s) partagé(s) par plusieurs personnes (ex.{' '}
              {bilan.anciens_numeros_partages.slice(0, 3).map((p) => `${p.ancien_numero_normalise} ×${p.nb}`).join(', ')}) : chaque
              personne recevra un nouveau numéro différent.
            </Alert>
          )}
          {bilan.anomalies.length > 0 && (
            <Box sx={{ overflowX: 'auto', mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ligne Excel</TableCell>
                    <TableCell>Ancien numéro</TableCell>
                    <TableCell>Anomalie(s)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bilan.anomalies.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>{a.ligne_excel ?? '—'}</TableCell>
                      <TableCell>{a.ancien_numero || '—'}</TableCell>
                      <TableCell>{a.anomalies.join(' ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default ImportRegistreExcel;
