/**
 * Service de vérification de la pièce d'identité avec la DGDI
 * (Direction Générale de la Documentation et de l'immmigration)
 */
import axiosClient from '../../../shared/utils/axiosConfig';

export interface DgdiVerificationData {
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  genre?: string;
  numero_piece?: string;
  type_piece?: string;
}

export interface DgdiVerificationResult {
  success: boolean;
  data?: DgdiVerificationData;
  message?: string;
  /** Service DGDI / gateway indisponible (ex. 503) — le front peut proposer de poursuivre sans vérification DGDI */
  serviceUnavailable?: boolean;
}

export interface DgdiVerificationPayload {
  type_piece: string;
  numero_piece: string;
}

/** Détecte indisponibilité DGDI / gateway (réponse texte ou JSON) */
export function isDgdiServiceUnavailableMessage(msg: unknown): boolean {
  const s = String(msg ?? '').toLowerCase();
  if (!s.trim()) return false;
  return (
    /\b503\b|\b502\b|\b504\b/.test(s) ||
    /service\s*unavailable|unavailable|temporairement|indisponible|gateway|bad\s*gateway|timeout|timed\s*out|econnaborted|network\s*error/i.test(
      s
    )
  );
}

export class DgdiService {
  /**
   * Vérifie une pièce d'identité auprès de la DGDI.
   * Endpoint : GET /dgdi-checkDocument?documentNumber
=...
   * Réponse : { success: boolean, message: string }
   * Le backend (CandidatService::dgdiCheckRequest) attend le paramètre document_number.
   */
  async verifyPieceIdentite(
    _typePiece: string,
    numeroPiece: string
  ): Promise<DgdiVerificationResult> {
    const documentNumber = (numeroPiece ?? '').trim();
    if (!documentNumber) {
      return { success: false, message: 'Le numéro de la pièce est obligatoire.' };
    }
    try {
      // Backend (dgdiCheckRequest) attend souvent `document_number` (snake_case).
      // On envoie les deux pour compatibilité avec les proxies / anciennes versions.
      const params = new URLSearchParams({
        document_number: documentNumber,
        documentNumber: documentNumber,
      });
      const response = await axiosClient.get<{
        exists?: boolean;
        success?: boolean | string;
        message?: string;
        data?: { exists?: boolean; success?: boolean; message?: string };
      }>(`/dgdi-checkDocument?${params.toString()}`);
      const body = response.data?.data ?? response.data;
      const message = body?.message ?? response.data?.message ?? '';
      // exists: false → document non trouvé → message en rouge (success = false)
      // exists: true → document trouvé → message en vert (success = true)
      const exists = body?.exists ?? (body?.success === true || body?.success === 'true');
      const success = exists === true;
      // Certains backends renvoient HTTP 200 avec un message d'erreur serveur / DGDI down
      if (!success && isDgdiServiceUnavailableMessage(message)) {
        return {
          success: false,
          serviceUnavailable: true,
          message: message || 'Service DGDI temporairement indisponible.',
        };
      }
      return {
        success,
        data: undefined,
        message: message || undefined,
      };
    } catch (error: any) {
      const status = error.response?.status as number | undefined;
      const data = error.response?.data;
      const apiMessage =
        (typeof data === 'object' && data?.message) ||
        (typeof data === 'string' ? data : undefined) ||
        error.message;

      // 5xx, proxy, ou message explicite
      const statusUnavailable =
        status === 503 ||
        status === 502 ||
        status === 504 ||
        (typeof status === 'number' && status >= 500);
      const messageUnavailable = isDgdiServiceUnavailableMessage(apiMessage);
      const networkOrTimeout =
        !error.response &&
        (error.code === 'ECONNABORTED' ||
          error.code === 'ERR_NETWORK' ||
          /network\s*error|timeout|timed\s*out|failed\s*to\s*fetch/i.test(String(error.message ?? '')));

      if (statusUnavailable || messageUnavailable || networkOrTimeout) {
        return {
          success: false,
          serviceUnavailable: true,
          message:
            (typeof apiMessage === 'string' ? apiMessage : undefined) ??
            'Service DGDI temporairement indisponible. Vous pouvez poursuivre avec la vérification du permis.',
        };
      }

      const message =
        (typeof apiMessage === 'string' ? apiMessage : undefined) ??
        error.message ??
        'Erreur lors de la vérification DGDI';
      return {
        success: false,
        message,
      };
    }
  }
}

export const dgdiService = new DgdiService();
