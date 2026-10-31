// Types pour les services de documents

export interface Document {
  id: string;
  studentId: string;
  type: 'identity' | 'photo' | 'medical' | 'aptitude';
  name: string;
  url: string;
  size: string;
  uploadedAt: string;
  status: 'uploaded' | 'processing' | 'error' | 'validated';
}

export interface UploadDocumentRequest {
  studentId: string;
  file: File;
  type: string;
}

export interface UploadDocumentResponse {
  id: string;
  name: string;
  url: string;
  size: string;
  type: 'identity' | 'photo' | 'medical' | 'aptitude';
  uploadedAt: string;
  status: 'uploaded' | 'processing' | 'error' | 'validated';
}

export interface DocumentPreviewResponse {
  url: string;
  type: string;
  size: number;
}

export interface DocumentError {
  message: string;
  code?: string;
  status?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
