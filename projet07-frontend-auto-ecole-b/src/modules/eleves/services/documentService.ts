// Service des documents avec mocks
import { Document } from '../types/student';
import { UploadDocumentResponse } from './types';
import { uploadDocumentMock, getStudentDocumentsMock } from './eleve.service';
import axiosClient from '../../../shared/utils/axiosConfig';

class DocumentService {
  async uploadDocument(
    studentId: string, 
    file: File, 
    type: string
  ): Promise<UploadDocumentResponse> {
    try {
      // Utilisation du mock pour le développement
      const document = await uploadDocumentMock(studentId, file, type);
      return {
        id: document.id,
        type: document.type,
        name: document.name,
        url: document.url,
        size: document.size,
        uploadedAt: document.uploadedAt,
        status: document.status
      };
    } catch (error: any) {
      throw new Error(`Erreur lors de l'upload: ${error.message}`);
    }
  }

  async getStudentDocuments(studentId: string): Promise<Document[]> {
    try {
      // Utilisation du mock pour le développement
      return await getStudentDocumentsMock(studentId);
    } catch (error: any) {
      throw new Error(`Erreur lors de la récupération des documents: ${error.message}`);
    }
  }

  async deleteDocument(documentId: string): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`🗑️ Suppression du document ID: ${documentId}...`);
      
      // Appel API réel
      await axiosClient.delete(`/documents/${documentId}`);
      
      console.log('✅ Document supprimé avec succès');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression du document:', error);
      console.error('🔴 Status HTTP:', error.response?.status);
      console.error('🔴 Message:', error.message);
      
      // Cas spécial : Si le backend retourne 500, vérifier si le document existe encore
      // Parfois le backend supprime le document mais retourne quand même une erreur 500
      if (error.response?.status === 500) {
        console.log('⚠️ Erreur 500 détectée, vérification si le document existe encore...');
        try {
          // Vérifier si le document existe encore
          await axiosClient.get(`/documents/${documentId}`);
          // Si on arrive ici, le document existe encore, donc l'erreur est réelle
          const errorMessage = error.response?.data?.message || 
                             error.response?.data?.error || 
                             'Erreur serveur lors de la suppression du document';
          return { success: false, message: `Erreur serveur (500): ${errorMessage}` };
        } catch (checkError: any) {
          // Si le document n'existe plus (404), considérer la suppression comme réussie
          if (checkError.response?.status === 404) {
            console.log('✅ Document supprimé avec succès (vérifié après erreur 500)');
            return { success: true }; // Succès même avec erreur 500
          }
          // Sinon, retourner l'erreur
          const errorMessage = error.response?.data?.message || 
                             error.response?.data?.error || 
                             'Erreur serveur lors de la suppression du document';
          return { success: false, message: `Erreur serveur (500): ${errorMessage}` };
        }
      }
      
      // Gérer les autres types d'erreurs
      if (error.response?.status === 404) {
        // Document déjà supprimé, considérer comme succès
        console.log('✅ Document déjà supprimé (404)');
        return { success: true };
      } else if (error.response?.status === 403) {
        return { success: false, message: 'Vous n\'avez pas la permission de supprimer ce document' };
      } else if (error.response?.data?.message) {
        return { success: false, message: error.response.data.message };
      } else {
        return { success: false, message: `Erreur lors de la suppression du document: ${error.message || 'Erreur inconnue'}` };
      }
    }
  }

  async downloadDocument(documentId: string): Promise<Blob> {
    try {
      // Utilisation du mock pour le développement
      return new Blob(['Mock document content'], { type: 'application/pdf' });
    } catch (error: any) {
      throw new Error(`Erreur lors du téléchargement: ${error.message}`);
    }
  }

  async validateDocument(documentId: string): Promise<Document> {
    try {
      // Utilisation du mock pour le développement
      const documents = await getStudentDocumentsMock('1'); // Mock student ID
      const document = documents.find(d => d.id === documentId);
      if (!document) {
        throw new Error('Document non trouvé');
      }
      document.status = 'uploaded';
      return document;
    } catch (error: any) {
      throw new Error(`Erreur lors de la validation: ${error.message}`);
    }
  }

  async getDocumentPreview(documentId: string): Promise<string> {
    try {
      // Utilisation du mock pour le développement
      return `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=`;
    } catch (error: any) {
      throw new Error(`Erreur lors de la prévisualisation: ${error.message}`);
    }
  }

  validateFile(file: File): { isValid: boolean; error?: string } {
    // Validation des fichiers
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    
    if (file.size > maxSize) {
      return { isValid: false, error: 'Fichier trop volumineux (max 10MB)' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Type de fichier non autorisé' };
    }
    
    return { isValid: true };
  }
}

export default new DocumentService();

// Version API future (préparée mais commentée)
// import { AxiosResponse } from 'axios';
// import apiClient from '../../../shared/utils/axiosConfig';

// class DocumentService {
//   async uploadDocument(studentId: string, file: File, type: string): Promise<UploadDocumentResponse> {
//     try {
//       const formData = new FormData();
//       formData.append('file', file);
//       formData.append('type', type);
//       formData.append('studentId', studentId);
//       const response: AxiosResponse<UploadDocumentResponse> = await apiClient.post('/documents/upload', formData);
//       return response.data;
//     } catch (error: any) {
//       throw new Error(`Erreur lors de l'upload: ${error.message}`);
//     }
//   }
//   // ... autres méthodes API
// }