// Types pour le module validation

export interface ValidationRequest {
  studentId: string;
  reason?: string;
}

export interface ValidationHistoryEntry {
  id: string;
  studentId: string;
  action: 'validated' | 'rejected';
  reason?: string;
  validatedBy: string;
  validatedAt: string;
}

export interface StudentStatusUpdate {
  status: 'pending' | 'validated' | 'rejected';
  reason?: string;
}

export interface ValidationStats {
  total: number;
  pending: number;
  validated: number;
  rejected: number;
}

export interface ValidationFilters {
  status?: 'pending' | 'validated' | 'rejected';
  dateFrom?: string;
  dateTo?: string;
  validatedBy?: string;
}

export interface ValidationSearchParams {
  query?: string;
  filters?: ValidationFilters;
  page?: number;
  limit?: number;
}
