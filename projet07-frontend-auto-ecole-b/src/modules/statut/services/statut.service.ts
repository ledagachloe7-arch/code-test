import axiosClient from '../../../shared/utils/axiosConfig';
import { Statut } from '../types';

export class StatutService {
  constructor(
    private axios = axiosClient,
    private url = '/workflow/statuts'
  ) {}

  // GET /workflow/statuts
  async getAll(params?: Record<string, any>): Promise<Statut[]> {
    try {
      const res = await this.axios.get<any>(this.url, { params });
      const raw = res.data;
      if (Array.isArray(raw)) {
        return raw;
      }
      if (Array.isArray(raw?.data)) {
        return raw.data;
      }
      if (Array.isArray(raw?.data?.data)) {
        return raw.data.data;
      }
      return [];
    } catch (error) {
      throw new Error(`Erreur de connexion (GET all): ${this.humanize(error)}`);
    }
  }

  // GET /workflow/statuts/{id}
  async getById(id: string): Promise<Statut> {
    try {
      const res = await this.axios.get<any>(`${this.url}/${id}`);
      return res.data?.data ?? res.data;
    } catch (error) {
      throw new Error(`Erreur de connexion (GET id=${id}): ${this.humanize(error)}`);
    }
  }

  // POST /workflow/statuts
  async create(payload: Partial<Statut>): Promise<Statut> {
    try {
      const res = await this.axios.post<any>(this.url, payload);
      return res.data?.data ?? res.data;
    } catch (error) {
      throw new Error(`Erreur de connexion (POST): ${this.humanize(error)}`);
    }
  }

  // PUT /workflow/statuts/{id}
  async update(id: string, payload: Partial<Statut>): Promise<Statut> {
    try {
      const res = await this.axios.put<any>(`${this.url}/${id}`, payload);
      return res.data?.data ?? res.data;
    } catch (error) {
      throw new Error(`Erreur de connexion (PUT id=${id}): ${this.humanize(error)}`);
    }
  }

  // PATCH /workflow/statuts/{id}
  async patch(id: string, payload: Partial<Statut>): Promise<Statut> {
    try {
      const res = await this.axios.patch<any>(`${this.url}/${id}`, payload);
      return res.data?.data ?? res.data;
    } catch (error) {
      throw new Error(`Erreur de connexion (PATCH id=${id}): ${this.humanize(error)}`);
    }
  }

  // DELETE /workflow/statuts/{id}
  async remove(id: string): Promise<void> {
    try {
      await this.axios.delete(`${this.url}/${id}`);
    } catch (error) {
      throw new Error(`Erreur de connexion (DELETE id=${id}): ${this.humanize(error)}`);
    }
  }

  // Gestion lisible des erreurs
  private humanize(error: any): string {
    if (error?.response) {
      const status = error.response.status;
      const msg = error.response.data?.message || error.message;
      return `${status} - ${msg ?? 'Erreur serveur'}`;
    }
    return error?.message ?? 'Erreur inconnue';
  }
}

export const statutService = new StatutService();
