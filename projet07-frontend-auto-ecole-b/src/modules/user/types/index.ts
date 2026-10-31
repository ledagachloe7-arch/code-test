// Types pour le module de gestion des utilisateurs

export interface User {
  id: string;
  email: string;
  role: string;
  telephone?: string;
  centre_id?: string;
  centre?: { id?: string; name?: string };
  created_at: string;
  updated_at: string;
  personne?: Personne;
}

export interface Personne {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  contact: string;
  telephone?: string;
  adresse?: string;
  created_at: string;
  updated_at: string;
}

export interface UserFormData {
  email: string;
  password?: string;
  password_confirmation?: string;
  nom: string;
  prenom: string;
  contact: string;
  telephone?: string;
  adresse?: string;
  role: 'candidat' | 'ROLE_AUTO_ECOLE' | 'ROLE_ADMIN' | 'ROLE_CNEPC' | 'ROLE_CNEDDT';
  centre_id?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface UserFilters {
  search?: string;
  role?: string;
  statut?: string;
}

export interface UserStats {
  total: number;
  by_role: {
    [key: string]: number;
  };
}

// Export des types pour les détails de candidat
export * from './candidat-details';

