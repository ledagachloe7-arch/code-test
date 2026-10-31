// Service des documents avec mocks
import axiosClient from '../../../shared/utils/axiosConfig';
// import { TypePermis } from '../types/type-document';

export class TypePermisService {

    constructor(
    private axios = axiosClient, // ton instance axios avec interceptors
        private url = '/referentiels'       // base URL de la ressource
    ) {}
  
    async getAll(params?: Record<string, any>): Promise<any[]> {
        try {
            const res = await this.axios.get<any[]>(this.url, { params: params })
        return res.data
        } catch (error) {
            throw new Error(`Erreur de connexion (GET all): ${this.humanize(error)}`)
        }
    }
    
    // Optionnel: petit helper pour messages d'erreur lisibles
    private humanize(error: unknown): string {
        if (typeof error === 'string') return error
        if (error && typeof error === 'object') {
            const axiosErr = error
            if (axiosErr.response) {
                const status = axiosErr.response.status
                const msg = axiosErr.response.data?.message || axiosErr.message
                return `${status} - ${msg ?? 'Erreur serveur'}`
            }
            return axiosErr.message ?? 'Erreur inconnue'
        }
        return 'Erreur inconnue'
    }
}

export const typePermisService = new TypePermisService();