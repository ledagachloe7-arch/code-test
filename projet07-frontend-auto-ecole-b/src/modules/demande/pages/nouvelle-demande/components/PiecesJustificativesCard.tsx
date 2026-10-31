import React from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { TraitementDocumentPreview } from '../../../../reception/traitement-dossier/components/TraitementDocumentPreview';

interface ExpectedPieceLike {
  id: string;
  pieceJustificationUploadId: string;
  typeDocument?: string;
  libelle: string;
  etape_libelle?: string;
  obligatoire: boolean;
}

interface UploadedDocLike {
  nom_fichier?: string;
  nom?: string;
  taille_fichier?: number;
}

interface PiecesJustificativesCardProps {
  createdDossierId: string;
  expectedPieces: ExpectedPieceLike[];
  hasTypeDemande: boolean;
  loadingExpectedPieces: boolean;
  loadingUploadedDocuments: boolean;
  uploadedDocuments: unknown[];
  uploadingPieceId: string | null;
  uploadFeedback: string | null;
  onClearUploadFeedback: () => void;
  onUploadForPiece: (piece: ExpectedPieceLike, event: React.ChangeEvent<HTMLInputElement>) => Promise<void> | void;
  resolveDocForPiece: (uploaded: unknown[], piece: ExpectedPieceLike, dossierId: string) => UploadedDocLike | null;
  formatFileSize: (size: number) => string;
}

const PiecesJustificativesCard: React.FC<PiecesJustificativesCardProps> = ({
  createdDossierId,
  expectedPieces,
  hasTypeDemande,
  loadingExpectedPieces,
  loadingUploadedDocuments,
  uploadedDocuments,
  uploadingPieceId,
  uploadFeedback,
  onClearUploadFeedback,
  onUploadForPiece,
  resolveDocForPiece,
  formatFileSize,
}) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2.25,
      mb: { xs: 0, lg: 2 },
    }}
  >
    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
      Pièces justificatives
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Téléversez les documents du dossier créé.
    </Typography>

    {!createdDossierId && (
      <Alert severity="info" sx={{ mb: 2 }}>
        Créez d'abord le dossier pour activer le téléversement.
      </Alert>
    )}

    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
      Pièces attendues ({expectedPieces.length})
    </Typography>
    {!hasTypeDemande ? (
      <Alert severity="info" sx={{ mb: 1.5 }}>
        Sélectionnez un type de demande pour charger automatiquement le circuit et ses pièces justificatives.
      </Alert>
    ) : loadingExpectedPieces ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
        <CircularProgress size={18} />
      </Box>
    ) : expectedPieces.length === 0 ? (
      <Alert severity="warning" sx={{ mb: 1.5 }}>
        Aucune pièce liée au circuit du type de demande n'a été trouvée.
      </Alert>
    ) : (
      <Stack spacing={2} sx={{ mb: 1, pr: 0.5 }}>
        {expectedPieces.map((p) => {
          const docPourPiece =
            createdDossierId != null && createdDossierId !== '' ? resolveDocForPiece(uploadedDocuments, p, createdDossierId) : null;
          const estTeleverse = Boolean(docPourPiece);
          const busy = uploadingPieceId === p.id;
          return (
            <Paper key={p.id} variant="outlined" sx={{ p: 1.5, overflow: 'hidden' }}>
              <Stack spacing={1.25}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ display: 'block' }}>
                      {p.libelle}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {p.etape_libelle ?? 'Étape non renseignée'} {p.obligatoire ? '• Obligatoire' : '• Optionnel'}
                    </Typography>
                  </Box>
                  {estTeleverse ? (
                    <Chip size="small" color="success" label="Document téléversé" sx={{ flexShrink: 0 }} />
                  ) : (
                    <Chip size="small" variant="outlined" label="En attente du fichier" color="warning" sx={{ flexShrink: 0 }} />
                  )}
                </Stack>

                <Box
                  sx={{
                    borderRadius: 1,
                    bgcolor: estTeleverse ? 'action.hover' : 'grey.50',
                    border: '1px dashed',
                    borderColor: estTeleverse ? 'success.light' : 'divider',
                    minHeight: 140,
                    overflow: 'hidden',
                  }}
                >
                  {docPourPiece ? (
                    <TraitementDocumentPreview document={docPourPiece} maxHeight={220} />
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 140,
                        py: 2,
                        px: 1,
                        color: 'text.secondary',
                      }}
                    >
                      <CloudArrowUpIcon style={{ width: 32, opacity: 0.45 }} />
                      <Typography variant="caption" align="center" sx={{ mt: 0.5 }}>
                        Aucun fichier pour cette pièce
                      </Typography>
                    </Box>
                  )}
                </Box>

                {createdDossierId && (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      component="label"
                      disabled={busy}
                      startIcon={
                        busy ? <CircularProgress size={14} color="inherit" /> : <CloudArrowUpIcon style={{ width: 16 }} />
                      }
                      sx={{ cursor: busy ? 'default' : 'pointer' }}
                    >
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        hidden
                        onChange={(e) => void onUploadForPiece(p, e)}
                      />
                      {busy ? 'Téléversement…' : estTeleverse ? 'Remplacer le fichier' : 'Choisir un fichier'}
                    </Button>
                    {typeof docPourPiece?.taille_fichier === 'number' && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {docPourPiece?.nom_fichier ?? docPourPiece?.nom ?? 'Document'} • {formatFileSize(docPourPiece.taille_fichier)}
                      </Typography>
                    )}
                  </>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>
    )}

    {createdDossierId && !loadingUploadedDocuments && expectedPieces.length > 0 && (
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Dossier : {createdDossierId} · PDF, JPG, PNG (max. 5 Mo par fichier)
      </Typography>
    )}

    {uploadFeedback && (
      <Alert severity={uploadFeedback.toLowerCase().includes('erreur') ? 'error' : 'success'} sx={{ mt: 1.5 }} onClose={onClearUploadFeedback}>
        {uploadFeedback}
      </Alert>
    )}
  </Paper>
);

export default PiecesJustificativesCard;

