import React from 'react';
import { circuitSuiviService } from '../../../services/circuit-suivi.service';
import axiosClient from '../../../../../shared/utils/axiosConfig';

/** Libellés de pièces considérées comme photo du candidat (priorité : DEMI CARTE PHOTO, puis photo d'identité) */
const DEMI_CARTE_PATTERNS = [/demi\s*[-]?\s*carte\s*photo/i, /demi\s*[-]?\s*carte/i];
const PHOTO_IDENTITE_PATTERN = /photo\s*d['\u2019]?\s*identit[eé]/i;

/** Cache des pièces justificatives (partagé entre les appels) */
let piecesJustificativesCache: { id: string; libelle?: string }[] | null = null;

async function getPiecesJustificatives(): Promise<{ id: string; libelle?: string }[]> {
  if (piecesJustificativesCache) return piecesJustificativesCache;
  try {
    const res = await axiosClient.get('/pieces-justificatives');
    const data = res.data;
    const list = Array.isArray(data) ? data : data?.data ?? data?.data?.data ?? [];
    piecesJustificativesCache = (list as any[]).map((p: any) => ({
      id: String(p.id ?? p.uuid ?? ''),
      libelle: p.libelle ?? p.nom ?? '',
    }));
    return piecesJustificativesCache;
  } catch {
    return [];
  }
}

/** Charge le mapping document_id -> piece_justification_id depuis localStorage (pour documents uploadés) */
function loadDocumentPieceMapping(): Map<string, string> {
  try {
    const stored = localStorage.getItem('document_piece_mapping');
    if (!stored) return new Map();
    const parsed = JSON.parse(stored) as Record<string, { piece_justification_id?: string }>;
    const map = new Map<string, string>();
    Object.entries(parsed).forEach(([docId, data]) => {
      if (data?.piece_justification_id) map.set(docId, data.piece_justification_id);
    });
    return map;
  } catch {
    return new Map();
  }
}

/** Trouve le document photo du candidat (priorité : DEMI CARTE PHOTO, puis photo d'identité) */
async function findPhotoDocument(dossierId: string): Promise<{ id: string; chemin_fichier?: string } | null> {
  const [documents, pieces] = await Promise.all([
    circuitSuiviService.getDocumentsByDossier(dossierId),
    getPiecesJustificatives(),
  ]);
  const docsForDossier = documents.filter(
    (d: any) => !d.documentable_id || d.documentable_id === dossierId
  );
  const pieceById = new Map(pieces.map((p) => [p.id, p]));
  const mapping = loadDocumentPieceMapping();
  // Priorité : DEMI CARTE PHOTO (photo du candidat), puis photo d'identité
  let demiCarteDoc: { id: string; chemin_fichier?: string } | null = null;
  let photoIdentiteDoc: { id: string; chemin_fichier?: string } | null = null;
  for (const doc of docsForDossier) {
    const pieceId = doc.piece_justification_id ?? mapping.get(doc.id);
    if (!pieceId) continue;
    const piece = pieceById.get(String(pieceId));
    const libelle = (piece?.libelle ?? '').trim();
    if (DEMI_CARTE_PATTERNS.some((p) => p.test(libelle))) {
      demiCarteDoc = { id: doc.id, chemin_fichier: doc.chemin_fichier };
      break;
    }
    if (!photoIdentiteDoc && PHOTO_IDENTITE_PATTERN.test(libelle)) {
      photoIdentiteDoc = { id: doc.id, chemin_fichier: doc.chemin_fichier };
    }
  }
  return demiCarteDoc ?? photoIdentiteDoc ?? null;
}

/** Même liste d’endpoints que documentHandlers / DocumentsCard pour ouvrir un document */
async function getDocumentImageUrl(doc: { id: string; chemin_fichier?: string }): Promise<string | null> {
  const endpoints: { url: string; headers?: Record<string, string> }[] = [
    { url: `/documents/${doc.id}`, headers: { Accept: 'application/pdf,application/octet-stream,image/*,*/*' } },
    { url: `/documents/${doc.id}/download`, headers: {} },
    { url: `/documents/${doc.id}/file`, headers: {} },
    { url: `/documents/${doc.id}/view`, headers: {} },
  ];
  if (doc.chemin_fichier) {
    endpoints.push({ url: `/storage/${doc.chemin_fichier}`, headers: {} });
    endpoints.push({ url: `/files/${doc.chemin_fichier}`, headers: {} });
  }
  for (const { url, headers = {} } of endpoints) {
    try {
      const response = await axiosClient.get(url, {
        responseType: 'blob',
        headers,
      });
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('application/json')) continue;
      if (response.data instanceof Blob && response.data.size > 0) {
        const blob = response.data;
        const type = blob.type || contentType || 'image/jpeg';
        const blobForImg = blob.type ? blob : new Blob([blob], { type: type.startsWith('image/') ? type : 'image/jpeg' });
        return URL.createObjectURL(blobForImg);
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function useDossierPhoto(dossierId: string | undefined) {
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(!!dossierId);
  const urlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!dossierId) {
      setPhotoUrl(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setPhotoUrl(null);
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    findPhotoDocument(dossierId)
      .then((doc) => {
        if (cancelled || !doc) return null;
        return getDocumentImageUrl(doc);
      })
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url ?? null;
        setPhotoUrl(url ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [dossierId]);

  return { photoUrl, loading };
}
