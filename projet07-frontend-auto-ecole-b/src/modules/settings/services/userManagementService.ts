// Service pour la gestion des utilisateurs (opérateurs) refactorisé
import { Operator, OperatorFormData } from '../types';
import { BaseService } from '../../../shared/services/BaseService';
import { API_ENDPOINTS } from '../../../shared/constants/api';

// Classe de service pour la gestion des utilisateurs
class UserManagementService extends BaseService {
  // Récupérer tous les opérateurs, optionnellement filtrés par rôle
  async getOperators(role?: string): Promise<Operator[]> {
    const url = role
      ? `${API_ENDPOINTS.USERS.LIST}?role=${encodeURIComponent(role)}`
      : API_ENDPOINTS.USERS.LIST;
    const data = await this.get<Operator[] | { data?: Operator[]; operators?: Operator[] }>(url);
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.operators && Array.isArray(data.operators)) return data.operators;
    return [];
  }

  // Créer un nouvel opérateur
  async createOperator(data: OperatorFormData): Promise<Operator> {
    return this.post<Operator>(API_ENDPOINTS.USERS.CREATE, data);
  }

  // Mettre à jour un opérateur
  async updateOperator(id: string, data: Partial<OperatorFormData>): Promise<Operator> {
    return this.put<Operator>(API_ENDPOINTS.USERS.UPDATE(id), data);
  }

  // Désactiver/Activer un opérateur
  async toggleOperatorStatus(id: string): Promise<Operator> {
    return this.patch<Operator>(API_ENDPOINTS.USERS.TOGGLE_STATUS(id));
  }

  // Supprimer un opérateur
  async deleteOperator(id: string): Promise<void> {
    return this.delete<void>(API_ENDPOINTS.USERS.DELETE(id));
  }
}

// Instance du service
const userManagementService = new UserManagementService();

// Export des méthodes pour maintenir la compatibilité
export const getOperators = (role?: string) => userManagementService.getOperators(role);
export const createOperator = (data: OperatorFormData) => userManagementService.createOperator(data);
export const updateOperator = (id: string, data: Partial<OperatorFormData>) => userManagementService.updateOperator(id, data);
export const toggleOperatorStatus = (id: string) => userManagementService.toggleOperatorStatus(id);
export const deleteOperator = (id: string) => userManagementService.deleteOperator(id);

// Export de la classe pour les tests
export { UserManagementService };