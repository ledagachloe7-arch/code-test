// Types pour le module CNEPC

export interface Batch {
  id: string;
  name: string;
  description?: string;
  students: string[];
  status: 'draft' | 'ready' | 'sent' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface BatchFormData {
  name: string;
  description?: string;
  students: string[];
}

export interface CNEPCStatus {
  isOnline: boolean;
  lastCheck: string;
  version?: string;
}

export interface BatchStatus {
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  completedAt?: string;
}

export interface CNEPCResponse {
  batchId: string;
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
}

export interface BatchHistoryEntry {
  id: string;
  batchId: string;
  action: string;
  timestamp: string;
  details?: any;
  userId?: string;
}

export interface AvailableStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'complete' | 'validated';
  documentsCount: number;
  lastUpdated: string;
}
