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
  Checkbox,
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
import { buildNumeroPermis } from '../../cnepc/forms/utils';
import type { NumeroPermisParts, PermisFormatType } from '../../cnepc/forms/types';
import SaisieNumeroPermis, { PARTS_VIDES } from '../components/SaisieNumeroPermis';
import {
  duplicataService,
  LIBELLES_SUPPORT,
  MESSAGES_SHORTCODE,
  MOTIFS_DUPLICATA,
  OBSERVATIONS_MAX,
  PRECISION_MAX,
  shortcodeAutoriseSoumission,
  supportDe,
  TYPES_DEMANDE_DUPLICATA,
  type CriteresRecherchePermis,
  type SupportPermis,
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
  /** ROSE = duplicata du permis rose, VERT = duplicata de la fiche d'enregistrement. */
  support?: SupportPermis;
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

/** Compare deux numéros de permis sans tenir compte des tirets, espaces ni de la casse. */
const normaliserNumero = (n?: string | null) => String(n ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
const estNumeroExact = (p: PermisSource, saisie?: string) =>
  !!saisie && normaliserNumero(p.numero_permis) !== '' && normaliserNumero(p.numero_permis) === normaliserNumero(saisie);

/** Identifie un titulaire : numéro de pièce d'identité, sinon nom + prénom + date de naissance. */
const cleTitulaire = (p: PermisSource) => p.numero_identite || `${p.nom}|${p.prenom ?? ''}|${p.date_naissance ?? ''}`;

const TAILLE_MAX_JUSTIFICATIF = 5 * 1024 * 1024;

/**
 * Duplicata du permis de conduire rose (cadrage v1.0 du 17/11/2026) ou de la fiche d'enregistrement (permis vert).
 * Parcours : recherche du permis source → fiche lecture seule → contrôle shortcode (serveur) → motif → récapitulatif → création.
 * Seules les lignes du support de l'écran sont sélectionnables ; les autres restent visibles, grisées.
 * Tous les contrôles sont refaits par le serveur à la création ; ceux de cette page ne sont qu'une aide à la saisie.
 * Le permis source n'est jamais modifié depuis ce parcours.
 */
const DuplicataPermisRosePage: React.FC<Props> = ({ titre, couleur, onRetour, support = 'ROSE' }) => {
  const libelleSupport = LIBELLES_SUPPORT[support];
  const autreSupport = LIBELLES_SUPPORT[support === 'ROSE' ? 'VERT' : 'ROSE'];
  const estEligible = (p: PermisSource) => supportDe(p) === support;
  const titreAffiche = titre ?? `Duplicata — ${libelleSupport}`;
  // B — Recherche
  const [mode, setMode] = useState<ModeRecherche>('numero');
  const [criteres, setCriteres] = useState<CriteresRecherchePermis>({ numero_permis: '', nom: '', prenom: '', date_naissance: '' });
  // Numéro de permis saisi de façon structurée (format standard AAAA-P-C-NNNN ou PERM).
  const [formatNumero, setFormatNumero] = useState<PermisFormatType>('standard');
  const [partsNumero, setPartsNumero] = useState<NumeroPermisParts>(PARTS_VIDES);
  const numeroComplet = buildNumeroPermis(partsNumero, formatNumero);
  const [recherche, setRecherche] = useState(false);
  const [erreurRecherche, setErreurRecherche] = useState<string | null>(null);

  // C — Résultats / D — Fiche source
  const [resultats, setResultats] = useState<PermisSource[] | null>(null);
  /** Permis principal (celui recherché) : porte l'identité du titulaire. */
  const [selection, setSelection] = useState<PermisSource | null>(null);
  /** Catégories retenues pour le duplicata (toutes du même titulaire que `selection`). */
  const [selectionIds, setSelectionIds] = useState<string[]>([]);
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

  /** Sélectionne un titulaire : toutes ses catégories du support de l'écran présentes dans `liste` sont cochées. */
  const selectionnerTitulaire = (principal: PermisSource, liste: PermisSource[]) => {
    const cle = cleTitulaire(principal);
    const ids = liste.filter((p) => estEligible(p) && cleTitulaire(p) === cle).map((p) => p.id);
    setSelection(principal);
    setSelectionIds([principal.id, ...ids.filter((id) => id !== principal.id)]);
  };

  const viderSelection = () => {
    setSelection(null);
    setSelectionIds([]);
  };

  const lancerRecherche = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setRecherche(true);
    setErreurRecherche(null);
    viderSelection();
    reinitialiserApresPermis();
    try {
      // Le registre stocke les numéros sans tirets (ex. 20072B88007) : la recherche se fait sur le numéro normalisé.
      let r = await duplicataService.rechercherPermis(mode, { ...criteres, numero_permis: normaliserNumero(numeroComplet) });
      // Recherche par numéro : le permis au numéro EXACT désigne le titulaire.
      const exact = mode === 'numero' ? r.find((p) => estEligible(p) && estNumeroExact(p, numeroComplet)) : undefined;
      if (exact) {
        // On ramène toutes ses catégories, ainsi que les homonymes (même nom et prénom) pour qu'ils soient visibles.
        const parNom = await duplicataService.rechercherPermis('identite', { nom: exact.nom, prenom: exact.prenom ?? '' });
        const tous = [...r, ...parNom.filter((p) => !r.some((x) => x.id === p.id))];
        const cle = cleTitulaire(exact);
        const sesCategories = tous
          .filter((p) => p.id !== exact.id && cleTitulaire(p) === cle)
          .sort((a, b) => (a.categorie ?? '').localeCompare(b.categorie ?? ''));
        const autres = tous.filter((p) => p.id !== exact.id && cleTitulaire(p) !== cle);
        r = [exact, ...sesCategories, ...autres];
        setResultats(r);
        selectionnerTitulaire(exact, r);
      } else {
        setResultats(r);
        const roses = r.filter(estEligible);
        const titulaires = new Set(roses.map(cleTitulaire));
        // Un seul titulaire trouvé : toutes ses catégories sont sélectionnées, confirmation demandée.
        if (roses.length > 0 && titulaires.size === 1) selectionnerTitulaire(roses[0], r);
      }
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
    setPartsNumero(PARTS_VIDES);
    setResultats(null);
    setErreurRecherche(null);
    viderSelection();
    reinitialiserApresPermis();
  };

  /**
   * Clic sur une ligne : autre titulaire, on bascule sur lui (toutes ses catégories) ;
   * même titulaire, on coche / décoche la catégorie (au moins une reste sélectionnée).
   */
  const choisir = (p: PermisSource) => {
    if (!estEligible(p) || !resultats) return;
    reinitialiserApresPermis();
    if (!selection || cleTitulaire(p) !== cleTitulaire(selection)) {
      selectionnerTitulaire(p, resultats);
      return;
    }
    if (selectionIds.includes(p.id)) {
      if (selectionIds.length === 1) return;
      const restants = selectionIds.filter((id) => id !== p.id);
      setSelectionIds(restants);
      if (selection.id === p.id) setSelection(resultats.find((x) => x.id === restants[0]) ?? null);
    } else {
      setSelectionIds([...selectionIds, p.id]);
    }
  };

  const permisSelectionnes = (resultats ?? [])
    .filter((p) => selectionIds.includes(p.id))
    .sort((a, b) => (a.categorie ?? '').localeCompare(b.categorie ?? ''));

  const confirmerPermis = async () => {
    if (!selection) return;
    setConfirme(true);
    await verifierShortcode(selection);
  };

  const verifierShortcode = async (p: PermisSource) => {
    setVerification(true);
    try {
      // Le service ne lève pas d'erreur : indisponibilité = NON_VERIFIE (jamais considéré comme réussi).
      setControle(await duplicataService.verifierShortcode(p, support));
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
      const res = await duplicataService.soumettre({
        permisIds: [selection.id, ...selectionIds.filter((id) => id !== selection.id)],
        support,
        motif, precision, observations, justificatif,
      });
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
          {titreAffiche}
        </Typography>
      </Stack>

      {cree && (
        <Alert severity="success" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={nouvelleDemande}>Nouvelle demande</Button>}>
          <AlertTitle>Demande de duplicata créée</AlertTitle>
          Dossier <strong>{cree.numero_dossier}</strong> — statut « {cree.statut_dossier} » — catégorie(s){' '}
          <strong>{cree.categories.join(', ')}</strong>, permis principal n° {cree.numero_permis_source}. Les permis sources
          n'ont pas été modifiés.
        </Alert>
      )}

      {/* A — Type */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Chip label={`Type de demande : ${TYPES_DEMANDE_DUPLICATA[support]}`} sx={{ bgcolor: couleur, color: '#fff', fontWeight: 600 }} />
        <Typography variant="body2" color="text.secondary">
          Nouvelle demande liée à {support === 'VERT' ? "une fiche d'enregistrement déjà délivrée" : 'un permis rose déjà délivré'} — ni
          nouvelle délivrance, ni renouvellement.
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
              <Grid item xs={12}>
                <SaisieNumeroPermis
                  format={formatNumero}
                  parts={partsNumero}
                  onFormatChange={(f) => { setFormatNumero(f); setPartsNumero(PARTS_VIDES); }}
                  onPartsChange={setPartsNumero}
                  numeroComplet={numeroComplet}
                  disabled={recherche}
                />
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
            <Button type="submit" variant="contained" disabled={recherche || (mode === 'numero' && !numeroComplet)}>
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
                  {resultats.length} résultats. Toutes les catégories du titulaire choisi sont cochées ; cliquer sur une autre
                  personne la sélectionne à la place (un duplicata ne concerne qu'un seul titulaire).
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
                      const rose = estEligible(p);
                      return (
                        <Tooltip key={p.id} title={rose ? '' : `${autreSupport} : non éligible dans ce circuit (${libelleSupport}).`}>
                          <TableRow hover={rose} selected={selectionIds.includes(p.id)} onClick={() => choisir(p)}
                            sx={{ cursor: rose ? 'pointer' : 'not-allowed', '& td': rose ? {} : { color: 'text.disabled' } }}>
                            <TableCell padding="checkbox"><Checkbox size="small" checked={selectionIds.includes(p.id)} disabled={!rose} /></TableCell>
                            <TableCell>
                              {p.numero_permis ?? '—'}
                              {mode === 'numero' && estNumeroExact(p, numeroComplet) && (
                                <Chip size="small" color="success" label="Numéro exact" sx={{ ml: 1 }} />
                              )}
                            </TableCell>
                            <TableCell>{`${p.nom} ${p.prenom ?? ''}`.trim()}</TableCell>
                            <TableCell>{formatDate(p.date_naissance)}</TableCell>
                            <TableCell>{p.categorie ?? '—'}</TableCell>
                            <TableCell>{formatDate(p.date_validite)}</TableCell>
                            <TableCell>{LIBELLES_SUPPORT[supportDe(p)]}</TableCell>
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
        <Bloc lettre="D" titre="Titulaire et catégories du duplicata (lecture seule)">
          <Grid container spacing={2}>
            <Champ label="Nom et prénom(s)" valeur={`${selection.nom} ${selection.prenom ?? ''}`.trim()} />
            <Champ label="Date de naissance" valeur={selection.date_naissance ? formatDate(selection.date_naissance) : null} />
            <Champ label="Lieu de naissance" valeur={selection.lieu_naissance} />
            <Champ label="Identifiant de la personne" valeur={selection.numero_identite} />
            <Champ label="Permis principal (recherché)" valeur={selection.numero_permis} />
          </Grid>
          <Box sx={{ overflowX: 'auto', mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Catégorie</TableCell>
                  <TableCell>N° permis</TableCell>
                  <TableCell>Délivrance</TableCell>
                  <TableCell>Validité</TableCell>
                  <TableCell>Lieu de délivrance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permisSelectionnes.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell><strong>{p.categorie ?? '—'}</strong></TableCell>
                    <TableCell>{p.numero_permis ?? '—'}</TableCell>
                    <TableCell>{formatDate(p.date_obtention)}</TableCell>
                    <TableCell>{formatDate(p.date_validite)}</TableCell>
                    <TableCell>{p.lieu_obtention ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
            Ces données ne sont pas modifiables ici. Une correction relève de la « Mise à jour » des informations.
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
            {confirme ? (
              <>
                <Chip color="success" label={`Confirmé (${permisSelectionnes.length} catégorie${permisSelectionnes.length > 1 ? 's' : ''})`} />
                <Button size="small" onClick={() => { viderSelection(); reinitialiserApresPermis(); }}>Changer de permis</Button>
              </>
            ) : (
              <Button variant="contained" onClick={confirmerPermis}>
                Confirmer {permisSelectionnes.length > 1 ? `ces ${permisSelectionnes.length} catégories` : 'ce permis'}
              </Button>
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
          <Champ label="Permis principal" valeur={selection?.numero_permis ?? '—'} />
          <Champ
            label={`Catégorie${permisSelectionnes.length > 1 ? 's' : ''}`}
            valeur={permisSelectionnes.length ? permisSelectionnes.map((p) => `${p.categorie} (${p.numero_permis})`).join(', ') : '—'}
          />
          <Champ label="Motif" valeur={libelleMotif ? `${libelleMotif}${motif === 'AUTRE' && precision ? ` — ${precision}` : ''}` : '—'} />
          <Champ label="Observations" valeur={observations || '—'} />
          <Champ label="Justificatif" valeur={justificatif?.name ?? 'Aucun'} />
        </Grid>
        <Alert severity="info" sx={{ mt: 2 }}>
          Demande de duplicata liée aux permis existants du titulaire. Les permis sources ne seront ni modifiés, ni remplacés,
          ni supprimés.
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
