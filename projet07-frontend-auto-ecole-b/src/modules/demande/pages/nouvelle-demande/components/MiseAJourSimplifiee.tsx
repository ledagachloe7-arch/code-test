import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Grid,
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
import axiosClient from '../../../../../shared/utils/axiosConfig';
import { circuitSuiviService } from '../../../../reception/services/circuit-suivi.service';
import {
  CHAMPS_MISE_A_JOUR,
  createCandidatPourRenouvellement,
  createDossierMiseAJour,
  fetchStatutEtCodePaiement,
  findCandidatPourPermis,
  findDigitalisationParNumero,
  demandeService,
  type CandidatRenouvellement,
  type ChampMiseAJour,
  type CorrectionsMiseAJour,
  type NouveauCandidatRenouvellement,
  type PermisApiData,
} from '../../../services/demande.service';

type Etape = 'recherche' | 'saisie' | 'paiement' | 'termine';
type Identite = Record<ChampMiseAJour, string>;

interface MiseAJourSimplifieeProps {
  typeDemandeId: string;
  typeDemandeName: string;
}

const TYPES_PIECE_CANDIDAT = ['CNI', 'Passeport', 'Titre de séjour', 'Autre'];

const SOURCES = {
  digitalise: 'Permis digitalisé : informations du dossier de digitalisation transmis.',
  digitalisation_en_cours: 'Digitalisation en cours : informations du dossier de digitalisation.',
  registre: 'Permis non digitalisé : informations du registre.',
};

function fmtDate(value: unknown): string {
  const s = String(value ?? '').split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

function identiteDepuis(p: PermisApiData): Identite {
  const sexe = String(p.sexe ?? '').toUpperCase().trim();
  return {
    nom: String(p.nom ?? '').trim(),
    prenom: String(p.prenom ?? '').trim(),
    date_naissance: fmtDate(p.date_naissance),
    lieu_naissance: String(p.lieu_naissance ?? '').trim(),
    sexe: sexe === 'M' || sexe === 'F' ? sexe : '',
    nationalite: String(p.nationalite ?? '').trim(),
  };
}

const libelleValeur = (champ: ChampMiseAJour, v: string) =>
  champ === 'sexe' ? ({ M: 'Masculin', F: 'Féminin' } as Record<string, string>)[v] ?? (v || '-') : v || '-';

function errorMessage(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: { message?: string } }; message?: string };
  return ax?.response?.data?.message ?? ax?.message ?? fallback;
}

