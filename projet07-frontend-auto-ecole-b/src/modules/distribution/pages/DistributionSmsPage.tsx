import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  DevicePhoneMobileIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserCircleIcon,
  BellAlertIcon,
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ArrowUturnRightIcon,
} from '@heroicons/react/24/outline';
import { smsService, normalizeGabonPhone, STATUT_ENVOI_BIOMETRIE, AirtelSmsError, type DossierBiometrie } from '../services';
import { SMS_MAX_LENGTH } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────
const PHONE_REGEX = /^\+?[0-9]{8,15}$/;

const candidatName = (d: DossierBiometrie) => {
  const p = d.candidat?.personne;
  if (!p) return d.candidat?.numero_candidat ?? '—';
  return [p.prenom, p.nom].filter(Boolean).join(' ') || '—';
};

const candidatPhone = (d: DossierBiometrie): string =>
  d.candidat?.personne?.contact ?? '';

/** Vérifie si le dossier est au bon statut pour être notifié. */
const canNotify = (d: DossierBiometrie): boolean => {
  const s = (d.statut ?? d.statut_libelle ?? '').toUpperCase().trim();
  return s === STATUT_ENVOI_BIOMETRIE.toUpperCase().trim()
    || s.includes('DOSSIER') && s.includes('ENVOYER')
    || s.includes('DOSSIER') && s.includes('ENVOYE');
};

const statutColor = (statut: string): 'default' | 'info' | 'warning' | 'success' | 'error' => {
  const s = statut.toUpperCase();
  if (s.includes('DOSSIER') && (s.includes('ENVOYER') || s.includes('ENVOYE'))) return 'info';
  if (s.includes('DISPONIBLE'))                                                   return 'success';
  if (s.includes('BIOMETRI') || s.includes('ENVOI'))                             return 'warning';
  if (s.includes('REJETE') || s.includes('REJET'))                               return 'error';
  return 'default';
};

const DEFAULT_SMS = 'Votre carte de permis de conduire est disponible. Veuillez vous présenter au centre avec votre reçu.';

// ─── Row send status ──────────────────────────────────────────────────────────
type SendStatus = 'idle' | 'sending' | 'ok' | 'error' | 'airtel_error';
interface RowStatus { status: SendStatus; message?: string; retries?: number }

const StatusIcon: React.FC<{ status: SendStatus; message?: string }> = ({ status, message }) => {
  if (status === 'idle')         return null;
  if (status === 'sending')      return <CircularProgress size={16} />;
  if (status === 'ok')           return (
    <Tooltip title="Notification envoyée — statut → CARTE_DISPONIBLE_AU_CENTRE">
      <CheckCircleIcon style={{ width: 18, color: '#2e7d32' }} />
    </Tooltip>
  );
  if (status === 'airtel_error') return (
    <Tooltip title={`Échec Airtel SMS — statut inchangé. ${message ?? ''}`}>
      <ExclamationTriangleIcon style={{ width: 18, color: '#ed6c02' }} />
    </Tooltip>
  );
  return (
    <Tooltip title={message ?? 'Échec'}>
      <XCircleIcon style={{ width: 18, color: '#d32f2f' }} />
    </Tooltip>
  );
};

