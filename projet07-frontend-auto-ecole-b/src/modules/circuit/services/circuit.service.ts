// Service des documents avec mocks
import axiosClient from '../../../shared/utils/axiosConfig';
import { Circuit } from '../types/circuit';

export class CircuitService {

    constructor(
    private axios = axiosClient, // ton instance axios avec interceptors
        private url = '/workflow/circuits'       // base URL de la ressource
    ) {}
  
    async getAll(params?: Record<string, any>): Promise<Circuit[]> {
        try {
            const res = await this.axios.get<Circuit[]>(this.url, { params })
        return res.data
        } catch (error) {
            throw new Error(`Erreur de connexion (GET all): ${this.humanize(error)}`)
        }
    }

  // GET /api/circuits/{id}
    async getById(id: string): Promise<Circuit> {
        try {
            const res = await this.axios.get<Circuit>(`${this.url}/${id}`)
            return res.data
        } catch (error) {
            throw new Error(`Erreur de connexion (GET id=${id}): ${this.humanize(error)}`)
        }
    }

    // POST /api/circuits
    async create(payload: Partial<Circuit>): Promise<Circuit> {
        try {
            const res = await this.axios.post<Circuit>(this.url, payload)
            return res.data
        } catch (error) {
            throw new Error(`Erreur de connexion (POST): ${this.humanize(error)}`)
        }
    }

    // PUT /api/circuits/{id}
    async update(id: string, payload: Partial<Circuit>): Promise<Circuit> {
        try {
            console.log(`📤 PUT ${this.url}/${id}`, payload)
            const res = await this.axios.put<Circuit>(`${this.url}/${id}`, payload)
            console.log(`✅ Réponse PUT:`, res.data)
            return res.data
        } catch (error) {
            console.error(`❌ Erreur PUT ${this.url}/${id}:`, error)
            const errorMessage = this.humanize(error)
            console.error(`❌ Message d'erreur:`, errorMessage)
            throw new Error(`Erreur de connexion (PUT id=${id}): ${errorMessage}`)
        }
    }

    // PATCH /api/circuits/{id}
    async patch(id: string, payload: Partial<Circuit>): Promise<Circuit> {
        try {
            console.log(`📤 PATCH ${this.url}/${id}`, payload)
            const res = await this.axios.patch<Circuit>(`${this.url}/${id}`, payload)
            console.log(`✅ Réponse PATCH:`, res.data)
            return res.data
        } catch (error) {
            console.error(`❌ Erreur PATCH ${this.url}/${id}:`, error)
            const errorMessage = this.humanize(error)
            console.error(`❌ Message d'erreur:`, errorMessage)
            throw new Error(`Erreur de connexion (PATCH id=${id}): ${errorMessage}`)
        }
    }

  // DELETE /api/circuits/{id}
    async remove(id: string): Promise<void> {
        try {
            await this.axios.delete(`${this.url}/${id}`)
        } catch (error) {
            throw new Error(`Erreur de connexion (DELETE id=${id}): ${this.humanize(error)}`)
        }
    }
    
    // Optionnel: petit helper pour messages d'erreur lisibles
    private humanize(error: unknown): string {
        if (typeof error === 'string') return error
        if (error && typeof error === 'object') {
            const axiosErr = error
            if (axiosErr.hasOwnProperty('response')) {
                const status = (axiosErr as any).response.status
                const msg = (axiosErr as any).response.data?.message || (axiosErr as any).message
                return `${status} - ${msg ?? 'Erreur serveur'}`
            }
            return (axiosErr as any).message ?? 'Erreur inconnue'
        }
        return 'Erreur inconnue'
    }
}

export const circuitService = new CircuitService();