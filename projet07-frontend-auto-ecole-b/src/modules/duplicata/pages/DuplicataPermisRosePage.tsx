import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Radio,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../../renouvellement/components/RechercheTitulaire';
import {
  duplicataService,
  estPermisRose,
  MESSAGES_SHORTCODE,
  MOTIFS_DUPLICATA,
  OBSERVATIONS_MAX,
  PRECISION_MAX,
  shortcodeAutoriseSoumission,
  TYPE_DEMANDE_DUPLICATA_ROSE,
  type CriteresRecherchePermis,
  type DuplicataCree,
  type ResultatShortcode,
  type ModeRecherche,
  type MotifDuplicata,
  type PermisSource,
} from '../services/duplicata.service';
import toast from 'react-hot-toast';

interface Props {
  titre?: string;
  couleur?: string;
  onRetour?: () => void;
}

const Bloc: React.FC<{ lettre: string; titre: string; actif?: boolean; children: React.ReactNode }> = ({ lettre, titre, actif = true, children }) => (
  <Paper sx={{ p: 2, mb: 2, opacity: actif ? 1 : 0.5 }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
      <Chip size="small" label={lettre} color={actif ? 'primary' : 'default'} />
      <Typography variant="h6">{titre}</Typography>
    </Stack>
    {children}
  </Paper>
);

const Champ: React.FC<{ label: string; valeur?: React.ReactNode }> = ({ label, valeur }) =>
  valeur === undefined || valeur === null || valeur === '' ? null : (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{valeur}</Typography>
    </Grid>
  );

const TAILLE_MAX_JUSTIFICATIF = 5 * 1024 * 1024;

/**
 * Duplicata du permis de conduire rose (cadrage v1.0 du 17/11/2026).
 * Parcours : recherche du permis source → fiche lecture seule → contrôle shortcode (serveur) → motif → récapitulatif → création.
 * Tous les contrôles sont refaits par le serveur à la création ; ceux de cette page ne sont qu'une aide à la saisie.
 * Le permis source n'est jamais modifié depuis ce parcours.
 */
const DuplicataPermisRosePage: React.FC<Props> = ({ titre = 'Duplicata du permis rose', couleur, onRetour }) => {
  // B — Recherche
  const [mode, setMode] = useState<ModeRecherche>('numero');
  const [criteres, setCriteres] = useState<CriteresRecherchePermis>({ numero_permis: '', nom: '', prenom: '', date_naissance: '' });
  const [recherche, setRecherche] = useState(false);
  const [erreurRecherche, setErreurRecherche] = useState<string | null>(null);

  // C — Résultats / D — Fiche source
  const [resultats, setResultats] = useState<PermisSource[] | null>(null);
  const [selection, setSelection] = useState<PermisSource | null>(null);
  const [confirme, setConfirme] = useState(false);

  // E — Shortcode
  const [controle, setControle] = useState<ResultatShortcode | null>(null);
  const shortcode = controle?.statut ?? null;
  const [verification, setVerification] = useState(false);

  // F — Motif et pièces
  const [motif, setMotif] = useState<MotifDuplicata | ''>('');
  const [precision, setPrecision] = useState('');
  const [observations, setObservations] = useState('');
  const [justificatif, setJustificatif] = useState<File | null>(null);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);

  // G — Soumission
  const [envoi, setEnvoi] = useState(false);
  const [cree, setCree] = useState<DuplicataCree | null>(null);

  const reinitialiserApresPermis = () => {
    setConfirme(false);
    setControle(null);
  };

  const lancerRecherche = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setRecherche(true);
    setErreurRecherche(null);
    setSelection(null);
    reinitialiserApresPermis();
    try {
      const r = await duplicataService.rechercherPermis(mode, criteres);
      setResultats(r);
      // Une seule correspondance (rose) : affichée directement, confirmation demandée.
      const roses = r.filter(estPermisRose);
      if (r.length === 1 && roses.length === 1) setSelection(roses[0]);
    } catch (err) {
      // Erreur technique : les critères saisis sont conservés.
      setResultats(null);
      setErreurRecherche(err instanceof Error ? err.message : 'La recherche a échoué.');
    } finally {
      setRecherche(false);
    }
  };

  const effacer = () => {
    setCriteres({ numero_permis: '', nom: '', prenom: '', date_naissance: '' });
    setResultats(null);
    setErreurRecherche(null);
    setSelection(null);
    reinitialiserApresPermis();
  };

  const choisir = (p: PermisSource) => {
    if (!estPermisRose(p)) return;
    setSelection(p);
    reinitialiserApresPermis();
  };

  const confirmerPermis = async () => {
    if (!selection) return;
    setConfirme(true);
    await verifierShortcode(selection);
  };

  const verifierShortcode = async (p: PermisSource) => {
    setVerification(true);
    try {
      // Le service ne lève pas d'erreur : indisponibilité = NON_VERIFIE (jamais considéré comme réussi).
      setControle(await duplicataService.verifierShortcode(p));
    } finally {
      setVerification(false);
    }
  };

  const changerFichier = (f: File | null) => {
    setErreurFichier(null);
    if (!f) return setJustificatif(null);
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) return setErreurFichier('Formats acceptés : PDF, JPG, PNG.');
    if (f.size > TAILLE_MAX_JUSTIFICATIF) return setErreurFichier('Fichier trop volumineux (5 Mo maximum).');
    setJustificatif(f);
  };

  // Conditions de soumission (cadrage §6) — rappel : un contrôle React n'est jamais une garantie de sécurité.
  const blocages: string[] = [];
  if (!selection || !confirme) blocages.push('Le permis source doit être sélectionné et confirmé.');
  if (!shortcode || !shortcodeAutoriseSoumission(shortcode)) blocages.push('Le contrôle du shortcode par le serveur doit être positif.');
  if (!motif) blocages.push('Le motif est obligatoire.');
  if (motif === 'AUTRE' && !precision.trim()) blocages.push('La précision du motif est obligatoire pour « Autre ».');

  const soumettre = async () => {
    if (envoi || blocages.length > 0 || !selection || !motif) return;
    setEnvoi(true);
    try {
      const res = await duplicataService.soumettre({ permisId: selection.id, motif, precision, observations, justificatif });
      setCree(res);
      toast.success(res.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'La demande n’a pas pu être créée.');
      // Le serveur a peut-être changé d'avis sur le shortcode : on rafraîchit le contrôle.
      await verifierShortcode(selection);
    } finally {
      setEnvoi(false);
    }
  };

  const nouvelleDemande = () => {
    effacer();
    setMotif('');
    setPrecision('');
    setObservations('');
    setJustificatif(null);
    setCree(null);
  };

  const libelleMotif = MOTIFS_DUPLICATA.find((m) => m.valeur === motif)?.libelle;
  const msgShortcode = shortcode ? MESSAGES_SHORTCODE[shortcode] : null;

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

      {cree && (
        <Alert severity="success" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={nouvelleDemande}>Nouvelle demande</Button>}>
          <AlertTitle>Demande de duplicata créée</AlertTitle>
          Dossier <strong>{cree.numero_dossier}</strong> — statut « {cree.statut_dossier} » — lié au permis source n°{' '}
          {cree.numero_permis_source}. Le permis source n'a pas été modifié.
        </Alert>
      )}

      {/* A — Type */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip label={`Type de demande : ${TYPE_DEMANDE_DUPLICATA_ROSE}`} sx={{ bgcolor: couleur, color: '#fff', fontWeight: 600 }} />
        <Typography variant="body2" color="text.secondary">
          Nouvelle demande liée à un permis rose déjà délivré — ni nouvelle délivrance, ni renouvellement.
        </Typography>
      </Stack>

      {/* B — Recherche */}
      <Bloc lettre="B" titre="Rechercher le permis source">
        <Box component="form" onSubmit={lancerRecherche}>
          <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)} sx={{ mb: 2 }}>
            <ToggleButton value="numero">Par numéro de permis</ToggleButton>
            <ToggleButton value="identite">Par identité</ToggleButton>
          </ToggleButtonGroup>
          <Grid container spacing={2}>
            {mode === 'numero' ? (
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="Numéro du permis" value={criteres.numero_permis}
                  onChange={(e) => setCriteres({ ...criteres, numero_permis: e.target.value })} />
              </Grid>
            ) : (
              <>
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
              </>
            )}
          </Grid>
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button onClick={effacer} disabled={recherche}>Effacer</Button>
            <Button type="submit" variant="contained" disabled={recherche}>
              {recherche ? <CircularProgress size={20} color="inherit" /> : 'Rechercher'}
            </Button>
          </Stack>
        </Box>
        {erreurRecherche && (
          <Alert severity="error" sx={{ mt: 2 }} action={<Button color="inherit" size="small" onClick={() => lancerRecherche()}>Relancer</Button>}>
            {erreurRecherche}
          </Alert>
        )}
      </Bloc>

      {/* C — Résultats */}
      {resultats !== null && (
        <Bloc lettre="C" titre="Résultats">
          {resultats.length === 0 ? (
            <Alert severity="warning">
              Aucun permis correspondant trouvé. Un duplicata ne peut pas être créé sans permis source.
            </Alert>
          ) : (
            <>
              {resultats.length > 1 && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {resultats.length} correspondances : sélectionnez un seul permis rose.
                </Typography>
              )}
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" />
                      <TableCell>N° permis</TableCell>
                      <TableCell>Titulaire</TableCell>
                      <TableCell>Date de naissance</TableCell>
                      <TableCell>Catégorie</TableCell>
                      <TableCell>Validité</TableCell>
                      <TableCell>Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultats.map((p) => {
                      const rose = estPermisRose(p);
                      return (
                        <Tooltip key={p.id} title={rose ? '' : "Fiche d'enregistrement (permis vert) : non éligible au duplicata rose."}>
                          <TableRow hover={rose} selected={selection?.id === p.id} onClick={() => choisir(p)}
                            sx={{ cursor: rose ? 'pointer' : 'not-allowed', '& td': rose ? {} : { color: 'text.disabled' } }}>
                            <TableCell padding="checkbox"><Radio size="small" checked={selection?.id === p.id} disabled={!rose} /></TableCell>
                            <TableCell>{p.numero_permis ?? '—'}</TableCell>
                            <TableCell>{`${p.nom} ${p.prenom ?? ''}`.trim()}</TableCell>
                            <TableCell>{formatDate(p.date_naissance)}</TableCell>
                            <TableCell>{p.categorie ?? '—'}</TableCell>
                            <TableCell>{formatDate(p.date_validite)}</TableCell>
                            <TableCell>{rose ? 'Permis rose' : 'Fiche verte'}</TableCell>
                          </TableRow>
                        </Tooltip>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}
        </Bloc>
      )}

      {/* D — Fiche source (lecture seule) */}
      {selection && (
        <Bloc lettre="D" titre="Permis source (lecture seule)">
          <Grid container spacing={2}>
            <Champ label="Numéro du permis source" valeur={selection.numero_permis} />
            <Champ label="Nom et prénom(s)" valeur={`${selection.nom} ${selection.prenom ?? ''}`.trim()} />
            <Champ label="Date de naissance" valeur={selection.date_naissance ? formatDate(selection.date_naissance) : null} />
            <Champ label="Lieu de naissance" valeur={selection.lieu_naissance} />
            <Champ label="Catégorie" valeur={selection.categorie} />
            <Champ label="Date de délivrance" valeur={selection.date_obtention ? formatDate(selection.date_obtention) : null} />
            <Champ label="Date de validité" valeur={selection.date_validite ? formatDate(selection.date_validite) : null} />
            <Champ label="Lieu de délivrance" valeur={selection.lieu_obtention} />
            <Champ label="Identifiant de la personne" valeur={selection.numero_identite} />
            <Champ label="Identifiant interne du permis" valeur={selection.id} />
          </Grid>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
            Ces données ne sont pas modifiables ici. Une correction relève de la « Mise à jour » des informations.
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
            {confirme ? (
              <>
                <Chip color="success" label="Permis confirmé" />
                <Button size="small" onClick={() => { setSelection(null); reinitialiserApresPermis(); }}>Changer de permis</Button>
              </>
            ) : (
              <Button variant="contained" onClick={confirmerPermis}>Confirmer ce permis</Button>
            )}
          </Stack>
        </Bloc>
      )}

      {/* E — Shortcode */}
      <Bloc lettre="E" titre="Contrôle du shortcode du titulaire" actif={confirme}>
        {!confirme ? (
          <Typography variant="body2" color="text.secondary">Confirmez d'abord le permis source.</Typography>
        ) : verification ? (
          <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /><Typography variant="body2">Vérification…</Typography></Stack>
        ) : msgShortcode && (
          <Alert
            severity={msgShortcode.severite}
            action={shortcode !== 'ACTIF' && selection ? (
              <Button color="inherit" size="small" onClick={() => verifierShortcode(selection)}>Relancer le contrôle</Button>
            ) : undefined}
          >
            <AlertTitle>{msgShortcode.titre}</AlertTitle>
            {controle?.message || msgShortcode.message}
            {(shortcode === 'ABSENT' || shortcode === 'A_REGULARISER') && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Marche à suivre : réaliser l'enrôlement du titulaire puis le paiement requis, ensuite relancer le contrôle.
              </Typography>
            )}
          </Alert>
        )}
      </Bloc>

      {/* F — Motif et pièces */}
      <Bloc lettre="F" titre="Motif et pièces" actif={confirme}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField select fullWidth size="small" required label="Motif" value={motif} disabled={!confirme}
              onChange={(e) => setMotif(e.target.value as MotifDuplicata)}>
              {MOTIFS_DUPLICATA.map((m) => <MenuItem key={m.valeur} value={m.valeur}>{m.libelle}</MenuItem>)}
            </TextField>
          </Grid>
          {motif === 'AUTRE' && (
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" required label="Précision du motif" value={precision}
                inputProps={{ maxLength: PRECISION_MAX }} onChange={(e) => setPrecision(e.target.value)} />
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField fullWidth size="small" multiline minRows={2} label="Observations (facultatif)" value={observations} disabled={!confirme}
              inputProps={{ maxLength: OBSERVATIONS_MAX }} helperText={`${observations.length} / ${OBSERVATIONS_MAX}`}
              onChange={(e) => setObservations(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <Button variant="outlined" component="label" size="small" disabled={!confirme}>
              {justificatif ? 'Changer le justificatif' : 'Joindre un justificatif'}
              <input hidden type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => changerFichier(e.target.files?.[0] ?? null)} />
            </Button>
            <Typography variant="body2" component="span" sx={{ ml: 1.5 }} color={erreurFichier ? 'error' : 'text.secondary'}>
              {erreurFichier ?? justificatif?.name ?? 'PDF, JPG ou PNG — 5 Mo max. Exigence selon le motif : à confirmer par le métier.'}
            </Typography>
          </Grid>
        </Grid>
      </Bloc>

      {/* G — Récapitulatif */}
      <Bloc lettre="G" titre="Récapitulatif et soumission" actif={confirme}>
        <Grid container spacing={2}>
          <Champ label="Titulaire" valeur={selection ? `${selection.nom} ${selection.prenom ?? ''}`.trim() : '—'} />
          <Champ label="Permis source" valeur={selection?.numero_permis ?? '—'} />
          <Champ label="Catégorie" valeur={selection?.categorie ?? '—'} />
          <Champ label="Motif" valeur={libelleMotif ? `${libelleMotif}${motif === 'AUTRE' && precision ? ` — ${precision}` : ''}` : '—'} />
          <Champ label="Observations" valeur={observations || '—'} />
          <Champ label="Justificatif" valeur={justificatif?.name ?? 'Aucun'} />
        </Grid>
        <Alert severity="info" sx={{ mt: 2 }}>
          Demande de duplicata liée au permis existant{selection?.numero_permis ? ` n° ${selection.numero_permis}` : ''}. Le permis
          source ne sera ni modifié, ni remplacé, ni supprimé.
        </Alert>
        <Divider sx={{ my: 2 }} />
        {blocages.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Soumission impossible pour l'instant</AlertTitle>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {blocages.map((b) => <li key={b}>{b}</li>)}
            </Box>
          </Alert>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={soumettre} disabled={envoi || !!cree || blocages.length > 0}>
            {envoi ? <CircularProgress size={20} color="inherit" /> : 'Soumettre la demande de duplicata'}
          </Button>
        </Box>
      </Bloc>
    </Container>
  );
};

export default DuplicataPermisRosePage;
