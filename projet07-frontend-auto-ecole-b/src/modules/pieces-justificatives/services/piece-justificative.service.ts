// Service pour la gestion des pièces justificatives
import axiosClient from '../../../shared/utils/axiosConfig';
import { API_ENDPOINTS } from '../../../shared/constants/api';
import {
  PieceJustificative,
  PieceJustificativeFormData,
  PieceJustificativeResponse,
  PieceJustificativeListResponse,
  PieceJustificativeFilters,
} from '../types/piece-justificative';

/** Identifiant utilisé dans l’URL (DELETE/PUT) : Laravel utilise souvent pieces_justificative / piece_justificative. */
function normalizePieceItem(raw: any): PieceJustificative {
  const uuid = raw?.pieces_justificative ?? raw?.piece_justificative ?? raw?.id;
  const id = uuid != null ? String(uuid) : '';
  return {
    ...raw,
    id,
    pieces_justificative: id || undefined,
    etape_id: raw?.etape_id ?? '',
    type_document_id: raw?.type_document_id ?? '',
    code: raw?.code ?? '',
    libelle: raw?.libelle ?? '',
    format_attendu: raw?.format_attendu ?? '',
    obligatoire: Boolean(raw?.obligatoire),
    delivery_date: raw?.delivery_date ?? '',
    expiration_date: raw?.expiration_date ?? '',
    created_at: raw?.created_at ?? '',
    updated_at: raw?.updated_at ?? '',
  };
}

