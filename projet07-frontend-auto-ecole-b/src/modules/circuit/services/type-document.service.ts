// Service des documents avec mocks
import axiosClient from '../../../shared/utils/axiosConfig';
// import { TypeDocument } from '../types/type-document';

export class TypeDocumentService {

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
            if (axiosErr.hasOwnProperty('response') ) {
                const status = (axiosErr as any).response.status
                const msg = (axiosErr as any).response.data?.message || (axiosErr as any).message
                return `${status} - ${msg ?? 'Erreur serveur'}`
            }
            return (axiosErr as any).message ?? 'Erreur inconnue'
        }
        return 'Erreur inconnue'
    }
}

export const typeDocumentService = new TypeDocumentService();