import React, { useEffect, useState } from 'react';
import { Box, Button, Skeleton, Typography } from '@mui/material';
import { DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { fetchDocumentAsBlob, handleViewDocument } from '../utils/documentHandlers';

function isImageMime(m: string) {
  return /^image\//i.test(m || '');
}

function isPdfMime(m: string) {
  return /^application\/pdf$/i.test(m || '');
}

export interface TraitementDocumentPreviewProps {
  document: any;
  maxHeight?: number;
}

/**
 * Aperçu inline (image ou PDF) après chargement authentifié du fichier.
 */
export const TraitementDocumentPreview: React.FC<TraitementDocumentPreviewProps> = ({
  document: doc,
  maxHeight = 280,
}) => {
  const [preview, setPreview] = useState<{ url: string; mime: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setFailed(false);
      setPreview(null);

      try {
        const result = await fetchDocumentAsBlob(doc);

        if (cancelled) return;

        if (!result) {
          setFailed(true);
          setLoading(false);
          return;
        }

        objectUrl = URL.createObjectURL(result.blob);

        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setPreview({
          url: objectUrl,
          mime: result.contentType,
        });

        setLoading(false);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [doc?.id]);

  if (loading) {
    return (
      <Skeleton
        variant="rounded"
        height={maxHeight}
        sx={{
          borderRadius: 1,
          width: '100%',
          flexShrink: 0,
        }}
      />
    );
  }

  if (failed || !preview) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: Math.min(160, maxHeight),
          borderRadius: 1,
          border: '1px dashed',
          borderColor: 'divider',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          py: 2,
          px: 2,
          bgcolor: (t) =>
            t.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
        }}
      >
        <DocumentMagnifyingGlassIcon
          className="w-10 h-10"
          style={{ opacity: 0.45 }}
        />

        <Typography
          variant="caption"
          color="text.secondary"
          textAlign="center"
        >
          Aperçu indisponible (document local ou en cours de synchronisation).
        </Typography>

        {doc?.id && !String(doc.id).startsWith('sim_') && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleViewDocument(doc)}
            sx={{ textTransform: 'none' }}
          >
            Ouvrir le fichier
          </Button>
        )}
      </Box>
    );
  }

  if (isImageMime(preview.mime)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight,
          width: '100%',
          flexShrink: 0,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: (t) =>
            t.palette.mode === 'dark' ? 'grey.900' : 'grey.100',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <img
          src={preview.url}
          alt={doc?.nom_fichier || doc?.nom || 'Aperçu'}
          style={{
            maxWidth: '100%',
            maxHeight,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </Box>
    );
  }

  if (isPdfMime(preview.mime)) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: maxHeight,
          width: '100%',
          flexShrink: 0,
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.900',
        }}
      >
        <iframe
          title={doc?.nom_fichier || doc?.nom || 'PDF'}
          src={`${preview.url}#toolbar=0&navpanes=0`}
          width="100%"
          height="100%"
          style={{
            border: 'none',
            display: 'block',
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
        width: '100%',
        flexShrink: 0,
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        p: 2,
      }}
    >
      <Button
        variant="outlined"
        onClick={() => handleViewDocument(doc)}
        sx={{ textTransform: 'none' }}
      >
        Ouvrir le fichier ({preview.mime || 'type inconnu'})
      </Button>
    </Box>
  );
};