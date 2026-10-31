import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, Card, CardContent, Chip, Button,
  Dialog, DialogTitle, DialogContent, IconButton, Skeleton, Fade,
  TextField, CircularProgress, Divider, Tooltip,
  FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Alert,
  DialogActions,
} from '@mui/material';
import { Description, Close, CloudUpload, AttachFile, WifiOff, ZoomIn, PictureAsPdf, Image as ImageIcon, CheckCircle, Delete, SwapHoriz } from '@mui/icons-material';
import toast from 'react-hot-toast';
import axiosClient from '../../../../../shared/utils/axiosConfig';
import { Dossier } from '../../../types/auto-ecole';
import { Document, PieceJustificative } from '../types';
import { getTypePermisLabel, getTypeDemandeName, getTypeDemandeDisplayName, formatDate } from '../utils';

interface DocumentsListProps {
  documents: Document[];
  piecesJustificativesMap: Map<string, PieceJustificative>;
  candidatDossiers: Dossier[];
  selectedDossierId?: string;
  initialId?: string;
  loadingDossiers: boolean;
  referentielsCache: Map<string, any>;
  typeDemandeCache: Map<string, any>;
  onDocumentUploaded?: () => void;
}

interface PieceJustificativeItem {
  id: string;
  libelle: string;
  code?: string;
  obligatoire?: boolean;
}