export class PieceJustificativeService {
  /**
   * Récupère la liste paginée de toutes les pièces justificatives
   */
  async getPiecesJustificatives(
    page: number = 1,
    perPage: number = 15,
    filters?: PieceJustificativeFilters
  ): Promise<PieceJustificativeListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...(filters?.search && { search: filters.search }),
        ...(filters?.etape_id && { etape_id: filters.etape_id }),
        ...(filters?.type_document_id && { type_document_id: filters.type_document_id }),
        ...(filters?.obligatoire !== undefined && { obligatoire: filters.obligatoire.toString() }),
      });

      const response = await axiosClient.get(`${API_ENDPOINTS.PIECES_JUSTIFICATIVES.LIST}?${params}`);
      
      // Gérer différentes structures de réponse
      const responseData = response.data;
      console.log('📦 Réponse API pièces justificatives:', responseData);
      
      const normalizeData = (arr: any[]): PieceJustificative[] =>
        Array.isArray(arr) ? arr.map(normalizePieceItem) : [];

      // Si la réponse est directement un tableau
      if (Array.isArray(responseData)) {
        return {
          data: normalizeData(responseData),
          links: {
            first: '',
            last: '',
            prev: null,
            next: null,
          },
          meta: {
            current_page: page,
            from: 1,
            last_page: 1,
            path: '/pieces-justificatives',
            per_page: perPage,
            to: responseData.length,
            total: responseData.length,
          },
        };
      }
      
      // Si la réponse a la structure attendue avec data et meta
      if (responseData.data && responseData.meta) {
        return { ...responseData, data: normalizeData(responseData.data) };
      }

      // Si la réponse a data mais pas meta, créer une structure par défaut
      if (responseData.data && Array.isArray(responseData.data)) {
        return {
          data: normalizeData(responseData.data),
          links: responseData.links || {
            first: '',
            last: '',
            prev: null,
            next: null,
          },
          meta: responseData.meta || {
            current_page: page,
            from: 1,
            last_page: 1,
            path: '/pieces-justificatives',
            per_page: perPage,
            to: responseData.data.length,
            total: responseData.data.length,
          },
        };
      }
      
      // Structure inattendue, retourner une structure vide
      console.warn('Structure de réponse inattendue:', responseData);
      return {
        data: [],
        links: {
          first: '',
          last: '',
          prev: null,
          next: null,
        },
        meta: {
          current_page: page,
          from: 0,
          last_page: 1,
          path: '/pieces-justificatives',
          per_page: perPage,
          to: 0,
          total: 0,
        },
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des pièces justificatives:', error);
      throw error;
    }
  }

  /**
   * Récupère une pièce justificative par son ID
   */
  async getPieceJustificativeById(id: string): Promise<PieceJustificative> {
    try {
      const response = await axiosClient.get(API_ENDPOINTS.PIECES_JUSTIFICATIVES.GET(id));
      const raw = response.data?.data ?? response.data;
      return raw ? normalizePieceItem(raw) : raw;
    } catch (error) {
      console.error('Erreur lors de la récupération de la pièce justificative:', error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle pièce justificative
   * Normalise la réponse pour retourner toujours { success, data } (l'API peut renvoyer la pièce directement ou dans .data).
   */
  async createPieceJustificative(data: PieceJustificativeFormData): Promise<PieceJustificativeResponse> {
    try {
      console.log('🚀 Tentative de création de pièce justificative avec les données:', data);
      const response = await axiosClient.post(API_ENDPOINTS.PIECES_JUSTIFICATIVES.CREATE, data);
      const body = response.data;
      console.log('✅ Pièce justificative créée avec succès:', body);
      if (body && typeof body === 'object' && 'success' in body && body.data) {
        return { success: true, message: (body as any).message ?? 'Créé.', data: normalizePieceItem(body.data) };
      }
      const piece = body?.data ?? body;
      if (piece && (piece.id != null || piece.pieces_justificative != null)) {
        return { success: true, message: (body as any)?.message ?? 'Créé.', data: normalizePieceItem(piece) };
      }
      return { success: false, message: (body as any)?.message ?? 'Réponse inattendue' };
    } catch (error: any) {
      console.error('❌ Erreur lors de la création de la pièce justificative:', error);
      console.error('📊 Détails de l\'erreur:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });

      // Gestion spécifique des erreurs d'authentification
      if (error.response?.status === 401) {
        const errorMessage =
          error.response?.data?.message ||
          'Erreur d\'authentification. Vérifiez que votre token est valide et que vous avez les permissions nécessaires.';
        throw new Error(`🔐 ${errorMessage}`);
      }

      if (error.response?.status === 403) {
        throw new Error('🚫 Accès refusé. Votre rôle ne vous permet pas de créer une pièce justificative.');
      }

      if (error.response?.status === 422) {
        const validationErrors = error.response?.data?.errors;
        if (validationErrors) {
          const errorMessages = Object.entries(validationErrors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          throw new Error(`📝 Erreur de validation: ${errorMessages}`);
        }
      }

      if (error.response?.data?.message) {
        throw new Error(`⚠️ ${error.response.data.message}`);
      }

      throw new Error(`❌ Erreur inattendue: ${error.message}`);
    }
  }

  /**
   * Met à jour une pièce justificative existante
   * Accepte une réponse API en forme { success, message, data } ou la pièce directement (rétrocompatibilité).
   */
  async updatePieceJustificative(id: string, data: Partial<PieceJustificativeFormData>): Promise<PieceJustificativeResponse> {
    const url = API_ENDPOINTS.PIECES_JUSTIFICATIVES.UPDATE(id);
    const handleResponse = (response: { data: any }): PieceJustificativeResponse => {
      const body = response.data;
      if (body && typeof body === 'object' && 'success' in body && body.data) {
        return body as PieceJustificativeResponse;
      }
      if (body && typeof body === 'object' && (body.id != null || body.data)) {
        const piece = body.data ?? body;
        return { success: true, message: (body as any)?.message ?? 'Pièce justificative mise à jour.', data: normalizePieceItem(piece) };
      }
      return { success: false, message: (body as any)?.message || 'Réponse inattendue' };
    };
    try {
      const response = await axiosClient.put(url, data);
      return handleResponse(response);
    } catch (error: any) {
      if (error.response?.status === 405) {
        try {
          const response = await axiosClient.patch(url, data);
          return handleResponse(response);
        } catch (patchErr: any) {
          console.error('Erreur PATCH pièce justificative:', patchErr);
          if (patchErr.response?.data?.message) throw new Error(patchErr.response.data.message);
          throw patchErr;
        }
      }
      console.error('Erreur lors de la mise à jour de la pièce justificative:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  /**
   * Supprime une pièce justificative
   */
  async deletePieceJustificative(id: string): Promise<{ success: boolean; message: string }> {
    const url = API_ENDPOINTS.PIECES_JUSTIFICATIVES.DELETE(id);
    try {
      const response = await axiosClient.delete(url);
      const body = response.data;
      if (body && typeof body === 'object' && body.success === false) {
        const msg = (body as any).message || 'La suppression a échoué';
        throw new Error(msg);
      }
      return { success: true, message: (body as any)?.message || 'Supprimé' };
    } catch (error: any) {
      console.error('Erreur lors de la suppression de la pièce justificative:', { url, id, error: error?.response?.data });
      throw error;
    }
  }
}

// Instance singleton du service
export const pieceJustificativeService = new PieceJustificativeService();

