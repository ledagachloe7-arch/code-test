import { BaseService } from '../../../shared/services/BaseService';

export interface CreatePermisPayload {
  numero_identite: string | null;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  nationalite: string;
  date_naissance: string | null;
  lieu_naissance: string;
  numero_permis: string;
  type_permis: string;
  categorie: string;
  date_obtention: string | null;
  lieu_obtention: string;
  date_validite: string | null;
  numero_origine_permis: string;
  lieu_origine: string;
  date_renou1: string | null;
  date_renou2: string | null;
  date_renou3: string | null;
}

class PermisManagementService extends BaseService {
  async createPermis(payload: CreatePermisPayload): Promise<any> {
    return this.post('/create', payload);
  }
}

const permisManagementService = new PermisManagementService();

export const createPermis = (payload: CreatePermisPayload) =>
  permisManagementService.createPermis(payload);

