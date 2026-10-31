import axiosClient from '../../../shared/utils/axiosConfig';
import { Statut } from '../types'


// ✅ Service CRUD Statut
export class StatutService {
  constructor(
    private axios = axiosClient,
    private url = '/workflow/statuts' // base URL (ex: /api/statuts)
  ) {}

  // GET /statuts?...
  async getAll(params?: Record<string, any>): Promise<any> {
    try {
      const res = await this.axios.get<Statut[]>(this.url, { params })
      return res.data
    } catch (error) {
      throw new Error(`Erreur de connexion (GET all): ${this.humanize(error)}`)
    }
  }

  // GET /statuts/{id}
  async getById(id: string): Promise<Statut> {
    try {
      const res = await this.axios.get<Statut>(`${this.url}/${id}`)
      return res.data
    } catch (error) {
      throw new Error(`Erreur de connexion (GET id=${id}): ${this.humanize(error)}`)
    }
  }

  // POST /statuts
  async create(payload: Partial<Statut>): Promise<Statut> {
    try {
      const res = await this.axios.post<Statut>(this.url, payload)
      return res.data
    } catch (error) {
      throw new Error(`Erreur de connexion (POST): ${this.humanize(error)}`)
    }
  }

  // PUT /statuts/{id}
  async update(id: string, payload: Partial<Statut>): Promise<Statut> {
    try {
      const res = await this.axios.put<Statut>(`${this.url}/${id}`, payload)
      return res.data
    } catch (error) {
      throw new Error(`Erreur de connexion (PUT id=${id}): ${this.humanize(error)}`)
    }
  }

  // PATCH /statuts/{id}
  async patch(id: string, payload: Partial<Statut>): Promise<Statut> {
    try {
      const res = await this.axios.patch<Statut>(`${this.url}/${id}`, payload)
      return res.data
    } catch (error) {
      throw new Error(`Erreur de connexion (PATCH id=${id}): ${this.humanize(error)}`)
    }
  }

  // DELETE /statuts/{id}
  async remove(id: string): Promise<void> {
    try {
      await this.axios.delete(`${this.url}/${id}`)
    } catch (error) {
      throw new Error(`Erreur de connexion (DELETE id=${id}): ${this.humanize(error)}`)
    }
  }

  // Gestion lisible des erreurs
  private humanize(error: any): string {
    if (error?.response) {
      const status = error.response.status
      const msg = error.response.data?.message || error.message
      return `${status} - ${msg ?? 'Erreur serveur'}`
    }
    return error?.message ?? 'Erreur inconnue'
  }
}

// ✅ Instance exportée
export const statutService = new StatutService()
