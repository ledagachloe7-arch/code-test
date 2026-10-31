import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Stack,
  Tooltip,
  CircularProgress,
  alpha,
  useTheme,
  Card,
  CardContent,
} from '@mui/material';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { PieceEtape, EtapeCircuit } from '../services/circuit-suivi.api';
import { TraitementDocumentPreview } from './TraitementDocumentPreview';
import { handleViewDocument, handleDownloadDocument } from '../utils/documentHandlers';

interface PieceCardProps {
  piece: PieceEtape;
  etape: EtapeCircuit;
  typeDocName: string;
  docsForType: any[];
  isValidated: boolean;
  isUploading: boolean;
  isEtapeAccessible: boolean;
  authorized?: boolean;
  dossierId?: string;
  onUpdateDocument?: (documentId: string, data: { valide: boolean; commentaires?: string }) => Promise<void>;
  onOpenValidationDialog?: (doc: any, piece?: PieceEtape) => void;
  onUploadClick: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
}

type AdminPieceState =
  | 'valide'
  | 'attente_controle'
  | 'manquant_obligatoire'
  | 'manquant_facultatif'
  | 'verrouille';

function resolvePieceState(
  isEtapeAccessible: boolean,
  isValidated: boolean,
  hasDoc: boolean,
  obligatoire: boolean
): AdminPieceState {
  if (!isEtapeAccessible) return 'verrouille';
  if (isValidated) return 'valide';
  if (hasDoc) return 'attente_controle';
  if (obligatoire) return 'manquant_obligatoire';
  return 'manquant_facultatif';
}

const isValideTruthy = (v: unknown) =>
  v === true || v === 1 || v === 'true' || (typeof v === 'boolean' && v) || (typeof v === 'number' && v !== 0);

