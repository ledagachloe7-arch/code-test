
import axiosClient from '../../../shared/utils/axiosConfig';

export interface Role {
  code: string;
  libelle: string;
}

interface RolesResponse {
  data: Role[];
  current_page?: number;
  last_page?: number;
  total?: number;
}

export class RoleService {
  constructor(private axios = axiosClient) {}

  async getAll(params?: Record<string, unknown>): Promise<Role[]> {
    try {
      const response = await this.axios.get<RolesResponse | Role[]>(
        '/roles',
        { params }
      );

      const body = response.data;

      // Laravel renvoie généralement un paginateur contenant data.
      if (Array.isArray(body)) {
        return body;
      }

      if (body && Array.isArray(body.data)) {
        return body.data;
      }

      return [];
    } catch (error) {
      console.error('Erreur lors du chargement des rôles :', error);
      throw error;
    }
  }
}

export const roleService = new RoleService();