const MiseAJourSimplifiee: React.FC<MiseAJourSimplifieeProps> = ({ typeDemandeId, typeDemandeName }) => {
  const [etape, setEtape] = useState<Etape>('recherche');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Recherche
  const [numeroSaisi, setNumeroSaisi] = useState('');
  const [numeroDossier, setNumeroDossier] = useState('');
  const [source, setSource] = useState<keyof typeof SOURCES | null>(null);
  const [principal, setPrincipal] = useState<PermisApiData | null>(null);

  // Identité actuelle et corrigée
  const [actuelle, setActuelle] = useState<Identite | null>(null);
  const [nouvelle, setNouvelle] = useState<Identite | null>(null);

  // Candidat
  const [candidat, setCandidat] = useState<CandidatRenouvellement | null>(null);
  const [nouveauCandidat, setNouveauCandidat] = useState<NouveauCandidatRenouvellement>({
    telephone: '',
    email: '',
    genre: '',
    type_piece: 'CNI',
    numero_piece: '',
  });

  // Dossier / paiement
  const [dossier, setDossier] = useState<{ id: string; numero?: string } | null>(null);
  const [codePaiement, setCodePaiement] = useState('');

  /** Champs réellement modifiés (valeur nouvelle non vide et différente de l'actuelle). */
  const corrections = useMemo<CorrectionsMiseAJour>(() => {
    if (!actuelle || !nouvelle) return {};
    const out: CorrectionsMiseAJour = {};
    CHAMPS_MISE_A_JOUR.forEach(({ cle }) => {
      const v = nouvelle[cle].trim();
      if (v && v !== actuelle[cle]) out[cle] = { ancienne: actuelle[cle], nouvelle: v };
    });
    return out;
  }, [actuelle, nouvelle]);
  const nbCorrections = Object.keys(corrections).length;

  const nouveauCandidatComplet =
    !!nouveauCandidat.telephone.trim() && !!nouveauCandidat.genre && !!nouveauCandidat.numero_piece.trim();

  const resetAll = useCallback(() => {
    setEtape('recherche');
    setError(null);
    setInfo(null);
    setNumeroDossier('');
    setSource(null);
    setPrincipal(null);
    setActuelle(null);
    setNouvelle(null);
    setCandidat(null);
    setDossier(null);
    setCodePaiement('');
  }, []);

  const chargerIdentite = useCallback((p: PermisApiData) => {
    const id = identiteDepuis(p);
    setPrincipal(p);
    setActuelle(id);
    setNouvelle(id);
    setEtape('saisie');
  }, []);

  // ── 1. Recherche : digitalisation (transmise ou en cours), sinon registre ──────
  const handleRechercher = useCallback(async () => {
    const numero = numeroSaisi.trim();
    if (!numero) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const dig = await findDigitalisationParNumero(numero);
      if (dig) {
        setSource(dig.transmis ? 'digitalise' : 'digitalisation_en_cours');
        setNumeroDossier(dig.numeroPermis);
        setCandidat(dig.candidat);
        chargerIdentite(dig.principal);
        return;
      }
      const trouve = await demandeService.verifyPermisParNumero(numero);
      if (!trouve) {
        setError('Permis introuvable dans le registre. Vérifiez le numéro saisi.');
        return;
      }
      setSource('registre');
      setNumeroDossier(String(trouve.numero_permis ?? numero));
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
      chargerIdentite(trouve);
    } catch (err) {
      setError(errorMessage(err, 'Erreur lors de la recherche du permis.'));
    } finally {
      setBusy(false);
    }
  }, [numeroSaisi, chargerIdentite]);

  // ── 2. Création (ou reprise) du dossier puis passage en paiement ────────────
  const handleValider = useCallback(async () => {
    if (!principal || nbCorrections === 0) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      let candidatId = candidat?.id ?? '';
      if (!candidatId) {
        candidatId = await createCandidatPourRenouvellement(principal, nouveauCandidat);
        setCandidat({ id: candidatId });
      }
      const created = await createDossierMiseAJour({
        candidatId,
        typeDemandeId,
        numeroPermis: numeroDossier || numeroSaisi,
        corrections,
      });
      setDossier({ id: created.dossierId, numero: created.numero });

      let { statut, code } = await fetchStatutEtCodePaiement(created.dossierId);
      if (statut.toUpperCase() !== 'EN_ATTENTE_PAIEMENT') {
        await circuitSuiviService.updateDossierStatut(created.dossierId, 'EN_ATTENTE_PAIEMENT');
        ({ statut, code } = await fetchStatutEtCodePaiement(created.dossierId));
      }
      setCodePaiement(code);
      if (created.existing) {
        setInfo('Une mise à jour était déjà en cours pour ce permis : le dossier existant a été repris avec ces corrections.');
      }
      setEtape('paiement');
    } catch (err) {
      setError(errorMessage(err, 'Erreur lors de la création du dossier de mise à jour.'));
    } finally {
      setBusy(false);
    }
  }, [principal, nbCorrections, candidat, nouveauCandidat, typeDemandeId, numeroDossier, numeroSaisi, corrections]);

  // ── 3. Vérification du paiement : le serveur applique alors les corrections ──
  const handleVerifierPaiement = useCallback(async () => {
    if (!dossier || !codePaiement.trim()) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await axiosClient.get(`/dossiers/${dossier.id}/check-paiement`, { params: { code: codePaiement.trim() } });
      const body = res.data as { data?: { paid?: boolean; message?: string }; paid?: boolean; message?: string };
      if (body?.data?.paid ?? body?.paid) {
        setEtape('termine');
      } else {
        setError(body?.data?.message ?? body?.message ?? 'Paiement en attente de validation.');
      }
    } catch (err) {
      setError(errorMessage(err, 'Erreur lors de la vérification du paiement.'));
    } finally {
      setBusy(false);
    }
  }, [dossier, codePaiement]);

  const verrouille = etape !== 'recherche' && etape !== 'saisie';

  const tableauCorrections = (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Champ</TableCell>
          <TableCell>Ancienne valeur</TableCell>
          <TableCell>Nouvelle valeur</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {CHAMPS_MISE_A_JOUR.filter(({ cle }) => corrections[cle]).map(({ cle, label }) => (
          <TableRow key={cle}>
            <TableCell>{label}</TableCell>
            <TableCell>{libelleValeur(cle, corrections[cle]?.ancienne ?? '')}</TableCell>
            <TableCell><strong>{libelleValeur(cle, corrections[cle]?.nouvelle ?? '')}</strong></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Stack spacing={2.5}>
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="info" onClose={() => setInfo(null)}>{info}</Alert>}

      {/* ── Numéro de permis ─────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {typeDemandeName || 'Mise à jour'} — numéro de permis
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="Numéro de permis"
            value={numeroSaisi}
            onChange={(e) => setNumeroSaisi(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleRechercher(); }}
            size="small"
            fullWidth
            disabled={busy || etape !== 'recherche'}
            placeholder="ex. 20044D00004"
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

      {/* ── Informations actuelles et corrections ────────────────────────── */}
      {actuelle && nouvelle && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Informations du titulaire</Typography>
          {source && <Alert severity="info" sx={{ mb: 2 }}>{SOURCES[source]}</Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Modifiez uniquement les informations erronées. La valeur actuelle est rappelée sous chaque champ.
          </Typography>
          <Grid container spacing={1.5}>
            {CHAMPS_MISE_A_JOUR.map(({ cle, label }) => {
              const modifie = !!corrections[cle];
              const commun = {
                label,
                size: 'small' as const,
                fullWidth: true,
                disabled: verrouille,
                value: nouvelle[cle],
                color: modifie ? ('warning' as const) : undefined,
                focused: modifie || undefined,
                helperText: `Actuel : ${libelleValeur(cle, actuelle[cle])}`,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNouvelle((s) => (s ? { ...s, [cle]: e.target.value } : s)),
              };
              return (
                <Grid item xs={12} sm={6} md={4} key={cle}>
                  {cle === 'sexe' ? (
                    <TextField select {...commun}>
                      <MenuItem value="M">Masculin</MenuItem>
                      <MenuItem value="F">Féminin</MenuItem>
                    </TextField>
                  ) : (
                    <TextField {...commun} type={cle === 'date_naissance' ? 'date' : 'text'} InputLabelProps={{ shrink: true }} />
                  )}
                </Grid>
              );
            })}
          </Grid>

          {nbCorrections > 0 && (
            <>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2.5, mb: 1 }}>
                Corrections ({nbCorrections})
              </Typography>
              {tableauCorrections}
            </>
          )}

          {/* Candidat : existant ou complément minimal pour créer le compte */}
          {etape === 'saisie' && (
            <>
              {candidat ? (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Titulaire déjà enregistré{candidat.numero_candidat ? ` (candidat ${candidat.numero_candidat})` : ''} : aucun compte à créer.
                </Alert>
              ) : (
                <>
                  <Alert severity="warning" sx={{ mt: 2, mb: 1.5 }}>
                    Ce titulaire n'a pas encore de compte. Complétez ces informations pour le créer.
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
              <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={2} sx={{ mt: 2 }}>
                {nbCorrections === 0 && (
                  <Typography variant="caption" color="error">Modifiez au moins une information.</Typography>
                )}
                <Button
                  variant="contained"
                  onClick={() => void handleValider()}
                  disabled={busy || nbCorrections === 0 || (!candidat && !nouveauCandidatComplet)}
                >
                  {busy ? <CircularProgress size={20} color="inherit" /> : 'Valider et passer au paiement'}
                </Button>
              </Stack>
            </>
          )}
        </Paper>
      )}

      {/* ── Paiement ─────────────────────────────────────────────────────── */}
      {dossier && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Paiement{dossier.numero ? ` — dossier ${dossier.numero}` : ''}
          </Typography>
          {etape === 'paiement' ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <TextField label="Code de paiement" size="small" value={codePaiement}
                onChange={(e) => setCodePaiement(e.target.value)} sx={{ minWidth: 240 }} />
              <Button variant="contained" onClick={() => void handleVerifierPaiement()} disabled={busy || !codePaiement.trim()}>
                {busy ? <CircularProgress size={20} color="inherit" /> : 'Vérifier le paiement'}
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2} alignItems="flex-start">
              <Alert severity="success" sx={{ width: '100%' }}>
                Paiement vérifié : {nbCorrections > 1 ? 'les corrections ont été appliquées' : 'la correction a été appliquée'} au titulaire.
              </Alert>
              <Button variant="outlined" onClick={() => { resetAll(); setNumeroSaisi(''); }}>Nouvelle mise à jour</Button>
            </Stack>
          )}
        </Paper>
      )}
    </Stack>
  );
};

export default MiseAJourSimplifiee;
