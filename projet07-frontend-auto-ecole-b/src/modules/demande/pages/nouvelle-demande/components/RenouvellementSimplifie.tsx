import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
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
  Typography,
} from '@mui/material';
import axiosClient from '../../../../../shared/utils/axiosConfig';
import { circuitSuiviService } from '../../../../reception/services/circuit-suivi.service';
import { SendToCNEDDTError, sendDossierToCNEDDT } from '../../../../reception/services/sendToCNEDDT.service';
import {
  chargerDigitalisation,
  createCandidatPourRenouvellement,
  createDossierRenouvellement,
  findCandidatPourPermis,
  findDigitalisationParNumero,
  demandeService,
  type CandidatRenouvellement,
  type DonneesDigitalisation,
  type NouveauCandidatRenouvellement,
  type PermisApiData,
} from '../../../services/demande.service';
import { telechargerRecepisseRenouvellementPdf } from '../../../utils/recepisseTransfertBiometriePdf';

type Etape = 'recherche' | 'verification' | 'paiement' | 'cneddt' | 'termine';

interface RenouvellementSimplifieProps {
  typeDemandeId: string;
  typeDemandeName: string;
  /** Compte technique autorisé à contourner la vérification du paiement (même règle que le parcours standard). */
  canBypassPaiement: boolean;
  /** Personne non digitalisée : bascule vers le type de digitalisation choisi (clé normalisée du type de demande). */
  onDigitaliser: (cleTypeDemande: string) => void;
  /** Dossier de digitalisation qui vient d'être transmis : le renouvellement démarre directement sur ses données. */
  dossierDigitalisationId?: string | null;
}

const TYPES_PIECE_CANDIDAT = ['CNI', 'Passeport', 'Titre de séjour', 'Autre'];

const CHOIX_DIGITALISATION = [
  { cle: 'FICHEENREGISTREMENT', label: "Fiche d'enregistrement", aide: 'Permis vert' },
  { cle: 'DUPLICATAFICHEENREGISTREMENT', label: "Duplicata fiche d'enregistrement", aide: 'Permis vert (duplicata)' },
  { cle: 'DUPLICATA', label: 'Duplicata', aide: 'Permis rose' },
];

const normalizeNumero = (s: unknown) => String(s ?? '').replace(/-/g, '').toUpperCase().trim();

/** Clé d'une ligne catégorie : un même numéro peut porter plusieurs catégories (dossiers digitalisés). */
const cleCategorie = (p: PermisApiData) => `${normalizeNumero(p.numero_permis)}|${String(p.categorie ?? '').toUpperCase().trim()}`;

function fmtDate(value: unknown): string {
  const s = String(value ?? '').split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function isExpire(p: PermisApiData): boolean | null {
  const validite = fmtDate(p.date_validite);
  if (!validite) return null;
  return validite < new Date().toISOString().split('T')[0];
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof SendToCNEDDTError) {
    const body = (err.cause as { response?: { data?: { skipped?: Array<{ reason?: string }> } } })?.response?.data;
    return body?.skipped?.[0]?.reason || err.message;
  }
  const ax = err as { response?: { data?: { message?: string } }; message?: string };
  return ax?.response?.data?.message ?? ax?.message ?? fallback;
}

async function fetchStatutEtCodePaiement(dossierId: string): Promise<{ statut: string; code: string }> {
  const res = await axiosClient.get(`/dossiers/${dossierId}`);
  const d = (res.data?.data ?? res.data) as Record<string, unknown>;
  const attrs = d?.attributes as Record<string, unknown> | undefined;
  return {
    statut: String(d?.statut ?? attrs?.statut ?? ''),
    code: String(d?.code_paiement ?? attrs?.code_paiement ?? '').trim(),
  };
}

