import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Stack,
  Tooltip,
  IconButton,
  CircularProgress
} from '@mui/material';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { PieceEtape, EtapeCircuit } from '../services/circuit-suivi.service';

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

export const PieceCard: React.FC<PieceCardProps> = ({
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
  fileInputRef
}) => {
  // Considérer validé : true, 1, "true" (API peut renvoyer différents types)
  const isValideTruthy = (v: unknown) =>
    v === true || v === 1 || v === 'true' || (typeof v === 'boolean' && v) || (typeof v === 'number' && v !== 0);
  // Masquer le bouton Upload si un document existe déjà (validé ou en attente) : on n'autorise qu'un document par pièce
  const hideUpload = isValidated || docsForType.length > 0;

  return (
    <Box
      sx={{
        p: 1.5,
        border: '1px solid',
        borderColor: isValidated ? 'success.main' : piece.obligatoire ? 'error.main' : 'warning.main',
        borderRadius: 1,
        backgroundColor: isValidated ? 'success.50' : piece.obligatoire ? 'error.50' : 'warning.50',
        opacity: isEtapeAccessible ? 1 : 0.6
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="body2" fontWeight="medium" className="font-primary">
              {typeDocName}
            </Typography>
            {piece.obligatoire && (
              <Chip 
                label="Obligatoire" 
                size="small" 
                color="error"
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            )}
            {isValidated && (
              <Chip 
                label="Validé" 
                size="small" 
                color="success"
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Box>
          {docsForType.length > 0 ? (
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              {docsForType.map((doc: any) => (
                <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <Typography variant="caption" className="font-primary">
                      • {doc.nom || doc.nom_fichier}
                    </Typography>
                    {doc.valide ? (
                      <Chip 
                        label="Validé" 
                        size="small" 
                        color="success"
                        sx={{ height: 16, fontSize: '0.6rem' }}
                      />
                    ) : (
                      <Chip 
                        label="En attente" 
                        size="small" 
                        color="warning"
                        sx={{ height: 16, fontSize: '0.6rem' }}
                      />
                    )}
                  </Box>
                  {onUpdateDocument && onOpenValidationDialog && authorized && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => onOpenValidationDialog(doc, piece)}
                      disabled={!isEtapeAccessible}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        color: doc.valide ? 'success.main' : 'primary.main',
                        opacity: isEtapeAccessible ? 1 : 0.5,
                        minWidth: 'auto',
                        px: 1
                      }}
                    >
                      Vérifier
                    </Button>
                  )}
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary" className="font-primary">
              Aucun document fourni
            </Typography>
          )}
        </Box>
        {/* Masquer le bouton Upload quand tous les documents de la pièce sont validés */}
        {dossierId && authorized && isEtapeAccessible && !hideUpload && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={onFileSelect}
              disabled={!isEtapeAccessible}
            />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title={isEtapeAccessible ? `Téléverser un document pour ${typeDocName}` : "Complétez d'abord l'étape précédente"}>
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={isUploading ? <CircularProgress size={14} /> : <CloudArrowUpIcon className="w-4 h-4" />}
                    onClick={onUploadClick}
                    disabled={!isEtapeAccessible || isUploading || !dossierId}
                    sx={{ 
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      minWidth: 'auto',
                      px: 1.5,
                      opacity: isEtapeAccessible ? 1 : 0.6
                    }}
                  >
                    {isUploading ? 'Téléversement...' : 'Téléverser document'}
                  </Button>
                </span>
              </Tooltip>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