// ════════════════════════════════════════════════════════════════════════════
const DistributionSmsPage: React.FC = () => {
  // ── Dossiers list ─────────────────────────────────────────────────────────
  const [dossiers, setDossiers]           = useState<DossierBiometrie[]>([]);
  const [loadingDossiers, setLoadingDossiers] = useState(false);
  const [loadError, setLoadError]         = useState<string | null>(null);
  const [rowStatuses, setRowStatuses]     = useState<Record<string, RowStatus>>({});

  // ── Dossier sélectionné pour confirmation ─────────────────────────────────
  const [selectedDossier, setSelectedDossier] = useState<DossierBiometrie | null>(null);
  const [overridePhone, setOverridePhone] = useState('');
  const [notifying, setNotifying]         = useState(false);
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null);
  const [notifyError, setNotifyError]     = useState<string | null>(null);
  const [isAirtelError, setIsAirtelError] = useState(false);
  const [retryCount, setRetryCount]       = useState(0);

  // ── Formulaire SMS libre ──────────────────────────────────────────────────
  const [numero, setNumero]   = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState<string | null>(null);
  const [smsError, setSmsError]     = useState<string | null>(null);

  const confirmRef = useRef<HTMLDivElement>(null);

  // ── Chargement des dossiers ───────────────────────────────────────────────
  const loadDossiers = useCallback(async () => {
    setLoadingDossiers(true);
    setLoadError(null);
    try {
      setDossiers(await smsService.fetchDossiersBiometrie());
      setRowStatuses({});
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur lors du chargement des dossiers.');
    } finally {
      setLoadingDossiers(false);
    }
  }, []);

  useEffect(() => { void loadDossiers(); }, [loadDossiers]);

  // ── Sélectionner un dossier → afficher le panneau de confirmation ─────────
  const handleSelectDossier = (d: DossierBiometrie) => {
    setSelectedDossier(d);
    setOverridePhone(candidatPhone(d)); // pré-rempli avec le numéro du dossier, modifiable
    setNotifySuccess(null);
    setNotifyError(null);
    setIsAirtelError(false);
    setRetryCount(0);
    setTimeout(() => confirmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  // ── Envoi rapide depuis la ligne (sans confirmation) ──────────────────────
  const handleSendRow = async (d: DossierBiometrie) => {
    const prev = rowStatuses[d.id];
    const retries = (prev?.retries ?? 0) + (prev?.status === 'airtel_error' ? 1 : 0);
    setRowStatuses((s) => ({ ...s, [d.id]: { status: 'sending', retries } }));
    try {
      await smsService.notifierCarteDisponible(d.id);
      setRowStatuses((s) => ({ ...s, [d.id]: { status: 'ok', retries } }));
      if (selectedDossier?.id === d.id) {
        setNotifySuccess(`Notification envoyée pour ${candidatName(d)}. Statut → CARTE_DISPONIBLE_AU_CENTRE.`);
        setSelectedDossier(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Échec';
      const isAirtel = err instanceof AirtelSmsError;
      setRowStatuses((s) => ({ ...s, [d.id]: { status: isAirtel ? 'airtel_error' : 'error', message: msg, retries } }));
    }
  };

  // ── Confirmation depuis le panneau ────────────────────────────────────────
  const handleConfirmNotify = async () => {
    if (!selectedDossier) return;
    setNotifying(true);
    setNotifyError(null);
    setIsAirtelError(false);
    const d = selectedDossier;
    setRowStatuses((s) => ({ ...s, [d.id]: { status: 'sending', retries: retryCount } }));
    try {
      await smsService.notifierCarteDisponible(d.id, overridePhone || undefined);
      setRowStatuses((s) => ({ ...s, [d.id]: { status: 'ok' } }));
      setNotifySuccess(`Notification envoyée avec succès pour ${candidatName(d)}. Statut → CARTE_DISPONIBLE_AU_CENTRE.`);
      setRetryCount(0);
      setSelectedDossier(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Échec de la notification.';
      const isAirtel = err instanceof AirtelSmsError;
      setRowStatuses((s) => ({ ...s, [d.id]: { status: isAirtel ? 'airtel_error' : 'error', message: msg } }));
      setIsAirtelError(isAirtel);
      setNotifyError(msg);
      if (isAirtel) setRetryCount((n) => n + 1);
    } finally {
      setNotifying(false);
    }
  };

  // ── Formulaire SMS libre ──────────────────────────────────────────────────
  const charsLeft   = SMS_MAX_LENGTH - message.length;
  const charPercent = Math.min(100, (message.length / SMS_MAX_LENGTH) * 100);
  const isOverLimit = message.length > SMS_MAX_LENGTH;
  const isPhoneInvalid = numero.trim() !== '' && !PHONE_REGEX.test(numero.trim());
  const canSend = numero.trim() !== '' && message.trim() !== '' && !isOverLimit && !isPhoneInvalid && !sending;

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsSuccess(null); setSmsError(null); setSending(true);
    try {
      await smsService.sendSms({ numero: numero.trim(), message: message.trim() });
      setSmsSuccess(`SMS envoyé au ${normalizeGabonPhone(numero.trim())}.`);
      setNumero(''); setMessage('');
    } catch (err) {
      setSmsError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <DevicePhoneMobileIcon style={{ width: 36, height: 36, color: '#1976d2' }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>Distribution SMS</Typography>
          <Typography variant="body2" color="text.secondary">
            Notifiez les candidats de la disponibilité de leur carte via Airtel SMS.
          </Typography>
        </Box>
        <Tooltip title="Rafraîchir">
          <IconButton onClick={() => void loadDossiers()} disabled={loadingDossiers}>
            <ArrowPathIcon style={{ width: 20, animation: loadingDossiers ? 'spin 1s linear infinite' : undefined }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Feedback global notifications */}
      {notifySuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotifySuccess(null)}>{notifySuccess}</Alert>
      )}

      {/* ── Tableau des dossiers ───────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BellAlertIcon style={{ width: 20, color: '#1976d2' }} />
          <Typography variant="subtitle1" fontWeight={700}>
            Dossiers prêts — Envoi biométrie
          </Typography>
          {loadingDossiers
            ? <CircularProgress size={16} sx={{ ml: 0.5 }} />
            : <Chip label={dossiers.length} size="small" color="primary" sx={{ fontWeight: 700 }} />
          }
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Statut : <strong>ENVOI À LA BIOMÉTRIE</strong>
          </Typography>
        </Box>

        {loadError && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setLoadError(null)}>{loadError}</Alert>
        )}

        {!loadingDossiers && dossiers.length === 0 && !loadError && (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <CheckCircleIcon style={{ width: 32, color: '#bdbdbd', marginBottom: 8 }} />
            <Typography variant="body2" color="text.secondary">
              Aucun dossier en attente de notification.
            </Typography>
          </Box>
        )}

        {/* Alerte si des dossiers n'ont pas le bon statut */}
        {dossiers.some((d) => !canNotify(d)) && (
          <Alert severity="warning" icon={<InformationCircleIcon style={{ width: 18 }} />} sx={{ mx: 2, mt: 2 }}>
            Certains dossiers ont un statut différent de <strong>{STATUT_ENVOI_BIOMETRIE}</strong> et ne peuvent pas être notifiés.
            Le backend exige ce statut exact pour envoyer la notification carte disponible.
          </Alert>
        )}

        {dossiers.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Candidat</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>N° dossier</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type de demande</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Téléphone</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dossiers.map((d) => {
                  const phone      = candidatPhone(d);
                  const name       = candidatName(d);
                  const rowSt      = rowStatuses[d.id];
                  const isSent     = rowSt?.status === 'ok';
                  const isSelected = selectedDossier?.id === d.id;
                  const notifiable = canNotify(d);
                  const statutLabel = d.statut_libelle ?? d.statut ?? '—';

                  return (
                    <TableRow key={d.id} sx={{
                      bgcolor: isSent ? 'success.50' : isSelected ? 'primary.50' : !notifiable ? 'grey.50' : 'inherit',
                      opacity: !notifiable && !isSent ? 0.65 : isSent ? 0.8 : 1,
                      transition: 'background-color .15s',
                      '&:hover': { bgcolor: isSent ? 'success.50' : isSelected ? 'primary.50' : !notifiable ? 'grey.100' : 'action.hover' },
                    }}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: isSelected ? 'primary.main' : isSent ? 'success.main' : !notifiable ? 'grey.300' : 'grey.400' }}>
                            {isSent
                              ? <CheckCircleIcon style={{ width: 14 }} />
                              : name.charAt(0).toUpperCase() || <UserCircleIcon style={{ width: 14 }} />}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={isSelected ? 700 : 400}>{name}</Typography>
                            {d.candidat?.numero_candidat && (
                              <Typography variant="caption" color="text.secondary">{d.candidat.numero_candidat}</Typography>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                          {d.id.slice(0, 8)}…
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>{d.type_demande?.name ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={notifiable ? 'Prêt pour notification' : `Statut incompatible — attendu : "${STATUT_ENVOI_BIOMETRIE}"`}>
                          <Chip
                            label={statutLabel}
                            size="small"
                            color={isSent ? 'success' : statutColor(statutLabel)}
                            variant={notifiable ? 'filled' : 'outlined'}
                            sx={{ fontSize: '0.7rem', maxWidth: 180 }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem">
                          {phone || <span style={{ color: '#bdbdbd' }}>—</span>}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                          <StatusIcon status={rowSt?.status ?? 'idle'} message={rowSt?.message} />

                          {!isSent && (
                            <>
                              {/* Préparer — panneau de confirmation */}
                              <Tooltip title={notifiable ? 'Voir les détails et confirmer' : `Statut requis : "${STATUT_ENVOI_BIOMETRIE}"`}>
                                <span>
                                  <Button size="small"
                                    variant={isSelected ? 'contained' : 'outlined'}
                                    onClick={() => handleSelectDossier(d)}
                                    disabled={!notifiable}
                                    sx={{ minWidth: 36, px: 1 }}>
                                    <DevicePhoneMobileIcon style={{ width: 15 }} />
                                  </Button>
                                </span>
                              </Tooltip>

                              {/* Envoi direct / Réessayer */}
                              <Tooltip title={
                                !notifiable
                                  ? `Statut requis : "${STATUT_ENVOI_BIOMETRIE}"`
                                  : rowSt?.status === 'airtel_error'
                                    ? `Échec Airtel — Réessayer${rowSt.retries ? ` (${rowSt.retries})` : ''}`
                                    : 'Notifier maintenant (sans confirmation)'
                              }>
                                <span>
                                  <Button size="small"
                                    variant="text"
                                    color={rowSt?.status === 'airtel_error' ? 'warning' : 'success'}
                                    onClick={() => void handleSendRow(d)}
                                    disabled={!notifiable || rowSt?.status === 'sending'}
                                    sx={{ minWidth: 36, px: 1 }}>
                                    {rowSt?.status === 'sending'
                                      ? <CircularProgress size={14} />
                                      : rowSt?.status === 'airtel_error'
                                        ? <ArrowUturnRightIcon style={{ width: 15 }} />
                                        : <PaperAirplaneIcon style={{ width: 15 }} />}
                                  </Button>
                                </span>
                              </Tooltip>
                            </>
                          )}

                          {isSent && (
                            <Chip label="Notifié" size="small" color="success" variant="outlined" />
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ── Panneau de confirmation ────────────────────────────────────── */}
      {selectedDossier && (
        <Paper ref={confirmRef} variant="outlined"
          sx={{ mb: 3, borderColor: 'primary.main', bgcolor: 'primary.50', scrollMarginTop: 80 }}>
          <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'primary.light' }}>
            <BellAlertIcon style={{ width: 20, color: '#1976d2' }} />
            <Typography variant="subtitle1" fontWeight={700} color="primary.main">
              Confirmer la notification
            </Typography>
            <IconButton size="small" sx={{ ml: 'auto' }} onClick={() => { setSelectedDossier(null); setOverridePhone(''); setNotifyError(null); setIsAirtelError(false); setRetryCount(0); }}>
              <XMarkIcon style={{ width: 18 }} />
            </IconButton>
          </Box>

          <Box sx={{ p: 2.5 }}>
            {notifyError && (
              <Alert
                severity={isAirtelError ? 'warning' : 'error'}
                icon={isAirtelError ? <ExclamationTriangleIcon style={{ width: 20 }} /> : undefined}
                sx={{ mb: 2 }}
                onClose={() => { setNotifyError(null); setIsAirtelError(false); }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {isAirtelError ? 'Échec d\'envoi Airtel SMS' : 'Erreur'}
                </Typography>
                <Typography variant="body2">{notifyError}</Typography>

                {isAirtelError && (
                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Le statut du dossier reste <strong>{selectedDossier.statut_libelle ?? selectedDossier.statut ?? '—'}</strong>.
                      Il passera à <strong>CARTE_DISPONIBLE_AU_CENTRE</strong> uniquement si Airtel confirme l'envoi.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      Causes possibles : numéro de téléphone du candidat invalide, service Airtel temporairement indisponible.
                    </Typography>
                  </Box>
                )}

                {notifyError.toLowerCase().includes('statut') && !isAirtelError && (
                  <Typography variant="caption" display="block" mt={0.5}>
                    Statut actuel : <strong>{selectedDossier.statut_libelle ?? selectedDossier.statut ?? '—'}</strong>
                    {' '}— Requis : <strong>{STATUT_ENVOI_BIOMETRIE}</strong>
                  </Typography>
                )}
              </Alert>
            )}

            {/* Résumé du dossier */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2.5} flexWrap="wrap" useFlexGap>
              <Box sx={{ flex: '1 1 180px' }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Candidat</Typography>
                <Typography variant="body1" fontWeight={700}>{candidatName(selectedDossier)}</Typography>
                {selectedDossier.candidat?.numero_candidat && (
                  <Typography variant="caption" color="text.secondary">{selectedDossier.candidat.numero_candidat}</Typography>
                )}
              </Box>
              <Box sx={{ flex: '1 1 140px' }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Statut actuel</Typography>
                <Chip
                  label={selectedDossier.statut_libelle ?? selectedDossier.statut ?? '—'}
                  size="small"
                  color={canNotify(selectedDossier) ? 'info' : 'warning'}
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>
              <Box sx={{ flex: '1 1 140px' }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Type de demande</Typography>
                <Typography variant="body2">{selectedDossier.type_demande?.name ?? '—'}</Typography>
              </Box>
            </Stack>

            {/* Numéro de téléphone — éditable */}
            <Box mb={2.5}>
              {(() => {
                const originalPhone = candidatPhone(selectedDossier);
                const isModified = overridePhone.trim() !== originalPhone.trim();
                const isInvalid  = overridePhone.trim() !== '' && !/^\+?[0-9]{8,15}$/.test(overridePhone.trim());
                return (
                  <TextField
                    label="Numéro de téléphone destinataire"
                    value={overridePhone}
                    onChange={(e) => setOverridePhone(e.target.value)}
                    size="small"
                    fullWidth
                    error={isInvalid}
                    helperText={
                      isInvalid
                        ? 'Numéro invalide (ex: 077804665 ou +24177804665)'
                        : isModified
                          ? 'Numéro modifié — sera envoyé tel quel'
                          : originalPhone
                            ? 'Numéro du dossier — sera envoyé tel quel'
                            : 'Aucun numéro dans le dossier — saisissez-en un'
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DevicePhoneMobileIcon style={{ width: 17, color: isModified ? '#1976d2' : '#888' }} />
                        </InputAdornment>
                      ),
                      endAdornment: isModified && originalPhone ? (
                        <InputAdornment position="end">
                          <Tooltip title="Restaurer le numéro du dossier">
                            <IconButton size="small" onClick={() => setOverridePhone(originalPhone)}>
                              <ArrowUturnRightIcon style={{ width: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ) : undefined,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderColor: isModified ? 'primary.main' : undefined,
                      },
                    }}
                  />
                );
              })()}
            </Box>

            {/* Aperçu du message */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: 'background.paper' }}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <InformationCircleIcon style={{ width: 18, color: '#1976d2', flexShrink: 0, marginTop: 2 }} />
                <Box>
                  <Typography variant="caption" fontWeight={700} color="primary.main" display="block" mb={0.5}>
                    Message envoyé (généré par le serveur)
                  </Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                    « DGTT: Votre carte est disponible. Vous pouvez la retirer au centre :{' '}
                    <strong>{selectedDossier.formation?.type_permis?.libelle ?? 'votre centre d\'enregistrement'}</strong>. »
                  </Typography>
                  <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
                    Tronqué à 160 caractères · Statut passera à <strong>CARTE_DISPONIBLE_AU_CENTRE</strong> si Airtel confirme l'envoi.
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {/* Bouton principal : Envoyer ou Réessayer */}
              <Button
                variant="contained"
                color={isAirtelError ? 'warning' : 'primary'}
                size="large"
                onClick={() => void handleConfirmNotify()}
                disabled={notifying || (overridePhone.trim() !== '' && !/^\+?[0-9]{8,15}$/.test(overridePhone.trim()))}
                startIcon={
                  notifying
                    ? <CircularProgress size={18} color="inherit" />
                    : isAirtelError
                      ? <ArrowUturnRightIcon style={{ width: 18 }} />
                      : <PaperAirplaneIcon style={{ width: 18 }} />
                }
              >
                {notifying
                  ? 'Envoi en cours…'
                  : isAirtelError
                    ? `Réessayer${retryCount > 1 ? ` (${retryCount})` : ''}`
                    : 'Envoyer la notification'}
              </Button>

              <Button variant="outlined" color="inherit" disabled={notifying}
                onClick={() => { setSelectedDossier(null); setOverridePhone(''); setNotifyError(null); setIsAirtelError(false); setRetryCount(0); }}>
                {isAirtelError ? 'Fermer' : 'Annuler'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      )}

      {/* ── Formulaire SMS libre ───────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={2.5}>
          <DevicePhoneMobileIcon style={{ width: 20, color: '#666' }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>Envoi SMS libre</Typography>
            <Typography variant="caption" color="text.secondary">
              Saisissez un numéro et un message personnalisé — indépendant des dossiers.
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 2.5 }} />

        {smsSuccess && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSmsSuccess(null)}>{smsSuccess}</Alert>}
        {smsError   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setSmsError(null)}>{smsError}</Alert>}

        <form onSubmit={(e) => void handleSendSms(e)}>
          <Stack spacing={2.5}>
            <TextField
              label="Numéro de téléphone" placeholder="077804665 ou +24177804665"
              value={numero} onChange={(e) => setNumero(e.target.value)}
              required fullWidth error={isPhoneInvalid}
              helperText={
                isPhoneInvalid
                  ? 'Numéro invalide (ex: 077804665 ou +24177804665)'
                  : numero.trim()
                    ? `Sera envoyé comme : ${normalizeGabonPhone(numero.trim())}`
                    : 'Format local (077…) ou international (+241…)'
              }
              InputProps={{ startAdornment: (
                <InputAdornment position="start">
                  <DevicePhoneMobileIcon style={{ width: 18, color: '#888' }} />
                </InputAdornment>
              )}}
            />

            <Box>
              <TextField
                label="Message" value={message}
                onChange={(e) => { if (e.target.value.length <= SMS_MAX_LENGTH) setMessage(e.target.value); }}
                required fullWidth multiline rows={4} error={isOverLimit}
                inputProps={{ maxLength: SMS_MAX_LENGTH }}
                helperText={
                  <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{isOverLimit ? `Dépassement de ${-charsLeft} caractère(s)` : 'Limite Airtel : 160 caractères'}</span>
                    <Tooltip title={`${message.length} / ${SMS_MAX_LENGTH} caractères`}>
                      <span style={{ fontWeight: 600, color: charsLeft <= 10 ? '#d32f2f' : charsLeft <= 30 ? '#ed6c02' : '#1976d2' }}>
                        {charsLeft} restants
                      </span>
                    </Tooltip>
                  </Box>
                }
              />
              <LinearProgress variant="determinate" value={charPercent} sx={{
                mt: 0.5, height: 4, borderRadius: 2, bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': { bgcolor: charPercent >= 100 ? 'error.main' : charPercent >= 80 ? 'warning.main' : 'primary.main' },
              }} />
            </Box>

            {/* Modèles rapides */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
                Modèles rapides
              </Typography>
              {[DEFAULT_SMS,
                'Bonne nouvelle ! Votre carte de permis est prête. Venez la retirer muni de votre reçu de paiement.',
              ].map((s) => (
                <Typography key={s} variant="caption" color="text.secondary" display="block"
                  sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' }, mb: 0.3 }}
                  onClick={() => setMessage(s)}>
                  → {s}
                </Typography>
              ))}
            </Box>

            <Button type="submit" variant="contained" disabled={!canSend} sx={{ alignSelf: 'flex-start' }}
              startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <PaperAirplaneIcon style={{ width: 18 }} />}>
              {sending ? 'Envoi en cours…' : 'Envoyer le SMS'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default DistributionSmsPage;
