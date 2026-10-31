import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  TextField,
  Stack,
  Box,
  Typography,
  CircularProgress,
  Chip
} from '@mui/material';
import { ValidationDialogState } from '../types/circuit-etapes.types';
import axiosClient from '../../../shared/utils/axiosConfig';

interface ValidationDialogProps {
  open: boolean;
  validationDialog: ValidationDialogState;
  updatingDocument: string | null;
  onClose: () => void;
  onSave: (overrides?: { valide?: boolean }) => void;
  onValideChange: (valide: boolean) => void;
  onCommentairesChange: (commentaires: string) => void;
}

const getDocumentPreviewUrl = async (document: any): Promise<string | null> => {
  if (!document?.id) return null;
  // Document simulé (localStorage) : prévisualisation depuis simulated_document_files
  if (document.id.startsWith('sim_')) {
    try {
      const stored = localStorage.getItem('simulated_document_files');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      const fileData = parsed[document.id];
      if (!fileData?.base64) return null;
      const type = fileData.type || document.type_mime || 'application/octet-stream';
      return `data:${type};base64,${fileData.base64}`;
    } catch {
      return null;
    }
  }
  const endpoints = [
    { url: `/documents/${document.id}`, headers: { Accept: 'application/pdf,application/octet-stream,*/*' } },
    { url: `/documents/${document.id}/download`, headers: {} },
    { url: `/documents/${document.id}/file`, headers: {} },
    ...(document.chemin_fichier ? [{ url: `/storage/${document.chemin_fichier}`, headers: {} as Record<string, string> }] : []),
    ...(document.chemin_fichier ? [{ url: `/files/${document.chemin_fichier}`, headers: {} as Record<string, string> }] : []),
  ];
  for (const endpoint of endpoints) {
    try {
      const response = await axiosClient.get(endpoint.url, {
        responseType: 'blob',
        headers: endpoint.headers,
      });
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('application/json')) continue;
      if (response.data instanceof Blob && response.data.size > 0) {
        const rawType = response.headers['content-type'] || document.type_mime || '';
        const isPdf = rawType.includes('pdf') || document?.type_mime?.toLowerCase?.().includes?.('pdf');
        const blobType = isPdf ? 'application/pdf' : (rawType || 'application/octet-stream');
        const blob = new Blob([response.data], { type: blobType });
        return URL.createObjectURL(blob);
      }
    } catch {
      continue;
    }
  }
  return null;
};

export const ValidationDialog: React.FC<ValidationDialogProps> = ({
  open,
  validationDialog,
  updatingDocument,
  onClose,
  onSave,
  onValideChange,
  onCommentairesChange,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const { document: doc, piece } = validationDialog;

  const revokeIfBlob = (url: string | null) => {
    if (url && typeof url === 'string' && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };
  useEffect(() => {
    if (!open || !doc?.id) {
      revokeIfBlob(previewUrlRef.current);
      previewUrlRef.current = null;
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    getDocumentPreviewUrl(doc)
      .then((url) => {
        if (cancelled) {
          revokeIfBlob(url);
          return;
        }
        revokeIfBlob(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
      revokeIfBlob(previewUrlRef.current);
      previewUrlRef.current = null;
      setPreviewUrl(null);
    };
  }, [open, doc?.id]);

  const handleValider = () => {
    onValideChange(true);
    onSave({ valide: true });
  };

  const handleRejeter = () => {
    onValideChange(false);
    onSave({ valide: false });
  };

  // Document déjà validé (true, 1, "true") → ne pas afficher les boutons Valider / Rejeter
  const isDocValidated = doc && (
    doc.valide === true || doc.valide === 1 || doc.valide === 'true' ||
    (typeof doc.valide === 'boolean' && doc.valide) || (typeof doc.valide === 'number' && doc.valide !== 0)
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '95vh',
          maxHeight: '95vh',
          height: '95vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <DialogTitle>
        {doc ? `Vérification : ${doc.nom || doc.nom_fichier || 'Document'}` : 'Vérification du document'}
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, p: 0, overflow: 'hidden' }}>
        {/* Aperçu du document (pleine largeur, hauteur maximale pour le PDF) */}
        <Box
          sx={{
            flex: 1,
            minHeight: '70vh',
            borderBottom: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            bgcolor: 'grey.100',
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'stretch',
          }}
        >
          {loadingPreview && (
            <Stack alignItems="center" spacing={1}>
              <CircularProgress size={32} />
              <Typography variant="caption" color="text.secondary">
                Chargement de l'aperçu...
              </Typography>
            </Stack>
          )}
          {!loadingPreview && previewUrl && (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 1,
              }}
            >
              {(() => {
                const isPdf = doc?.type_mime === 'application/pdf' || doc?.type_mime?.toLowerCase?.().includes?.('pdf');
                const isImage = doc?.type_mime?.startsWith('image/');
                // PDF : iframe pleine hauteur pour afficher le PDF complet
                if (isPdf || !isImage) {
                  return (
                    <iframe
                      title="Aperçu du document"
                      src={previewUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        minHeight: '65vh',
                        border: 'none',
                        flex: 1,
                      }}
                    />
                  );
                }
                return (
                  <img
                    src={previewUrl}
                    alt="Aperçu du document"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                );
              })()}
            </Box>
          )}
          {!loadingPreview && !previewUrl && doc && (
            <Typography variant="body2" color="text.secondary">
              Aperçu non disponible pour ce document
            </Typography>
          )}
        </Box>
      </DialogContent>
      {/* Pied de page : infos + commentaires + boutons de validation */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          p: 2,
          bgcolor: 'background.paper',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'flex-end',
        }}
      >
        {doc && (
          <>
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flex: '1 1 200px', minWidth: 0, flexWrap: 'wrap' }}>
              {piece != null && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Pièce justificative
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" fontWeight={500}>
                      {piece.libelle || piece.type_document || '—'}
                    </Typography>
                    {piece.obligatoire && (
                      <Chip label="Obligatoire" size="small" color="error" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}
                  </Stack>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Nom du fichier
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {doc.nom || doc.nom_fichier || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Statut actuel
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={500}
                  color={validationDialog.valide ? 'success.main' : 'text.secondary'}
                >
                  {validationDialog.valide ? 'Validé' : 'Non validé / Rejeté'}
                </Typography>
              </Box>
            </Box>
            <TextField
              label="Commentaires"
              multiline
              maxRows={2}
              minRows={1}
              value={validationDialog.commentaires}
              onChange={(e) => onCommentairesChange(e.target.value)}
              placeholder="Commentaires optionnels..."
              variant="outlined"
              size="small"
              sx={{ flex: '1 1 240px', minWidth: 200, maxWidth: 400 }}
            />
            <Stack direction="row" spacing={1} flexShrink={0}>
              {!isDocValidated && (
                <>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleValider}
                    disabled={updatingDocument !== null}
                  >
                    {updatingDocument ? 'Enregistrement...' : 'Valider'}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleRejeter}
                    disabled={updatingDocument !== null}
                  >
                    {updatingDocument ? 'Suppression...' : 'Rejeter et supprimer'}
                  </Button>
                </>
              )}
              <Button onClick={onClose} color="inherit">
                {isDocValidated ? 'Fermer' : 'Annuler'}
              </Button>
            </Stack>
          </>
        )}
      </Box>
    </Dialog>
  );
};