export const TraitementPieceCard: React.FC<PieceCardProps> = ({
  piece,
  etape,
  typeDocName,
  docsForType,
  isValidated,
  isUploading,
  isEtapeAccessible,
  authorized = true,
  dossierId,
  onUpdateDocument,
  onOpenValidationDialog,
  onUploadClick,
  onFileSelect,
  fileInputRef,
}) => {
  const theme = useTheme();
  const hasDoc = docsForType.length > 0;
  const state = resolvePieceState(isEtapeAccessible, isValidated, hasDoc, piece.obligatoire);
  const hideUpload = isValidated || hasDoc;
  const canVerify = Boolean(onOpenValidationDialog && onUpdateDocument && authorized);

  const { rowBg, statusChip, topBarColor } = useMemo(() => {
    const subtle = (color: string) =>
      theme.palette.mode === 'dark' ? alpha(color, 0.12) : alpha(color, 0.08);

    switch (state) {
      case 'valide':
        return {
          rowBg: subtle(theme.palette.success.main),
          topBarColor: theme.palette.success.main,
          statusChip: {
            label: 'Conforme',
            color: 'success' as const,
            icon: <CheckCircleIcon className="w-3.5 h-3.5" />,
          },
        };
      case 'attente_controle':
        return {
          rowBg: subtle(theme.palette.warning.main),
          topBarColor: theme.palette.warning.main,
          statusChip: {
            label: 'Attente de contrôle',
            color: 'warning' as const,
            icon: <ClockIcon className="w-3.5 h-3.5" />,
          },
        };
      case 'manquant_obligatoire':
        return {
          rowBg: subtle(theme.palette.error.main),
          topBarColor: theme.palette.error.main,
          statusChip: {
            label: 'Pièce exigée — non fournie',
            color: 'error' as const,
            icon: <ExclamationCircleIcon className="w-3.5 h-3.5" />,
          },
        };
      case 'manquant_facultatif':
        return {
          rowBg: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.04) : theme.palette.grey[50],
          topBarColor: theme.palette.divider,
          statusChip: {
            label: 'Facultatif — non fourni',
            color: 'default' as const,
            icon: <DocumentTextIcon className="w-3.5 h-3.5" />,
          },
        };
      case 'verrouille':
      default:
        return {
          rowBg: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.03) : theme.palette.grey[100],
          topBarColor: theme.palette.action.disabled,
          statusChip: {
            label: 'Étape non accessible',
            color: 'default' as const,
            icon: <LockClosedIcon className="w-3.5 h-3.5" />,
          },
        };
    }
  }, [state, theme]);

  const exigenceChip = piece.obligatoire
    ? { label: 'Exigence obligatoire', color: 'error' as const, variant: 'outlined' as const }
    : { label: 'Exigence facultative', color: 'default' as const, variant: 'outlined' as const };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    const single = files[0];
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(single.type) && !/\.(pdf|jpe?g|png)$/i.test(single.name)) return;
    const dt = new DataTransfer();
    dt.items.add(single);
    onFileSelect({ target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '100%',
        borderRadius: 2,
        bgcolor: rowBg,
        opacity: state === 'verrouille' ? 0.88 : 1,
        borderTop: 3,
        borderTopColor: topBarColor,
        borderLeftColor: 'divider',
        borderRightColor: 'divider',
        borderBottomColor: 'divider',
        boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.06)',
        transition: theme.transitions.create(['box-shadow'], { duration: 200 }),
        '&:hover': {
          boxShadow: state === 'verrouille' ? undefined : theme.palette.mode === 'dark' ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
        },
      }}
    >
      <CardContent
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          p: 2,
          '&:last-child': { pb: 2 },
        }}
      >
        <Stack spacing={2} sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {/* En-tête */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            <Box sx={{ flex: '1 1 200px', minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.25 }}>
                <DocumentTextIcon className="w-5 h-5 shrink-0" style={{ opacity: 0.75 }} />
                <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: 0.1 }} noWrap title={typeDocName}>
                  {typeDocName}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 4 }}>
                Étape : {etape.libelle || '—'}
                {piece.libelle && piece.libelle !== typeDocName ? ` · ${piece.libelle}` : ''}
              </Typography>
            </Box>
            <Stack direction="row" flexWrap="wrap" spacing={0.75} alignItems="center">
              <Chip
                size="small"
                label={exigenceChip.label}
                color={exigenceChip.color}
                variant={exigenceChip.variant}
                sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600 }}
              />
              <Chip
                size="small"
                icon={statusChip.icon}
                label={statusChip.label}
                color={statusChip.color}
                variant={state === 'manquant_facultatif' || state === 'verrouille' ? 'outlined' : 'filled'}
                sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600, '& .MuiChip-icon': { ml: 0.75 } }}
              />
            </Stack>
          </Box>

          {/* Zone dépôt verticale (carte en pointillés) ou aperçu + actions */}
          {hasDoc ? (
            <Stack spacing={1.5} sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              {docsForType.map((doc: any) => (
                <Card
                  key={doc.id}
                  variant="outlined"
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxWidth: '100%',
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.04) : 'background.paper',
                  }}
                >
                  <CardContent
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      p: 2,
                      '&:last-child': { pb: 2 },
                    }}
                  >
                    <Stack spacing={1.5} sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <TraitementDocumentPreview document={doc} maxHeight={220} />
                      <Typography variant="body2" color="text.secondary" noWrap title={doc.nom_fichier || doc.nom}>
                        {doc.nom_fichier || doc.nom || 'Document'}
                      </Typography>
                      <Stack
                        direction="row"
                        flexWrap="wrap"
                        gap={1}
                        alignItems="center"
                        sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}
                      >
                        <Chip
                          size="small"
                          label={isValideTruthy(doc.valide) ? 'Contrôlé — accepté' : 'Déposé — à contrôler'}
                          color={isValideTruthy(doc.valide) ? 'success' : 'warning'}
                          variant="outlined"
                        />
                        {doc?.id && !String(doc.id).startsWith('sim_') && (
                          <>
                            <Button size="small" variant="outlined" onClick={() => handleViewDocument(doc)} sx={{ textTransform: 'none' }}>
                              Plein écran
                            </Button>
                            <Button size="small" variant="text" onClick={() => handleDownloadDocument(doc)} sx={{ textTransform: 'none' }}>
                              Télécharger
                            </Button>
                          </>
                        )}
                        {canVerify && (
                          <Button
                            variant="contained"
                            size="small"
                            color={isValideTruthy(doc.valide) ? 'success' : 'primary'}
                            onClick={() => onOpenValidationDialog!(doc, piece)}
                            disabled={!isEtapeAccessible}
                            sx={{ textTransform: 'none', fontWeight: 600, boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}
                          >
                            {isValideTruthy(doc.valide) ? 'Modifier le contrôle' : 'Contrôler'}
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                {state === 'verrouille'
                  ? "Dépôt indisponible tant que l'étape précédente n'est pas validée."
                  : piece.obligatoire
                    ? 'Déposez le fichier requis ci-dessous (PDF, JPG ou PNG).'
                    : 'Vous pouvez joindre un fichier facultatif ci-dessous.'}
              </Typography>
              {dossierId && authorized && isEtapeAccessible && !hideUpload && (
                <Card
                  variant="outlined"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={handleDrop}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    borderStyle: 'dashed',
                    borderWidth: 2,
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.03) : 'grey.50',
                  }}
                >
                  <CardContent
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      py: 3,
                      px: 1.5,
                      textAlign: 'center',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={onFileSelect}
                      disabled={!isEtapeAccessible}
                    />
                    <CloudArrowUpIcon className="w-12 h-12" style={{ opacity: 0.35 }} />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Glisser-déposer ou choisir un fichier
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        PDF, JPG ou PNG — un seul fichier par pièce
                      </Typography>
                    </Box>
                    <Tooltip
                      title={
                        isEtapeAccessible
                          ? `Téléverser pour : ${typeDocName}`
                          : "Complétez d'abord l'étape précédente."
                      }
                    >
                      <span>
                        <Button
                          variant="contained"
                          size="medium"
                          startIcon={isUploading ? <CircularProgress size={18} color="inherit" /> : <CloudArrowUpIcon className="w-5 h-5" />}
                          onClick={onUploadClick}
                          disabled={!isEtapeAccessible || isUploading || !dossierId}
                          sx={{ textTransform: 'none', fontWeight: 700, px: 3 }}
                        >
                          {isUploading ? 'Téléversement…' : 'Choisir un fichier'}
                        </Button>
                      </span>
                    </Tooltip>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
