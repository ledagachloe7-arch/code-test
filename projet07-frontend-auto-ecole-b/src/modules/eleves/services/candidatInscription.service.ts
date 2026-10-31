// Service pour la gestion des candidats inscrits
import axiosClient from '../../../shared/utils/axiosConfig';
import { CandidatInscription } from '../types/inscription';
import { useAppStore } from '../../../store';

export interface CandidatsInscritsResponse {
  success: boolean;
  data: CandidatInscription[];
  message?: string;
}

export interface CandidatsInscritsFilters {
  auto_ecole_id?: string;
  statut?: string;
  formation_id?: string;
  page?: number;
  per_page?: number;
}

export class CandidatInscriptionService {
  /**
   * Récupère l'ID du responsable connecté
   */
  private async getResponsableId(): Promise<string | null> {
    try {
      // Récupérer les informations de l'utilisateur connecté
      const response = await axiosClient.get('/auth/me');
      const user = response.data;
      
      console.log('👤 Utilisateur connecté:', user);
      
      if (user.id) {
        console.log('🆔 ID du responsable:', user.id);
        return user.id;
      }
      
      console.warn('⚠️ Aucun ID trouvé pour l\'utilisateur');
      return null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  }

  /**
   * Récupère la liste des candidats inscrits à des formations pour le responsable connecté
   */
  async getCandidatsInscrits(filters?: CandidatsInscritsFilters): Promise<CandidatsInscritsResponse> {
    try {
      // Récupérer l'ID du responsable connecté
      const responsableId = await this.getResponsableId();
      
      if (!responsableId) {
        return {
          success: false,
          data: [],
          message: 'Aucun responsable identifié'
        };
      }

      const params = new URLSearchParams();
      
      // Filtrer par responsable_id (qui correspond à l'auto-école du responsable)
      params.append('responsable_id', responsableId);
      
      if (filters?.statut) {
        params.append('statut', filters.statut);
      }
      if (filters?.formation_id) {
        params.append('formation_id', filters.formation_id);
      }
      if (filters?.page) {
        params.append('page', filters.page.toString());
      }
      if (filters?.per_page) {
        params.append('per_page', filters.per_page.toString());
      }

      const queryString = params.toString();
      const url = `/candidats/inscription-formation${queryString ? `?${queryString}` : ''}`;
      
      console.log('🔍 Récupération des candidats inscrits pour responsable:', responsableId, url);
      
      const response = await axiosClient.get(url);
      
      console.log('✅ Candidats inscrits récupérés:', response.data);
      
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération des candidats inscrits:', error);
      
      return {
        success: false,
        data: [],
        message: error.response?.data?.message || 'Erreur lors de la récupération des candidats inscrits'
      };
    }
  }

  /**
   * Récupère un candidat inscrit par ID
   */
  async getCandidatInscritById(id: string): Promise<CandidatInscription | null> {
    try {
      const response = await axiosClient.get(`/candidats/inscription-formation/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du candidat inscrit:', error);
      return null;
    }
  }

  /**
   * Met à jour le statut d'un candidat inscrit
   */
  async updateStatutCandidat(id: string, statut: string): Promise<boolean> {
    try {
      await axiosClient.put(`/candidats/inscription-formation/${id}`, { statut });
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du statut:', error);
      return false;
    }
  }
}

// Instance du service
export const candidatInscriptionService = new CandidatInscriptionService();