const RenouvellementSimplifie: React.FC<RenouvellementSimplifieProps> = ({
  typeDemandeId,
  typeDemandeName,
  canBypassPaiement,
  onDigitaliser,
  dossierDigitalisationId,
}) => {
  const [etape, setEtape] = useState<Etape>('recherche');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Recherche
  const [numeroSaisi, setNumeroSaisi] = useState('');
  const [permisList, setPermisList] = useState<PermisApiData[]>([]);
  const [principal, setPrincipal] = useState<PermisApiData | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [onglet, setOnglet] = useState(0);
  /** Recherche infructueuse : la personne doit d'abord être digitalisée. */
  const [nonDigitalise, setNonDigitalise] = useState(false);
  /** Numéro de permis porté par le dossier de renouvellement (celui du dossier de digitalisation le cas échéant). */
  const [numeroDossier, setNumeroDossier] = useState('');

  // Candidat
  const [candidat, setCandidat] = useState<CandidatRenouvellement | null>(null);
  const [nouveauCandidat, setNouveauCandidat] = useState<NouveauCandidatRenouvellement>({
    telephone: '',
    email: '',
    genre: '',
    type_piece: 'CNI',
    numero_piece: '',
  });

  // Dossier / paiement / CNEDDT
  const [dossier, setDossier] = useState<{ id: string; numero?: string } | null>(null);
  const [codePaiement, setCodePaiement] = useState('');
  const [shortCode, setShortCode] = useState('');

  const categoriesSelectionnees = useMemo(
    () => permisList.filter((p) => selection.includes(cleCategorie(p))),
    [permisList, selection],
  );

  const nouveauCandidatComplet =
    !!nouveauCandidat.telephone.trim() && !!nouveauCandidat.genre && !!nouveauCandidat.numero_piece.trim();

  const resetAll = useCallback(() => {
    setEtape('recherche');
    setError(null);
    setInfo(null);
    setPermisList([]);
    setPrincipal(null);
    setSelection([]);
    setOnglet(0);
    setNonDigitalise(false);
    setNumeroDossier('');
    setCandidat(null);
    setDossier(null);
    setCodePaiement('');
    setShortCode('');
  }, []);

  /** Personne digitalisée via un dossier (fiche / duplicata) : identité, catégories et candidat viennent du dossier. */
  const appliquerDigitalisation = useCallback((dig: DonneesDigitalisation) => {
    setPermisList(dig.categories);
    setPrincipal(dig.principal);
    setNumeroDossier(dig.numeroPermis);
    setCandidat(dig.candidat);
    const expirees = dig.categories.filter((p) => isExpire(p) === true).map(cleCategorie);
    setSelection(expirees.length ? expirees : dig.categories.map(cleCategorie));
    setEtape('verification');
  }, []);

  // Enchaînement depuis une digitalisation qui vient d'être transmise
  useEffect(() => {
    if (!dossierDigitalisationId) return;
    let cancelled = false;
    setBusy(true);
    chargerDigitalisation(dossierDigitalisationId)
      .then((dig) => {
        if (cancelled) return;
        if (!dig || dig.categories.length === 0) {
          setError('Impossible de reprendre les catégories du dossier de digitalisation. Saisissez le numéro de permis.');
          return;
        }
        setNumeroSaisi(dig.numeroPermis);
        appliquerDigitalisation(dig);
        setInfo('Digitalisation transmise : vous pouvez maintenant renouveler les catégories.');
      })
      .catch((err) => !cancelled && setError(errorMessage(err, 'Erreur lors du chargement du dossier de digitalisation.')))
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [dossierDigitalisationId, appliquerDigitalisation]);

  // ── 1. Recherche du permis et de toutes les catégories du titulaire ─────────
  const handleRechercher = useCallback(async () => {
    const numero = numeroSaisi.trim();
    if (!numero) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    setNonDigitalise(false);
    try {
      const trouve = await demandeService.verifyPermisParNumero(numero);
      if (!trouve) {
        // Pas dans le registre : peut-être digitalisé via un dossier fiche / duplicata
        const dig = await findDigitalisationParNumero(numero).catch(() => null);
        if (dig && !dig.transmis) {
          setError(
            "Une digitalisation est en cours pour ce permis mais n'a pas encore été transmise à la biométrie. Terminez-la avant de renouveler.",
          );
          return;
        }
        if (dig && dig.categories.length > 0) {
          appliquerDigitalisation(dig);
          return;
        }
        setNonDigitalise(true);
        return;
      }
      setNumeroDossier(String(trouve.numero_permis ?? numero));
      let parIdentite: PermisApiData[] = [];
      try {
        parIdentite = await demandeService.searchPermisParIdentite(
          String(trouve.nom ?? ''),
          String(trouve.prenom ?? ''),
          fmtDate(trouve.date_naissance),
        );
      } catch {
        parIdentite = [];
      }
      const parNumero = new Map<string, PermisApiData>();
      [...parIdentite, trouve].forEach((p) => {
        const k = normalizeNumero(p.numero_permis);
        if (k && !parNumero.has(k)) parNumero.set(k, p);
      });
      const liste = Array.from(parNumero.values());
      setPermisList(liste);
      setPrincipal(trouve);
      // Par défaut : les catégories expirées sont à renouveler
      const expirees = liste.filter((p) => isExpire(p) === true).map(cleCategorie);
      setSelection(expirees.length ? expirees : [cleCategorie(trouve)]);

      const existant = await findCandidatPourPermis(trouve).catch(() => null);
      setCandidat(existant);
      if (!existant) {
        const sexe = String(trouve.sexe ?? '').toUpperCase().trim();
        setNouveauCandidat((prev) => ({
          ...prev,
          numero_piece: String(trouve.numero_identite ?? '').trim(),
          genre: sexe === 'M' || sexe === 'F' ? sexe : prev.genre,
        }));
      }
      setEtape('verification');
    } catch (err) {
      setError(errorMessage(err, 'Erreur lors de la recherche du permis.'));
    } finally {
      setBusy(false);
    }
  }, [numeroSaisi, appliquerDigitalisation]);

  const toggleCategorie = (cle: string) => {
    setSelection((prev) => (prev.includes(cle) ? prev.filter((n) => n !== cle) : [...prev, cle]));
  };

  // ── 2. Création (ou reprise) du dossier puis passage en paiement ────────────
  const handleValider = useCallback(async () => {
    if (!principal || categoriesSelectionnees.length === 0) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      let candidatId = candidat?.id ?? '';
      if (!candidatId) {
        candidatId = await createCandidatPourRenouvellement(principal, nouveauCandidat);
        setCandidat({ id: candidatId });
      }
      const created = await createDossierRenouvellement({
        candidatId,
        typeDemandeId,
        numeroPermis: numeroDossier || String(principal.numero_permis ?? numeroSaisi),
        categories: categoriesSelectionnees,
      });
      setDossier({ id: created.dossierId, numero: created.numero });

      let { statut, code } = await fetchStatutEtCodePaiement(created.dossierId);
      if (statut.toUpperCase() !== 'EN_ATTENTE_PAIEMENT') {
        await circuitSuiviService.updateDossierStatut(created.dossierId, 'EN_ATTENTE_PAIEMENT');
        ({ statut, code } = await fetchStatutEtCodePaiement(created.dossierId));
      }
      setCodePaiement(code);
      if (created.existing) {
        setInfo('Un renouvellement était déjà en cours pour ce permis : le dossier existant a été repris (aucun doublon créé).');
      }
      setEtape('paiement');
    } catch (err) {
      setError(errorMessage(err, 'Erreur lors de la création du dossier de renouvellement.'));
    } finally {
      setBusy(false);
    }
  }, [principal, categoriesSelectionnees, candidat, nouveauCandidat, typeDemandeId, numeroSaisi, numeroDossier]);

  // ── 3. Vérification du paiement ─────────────────────────────────────────────
  const handleVerifierPaiement = useCallback(async () => {
    if (!dossier || !codePaiement.trim()) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await axiosClient.get(`/dossiers/${dossier.id}/check-paiement`, { params: { code: codePaiement.trim() } });
      const body = res.data as { data?: { paid?: boolean; message?: string }; paid?: boolean; message?: string };
      if (body?.data?.paid ?? body?.paid) {
        setInfo('Paiement vérifié.');
        setEtape('cneddt');
      } else {
        setError(body?.data?.message ?? body?.message ?? 'Paiement en attente de validation.');
      }
    } catch (err) {
      setError(errorMessage(err, 'Erreur lors de la vérification du paiement.'));
    } finally {
      setBusy(false);
    }
  }, [dossier, codePaiement]);

  // ── 4. Transmission CNEDDT (pas de biométrie) → short code ──────────────────
  const handleEnvoyerCNEDDT = useCallback(async () => {
    if (!dossier) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { shortCode: code } = await sendDossierToCNEDDT(dossier.id, null, typeDemandeId);
      setShortCode(code);
      try {
        localStorage.setItem(`renouvellement_shortcode_${dossier.id}`, code);
      } catch {
        // ignore
      }
      if (!code) setInfo("Demande transmise au CNEDDT, mais aucun short code n'a été renvoyé.");
      setEtape('termine');
    } catch (err) {
      setError(errorMessage(err, "Erreur lors de l'envoi au CNEDDT."));
    } finally {
      setBusy(false);
    }
  }, [dossier, typeDemandeId]);

  const handleImprimer = useCallback(async () => {
    if (!dossier || !principal) return;
    await telechargerRecepisseRenouvellementPdf({
      dossierId: dossier.id,
      numeroDossier: dossier.numero,
      shortCode,
      dateTransfert: new Date(),
      numeroPermis: numeroDossier || String(principal.numero_permis ?? ''),
      personne: {
        nom: String(principal.nom ?? ''),
        prenom: String(principal.prenom ?? ''),
        date_naissance: fmtDate(principal.date_naissance),
        lieu_naissance: String(principal.lieu_naissance ?? ''),
        nationalite: String(principal.nationalite ?? ''),
        numero_piece: String(principal.numero_identite ?? nouveauCandidat.numero_piece ?? ''),
        contact: candidat?.personne?.contact ?? nouveauCandidat.telephone,
      },
      categoriesRenouvelees: categoriesSelectionnees.map((p) => ({
        categorie: String(p.categorie ?? ''),
        numero: String(p.numero_permis ?? ''),
        lieu_obtention: String(p.lieu_obtention ?? ''),
        date_obtention: fmtDate(p.date_obtention),
        date_validite: fmtDate(p.date_validite),
      })),
    });
  }, [dossier, principal, shortCode, candidat, nouveauCandidat, categoriesSelectionnees, numeroDossier]);

  const statutChip = (p: PermisApiData) => {
    const exp = isExpire(p);
    if (exp === null) return <Chip size="small" label="Validité inconnue" variant="outlined" />;
    return exp ? <Chip size="small" color="error" label="Expirée" /> : <Chip size="small" color="success" label="Valide" />;
  };

  const verrouille = etape !== 'recherche' && etape !== 'verification';

  return (
    <Stack spacing={2.5}>
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="info" onClose={() => setInfo(null)}>{info}</Alert>}

      {/* ── Numéro de permis ─────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {typeDemandeName || 'Renouvellement'} — numéro de permis
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="Numéro de permis"
            value={numeroSaisi}
            onChange={(e) => setNumeroSaisi(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleRechercher(); }}
            size="small"
            fullWidth
            disabled={busy || verrouille}
            placeholder="ex. 2015001234"
          />
          {etape === 'recherche' ? (
            <Button variant="contained" onClick={() => void handleRechercher()} disabled={busy || !numeroSaisi.trim()}>
              {busy ? <CircularProgress size={20} color="inherit" /> : 'Rechercher'}
            </Button>
          ) : (
            <Button variant="outlined" onClick={resetAll} disabled={busy}>Nouvelle recherche</Button>
          )}
        </Stack>
      </Paper>

      {/* ── Personne non digitalisée : digitaliser d'abord ───────────────── */}
      {nonDigitalise && (
        <Paper variant="outlined" sx={{ p: 2, borderColor: 'warning.main' }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Permis non digitalisé
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Aucun permis numérique ne correspond à ce numéro. Digitalisez-le d'abord : après le transfert à la biométrie,
            un bouton « Continuer vers le renouvellement » permettra de renouveler les catégories sans ressaisie.
            Chaque étape a son paiement et son récépissé.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            {CHOIX_DIGITALISATION.map((c) => (
              <Button key={c.cle} variant="outlined" onClick={() => onDigitaliser(c.cle)} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <span>{c.label}</span>
                <Typography variant="caption" color="text.secondary">{c.aide}</Typography>
              </Button>
            ))}
          </Stack>
        </Paper>
      )}

      {/* ── Informations du titulaire et catégories ──────────────────────── */}
      {principal && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Tabs value={onglet} onChange={(_, v) => setOnglet(v)} sx={{ mb: 2 }}>
            <Tab label="Informations" />
            <Tab label={`Catégories à renouveler (${categoriesSelectionnees.length})`} />
          </Tabs>

          {onglet === 0 && (
            <Stack spacing={2}>
              <Grid container spacing={1.5}>
                {[
                  ['Nom', principal.nom],
                  ['Prénom', principal.prenom],
                  ['Date de naissance', fmtDate(principal.date_naissance)],
                  ['Lieu de naissance', principal.lieu_naissance],
                  ['Nationalité', principal.nationalite],
                  ["N° pièce d'identité", principal.numero_identite],
                ].map(([label, value]) => (
                  <Grid item xs={12} sm={6} md={4} key={String(label)}>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{String(value ?? '') || '-'}</Typography>
                  </Grid>
                ))}
              </Grid>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Catégorie</TableCell>
                    <TableCell>Numéro</TableCell>
                    <TableCell>Lieu</TableCell>
                    <TableCell>Obtention</TableCell>
                    <TableCell>Validité</TableCell>
                    <TableCell>Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {permisList.map((p) => (
                    <TableRow key={cleCategorie(p)}>
                      <TableCell><strong>{p.categorie || '-'}</strong></TableCell>
                      <TableCell>{p.numero_permis}</TableCell>
                      <TableCell>{p.lieu_obtention || '-'}</TableCell>
                      <TableCell>{fmtDate(p.date_obtention) || '-'}</TableCell>
                      <TableCell>{fmtDate(p.date_validite) || '-'}</TableCell>
                      <TableCell>{statutChip(p)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Stack>
          )}

          {onglet === 1 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Catégorie</TableCell>
                  <TableCell>Numéro</TableCell>
                  <TableCell>Validité</TableCell>
                  <TableCell>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permisList.map((p) => {
                  const k = cleCategorie(p);
                  return (
                    <TableRow key={k} hover onClick={() => !verrouille && toggleCategorie(k)} sx={{ cursor: verrouille ? 'default' : 'pointer' }}>
                      <TableCell padding="checkbox">
                        <Checkbox checked={selection.includes(k)} disabled={verrouille} />
                      </TableCell>
                      <TableCell><strong>{p.categorie || '-'}</strong></TableCell>
                      <TableCell>{p.numero_permis}</TableCell>
                      <TableCell>{fmtDate(p.date_validite) || '-'}</TableCell>
                      <TableCell>{statutChip(p)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Candidat : existant ou complément minimal pour créer le compte */}
          {etape === 'verification' && (
            <Box sx={{ mt: 2 }}>
              {candidat ? (
                <Alert severity="success">
                  Titulaire déjà enregistré{candidat.numero_candidat ? ` (candidat ${candidat.numero_candidat})` : ''} : aucun compte à créer.
                </Alert>
              ) : (
                <>
                  <Alert severity="warning" sx={{ mb: 1.5 }}>
                    Ce titulaire n'a pas encore de compte. Complétez ces informations pour le créer (le short code sera envoyé par SMS à ce numéro).
                  </Alert>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField label="Téléphone" required size="small" fullWidth value={nouveauCandidat.telephone}
                        onChange={(e) => setNouveauCandidat((s) => ({ ...s, telephone: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField select label="Genre" required size="small" fullWidth value={nouveauCandidat.genre}
                        onChange={(e) => setNouveauCandidat((s) => ({ ...s, genre: e.target.value }))}>
                        <MenuItem value="M">Masculin</MenuItem>
                        <MenuItem value="F">Féminin</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField label="Email (facultatif)" type="email" size="small" fullWidth value={nouveauCandidat.email}
                        onChange={(e) => setNouveauCandidat((s) => ({ ...s, email: e.target.value }))} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField select label="Type de pièce" size="small" fullWidth value={nouveauCandidat.type_piece}
                        onChange={(e) => setNouveauCandidat((s) => ({ ...s, type_piece: e.target.value }))}>
                        {TYPES_PIECE_CANDIDAT.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField label="Numéro de pièce" required size="small" fullWidth value={nouveauCandidat.numero_piece}
                        onChange={(e) => setNouveauCandidat((s) => ({ ...s, numero_piece: e.target.value }))} />
                    </Grid>
                  </Grid>
                </>
              )}
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => void handleValider()}
                  disabled={busy || categoriesSelectionnees.length === 0 || (!candidat && !nouveauCandidatComplet)}
                >
                  {busy ? <CircularProgress size={20} color="inherit" /> : 'Valider et passer au paiement'}
                </Button>
              </Stack>
              {categoriesSelectionnees.length === 0 && (
                <Typography variant="caption" color="error">Sélectionnez au moins une catégorie à renouveler.</Typography>
              )}
            </Box>
          )}
        </Paper>
      )}

      {/* ── Paiement ─────────────────────────────────────────────────────── */}
      {dossier && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Paiement</Typography>
          {etape === 'paiement' ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <TextField label="Code de paiement" size="small" value={codePaiement}
                onChange={(e) => setCodePaiement(e.target.value)} sx={{ minWidth: 240 }} />
              <Button variant="contained" onClick={() => void handleVerifierPaiement()} disabled={busy || !codePaiement.trim()}>
                {busy ? <CircularProgress size={20} color="inherit" /> : 'Vérifier le paiement'}
              </Button>
              {canBypassPaiement && (
                <Button variant="text" color="warning" onClick={() => { setInfo('Vérification du paiement contournée (compte technique).'); setEtape('cneddt'); }}>
                  Contourner (dev)
                </Button>
              )}
            </Stack>
          ) : (
            <Alert severity="success">Paiement vérifié.</Alert>
          )}
        </Paper>
      )}

      {/* ── CNEDDT : short code + récépissé ──────────────────────────────── */}
      {(etape === 'cneddt' || etape === 'termine') && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Transmission au CNEDDT</Typography>
          {etape === 'cneddt' ? (
            <Button variant="contained" onClick={() => void handleEnvoyerCNEDDT()} disabled={busy}>
              {busy ? <CircularProgress size={20} color="inherit" /> : 'Envoyer à la CNEDDT'}
            </Button>
          ) : (
            <Stack spacing={2} alignItems="flex-start">
              <Box sx={{ border: 2, borderColor: 'primary.main', borderRadius: 2, px: 4, py: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">Short code</Typography>
                <Typography variant="h3" fontWeight={800} letterSpacing={2}>{shortCode || '—'}</Typography>
              </Box>
              <Stack direction="row" spacing={1.5}>
                <Button variant="contained" onClick={() => void handleImprimer()}>Imprimer le récépissé</Button>
                <Button variant="outlined" onClick={() => { resetAll(); setNumeroSaisi(''); }}>Nouveau renouvellement</Button>
              </Stack>
            </Stack>
          )}
        </Paper>
      )}
    </Stack>
  );
};

export default RenouvellementSimplifie;