interface LocalDocument {
  id: string;
  documentable_id: string;
  nom_fichier: string;
  chemin_fichier: string;
  piece_justification_id?: string;
  valide: boolean;
  date_upload: string;
  commentaires?: string;
  _local: true;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const LS_DOCS_KEY = 'simulated_documents';
const LS_FILES_KEY = 'simulated_document_files';

// ─── LocalStorage helpers ────────────────────────────────────────────────────

function loadLocalDocuments(dossierId: string): LocalDocument[] {
  try {
    const raw = localStorage.getItem(LS_DOCS_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, LocalDocument>;
    return Object.values(all).filter(d => d.documentable_id === dossierId);
  } catch {
    return [];
  }
}

async function saveToLocalStorage(
  file: File,
  dossierId: string,
  pieceId: string,
  commentaire: string,
): Promise<LocalDocument> {
  const simulatedId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const fileBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Persist file bytes
  try {
    const files = JSON.parse(localStorage.getItem(LS_FILES_KEY) || '{}');
    files[simulatedId] = { base64: fileBase64, type: file.type, name: file.name };
    localStorage.setItem(LS_FILES_KEY, JSON.stringify(files));
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError') {
      // Purge oldest half and retry
      const files = JSON.parse(localStorage.getItem(LS_FILES_KEY) || '{}');
      const keys = Object.keys(files);
      keys.slice(0, Math.ceil(keys.length / 2)).forEach(k => delete files[k]);
      localStorage.setItem(LS_FILES_KEY, JSON.stringify(files));
    }
  }

  const doc: LocalDocument = {
    id: simulatedId,
    documentable_id: dossierId,
    nom_fichier: file.name,
    chemin_fichier: `simulated/${simulatedId}`,
    piece_justification_id: pieceId,
    valide: false,
    date_upload: new Date().toISOString(),
    commentaires: commentaire || 'Document enregistré localement (Alfresco indisponible)',
    _local: true,
  };

  const docs = JSON.parse(localStorage.getItem(LS_DOCS_KEY) || '{}');
  docs[simulatedId] = doc;
  localStorage.setItem(LS_DOCS_KEY, JSON.stringify(docs));

  return doc;
}

function getLocalFileDataUrl(simulatedId: string): string | null {
  try {
    const files = JSON.parse(localStorage.getItem(LS_FILES_KEY) || '{}');
    const entry = files[simulatedId];
    if (!entry) return null;
    return `data:${entry.type};base64,${entry.base64}`;
  } catch {
    return null;
  }
}

function deleteLocalDocument(simulatedId: string): void {
  try {
    const docs = JSON.parse(localStorage.getItem(LS_DOCS_KEY) || '{}');
    delete docs[simulatedId];
    localStorage.setItem(LS_DOCS_KEY, JSON.stringify(docs));
    const files = JSON.parse(localStorage.getItem(LS_FILES_KEY) || '{}');
    delete files[simulatedId];
    localStorage.setItem(LS_FILES_KEY, JSON.stringify(files));
  } catch { /* silent */ }
}

// ─── Component ───────────────────────────────────────────────────────────────

const DocumentsList: React.FC<DocumentsListProps> = ({
  documents,
  piecesJustificativesMap: _piecesJustificativesMap,
  candidatDossiers,
  selectedDossierId,
  initialId,
  loadingDossiers,
  referentielsCache,
  typeDemandeCache,
  onDocumentUploaded,
}) => {
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | LocalDocument | null>(null);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [selectedDocMime, setSelectedDocMime] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [libelle, setLibelle] = useState('');
  const [selectedPieceId, setSelectedPieceId] = useState<string>('');
  const [piecesJustificatives, setPiecesJustificatives] = useState<PieceJustificativeItem[]>([]);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [localDocuments, setLocalDocuments] = useState<LocalDocument[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentDossierId = selectedDossierId || initialId;

  // ─── Charger pièces justificatives ──────────────────────────────────────────
  useEffect(() => {
    const fetchPieces = async () => {
      setLoadingPieces(true);
      try {
        const response = await axiosClient.get('/pieces-justificatives');
        let pieces: any[] = [];
        if (Array.isArray(response.data)) pieces = response.data;
        else if (Array.isArray(response.data?.data)) pieces = response.data.data;

        setPiecesJustificatives(
          pieces.map((p: any) => ({
            id: String(p.pieces_justificative ?? p.piece_justificative ?? p.id ?? ''),
            libelle: p.libelle || p.code || 'Sans libellé',
            code: p.code,
            obligatoire: Boolean(p.obligatoire),
          })).filter(p => p.id),
        );
      } catch {
        // Non bloquant
      } finally {
        setLoadingPieces(false);
      }
    };
    fetchPieces();
  }, []);

  // ─── Charger documents locaux quand le dossier change ─────────────────────
  useEffect(() => {
    if (currentDossierId) {
      setLocalDocuments(loadLocalDocuments(currentDossierId));
    } else {
      setLocalDocuments([]);
    }
  }, [currentDossierId]);

  const refreshLocalDocuments = () => {
    if (currentDossierId) setLocalDocuments(loadLocalDocuments(currentDossierId));
  };

  // ─── Filtrer documents API ──────────────────────────────────────────────────
  const documentsForCurrentDossier = documents.filter((doc) => {
    const docDossierId = doc.documentable_id || (doc as any).dossier_id;
    return String(docDossierId) === String(currentDossierId);
  });

  const dossierInfo = candidatDossiers.find(d => d.id === currentDossierId);
  const dossierTypePermis = dossierInfo ? getTypePermisLabel(dossierInfo, referentielsCache) : 'N/A';
  const dossierTypeDemande = dossierInfo
    ? getTypeDemandeDisplayName(getTypeDemandeName(dossierInfo, typeDemandeCache))
    : 'N/A';

  const totalDocuments = documentsForCurrentDossier.length + localDocuments.length;

  // ─── Map pieceId → document existant (API + local) ──────────────────────────
  const existingDocByPiece = new Map<string, { doc: Document | LocalDocument; isLocal: boolean }>();
  [...documentsForCurrentDossier].forEach(doc => {
    if (doc.piece_justification_id)
      existingDocByPiece.set(doc.piece_justification_id, { doc, isLocal: false });
  });
  localDocuments.forEach(doc => {
    if (doc.piece_justification_id && !existingDocByPiece.has(doc.piece_justification_id))
      existingDocByPiece.set(doc.piece_justification_id, { doc, isLocal: true });
  });

  const selectedPieceExisting = selectedPieceId ? existingDocByPiece.get(selectedPieceId) : undefined;

  // ─── Suppression d'un document ───────────────────────────────────────────────
  const handleDeleteDocument = async (doc: Document | LocalDocument, isLocal: boolean) => {
    setDeleting(true);
    try {
      if (isLocal) {
        deleteLocalDocument(doc.id);
        refreshLocalDocuments();
        toast.success('Document local supprimé');
      } else {
        await axiosClient.delete(`/documents/${doc.id}`);
        toast.success('Document supprimé');
        onDocumentUploaded?.();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  // ─── Remplacement : supprimer l'ancien puis déclencher le file picker ────────
  const handleReplaceClick = async () => {
    if (!selectedPieceExisting) { fileInputRef.current?.click(); return; }
    const { doc, isLocal } = selectedPieceExisting;
    setDeleting(true);
    try {
      if (isLocal) {
        deleteLocalDocument(doc.id);
        refreshLocalDocuments();
      } else {
        await axiosClient.delete(`/documents/${doc.id}`);
        onDocumentUploaded?.();
      }
      // Déclenche l'upload du nouveau fichier juste après la suppression
      window.setTimeout(() => fileInputRef.current?.click(), 50);
      toast.success('Document supprimé. Sélectionnez le nouveau fichier à téléverser.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // ─── Upload ─────────────────────────────────────────────────────────────────

  const handleUploadClick = () => {
    if (!currentDossierId) { toast.error('Aucun dossier sélectionné'); return; }
    if (!selectedPieceId) { toast.error('Veuillez sélectionner une pièce justificative'); return; }
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentDossierId || !selectedPieceId) return;

    const file = files[0];
    setUploading(true);

    try {
      if (file.size > MAX_SIZE) { toast.error('Le fichier ne doit pas dépasser 5 MB'); return; }
      if (!ALLOWED_TYPES.includes(file.type)) { toast.error('Format non autorisé. Utilisez PDF, JPG ou PNG'); return; }

      const cleanFileName = file.name.trim();

      const formData = new FormData();
      formData.append('documentable_id', currentDossierId);
      formData.append('documentable_type', 'App\\Models\\Dossier');
      formData.append('piece_justification_id', selectedPieceId);
      formData.append('valide', '0');
      formData.append('commentaires', libelle.trim());
      formData.append('fichier', file, cleanFileName);

      const response = await axiosClient.post('/documents', formData, {
        timeout: 300000,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success && response.data.data) {
        toast.success('Document téléversé avec succès');
        setLibelle('');
        onDocumentUploaded?.();
      }
    } catch (err: any) {
      const status = err.response?.status;
      const errorData = err.response?.data;
      const errorText = String(errorData?.error ?? errorData?.message ?? err.message ?? '');

      const isAlfrescoError =
        status === 500 &&
        (errorText.includes('cURL error') ||
          errorText.includes('Failed to connect') ||
          errorText.includes('Alfresco') ||
          errorText.includes('documentLibrary') ||
          errorText.includes('SQLSTATE'));

      if (isAlfrescoError || status === 500) {
        // ── Fallback localStorage ──────────────────────────────────────────
        try {
          await saveToLocalStorage(file, currentDossierId, selectedPieceId, libelle.trim());
          refreshLocalDocuments();
          toast.success(
            'Document enregistré localement (serveur de stockage indisponible). Il sera synchronisé ultérieurement.',
            { duration: 5000 },
          );
          setLibelle('');
          onDocumentUploaded?.();
          return;
        } catch (localErr) {
          console.warn('⚠️ Fallback localStorage échoué:', localErr);
        }
      }

      // ── Erreur affichée à l'utilisateur ───────────────────────────────
      let errorMessage = 'Erreur lors du téléversement';
      if (status === 422 && errorData?.errors) {
        errorMessage = Object.entries(errorData.errors)
          .map(([f, m]: [string, any]) => `${f.replace(/_/g, ' ')}: ${Array.isArray(m) ? m.join(', ') : m}`)
          .join('\n');
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      toast.error(errorMessage.length > 200 ? errorMessage.substring(0, 200) + '...' : errorMessage, { duration: 6000 });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // ─── Ouvrir un document (API ou local) ──────────────────────────────────────

  const fetchDocumentAsBlobObjectUrl = async (
    document: Document,
  ): Promise<{ url: string; mime: string } | null> => {
    const endpoints = [
      { url: `/documents/${document.id}`, headers: { Accept: 'application/pdf,application/octet-stream,image/*,*/*' } },
      { url: `/documents/${document.id}/download`, headers: {} as Record<string, string> },
      { url: `/documents/${document.id}/file`, headers: {} as Record<string, string> },
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await axiosClient.get(endpoint.url, {
          responseType: 'blob',
          timeout: 300000,
          headers: endpoint.headers,
        });
        const contentType = (res.headers['content-type'] || '').toLowerCase();
        // Si backend renvoie HTML/JSON, ce n'est pas un fichier affichable
        if (contentType.includes('application/json') || contentType.includes('text/html')) continue;
        if (res.data instanceof Blob && res.data.size > 0) {
          const fallbackMime = document.nom_fichier?.toLowerCase().endsWith('.pdf')
            ? 'application/pdf'
            : document.nom_fichier?.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)
              ? 'image/*'
              : 'application/octet-stream';
          const mime = contentType || fallbackMime;
          const blob = new Blob([res.data], { type: mime });
          return { url: URL.createObjectURL(blob), mime };
        }
      } catch {
        // Essayer endpoint suivant
      }
    }
    return null;
  };

  const openDocument = async (doc: Document | LocalDocument) => {
    const isLocal = (doc as LocalDocument)._local;
    if (isLocal) {
      const simId = doc.id;
      const dataUrl = getLocalFileDataUrl(simId);
      const mime = dataUrl?.startsWith('data:image/') ? 'image/*'
        : dataUrl?.startsWith('data:application/pdf') ? 'application/pdf'
          : null;
      setSelectedDocument(doc);
      setSelectedDocUrl(dataUrl);
      setSelectedDocMime(mime);
      setPdfViewerOpen(true);
    } else {
      if (selectedDocUrl?.startsWith('blob:')) URL.revokeObjectURL(selectedDocUrl);
      const preview = await fetchDocumentAsBlobObjectUrl(doc as Document);
      if (!preview) {
        toast.error('Impossible de charger le document. Le serveur de stockage est peut-être indisponible.');
        return;
      }
      setSelectedDocument(doc);
      setSelectedDocUrl(preview.url);
      setSelectedDocMime(preview.mime);
      setPdfViewerOpen(true);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Paper
      sx={{
        width: 350,
        minWidth: 350,
        height: '90%',
        overflowY: 'auto',
        borderLeft: 0,
        borderColor: 'none',
        p: 2,
        backgroundColor: 'transparent',
        borderRadius: 0,
      }}
      elevation={5}
    >
      <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
        Archive
      </Typography>

      {/* ── Zone d'ajout ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          mb: 2, p: 1.5,
          border: '1px dashed', borderColor: 'primary.light',
          borderRadius: 1, bgcolor: 'rgba(25,118,210,0.04)',
          display: 'flex', flexDirection: 'column', gap: 1,
        }}
      >
        <Typography variant="subtitle2" fontWeight="bold" color="primary">
          Ajouter un document
        </Typography>

        {/* Sélection pièce justificative */}
        <FormControl size="small" fullWidth disabled={uploading || deleting || !currentDossierId || loadingPieces}>
          <InputLabel>{loadingPieces ? 'Chargement…' : 'Pièce justificative *'}</InputLabel>
          <Select
            value={selectedPieceId}
            label={loadingPieces ? 'Chargement…' : 'Pièce justificative *'}
            onChange={(e: SelectChangeEvent) => setSelectedPieceId(e.target.value)}
          >
            {piecesJustificatives.length === 0 && !loadingPieces && (
              <MenuItem value="" disabled>Aucune pièce disponible</MenuItem>
            )}
            {piecesJustificatives.map((piece) => {
              const existing = existingDocByPiece.get(piece.id);
              return (
                <MenuItem key={piece.id} value={piece.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    {existing
                      ? <CheckCircle sx={{ fontSize: 14, color: existing.isLocal ? 'warning.main' : 'success.main', flexShrink: 0 }} />
                      : <Box sx={{ width: 14, flexShrink: 0 }} />
                    }
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>{piece.libelle}</Typography>
                    {existing && (
                      <Chip
                        label={existing.isLocal ? 'Local' : 'Uploadé'}
                        size="small"
                        color={existing.isLocal ? 'warning' : 'success'}
                        sx={{ height: 16, fontSize: '0.55rem', ml: 'auto' }}
                      />
                    )}
                    {!existing && piece.obligatoire && (
                      <Chip label="Requis" size="small" color="error"
                        sx={{ height: 16, fontSize: '0.55rem' }} />
                    )}
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        {/* Aperçu du document existant si la pièce est déjà uploadée */}
        {selectedPieceExisting && (
          <ExistingDocumentPreview
            doc={selectedPieceExisting.doc}
            isLocal={selectedPieceExisting.isLocal}
            previewUrl={
              selectedPieceExisting.isLocal
                ? getLocalFileDataUrl(selectedPieceExisting.doc.id)
                : (selectedPieceExisting.doc as Document).chemin_fichier ?? null
            }
            deleting={deleting}
            onDelete={() => setConfirmDeleteOpen(true)}
            onReplace={handleReplaceClick}
          />
        )}

        {/* Commentaire + upload — seulement si pas de doc existant */}
        {!selectedPieceExisting && (
          <>
            <TextField
              size="small" fullWidth
              placeholder="Commentaire (optionnel)"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              disabled={uploading || !currentDossierId}
              InputProps={{
                startAdornment: <AttachFile sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />,
              }}
            />
            <Tooltip title={
              !currentDossierId ? 'Sélectionnez un dossier d\'abord'
                : !selectedPieceId ? 'Choisissez d\'abord une pièce justificative'
                : 'Téléverser PDF, JPG ou PNG (max 5 MB)'
            }>
              <span>
                <Button
                  variant="contained" size="small" fullWidth
                  startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <CloudUpload />}
                  onClick={handleUploadClick}
                  disabled={uploading || !currentDossierId || !selectedPieceId || loadingPieces}
                  sx={{ textTransform: 'none' }}
                >
                  {uploading ? 'Téléversement...' : 'Choisir un fichier'}
                </Button>
              </span>
            </Tooltip>
          </>
        )}

        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
          style={{ display: 'none' }} onChange={handleFileSelect} />
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* ── Liste des documents ───────────────────────────────────────────── */}
      {loadingDossiers ? (
        <Fade in timeout={300}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[1, 2, 3].map((i) => (
              <Card key={i} elevation={5} sx={{ backgroundColor: 'transparent', borderRadius: 0 }}>
                <CardContent sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                    <Skeleton variant="circular" width={18} height={18} sx={{ mt: 0.5 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Skeleton variant="text" width="70%" height={20} sx={{ mb: 0.5 }} />
                      <Skeleton variant="rectangular" width={100} height={20} sx={{ borderRadius: 1, mb: 0.5 }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Fade>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {currentDossierId && (
            <Box sx={{ mb: 1.5, pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom>
                {dossierTypeDemande}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                {dossierTypePermis}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`${documentsForCurrentDossier.length} synchronisé(s)`}
                  size="small" color="primary" variant="outlined" />
                {localDocuments.length > 0 && (
                  <Chip
                    icon={<WifiOff sx={{ fontSize: '14px !important' }} />}
                    label={`${localDocuments.length} local/non synchronisé(s)`}
                    size="small" color="warning" variant="outlined"
                  />
                )}
              </Box>
            </Box>
          )}

          {/* Alerte documents locaux */}
          {localDocuments.length > 0 && (
            <Alert severity="warning" icon={<WifiOff fontSize="small" />} sx={{ mb: 1, py: 0.5 }}>
              <Typography variant="caption">
                {localDocuments.length} document(s) enregistré(s) localement — serveur Alfresco indisponible lors de l'upload.
              </Typography>
            </Alert>
          )}

          {totalDocuments > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {/* Documents API */}
              {documentsForCurrentDossier.map((doc) => {
                const pieceJustificative = doc.piece_justification_id
                  ? piecesJustificatives.find(p => p.id === doc.piece_justification_id)
                  : undefined;
                return (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    pieceLabel={pieceJustificative?.libelle}
                    isLocal={false}
                    previewUrl={(doc as Document).chemin_fichier ?? null}
                    onOpen={() => openDocument(doc)}
                  />
                );
              })}

              {/* Documents locaux */}
              {localDocuments.map((doc) => {
                const piece = piecesJustificatives.find(p => p.id === doc.piece_justification_id);
                return (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    pieceLabel={piece?.libelle}
                    isLocal
                    previewUrl={getLocalFileDataUrl(doc.id)}
                    onOpen={() => openDocument(doc)}
                  />
                );
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {currentDossierId
                ? 'Aucun document pour ce dossier'
                : 'Sélectionnez un dossier pour voir ses documents'}
            </Typography>
          )}
        </Box>
      )}

      {/* ── Confirm delete ──────────────────────────────────────────────────── */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Supprimer ce document ?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Cette action est irréversible. Le document sera définitivement supprimé.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>Annuler</Button>
          <Button
            variant="contained" color="error"
            startIcon={deleting ? <CircularProgress size={14} color="inherit" /> : <Delete />}
            disabled={deleting}
            onClick={() => {
              if (selectedPieceExisting) {
                handleDeleteDocument(selectedPieceExisting.doc, selectedPieceExisting.isLocal);
              }
            }}
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Viewer PDF ──────────────────────────────────────────────────────── */}
      <Dialog
        open={pdfViewerOpen}
        onClose={() => {
          if (selectedDocUrl?.startsWith('blob:')) URL.revokeObjectURL(selectedDocUrl);
          setPdfViewerOpen(false);
          setSelectedDocUrl(null);
          setSelectedDocMime(null);
        }}
        maxWidth="lg" fullWidth
        PaperProps={{ sx: { height: '90vh', maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6">{selectedDocument?.nom_fichier || 'Document'}</Typography>
          <IconButton onClick={() => { setPdfViewerOpen(false); setSelectedDocUrl(null); }} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
          {selectedDocUrl && (
            <Box sx={{ width: '100%', height: '100%', display: 'block', bgcolor: 'background.paper' }}>
              {((selectedDocMime || '').includes('image') || getFileType(selectedDocument?.nom_fichier, selectedDocUrl) === 'image') ? (
                <Box
                  component="img"
                  src={selectedDocUrl}
                  alt={selectedDocument?.nom_fichier || 'Document'}
                  sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
              ) : (((selectedDocMime || '').includes('pdf')) || getFileType(selectedDocument?.nom_fichier, selectedDocUrl) === 'pdf') ? (
                <Box
                  component="iframe"
                  src={selectedDocUrl}
                  sx={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  title={selectedDocument?.nom_fichier || 'PDF'}
                />
              ) : (
                <Box sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Description sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.7 }} />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

// ─── Aperçu document existant dans la zone d'upload ─────────────────────────

const ExistingDocumentPreview: React.FC<{
  doc: Document | LocalDocument;
  isLocal: boolean;
  previewUrl: string | null;
  deleting: boolean;
  onDelete: () => void;
  onReplace: () => void;
}> = ({ doc, isLocal, previewUrl, deleting, onDelete, onReplace }) => {
  const [imgError, setImgError] = useState(false);
  const fileType = getFileType(doc.nom_fichier, previewUrl);

  return (
    <Box sx={{
      border: '1px solid',
      borderColor: isLocal ? 'warning.main' : 'success.main',
      borderRadius: 1,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Box sx={{
        px: 1.5, py: 0.8,
        bgcolor: isLocal ? 'warning.50' : 'success.50',
        display: 'flex', alignItems: 'center', gap: 1,
      }}>
        <CheckCircle sx={{ fontSize: 14, color: isLocal ? 'warning.main' : 'success.main' }} />
        <Typography variant="caption" fontWeight="bold" color={isLocal ? 'warning.dark' : 'success.dark'} sx={{ flexGrow: 1 }}>
          {isLocal ? 'Document local (non synchronisé)' : 'Document déjà uploadé'}
        </Typography>
      </Box>

      {/* Miniature */}
      {previewUrl && !imgError && (
        <Box sx={{ bgcolor: '#f5f5f5', maxHeight: 120, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {fileType === 'image' ? (
            <Box component="img" src={previewUrl} alt={doc.nom_fichier}
              onError={() => setImgError(true)}
              sx={{ width: '100%', maxHeight: 120, objectFit: 'contain', display: 'block' }} />
          ) : fileType === 'pdf' ? (
            <Box
              sx={{
                width: '100%',
                height: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f5f5f5',
              }}
            >
              <PictureAsPdf sx={{ fontSize: 42, color: 'error.main', opacity: 0.7 }} />
            </Box>
          ) : (
            <Description sx={{ fontSize: 40, color: 'text.secondary', my: 2 }} />
          )}
        </Box>
      )}

      {/* Nom + actions */}
      <Box sx={{ px: 1.5, py: 1 }}>
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 1 }}>
          {doc.nom_fichier || 'Document'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small" variant="outlined" color="error" fullWidth
            startIcon={deleting ? <CircularProgress size={12} color="inherit" /> : <Delete />}
            disabled={deleting}
            onClick={onDelete}
            sx={{ textTransform: 'none', fontSize: '0.7rem' }}
          >
            Supprimer
          </Button>
          <Button
            size="small" variant="contained" color="primary" fullWidth
            startIcon={deleting ? <CircularProgress size={12} color="inherit" /> : <SwapHoriz />}
            disabled={deleting}
            onClick={onReplace}
            sx={{ textTransform: 'none', fontSize: '0.7rem' }}
          >
            Remplacer
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

// ─── Sous-composant carte document ───────────────────────────────────────────

function getFileType(nom: string | undefined, url: string | null | undefined): 'image' | 'pdf' | 'other' {
  const name = (nom ?? url ?? '').toLowerCase();
  if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp')) return 'image';
  if (name.endsWith('.pdf') || (url ?? '').toLowerCase().includes('.pdf')) return 'pdf';
  // Detect from data URL
  if ((url ?? '').startsWith('data:image/')) return 'image';
  if ((url ?? '').startsWith('data:application/pdf')) return 'pdf';
  return 'other';
}

const DocumentCard: React.FC<{
  doc: Document | LocalDocument;
  pieceLabel?: string;
  isLocal: boolean;
  previewUrl: string | null;
  onOpen: () => void;
}> = ({ doc, pieceLabel, isLocal, previewUrl, onOpen }) => {
  const [imgError, setImgError] = useState(false);
  const fileType = getFileType(doc.nom_fichier, previewUrl);
  const hasPreview = !!previewUrl;

  return (
    <Card
      elevation={3}
      sx={{
        backgroundColor: 'transparent',
        borderRadius: 0,
        border: '1px solid',
        borderColor: isLocal ? 'warning.light' : 'divider',
        overflow: 'hidden',
      }}
    >
      {/* ── Aperçu visuel ──────────────────────────────────────────────── */}
      {hasPreview && !imgError && (
        <Box
          onClick={onOpen}
          sx={{
            position: 'relative',
            width: '100%',
            cursor: 'pointer',
            bgcolor: fileType === 'pdf' ? '#f5f5f5' : '#000',
            overflow: 'hidden',
            '&:hover .zoom-overlay': { opacity: 1 },
          }}
        >
          {fileType === 'image' ? (
            <Box
              component="img"
              src={previewUrl}
              alt={doc.nom_fichier || 'Document'}
              onError={() => setImgError(true)}
              sx={{
                width: '100%',
                maxHeight: 180,
                objectFit: 'contain',
                display: 'block',
                bgcolor: '#f8f8f8',
              }}
            />
          ) : fileType === 'pdf' ? (
            <Box
              sx={{
                position: 'relative',
                height: 180,
                bgcolor: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PictureAsPdf sx={{ fontSize: 60, color: 'error.main', opacity: 0.7 }} />
            </Box>
          ) : null}

          {/* Overlay zoom au survol */}
          <Box
            className="zoom-overlay"
            sx={{
              position: 'absolute', inset: 0,
              bgcolor: 'rgba(0,0,0,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s',
            }}
          >
            <ZoomIn sx={{ color: '#fff', fontSize: 36 }} />
          </Box>
        </Box>
      )}

      {/* Placeholder si erreur de chargement ou pas de fichier */}
      {(!hasPreview || imgError) && (
        <Box
          sx={{
            height: 100, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            bgcolor: isLocal ? 'warning.50' : 'action.hover', gap: 0.5,
          }}
        >
          {fileType === 'pdf'
            ? <PictureAsPdf sx={{ fontSize: 40, color: '#e53935', opacity: 0.7 }} />
            : fileType === 'image'
            ? <ImageIcon sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5 }} />
            : <Description sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5 }} />
          }
          <Typography variant="caption" color="text.secondary">
            {imgError ? 'Aperçu non disponible' : 'Aucun fichier'}
          </Typography>
        </Box>
      )}

      {/* ── Informations ─────────────────────────────────────────────── */}
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight="bold"
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.nom_fichier || 'Document'}
            </Typography>
            {pieceLabel && (
              <Chip label={pieceLabel} size="small" color="primary" variant="outlined"
                sx={{ mt: 0.3, mb: 0.3, fontSize: '0.6rem', height: 18, maxWidth: '100%' }} />
            )}
            {doc.date_upload && (
              <Typography variant="caption" color="text.secondary" display="block">
                {formatDate(doc.date_upload)}
              </Typography>
            )}
          </Box>
          {isLocal ? (
            <Chip icon={<WifiOff sx={{ fontSize: '12px !important' }} />}
              label="Local" size="small" color="warning"
              sx={{ fontSize: '0.6rem', height: 20, flexShrink: 0 }} />
          ) : (
            doc.valide !== undefined && (
              <Chip
                label={(doc as Document).valide ? 'Validé' : 'En attente'}
                color={(doc as Document).valide ? 'success' : 'warning'}
                size="small" sx={{ fontSize: '0.65rem', height: 20, flexShrink: 0 }}
              />
            )
          )}
        </Box>

        {hasPreview && (
          <Button
            size="small" variant="outlined" fullWidth
            startIcon={fileType === 'pdf' ? <PictureAsPdf /> : <ZoomIn />}
            sx={{ mt: 1, fontSize: '0.7rem', textTransform: 'none' }}
            onClick={onOpen}
          >
            {fileType === 'pdf' ? 'Ouvrir le PDF' : 'Voir en plein écran'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentsList;
