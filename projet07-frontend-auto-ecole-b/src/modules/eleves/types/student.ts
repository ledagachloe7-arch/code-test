// Types pour le module élèves

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  nationality: string;
  lieuNaissance: string;
  nationaliteEtrangere?: string;
  status: 'incomplete' | 'complete' | 'validated';
  documentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  nationality: string;
  lieuNaissance: string;
  nationaliteEtrangere?: string;
}

export interface Document {
  id: string;
  type: 'identity' | 'photo' | 'medical' | 'aptitude';
  name: string;
  url: string;
  size: string;
  uploadedAt: string;
  status: 'uploaded' | 'processing' | 'error';
}

export interface StudentProfile {
  id: string;
  personalInfo: PersonalInfo;
  documents: RequiredDocument[];
  status: 'incomplete' | 'complete' | 'validated';
  createdAt: string;
  updatedAt: string;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  nationality: string;
  lieuNaissance: string;
  nationaliteEtrangere?: string;
}

export interface RequiredDocument {
  id: string;
  type: 'identity' | 'photo' | 'medical' | 'aptitude';
  name: string;
  url: string;
  isRequired: boolean;
  uploadedAt?: string;
}

export interface StudentFormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  nationality?: string;
}
