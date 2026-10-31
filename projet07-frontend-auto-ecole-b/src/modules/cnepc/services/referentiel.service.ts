
// Service pour la gestion des référentiels

import axiosClient from '../../../shared/utils/axiosConfig';
import { Referentiel } from '../types/auto-ecole';

// Interface pour la réponse paginée des référentiels
export interface ReferentielListResponse {
  data: Referentiel[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    links: Array<{
      url: string | null;
      label: string;
      active: boolean;
    }>;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface ReferentielFilters {
  type_ref?: string;
  statut?: boolean;
  search?: string;
}

export class ReferentielService {

  /**
   * Récupère la liste paginée des référentiels
   */
  async getReferentiels(
    page: number = 1,
    perPage: number = 50,
    filters?: ReferentielFilters
  ): Promise<ReferentielListResponse> {
    try {
      const params = new URLSearchParams();

      params.append('page', page.toString());
      params.append('per_page', perPage.toString());

      if (filters?.type_ref) {
        params.append('type_ref', filters.type_ref);
      }

      if (filters?.statut !== undefined) {
        params.append('statut', filters.statut.toString());
      }

      if (filters?.search) {
        params.append('search', filters.search);
      }

      const response = await axiosClient.get(
        `/referentiels?${params.toString()}`
      );

      // Laravel retourne normalement un paginateur avec data et meta
      const result = response.data?.data
        ? response.data
        : response.data;

      if (!Array.isArray(result?.data)) {
        console.error('Format de réponse référentiels inattendu :', response.data);
        return {
          data: [],
          links: {
            first: '',
            last: '',
            prev: null,
            next: null,
          },
          meta: {
            current_page: 1,
            from: null,
            last_page: 1,
            links: [],
            path: '',
            per_page: perPage,
            to: null,
            total: 0,
          },
        };
      }

      return result;
    } catch (error) {
      console.error('Erreur lors de la récupération des référentiels:', error);
      throw error;
    }
  }

  /**
   * Récupère un référentiel par son identifiant
   */
  async getReferentielById(id: string): Promise<Referentiel> {
    try {
      const response = await axiosClient.get(`/referentiels/${id}`);

      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du référentiel:', error);
      throw error;
    }
  }

  /**
   * Récupère les référentiels par type
   * Exemple : centre, province, direction...
   */
  async getReferentielsByType(type: string): Promise<Referentiel[]> {
    try {
      // On récupère tous les statuts pour ne pas exclure
      // les centres à cause d'un filtre trop restrictif.
      return await this.getAllReferentielsByType(type);
    } catch (error) {
      console.error(
        `Erreur lors de la récupération des référentiels de type ${type}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Récupère TOUS les référentiels d'un type
   * en parcourant toutes les pages de la base de données.
   */
  async getAllReferentielsByType(
    type: string,
    perPage: number = 100
  ): Promise<Referentiel[]> {
    try {
      const first = await this.getReferentiels(1, perPage, {
        type_ref: type,
      });

      const all: Referentiel[] = [...(first.data || [])];

      const lastPage = first.meta?.last_page ?? 1;

      for (let page = 2; page <= lastPage; page++) {
        const next = await this.getReferentiels(page, perPage, {
          type_ref: type,
        });

        if (Array.isArray(next.data) && next.data.length > 0) {
          all.push(...next.data);
        }
      }

      console.log(`Référentiels récupérés (${type}) :`, all);

      return all;
    } catch (error) {
      console.error(
        `Erreur lors de la récupération de tous les référentiels (${type}):`,
        error
      );
      throw error;
    }
  }

  /**
   * Crée un nouveau référentiel
   */
  async createReferentiel(data: {
    libelle: string;
    code: string;
    type_ref: string;
    description?: string;
    statut: boolean;
    montant?: string;
    parent_id?: string | null;
  }): Promise<{
    success: boolean;
    message: string;
    data: Referentiel;
  }> {
    try {
      const payload: Record<string, unknown> = {
        libelle: data.libelle,
        code: data.code,
        type_ref: data.type_ref,
        statut: data.statut,
      };

      if (data.description) {
        payload.description = data.description;
      }

      if (data.montant != null && data.montant !== '') {
        payload.montant = data.montant;
      }

      if (data.parent_id != null && data.parent_id !== '') {
        payload.parent_id = data.parent_id;
      }

      const response = await axiosClient.post('/referentiels', payload);

      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du référentiel:', error);
      throw error;
    }
  }

  /**
   * Met à jour un référentiel existant
   */
  async updateReferentiel(
    id: string,
    data: Partial<{
      libelle: string;
      code: string;
      type_ref: string;
      description: string;
      statut: boolean;
      montant: string;
      parent_id: string | null;
    }>
  ): Promise<{
    success: boolean;
    message: string;
    data: Referentiel;
  }> {
    try {
      const response = await axiosClient.put(
        `/referentiels/${id}`,
        data
      );

      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du référentiel:', error);
      throw error;
    }
  }

  /**
   * Supprime un référentiel
   */
  async deleteReferentiel(
    id: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await axiosClient.delete(
        `/referentiels/${id}`
      );

      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression du référentiel:', error);
      throw error;
    }
  }
}

// Instance unique du service
export const referentielService = new ReferentielService();
